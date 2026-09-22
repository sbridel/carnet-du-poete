/* Rendu partagé des résultats d'inspiration (panneau + fenêtre modale). */
/* Bouton "+" à côté d'un mot d'inspiration, ouvrant un petit formulaire
   inline pour l'ajouter à un champ lexical personnel (existant ou
   nouveau, créé à la volée). blocParent = conteneur où insérer le
   formulaire (pleine largeur) ; ligneParent = élément juste après lequel
   le placer. Ne s'affiche pas sans plugin (ex. depuis la fenêtre modale). */
/* Rend un mot d'inspiration cliquable pour le sélectionner/désélectionner
   (accumulation possible à travers plusieurs recherches successives —
   utile pour composer un champ depuis "mer" + "couleur" par exemple).
   selectionApi = { estSelectionne, toggle } fourni par buildPanelInspiration ;
   absent (ex. depuis la fenêtre modale) => mot non cliquable, comportement
   inchangé. */
function rendMotSelectionnable(el, mot, themeSuggere, note, selectionApi){
  if (!selectionApi) return;
  const w = normaliseMot(mot);
  const maj = () => el.toggleClass('cp-selectionne', selectionApi.estSelectionne(w));
  maj();
  el.addClass('cp-inspi-cliquable');
  el.addEventListener('click', () => {
    selectionApi.toggle(mot, themeSuggere, note);
    maj();
  });
}

function renderResultatsInspiration(container, motSaisi, plugin, sourcesActives, selectionApi){
  container.empty();
  const saisie = (motSaisi || '').trim();
  if (!saisie) return;

  // --- dictionnaire local (même présentation que l'onglet Synonymes) ---
  const detailsLocal = container.createEl('details', { cls: 'cp-syn-source-details cp-syn-source-local' });
  detailsLocal.setAttr('open', 'true');
  detailsLocal.createEl('summary', { cls: 'cp-syn-source-details-titre', text: `${saisie} — dictionnaire local` });
  const blocLocal = detailsLocal.createDiv({ cls: 'cp-syn-source-corps' });

  const themes = chercheInspiration(saisie);
  if (themes.length === 0) {
    blocLocal.createEl('p', {
      cls: 'cp-vide',
      text: `Pas de champ lexical reconnu pour « ${saisie} » — essaie un mot plus général (ex. « forêt », « mer », « nuit », « amour »…) ou ajoute ton propre champ lexical via dictionnaire-perso.json.`
    });
  } else {
    themes.forEach(champ => {
      const bloc = blocLocal.createDiv({ cls: 'cp-groupe' });
      bloc.createDiv({ cls: 'cp-son-label', text: champ.theme });
      const liste = bloc.createDiv({ cls: 'cp-inspi-liste' });
      champ.mots.forEach(entree => {
        const ligne = liste.createDiv({ cls: 'cp-inspi-mot' });
        const terme = ligne.createSpan({ cls: 'cp-inspi-terme', text: entree.mot });
        if (entree.note) {
          ligne.createSpan({ cls: 'cp-inspi-note', text: entree.note });
        }
        rendMotSelectionnable(terme, entree.mot, champ.theme, entree.note || '', selectionApi);
      });
    });
  }

  // --- sources en ligne cochées (CNRTL, Wiktionnaire, JeuxDeMots) ---
  // Chaque sous-section est colorée selon sa NATURE (voir
  // NATURES_INSPIRATION), pas selon sa source.
  const actives = SOURCES_INSPIRATION.filter(src => (sourcesActives || []).includes(src.id));
  if (actives.length === 0) return;
  const themeSuggereEnLigne = saisie.charAt(0).toUpperCase() + saisie.slice(1);
  const urlFicheCnrtl = `https://www.cnrtl.fr/definition/${encodeURIComponent(saisie)}`;

  const groupeChips = (zone, titre, mots, nature) => {
    if (!mots || mots.length === 0) return;
    const g = zone.createDiv({ cls: `cp-groupe cp-nature-${nature}` });
    g.createDiv({ cls: 'cp-titre', text: titre });
    const motsDiv = g.createDiv({ cls: 'cp-mots' });
    afficheAvecLimite(motsDiv, mots, m => {
      // Pas de badge de rime quand l'expression se termine par le mot
      // cherché lui-même ("aller à l'os" pour "os") : rime triviale.
      const fin = dernierMotExpression(m).split(/['’]/).pop();
      const refRime = normaliseMot(fin) === normaliseMot(saisie) ? null : saisie;
      const span = renderChipMot(motsDiv, m, 'cp-mot cp-mot-inspi', refRime, null);
      rendMotSelectionnable(span, m, themeSuggereEnLigne, '', selectionApi);
    });
  };

  // Proverbes : une ligne chacun (sens en dessous s'il existe), plafonnés
  // à CAP_PROVERBES puis bouton "+ N de plus". `rendreTexte` remplit la
  // ligne (HTML nettoyé pour CNRTL, texte brut pour le Wiktionnaire).
  const groupeProverbes = (zone, titre, liste, rendreTexte) => {
    if (!liste || liste.length === 0) return;
    const g = zone.createDiv({ cls: 'cp-groupe cp-nature-expression' });
    g.createDiv({ cls: 'cp-titre', text: titre });
    const rendreProverbe = (p) => {
      const ligne = g.createDiv({ cls: 'cp-inspi-proverbe' });
      rendreTexte(ligne.createDiv({ cls: 'cp-inspi-proverbe-texte' }), p);
      if (p.sens) ligne.createDiv({ cls: 'cp-inspi-proverbe-sens', text: p.sens });
    };
    liste.slice(0, CAP_PROVERBES).forEach(rendreProverbe);
    const restants = liste.slice(CAP_PROVERBES);
    if (restants.length > 0) {
      const btnPlus = g.createEl('button', { cls: 'cp-mot-voir-plus', text: `+ ${restants.length} de plus` });
      btnPlus.addEventListener('click', () => {
        btnPlus.remove();
        restants.forEach(rendreProverbe);
      });
    }
  };

  const RENDUS = {
    cnrtl: {
      chercher: chercheInspirationCnrtl,
      rendre: (zone, r, liens) => {
        groupeChips(zone, 'Collocations', r.collocations, 'lexical');
        groupeChips(zone, 'Famille de mots', r.famille, 'famille');
        groupeProverbes(zone, 'Proverbes', r.proverbes, (el, p) => renderProverbeCnrtl(el, p.html));
        if (r.proxemie) liens.push(['Proxémie ↗', r.proxemie]);
        liens.push(['Fiche CNRTL ↗', urlFicheCnrtl]);
      },
      liensSiErreur: [['Fiche CNRTL ↗', urlFicheCnrtl]]
    },
    wiktionnaire: {
      chercher: chercheInspirationWiktionnaire,
      rendre: (zone, r) => {
        groupeChips(zone, 'Vocabulaire apparenté', r.vocabulaire, 'lexical');
        groupeChips(zone, 'Dérivés', r.derives, 'famille');
        groupeChips(zone, 'Apparentés étymologiques', r.apparentes, 'famille');
        groupeChips(zone, 'Locutions', r.locutions, 'expression');
        groupeProverbes(zone, 'Proverbes', r.proverbes.map(t => ({ texte: t })), (el, p) => el.appendText(p.texte));
      },
      liensSiErreur: []
    },
    jdm: {
      chercher: chercheInspirationJdm,
      rendre: (zone, r) => {
        groupeChips(zone, 'Idées associées', r.associees, 'lexical');
        groupeChips(zone, 'Caractéristiques', r.caracteristiques, 'carac');
        groupeChips(zone, 'Parties', r.parties, 'parties');
      },
      liensSiErreur: []
    }
  };

  actives.forEach((src, index) => {
    const rendu = RENDUS[src.id];
    const details = container.createEl('details', { cls: 'cp-syn-source-details' });
    if (index === 0) details.setAttr('open', 'true');
    details.createEl('summary', { cls: 'cp-syn-source-details-titre', text: `${saisie} — ${src.nom}` });
    const corps = details.createDiv({ cls: 'cp-syn-source-corps' });
    const remplir = (cible, pos) => {
    cible.empty();
    const statut = cible.createEl('p', { cls: 'cp-vide', text: 'Recherche en cours…' });
    const zone = cible.createDiv();
    const liensDiv = cible.createDiv({ cls: 'cp-inspi-liens' });
    const poseLiens = (liens) => liens.forEach(([texte, url]) =>
      liensDiv.createEl('a', { cls: 'cp-inspi-lien', text: texte, attr: { href: url, target: '_blank', rel: 'noopener' } }));

    rendu.chercher(saisie, pos).then(r => {
      statut.remove();
      const liens = [];
      if (!r || !r.trouve) {
        zone.createEl('p', { cls: 'cp-vide', text: `Rien trouvé sur ${src.nom} pour « ${saisie} ».` });
        if (src.id === 'cnrtl') liens.push(['Fiche CNRTL ↗', urlFicheCnrtl]);
      } else {
        rendu.rendre(zone, r, liens);
      }
      poseLiens(liens);
    }).catch(err => {
      console.error(`[Carnet du Poète] erreur ${src.nom} (Inspiration)`, err);
      statut.setText(messageErreurSource(err, src.nom));
      poseLiens(rendu.liensSiErreur);
    });
    };
    // CNRTL : choix de l'homographe (nom/adjectif…) si le mot en a plusieurs.
    if (src.id === 'cnrtl') brancheHomographesCnrtl(corps, saisie, remplir);
    else remplir(corps.createDiv(), null);
  });
}

