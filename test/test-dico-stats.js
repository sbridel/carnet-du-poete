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

const baseGz = (b) => zlib.gzipSync(JSON.stringify(b));
const CHEMIN_BASE = '.obsidian/plugins/carnet-du-poete/dictionnaire-base.json.gz';

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

  // Les tests asynchrones s'exécutent en parallèle : chacun attend la file
  // de chargement du plugin, et ces vérifications sont regroupées dans un
  // seul test pour qu'elles se suivent sans se marcher dessus.
  groupe('Dictionnaire — données (lot A, 2.30.0)', () => {
    test('chargements simultanés, doublons, stats hors ligne, échec d\'écriture', async () => {
      // 1) deux chargements lancés en même temps : pas d'entrée en double
      const perso = { formatPerso: 1, motsRares: [{ mot: 'zinzolin', note: 'violet' }] };
      const f1 = { [CHEMIN_BASE]: baseGz(fabriqueBase()), 'dictionnaire-perso.json': JSON.stringify(perso) };
      const p1 = fauxPlugin(f1, { versionBase: m.VERSION_BASE });
      await Promise.all([m.chargeDictionnairePerso(p1), m.chargeDictionnairePerso(p1)]);
      const n = m.MOTS_RARES.filter(e => e.mot === 'zinzolin').length;
      assertEqual(n, 1, 'zinzolin chargé une seule fois');

      // 2) un mot à la fois dans la liste intégrée et dans la base : une seule fois
      const b2 = fabriqueBase(); b2.motsRares.push({ mot: 'smaragdin', note: 'vert (base)', tags: ['méral'] });
      await m.chargeDictionnairePerso(fauxPlugin({ [CHEMIN_BASE]: baseGz(b2) }, { versionBase: m.VERSION_BASE }));
      assertEqual(m.MOTS_RARES.filter(e => e.mot === 'smaragdin').length, 1, 'smaragdin unique');
      assertEqual(new Set(m.MOTS_RARES.map(e => e.mot)).size, m.MOTS_RARES.length, 'aucun doublon du tout');

      // 3) base absente (hors ligne), perso avec seulement des mots rares : Réglages le voit
      const p3 = fauxPlugin({ 'dictionnaire-perso.json': JSON.stringify(perso) }, { versionBase: m.VERSION_BASE });
      const warnOrig = console.warn; console.warn = () => {}; // téléchargement qui échoue : attendu
      try { await m.chargeDictionnairePerso(p3); } finally { console.warn = warnOrig; }
      const st = m._getStatsDico();
      assertTrue(st && st.perso, 'perso présent dans les stats');
      assertEqual(st.perso.motsRares, 1);

      // 4) perso illisible : l'écriture renvoie false et ne touche pas au fichier
      const f4 = { 'dictionnaire-perso.json': '{cassé' };
      const errOrig = console.error; console.error = () => {}; // erreur attendue, ne pas polluer la sortie
      let ok;
      try { ok = await m.ajouteMotRarePerso(fauxPlugin(f4, { versionBase: m.VERSION_BASE }), 'abaca', '', ['like']); }
      finally { console.error = errOrig; }
      assertEqual(ok, false); assertEqual(f4['dictionnaire-perso.json'], '{cassé');
    });
  });
};
