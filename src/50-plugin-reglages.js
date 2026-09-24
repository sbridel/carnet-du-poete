/* =========================================================
   PLUGIN
   ========================================================= */

module.exports = class CarnetDuPoetePlugin extends Plugin {
  async onload(){
    this.injectStyles();

    const data = await this.loadData();
    MODE_ASSONANCE = !!(data && data.modeAssonance);
    RIMES_CONTINUES = !data || data.rimesContinues !== false; // activé par défaut
    MOTS_RARES_META = (data && data.motsRaresMeta) || {};

    this.registerView(VIEW_TYPE, (leaf) => new CarnetView(leaf, this));

    this.addRibbonIcon('feather', 'Carnet du Poète', () => this.activateView());

    this.addCommand({
      id: 'ouvrir-carnet-du-poete',
      name: 'Ouvrir le Carnet du Poète',
      callback: () => this.activateView()
    });

    this.addCommand({
      id: 'recharger-dictionnaire-perso',
      name: 'Recharger le dictionnaire personnel de rimes (dictionnaire-perso.json)',
      callback: async () => { await chargeDictionnairePerso(this, { notifierAbsence: true }); }
    });

    this.addCommand({
      id: 'compter-syllabes-selection',
      name: 'Compter les syllabes de la sélection (ou de la ligne courante)',
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        const texte = selection && selection.trim().length > 0
          ? selection
          : editor.getLine(editor.getCursor().line);
        const lignes = texte.split('\n').filter(l => l.trim());
        if (lignes.length === 0) { new Notice('Aucun texte à analyser.'); return; }
        let total = 0;
        const detail = lignes.map(l => {
          const r = analyseLigne(l);
          total += r.total;
          const suffixe = (r.hasHiatus && r.totalMax !== r.total) ? ` (ou ${r.totalMax} avec diérèse)` : '';
          const genre = genreDuVers(r.details);
          const genreTxt = genre ? ` [${genre}]` : '';
          return `${r.total}${suffixe}${genreTxt} — ${l}`;
        }).join('\n');
        new Notice(`${total} syllabes au total\n${detail}`, 9000);
      }
    });

    this.addCommand({
      id: 'chercher-rimes-selection',
      name: 'Chercher des rimes pour le mot sélectionné',
      editorCallback: (editor) => {
        const mot = (editor.getSelection() || '').trim();
        if (!mot) { new Notice('Sélectionne un mot d’abord.'); return; }
        new RhymeModal(this.app, mot).open();
      }
    });

    this.addCommand({
      id: 'chercher-inspiration-selection',
      name: 'Chercher de l\'inspiration (vocabulaire) pour le mot sélectionné',
      editorCallback: (editor) => {
        const mot = (editor.getSelection() || '').trim();
        if (!mot) { new Notice('Sélectionne un mot d’abord.'); return; }
        new InspirationModal(this.app, mot).open();
      }
    });

    this.addSettingTab(new CarnetSettingTab(this.app, this));

    // Chargement du dictionnaire personnel en tâche de fond : ne bloque plus
    // l'activation du plugin (vue, icône, commandes ci-dessus déjà prêtes).
    // Sur un gros dictionnaire, ce chargement peut prendre plusieurs
    // secondes sur mobile — en attendant qu'il se termine, le moteur de
    // rimes retombe simplement sur son repli heuristique (DICO_PHONETIQUE
    // reste `null` jusque-là, déjà géré partout où il est consulté).
    chargeDictionnairePerso(this).catch(e => {
      console.error('[Carnet du Poète] erreur au chargement initial du dictionnaire personnel', e);
    });
  }


  injectStyles(){
    if (document.getElementById('carnet-du-poete-styles')) return;
    const style = document.createElement('style');
    style.id = 'carnet-du-poete-styles';
    style.textContent = CARNET_CSS;
    document.head.appendChild(style);
  }

  removeStyles(){
    const el = document.getElementById('carnet-du-poete-styles');
    if (el) el.remove();
  }

  onunload(){
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
    this.removeStyles();
  }

  async activateView(){
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
};

class CarnetSettingTab extends PluginSettingTab {
  constructor(app, plugin){
    super(app, plugin);
    this.plugin = plugin;
  }

  display(){
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Réglages du Carnet du Poète' });

    new Setting(containerEl)
      .setName('Mode assonance')
      .setDesc('Quand activé, les assonances (même voyelle, terminaison différente) sont aussi montrées, dans une section clairement séparée des rimes strictes.')
      .addToggle(toggle => {
        toggle.setValue(MODE_ASSONANCE);
        toggle.onChange(async (value) => {
          MODE_ASSONANCE = value;
          const data = (await this.plugin.loadData()) || {};
          data.modeAssonance = value;
          await this.plugin.saveData(data);
        });
      });

    containerEl.createEl('h3', { text: 'Dictionnaire' });
    if (STATS_DICO && STATS_DICO.base) {
      const b = STATS_DICO.base;
      containerEl.createEl('p', { cls: 'setting-item-description',
        text: `Base : ${b.version} — ${b.mots.toLocaleString('fr-FR')} mots, ${b.motsRares.toLocaleString('fr-FR')} mots rares (Méral).` });
    } else {
      containerEl.createEl('p', { cls: 'setting-item-description', text: 'Base : non chargée (voir la console).' });
    }
    if (STATS_DICO && STATS_DICO.perso) {
      const p = STATS_DICO.perso;
      const ko = Math.round(p.octets / 1024);
      containerEl.createEl('p', { cls: 'setting-item-description',
        text: `Personnel : ${p.chemin} (${ko} Ko) — ${p.motsRares} mot(s) rare(s), ${p.champsLexicaux} champ(s) lexical(aux), `
          + `${p.synonymes} entrée(s) de synonymes, ${p.motsPhonetiques} entrée(s) phonétique(s).` });
    } else {
      containerEl.createEl('p', { cls: 'setting-item-description', text: 'Personnel : aucun dictionnaire-perso.json trouvé.' });
    }

    containerEl.createEl('h3', { text: 'Dictionnaire personnel' });

    new Setting(containerEl)
      .setName('🔧 Debug : ignorer le dictionnaire personnel')
      .setDesc('Désactive temporairement le dictionnaire personnel (Formats B/C) partout où il serait normalement consulté — pour comparer avec/sans lui (rimes, richesse, synonymes) sans avoir à le retirer du vault. Redémarrer Obsidian (ou recharger le plugin) le réactive automatiquement : ce n\'est pas un réglage persistant.')
      .addToggle(toggle => {
        toggle.setValue(DEBUG_IGNORER_DICO_PERSO);
        toggle.onChange((value) => {
          DEBUG_IGNORER_DICO_PERSO = value;
          // Le changement affecte le calcul des rimes, pas le texte/la
          // recherche déjà saisis : sans ça, il fallait vider et retaper
          // le brouillon (ou relancer une recherche) pour voir la différence.
          this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(leaf => {
            const view = leaf.view;
            if (view && view._renderAnalyseSyllabes) view._renderAnalyseSyllabes();
            if (view && view._rechercherRimes) view._rechercherRimes();
            if (view && view._rechercherSynonymes) view._rechercherSynonymes();
          });
        });
      });

    let inputChemin;
    new Setting(containerEl)
      .setName('Chemin personnalisé du dictionnaire personnel (optionnel)')
      .setDesc('Chemin relatif au coffre vers dictionnaire-perso.json. Laisser vide pour une recherche automatique (dossier du plugin, .obsidian/, racine du coffre, ou n\'importe où dans le coffre).')
      .addText(text => {
        inputChemin = text;
        (async () => {
          const data = await this.plugin.loadData();
          text.setValue((data && data.cheminDictionnairePerso) || '');
        })();
        text.setPlaceholder('ex. dictionnaires/dictionnaire-perso.json');
        text.onChange(async (value) => {
          const data = (await this.plugin.loadData()) || {};
          data.cheminDictionnairePerso = value.trim();
          await this.plugin.saveData(data);
        });
      });

    new Setting(containerEl)
      .setName('Recharger le dictionnaire personnel')
      .setDesc('Relit dictionnaire-perso.json (utile après l\'avoir ajouté, déplacé, ou modifié en dehors d\'Obsidian).')
      .addButton(btn => {
        btn.setButtonText('Recharger');
        btn.onClick(async () => {
          await chargeDictionnairePerso(this.plugin, { notifierAbsence: true });
        });
      });

    containerEl.createEl('h3', { text: 'Mots rares : tags en attente' });

    let confirmationEnCours = false;
    let timeoutConfirmation = null;
    new Setting(containerEl)
      .setName('Graver tous les tags en masse dans dictionnaire-perso.json')
      .setDesc('⚠️ Transfère en une fois TOUS les tags actuellement en attente dans data.json (onglet Hasard : 👍/exclu/tags libres) vers dictionnaire-perso.json, puis vide data.json — qui n\'est qu\'une zone tampon. À utiliser plutôt en fin de session de tagging (ex. après avoir trié un gros import). Pense à sauvegarder dictionnaire-perso.json par ailleurs.')
      .addButton(btn => {
        btn.setButtonText('Graver en masse');
        btn.onClick(async () => {
          if (!confirmationEnCours) {
            confirmationEnCours = true;
            btn.setButtonText('⚠️ Cliquer à nouveau pour confirmer');
            btn.buttonEl.style.color = '#c0392b';
            btn.buttonEl.style.borderColor = '#c0392b';
            if (timeoutConfirmation) clearTimeout(timeoutConfirmation);
            timeoutConfirmation = setTimeout(() => {
              confirmationEnCours = false;
              btn.setButtonText('Graver en masse');
              btn.buttonEl.style.color = '';
              btn.buttonEl.style.borderColor = '';
            }, 4000);
            return;
          }
          confirmationEnCours = false;
          if (timeoutConfirmation) clearTimeout(timeoutConfirmation);
          btn.setButtonText('Graver en masse');
          btn.buttonEl.style.color = '';
          btn.buttonEl.style.borderColor = '';
          await graverTousLesMotsRaresEnMasse(this.plugin);
        });
      });

    containerEl.createEl('h3', { text: 'Nettoyage' });

    let confirmationNettoyage = false;
    let timeoutNettoyage = null;
    new Setting(containerEl)
      .setName('Nettoyer et fusionner dictionnaire-perso.json')
      .setDesc('Relit le fichier et fusionne toute entrée dupliquée (même thème pour les champs lexicaux, même mot pour les mots rares et les synonymes), puis le réécrit proprement. Corrige aussi les mots-clés de champ auto-générés cassés (ex. "nuitobscurité" → "nuit", "obscurité"). Rien d\'utile n\'est perdu, seule la structure est nettoyée — sauvegarde le fichier par ailleurs si tu préfères.')
      .addButton(btn => {
        btn.setButtonText('Nettoyer et fusionner');
        btn.onClick(async () => {
          if (!confirmationNettoyage) {
            confirmationNettoyage = true;
            btn.setButtonText('⚠️ Cliquer à nouveau pour confirmer');
            btn.buttonEl.style.color = '#c0392b';
            btn.buttonEl.style.borderColor = '#c0392b';
            if (timeoutNettoyage) clearTimeout(timeoutNettoyage);
            timeoutNettoyage = setTimeout(() => {
              confirmationNettoyage = false;
              btn.setButtonText('Nettoyer et fusionner');
              btn.buttonEl.style.color = '';
              btn.buttonEl.style.borderColor = '';
            }, 4000);
            return;
          }
          confirmationNettoyage = false;
          if (timeoutNettoyage) clearTimeout(timeoutNettoyage);
          btn.setButtonText('Nettoyer et fusionner');
          btn.buttonEl.style.color = '';
          btn.buttonEl.style.borderColor = '';
          await nettoieEtFusionneDictionnairePerso(this.plugin);
        });
      });
  }
}
