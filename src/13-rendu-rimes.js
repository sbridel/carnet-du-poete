/* Rendu partagé des résultats de rimes (panneau + fenêtre modale).
   filtres : { lettre, syllabes, qualites: Set, cgram: Set } — tous optionnels.
   Le filtre grammatical (cgram) ne s'applique qu'au dictionnaire local :
   les sources en ligne (RimesSolides, Wiktionnaire) l'ignorent, voir
   appliqueFiltres(liste, avecCgram). */
function renderResultatsRimes(container, motSaisi, filtres, plugin, sourcesActives){
  container.empty();
  const saisie = (motSaisi || '').trim();
  if (!saisie) return;
  filtres = filtres || {};

  const resultat = chercheRimes(saisie);

  const appliqueFiltres = (liste, avecCgram = true) => {
    // Jamais le mot cherché ni ses propres flexions (armée → armées, armé,
    // armer…) : on ne rime pas un mot avec lui-même.
    let l = liste.filter(m => !estFlexionDe(saisie, m));
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
    // Filtre grammatical (base 2.29+), dictionnaire local uniquement (voir
    // appel avec avecCgram=false pour RimesSolides/Wiktionnaire ci-dessous :
    // CGRAM_MOT vient de Lexique/Morphalou, pas des sources en ligne, et un
    // mot qui s'y trouve par coïncidence ne doit pas être filtré comme si sa
    // catégorie venait de la source en ligne elle-même). Un mot sans
    // catégorie connue n'est jamais retiré (voir categoriesDuMot). 5 cases :
    // si toutes cochées, no-op ; si aucune, seuls les mots sans catégorie
    // connue restent.
    if (avecCgram && filtres.cgram) {
      l = l.filter(m => {
        const cats = categoriesDuMot(m);
        return cats.length === 0 || cats.some(c => filtres.cgram.has(c));
      });
    }
    return l;
  };

  // --- dictionnaire local (même présentation que Synonymes/Inspiration) ---
  const detailsLocal = container.createEl('details', { cls: 'cp-syn-source-details cp-syn-source-local' });
  detailsLocal.setAttr('open', 'true');
  detailsLocal.createEl('summary', { cls: 'cp-syn-source-details-titre', text: `${saisie} — dictionnaire local` });
  const corpsLocal = detailsLocal.createDiv({ cls: 'cp-syn-source-corps' });

  if (resultat.mode === 'aucun') {
    corpsLocal.createEl('p', { cls: 'cp-vide', text: `Pas de rime trouvée pour « ${saisie} » dans les dictionnaires chargés.` });
  } else {
    if (resultat.mode === 'exact') {
      corpsLocal.createDiv({ cls: 'cp-son-label', text: 'Rimes exactes (dictionnaire phonétique complet)' });
    } else {
      corpsLocal.createDiv({ cls: 'cp-son-label', text: `Son ${resultat.son} — comme dans « ${resultat.exemple} » (dictionnaire approché)` });
    }

    const filtres_ = appliqueFiltres(resultat.mots);
    const motsRime = filtres_.filter(m => classifieRime(saisie, m) === 'rime');
    const motsAssonance = MODE_ASSONANCE ? filtres_.filter(m => classifieRime(saisie, m) === 'assonance') : [];
    const masculins = motsRime.filter(m => !estFeminine(m));
    const feminins = motsRime.filter(m => estFeminine(m));
    const LIMITE = 100;

    if (filtres_.length === 0) {
      corpsLocal.createEl('p', { cls: 'cp-vide', text: 'Aucun mot ne correspond à ces filtres.' });
    }

    const buildGroupe = (titre, liste, conteneur) => {
      conteneur = conteneur || corpsLocal;
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
      const blocAsso = corpsLocal.createDiv({ cls: 'cp-groupe cp-bloc-assonance' });
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

  // --- sources en ligne complémentaires ---
  // Comme dans Synonymes : la première source active s'ouvre, les autres
  // restent repliées pour limiter le défilement.
  const actives = sourcesActives || [];
  let premiere = true;
  if (actives.includes('rimessolides')) {
    afficheSourceRimesEnLigne(container, saisie, 'RimesSolides', chercheRimesSolides(saisie),
      `Rien trouvé sur RimesSolides pour « ${saisie} ».`, l => appliqueFiltres(l, false), premiere);
    premiere = false;
  }
  if (actives.includes('wiktionnaire')) {
    afficheSourceRimesEnLigne(container, saisie, 'Wiktionnaire', chercheRimesWiktionnaire(saisie),
      `Le Wiktionnaire ne classe « ${saisie} » dans aucune catégorie de rime.`, l => appliqueFiltres(l, false), premiere);
  }
}


/* Bloc de résultats d'une source de rimes en ligne (RimesSolides,
   Wiktionnaire). Ces sources acceptent des rimes plus "souples" que la
   règle classique française (ex. "ombre"/"montre" : même voyelle nasale,
   mais "b" et "t" diffèrent juste avant le "r" final — une assonance, pas
   une vraie rime) : on applique le même filtre de cohérence vocalique que
   pour le dictionnaire phonétique local, et on sépare les deux. */
function afficheSourceRimesEnLigne(container, saisie, nomSource, promesse, messageVide, appliqueFiltres, ouvert){
  const details = container.createEl('details', { cls: 'cp-syn-source-details' });
  if (ouvert) details.setAttr('open', 'true');
  const titre = details.createEl('summary', { cls: 'cp-syn-source-details-titre', text: `${saisie} — ${nomSource}` });
  const bloc = details.createDiv({ cls: 'cp-syn-source-corps' });
  const statut = bloc.createEl('p', { cls: 'cp-vide', text: 'Recherche en cours…' });
  promesse.then(r => {
    statut.remove();
    // Notation /…/ plutôt que \\…\\ du Wiktionnaire : en italique ou dans
    // certaines polices, l'antislash ressemble à une barre verticale.
    if (r.son) titre.setText(`${saisie} — ${nomSource} /${r.son}/`);
    if (!r.trouve) {
      bloc.createEl('p', { cls: 'cp-vide', text: messageVide });
      return;
    }
    const motsCoherents = r.mots.filter(m => memeRime(saisie, m));
    const motsFiltres = appliqueFiltres(motsCoherents);
    const motsRime = motsFiltres.filter(m => classifieRime(saisie, m) === 'rime');
    const motsAsso = MODE_ASSONANCE ? motsFiltres.filter(m => classifieRime(saisie, m) === 'assonance') : [];

    const motsDiv = bloc.createDiv({ cls: 'cp-mots' });
    motsRime.slice(0, 150).forEach(m => {
      const badge = motsDiv.createSpan({ cls: 'cp-mot', text: m });
      const rr = compteSyllabesMot(m, false);
      badge.createEl('sup', { text: String(rr.min) });
      badgeQualite(badge, m, saisie);
    });
    if (motsAsso.length > 0) {
      bloc.createDiv({ cls: 'cp-titre cp-label-assonance', text: `Assonances (${motsAsso.length})` });
      const motsDivAsso = bloc.createDiv({ cls: 'cp-mots' });
      motsAsso.slice(0, 150).forEach(m => {
        const badge = motsDivAsso.createSpan({ cls: 'cp-mot cp-mot-assonance', text: m });
        const rr = compteSyllabesMot(m, false);
        badge.createEl('sup', { text: String(rr.min) });
      });
    }
    if (motsRime.length === 0 && motsAsso.length === 0) {
      bloc.createEl('p', { cls: 'cp-vide', text: 'Aucun mot ne correspond à ces filtres.' });
    }
  }).catch(err => {
    console.error(`[Carnet du Poète] erreur ${nomSource}`, err);
    statut.setText(messageErreurSource(err, nomSource));
  });
}

/* Le candidat est-il une flexion du mot cherché (ou le mot lui-même) ?
   Heuristique sans lemmatiseur : on retire du mot cherché la plus longue
   terminaison flexionnelle qui laisse un radical d'au moins 3 lettres
   (armée → arm), puis on exclut tout candidat « radical + terminaison
   flexionnelle » (armer, armez, armé, armés, armées). Radical trop court
   (né, mer, été) : seules les variantes en -s/-x/-e/-es comptent, pour
   ne pas perdre de vraies rimes (né/nez). Les composés (réarmer) ne sont
   pas visés : la rime du simple et du composé est déconseillée, pas
   interdite, et la détection par préfixe se tromperait trop souvent. */
const TERMINAISONS_FLEXION = ['', 'e', 's', 'es', 'x', 'é', 'ée', 'és', 'ées', 'er', 'ez', 'ent',
  'i', 'ie', 'is', 'ies', 'it', 'ir', 'u', 'ue', 'us', 'ues'];
const TERMINAISONS_COURTES = ['', 's', 'x', 'e', 'es'];

function estFlexionDe(motCherche, candidat){
  const a = (motCherche || '').toLowerCase().trim().normalize('NFC');
  const b = (candidat || '').toLowerCase().trim().normalize('NFC');
  if (!a || !b) return false;
  if (a === b) return true;
  // Variantes courtes, dans les deux sens (né/nés/née, armées/armée)
  const court = (x, y) => y.startsWith(x) && TERMINAISONS_COURTES.includes(y.slice(x.length));
  if (court(a, b) || court(b, a)) return true;
  let radical = null;
  TERMINAISONS_FLEXION.slice().sort((x, y) => y.length - x.length).some(t => {
    if (a.endsWith(t) && a.length - t.length >= 3) { radical = a.slice(0, a.length - t.length); return true; }
    return false;
  });
  if (!radical) return false;
  return b.startsWith(radical) && TERMINAISONS_FLEXION.includes(b.slice(radical.length));
}
