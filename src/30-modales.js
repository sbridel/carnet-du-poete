/* =========================================================
   MODALE DE RECHERCHE DE RIMES (depuis une sélection)
   ========================================================= */

class RhymeModal extends Modal {
  constructor(app, mot){
    super(app);
    this.mot = mot;
  }
  onOpen(){
    const { contentEl } = this;
    contentEl.addClass('carnet-poete-view');
    contentEl.createEl('h3', { text: `Rimes pour « ${this.mot} »` });
    const resultatsDiv = contentEl.createDiv({ cls: 'cp-resultats' });
    renderResultatsRimes(resultatsDiv, this.mot);
  }
  onClose(){ this.contentEl.empty(); }
}

/* =========================================================
   MODALE D'INSPIRATION (depuis une sélection)
   ========================================================= */

class InspirationModal extends Modal {
  constructor(app, mot){
    super(app);
    this.mot = mot;
  }
  onOpen(){
    const { contentEl } = this;
    contentEl.addClass('carnet-poete-view');
    contentEl.createEl('h3', { text: `Inspiration autour de « ${this.mot} »` });
    const resultatsDiv = contentEl.createDiv({ cls: 'cp-resultats' });
    renderResultatsInspiration(resultatsDiv, this.mot);
  }
  onClose(){ this.contentEl.empty(); }
}

