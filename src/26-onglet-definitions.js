  }

  buildPanelDefinitions(panelDefs){
    const intro = panelDefs.createEl('p', { cls: 'cp-inspi-intro' });
    intro.setText('Vérifie le sens exact et le registre d\'un mot rare avant de l\'utiliser — définitions et étymologie tirées du Trésor de la Langue Française informatisé (CNRTL), à la demande.');

    const form = panelDefs.createDiv({ cls: 'cp-rime-form' });
    const motInput = form.createEl('input', { attr: { type: 'text', placeholder: 'Un mot… (ex. mélancolie, canopée, ire)' } });
    const btnChercher = form.createEl('button', { text: 'Chercher' });
    const lienOuvrirCnrtl = form.createEl('a', { cls: 'cp-icon-btn', text: 'Ouvrir sur CNRTL ↗', attr: { target: '_blank', rel: 'noopener', href: '#' } });
    const majLienOuvrirCnrtl = () => {
      const m = motInput.value.trim();
      lienOuvrirCnrtl.setAttribute('href', m ? `https://www.cnrtl.fr/definition/${encodeURIComponent(m)}` : '#');
    };
    motInput.addEventListener('input', majLienOuvrirCnrtl);
    majLienOuvrirCnrtl();
    lienOuvrirCnrtl.addEventListener('click', (e) => { if (!motInput.value.trim()) e.preventDefault(); });
    const resultatsDiv = panelDefs.createDiv({ cls: 'cp-resultats' });

    const chercher = async () => {
      const saisie = motInput.value.trim();
      resultatsDiv.empty();
      if (!saisie) return;
      resultatsDiv.createDiv({ cls: 'cp-son-label', text: `${saisie} — CNRTL` });
      // Choix de l'homographe (nom/adjectif…) si le mot en a plusieurs ;
      // `afficher` (ré)affiche l'entrée demandée dans `zone`.
      const afficher = async (zone, pos) => {
      zone.empty();
      const statut = zone.createEl('p', { cls: 'cp-vide', text: 'Recherche en cours…' });
      try {
        const r = await chercheCnrtl(saisie, pos);
        statut.remove();
        if (!r.trouve) {
          zone.createEl('p', { cls: 'cp-vide', text: `« ${saisie} » n'a pas été trouvé sur le CNRTL.` });
          return;
        }
        const lien = zone.createEl('a', { text: `Voir « ${saisie} » sur le CNRTL →`, attr: { href: r.url, target: '_blank', rel: 'noopener' } });
        lien.addClass('cp-cnrtl-lien');
        if (r.definition) {
          const blocDef = zone.createDiv({ cls: 'cp-cnrtl-bloc' });
          blocDef.createDiv({ cls: 'cp-cnrtl-titre', text: 'Définition rapide' });
          blocDef.createEl('p', { cls: 'cp-cnrtl-texte', text: r.definition });
        }

        if (r.sources.length > 0) {
          const pillsDiv = zone.createDiv({ cls: 'cp-cnrtl-source-pills' });
          const zoneSource = zone.createDiv({ cls: 'cp-cnrtl-source-zone' });

          // Découpe et affiche la source choisie en blocs pliables, la
          // première section ouverte et les suivantes fermées. Recalculé
          // uniquement à la sélection d'une pill, pas pour les 6 sources
          // d'un coup (les autres sources peuvent être longues, ex. TLFi
          // ou Littré, inutile de tout parser si l'usager n'en affiche
          // qu'une seule à la fois).
          const afficherSource = (source) => {
            zoneSource.empty();
            const blocs = decoupeSectionsCnrtl(source.htmlEntries);
            if (blocs.length === 0) {
              zoneSource.createEl('p', { cls: 'cp-vide', text: `Rien à afficher pour ${source.label}.` });
              return;
            }
            blocs.forEach((bloc, i) => {
              const det = zoneSource.createEl('details', { cls: 'cp-cnrtl-details' });
              if (i === 0) det.setAttr('open', 'true');
              det.createEl('summary', { cls: 'cp-cnrtl-details-titre', text: bloc.titre });
              const corps = det.createDiv({ cls: 'cp-cnrtl-texte' });
              corps.innerHTML = bloc.html;
            });
          };

          r.sources.forEach((source, i) => {
            const pill = pillsDiv.createEl('button', { cls: 'cp-cnrtl-source-pill', text: source.label });
            if (i === 0) pill.addClass('active');
            pill.addEventListener('click', () => {
              pillsDiv.querySelectorAll('.cp-cnrtl-source-pill').forEach(b => b.removeClass('active'));
              pill.addClass('active');
              afficherSource(source);
            });
          });

          afficherSource(r.sources[0]);
        }
      } catch (err) {
        console.error('[Carnet du Poète] erreur CNRTL', err);
        statut.setText('Recherche impossible (pas de connexion, ou le site a changé — voir la console).');
      }
      };
      brancheHomographesCnrtl(resultatsDiv, saisie, afficher);
    };

    btnChercher.addEventListener('click', chercher);
    motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });

    this._prefillDefsInput = (mot) => {
      motInput.value = mot;
      majLienOuvrirCnrtl();
      chercher();
    };
