const { groupe, test, assertEqual } = require('./framework');

// Hémistiche (2.30.0) : 6//6 pour l'alexandrin, 4//6 pour le décasyllabe.
module.exports = function testsHemistiche(m) {
  const h = v => m.analysePoeme(v).lignes[0].hemistiche;
  const resume = v => { const x = h(v); return x ? `${x.lecture}:${x.motIndex}:${x.apresSyllabe}:${x.rompue || 'ok'}` : 'aucun'; };

  groupe('Hémistiche', () => {
    test('alexandrin régulier : coupe après le 6e syllabe, en fin de mot', () => {
      // Demain, dès l'aube, à l'heure // où blanchit la campagne
      assertEqual(resume("Demain, dès l'aube, à l'heure où blanchit la campagne,"), 'defaut:4:1:ok');
    });
    test('décasyllabe : coupe après la 4e syllabe', () => {
      // Valéry : Ce toit tranquille, // où marchent des colombes
      assertEqual(resume('Ce toit tranquille, où marchent des colombes,'), 'defaut:2:2:ok');
    });
    test('coupe au milieu d\'un mot : signalée', () => {
      // Il regardait douce//ment la mer immobile
      assertEqual(resume('Il regardait doucement la mer immobile'), 'defaut:2:2:mot');
    });
    test('e muet prononcé à la 6e syllabe : signalé', () => {
      // Elle voit la lu-ne // sur la mer immobile : 6e syllabe = e muet
      assertEqual(resume('Elle voit la lune sur la mer immobile'), 'defaut:3:2:muet');
    });
    test('lecture diérèse quand c\'est elle qui fait 12', () => {
      assertEqual(resume('Que des palais Romains le front audacieux'), 'dierese:3:2:ok');
    });
    test('autre mètre : pas d\'hémistiche', () => {
      assertEqual(resume('La nuit vient sur la colline'), 'aucun');
    });
  });
};
