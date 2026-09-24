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
    tabSyl.setAttr('title', 'Colle ou écris tes vers pour compter leurs syllabes et repérer le schéma de rimes (AABB, ABBA...).\nLe volet « Sonorités » (bouton en haut) affiche en plus les allitérations et assonances internes.');
    const tabRimes = tabBar.createEl('button', { text: 'Rimes', cls: 'cp-tab' });
    tabRimes.setAttr('title', 'Cherche les rimes d\'un mot dans le dictionnaire local, complété à la demande par RimesSolides et le Wiktionnaire.\nFiltre les résultats par lettre, nombre de syllabes, qualité de la rime et catégorie grammaticale.');
    const tabInspi = tabBar.createEl('button', { text: 'Inspiration', cls: 'cp-tab' });
    tabInspi.setAttr('title', 'Tape un mot courant, reçois du vocabulaire plus rare, littéraire ou désuet autour du même thème.\nClique sur un mot pour le sélectionner, puis ajoute ta sélection à un champ lexical ou comme mots rares.');
    const tabSyno = tabBar.createEl('button', { text: 'Synonymes', cls: 'cp-tab' });
    tabSyno.setAttr('title', 'Tape un mot courant pour voir ses synonymes et ses antonymes.\nUtile pour varier une rime ou un rythme sans changer le sens.');
    const tabGuide = tabBar.createEl('button', { text: 'Guide', cls: 'cp-tab' });
    tabGuide.setAttr('title', 'Aide-mémoire des règles de versification utilisées par le plugin : syllabes, mètres, schémas et qualité de rime, sonorités.\nÀ consulter pour comprendre un terme ou un critère affiché ailleurs dans le plugin.');
    const tabDefs = tabBar.createEl('button', { text: 'Définitions', cls: 'cp-tab' });
    tabDefs.setAttr('title', 'Vérifie le sens exact et le registre d\'un mot rare avant de l\'utiliser.\nPlusieurs dictionnaires du CNRTL (TLFi, Wiktionnaire, Académie, Littré, Dictionnaire du Moyen Français), sélectionnables à la demande.');
    const tabHasard = tabBar.createEl('button', { text: 'Hasard', cls: 'cp-tab' });
    tabHasard.setAttr('title', 'Un mot rare, oublié ou savant, tiré au hasard — pour la surprise et l\'inspiration.\nMarque-le (like, exclu, tag libre) pour affiner tes futurs tirages.');
    const tabNotes = tabBar.createEl('button', { text: 'Notes', cls: 'cp-tab' });
    tabNotes.setAttr('title', 'Retrouve les mots ajoutés sans définition (import en masse, sélection dans Inspiration...).\nComplète-les à la main ; c\'est enregistré directement dans ton dictionnaire personnel.');

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

    buildPanelSyllabes(this, panelSyl);
    buildPanelRimes(this, panelRimes);
    buildPanelInspiration(this, panelInspi);
    buildPanelSynonymes(this, panelSyno);
    buildPanelGuide(this, panelGuide);
    buildPanelDefinitions(this, panelDefs);
    buildPanelHasard(this, panelHasard);
    buildPanelNotes(this, panelNotes);

    const footer = container.createEl('p', { cls: 'cp-footer' });
    footer.setText('Dictionnaires phonétiques et lexicaux compilés à la main, non exhaustifs — vous pouvez les étendre via un fichier dictionnaire-perso.json (familles de rimes, dictionnaire phonétique, champs lexicaux, synonymes).');
  }

  async onClose(){}
}

