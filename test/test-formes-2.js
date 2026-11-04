const { groupe, test, assertEqual, assertTrue } = require('./framework');

// Formes ajoutées en 2.31 : exemples fabriqués pour le test (rimes simples
// en -our, -uit, -é, -ève…). Le mètre n'est vérifié que pour haïku et tanka ;
// pour les autres, seules les règles de structure, de rimes et de refrains
// sont contrôlées ici.
const A1 = 'Le vent passe sur le jour', A2 = 'je pense encore à l\'amour', B1 = 'et la lune dort sans bruit';
const AUTRES_A = ['il chante près de la tour', 'le coq annonce le retour', 'tout se tait dans la basse-cour', 'le vieux moulin fait son tour', 'l\'enfant s\'endort pour toujours', 'le soleil revient alentour'];
const AUTRES_B = ['le chat rentre dans la nuit', 'la rivière coule et luit', 'un oiseau s\'envole et fuit', 'la flamme au foyer reluit', 'la cloche sonne minuit'];
const strophes = (...s) => s.map(x => x.join('\n')).join('\n\n');

module.exports = function testsFormes2(m) {
  const verif = (t, f) => m.verifieForme(t, f).regles;
  const ko = (t, f, ignorer) => verif(t, f).filter(r => !r.ok && !(ignorer || /Isométrie|Syllabes/).test(r.libelle)).map(r => r.libelle);

  groupe('Formes 2.31 — formes brèves', () => {
    test('haïku 5-7-5', () => {
      assertEqual(ko('le vieil étang dort\net une grenouille plonge\npuis le bruit de l\'eau', 'haiku', /^$/).join(' | '), '');
      assertTrue(ko('le vieil étang dort\nune grenouille\npuis le bruit de l\'eau', 'haiku', /^$/).includes('Syllabes 5-7-5'));
    });
    test('tanka 5-7-5-7-7', () => {
      assertEqual(ko('le vieil étang dort\net une grenouille plonge\npuis le bruit de l\'eau\nla lune se lève enfin\net le silence revient', 'tanka', /^$/).join(' | '), '');
    });
    const triolet = [A1, B1, A2, A1, AUTRES_A[0], AUTRES_B[1], A1, B1].join('\n');
    test('triolet valide', () => { assertEqual(ko(triolet, 'triolet').join(' | '), ''); });
    test('triolet : refrain manquant signalé', () => {
      assertTrue(ko(triolet.replace(/\nLe vent passe sur le jour\n(?=il chante)/, '\nLe vent tourne sur le jour\n'), 'triolet').some(l => l.startsWith('Refrains')));
    });
  });

  groupe('Formes 2.31 — sonnet shakespearien', () => {
    const s = strophes([A1, B1, A2, AUTRES_B[0]], ['les fleurs dorment dans les prés', 'la mer chante sur la grève', 'les blés mûrs sont moissonnés', 'et le jour devient un rêve'],
      ['la fillette a sa musette', 'le vent souffle sur l\'église', 'le grillon chante en cachette', 'la feuille tremble sous la brise'], ['le monde tourne sur l\'onde', 'et la mer est vaste et profonde']);
    test('ABAB CDCD EFEF GG', () => { assertEqual(ko(s, 'shakespearien').join(' | '), ''); });
  });

  groupe('Formes 2.31 — formes à refrain', () => {
    const rondel = strophes([A1, B1, AUTRES_B[0], A2], [AUTRES_A[0], AUTRES_B[1], A1, B1], [AUTRES_A[1], AUTRES_B[2], AUTRES_B[3], AUTRES_A[2], A1]);
    test('rondel valide', () => { assertEqual(ko(rondel, 'rondel').join(' | '), ''); });
    test('rondel : refrain final manquant signalé', () => {
      assertTrue(ko(rondel.replace(/Le vent passe sur le jour$/, AUTRES_A[3]), 'rondel').some(l => l.startsWith('Refrains')));
    });
    const rondeau = strophes([A1, A2, B1, AUTRES_B[0], AUTRES_A[0]], [AUTRES_A[1], AUTRES_A[2], AUTRES_B[1], 'Le vent passe'],
      [AUTRES_A[3], AUTRES_A[4], AUTRES_B[2], AUTRES_B[3], AUTRES_A[5], 'Le vent passe']);
    test('rondeau valide, avec rentrement', () => { assertEqual(ko(rondeau, 'rondeau').join(' | '), ''); });
    test('rondeau : rentrement qui n\'est pas le début du poème signalé', () => {
      assertTrue(ko(rondeau.replace(/Le vent passe$/, 'La nuit tombe'), 'rondeau').some(l => l.startsWith('Rentrement')));
    });
    const villanelle = strophes([A1, B1, A2], [AUTRES_A[0], AUTRES_B[1], A1], [AUTRES_A[1], AUTRES_B[0], A2], [AUTRES_A[2], AUTRES_B[2], A1],
      [AUTRES_A[3], AUTRES_B[3], A2], [AUTRES_A[4], AUTRES_B[4], A1, A2]);
    test('villanelle valide', () => { assertEqual(ko(villanelle, 'villanelle').join(' | '), ''); });
    // Ballade en huitains : ababbcbC ×3 + envoi bcbC, mêmes rimes partout, refrain C.
    const C = 'Ainsi va la vie, ma fillette';
    const huitain = k => [`premier vers ${k} sur le jour`, `deuxième vers ${k} dans la nuit`, `troisième vers ${k} sur l'amour`, `quatrième vers ${k} sans bruit`,
      `cinquième vers ${k} qui luit`, `sixième vers ${k} en cachette`, `septième vers ${k} qui fuit`, C];
    const ballade = strophes(huitain(1), huitain(2), huitain(3), ['Prince, voici que tout s\'enfuit', 'le grillon chante en cachette', 'la cloche sonne minuit', C]);
    test('ballade valide (huitains + envoi)', () => { assertEqual(ko(ballade, 'ballade').join(' | '), ''); });
    test('ballade : refrain différent signalé', () => {
      assertTrue(ko(ballade.replace(/Ainsi va la vie, ma fillette$/, 'Ainsi passe le temps, fillette'), 'ballade').some(l => l.startsWith('Refrain')));
    });
  });

  groupe('Formes 2.31 — formes à enchaînement', () => {
    const P = ['les fleurs dorment dans les prés', 'les blés mûrs sont moissonnés'];
    const pantoum = strophes([A1, B1, A2, AUTRES_B[0]], [B1, P[0], AUTRES_B[0], P[1]], [P[0], A2, P[1], A1]);
    test('pantoum valide (enchaînement et bouclage)', () => {
      assertEqual(verif(pantoum, 'pantoum').filter(r => !r.ok && !/Isométrie/.test(r.libelle)).map(r => r.libelle).join(' | '), '');
    });
    test('pantoum : enchaînement rompu signalé', () => {
      assertTrue(ko(pantoum.replace(`${B1}\n${P[0]}`, `${AUTRES_B[1]}\n${P[0]}`), 'pantoum').some(l => l.startsWith('Enchaînement')));
    });
    const terza = strophes([A1, B1, A2], [AUTRES_B[0], 'les fleurs dorment dans les prés', AUTRES_B[1]], ['les blés mûrs sont moissonnés', 'la mer chante sur la grève', 'les bœufs sont enfin rentrés'], ['et le jour devient un rêve']);
    test('terza rima valide', () => { assertEqual(ko(terza, 'terzarima').join(' | '), ''); });
    const mots = ['ombre', 'soleil', 'pierre', 'eau', 'nuit', 'chemin'];
    const sizains = []; let ordre = mots.slice();
    for (let k = 0; k < 6; k++) { sizains.push(ordre.map((w, i) => `le vers ${i} de la strophe ${k} parle de ${w}`)); ordre = [5, 0, 4, 1, 3, 2].map(i => ordre[i]); }
    const sextine = strophes(...sizains, ['entre l\'ombre et le soleil', 'la pierre boit l\'eau', 'la nuit garde le chemin']);
    test('sextine valide (rotation et envoi)', () => { assertEqual(verif(sextine, 'sextine').filter(r => !r.ok && !/Isométrie/.test(r.libelle)).map(r => r.libelle).join(' | '), ''); });
    test('sextine : rotation rompue signalée', () => {
      assertTrue(ko(sextine.replace('le vers 0 de la strophe 1 parle de chemin', 'le vers 0 de la strophe 1 parle de lune'), 'sextine').some(l => l.startsWith('Mots-rimes')));
    });
  });

  groupe('Formes — menu', () => {
    test('chaque forme du menu existe et a des règles', () => {
      m.FORMES_FIXES_ORDRE.filter(id => id !== 'libre').forEach(id => assertTrue(m.verifieForme('un vers', id), id));
    });
  });
};
