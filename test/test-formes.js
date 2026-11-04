const { groupe, test, assertEqual, assertTrue, assertFalse } = require('./framework');

// Formes fixes (2.30.0) : sonnet et Fahsee. Les exemples sont fabriqués
// pour le test ; aucun poème d'auteur n'est embarqué dans le plugin.
module.exports = function testsFormes(m) {
  const echecs = (texte, forme) => m.verifieForme(texte, forme).regles.filter(r => !r.ok).map(r => r.libelle);

  groupe('Formes fixes — briques', () => {
    test('mot de lien : même mot, flexion ou racine commune', () => {
      assertTrue(m.memeMotOuForme('relit', 'Relis')); assertTrue(m.memeMotOuForme('leste', 'Lesté'));
      assertTrue(m.memeMotOuForme('va,', 'Va')); assertFalse(m.memeMotOuForme('mer', 'ciel'));
    });
    test('fin de vers sur une pause', () => {
      assertTrue(m.finitSurPause('le jour tombe ;')); assertTrue(m.finitSurPause('il dit : « viens. »'));
      assertFalse(m.finitSurPause('le jour tombe sur'));
    });
    test('h aspiré : pas d\'élision devant haut, héros ; élision devant homme, héroïne', () => {
      assertTrue(m.commenceParHAspire('haut')); assertTrue(m.commenceParHAspire('héros')); assertTrue(m.commenceParHAspire('hibou'));
      assertFalse(m.commenceParHAspire('homme')); assertFalse(m.commenceParHAspire('héroïne')); assertFalse(m.commenceParHAspire('honneur'));
      assertEqual(m.analysePoeme('le haut de la tour').lignes[0].r.total, 5);
    });
    test('forme libre : aucune vérification', () => {
      assertEqual(m.verifieForme('un vers', 'libre'), null);
    });
  });

  groupe('Formes fixes — Fahsee', () => {
    // Exemple fabriqué : rimes A/B propres à chaque strophe, A de la 5e = A de la 1re.
    const S = [
      ['Lumière, je regarde au loin la clairière,', 'le vent passe encore et le ciel se lève ;', 'la ville s\'éveille et dit sa prière ;', 'un oiseau répond, la nuit se fait brève ;', 'un pas sur le seuil fait trembler la pierre.'],
      ['Pierre, ton chemin conduit vers la mer ;', 'la vague répond au cri des oiseaux ;', 'le sel sur la lèvre a le goût amer ;', 'le port se repose au fond des roseaux ;', 'la voile s\'en va, le large est ouvert.'],
      ['Ouvert, le jardin respire et sommeille ;', 'la rose fleurit au bord du chemin ;', 'le bourdon s\'endort au cœur de l\'abeille ;', 'le soleil descend au creux de ma main ;', 'le soir se fait lent, la cloche s\'éveille.'],
      ['Éveille le feu qui dort sous la cendre ;', 'la braise rougit, la flamme sourit ;', 'le bois craque doux, il faut bien l\'entendre ;', 'la maison se tait, le chat se nourrit ;', 'la nuit tombe enfin, il faut descendre.'],
      ['Descends au jardin, retrouve la terre ;', 'le jour a passé, voici le repos ;', 'il reste un parfum, un peu de mystère ;', 'la lune se lève au-dessus des flots ;', 'garde en toi le soir, garde la lumière.']
    ].map(s => s.join('\n')).join('\n\n');
    test('structure, lien et retour reconnus sur un exemple fabriqué', () => {
      const e = echecs(S, 'fahsee');
      ['Mot de lien entre les strophes', 'Mot de retour (le dernier mot est le premier)', '5 strophes (5 + 5 + 5 + 5 + 5 vers)', 'Chaque vers finit sur une pause (pas de rejet)']
        .forEach(l => assertFalse(e.includes(l), l));
    });
    test('mot de lien manquant : signalé', () => {
      const casse = S.replace('Pierre, ton chemin', 'Caillou, ton chemin');
      assertTrue(echecs(casse, 'fahsee').includes('Mot de lien entre les strophes'));
    });
    test('vers sans pause finale : signalé', () => {
      const casse = S.replace('la ville s\'éveille et dit sa prière ;', 'la ville s\'éveille et dit sa prière');
      assertTrue(echecs(casse, 'fahsee').includes('Chaque vers finit sur une pause (pas de rejet)'));
    });
  });

  groupe('Formes fixes — sonnet', () => {
    test('14 vers en 4+4+3+3 requis', () => {
      assertTrue(echecs('un vers\nun autre', 'sonnet').includes('4 strophes (4 + 4 + 3 + 3 vers)'));
    });
  });
};
