/* =========================================================
   CNRTL (Trésor de la Langue Française informatisé)
   Définitions riches + étymologie, à la demande uniquement
   (onglet "Définitions" dédié, pas de recherche automatique).
   ========================================================= */
/* Correspondance identifiant technique -> libellé affiché, dans l'ordre de
   présentation des pills (TLFi en premier, sélectionné par défaut). Toute
   entrée de l'API dont l'id ne figure pas ici (synonyms, antonyms,
   collocations, proverbs, concordance, translations, history, families,
   conjugate, proxemie, etymology) est ignorée : ce ne sont pas des articles
   de dictionnaire à part entière, elles restent hors périmètre pour l'instant. */
const CNRTL_SOURCES_LABELS = {
  tlfi: 'TLFi',
  wiktionnaire: 'Wiktionnaire',
  academie9: 'Académie (9e éd.)',
  academie8: 'Académie (8e éd.)',
  academie4: 'Académie (4e éd.)',
  littre: 'Littré',
  dmf: 'DMF (moyen français)',
};
const CNRTL_SOURCES_ORDRE = ['tlfi', 'wiktionnaire', 'academie9', 'academie8', 'academie4', 'littre', 'dmf'];

/* Depuis la refonte du portail CNRTL (annoncée pour le 1er septembre 2026),
   la page /definition/{mot} ne sert plus qu'une coquille vide : le contenu
   est chargé à part par le navigateur via une API JSON interne
   (/api/word/{mot}/), que l'on interroge directement ici plutôt que de
   scraper un HTML qui ne contient plus rien d'utile. Pour un mot inconnu,
   l'API répond toujours en HTTP 200 mais sans champ "header" (juste
   {"suggestions":[...]} ), d'où le test sur la présence de header plutôt
   que sur le statut HTTP. */
async function chercheCnrtl(mot, pos){
  const urlPage = `https://www.cnrtl.fr/definition/${encodeURIComponent(mot)}`;
  const data = await jsonMotCnrtl(mot, pos);

  if (!data.header) {
    return { trouve: false, url: urlPage };
  }

  const definition = (data.header.description || '').trim();

  // On ne garde que les entrées "dictionnaire" reconnues, chacune avec ses
  // fragments HTML bruts tels que renvoyés par l'API — le découpage en
  // blocs pliables se fait à l'affichage (decoupeSectionsCnrtl), pas ici,
  // pour ne recalculer que la source réellement sélectionnée par l'usager.
  const sources = CNRTL_SOURCES_ORDRE
    .map(id => {
      const entree = (data.content || []).find(c => c.id === id);
      if (!entree || !Array.isArray(entree.content) || entree.content.length === 0) return null;
      return { id, label: CNRTL_SOURCES_LABELS[id], htmlEntries: entree.content };
    })
    .filter(Boolean);

  return { trouve: !!(definition || sources.length), definition, sources, url: urlPage };
}

/* Découpe le HTML brut d'une source CNRTL (un ou plusieurs articles, ex.
   les deux entrées homographes du DMF) en blocs pliables correspondant à
   ses grandes sections : chaque sens numéroté (I., 1., A....) d'une liste
   "s-root-structure", chaque section annexe ("s-section", ex. Historique,
   Remarque), chaque locution ("s-related", ex. "AU HASARD"), et le corps
   principal ("s-content" ou balise <definition>). Rien n'est filtré ni
   dédupliqué : tout ce que la source contient devient un bloc, y compris
   le contenu qui ne rentre dans aucune de ces catégories reconnues
   (regroupé en un dernier bloc "Complément" pour ne rien perdre). Repose
   sur le DOM du navigateur (disponible dans Obsidian) plutôt que sur des
   regex, plus robuste face à un balisage varié selon la source. */
function decoupeSectionsCnrtl(htmlEntries){
  const blocs = [];
  (htmlEntries || []).forEach((html, index) => {
    const conteneur = document.createElement('div');
    conteneur.innerHTML = html;
    const racine = conteneur.firstElementChild;
    if (!racine) return;
    const prefixe = htmlEntries.length > 1 ? `Entrée ${index + 1} — ` : '';

    const clone = racine.cloneNode(true);
    const enfantsOriginaux = Array.from(racine.children);
    const enfantsClone = Array.from(clone.children);

    enfantsOriginaux.forEach((enfant, i) => {
      let extrait = true;
      if (enfant.classList.contains('s-header')) {
        // Le mot-titre est déjà affiché ailleurs (définition rapide) : on
        // le retire du reste sans en faire un bloc à part.
      } else if (enfant.getAttribute('role') === 'list' && enfant.classList.contains('s-root-structure')) {
        Array.from(enfant.children).forEach(item => {
          const numero = item.querySelector(':scope > .s-structure-num');
          const titre = numero ? numero.textContent.trim() : 'Sens';
          blocs.push({ titre: prefixe + titre, html: item.innerHTML });
        });
      } else if (enfant.classList.contains('s-section')) {
        const titreEl = enfant.querySelector(':scope > .s-section-title');
        const titre = titreEl ? titreEl.textContent.trim() : 'Section';
        const enfantClone = enfantsClone[i];
        const titreClone = enfantClone.querySelector(':scope > .s-section-title');
        if (titreClone) titreClone.remove();
        blocs.push({ titre: prefixe + titre, html: enfantClone.innerHTML });
      } else if (enfant.classList.contains('s-related')) {
        const formeEl = enfant.querySelector(':scope > .s-form');
        const titre = formeEl ? formeEl.textContent.trim() : 'Locution';
        blocs.push({ titre: prefixe + titre, html: enfant.innerHTML });
      } else if (enfant.classList.contains('s-content')) {
        blocs.push({ titre: prefixe + 'Définition', html: enfant.innerHTML });
      } else if (enfant.tagName === 'DEFINITION') {
        blocs.push({ titre: prefixe + 'Définition', html: enfant.innerHTML });
      } else {
        extrait = false;
      }
      if (extrait) enfantsClone[i].remove();
    });

    // Tout ce qui n'a pas été reconnu ci-dessus (texte libre, balises
    // isolées type <br>...) reste dans le clone : on le récupère en un
    // dernier bloc plutôt que de le perdre silencieusement.
    const reste = clone.innerHTML.trim();
    if (reste) {
      blocs.push({ titre: prefixe + 'Complément', html: reste });
    }
  });
  return blocs;
}



