const { groupe, test, assertEqual, assertTrue } = require('./framework');

// Cas trouvés en explorant hors des tests (lot B, 2.30.0).
module.exports = function testsProsodie(m) {
  const min = w => m.compteSyllabesMot(w, false).min;
  const max = w => m.compteSyllabesMot(w, false).max;

  groupe('Prosodie — tréma, circonflexe, élision', () => {
    test('le tréma sépare toujours la voyelle précédente', () => {
      assertEqual(['naïf', 'haïr', 'aïeux', 'noël', 'ouïr', 'païen', 'saül'].map(min).join(','), '2,2,2,2,2,2,2');
      assertEqual(min('héroïque'), 3);
    });
    test('aïeux, païen : pas de diérèse supplémentaire', () => {
      assertEqual(max('aïeux'), 2); assertEqual(max('païen'), 2);
    });
    test('le vers de Du Bellay compte 12', () => {
      const l = m.analysePoeme('Plus me plaît le séjour qu\'ont bâti mes aïeux').lignes[0];
      assertEqual(l.r.total, 12);
    });
    test('-es et -ent ne s\'élident pas devant voyelle (Baudelaire, L\'Albatros)', () => {
      const t = ['Prennent des albatros, vastes oiseaux des mers,', 'Qui suivent, indolents compagnons de voyage,', 'Le navire glissant sur les gouffres amers.'];
      assertEqual(t.map(v => m.analysePoeme(v).lignes[0].r.total).join(','), '12,12,12');
      assertEqual(m.analysePoeme('Une ombre aimée').lignes[0].r.total, 4, '-e seul : élision maintenue (u-nom-brai-mée)');
    });
    test('voyelles à circonflexe : pas de diérèse possible', () => {
      ['plaît', 'maître', 'goût', 'aîné', 'boîte', 'croître', 'jeûne', 'août'].forEach(w => assertEqual(max(w), min(w), w));
    });
    test('un mot élidé rime comme sans élision', () => {
      m._setDicoTest({ attends: 'at@', longtemps: 'l§t@', aime: 'Em', même: 'mEm' });
      assertTrue(m.memeRime("m'attends", 'longtemps'), "m'attends / longtemps");
      assertTrue(m.memeRime("t'aime", 'même'), "t'aime / même");
      m._setDicoTest(null);
    });
    test('verbe élidé en -ent : féminin comme sans élision', () => {
      m._setCgramTest({ aiment: ['VER'] });
      assertTrue(m.estFeminine("s'aiment"));
      m._setCgramTest(null);
    });
  });
};
