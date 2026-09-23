
function buildPanelNotes(vue, panelNotes){
  const intro = panelNotes.createEl('p', { cls: 'cp-inspi-intro' });
  intro.setText('Mots ajoutés sans définition (import en masse, sélection Inspiration...) — complète-les à la main, enregistré directement dans dictionnaire-perso.json.');

  const btnRefresh = panelNotes.createEl('button', { cls: 'cp-link-btn', text: '↻ Rafraîchir la liste' });

  const secRares = panelNotes.createDiv({ cls: 'cp-groupe' });
  secRares.createDiv({ cls: 'cp-son-label', text: 'Mots rares sans note' });
  const listeRares = secRares.createDiv({ cls: 'cp-inspi-liste' });

  const secChamps = panelNotes.createDiv({ cls: 'cp-groupe' });
  secChamps.createDiv({ cls: 'cp-son-label', text: 'Champs lexicaux : mots sans note' });
  const listeChamps = secChamps.createDiv({ cls: 'cp-inspi-liste' });

  const renderLigneEdition = (container, mot, sousTexte, enregistrer) => {
    const ligne = container.createDiv({ cls: 'cp-inspi-mot' });
    ligne.createSpan({ cls: 'cp-inspi-terme', text: mot });
    if (sousTexte) ligne.createSpan({ cls: 'cp-inspi-note', text: sousTexte });
    const input = ligne.createEl('input', { attr: { type: 'text', placeholder: 'note / définition courte' } });
    const btn = ligne.createEl('button', { cls: 'cp-link-btn', text: 'Enregistrer' });
    const valider = async () => {
      const note = input.value.trim();
      if (!note) return;
      await enregistrer(note);
      new Notice(`Carnet du Poète : note ajoutée pour « ${mot} ».`);
      ligne.remove();
    };
    btn.addEventListener('click', valider);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') valider(); });
  };

  const rerender = () => {
    listeRares.empty();
    listeChamps.empty();

    const raresSansNote = MOTS_RARES.filter(e => e && e.mot && !e.note);
    if (raresSansNote.length === 0) {
      listeRares.createEl('p', { cls: 'cp-vide', text: 'Tous tes mots rares ont une note.' });
    } else {
      raresSansNote.forEach(e => {
        renderLigneEdition(listeRares, e.mot, '', async (note) => {
          await ajouteMotRarePerso(vue.plugin, e.mot, note, []);
        });
      });
    }

    const champsSansNote = [];
    CHAMPS_LEXICAUX.forEach(champ => {
      champ.mots.forEach(m => {
        if (m && m.mot && !m.note) champsSansNote.push({ mot: m.mot, theme: champ.theme });
      });
    });
    if (champsSansNote.length === 0) {
      listeChamps.createEl('p', { cls: 'cp-vide', text: 'Tous les mots de tes champs lexicaux ont une note.' });
    } else {
      champsSansNote.forEach(({ mot, theme }) => {
        renderLigneEdition(listeChamps, mot, `(${theme})`, async (note) => {
          await ajouteMotChampLexicalPerso(vue.plugin, theme, [], mot, note, { silencieux: true });
        });
      });
    }
  };
  rerender();
  btnRefresh.addEventListener('click', rerender);
  vue._rafraichitPanelNotes = rerender;
}

