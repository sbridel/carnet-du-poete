const { groupe, test, assertEqual } = require('./framework');

// Alternance des rimes masculines et féminines (2.29.2).
module.exports = function testsAlternance(m) {
  const fautes = texte => m.analysePoeme(texte).lignes
    .map((l, i) => l.alternanceRompue ? `${i}:${l.alternanceRompue}` : null).filter(Boolean).join(' ');

  groupe('Alternance M/F', () => {
    test('quatrain croisé qui alterne : aucune faute', () => {
      assertEqual(fautes('Le soleil se couche sur la mer\nLa nuit vient sur la colline\nLe vent souffle un air amer\nSur la lande qui décline'), '');
    });
    test('deux rimes masculines différentes qui se suivent : faute sur le second vers', () => {
      assertEqual(fautes('Le soleil se couche sur la mer\nLe chat dort près du bois\nLe vent souffle un air amer\nJe pense encore à toi'), '1:M 2:M 3:M');
    });
    test('deux vers qui riment ensemble, même genre : pas de faute', () => {
      assertEqual(fautes('Le soleil se couche sur la mer\nLe vent souffle un air amer'), '');
    });
    test('la règle vaut aussi d\'une strophe à l\'autre (ligne vide sautée)', () => {
      assertEqual(fautes('Le chat dort près du bois\n\nLe soleil se couche sur la mer'), '2:M');
    });
    test('un seul vers : pas de faute', () => {
      assertEqual(fautes('La nuit vient sur la colline'), '');
    });
  });
};
