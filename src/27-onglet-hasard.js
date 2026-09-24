
function buildPanelHasard(vue, panelHasard){

  // --- stats de progression (utile pour savoir quand importer un
  // nouveau lot de mots, ex. Méral, sans redemander à voir les mêmes).
  // Repliées par défaut en bas de l'onglet (cf. plus bas) pour ne pas
  // surcharger le haut du panel ; statsDiv est assigné après coup.
  let statsDiv = null;
  let compteurPoolEl = null;
  const renderStats = () => {
    if (!statsDiv) return;
    statsDiv.empty();
    const total = MOTS_RARES.length;
    const exclus = MOTS_RARES.filter(e => estExclu(e.mot)).length;
    const sansTag = MOTS_RARES.filter(e => tagsSignificatifs(e.mot).length === 0).length;
    const vus = total - sansTag;
    const pct = total > 0 ? Math.round((vus / total) * 100) : 0;
    const item = (texte, cls) => statsDiv.createSpan({ cls: 'cp-hasard-stat ' + cls, text: texte });
    item(`${total} mot(s) au total`, 'cp-hasard-stat-total');
    item(`${exclus} exclu(s)`, 'cp-hasard-stat-exclus');
    item(`${sansTag} sans tag`, 'cp-hasard-stat-sanstag');
    item(`${pct}% déjà vu(s)`, 'cp-hasard-stat-vu');

    // Détail par tag et par combinaison de tags RÉELLEMENT observée
    // (pas toutes les combinaisons théoriques, qui exploseraient très
    // vite — seulement celles qui existent dans le dictionnaire).
    const parTag = new Map();
    const parCombo = new Map();
    MOTS_RARES.forEach(e => {
      const tags = tagsSignificatifs(e.mot);
      tags.forEach(t => parTag.set(t, (parTag.get(t) || 0) + 1));
      if (tags.length > 0) {
        const cle = [...tags].sort().join(' + ');
        parCombo.set(cle, (parCombo.get(cle) || 0) + 1);
      }
    });

    const detailsDiv = statsDiv.createDiv({ cls: 'cp-hasard-stats-detail' });
    const blocTags = detailsDiv.createDiv({ cls: 'cp-hasard-stats-bloc' });
    blocTags.createDiv({ cls: 'cp-titre', text: 'Par tag' });
    const listeTags = blocTags.createDiv({ cls: 'cp-hasard-stats-liste' });
    [...parTag.entries()].sort((a, b) => b[1] - a[1]).forEach(([tag, n]) => {
      const chip = listeTags.createSpan({ cls: 'cp-hasard-stats-chip' });
      const c = couleurTag(tag);
      chip.style.borderColor = c; chip.style.color = c;
      chip.setText(`${tag} · ${n}`);
    });

    const combosMultiples = [...parCombo.entries()].filter(([cle]) => cle.includes(' + '));
    if (combosMultiples.length > 0) {
      const blocCombos = detailsDiv.createDiv({ cls: 'cp-hasard-stats-bloc' });
      blocCombos.createDiv({ cls: 'cp-titre', text: 'Combinaisons observées' });
      const listeCombos = blocCombos.createDiv({ cls: 'cp-hasard-stats-liste' });
      combosMultiples.sort((a, b) => b[1] - a[1]).forEach(([cle, n]) => {
        listeCombos.createSpan({ cls: 'cp-hasard-stats-chip', text: `${cle} · ${n}` });
      });
    }
  };

  // --- filtres par tags (élargissent le pool ; OU logique). "exclu"
  // bascule en mode revue : ne tire QUE parmi les mots exclus. ---
  const filtresDiv = panelHasard.createDiv({ cls: 'cp-hasard-filtres' });

  // --- Bandeau de raccourcis rapides : toujours visible, 3 pilules de
  // même forme (auparavant "Masquer les mots déjà tagués" était une
  // case à cocher isolée, visuellement différente des deux boutons
  // "Explorer") ---
  const bandeauDiv = filtresDiv.createDiv({ cls: 'cp-hasard-bandeau' });
  bandeauDiv.createDiv({ cls: 'cp-titre', text: 'Tirage rapide' });
  const filtresRapidesDiv = bandeauDiv.createDiv({ cls: 'cp-hasard-filtres-rapides' });

  // --- Section "Filtrer par tags" (inclusion, OU par défaut, bascule ET
  // possible) : repliée par défaut ---
  const sectionInclusion = creeSectionRepliable(filtresDiv, 'Filtrer par tags', 'cp-hasard-section-inclusion');
  const ligneFormInclusion = sectionInclusion.body.createDiv({ cls: 'cp-hasard-ligne-form' });
  const datalistId = 'cp-hasard-taglist-' + Math.random().toString(36).slice(2, 8);
  const filtreInput = ligneFormInclusion.createEl('input', { attr: { type: 'text', placeholder: 'un tag (ou clique plusieurs pastilles ci-dessous)…', list: datalistId } });
  const filtreDatalist = ligneFormInclusion.createEl('datalist', { attr: { id: datalistId } });
  const btnAjouterFiltre = ligneFormInclusion.createEl('button', { cls: 'cp-link-btn', text: '+ ajouter tag' });
  const btnTousTagsFiltre = ligneFormInclusion.createEl('button', { cls: 'cp-link-btn cp-hasard-voir-tous-tags', text: 'Voir tous les tags' });
  btnTousTagsFiltre.style.display = 'none';
  // Bascule OU (au moins un tag coché) / ET (tous les tags cochés) —
  // utile dès qu'un tag a un volume disproportionné par rapport aux
  // autres (ex. un import en masse) : en OU, le cocher avec un autre tag
  // revient presque à ne cocher que lui, il faut le mode ET pour une
  // vraie intersection.
  const modeETLabel = sectionInclusion.body.createEl('label', { cls: 'cp-hasard-mode-et' });
  const modeETCase = modeETLabel.createEl('input', { attr: { type: 'checkbox' } });
  modeETLabel.createSpan({ text: ' Tous les tags cochés (ET) plutôt qu\'au moins un (OU)' });
  // Générique plutôt que codé pour un tag précis : "méral" + n'importe
  // quel autre tag, ou "femme" + n'importe quel autre — même mécanique,
  // s'applique à ce qui est coché ci-dessus, quel que soit le tag.
  const modePlusUnAutreLabel = sectionInclusion.body.createEl('label', { cls: 'cp-hasard-mode-et' });
  const modePlusUnAutreCase = modePlusUnAutreLabel.createEl('input', { attr: { type: 'checkbox' } });
  modePlusUnAutreLabel.createSpan({ text: ' + au moins un tag en plus de ceux cochés' });
  const filtresChipsDiv = sectionInclusion.body.createDiv({ cls: 'cp-hasard-filtres-chips' });

  // --- Section "Exclure des tags" (NOT/NOR) : symétrique, repliée par
  // défaut. "Masquer les mots connus" est un raccourci compact sur la
  // même ligne que le formulaire plutôt qu'un gros bouton à part —
  // c'est probablement l'action la plus utilisée de la zone, donc
  // gardée à taille normale (juste alignée avec le reste, pas réduite
  // à une mini-puce). "Masquer les mots déjà tagués" reste dans le
  // bandeau du haut : sémantique différente (AUCUN tag, pas "pas tel
  // tag précis"), pas pliable dans cette exclusion générique. ---
  const sectionExclusion = creeSectionRepliable(filtresDiv, 'Exclure des tags', 'cp-hasard-section-exclusion');
  const ligneFormExclusion = sectionExclusion.body.createDiv({ cls: 'cp-hasard-ligne-form' });
  const exclusionRapidesDiv = ligneFormExclusion.createDiv({ cls: 'cp-hasard-filtres-rapides cp-hasard-filtres-rapides-inline' });
  const exclusionDatalistId = 'cp-hasard-exclutaglist-' + Math.random().toString(36).slice(2, 8);
  const exclusionInput = ligneFormExclusion.createEl('input', { attr: { type: 'text', placeholder: 'un tag à exclure (ou clique plusieurs pastilles)…', list: exclusionDatalistId } });
  const exclusionDatalist = ligneFormExclusion.createEl('datalist', { attr: { id: exclusionDatalistId } });
  const btnAjouterExclusion = ligneFormExclusion.createEl('button', { cls: 'cp-link-btn', text: '+ exclure' });
  const btnTousTagsExclusion = ligneFormExclusion.createEl('button', { cls: 'cp-link-btn cp-hasard-voir-tous-tags', text: 'Voir tous les tags à exclure' });
  btnTousTagsExclusion.style.display = 'none';
  const exclusionChipsDiv = sectionExclusion.body.createDiv({ cls: 'cp-hasard-filtres-chips' });

  const filtresExclus = new Set();
  const filtresActifs = new Set();
  // Mode revue des exclus : un booléen À PART, plus un pseudo-tag dans
  // filtresActifs comme avant — "exclu" décide dans QUEL bassin on
  // pioche (les mis de côté, plutôt que les actifs), les tags normaux
  // décident QUELS mots dans ce bassin. Les deux se combinent maintenant
  // naturellement (revoir "les mots exclus tagués méral", par exemple),
  // sans le bricolage d'exclusivité qu'il fallait avant pour éviter
  // qu'un filtre "actif" silencieusement ignoré ne prête à confusion.
  let modeRevueExclus = false;
  // Datalist du champ "ajouter un tag" (créé plus bas dans le DOM) —
  // référence assignée après coup, mais rafraîchie depuis ici pour rester
  // synchronisée avec la liste des tags à chaque changement.
  let tagAjoutDatalist = null;

  sectionInclusion.setCompteBadge(() => filtresActifs.size);
  sectionExclusion.setCompteBadge(() => filtresExclus.size);

  // "déjà tagués" et "multi-tagués" (0 vs 2+ tags significatifs) sont
  // deux booléens à part, miroirs l'un de l'autre, affichés comme
  // pilules du bandeau, harmonisées avec les deux "Explorer".
  const masquerTaguesCase = { checked: false };
  const multiTaguesCase = { checked: false };
  let btnMasquerTagues = null;

  const activeFiltre = (tag) => { filtresActifs.add(tag); renderFiltresTags(); };
  const desactiveFiltre = (tag) => { filtresActifs.delete(tag); renderFiltresTags(); };
  const panneauTousTagsFiltre = creePanneauTousTags(
    sectionInclusion.body,
    btnTousTagsFiltre,
    () => tousLesTagsUtilises().filter(t => t !== TAG_EXCLU && !filtresActifs.has(t)),
    activeFiltre
  );
  modeETCase.addEventListener('change', () => { renderFiltresTags(); });
  modePlusUnAutreCase.addEventListener('change', () => { renderFiltresTags(); });

  // Raccourcis toujours visibles dans le bandeau du haut : "exclu" (mode
  // revue, booléen à part désormais — voir plus haut), "like" (fixe, pas
  // "le tag le plus utilisé" — un import en masse comme méral peut
  // largement dépasser en volume les tags qu'on pose soi-même, sans que
  // ça les rende plus pertinents comme raccourci rapide), "masquer déjà
  // tagués" et son miroir "multi-tagués" (2+ tags significatifs, plutôt
  // que 0 — pour repérer les mots déjà bien recoupés).
  const renderFiltresRapides = () => {
    filtresRapidesDiv.empty();
    const rapides = [
      { tag: TAG_EXCLU, label: '🚫 Explorer les exclus', actif: modeRevueExclus,
        toggle: () => { modeRevueExclus = !modeRevueExclus; renderFiltresTags(); }, couleur: couleurTag(TAG_EXCLU) },
      ...(tousLesTagsUtilises().includes('like') ? [{ tag: 'like', label: '☆ Explorer « like »', actif: filtresActifs.has('like'),
        toggle: () => { filtresActifs.has('like') ? desactiveFiltre('like') : activeFiltre('like'); }, couleur: couleurTag('like') }] : []),
      { tag: '__masquerTagues', label: '📭 Masquer les mots déjà tagués', actif: masquerTaguesCase.checked,
        toggle: () => { masquerTaguesCase.checked = !masquerTaguesCase.checked; renderFiltresTags(); }, couleur: 'var(--text-muted)' },
      { tag: '__multiTagues', label: '🏷️ Explorer les multi-tagués', actif: multiTaguesCase.checked,
        toggle: () => { multiTaguesCase.checked = !multiTaguesCase.checked; renderFiltresTags(); }, couleur: 'var(--text-muted)' },
    ];
    rapides.forEach(r => {
      const btn = filtresRapidesDiv.createEl('button', {
        cls: 'cp-hasard-filtre-rapide' + (r.actif ? ' cp-hasard-filtre-rapide-actif' : ''),
        text: r.label
      });
      btn.style.borderColor = r.couleur;
      if (r.actif) { btn.style.background = r.couleur; btn.style.color = '#fff'; }
      else { btn.style.color = r.couleur; }
      btn.addEventListener('click', r.toggle);
      if (r.tag === '__masquerTagues') btnMasquerTagues = btn;
    });
  };

  const renderFiltresTags = () => {
    renderStats();
    renderFiltresRapides();
    sectionInclusion.render();
    sectionExclusion.render();
    if (compteurPoolEl) {
      const n = filtrePoolMots({
        tagsActifs: filtresActifs, modeET: modeETCase.checked, modePlusUnAutre: modePlusUnAutreCase.checked,
        tagsExclus: filtresExclus, masquerTagues: masquerTaguesCase.checked, modeMultiTagues: multiTaguesCase.checked,
        modeRevueExclus,
      }).length;
      compteurPoolEl.setText(n === 0 ? 'Aucun mot ne correspond à ces filtres' : `${n} mot${n > 1 ? 's' : ''} correspond${n > 1 ? 'ent' : ''} à ces filtres`);
    }
    const tags = tousLesTagsUtilises().filter(t => t !== TAG_EXCLU);
    filtreDatalist.empty();
    tags.forEach(tag => {
      if (filtresActifs.has(tag)) return;
      filtreDatalist.createEl('option', { attr: { value: tag } });
    });
    if (tagAjoutDatalist) {
      tagAjoutDatalist.empty();
      tags.forEach(tag => tagAjoutDatalist.createEl('option', { attr: { value: tag } }));
    }
    panneauTousTagsFiltre.render();
    filtresChipsDiv.empty();
    if (filtresActifs.size === 0) return;
    filtresChipsDiv.createSpan({ cls: 'cp-sources-label', text: 'Filtres actifs : ' });
    [...filtresActifs].forEach(tag => {
      creeChipTag(filtresChipsDiv, tag, () => desactiveFiltre(tag));
    });
  };
  renderFiltresTags();

  const ajouterFiltre = () => {
    const tag = filtreInput.value.trim().toLowerCase();
    if (!tag) return;
    activeFiltre(tag);
    filtreInput.value = '';
  };
  btnAjouterFiltre.addEventListener('click', ajouterFiltre);
  filtreInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ajouterFiltre(); } });

  // --- Exclusion (NOT/NOR) : symétrique de l'inclusion ci-dessus ---
  const activeExclusion = (tag) => { filtresExclus.add(tag); renderExclusionTags(); };
  const desactiveExclusion = (tag) => { filtresExclus.delete(tag); renderExclusionTags(); };
  const panneauTousTagsExclusion = creePanneauTousTags(
    sectionExclusion.body,
    btnTousTagsExclusion,
    () => tousLesTagsUtilises().filter(t => t !== TAG_EXCLU && !filtresExclus.has(t)),
    activeExclusion,
    'Voir tous les tags à exclure'
  );

  const renderExclusionRapides = () => {
    exclusionRapidesDiv.empty();
    if (!tousLesTagsUtilises().includes('connu')) return;
    const actif = filtresExclus.has('connu');
    const btn = exclusionRapidesDiv.createEl('button', {
      cls: 'cp-hasard-filtre-rapide' + (actif ? ' cp-hasard-filtre-rapide-actif' : ''),
      text: '🚫 Masquer les mots connus'
    });
    const c = couleurTag('connu');
    btn.style.borderColor = c;
    if (actif) { btn.style.background = c; btn.style.color = '#fff'; } else { btn.style.color = c; }
    btn.addEventListener('click', () => { actif ? desactiveExclusion('connu') : activeExclusion('connu'); });
  };

  const renderExclusionTags = () => {
    renderFiltresTags(); // rafraîchit aussi les badges/bandeau partagés
    renderExclusionRapides();
    const tags = tousLesTagsUtilises().filter(t => t !== TAG_EXCLU);
    exclusionDatalist.empty();
    tags.forEach(tag => {
      if (filtresExclus.has(tag)) return;
      exclusionDatalist.createEl('option', { attr: { value: tag } });
    });
    panneauTousTagsExclusion.render();
    exclusionChipsDiv.empty();
    if (filtresExclus.size === 0) return;
    exclusionChipsDiv.createSpan({ cls: 'cp-sources-label', text: 'Exclus : ' });
    [...filtresExclus].forEach(tag => {
      creeChipTag(exclusionChipsDiv, tag, () => desactiveExclusion(tag));
    });
  };
  renderExclusionTags();

  const ajouterExclusion = () => {
    const tag = exclusionInput.value.trim().toLowerCase();
    if (!tag) return;
    activeExclusion(tag);
    exclusionInput.value = '';
  };
  btnAjouterExclusion.addEventListener('click', ajouterExclusion);
  exclusionInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ajouterExclusion(); } });



  const zone = panelHasard.createDiv({ cls: 'cp-hasard-zone' });
  compteurPoolEl = zone.createDiv({ cls: 'cp-hasard-compteur-pool' });
  const btnTirerWrap = zone.createDiv({ cls: 'cp-hasard-bouton-wrap' });
  const btnTirer = btnTirerWrap.createEl('button', { text: '🎲 Tire un mot au hasard', cls: 'cp-hasard-bouton' });
  renderFiltresTags(); // calcule le compteur maintenant qu'il existe (il n'existait pas au tout premier appel plus haut)
  const motEl = zone.createEl('div', { cls: 'cp-hasard-mot' });
  const noteEl = zone.createDiv({ cls: 'cp-hasard-note' });
  // Affiche une note en gérant le séparateur de fusion ("---" inséré par
  // nettoieEtFusionneDictionnairePerso quand deux notes différentes sont
  // agrégées) avec un espacement compact et maîtrisé, plutôt que de
  // dépendre du nombre de retours à la ligne bruts stockés dans le texte
  // — corrige aussi les notes déjà fusionnées sans avoir à les retoucher.
  const afficheNoteHasard = (texte) => {
    noteEl.empty();
    const parties = (texte || '').split(/\n*\s*---\s*\n*/)
      // Les "\n" internes viennent souvent d'une mise en page à largeur
      // fixe dans la source scannée (retour à la ligne arbitraire au
      // milieu d'une phrase, pas un vrai saut de paragraphe) — on les
      // aplati en simples espaces pour laisser le texte s'enchaîner
      // naturellement, et laisser le CSS (justify) gérer le retour à la
      // ligne proprement plutôt que de cumuler les deux.
      .map(p => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    parties.forEach((partie, i) => {
      if (i > 0) noteEl.createDiv({ cls: 'cp-hasard-note-sep', text: '· · ·' });
      noteEl.createDiv({ cls: 'cp-hasard-note-partie', text: partie });
    });
  };
  const chipsDiv = zone.createDiv({ cls: 'cp-hasard-tags' });

  // actions de navigation (définition, rimes, exclusion) — séparées de
  // la gravure et du tagging, qui vivent dans leurs propres zones plus bas
  const actions = zone.createDiv({ cls: 'cp-hasard-actions' });
  actions.style.display = 'none';
  const btnDefs = actions.createEl('button', { cls: 'cp-link-btn', text: 'Voir sa définition (CNRTL) →' });
  const btnRimes = actions.createEl('button', { cls: 'cp-link-btn', text: 'Chercher ses rimes →' });
  const btnExclure = actions.createEl('button', { cls: 'cp-link-btn cp-btn-exclure', text: '🚫 Ne plus tirer ce mot' });

  // boutons de tag rapide (presets dynamiques, les plus utilisés en
  // premier) + accès à la liste complète, colorée et cliquable, plutôt
  // que le datalist natif du champ texte (illisible dès qu'il y a
  // beaucoup de tags — liste plate, non triée par pertinence, sans
  // couleur pour s'y repérer).
  const presetsDiv = zone.createDiv({ cls: 'cp-hasard-tag-presets' });
  const btnTousTags = zone.createEl('button', { cls: 'cp-link-btn cp-hasard-voir-tous-tags', text: 'Voir tous les tags' });
  btnTousTags.style.display = 'none';

  const choisirTag = async (tag) => {
    if (!motCourant) return;
    await ajouteTagMot(vue.plugin, motCourant, tag);
    renderChips();
    renderFiltresTags();
    renderPresets();
  };
  const panneauTousTags = creePanneauTousTags(zone, btnTousTags, () => {
    const tous = tagsParFrequence();
    return tous.length > 6 ? [...tous].sort() : [];
  }, choisirTag);

  const renderPresets = () => {
    presetsDiv.empty();
    tagsParFrequence().slice(0, 6).forEach(tag => {
      const btn = presetsDiv.createEl('button', { cls: 'cp-hasard-preset-btn', text: '+ ' + tag });
      const c = couleurTag(tag);
      btn.style.borderColor = c;
      btn.style.color = c;
      btn.addEventListener('click', () => choisirTag(tag));
    });
    panneauTousTags.render();
  };

  // ajout de tag rapide (libre) sur le mot courant
  const tagFormDiv = zone.createDiv({ cls: 'cp-hasard-tag-ajout' });
  tagFormDiv.style.display = 'none';
  const tagAjoutDatalistId = 'cp-hasard-tagajout-' + Math.random().toString(36).slice(2, 8);
  const tagInput = tagFormDiv.createEl('input', { attr: { type: 'text', placeholder: 'ajouter un tag (ex. désuet)', list: tagAjoutDatalistId } });
  tagAjoutDatalist = tagFormDiv.createEl('datalist', { attr: { id: tagAjoutDatalistId } });
  tousLesTagsUtilises().forEach(tag => tagAjoutDatalist.createEl('option', { attr: { value: tag } }));
  const btnAjouterTag = tagFormDiv.createEl('button', { cls: 'cp-link-btn', text: '+ tag' });

  // gravure : tout en bas, APRÈS le tagging — on tague d'abord ce que le
  // mot évoque, on grave ensuite pour committer ça dans le fichier, pas
  // l'inverse. Sa propre zone, séparée visuellement par un filet.
  const graverWrap = zone.createDiv({ cls: 'cp-hasard-graver-wrap' });
  graverWrap.style.display = 'none';
  const btnGraver = graverWrap.createEl('button', { cls: 'cp-hasard-graver-btn', text: '💾 Graver dans dictionnaire-perso.json' });

  let motCourant = null;
  let noteCourante = '';

  const renderChips = () => {
    chipsDiv.empty();
    if (!motCourant) return;
    tagsDuMot(motCourant).forEach(tag => {
      creeChipTag(chipsDiv, tag, async () => {
        await retireTagMot(vue.plugin, motCourant, tag);
        renderChips();
        renderFiltresTags();
        renderPresets();
      });
    });
  };

  const tirer = () => {
    const entree = motAuHasard({
      tagsActifs: filtresActifs,
      modeET: modeETCase.checked,
      modePlusUnAutre: modePlusUnAutreCase.checked,
      tagsExclus: filtresExclus,
      masquerTagues: masquerTaguesCase.checked,
      modeMultiTagues: multiTaguesCase.checked,
      modeRevueExclus,
    });
    if (!entree) {
      motEl.setText('Aucun mot disponible avec ces filtres.');
      afficheNoteHasard('');
      chipsDiv.empty();
      presetsDiv.empty();
      actions.style.display = 'none';
      graverWrap.style.display = 'none';
      tagFormDiv.style.display = 'none';
      motCourant = null;
      return;
    }
    motCourant = entree.mot;
    noteCourante = entree.note || '';
    motEl.setText(entree.mot);
    afficheNoteHasard(noteCourante);
    renderChips();
    renderPresets();
    actions.style.display = 'flex';
    graverWrap.style.display = 'flex';
    tagFormDiv.style.display = 'flex';
  };

  btnDefs.addEventListener('click', () => {
    if (!motCourant) return;
    if (vue._switchTab) vue._switchTab('defs');
    if (vue._prefillDefsInput) vue._prefillDefsInput(motCourant);
  });
  btnRimes.addEventListener('click', () => {
    if (!motCourant) return;
    if (vue._switchTab) vue._switchTab('rimes');
    if (vue._prefillRimeInput) vue._prefillRimeInput(motCourant);
  });
  btnExclure.addEventListener('click', async () => {
    if (!motCourant) return;
    await ajouteTagMot(vue.plugin, motCourant, TAG_EXCLU);
    new Notice(`« ${motCourant} » ne sera plus tiré au hasard.`);
    renderFiltresTags();
    tirer();
  });
  btnGraver.addEventListener('click', async () => {
    if (!motCourant) return;
    const mot = motCourant;
    const tags = tagsDuMot(mot);
    await ajouteMotRarePerso(vue.plugin, mot, noteCourante, tags);
    await purgeMetaMot(vue.plugin, mot);
    new Notice(`« ${mot} » gravé dans dictionnaire-perso.json (zone tampon vidée).`);
    renderFiltresTags();
    renderPresets();
    if (motCourant && normaliseMot(motCourant) === normaliseMot(mot)) renderChips();
  });
  btnAjouterTag.addEventListener('click', async () => {
    if (!motCourant || !tagInput.value.trim()) return;
    await ajouteTagMot(vue.plugin, motCourant, tagInput.value);
    tagInput.value = '';
    renderChips();
    renderFiltresTags();
    renderPresets();
  });
  tagInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnAjouterTag.click(); });

  btnTirer.addEventListener('click', tirer);
  tirer();

  // --- ajout manuel d'un mot rare ---
  const ajoutDetails = panelHasard.createEl('details', { cls: 'cp-hasard-ajout' });
  ajoutDetails.createEl('summary', { text: '+ Ajouter un mot rare manuellement' });
  const ajoutForm = ajoutDetails.createDiv({ cls: 'cp-hasard-ajout-form' });
  const inputMot = ajoutForm.createEl('input', { attr: { type: 'text', placeholder: 'mot' } });
  const inputNote = ajoutForm.createEl('input', { attr: { type: 'text', placeholder: 'définition courte (optionnel)' } });
  const inputTags = ajoutForm.createEl('input', { attr: { type: 'text', placeholder: 'tags séparés par une virgule (optionnel)' } });
  const btnAjouterMot = ajoutForm.createEl('button', { cls: 'cp-link-btn', text: 'Ajouter à mon dictionnaire personnel' });
  btnAjouterMot.addEventListener('click', async () => {
    const mot = inputMot.value.trim();
    if (!mot) { new Notice('Le mot est requis.'); return; }
    const tags = inputTags.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    await ajouteMotRarePerso(vue.plugin, mot, inputNote.value.trim(), tags);
    new Notice(`« ${mot} » ajouté à ton dictionnaire personnel.`);
    inputMot.value = ''; inputNote.value = ''; inputTags.value = '';
    renderFiltresTags();
  });

  // --- stats, repliées en bas pour ne pas surcharger le haut du panel ---
  const statsDetails = panelHasard.createEl('details', { cls: 'cp-hasard-stats-details' });
  statsDetails.createEl('summary', { text: 'Afficher les statistiques' });
  statsDiv = statsDetails.createDiv({ cls: 'cp-hasard-stats' });
  statsDetails.addEventListener('toggle', () => { if (statsDetails.open) renderStats(); });
  renderStats();
}

