
function buildPanelInspiration(vue, panelInspi){

  const sourcesDiv = panelInspi.createDiv({ cls: 'cp-sources' });
  sourcesDiv.createSpan({ cls: 'cp-sources-label', text: 'Compléter en ligne : ' });
  const cases = {};
  SOURCES_INSPIRATION.forEach(source => {
    const label = sourcesDiv.createEl('label', { cls: 'cp-hasard-toggle-pool' });
    const case_ = label.createEl('input', { attr: { type: 'checkbox' } });
    label.createSpan({ text: ' ' + source.nom });
    cases[source.id] = case_;
  });

  // Légende des couleurs (même présentation que "Afficher les
  // statistiques" de l'onglet Hasard), fermée par défaut.
  const legende = panelInspi.createEl('details', { cls: 'cp-hasard-stats-details cp-inspi-legende' });
  legende.createEl('summary', { text: 'Afficher la légende' });
  NATURES_INSPIRATION.forEach(n => {
    const ligne = legende.createDiv({ cls: `cp-inspi-legende-ligne cp-nature-${n.cle}` });
    ligne.createSpan({ cls: 'cp-inspi-pastille' });
    ligne.createSpan({ cls: 'cp-inspi-legende-nom', text: n.nom });
    ligne.createSpan({ cls: 'cp-inspi-legende-detail', text: ' : ' + n.detail });
  });

  const form = panelInspi.createDiv({ cls: 'cp-rime-form' });
  const motInput = form.createEl('input', { attr: { type: 'text', placeholder: 'Un thème… (ex. forêt, mer, nuit, amour, moyen-âge)' } });
  const btnChercher = form.createEl('button', { text: 'Chercher' });

  // --- sélection persistante à travers les recherches + barre d'action ---
  const selectionMots = new Map(); // normaliseMot(mot) -> { mot, themeSuggere, note }
  const actionBarDiv = panelInspi.createDiv({ cls: 'cp-inspi-action-bar' });
  actionBarDiv.style.display = 'none';

  const renderActionBar = () => {
    actionBarDiv.empty();
    if (selectionMots.size === 0) { actionBarDiv.style.display = 'none'; return; }
    actionBarDiv.style.display = 'flex';

    const chipsRow = actionBarDiv.createDiv({ cls: 'cp-inspi-selection-chips' });
    chipsRow.createSpan({ cls: 'cp-sources-label', text: `${selectionMots.size} mot(s) sélectionné(s) : ` });
    [...selectionMots.values()].forEach(({ mot }) => {
      const chip = chipsRow.createSpan({ cls: 'cp-tag-chip' });
      chip.createSpan({ text: mot });
      const btnX = chip.createSpan({ cls: 'cp-tag-chip-x', text: ' ×' });
      btnX.addEventListener('click', () => { toggleSelection(mot); });
    });
    const btnClear = chipsRow.createEl('button', { cls: 'cp-link-btn', text: 'Tout désélectionner' });
    btnClear.addEventListener('click', () => { selectionMots.clear(); renderActionBar(); });

    const actionsRow = actionBarDiv.createDiv({ cls: 'cp-inspi-selection-actions' });
    const btnChamp = actionsRow.createEl('button', { cls: 'cp-hasard-graver-btn', text: '+ Ajouter à un champ lexical' });
    const btnRare = actionsRow.createEl('button', { cls: 'cp-hasard-graver-btn', text: '+ Ajouter comme mot(s) rare(s)' });

    let formChamp = null;
    btnChamp.addEventListener('click', () => {
      if (formChamp) { formChamp.remove(); formChamp = null; return; }
      formChamp = actionBarDiv.createDiv({ cls: 'cp-inspi-ajout-form' });
      const datalistId = 'cp-inspi-themes-' + Math.random().toString(36).slice(2, 8);
      const themeInput = formChamp.createEl('input', { attr: { type: 'text', placeholder: 'thème (ex. Bretagne)', list: datalistId } });
      const datalist = formChamp.createEl('datalist', { attr: { id: datalistId } });
      tousLesThemesLexicaux().forEach(t => datalist.createEl('option', { attr: { value: t } }));
      const clefsInput = formChamp.createEl('input', { attr: { type: 'text', placeholder: 'mots-clés séparés par virgule (si nouveau thème)' } });
      const btnValider = formChamp.createEl('button', { cls: 'cp-link-btn', text: `Ajouter les ${selectionMots.size} mot(s)` });

      // Suggestion affichée à part (jamais pré-remplie en silence) : si
      // tous les mots sélectionnés viennent du même champ reconnu, on
      // propose ce thème, mais seul un clic explicite l'applique — un
      // mot présent dans deux champs à la fois (ex. rattaché à "Nuit &
      // obscurité" ET à "Noir") ne doit jamais faire deviner le mauvais.
      const themesSuggeres = [...new Set([...selectionMots.values()].map(v => v.themeSuggere).filter(Boolean))];
      if (themesSuggeres.length === 1) {
        const suggestion = formChamp.createDiv({ cls: 'cp-inspi-suggestion' });
        suggestion.createSpan({ text: 'Suggestion : ' });
        const btnSuggestion = suggestion.createEl('button', { cls: 'cp-link-btn', text: themesSuggeres[0] });
        btnSuggestion.addEventListener('click', () => { themeInput.value = themesSuggeres[0]; themeInput.focus(); });
      }

      const valider = async () => {
        const theme = themeInput.value.trim();
        if (!theme) { new Notice('Le thème est requis.'); return; }
        const motsClefs = clefsInput.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        const mots = [...selectionMots.values()];
        for (const { mot, note } of mots) {
          await ajouteMotChampLexicalPerso(vue.plugin, theme, motsClefs, mot, note || '', { silencieux: true });
        }
        new Notice(`Carnet du Poète : ${mots.length} mot(s) ajouté(s) au champ lexical « ${theme} ».`);
        selectionMots.clear();
        renderActionBar();
      };
      btnValider.addEventListener('click', valider);
      themeInput.addEventListener('keydown', e => { if (e.key === 'Enter') valider(); });
    });

    btnRare.addEventListener('click', async () => {
      const mots = [...selectionMots.values()];
      for (const { mot, note } of mots) {
        await ajouteMotRarePerso(vue.plugin, mot, note || '', []);
      }
      new Notice(`Carnet du Poète : ${mots.length} mot(s) ajouté(s) comme mot(s) rare(s) dans dictionnaire-perso.json.`);
      selectionMots.clear();
      renderActionBar();
    });
  };

  const toggleSelection = (mot, themeSuggere, note) => {
    const w = normaliseMot(mot);
    if (selectionMots.has(w)) selectionMots.delete(w);
    else selectionMots.set(w, { mot, themeSuggere, note });
    renderActionBar();
  };
  const selectionApi = {
    estSelectionne: (w) => selectionMots.has(w),
    toggle: toggleSelection
  };

  const resultatsDiv = panelInspi.createDiv({ cls: 'cp-resultats' });

  const sourcesActives = () => SOURCES_INSPIRATION.map(src => src.id).filter(id => cases[id].checked);

  const sauvePreference = async () => {
    const data = (await vue.plugin.loadData()) || {};
    data.sourcesEnLigneInspiration = sourcesActives();
    await vue.plugin.saveData(data);
  };
  (async () => {
    const data = await vue.plugin.loadData();
    const prefs = (data && Array.isArray(data.sourcesEnLigneInspiration)) ? data.sourcesEnLigneInspiration : [];
    SOURCES_INSPIRATION.forEach(src => { cases[src.id].checked = prefs.includes(src.id); });
  })();
  Object.values(cases).forEach(c => c.addEventListener('change', sauvePreference));

  const chercher = () => renderResultatsInspiration(resultatsDiv, motInput.value, vue.plugin, sourcesActives(), selectionApi);

  btnChercher.addEventListener('click', chercher);
  motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });

  vue._prefillInspiInput = (mot) => {
    motInput.value = mot;
    chercher();
  };
}

