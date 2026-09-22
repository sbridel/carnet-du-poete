  }

  buildPanelGuide(panelGuide){
    const para = (container, texte) => { container.createEl('p', { cls: 'cp-guide-p', text: texte }); };
    const liste = (container, items) => {
      const ul = container.createEl('ul', { cls: 'cp-guide-liste' });
      items.forEach(it => {
        const li = ul.createEl('li');
        if (typeof it === 'string') {
          li.setText(it);
        } else {
          li.createEl('strong', { text: it.titre + ' — ' });
          li.createSpan({ text: it.texte });
        }
      });
    };

    // Contenu regroupé par thème plutôt que dans l'ordre où les sections
    // avaient été ajoutées au fil du temps (les rimes et les formes
    // poétiques étaient chacune coupées en deux, séparées par du contenu
    // sans rapport) : d'abord les unités du vers (syllabe → vers →
    // strophe), puis les rimes, puis les sonorités, puis les formes.
    const sections = [
      { id:'syllabes', titre:'Compter les syllabes en français', ouvert:true, build:(c) => {
        para(c, 'On compte les groupes de voyelles réellement prononcés dans le vers, pas les lettres.');
        liste(c, [
          { titre:'Le e caduc (e muet)', texte:'compté seulement s\'il est suivi d\'un mot commençant par une consonne ; jamais compté en fin de vers ; élidé (jamais compté) devant un mot commençant par une voyelle ou un h muet — ex. « la fleuve aux vagues » : le e de « fleuve » ne compte pas devant « aux ».' },
          { titre:'Les diphtongues fixes', texte:'ai, au, eau, eu, ou, oi, ei... comptent toujours pour une seule syllabe (« beau » = 1 syllabe).' },
          { titre:'Le hiatus et la diérèse', texte:'deux voyelles qui ne forment pas une diphtongue fixe (comme « ti-on », « pi-eu », « lu-mi-ère ») peuvent se lire en une seule syllabe (synérèse, la lecture la plus courante) ou en deux (diérèse, souvent utilisée pour allonger un vers) — c\'est un choix du poète selon le mètre recherché. Le Carnet du Poète affiche les deux lectures quand le cas se présente.' },
          { titre:'La liaison', texte:'change la prononciation mais pas le nombre de syllabes.' },
          { titre:'Le y intervocalique', texte:'entre deux voyelles (rayon, crayon, voyage), il sépare deux syllabes au lieu de fusionner avec elles.' }
        ]);
      }},
      { id:'vers', titre:'Le vers : mètre, césure, coupe', build:(c) => {
        para(c, 'Nom du mètre selon le nombre de syllabes du vers :');
        liste(c, [
          '4 : tétrasyllabe', '5 : pentasyllabe', '6 : hexasyllabe', '7 : heptasyllabe',
          '8 : octosyllabe', '9 : ennéasyllabe', '10 : décasyllabe', '11 : hendécasyllabe',
          '12 : alexandrin (le plus utilisé dans la poésie classique française)'
        ]);
        liste(c, [
          { titre:'La césure', texte:'une pause obligatoire à l\'intérieur du vers. Dans l\'alexandrin classique, elle tombe au milieu (6/6) ; on parle de « trimètre » quand elle est remplacée par deux coupes plus légères créant trois groupes (souvent 4/4/4, fréquent chez Hugo et les romantiques).' },
          { titre:'La coupe', texte:'une pause plus légère et facultative ailleurs dans le vers, qui structure son rythme intérieur.' }
        ]);
        para(c, 'Construction du vers :');
        liste(c, [
          { titre:'Enjambement', texte:'une phrase ou un groupe de mots déborde du vers sur le suivant, sans pause syntaxique à la rime.' },
          { titre:'Rejet', texte:'un enjambement où un élément court est repoussé seul en tout début du vers suivant, le mettant en valeur.' },
          { titre:'Contre-rejet', texte:'l\'inverse : un élément court annonce, en toute fin de vers, la phrase qui se développera au vers suivant.' }
        ]);
      }},
      { id:'strophe', titre:'La strophe : la nommer par son nombre de vers', build:(c) => {
        liste(c, [
          '2 vers : distique', '3 vers : tercet', '4 vers : quatrain', '5 vers : quintil',
          '6 vers : sizain', '7 vers : septain', '8 vers : huitain', '10 vers : dizain'
        ]);
      }},
      { id:'rimes', titre:'Les rimes', build:(c) => {
        para(c, 'Disposition des rimes dans une strophe (les trois formes courantes, détectées automatiquement dans l\'onglet Syllabes) :');
        liste(c, [
          { titre:'Rimes plates (ou suivies) — AABB', texte:'deux vers qui riment se suivent directement.' },
          { titre:'Rimes croisées — ABAB', texte:'un vers sur deux rime avec le suivant du même type.' },
          { titre:'Rimes embrassées — ABBA', texte:'deux rimes s\'enferment autour de deux autres.' }
        ]);
        para(c, 'Formes plus rares (non détectées automatiquement, à repérer soi-même) :');
        liste(c, [
          { titre:'Rimes annexées (ou concaténées)', texte:'la fin d\'un vers est reprise au début du vers suivant.' },
          { titre:'Rimes internes (ou brisées)', texte:'une rime sonne à la fois à la césure et à la fin du même vers.' },
          { titre:'Rimes batelées', texte:'la fin d\'un vers trouve son écho à la césure du vers suivant.' },
          { titre:'Rimes sénées', texte:'tous les mots d\'un même vers commencent par le même son.' },
          { titre:'Rimes couronnées', texte:'le mot-rime est répété deux fois de suite en fin de vers.' },
          { titre:'Rimes triplées', texte:'trois vers de suite sur la même rime (aaa), plutôt romantique — la poésie classique préférait s\'arrêter à deux.' },
          { titre:'Rimes emperières', texte:'un même son revient trois fois dans le même vers ; pure prouesse de rhétoriqueur.' }
        ]);
        para(c, 'Qualité d\'une rime — comptage classique du nombre de sons communs en partant de la fin des mots (2 unités pour la voyelle tonique, qui porte le son dominant ; 1 unité par consonne d\'appui) :');
        liste(c, [
          { titre:'Rime pauvre', texte:'un seul son commun, seule la voyelle finale (ex. « ami / parti »).' },
          { titre:'Rime suffisante', texte:'deux sons communs (ex. « chagrin / matin »).' },
          { titre:'Rime riche', texte:'trois sons communs ou plus (ex. « tendresse / paresse »).' },
          { titre:'Rime très riche', texte:'la syllabe finale est intégralement identique, et la voyelle de la syllabe précédente coïncide aussi — deux syllabes homophones moins un phonème (ex. « patin / matin », « ambroisie / cramoisie »).' },
          { titre:'Rime léonine', texte:'deux syllabes entières, consonnes d\'appui comprises, sont identiques (ex. « railleur / ferrailleur », « sultans / insultants »).' }
        ]);
        para(c, 'Une nuance utile : une voyelle d\'appui (la voyelle de la syllabe qui précède la rime) enrichit davantage qu\'une simple consonne d\'appui, car elle est plus audible — « harem / Jérusalem » ou « aurore / sonore » riment plus richement qu\'une consonne d\'appui seule ne le laisserait penser. C\'est cette logique qui distingue « riche » de « très riche » ci-dessus.');
        para(c, 'Genre d\'une rime, et règle d\'alternance classique :');
        liste(c, [
          { titre:'Rime féminine', texte:'le vers se termine par un e muet (ex. « montagne », « chêne »).' },
          { titre:'Rime masculine', texte:'le vers ne se termine pas par un e muet (ex. « amour », « instant »).' },
          { titre:'Alternance', texte:'la poésie classique française alterne généralement rimes masculines et féminines d\'une strophe à l\'autre (c\'est la pastille F/M affichée dans l\'onglet Syllabes).' }
        ]);
        para(c, 'Deux nuances utiles, à repérer soi-même :');
        liste(c, [
          { titre:'Rime pour l\'œil vs rime pour l\'oreille', texte:'une rime « pour l\'œil » se ressemble à l\'écrit mais pas à l\'oral (ex. « femme » / « lame » ne riment pas vraiment à l\'oreille) ; une bonne rime classique doit fonctionner à l\'oral, pas seulement visuellement.' },
          { titre:'Rime normande ou approximative', texte:'certains poètes jouent volontairement avec des rimes approchantes (assonances) plutôt que des rimes strictes, notamment en poésie moderne et en chanson.' }
        ]);
      }},
      { id:'sonorites', titre:'Les sonorités : allitérations, assonances, trame phonique, homéotéleutes', build:(c) => {
        para(c, 'Contrairement à la rime, qui ne concerne que la fin du vers, les sonorités sont des échos de son qui courent dans le corps des mots, n\'importe où dans le vers ou d\'un vers à l\'autre.');
        liste(c, [
          { titre:'Allitération', texte:'répétition d\'un même son consonne en début de mots rapprochés — ex. « Pour qui sont ces serpents qui sifflent sur vos têtes » (Racine), tissé de [s].' },
          { titre:'Assonance', texte:'répétition d\'une même voyelle à l\'intérieur de plusieurs mots proches, indépendamment de la rime finale — à ne pas confondre avec une « rime par assonance » (voir la nuance « Rime normande » ci-dessus), qui elle concerne la fin du vers.' },
          { titre:'Trame phonique (réseau consonantique)', texte:'un même son consonne qui revient dans un mot quelle que soit sa position — attaque, milieu ou fin —, pas seulement en début de mot comme l\'allitération classique. Une consonne qui « arme » discrètement tout un passage, même quand elle n\'est jamais en tête de mot.' },
          { titre:'Homéotéleute', texte:'répétition d\'une finale de mot proche, ailleurs que la rime de fin de vers — un mot en milieu de vers qui fait écho à une terminaison utilisée ailleurs dans le poème.' }
        ]);
        para(c, 'L\'onglet Syllabes propose un volet dédié (bouton Sonorités, sous le brouillon) qui détecte ces échos automatiquement : liste par son avec ses occurrences, et surlignage directement dans le texte pour les allitérations et assonances. La trame phonique reste en liste (cliquer un son l\'isole dans le brouillon et grise le reste, plutôt qu\'un 3e code couleur permanent) ; les homéotéleutes n\'apparaissent qu\'en liste — et seulement quand au moins un des mots concernés est en milieu de vers, sinon ce ne serait qu\'une redite du schéma de rimes déjà affiché.');
        para(c, 'Trois niveaux de regroupement, au choix, dans ce volet (pour les allitérations, la trame phonique et les assonances ; les homéotéleutes restent toujours sur leur terminaison exacte) :');
        liste(c, [
          { titre:'Sons exacts', texte:'chaque symbole phonétique distinct a sa propre couleur (ex. [s] et [ʃ] séparés) — le plus précis, mais potentiellement beaucoup de couleurs sur un poème riche en sonorités.' },
          { titre:'Familles simplifiées', texte:'peu de groupes, pour repérer un motif d\'ensemble d\'un coup d\'œil. Consonnes : Sifflantes/chuintantes (s, ʃ, ʒ, z) · Occlusives (p, t, k, b, d, g) · Liquides (l, r) · Nasales (m, n, ɲ) · Fricatives (f, v). Voyelles : Voyelles claires (i, y, é, e, ai, ei) · Voyelles sombres (u, o, ou, eu) · Voyelle ouverte (a) · Nasales (in, an, on, un).' },
          { titre:'Familles étendues', texte:'classification phonétique plus complète, qui distingue en plus sourdes et sonores (la vibration ou non des cordes vocales). Consonnes : Occlusives sourdes (p, t, k) · Occlusives sonores (b, d, g) · Fricatives sourdes (f, s, ʃ) · Fricatives sonores (v, z, ʒ) · Nasales (m, n, ɲ) · Liquides (l, r). Voyelles : Voyelles fermées (i, y, u, ou) · Voyelles moyennes/ouvertes (e, é, ai, ei, o, eu, a) · Nasales (in, an, on, un).' }
        ]);
        para(c, 'Comme pour le reste du plugin, la détection est une heuristique orthographique (appuyée sur le dictionnaire phonétique quand le mot y figure) : fiable sur l\'essentiel, mais pas une transcription phonétique parfaite.');
      }},
      { id:'formes', titre:'Formes de poèmes', build:(c) => {
        liste(c, [
          { titre:'Sonnet', texte:'14 vers, généralement en alexandrins : deux quatrains suivis de deux tercets. Schéma de rimes fréquent : ABBA ABBA CCD EED (ou CCD EDE).' },
          { titre:'Rondeau', texte:'forme à refrain, souvent 13 ou 15 vers en trois strophes ; le début du premier vers revient comme refrain.' },
          { titre:'Ballade', texte:'trois strophes suivies d\'un envoi plus court, avec un même vers-refrain répété à la fin de chaque strophe.' },
          { titre:'Villanelle', texte:'19 vers : cinq tercets puis un quatrain, avec deux vers-refrains qui reviennent alternativement.' },
          { titre:'Pantoum', texte:'forme d\'origine malaise : les 2e et 4e vers de chaque strophe deviennent les 1er et 3e vers de la strophe suivante.' },
          { titre:'Ode', texte:'poème lyrique de forme régulière célébrant une personne, une chose ou une idée.' },
          { titre:'Haïku', texte:'poème très court d\'origine japonaise, en 3 vers (5-7-5 syllabes en tradition japonaise), qui capture un instant, souvent lié à la nature.' },
          { titre:'Fable', texte:'court récit en vers, souvent animalier, portant une morale (La Fontaine).' },
          { titre:'Acrostiche', texte:'la première lettre de chaque vers, lue verticalement, forme un mot.' },
          { titre:'Triolet', texte:'8 vers sur 2 rimes, avec reprise des 1er, 4e et 7e vers comme refrain.' },
          { titre:'Virelai', texte:'forme médiévale à refrain, sur deux rimes qui s\'échangent de strophe en strophe.' },
          { titre:'Tanka', texte:'poème japonais de 31 syllabes en 5 vers (5-7-5-7-7), qui prolonge le haïku d\'une réflexion personnelle.' },
          { titre:'Calligramme', texte:'poème dont la disposition graphique sur la page dessine une forme en lien avec le sujet (Apollinaire).' },
          { titre:'Vers libres', texte:'vers sans mètre fixe ni rimes obligatoires, qui s\'appuient sur le rythme et la respiration plutôt que sur des règles strictes (Rimbaud, Laforgue, et la majeure partie de la poésie depuis le XXe siècle).' },
          { titre:'Vers blancs', texte:'vers de mètre régulier mais sans rime.' }
        ]);
      }}
    ];

    // Sommaire : un lien par section, qui déplie la section visée et
    // scrolle jusqu'à elle — pratique pour une page devenue longue.
    const sommaire = panelGuide.createDiv({ cls: 'cp-guide-sommaire' });
    sommaire.createEl('div', { cls: 'cp-guide-sommaire-titre', text: 'Sommaire' });
    const sommaireListe = sommaire.createEl('ul');

    const details = {};
    sections.forEach(s => {
      const li = sommaireListe.createEl('li');
      const lien = li.createEl('a', { text: s.titre, attr: { href: '#' } });
      lien.addEventListener('click', (e) => {
        e.preventDefault();
        details[s.id].open = true;
        details[s.id].scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    sections.forEach(s => {
      const det = panelGuide.createEl('details', { cls: 'cp-guide-section' });
      if (s.ouvert) det.setAttr('open', 'true');
      det.createEl('summary', { cls: 'cp-guide-titre', text: s.titre });
      const corps = det.createDiv({ cls: 'cp-guide-corps' });
      s.build(corps);
      details[s.id] = det;
    });
