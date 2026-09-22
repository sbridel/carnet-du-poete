/* Rendu partagé des résultats de rimes (panneau + fenêtre modale).
   filtres : { lettre, syllabes, qualites: Set } — tous optionnels. */
function renderResultatsRimes(container, motSaisi, filtres, plugin, sourcesActives){
  container.empty();
  const saisie = (motSaisi || '').trim();
  if (!saisie) return;
  filtres = filtres || {};

  const resultat = chercheRimes(saisie);

  const appliqueFiltres = (liste) => {
    let l = liste;
    if (filtres.lettre) {
      const lettre = normaliseMot(filtres.lettre)[0];
      l = l.filter(m => normaliseMot(m).startsWith(lettre));
    }
    if (filtres.syllabes) {
      const cible = filtres.syllabes === '5+' ? null : parseInt(filtres.syllabes, 10);
      l = l.filter(m => {
        const n = compteSyllabesMot(m, false).min;
        return cible === null ? n >= 5 : n === cible;
      });
    }
    // 5 catégories mutuellement exclusives (pauvre/suffisante/riche/
    // tresriche/leonine, exactement les valeurs renvoyées par classeRime).
    // Toujours appliqué : si les 5 sont cochées c'est un no-op, si aucune
    // ne l'est le résultat est vide à raison — plus de cas particulier
    // "0 coché = pas de filtre".
    if (filtres.qualites) {
      l = l.filter(m => filtres.qualites.has(classeRime(saisie, m)));
    }
    return l;
  };

  if (resultat.mode === 'aucun') {
    container.createEl('p', { cls: 'cp-vide', text: `Pas de rime trouvée pour « ${saisie} » dans les dictionnaires chargés.` });
  } else {
    if (resultat.mode === 'exact') {
      container.createDiv({ cls: 'cp-son-label', text: `Rimes exactes pour « ${saisie} » (dictionnaire phonétique complet)` });
    } else {
      container.createDiv({ cls: 'cp-son-label', text: `Son ${resultat.son} — comme dans « ${resultat.exemple} » (dictionnaire approché)` });
    }

    const filtres_ = appliqueFiltres(resultat.mots);
    const motsRime = filtres_.filter(m => classifieRime(saisie, m) === 'rime');
    const motsAssonance = MODE_ASSONANCE ? filtres_.filter(m => classifieRime(saisie, m) === 'assonance') : [];
    const masculins = motsRime.filter(m => !estFeminine(m));
    const feminins = motsRime.filter(m => estFeminine(m));
    const LIMITE = 100;

    if (filtres_.length === 0) {
      container.createEl('p', { cls: 'cp-vide', text: 'Aucun mot ne correspond à ces filtres.' });
    }

    const buildGroupe = (titre, liste, conteneur) => {
      conteneur = conteneur || container;
      if (liste.length === 0) return;
      const g = conteneur.createDiv({ cls: 'cp-groupe' });
      g.createDiv({ cls: 'cp-titre', text: `${titre} (${liste.length})` });

      const compte = { pauvre: 0, suffisante: 0, riche: 0, tresriche: 0, leonine: 0 };
      liste.forEach(m => { compte[classeRime(saisie, m)]++; });
      const synthese = g.createDiv({ cls: 'cp-synthese-qualite' });
      ['leonine', 'tresriche', 'riche', 'suffisante', 'pauvre'].forEach(q => {
        if (compte[q] === 0) return;
        const item = synthese.createSpan({ cls: 'cp-synthese-item' });
        item.createSpan({ cls: 'cp-synthese-pastille', attr: { style: `background:${COULEURS_QUALITE[q]}` } });
        item.createSpan({ text: `${LABELS_QUALITE[q]} : ${compte[q]}` });
      });

      const motsDiv = g.createDiv({ cls: 'cp-mots' });
      const afficheListe = (sousListe) => {
        sousListe.forEach(m => {
          const r = compteSyllabesMot(m, false);
          const badge = motsDiv.createSpan({ cls: 'cp-mot', text: m });
          badge.createEl('sup', { text: String(r.min) });
          badgeQualite(badge, m, saisie);
        });
      };
      afficheListe(liste.slice(0, LIMITE));
      if (liste.length > LIMITE) {
        const reste = liste.length - LIMITE;
        const btnPlus = g.createEl('button', { cls: 'cp-link-btn', text: `Afficher les ${reste} mots restants` });
        btnPlus.addEventListener('click', () => {
          afficheListe(liste.slice(LIMITE));
          btnPlus.remove();
        });
      }
    };

    buildGroupe('Rimes masculines', masculins);
    buildGroupe('Rimes féminines (finale en -e muet)', feminins);

    if (motsAssonance.length > 0) {
      const blocAsso = container.createDiv({ cls: 'cp-groupe cp-bloc-assonance' });
      blocAsso.createDiv({
        cls: 'cp-son-label cp-label-assonance',
        text: `Assonances (même voyelle, terminaison différente) (${motsAssonance.length})`
      });
      const motsDiv = blocAsso.createDiv({ cls: 'cp-mots' });
      const afficheAssonances = (sousListe) => {
        sousListe.forEach(m => {
          const r = compteSyllabesMot(m, false);
          const badge = motsDiv.createSpan({ cls: 'cp-mot cp-mot-assonance', text: m });
          badge.createEl('sup', { text: String(r.min) });
        });
      };
      afficheAssonances(motsAssonance.slice(0, LIMITE));
      if (motsAssonance.length > LIMITE) {
        const reste = motsAssonance.length - LIMITE;
        const btnPlusAsso = blocAsso.createEl('button', { cls: 'cp-link-btn', text: `Afficher les ${reste} mots restants` });
        btnPlusAsso.addEventListener('click', () => {
          afficheAssonances(motsAssonance.slice(LIMITE));
          btnPlusAsso.remove();
        });
      }
    }
  }

  // --- source en ligne complémentaire (RimesSolides) ---
  if ((sourcesActives || []).includes('rimessolides')) {
    const bloc = container.createDiv({ cls: 'cp-groupe cp-source-en-ligne' });
    bloc.createDiv({ cls: 'cp-son-label', text: `${saisie} — RimesSolides (en ligne)` });
    const statut = bloc.createEl('p', { cls: 'cp-vide', text: 'Recherche en cours…' });
    chercheRimesSolides(saisie).then(r => {
      statut.remove();
      if (!r.trouve) {
        bloc.createEl('p', { cls: 'cp-vide', text: `Rien trouvé sur RimesSolides pour « ${saisie} ».` });
        return;
      }
      // RimesSolides accepte des rimes plus "souples" que la règle classique
      // française (ex. "ombre"/"montre" : même voyelle nasale, mais "b" et
      // "t" diffèrent juste avant le "r" final — une assonance, pas une
      // vraie rime) : on applique le même filtre de cohérence vocalique
      // que pour le dictionnaire phonétique local, et on sépare les deux.
      const motsCoherents = r.mots.filter(m => memeRime(saisie, m));
      const motsFiltres = appliqueFiltres(motsCoherents);
      const motsRimeSolides = motsFiltres.filter(m => classifieRime(saisie, m) === 'rime');
      const motsAssoSolides = MODE_ASSONANCE ? motsFiltres.filter(m => classifieRime(saisie, m) === 'assonance') : [];

      const motsDiv = bloc.createDiv({ cls: 'cp-mots' });
      motsRimeSolides.slice(0, 150).forEach(m => {
        const badge = motsDiv.createSpan({ cls: 'cp-mot', text: m });
        const rr = compteSyllabesMot(m, false);
        badge.createEl('sup', { text: String(rr.min) });
        badgeQualite(badge, m, saisie);
      });
      if (motsAssoSolides.length > 0) {
        bloc.createDiv({ cls: 'cp-titre cp-label-assonance', text: `Assonances (${motsAssoSolides.length})` });
        const motsDivAsso = bloc.createDiv({ cls: 'cp-mots' });
        motsAssoSolides.slice(0, 150).forEach(m => {
          const badge = motsDivAsso.createSpan({ cls: 'cp-mot cp-mot-assonance', text: m });
          const rr = compteSyllabesMot(m, false);
          badge.createEl('sup', { text: String(rr.min) });
        });
      }
      if (motsRimeSolides.length === 0 && motsAssoSolides.length === 0) {
        bloc.createEl('p', { cls: 'cp-vide', text: 'Aucun mot ne correspond à ces filtres.' });
      }
    }).catch(err => {
      console.error('[Carnet du Poète] erreur RimesSolides', err);
      statut.setText(messageErreurSource(err, 'RimesSolides'));
    });
  }
}

