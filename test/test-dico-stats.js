const zlib = require('zlib');
const { groupe, test, assertEqual, assertTrue } = require('./framework');

// Statistiques du dictionnaire affichées dans Réglages (2.29.1, tests 2.29.2).
const fabriqueBase = () => ({
  formatBase: 1, _legende: 'test',
  ka: { abaca: { phonetique: 'abaka' }, tabac: { phonetique: 'taba' } },
  vi: { ravi: { phonetique: 'Ravi' } },
  motsRares: [{ mot: 'abscission', note: 'n', tags: ['méral'] }],
});

// Faux plugin Obsidian avec un coffre en mémoire (chemin -> contenu).
function fauxPlugin(fichiers, data) {
  let sauve = data;
  const adapter = {
    exists: async p => p in fichiers,
    read: async p => fichiers[p],
    write: async (p, c) => { fichiers[p] = c; },
    readBinary: async p => { const b = fichiers[p]; return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); },
    writeBinary: async (p, c) => { fichiers[p] = Buffer.from(c); },
    remove: async p => { delete fichiers[p]; },
    list: async () => ({ files: [], folders: [] }),
  };
  return {
    manifest: { id: 'carnet-du-poete', dir: '.obsidian/plugins/carnet-du-poete' },
    loadData: async () => sauve, saveData: async x => { sauve = x; },
    app: { vault: { configDir: '.obsidian', adapter,
      getFiles: () => Object.keys(fichiers).filter(p => !p.startsWith('.obsidian')).map(p => ({ name: p.split('/').pop(), path: p })),
      create: async (p, c) => { fichiers[p] = c; } } },
  };
}

module.exports = function testsDicoStats(m) {
  groupe('Stats dictionnaire — fonctions pures', () => {
    test('compte les mots et mots rares de la base', () => {
      const s = m.statsBaseDico(fabriqueBase());
      assertEqual(s.mots, 3); assertEqual(s.motsRares, 1);
    });
    test('statsBaseDico doit précéder la fusion, qui modifie la base en place', () => {
      const base = fabriqueBase();
      const avant = m.statsBaseDico(base);
      m.fusionneBasePerso(base, { formatPerso: 1, motsRares: [{ mot: 'zinzolin', note: '' }] });
      assertEqual(avant.motsRares, 1);
      assertEqual(m.statsBaseDico(base).motsRares, 2, 'après fusion, la base contient aussi le mot perso');
    });
    test('compte les ajouts du perso', () => {
      const s = m.statsPersoDico({ formatPerso: 1, motsRares: [{ mot: 'a' }, { mot: 'b' }], champsLexicaux: [{}], synonymes: [], ka: { moka: {} } }, 'x.json');
      assertEqual([s.chemin, s.motsRares, s.champsLexicaux, s.synonymes, s.motsPhonetiques].join(','), 'x.json,2,1,0,1');
      assertTrue(s.octets > 0);
    });
  });

  groupe('Stats dictionnaire — chargement complet', () => {
    test('après migration d\'un ancien fichier : chiffres de la base intacts, perso au nouvel emplacement', async () => {
      const base = fabriqueBase();
      const ancien = Object.assign(fabriqueBase(), { motsRares: [{ mot: 'abscission', note: 'n', tags: ['méral', 'like'] }, { mot: 'zinzolin', note: 'violet' }] });
      delete ancien.formatBase;
      const fichiers = {
        '.obsidian/plugins/carnet-du-poete/dictionnaire-base.json.gz': zlib.gzipSync(JSON.stringify(base)),
        '.obsidian/plugins/carnet-du-poete/dictionnaire-perso.json': JSON.stringify(ancien),
      };
      const plugin = fauxPlugin(fichiers, { versionBase: m.VERSION_BASE });
      await m.chargeDictionnairePerso(plugin);
      const st = m._getStatsDico();
      assertEqual(st.base.mots, 3); assertEqual(st.base.motsRares, 1, 'mots rares de la base seule, pas la fusion');
      assertEqual(st.perso.chemin, 'dictionnaire-perso.json', 'chemin après migration (racine du coffre)');
      assertEqual(st.perso.motsRares, 2);
      assertEqual(st.perso.octets, Buffer.byteLength(fichiers['dictionnaire-perso.json']), 'poids du nouveau fichier, pas de l\'ancien');
    });
  });
};
