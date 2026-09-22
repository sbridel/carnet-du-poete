/* Rendu partagé des résultats de synonymes/antonymes. motRimeRef (optionnel)
   : mot par rapport auquel afficher un badge de qualité de rime sur chaque
   chip qui rime VRAIMENT avec lui (le mot de départ par défaut, ou le mot
   de la case "Rime avec" quand elle est renseignée — auquel cas la liste
   est déjà filtrée en amont pour ne garder que ces mots-là). classeRime
   seul ne suffit pas comme garde-fou : il renvoie toujours un niveau (même
   "pauvre") pour n'importe quelle paire de mots, y compris ceux qui ne
   riment pas du tout — d'où le badge qui semblait s'afficher partout. */
/* Un élément de liste de synonymes/antonymes peut être une simple chaîne
   (dictionnaire local, Wiktionnaire, CRISCO) ou un objet {mot, rang} quand
   la source fournit un score de pertinence (CNRTL) — ces deux utilitaires
   uniformisent l'accès pour le reste du code, qui n'a pas à savoir d'où
   vient chaque mot. rangDe renvoie null pour une simple chaîne (pas de
   score connu), jamais 0 (qui est un score CNRTL valide, à distinguer). */
function texteDe(item){ return typeof item === 'string' ? item : (item ? item.mot : ''); }
function rangDe(item){ return typeof item === 'string' ? null : (item && typeof item.rang === 'number' ? item.rang : null); }

/* CNRTL renvoie parfois des expressions à plusieurs mots en synonyme/
   antonyme (ex. "coup de dés", "manque de pot") — jamais rencontré pour un
   vers réel (déjà découpé mot par mot avant d'arriver dans le moteur de
   rimes), donc sans risque de régression sur l'analyse de poème. On isole
   le dernier mot pour la rime (c'est lui qui porte le son final) et on
   somme les syllabes de chaque mot séparément pour le compte total, plutôt
   que de laisser nettoieMot avaler les espaces et coller l'expression en
   un seul pseudo-mot ("coupdedés"). Pour un mot seul (l'immense majorité
   des cas), comportement strictement identique à avant. */
function dernierMotExpression(expression){
  const mots = (expression || '').trim().split(/\s+/).filter(Boolean);
  return mots.length ? mots[mots.length - 1] : '';
}
function compteSyllabesExpression(expression, finalEPrononce){
  const mots = (expression || '').trim().split(/\s+/).filter(Boolean);
  if (mots.length <= 1) return compteSyllabesMot(expression, finalEPrononce);
  return mots.reduce((acc, m, i) => {
    const r = compteSyllabesMot(m, i === mots.length - 1 ? finalEPrononce : false);
    return { min: acc.min + r.min, max: acc.max + r.max, hiatus: acc.hiatus || r.hiatus };
  }, { min: 0, max: 0, hiatus: false });
}

/* Rendu d'un seul "chip" mot (syllabes, badge de qualité de rime, et pour
   CNRTL l'opacité de pertinence) — factorisé pour ne pas dupliquer cette
   logique entre buildGroupeMots (simple affichage) et
   buildGroupeMotsExcluable (variante cliquable/exclusion) ; `exclus` vaut
   null pour la variante non-excluable. */
function renderChipMot(motsDiv, item, cls, motRimeRef, exclus){
  const m = texteDe(item);
  const rang = rangDe(item);
  const span = motsDiv.createSpan({ cls: cls, text: m });
  if (rang !== null && rang >= 70) span.style.fontWeight = '700';
  span.createEl('sup', { text: String(compteSyllabesExpression(m, false).min) });
  if (exclus) {
    span.setAttr('title', rang !== null
      ? `Pertinence CNRTL : ${rang}/100 — clique pour exclure ce mot avant de l'enregistrer dans ton dictionnaire personnel (reclique pour annuler).`
      : 'Clique pour exclure ce mot avant de l\'enregistrer dans ton dictionnaire personnel (reclique pour annuler).');
    span.addClass('cp-mot-excluable');
    span.addEventListener('click', () => {
      if (exclus.has(m)) { exclus.delete(m); span.removeClass('cp-mot-exclu'); }
      else { exclus.add(m); span.addClass('cp-mot-exclu'); }
    });
  } else if (rang !== null) {
    span.setAttr('title', `Pertinence CNRTL : ${rang}/100`);
  }
  if (motRimeRef && memeRime(motRimeRef, dernierMotExpression(m))) badgeQualite(span, dernierMotExpression(m), motRimeRef);
  return span;
}

const CAP_MOTS_AFFICHES = 15;
const CAP_PROVERBES = 5;

/* Affiche jusqu'à CAP_MOTS_AFFICHES chips, puis un bouton "+ N de plus" qui
   révèle le reste d'un coup — évite qu'une longue liste (ex. CNRTL avec un
   seuil de pertinence bas) n'envahisse tout l'onglet. */
function afficheAvecLimite(motsDiv, liste, rendreUnMot){
  const visibles = liste.slice(0, CAP_MOTS_AFFICHES);
  const restants = liste.slice(CAP_MOTS_AFFICHES);
  visibles.forEach(item => rendreUnMot(item));
  if (restants.length > 0) {
    const btnPlus = motsDiv.createEl('button', { cls: 'cp-mot-voir-plus', text: `+ ${restants.length} de plus` });
    btnPlus.addEventListener('click', () => {
      btnPlus.remove();
      restants.forEach(item => rendreUnMot(item));
    });
  }
}

function buildGroupeMots(container, titre, liste, cls, motRimeRef, type){
  if (!liste || liste.length === 0) return;
  const g = container.createDiv({ cls: `cp-groupe${type ? ' cp-groupe-' + type : ''}` });
  g.createDiv({ cls: 'cp-titre', text: titre });
  const motsDiv = g.createDiv({ cls: 'cp-mots' });
  afficheAvecLimite(motsDiv, liste, item => renderChipMot(motsDiv, item, cls, motRimeRef, null));
}

/* Variante de buildGroupeMots où chaque chip est cliquable pour l'exclure
   (grisé/barré) avant sauvegarde dans le dictionnaire personnel — utile
   quand une source en ligne renvoie de mauvaises entrées (ex. une page
   Wiktionnaire mêlant plusieurs langues) qu'on ne veut pas polluer son
   dictionnaire perso avec. `exclus` est un Set partagé, rempli/vidé par le
   clic, relu par le bouton "Enregistrer" au moment de sauvegarder. */
function buildGroupeMotsExcluable(container, titre, liste, cls, motRimeRef, exclus, type){
  if (!liste || liste.length === 0) return;
  const g = container.createDiv({ cls: `cp-groupe${type ? ' cp-groupe-' + type : ''}` });
  g.createDiv({ cls: 'cp-titre', text: titre });
  const motsDiv = g.createDiv({ cls: 'cp-mots' });
  afficheAvecLimite(motsDiv, liste, item => renderChipMot(motsDiv, item, cls, motRimeRef, exclus));
}

/* Filtre une liste de mots pour ne garder que ceux qui riment réellement
   avec la cible (utilisé par la case "Rime avec" de l'onglet Synonymes) —
   s'appuie sur memeRime, donc sur le même critère strict que l'onglet Rimes
   (et bascule automatiquement en phonétique quand les deux mots sont dans
   le dictionnaire complet). */
function filtreParRime(liste, cible){
  if (!cible) return liste || [];
  return (liste || []).filter(item => memeRime(cible, dernierMotExpression(texteDe(item))));
}

/* Filtre par nombre de syllabes exact (ou "5+"), même logique que le
   filtre syllabes de l'onglet Rimes — valeur vide = pas de filtre. */
function filtreParSyllabes(liste, syllabes){
  if (!syllabes) return liste || [];
  const cible = syllabes === '5+' ? null : parseInt(syllabes, 10);
  return (liste || []).filter(item => {
    const n = compteSyllabesExpression(texteDe(item), false).min;
    return cible === null ? n >= 5 : n === cible;
  });
}

async function renderResultatsSynonymes(container, motSaisi, plugin, sourcesActives, motRimeCible, filtreSyllabes){
  container.empty();
  const saisie = (motSaisi || '').trim();
  if (!saisie) return;
  const cible = (motRimeCible || '').trim();
  // Sans cible, le badge affiché sur chaque chip porte sur le mot de départ
  // lui-même (utile pour repérer un écho synonyme/rime providentiel) ; avec
  // une cible, la liste est filtrée pour ne garder QUE ce qui rime avec
  // elle, et le badge porte alors sur cette cible (c'est la contrainte active).
  const motRimeRef = cible || saisie;

  // --- dictionnaire local (toujours vérifié en premier, instantané) ---
  const detailsLocal = container.createEl('details', { cls: 'cp-syn-source-details cp-syn-source-local' });
  detailsLocal.setAttr('open', 'true');
  detailsLocal.createEl('summary', { cls: 'cp-syn-source-details-titre', text: `${saisie} — dictionnaire local` });
  const blocLocal = detailsLocal.createDiv({ cls: 'cp-syn-source-corps' });
  const entree = chercheSynonymes(saisie);
  if (entree) {
    const syn = filtreParSyllabes(filtreParRime(entree.synonymes, cible), filtreSyllabes);
    const anto = filtreParSyllabes(filtreParRime(entree.antonymes, cible), filtreSyllabes);
    if (syn.length === 0 && anto.length === 0) {
      blocLocal.createEl('p', { cls: 'cp-vide', text: `Aucun synonyme/antonyme local de « ${saisie} » ne correspond à ces filtres.` });
    } else {
      buildGroupeMots(blocLocal, 'Synonymes', syn, 'cp-mot cp-mot-syno', motRimeRef, 'syno');
      buildGroupeMots(blocLocal, 'Antonymes', anto, 'cp-mot cp-mot-anto', motRimeRef, 'anto');
    }
  } else {
    blocLocal.createEl('p', { cls: 'cp-vide', text: 'Pas d\'entrée locale pour ce mot.' });
  }

  // --- sources en ligne sélectionnées (déjà dans l'ordre de priorité
  // CNRTL > CRISCO > Wiktionnaire, défini une fois pour toutes dans
  // SOURCES_EN_LIGNE_ORDRE) ---
  const liste = (sourcesActives || []).map(id => SOURCES_EN_LIGNE[id]).filter(Boolean);
  // Une seule source active -> elle s'ouvre par défaut. Plusieurs -> toutes
  // repliées sauf la plus prioritaire (déjà en tête de liste), pour limiter
  // le défilement sans cacher la meilleure.
  const idSourceOuverte = liste.length > 0 ? liste[0].id : null;
  liste.forEach(source => {
    const details = container.createEl('details', { cls: 'cp-syn-source-details' });
    if (source.id === idSourceOuverte) details.setAttr('open', 'true');
    details.createEl('summary', { cls: 'cp-syn-source-details-titre', text: `${saisie} — ${source.nom}` });
    const corpsSource = details.createDiv({ cls: 'cp-syn-source-corps' });
    // `remplir` (ré)affiche la source dans `bloc` ; pour CNRTL, `pos` choisit
    // l'homographe (nom/adjectif…), les autres sources l'ignorent.
    const remplir = (bloc, pos) => {
    bloc.empty();
    const statut = bloc.createEl('p', { cls: 'cp-vide', text: 'Recherche en cours…' });

    source.chercher(saisie, pos).then(resultat => {
      statut.remove();
      if (!resultat || !resultat.trouve || (resultat.synonymes.length === 0 && resultat.antonymes.length === 0)) {
        bloc.createEl('p', { cls: 'cp-vide', text: `Rien trouvé sur ${source.nom} pour « ${saisie} ».` });
        return;
      }

      // CNRTL fournit un score de pertinence (0-100) par mot — pills à
      // paliers fixes pour écarter la longue traîne des scores faibles
      // (une réglette à glisser posait trop de problèmes cross-navigateur,
      // voir l'historique), recalculé localement à chaque clic sans
      // nouvelle requête réseau (les données complètes sont déjà en
      // mémoire dans `resultat`).
      let seuilActuel = 30;
      if (source.id === 'cnrtl') {
        const seuilDiv = bloc.createDiv({ cls: 'cp-cnrtl-seuil' });
        seuilDiv.createSpan({ cls: 'cp-sources-label', text: 'Seuil de pertinence : ' });
        const paliers = [
          { label: 'Tout', valeur: 0 },
          { label: '30%', valeur: 30 },
          { label: '60%', valeur: 60 },
          { label: '85%', valeur: 85 }
        ];
        const boutons = [];
        paliers.forEach(p => {
          const btn = seuilDiv.createEl('button', { cls: 'cp-hasard-toggle-pool', text: p.label });
          if (p.valeur === seuilActuel) btn.addClass('active');
          btn.addEventListener('click', () => {
            seuilActuel = p.valeur;
            boutons.forEach(b => b.el.removeClass('active'));
            btn.addClass('active');
            rendreChips();
          });
          boutons.push({ el: btn, valeur: p.valeur });
        });
      }
      const zoneChips = bloc.createDiv();
      const zoneSauver = bloc.createDiv();

      const rendreChips = () => {
        zoneChips.empty();
        zoneSauver.empty();
        const passeSeuil = (item) => {
          const r = rangDe(item);
          return r === null || r >= seuilActuel;
        };
        const synEnLigne = filtreParSyllabes(filtreParRime(resultat.synonymes.filter(passeSeuil), cible), filtreSyllabes);
        const antoEnLigne = filtreParSyllabes(filtreParRime(resultat.antonymes.filter(passeSeuil), cible), filtreSyllabes);
        if (synEnLigne.length === 0 && antoEnLigne.length === 0) {
          zoneChips.createEl('p', { cls: 'cp-vide', text: `Aucun résultat ${source.nom} ne correspond à ces filtres.` });
          return;
        }
        const exclusSyn = new Set();
        const exclusAnto = new Set();
        buildGroupeMotsExcluable(zoneChips, 'Synonymes', synEnLigne, 'cp-mot cp-mot-syno', motRimeRef, exclusSyn, 'syno');
        buildGroupeMotsExcluable(zoneChips, 'Antonymes', antoEnLigne, 'cp-mot cp-mot-anto', motRimeRef, exclusAnto, 'anto');

        if (plugin && (synEnLigne.length > 0 || antoEnLigne.length > 0)) {
          const btnSauver = zoneSauver.createEl('button', { cls: 'cp-link-btn', text: `💾 Enregistrer dans mon dictionnaire personnel` });
          btnSauver.setAttr('title', 'Enregistre tout ce qui est affiché ci-dessus, sauf les mots grisés/barrés (clique sur un mot pour l\'exclure).');
          btnSauver.addEventListener('click', async () => {
            btnSauver.disabled = true;
            btnSauver.setText('Enregistrement…');
            const synARetenir = synEnLigne.map(texteDe).filter(m => !exclusSyn.has(m));
            const antoARetenir = antoEnLigne.map(texteDe).filter(m => !exclusAnto.has(m));
            await enregistreSynonymePerso(plugin, saisie, synARetenir, antoARetenir);
            btnSauver.setText('Enregistré ✓');
          });
        }
      };

      rendreChips();
    }).catch(err => {
      console.error(`[Carnet du Poète] erreur ${source.nom}`, err);
      statut.setText(messageErreurSource(err, source.nom));
    });
    };
    if (source.id === 'cnrtl') brancheHomographesCnrtl(corpsSource, saisie, remplir);
    else remplir(corpsSource.createDiv(), null);
  });
}

