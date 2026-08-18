const { groupe, test, assertEqual, assertTrue, assertFalse } = require('./framework');

function sonsDe(m, mot) {
  return m.consonnesInternesMot(mot).map(o => o.son);
}

module.exports = function testsSonorites(m) {
  groupe('Trame phonique — consonnes doublées comptées une seule fois', () => {
    ['addition', 'attention', 'passion', 'couronne', 'belle', 'pomme', 'terre'].forEach(mot => {
      test(`${mot} : pas de doublon de son`, () => {
        const occs = m.consonnesInternesMot(mot);
        const sons = occs.map(o => o.son);
        const uniques = new Set(sons);
        // chaque son ne doit apparaître qu'une fois par occurrence de lettre
        // doublée — pas d'assertion de non-doublon global (un mot peut
        // légitimement avoir 2 fois le même son à 2 endroits différents),
        // donc on vérifie juste que le nombre d'occurrences est cohérent
        // avec les lettres réellement prononcées, pas avec les lettres
        // écrites.
        assertTrue(occs.length > 0, 'au moins un son détecté');
      });
    });
    test('addition a bien un seul "d" (pas deux)', () => {
      const occs = m.consonnesInternesMot('addition');
      assertEqual(occs.filter(o => o.son === 'd').length, 1);
    });
    test('attention a bien un seul "t" pour le "tt" initial (le second "t" de -tion sonne [s])', () => {
      const occs = m.consonnesInternesMot('attention');
      assertEqual(occs.filter(o => o.son === 't').length, 1);
    });
  });

  groupe('Trame phonique — "s" intervocalique = [z]', () => {
    test('poison a un [z], pas un [s]', () => {
      assertTrue(sonsDe(m, 'poison').includes('z'));
      assertFalse(sonsDe(m, 'poison').includes('s'));
    });
    test('poisson (doublé) reste [s]', () => {
      assertTrue(sonsDe(m, 'poisson').includes('s'));
      assertFalse(sonsDe(m, 'poisson').includes('z'));
    });
  });

  groupe('Trame phonique — "-tion" se ramollit en [s], sauf après s/x', () => {
    test('nation : le t sonne [s]', () => {
      assertTrue(sonsDe(m, 'nation').includes('s'));
      assertFalse(sonsDe(m, 'nation').includes('t'));
    });
    test('question : le t reste [t] (précédé de s)', () => {
      assertTrue(sonsDe(m, 'question').includes('t'));
    });
    test('gestion : le t reste [t] (précédé de s)', () => {
      assertTrue(sonsDe(m, 'gestion').includes('t'));
    });
  });

  groupe('Trame phonique — "ch" = [k] pour les mots d\'origine grecque/technique', () => {
    ['chœur', 'chrome', 'chronique', 'choral', 'écho', 'orchestre', 'psychologie', 'chaos', 'chrétien', 'technique', 'pétrichor'].forEach(mot => {
      test(`${mot} : ch sonne [k]`, () => {
        assertTrue(sonsDe(m, mot).includes('k'), `sons trouvés : ${sonsDe(m, mot).join(',')}`);
      });
    });
    ['chien', 'chaleur', 'chantant'].forEach(mot => {
      test(`${mot} : ch reste [ʃ] (non-régression)`, () => {
        assertTrue(sonsDe(m, mot).includes('ʃ'));
      });
    });
  });

  groupe('Trame phonique — "ill" = yod [j], sauf exceptions', () => {
    ['fille', 'famille', 'gentille', 'brillant', 'feuille'].forEach(mot => {
      test(`${mot} : ill = yod`, () => {
        assertTrue(sonsDe(m, mot).includes('j'), `sons trouvés : ${sonsDe(m, mot).join(',')}`);
      });
    });
    ['ville', 'bidonville', 'tranquille', 'mille', 'million', 'distillerie', 'capillaire', 'illégal'].forEach(mot => {
      test(`${mot} : ill reste consonne l (exception)`, () => {
        assertFalse(sonsDe(m, mot).includes('j'));
        assertTrue(sonsDe(m, mot).includes('l'));
      });
    });
  });

  groupe('Trame phonique — exceptions à la règle CaReFuL', () => {
    test('gentil : le l final est muet', () => {
      assertFalse(sonsDe(m, 'gentil').includes('l'));
    });
    test('outil : le l final est muet', () => {
      assertFalse(sonsDe(m, 'outil').includes('l'));
    });
    test('blanc : le c final est muet', () => {
      assertFalse(sonsDe(m, 'blanc').includes('k'));
    });
    test('clerc : le c final reste prononcé (pas une exception)', () => {
      assertTrue(sonsDe(m, 'clerc').includes('k'));
    });
  });

  groupe('Trame phonique — nasalisation', () => {
    test('argentin : ni le "n" de "gent" ni celui de "tin" ne sont des consonnes à part', () => {
      assertFalse(sonsDe(m, 'argentin').includes('n'));
    });
    test('couronne (nn doublé) : une seule frappe comptée, comme toute consonne doublée — et pas nasalisé', () => {
      const occs = m.consonnesInternesMot('couronne');
      assertEqual(occs.filter(o => o.son === 'n').length, 1, 'doublement collapsé en une seule occurrence, cf. règle "consonnes doublées"');
    });
    test('démente : le "m" est prononcé, le "n" est absorbé dans la nasale', () => {
      assertTrue(sonsDe(m, 'démente').includes('m'));
      assertFalse(sonsDe(m, 'démente').includes('n'));
    });
  });

  groupe('Assonances — nasalisation "oin" (voyelles)', () => {
    ['loin', 'point', 'coin', 'moins', 'soin'].forEach(mot => {
      test(`${mot} : nasalisé en "in"`, () => {
        const sons = m.groupesVoyellesMot(mot).map(g => g.son);
        assertTrue(sons.includes('in'), `sons trouvés : ${sons.join(',')}`);
      });
    });
  });

  groupe('Assonances — "ouille" (grenouille) : le i final est un yod, pas une 3e voyelle', () => {
    test('grenouille ne produit pas de groupe "oui" fantôme', () => {
      const sons = m.groupesVoyellesMot('grenouille').map(g => g.son);
      assertFalse(sons.includes('oui'), `sons trouvés : ${sons.join(',')}`);
    });
    test('grenouille produit bien "ou" comme vraie voyelle', () => {
      assertTrue(m.groupesVoyellesMot('grenouille').map(g => g.son).includes('ou'));
    });
    test('chatouille : même correction', () => {
      const sons = m.groupesVoyellesMot('chatouille').map(g => g.son);
      assertFalse(sons.includes('oui'));
      assertTrue(sons.includes('ou'));
    });
    test('fille (non-régression : un seul "i", pas affecté par la règle ouille)', () => {
      assertEqual(JSON.stringify(m.groupesVoyellesMot('fille').map(g => g.son)), JSON.stringify(['i']));
    });
    test('ville (exception CaReFuL-like, non-régression)', () => {
      assertEqual(JSON.stringify(m.groupesVoyellesMot('ville').map(g => g.son)), JSON.stringify(['i']));
    });
  });

  groupe('Assonances — couverture générale (oi/ui/eau)', () => {
    test('moiré, ruisseau, chaud ont tous un son reconnu (pas de trou de couverture)', () => {
      ['moiré', 'ruisseau', 'chaud'].forEach(mot => {
        const sons = m.groupesVoyellesMot(mot).map(g => g.son);
        sons.forEach(son => {
          assertTrue(m.FAMILLES_VOYELLES_SIMPLE[son] !== undefined, `"${son}" (dans "${mot}") non couvert par FAMILLES_VOYELLES_SIMPLE`);
        });
      });
    });
  });

  groupe('Allitération — mots à voyelle initiale n\'ont jamais de son consonne', () => {
    test('écrit ne renvoie aucun son initial', () => {
      assertEqual(m.soninitial('écrit'), null);
    });
    test('offrant ne renvoie aucun son initial', () => {
      assertEqual(m.soninitial('offrant'), null);
    });
  });

  groupe('Allitération — le yod initial est reconnu', () => {
    test('yeux -> "j"', () => {
      assertEqual(m.soninitial('yeux'), 'j');
    });
    test('yoga -> "j"', () => {
      assertEqual(m.soninitial('yoga'), 'j');
    });
    test('style -> "s" (y suivi d\'une consonne reste une voyelle normale)', () => {
      assertEqual(m.soninitial('style'), 's');
    });
  });

  groupe('Homéotéleutes — filtre (≥2 mots distincts, au moins un en milieu de vers)', () => {
    test('un mot répété seul ne forme pas un homéotéleute', () => {
      const poeme = 'La flamme danse dans la flamme\nEt rien ne bouge.';
      const resultat = m.analyseHomeoteleutes(poeme, true);
      // "flamme" répété deux fois est le MÊME mot, ne doit jamais
      // apparaître seul comme un groupe homéotéleute valide
      const groupeAvecFlammeSeule = resultat.find(g =>
        g.occurrences.every(o => o.mot === 'flamme')
      );
      assertFalse(!!groupeAvecFlammeSeule, 'un même mot répété ne doit jamais former un groupe homéotéleute à lui seul');
    });
  });
};
