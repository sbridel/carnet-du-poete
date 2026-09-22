  }

  buildPanelRimes(panelRimes){
    const rimeForm = panelRimes.createDiv({ cls: 'cp-rime-form' });
    const motInput = rimeForm.createEl('input', { attr: { type: 'text', placeholder: 'Un mot… (ex. lumière, chapeau, courage)' } });
    const btnChercher = rimeForm.createEl('button', { text: 'Chercher' });

    const filtresDiv = panelRimes.createDiv({ cls: 'cp-filtres' });
    const lettreInput = filtresDiv.createEl('input', { cls: 'cp-filtre-lettre', attr: { type: 'text', maxlength: '1', placeholder: 'Lettre' } });
    const syllabesWrap = filtresDiv.createDiv({ cls: 'cp-select-wrap' });
    const syllabesSelect = syllabesWrap.createEl('select', { cls: 'cp-filtre-syllabes' });
    syllabesWrap.createSpan({ cls: 'cp-select-arrow', text: '▾' });
    [['', 'Toutes syllabes'], ['1','1 syll.'], ['2','2 syll.'], ['3','3 syll.'], ['4','4 syll.'], ['5+','5+ syll.']]
      .forEach(([val, label]) => syllabesSelect.createEl('option', { attr: { value: val }, text: label }));

    const qualiteDiv = filtresDiv.createDiv({ cls: 'cp-qualite-filtres' });
    const casesQualite = {};
    // 5 cases indépendantes, toutes de vraies checkbox du DOM — seule
    // source de vérité, jamais dupliquée ni resynchronisée à la main.
    [['pauvre','Pauvre'],['suffisante','Suffisante'],['riche','Riche'],['tresriche','Très riche'],['leonine','Léonine']].forEach(([id, label]) => {
      const lbl = qualiteDiv.createEl('label', { cls: 'cp-hasard-toggle-pool cp-qualite-pill' });
      lbl.style.setProperty('--qcolor', COULEURS_QUALITE[id]);
      const c = lbl.createEl('input', { attr: { type: 'checkbox' } });
      c.checked = (id !== 'pauvre'); // pauvre décochée par défaut
      lbl.createSpan({ text: ' ' + label });
      casesQualite[id] = c;
    });

    // "Riche+" n'est qu'un raccourci d'action (pas une case, pas un état
    // à maintenir) : au clic, il lit l'état actuel de riche/tresriche/
    // leonine et les coche/décoche tous les 3 ensemble. Aucune duplication
    // d'état possible puisqu'il ne fait que lire/écrire les 3 vraies cases.
    const btnRichePlus = filtresDiv.createEl('button', { cls: 'cp-link-btn', text: 'Riche+ (tout / rien)' });
    btnRichePlus.setAttr('title', 'Coche ou décoche riche + très riche + léonine en une fois.');
    btnRichePlus.addEventListener('click', () => {
      const cible = !(casesQualite.riche.checked && casesQualite.tresriche.checked && casesQualite.leonine.checked);
      casesQualite.riche.checked = cible;
      casesQualite.tresriche.checked = cible;
      casesQualite.leonine.checked = cible;
      chercher();
    });

    const sourcesDiv = panelRimes.createDiv({ cls: 'cp-sources' });
    sourcesDiv.createSpan({ cls: 'cp-sources-label', text: 'Compléter en ligne : ' });
    const caseRimesSolides = sourcesDiv.createEl('label', { cls: 'cp-hasard-toggle-pool' });
    const inputRimesSolides = caseRimesSolides.createEl('input', { attr: { type: 'checkbox' } });
    caseRimesSolides.createSpan({ text: ' RimesSolides' });

    const modeDiv = sourcesDiv.createDiv({ cls: 'cp-qualite-sousfiltres' });
    const modeLabel = modeDiv.createEl('label', { cls: 'cp-hasard-toggle-pool' });
    const inputModeAssonance = modeLabel.createEl('input', { attr: { type: 'checkbox' } });
    modeLabel.createSpan({ text: ' Mode assonance (accepte les rimes approchées)' });
    inputModeAssonance.setAttr('title', 'Rime stricte par défaut : les résultats doivent réellement rimer. Coche pour aussi accepter les assonances (même voyelle, terminaison différente — ex. « ombre »/« montre »), affichées à part.');

    const resultatsDiv = panelRimes.createDiv({ cls: 'cp-resultats' });

    (async () => {
      const data = await this.plugin.loadData();
      inputModeAssonance.checked = !!(data && data.modeAssonance);
      MODE_ASSONANCE = inputModeAssonance.checked;
    })();
    inputModeAssonance.addEventListener('change', async () => {
      MODE_ASSONANCE = inputModeAssonance.checked;
      const data = (await this.plugin.loadData()) || {};
      data.modeAssonance = inputModeAssonance.checked;
      await this.plugin.saveData(data);
      chercher();
    });
    // Le réglage global (Settings → Carnet du Poète) peut changer
    // MODE_ASSONANCE pendant qu'on est sur un autre onglet ; on resynchronise
    // la case visuellement à chaque retour sur l'onglet Rimes plutôt que de
    // la figer à l'ouverture initiale du panneau.
    this._rafraichitAssonanceRimes = () => { inputModeAssonance.checked = MODE_ASSONANCE; };

    const lireFiltres = () => ({
      lettre: lettreInput.value.trim(),
      syllabes: syllabesSelect.value,
      qualites: new Set(Object.keys(casesQualite).filter(id => casesQualite[id].checked))
    });
    const sourcesActives = () => (inputRimesSolides.checked ? ['rimessolides'] : []);

    const chercher = () => renderResultatsRimes(resultatsDiv, motInput.value, lireFiltres(), this.plugin, sourcesActives());
    // Même raison que _renderAnalyseSyllabes : permettre un recalcul externe
    // (toggle debug dico perso) sans avoir à retaper la recherche.
    this._rechercherRimes = chercher;

    btnChercher.addEventListener('click', chercher);
    motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });
    lettreInput.addEventListener('input', chercher);
    syllabesSelect.addEventListener('change', chercher);
    Object.values(casesQualite).forEach(c => c.addEventListener('change', chercher));
    inputRimesSolides.addEventListener('change', chercher);

    this._prefillRimeInput = (mot) => {
      motInput.value = mot;
      chercher();
    };
