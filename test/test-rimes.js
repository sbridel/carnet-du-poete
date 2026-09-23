const { groupe, test, assertEqual, assertTrue, assertFalse } = require('./framework');

module.exports = function testsRimes(m) {
  groupe('Rimes — e muet ne doit jamais traîner dans la clé', () => {
    test('vole et bol donnent la même clé (même son [ɔl], genre différent)', () => {
      assertEqual(m.cleFinApprox('vole'), m.cleFinApprox('bol'));
    });
    test('vole et bol riment', () => {
      assertTrue(m.memeRime('vole', 'bol'));
    });
    test('folle, fol et idole donnent tous la même clé', () => {
      const a = m.cleFinApprox('folle'), b = m.cleFinApprox('fol'), c = m.cleFinApprox('idole');
      assertEqual(a, b);
      assertEqual(b, c);
    });
    test('page et nage restent corrects (non-régression)', () => {
      assertEqual(m.cleFinApprox('page'), m.cleFinApprox('nage'));
    });
  });

  groupe('Rimes — yod ("ille") distinct de "elle"', () => {
    test('fille et famille donnent la même clé (yod)', () => {
      assertEqual(m.cleFinApprox('fille'), m.cleFinApprox('famille'));
    });
    test('abeille et famille ont des clés différentes (voyelle différente avant le yod)', () => {
      assertFalse(m.cleFinApprox('abeille') === m.cleFinApprox('famille'));
    });
    test('abeille et famille ne riment pas', () => {
      assertFalse(m.memeRime('abeille', 'famille'));
    });
    test('abeille, oreille et groseille partagent la même clé', () => {
      const a = m.cleFinApprox('abeille'), b = m.cleFinApprox('oreille'), c = m.cleFinApprox('groseille');
      assertEqual(a, b);
      assertEqual(b, c);
    });
    test('"mill" ancré en début de mot : famille et camille ne sont pas exceptées à tort', () => {
      assertEqual(m.cleFinApprox('famille'), m.cleFinApprox('camille'));
    });
    test('ville, bidonville, tranquille, mille restent en vraie consonne l (exceptions)', () => {
      // "million"/"distillerie" sont volontairement exclus de ce groupe :
      // leur clé de rime porte sur leur syllabe finale réelle ("-ion",
      // "-erie"), pas sur "-ille" — la racine d'exception s'applique au
      // mot entier (trame phonique), pas à sa toute dernière syllabe.
      const clesAttendues = ['ville', 'bidonville', 'tranquille', 'mille'].map(w => m.cleFinApprox(w));
      clesAttendues.forEach(c => assertEqual(c, clesAttendues[0]));
    });
  });

  groupe('Rimes — "y" voyelle équivaut à "i"', () => {
    test('zéphyr et frémir riment', () => {
      assertTrue(m.memeRime('zéphyr', 'frémir'));
    });
    test('rugby et pari riment', () => {
      assertTrue(m.memeRime('rugby', 'pari'));
    });
    test('martyr et sortir riment', () => {
      assertTrue(m.memeRime('martyr', 'sortir'));
    });
    test('yeux et cieux riment toujours (non-régression de la règle semi-consonne)', () => {
      assertTrue(m.memeRime('yeux', 'cieux'));
    });
  });

  groupe('Rimes — assonance (cœur vocalique) sans casser la distinction yod/consonne', () => {
    test('fille et ville partagent le même cœur vocalique ("i")', () => {
      assertEqual(m.coeurVocalique(m.cleFinApprox('fille')), m.coeurVocalique(m.cleFinApprox('ville')));
    });
    test('mais fille et ville n\'ont pas la même clé exacte (yod ≠ consonne)', () => {
      assertFalse(m.cleFinApprox('fille') === m.cleFinApprox('ville'));
    });
  });

  groupe('Rimes — schéma sur poème complet (rimes continues entre strophes)', () => {
    const poeme = [
      'Au coeur de la nuit, une chaleur étouffante',
      "Alourdit cet air et m'empêche de dormir",
      'Cet enfer artificiel nous fait tous souffrir',
      'Je rêve de cette fraîcheur revigorante',
      '',
      'Une plainte fantomale me fait frémir',
      "D'un livre, s'écoule une brume délirante,",
      'Un tableau dessine un coin aux couleurs charmantes.',
      "Je l'effleure et il me porte tel le zéphyr",
    ].join('\n');

    test('dormir, souffrir, frémir et zéphyr partagent la même lettre', () => {
      m._setRimesContinues(true); // réglage par défaut réel de l'app
      const resultat = m.analysePoeme(poeme);
      const lettreDormir = resultat.lignes[1].lettre;
      const lettreSouffrir = resultat.lignes[2].lettre;
      const lettreFremir = resultat.lignes[5].lettre;
      const lettreZephyr = resultat.lignes[8].lettre;
      assertEqual(lettreSouffrir, lettreDormir, 'souffrir vs dormir');
      assertEqual(lettreFremir, lettreDormir, 'frémir vs dormir');
      assertEqual(lettreZephyr, lettreDormir, 'zéphyr vs dormir (le cas qui a débusqué le bug y=i)');
    });
  });
  groupe('Wiktionnaire — catégorie de rime', () => {
    test('garde la rime la plus précise (\\jo\\ plutôt que \\o\\)', () => {
      const r = m.extraitCategorieRime([
        'Catégorie:Lemmes en français',
        'Catégorie:Rimes en français en \\o\\',
        'Catégorie:Rimes en français en \\jo\\'
      ]);
      assertEqual(r && r.son, 'jo');
      assertEqual(r && r.categorie, 'Catégorie:Rimes en français en \\jo\\');
    });
    test('aucune catégorie de rime → null', () => {
      assertEqual(m.extraitCategorieRime(['Catégorie:Noms communs en français']), null);
      assertEqual(m.extraitCategorieRime([]), null);
    });
  });
  groupe('Rimes — le mot cherché et ses flexions sont exclus', () => {
    test('armée exclut armées, armés, armé, armer, armez', () => {
      ['armée', 'armées', 'armés', 'armé', 'armer', 'armez'].forEach(c =>
        assertTrue(m.estFlexionDe('armée', c), c));
    });
    test('armée garde réarmer, réarmé (composés) et fumée', () => {
      ['réarmer', 'réarmé', 'fumée'].forEach(c => assertFalse(m.estFlexionDe('armée', c), c));
    });
    test('radical court : né exclut nés/née mais garde nez', () => {
      assertTrue(m.estFlexionDe('né', 'nés'));
      assertTrue(m.estFlexionDe('né', 'née'));
      assertFalse(m.estFlexionDe('né', 'nez'));
    });
    test('amour exclut amours, aimer exclut aimé mais garde semer', () => {
      assertTrue(m.estFlexionDe('amour', 'amours'));
      assertTrue(m.estFlexionDe('aimer', 'aimé'));
      assertFalse(m.estFlexionDe('aimer', 'semer'));
    });
  });
};
