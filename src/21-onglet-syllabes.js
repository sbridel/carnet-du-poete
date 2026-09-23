
function buildPanelSyllabes(vue, panelSyl){
  const actionsBar = panelSyl.createDiv({ cls: 'cp-toolbar-actions' });
  const btnFlip = actionsBar.createEl('button', { cls: 'cp-icon-btn cp-icon-btn-pill cp-icon-btn-cyan' });
  const btnFlipIcone = btnFlip.createSpan({ text: '🔄' });
  const btnFlipLabel = btnFlip.createSpan({ cls: 'cp-icon-btn-label', text: 'Sonorités' });
  btnFlip.setAttr('title', 'Retourner le volet pour voir les motifs sonores (allitérations, assonances internes)');
  btnFlip.setAttr('aria-label', 'Voir les sonorités');
  const saveState = actionsBar.createEl('span', { cls: 'cp-save-state' });
  const btnExport = actionsBar.createEl('button', { cls: 'cp-icon-btn' });
  btnExport.createSpan({ text: '⬇' });
  btnExport.createSpan({ cls: 'cp-icon-btn-label', text: 'Exporter' });
  btnExport.setAttr('title', 'Exporter en Markdown');
  btnExport.setAttr('aria-label', 'Exporter en Markdown');
  const btnCopierBrouillon = actionsBar.createEl('button', { cls: 'cp-icon-btn' });
  btnCopierBrouillon.createSpan({ text: '⎘' });
  btnCopierBrouillon.createSpan({ cls: 'cp-icon-btn-label', text: 'Copier' });
  btnCopierBrouillon.setAttr('title', 'Copier le brouillon');
  btnCopierBrouillon.setAttr('aria-label', 'Copier le brouillon');
  const btnClear = actionsBar.createEl('button', { cls: 'cp-icon-btn' });
  btnClear.createSpan({ text: '🗑️' });
  btnClear.createSpan({ cls: 'cp-icon-btn-label', text: 'Effacer' });
  btnClear.setAttr('title', 'Effacer le brouillon');
  btnClear.setAttr('aria-label', 'Effacer le brouillon');
  const textarea = panelSyl.createEl('textarea', {
    cls: 'cp-textarea',
    attr: { placeholder: 'Écris ou colle tes vers ici, un vers par ligne…' }
  });

  const flipZone = panelSyl.createDiv({ cls: 'cp-flip-zone' });
  const flipCard = flipZone.createDiv({ cls: 'cp-flip-card' });
  const flipFront = flipCard.createDiv({ cls: 'cp-flip-face cp-flip-front' });
  const flipBack = flipCard.createDiv({ cls: 'cp-flip-face cp-flip-back' });

  const toolbar = flipFront.createDiv({ cls: 'cp-toolbar' });
  const toggleDiereseLabel = toolbar.createEl('label', { cls: 'cp-hasard-toggle-pool' });
  const toggleDierese = toggleDiereseLabel.createEl('input', { attr: { type: 'checkbox' } });
  toggleDiereseLabel.createSpan({ text: ' Variante diérèse' });
  const toggleRimesLabel = toolbar.createEl('label', { cls: 'cp-hasard-toggle-pool' });
  const toggleRimes = toggleRimesLabel.createEl('input', { attr: { type: 'checkbox' } });
  toggleRimesLabel.createSpan({ text: ' Couleurs de rimes' });
  const toggleContinuLabel = toolbar.createEl('label', { cls: 'cp-hasard-toggle-pool' });
  const toggleContinu = toggleContinuLabel.createEl('input', { attr: { type: 'checkbox' } });
  toggleContinuLabel.createSpan({ text: ' Rimes continues entre strophes' });
  toggleContinu.setAttr('title', 'Par défaut, chaque strophe repart de la lettre A. Coche pour poursuivre la nomenclature d\'une strophe à l\'autre (utile pour les sonnets : ABBA ABBA puis CCD EED plutôt que AAB AAB).');
  const analyseDiv = flipFront.createDiv({ cls: 'cp-analyse' });
  const schemaDiv = flipFront.createDiv({ cls: 'cp-schema-rimes' });
  const totalBar = flipFront.createDiv({ cls: 'cp-total-bar' });
  totalBar.style.display = 'none';

  // --- Face arrière : réglages + listes + brouillon surligné ---
  const sonToolbar = flipBack.createDiv({ cls: 'cp-toolbar' });
  const modeSonWrap = sonToolbar.createDiv({ cls: 'cp-select-wrap' });
  const modeSonSelect = modeSonWrap.createEl('select', { cls: 'cp-son-mode-select' });
  modeSonSelect.createEl('option', { attr: { value: 'exact' }, text: 'Sons exacts' });
  modeSonSelect.createEl('option', { attr: { value: 'simple' }, text: 'Familles simplifiées' });
  modeSonSelect.createEl('option', { attr: { value: 'etendu' }, text: 'Familles étendues' });
  modeSonWrap.createSpan({ cls: 'cp-select-arrow', text: '▾' });
  modeSonSelect.setAttr('title', 'Sons exacts : chaque symbole phonétique distinct. Familles simplifiées : peu de groupes, priorité à la lisibilité. Familles étendues : classification plus complète (ex. occlusives sourdes/sonores séparées) — plus fidèle, avec davantage de couleurs.');
  const seuilLabel = sonToolbar.createDiv({ cls: 'cp-son-seuil' });
  seuilLabel.createSpan({ text: 'Seuil ' });
  const seuilInput = seuilLabel.createEl('input', { attr: { type: 'number', min: '2', max: '9', value: '3' } });
  const toggleMotsOutilsLabel = sonToolbar.createEl('label', { cls: 'cp-hasard-toggle-pool' });
  const toggleMotsOutils = toggleMotsOutilsLabel.createEl('input', { attr: { type: 'checkbox' } });
  toggleMotsOutilsLabel.createSpan({ text: ' Exclure mots outils' });
  const toggleDominantsLabel = sonToolbar.createEl('label', { cls: 'cp-hasard-toggle-pool' });
  const toggleDominants = toggleDominantsLabel.createEl('input', { attr: { type: 'checkbox' } });
  toggleDominantsLabel.createSpan({ text: ' Surligner seulement les 3 plus fréquents' });
  toggleDominants.setAttr('title', 'La liste reste complète ; seul le surlignage dans le brouillon se limite aux 3 allitérations et 3 assonances les plus fréquentes, pour un texte moins chargé visuellement.');
  const sonLegendeDiv = flipBack.createDiv({ cls: 'cp-son-legende' });
  const sonBrouillonDiv = flipBack.createDiv({ cls: 'cp-son-brouillon' });
  // Raccourcis toujours visibles (même volet replié) : ouvrent le détail
  // et sautent directement à la section visée.
  const sonSautsDiv = flipBack.createDiv({ cls: 'cp-son-sauts' });
  const sonListeDetails = flipBack.createEl('details', { cls: 'cp-son-liste-details' });
  sonListeDetails.createEl('summary', { text: 'Voir le détail par son' });
  const sectionTitreEls = {}; // rempli par rendSection() à chaque rendu
  const sauteVers = (titre) => {
    sonListeDetails.setAttr('open', 'true');
    requestAnimationFrame(() => {
      syncFlipHeight();
      sectionTitreEls[titre] && sectionTitreEls[titre].scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  ['Allitérations', 'Assonances internes', 'Trame phonique', 'Homéotéleutes'].forEach(titre => {
    const btn = sonSautsDiv.createEl('button', { cls: 'cp-hasard-toggle-pool', text: titre.replace(' internes', '') });
    btn.addEventListener('click', (e) => { e.preventDefault(); sauteVers(titre); });
  });
  const sonListeDiv = sonListeDetails.createDiv({ cls: 'cp-son-liste' });

  const PALETTE_SON = ['cp-son-c1','cp-son-c2','cp-son-c3','cp-son-c4','cp-son-c5','cp-son-c6','cp-son-c7'];
  const couleurParSon = new Map(); // repli dynamique, seulement pour les homéotéleutes (terminaisons arbitraires, hors thème fixe)
  let spotlightSon = null; // son actif en mode "Trame phonique" (clic pour isoler ses occurrences dans le brouillon)
  const coloreSon = (titre, son) => {
    const table = (titre === 'Allitérations' || titre === 'Trame phonique') ? THEME_CONSONNE : titre.startsWith('Assonances') ? THEME_VOYELLE : null;
    if (table && table[son]) return table[son];
    const cle = titre + son;
    if (!couleurParSon.has(cle)) couleurParSon.set(cle, PALETTE_SON[couleurParSon.size % PALETTE_SON.length]);
    return couleurParSon.get(cle);
  };

  const renderSonorites = () => {
    couleurParSon.clear();
    const texte = textarea.value;
    const mode = modeSonSelect.value;
    const famillesConsonnes = mode === 'etendu' ? FAMILLES_CONSONNES_ETENDU : mode === 'simple' ? FAMILLES_CONSONNES_SIMPLE : null;
    const famillesVoyelles = mode === 'etendu' ? FAMILLES_VOYELLES_ETENDU : mode === 'simple' ? FAMILLES_VOYELLES_SIMPLE : null;
    const parFamilles = mode !== 'exact';
    const resultat = analyseSonorites(texte, {
      exclureMotsOutils: toggleMotsOutils.checked,
      seuilMin: parseInt(seuilInput.value, 10) || 2,
      famillesConsonnes,
      famillesVoyelles
    });
    // Même regroupement que ci-dessus, pour savoir à quelle entrée de la
    // liste rattacher un son exact repéré dans le brouillon (surlignage).
    const cleAllit = (son) => famillesConsonnes ? (famillesConsonnes[son] || son) : son;
    const cleAsson = (son) => famillesVoyelles ? (famillesVoyelles[son] || son) : son;

    // La liste (plus bas) montre toujours tout ; seul le surlignage dans
    // le brouillon peut se limiter aux sons dominants si l'option est
    // cochée — resultat.alliterations/assonances sont déjà triées par
    // fréquence décroissante, un simple slice(0,3) suffit donc.
    const resultatSurlignage = toggleDominants.checked
      ? { alliterations: resultat.alliterations.slice(0, 3), assonances: resultat.assonances.slice(0, 3) }
      : resultat;

    sonListeDiv.empty();
    const rendSection = (titre, sousTitre, liste, estFamille, onClicEntree) => {
      if (estFamille === undefined) estFamille = parFamilles;
      const h4 = sonListeDiv.createEl('h4', { text: titre });
      sectionTitreEls[titre] = h4;
      sonListeDiv.createEl('p', { cls: 'cp-son-soustitre', text: sousTitre });
      if (liste.length === 0) {
        sonListeDiv.createEl('p', { cls: 'cp-son-vide', text: 'Aucun motif au-dessus du seuil actuel.' });
        return;
      }
      liste.forEach(entree => {
        const ligne = sonListeDiv.createDiv({ cls: 'cp-son-ligne' });
        const badge = ligne.createSpan({ cls: 'cp-son-badge ' + coloreSon(titre, entree.son) });
        // En mode familles, le nom complet ("Sifflantes/chuintantes") ne
        // tient pas dans le badge rond : on n'y montre que le début,
        // le nom complet reste lisible juste à côté dans la liste.
        badge.setText(estFamille ? entree.son.slice(0, 3).toUpperCase() : entree.son);
        badge.setAttr('title', entree.son);
        const motsUniques = [...new Set(entree.occurrences.map(o => o.mot))];
        const lignesUniques = [...new Set(entree.occurrences.map(o => o.ligne))];
        const prefixe = estFamille ? entree.son + ' — ' : '';
        ligne.createSpan({ cls: 'cp-son-mots', text: prefixe + motsUniques.join(', ') + ' — vers ' + lignesUniques.join(', ') });
        ligne.createSpan({ cls: 'cp-son-count', text: entree.count + ' mots' });
        if (entree.ratio != null) {
          const ratioSpan = ligne.createSpan({ cls: 'cp-son-ratio' + (entree.ratio >= 1.5 ? ' cp-son-ratio-fort' : '') });
          ratioSpan.setText('×' + entree.ratio.toFixed(1));
          // Deux sources différentes selon la nature du son : les
          // consonnes (allitérations/trame) viennent de Lexique 3, les
          // voyelles (assonances) sont toujours sur Wioland 1985 faute
          // de mieux — jamais mélanger les deux dans la citation.
          const source = titre.startsWith('Assonances')
            ? 'étude Wioland, 1985 — la plus récente dont j\'ai pu vérifier les chiffres exacts ; la fréquence des phonèmes évolue très lentement, donc ce classement reste fiable malgré l\'âge de l\'étude'
            : 'Lexique 3, New 2006, via les calculs de C. dos Santos — thèse Lyon 2, 2007 ; en tenant compte de la position dans le mot';
          ratioSpan.setAttr('title', `Ce son revient ${entree.ratio.toFixed(1)}× plus souvent dans ce poème que dans le français courant en moyenne (référence : ${source}).`);
        }
        if (onClicEntree) {
          ligne.addClass('cp-son-ligne-cliquable');
          ligne.setAttr('title', 'Clique pour isoler ce son dans le brouillon ci-dessus.');
          if (entree.son === spotlightSon) ligne.addClass('cp-son-ligne-active');
          ligne.addEventListener('click', () => onClicEntree(entree.son));
        }
      });
    };
    rendSection('Allitérations', 'Son répété en début de mot', resultat.alliterations);
    rendSection('Assonances internes', 'Voyelle qui revient dans le corps des mots, hors rimes finales', resultat.assonances);
    const trame = analyseTramePhonique(texte, { exclureMotsOutils: toggleMotsOutils.checked, seuilMin: parseInt(seuilInput.value, 10) || 3, famillesConsonnes });
    rendSection('Trame phonique', 'Réseau consonantique — un même son revient partout dans le mot (attaque, milieu, coda), pas seulement au début. Clique un son pour l\'isoler dans le brouillon.', trame, undefined, (son) => {
      spotlightSon = spotlightSon === son ? null : son;
      renderSonorites();
      syncFlipHeight();
      // Remonte directement au début du brouillon surligné, plutôt que
      // de laisser l'utilisateur scroller à la main depuis la liste
      // (souvent plus bas dans le volet, voire dans le détail replié).
      if (spotlightSon) {
        requestAnimationFrame(() => sonBrouillonDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    });
    const homeoteleutes = analyseHomeoteleutes(texte, toggleMotsOutils.checked);
    rendSection('Homéotéleutes', 'Finales proches hors rime — au moins un mot en milieu de vers, sinon c\'est déjà ta rime de fin de vers', homeoteleutes, false);

    // Légende : uniquement les sons effectivement surlignés ci-dessous,
    // avec leur couleur et leur nom exact — pour lever l'ambiguïté entre
    // par ex. "an" (nasale) et "a" (voyelle ouverte), qui n'étaient
    // distingués que par la couleur jusqu'ici. Regroupées par catégorie
    // (le mot "allitération"/"assonance" affiché une seule fois par
    // groupe, pas répété à chaque son).
    sonLegendeDiv.empty();
    const ajouteLegendeGroupe = (titre, liste, cls) => {
      if (liste.length === 0) return;
      const groupe = sonLegendeDiv.createDiv({ cls: 'cp-son-legende-groupe' });
      groupe.createSpan({ cls: 'cp-son-legende-titre', text: titre + ' : ' });
      liste.forEach(entree => {
        const puce = groupe.createSpan({ cls: 'cp-son-legende-puce' });
        puce.createSpan({ cls: 'cp-son-legende-couleur ' + cls + ' ' + coloreSon(titre, entree.son) });
        puce.createSpan({ cls: 'cp-son-legende-texte', text: entree.son });
      });
    };
    ajouteLegendeGroupe('Allitérations', resultatSurlignage.alliterations, 'cp-son-legende-init');
    ajouteLegendeGroupe('Assonances', resultatSurlignage.assonances, 'cp-son-legende-vox');
    if (resultatSurlignage.alliterations.length === 0 && resultatSurlignage.assonances.length === 0) {
      sonLegendeDiv.createSpan({ cls: 'cp-son-vide', text: 'Aucun motif au-dessus du seuil actuel.' });
    }


    // Brouillon surligné : reconstruit le texte ligne par ligne avec un
    // <span> par fragment concerné (fond = allitération, soulignement =
    // assonance), le reste en texte brut.
    sonBrouillonDiv.empty();
    const lignesTexte = texte.split('\n');
    lignesTexte.forEach((ligneTexte, idxLigne) => {
      const ligneEl = sonBrouillonDiv.createDiv({ cls: 'cp-son-brouillon-ligne' });
      ligneEl.createSpan({ cls: 'cp-son-brouillon-numero', text: String(idxLigne + 1) });
      if (!ligneTexte.trim()) { ligneEl.createEl('br'); return; }
      const mots = ligneTexte.split(/(\s+)/); // garde les espaces pour un rendu fidèle
      mots.forEach(fragment => {
        if (!fragment.trim()) { ligneEl.createSpan({ text: fragment }); return; }
        const mot = nettoieMot(fragment);
        if (!mot || (toggleMotsOutils.checked && MOTS_OUTILS.has(mot))) {
          ligneEl.createSpan({ cls: spotlightSon ? 'cp-son-brouillon-dim' : '', text: fragment });
          return;
        }

        // Mode spotlight (clic sur un son de la Trame phonique) : on
        // n'affiche QUE ce son-là, partout où il tombe dans le mot ; le
        // reste du texte est grisé. Remplace entièrement le rendu
        // allitération/assonance habituel pendant que le spotlight est
        // actif, pour ne jamais mélanger les deux logiques de surlignage.
        if (spotlightSon) {
          const cleTrameMot = (son) => famillesConsonnes ? (famillesConsonnes[son] || son) : son;
          const occsSpot = consonnesInternesMot(mot).filter(o => cleTrameMot(o.son) === spotlightSon);
          const offsetSpot = fragment.toLowerCase().indexOf(mot);
          if (occsSpot.length === 0 || offsetSpot < 0) {
            ligneEl.createSpan({ cls: 'cp-son-brouillon-dim', text: fragment });
            return;
          }
          let curseurSpot = 0;
          occsSpot.forEach(o => {
            const debutAbs = offsetSpot + o.debut, finAbs = offsetSpot + o.fin;
            if (debutAbs > curseurSpot) ligneEl.createSpan({ cls: 'cp-son-brouillon-dim', text: fragment.slice(curseurSpot, debutAbs) });
            ligneEl.createSpan({ cls: 'cp-son-surligne-init ' + coloreSon('Trame phonique', spotlightSon), text: fragment.slice(debutAbs, finAbs) });
            curseurSpot = finAbs;
          });
          if (curseurSpot < fragment.length) ligneEl.createSpan({ cls: 'cp-son-brouillon-dim', text: fragment.slice(curseurSpot) });
          return;
        }

        const si = soninitial(mot);
        const alliRetenue = si && resultatSurlignage.alliterations.some(e => e.son === cleAllit(si));
        const groupes = groupesVoyellesMot(mot);
        const offsetMot = fragment.toLowerCase().indexOf(mot); // décalage si ponctuation/majuscule en tête

        let curseur = 0;
        const nLettresSon = alliRetenue ? longueurSonInitial(mot) : 0;
        if (alliRetenue && offsetMot >= 0) {
          ligneEl.createSpan({ text: fragment.slice(0, offsetMot) });
          const spanInit = ligneEl.createSpan({ cls: 'cp-son-surligne-init ' + coloreSon('Allitérations', cleAllit(si)), text: fragment.slice(offsetMot, offsetMot + nLettresSon) });
          curseur = offsetMot + nLettresSon;
        } else {
          curseur = 0;
        }
        // Voyelles internes retenues, dans l'ordre, en soulignant seulement
        // celles dont le son fait partie d'une assonance retenue.
        let reste = fragment.slice(curseur);
        let baseIdx = curseur;
        groupes.forEach(g => {
          if (g.debut < baseIdx - (offsetMot >= 0 ? offsetMot : 0)) return; // déjà couvert par l'allitération
          const assonRetenue = resultatSurlignage.assonances.some(e => e.son === cleAsson(g.son));
          if (!assonRetenue) return;
          const debutAbs = (offsetMot >= 0 ? offsetMot : 0) + g.debut;
          const finAbs = (offsetMot >= 0 ? offsetMot : 0) + g.fin;
          if (debutAbs < curseur) return;
          if (debutAbs > curseur) ligneEl.createSpan({ text: fragment.slice(curseur, debutAbs) });
          ligneEl.createSpan({ cls: 'cp-son-surligne-vox ' + coloreSon('Assonances', cleAsson(g.son)), text: fragment.slice(debutAbs, finAbs) });
          curseur = finAbs;
        });
        if (curseur < fragment.length) ligneEl.createSpan({ text: fragment.slice(curseur) });
      });
    });
  };

  // Resynchronise la hauteur du conteneur sur la face actuellement
  // visible — nécessaire aussi bien au flip lui-même qu'à chaque fois
  // que le contenu de la face arrière change de taille (toggle mots
  // outils, seuil), sinon le conteneur garde une hauteur périmée.
  const syncFlipHeight = () => {
    const faceActive = flipZone.classList.contains('flipped') ? flipBack : flipFront;
    requestAnimationFrame(() => { flipCard.style.height = faceActive.scrollHeight + 'px'; });
  };

  btnFlip.addEventListener('click', () => {
    flipZone.classList.toggle('flipped');
    const surLaFaceArriere = flipZone.classList.contains('flipped');
    if (surLaFaceArriere) renderSonorites();
    syncFlipHeight();
    // Le libellé annonce la destination, pas la face actuelle : "Sonorités"
    // pour y aller, "Structure" pour revenir aux syllabes/schéma de rimes.
    btnFlipLabel.setText(surLaFaceArriere ? 'Structure' : 'Sonorités');
    btnFlip.setAttr('title', surLaFaceArriere
      ? 'Retourner le volet pour revenir aux syllabes et au schéma de rimes'
      : 'Retourner le volet pour voir les motifs sonores (allitérations, assonances internes)');
    // Le bouton lui-même fait un petit flip, en écho à la carte.
    btnFlipIcone.addClass('cp-icon-flip');
    setTimeout(() => btnFlipIcone.removeClass('cp-icon-flip'), 600);
  });
  toggleMotsOutils.checked = true;
  modeSonSelect.value = 'simple';
  toggleDominants.checked = true;
  toggleMotsOutils.addEventListener('change', () => { renderSonorites(); syncFlipHeight(); });
  modeSonSelect.addEventListener('change', () => { renderSonorites(); syncFlipHeight(); });
  toggleDominants.addEventListener('change', () => { renderSonorites(); syncFlipHeight(); });
  seuilInput.addEventListener('change', () => { renderSonorites(); syncFlipHeight(); });
  sonListeDetails.addEventListener('toggle', syncFlipHeight);

  (async () => {
    const data = await vue.plugin.loadData();
    toggleDierese.checked = !data || data.afficheDierese !== false; // activé par défaut
    toggleRimes.checked = !data || data.afficheCouleursRimes !== false; // activé par défaut
    toggleContinu.checked = !data || data.rimesContinues !== false; // activé par défaut
    RIMES_CONTINUES = toggleContinu.checked;
    renderAnalyse();
  })();
  toggleDierese.addEventListener('change', async () => {
    const data = (await vue.plugin.loadData()) || {};
    data.afficheDierese = toggleDierese.checked;
    await vue.plugin.saveData(data);
    renderAnalyse();
  });
  toggleRimes.addEventListener('change', async () => {
    const data = (await vue.plugin.loadData()) || {};
    data.afficheCouleursRimes = toggleRimes.checked;
    await vue.plugin.saveData(data);
    renderAnalyse();
  });
  toggleContinu.addEventListener('change', async () => {
    RIMES_CONTINUES = toggleContinu.checked;
    const data = (await vue.plugin.loadData()) || {};
    data.rimesContinues = toggleContinu.checked;
    await vue.plugin.saveData(data);
    renderAnalyse();
  });

  const renderAnalyse = () => {
    analyseDiv.empty();
    schemaDiv.empty();
    const texteComplet = textarea.value;
    const nonVides = texteComplet.split('\n').filter(l => l.trim());
    if (nonVides.length === 0) {
      totalBar.style.display = 'none';
      return;
    }

    const poeme = analysePoeme(texteComplet);
    let total = 0, nb = 0;

    poeme.lignes.forEach(ligneInfo => {
      if (ligneInfo.vide) return;
      const r = ligneInfo.r;
      nb++;
      total += r.total;
      const ligneEl = analyseDiv.createDiv({ cls: 'cp-ligne' });
      const ligneTop = ligneEl.createDiv({ cls: 'cp-ligne-top' });
      const texteStandard = r.details.map(d => segmenteMotPourAffichage(d.mot, d.syllabes)).join(' ');
      const texteSpan = ligneTop.createSpan({ cls: 'cp-texte', text: texteStandard });
      if (toggleRimes.checked && ligneInfo.coulIdx !== null) {
        texteSpan.style.borderLeft = `3px solid ${PALETTE_RIMES[ligneInfo.coulIdx]}`;
        texteSpan.style.paddingLeft = '6px';
      }
      const badges = ligneTop.createDiv({ cls: 'cp-badges' });
      if (toggleRimes.checked && ligneInfo.lettre) {
        const badgeRime = badges.createSpan({ cls: 'cp-rime-lettre', text: ligneInfo.lettre });
        badgeRime.style.color = PALETTE_RIMES[ligneInfo.coulIdx];
        badgeRime.style.borderColor = PALETTE_RIMES[ligneInfo.coulIdx];
        const titreQualite = ligneInfo.qualite ? ` (rime ${LABELS_QUALITE[ligneInfo.qualite] || ligneInfo.qualite})` : '';
        badgeRime.setAttr('title', `Groupe de rime ${ligneInfo.lettre}${titreQualite}`);
      }
      const genre = genreDuVers(r.details);
      if (genre) {
        const badgeGenre = badges.createSpan({
          cls: genre === 'F' ? 'cp-genre cp-genre-f' : 'cp-genre cp-genre-m',
          text: genre
        });
        badgeGenre.setAttr('title', genre === 'F'
          ? 'Rime féminine : le vers se termine par un e muet'
          : 'Rime masculine : le vers ne se termine pas par un e muet');
      }
      if (METRES[r.total]) {
        badges.createSpan({ cls: 'cp-metre', text: METRES[r.total] });
      }
      if (toggleDierese.checked && r.hasHiatus && r.totalMax !== r.total) {
        const badgeSynerese = badges.createSpan({ cls: 'cp-hiatus-badge cp-hiatus-badge-synerese', text: 'synérèse' });
        badgeSynerese.setAttr('title', 'Lecture par défaut : les hiatus de ce vers sont lus en une seule syllabe.');
      }
      badges.createSpan({ cls: 'cp-compte', text: String(r.total) });

      if (toggleDierese.checked && r.hasHiatus && r.totalMax !== r.total) {
        const ligneAlt = ligneEl.createDiv({ cls: 'cp-ligne-alt' });
        const texteAlt = r.details.map(d => segmenteMotPourAffichage(d.mot, d.syllabesDierese || d.syllabes)).join(' ');
        ligneAlt.createSpan({ cls: 'cp-texte-alt', text: texteAlt });
        const badgesAlt = ligneAlt.createDiv({ cls: 'cp-badges' });
        const badgeDierese = badgesAlt.createSpan({ cls: 'cp-hiatus-badge', text: 'diérèse' });
        badgeDierese.setAttr('title', 'Les hiatus de ce vers sont lus en deux syllabes séparées.');
        badgesAlt.createSpan({ cls: 'cp-compte cp-compte-alt', text: String(r.totalMax) });
      }
    });

    // schéma de rimes par strophe (affiché seulement s'il y a plus d'une strophe
    // ou qu'un nom de schéma classique a été reconnu — sinon peu d'intérêt)
    const utile = poeme.strophes.some(s => s.nom) || poeme.strophes.length > 1;
    if (utile) {
      poeme.strophes.forEach((s, i) => {
        const ligne = schemaDiv.createDiv({ cls: 'cp-schema-ligne' });
        const prefixe = poeme.strophes.length > 1 ? `Strophe ${i + 1} : ` : 'Schéma : ';
        ligne.createSpan({ text: prefixe + s.lettres.map(l => l || '?').join('') });
        if (s.nom) ligne.createSpan({ cls: 'cp-metre', text: s.nom });
      });
    }

    totalBar.style.display = 'flex';
    totalBar.empty();
    totalBar.createSpan({ text: `${nb} vers` });
    totalBar.createEl('strong', { text: `${total} syllabes` });
    totalBar.createSpan({ text: `≈ ${(total / nb).toFixed(1)} / vers` });
  };
  // Exposé pour pouvoir forcer un recalcul depuis l'extérieur (ex. le
  // toggle debug "ignorer le dictionnaire personnel" dans Settings, qui
  // change le comportement des rimes sans que le brouillon ait changé).
  vue._renderAnalyseSyllabes = () => {
    renderAnalyse();
    if (flipZone.classList.contains('flipped')) renderSonorites();
  };

  btnExport.addEventListener('click', () => {
    const poeme = analysePoeme(textarea.value);
    const lignesUtiles = poeme.lignes.filter(l => !l.vide);
    if (lignesUtiles.length === 0) { new Notice('Rien à exporter.'); return; }
    let md = '| Vers | Syllabes | Genre | Rime | Qualité |\n| --- | --- | --- | --- | --- |\n';
    lignesUtiles.forEach(l => {
      const genre = genreDuVers(l.r.details) || '';
      const texteEchappe = l.texte.replace(/\|/g, '\\|');
      md += `| ${texteEchappe} | ${l.r.total} | ${genre} | ${l.lettre || ''} | ${l.qualite ? (LABELS_QUALITE[l.qualite] || l.qualite) : ''} |\n`;
    });
    navigator.clipboard.writeText(md).then(() => {
      new Notice('Analyse copiée en Markdown — colle-la où tu veux.');
    }).catch(() => {
      new Notice('Impossible de copier automatiquement ; voir la console pour le Markdown généré.');
      console.log(md);
    });
  });

  btnCopierBrouillon.addEventListener('click', () => {
    if (!textarea.value.trim()) { new Notice('Le brouillon est vide.'); return; }
    navigator.clipboard.writeText(textarea.value).then(() => {
      new Notice('Brouillon copié dans le presse-papier.');
    }).catch(() => {
      new Notice('Impossible de copier automatiquement (voir la console).');
      console.log(textarea.value);
    });
  });

  let saveTimeout = null;
  textarea.addEventListener('input', () => {
    renderAnalyse();
    if (flipZone.classList.contains('flipped')) renderSonorites();
    saveState.setText('…');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const data = (await vue.plugin.loadData()) || {};
      data.poeme = textarea.value;
      await vue.plugin.saveData(data);
      saveState.setText('brouillon enregistré');
      setTimeout(() => saveState.setText(''), 1200);
    }, 700);
  });

  btnClear.addEventListener('click', async () => {
    textarea.value = '';
    renderAnalyse();
    const data = (await vue.plugin.loadData()) || {};
    data.poeme = '';
    await vue.plugin.saveData(data);
  });

  (async () => {
    const data = await vue.plugin.loadData();
    if (data && data.poeme) {
      textarea.value = data.poeme;
      renderAnalyse();
    }
  })();
}

