const { groupe, test, assertEqual, assertTrue, assertFalse } = require('./framework');

// Petite base et petit perso fabriqués à la main : on vérifie les règles de
// fusion et de migration sans dépendre du vrai dictionnaire.
const fabriqueBase = () => ({
  formatBase: 1,
  _legende: 'test',
  ka: { abaca: { phonetique: 'abaka', src: 'LM' }, tabac: { phonetique: 'taba', src: 'L' } },
  motsRares: [
    { mot: 'abscission', note: 'chute des feuilles', tags: ['méral'] },
    { mot: 'aboulique', note: 'sans volonté', tags: ['méral'] },
  ],
});

module.exports = function testsDicoBase(m) {
  groupe('Dico base + perso — fusion', () => {
    test('les tags du perso s\'ajoutent à ceux de la base', () => {
      const f = m.fusionneBasePerso(fabriqueBase(), { formatPerso: 1, motsRares: [{ mot: 'abscission', note: '', tags: ['like'] }] });
      const e = f.motsRares.find(x => x.mot === 'abscission');
      assertEqual(e.tags.join(','), 'méral,like');
    });
    test('une note vide du perso garde la note de la base', () => {
      const f = m.fusionneBasePerso(fabriqueBase(), { formatPerso: 1, motsRares: [{ mot: 'abscission', note: '', tags: ['like'] }] });
      assertEqual(f.motsRares.find(x => x.mot === 'abscission').note, 'chute des feuilles');
    });
    test('une note du perso s\'affiche avant celle de la base', () => {
      const f = m.fusionneBasePerso(fabriqueBase(), { formatPerso: 1, motsRares: [{ mot: 'aboulique', note: 'ma note' }] });
      assertEqual(f.motsRares.find(x => x.mot === 'aboulique').note, 'ma note\n\n---\n\nsans volonté');
    });
    test('une note perso contenant déjà celle de la base n\'est pas doublée', () => {
      const note = 'ma note\n\n---\n\nsans volonté';
      const f = m.fusionneBasePerso(fabriqueBase(), { formatPerso: 1, motsRares: [{ mot: 'aboulique', note }] });
      assertEqual(f.motsRares.find(x => x.mot === 'aboulique').note, note);
    });
    test('un mot rare absent de la base est ajouté (orphelin conservé)', () => {
      const f = m.fusionneBasePerso(fabriqueBase(), { formatPerso: 1, motsRares: [{ mot: 'zinzolin', note: 'violet rougeâtre' }] });
      assertEqual(f.motsRares.length, 3);
    });
    test('une entrée phonétique perso complète celle de la base', () => {
      const f = m.fusionneBasePerso(fabriqueBase(), { formatPerso: 1, ka: { abaca: { synonymes: ['tagal'] } } });
      assertEqual(f.ka.abaca.phonetique, 'abaka');
      assertEqual(f.ka.abaca.synonymes[0], 'tagal');
    });
    test('sans base, le perso seul est utilisé', () => {
      const perso = { formatPerso: 1, synonymes: [{ mot: 'rêve', synonymes: ['songe'] }] };
      assertTrue(m.fusionneBasePerso(null, perso) === perso);
    });
  });

  groupe('Dico base + perso — migration d\'un ancien fichier complet', () => {
    const ancien = () => ({
      _legende: 'test',
      ka: { abaca: { phonetique: 'abaka', src: 'LM' }, tabac: { phonetique: 'taba', src: 'L' }, moka: { phonetique: 'mOka', src: 'L' } },
      motsRares: [
        { mot: 'abscission', note: 'chute des feuilles', tags: ['méral', 'like'] },
        { mot: 'aboulique', note: 'sans volonté', tags: ['méral'] },
        { mot: 'zinzolin', note: 'violet rougeâtre', tags: ['couleur'] },
      ],
      synonymes: [{ mot: 'rêve', synonymes: ['songe'] }],
    });
    test('un ancien fichier complet est reconnu, un calque perso non', () => {
      assertTrue(m.estAncienFormatComplet(ancien()));
      assertFalse(m.estAncienFormatComplet({ formatPerso: 1, ka: {} }));
    });
    test('ne garde que les différences avec la base', () => {
      const p = m.extraitDifferencesPerso(ancien(), fabriqueBase());
      assertEqual(p.motsRares.map(e => e.mot).join(','), 'abscission,zinzolin');
      assertEqual(p.motsRares[0].tags.join(','), 'like');
      assertEqual(Object.keys(p.ka).join(','), 'moka');
      assertEqual(p.synonymes.length, 1);
    });
    test('aller-retour : base + calque migré redonnent l\'ancien fichier', () => {
      const p = m.extraitDifferencesPerso(ancien(), fabriqueBase());
      const f = m.fusionneBasePerso(fabriqueBase(), p);
      assertEqual(JSON.stringify(f.ka), JSON.stringify(ancien().ka));
      const tags = f.motsRares.find(e => e.mot === 'abscission').tags.join(',');
      assertEqual(tags, 'méral,like');
    });
  });
};
