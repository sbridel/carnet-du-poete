/* =========================================================
   VUE PRINCIPALE
   ========================================================= */

class CarnetView extends ItemView {
  constructor(leaf, plugin){
    super(leaf);
    this.plugin = plugin;
  }
  getViewType(){ return VIEW_TYPE; }
  getDisplayText(){ return 'Carnet du Poète'; }
  getIcon(){ return 'feather'; }

  async onOpen(){
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('carnet-poete-view');

    container.createEl('h2', { text: 'Le Carnet du Poète' });

    const tabBar = container.createDiv({ cls: 'cp-tabs' });
    const tabSyl = tabBar.createEl('button', { text: 'Syllabes', cls: 'cp-tab active' });
    const tabRimes = tabBar.createEl('button', { text: 'Rimes', cls: 'cp-tab' });
    const tabInspi = tabBar.createEl('button', { text: 'Inspiration', cls: 'cp-tab' });
    const tabSyno = tabBar.createEl('button', { text: 'Synonymes', cls: 'cp-tab' });
    const tabGuide = tabBar.createEl('button', { text: 'Guide', cls: 'cp-tab' });
    const tabDefs = tabBar.createEl('button', { text: 'Définitions', cls: 'cp-tab' });
    const tabHasard = tabBar.createEl('button', { text: 'Hasard', cls: 'cp-tab' });
    const tabNotes = tabBar.createEl('button', { text: 'Notes', cls: 'cp-tab' });

    const panelSyl = container.createDiv({ cls: 'cp-panel active' });
    const panelRimes = container.createDiv({ cls: 'cp-panel' });
    const panelInspi = container.createDiv({ cls: 'cp-panel' });
    const panelSyno = container.createDiv({ cls: 'cp-panel' });
    const panelGuide = container.createDiv({ cls: 'cp-panel' });
    const panelDefs = container.createDiv({ cls: 'cp-panel' });
    const panelHasard = container.createDiv({ cls: 'cp-panel' });
    const panelNotes = container.createDiv({ cls: 'cp-panel' });

    const switchTab = (which) => {
      tabSyl.toggleClass('active', which === 'syl');
      tabRimes.toggleClass('active', which === 'rimes');
      tabInspi.toggleClass('active', which === 'inspi');
      tabSyno.toggleClass('active', which === 'syno');
      tabGuide.toggleClass('active', which === 'guide');
      tabDefs.toggleClass('active', which === 'defs');
      tabHasard.toggleClass('active', which === 'hasard');
      tabNotes.toggleClass('active', which === 'notes');
      panelSyl.toggleClass('active', which === 'syl');
      panelRimes.toggleClass('active', which === 'rimes');
      panelInspi.toggleClass('active', which === 'inspi');
      panelSyno.toggleClass('active', which === 'syno');
      panelGuide.toggleClass('active', which === 'guide');
      panelDefs.toggleClass('active', which === 'defs');
      panelHasard.toggleClass('active', which === 'hasard');
      panelNotes.toggleClass('active', which === 'notes');
      if (which === 'notes' && this._rafraichitPanelNotes) this._rafraichitPanelNotes();
      if (which === 'rimes' && this._rafraichitAssonanceRimes) this._rafraichitAssonanceRimes();
    };
    tabSyl.addEventListener('click', () => switchTab('syl'));
    tabRimes.addEventListener('click', () => switchTab('rimes'));
    tabInspi.addEventListener('click', () => switchTab('inspi'));
    tabSyno.addEventListener('click', () => switchTab('syno'));
    tabGuide.addEventListener('click', () => switchTab('guide'));
    tabDefs.addEventListener('click', () => switchTab('defs'));
    tabHasard.addEventListener('click', () => switchTab('hasard'));
    tabNotes.addEventListener('click', () => switchTab('notes'));
    this._switchTab = switchTab;

    this.buildPanelSyllabes(panelSyl);
    this.buildPanelRimes(panelRimes);
    this.buildPanelInspiration(panelInspi);
    this.buildPanelSynonymes(panelSyno);
    this.buildPanelGuide(panelGuide);
    this.buildPanelDefinitions(panelDefs);
    this.buildPanelHasard(panelHasard);
    this.buildPanelNotes(panelNotes);

    const footer = container.createEl('p', { cls: 'cp-footer' });
    footer.setText('Comptage heuristique : règle du e caduc + détection des hiatus (diérèse affichée en variante complète). Dictionnaires curatés, non exhaustifs — vous pouvez les étendre via un fichier dictionnaire-perso.json (familles de rimes, dictionnaire phonétique, champs lexicaux, synonymes).');
