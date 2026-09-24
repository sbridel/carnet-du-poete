
function buildPanelSynonymes(vue, panelSyno){

  const sourcesDiv = panelSyno.createDiv({ cls: 'cp-sources' });
  sourcesDiv.createSpan({ cls: 'cp-sources-label', text: 'Rechercher aussi en ligne : ' });
  const cases = {};
  SOURCES_EN_LIGNE_ORDRE.forEach(id => {
    const source = SOURCES_EN_LIGNE[id];
    const label = sourcesDiv.createEl('label', { cls: 'cp-hasard-toggle-pool' });
    const case_ = label.createEl('input', { attr: { type: 'checkbox' } });
    label.createSpan({ text: ' ' + source.nom });
    cases[id] = case_;
  });

  const form = panelSyno.createDiv({ cls: 'cp-rime-form' });
  const motInput = form.createEl('input', { attr: { type: 'text', placeholder: 'Un mot… (ex. beau, triste, lumière)' } });
  const btnChercher = form.createEl('button', { text: 'Chercher' });

  const rimeCibleDiv = panelSyno.createDiv({ cls: 'cp-filtres' });
  const rimeCibleInput = rimeCibleDiv.createEl('input', { cls: 'cp-filtre-lettre', attr: { type: 'text', placeholder: 'Rime avec… (optionnel)', style: 'width:180px' } });
  rimeCibleInput.setAttr('title', 'Optionnel : ne garder que les synonymes/antonymes qui riment aussi avec ce second mot — utile quand tu cherches un synonyme de X contraint par une rime déjà fixée par un autre vers.');
  const syllabesSynoWrap = rimeCibleDiv.createDiv({ cls: 'cp-select-wrap' });
  const syllabesSynoSelect = syllabesSynoWrap.createEl('select', { cls: 'cp-filtre-syllabes' });
  syllabesSynoWrap.createSpan({ cls: 'cp-select-arrow', text: '▾' });
  [['', 'Toutes syllabes'], ['1','1 syll.'], ['2','2 syll.'], ['3','3 syll.'], ['4','4 syll.'], ['5+','5+ syll.']]
    .forEach(([val, label]) => syllabesSynoSelect.createEl('option', { attr: { value: val }, text: label }));
  syllabesSynoSelect.setAttr('title', 'Ne garder que les synonymes/antonymes ayant ce nombre de syllabes — utile pour caser un mot dans un mètre précis.');

  const resultatsDiv = panelSyno.createDiv({ cls: 'cp-resultats' });

  const sourcesActives = () => SOURCES_EN_LIGNE_ORDRE.filter(id => cases[id].checked);

  const sauvePreferenceSources = async () => {
    const data = (await vue.plugin.loadData()) || {};
    data.sourcesEnLigne = sourcesActives();
    await vue.plugin.saveData(data);
  };

  (async () => {
    const data = await vue.plugin.loadData();
    const prefs = (data && Array.isArray(data.sourcesEnLigne)) ? data.sourcesEnLigne : ['wiktionnaire'];
    SOURCES_EN_LIGNE_ORDRE.forEach(id => { cases[id].checked = prefs.includes(id); });
  })();

  Object.values(cases).forEach(c => c.addEventListener('change', sauvePreferenceSources));

  const chercher = () => renderResultatsSynonymes(resultatsDiv, motInput.value, vue.plugin, sourcesActives(), rimeCibleInput.value, syllabesSynoSelect.value);
  vue._rechercherSynonymes = chercher;

  btnChercher.addEventListener('click', chercher);
  motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });
  rimeCibleInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });
  rimeCibleInput.addEventListener('input', chercher);
  syllabesSynoSelect.addEventListener('change', chercher);

  vue._prefillSynoInput = (mot) => {
    motInput.value = mot;
    chercher();
  };
}

