/* =========================================================
   TAGS DES MOTS RARES — système unifié
   Un mot peut porter des tags libres ("désuet", "poétique"...) déclarés
   soit directement dans son entrée JSON (dictionnaire-perso.json), soit
   ajoutés/retirés à la volée depuis l'interface (stockés séparément,
   persistants, indépendants de la source du mot). "exclu" est un tag
   comme un autre — pas un champ spécial — mais retranche toujours le mot
   du tirage par défaut, contrairement aux autres tags qui élargissent le
   pool quand on les coche comme filtre.
   ========================================================= */
let MOTS_RARES_META = {}; // { motNormalisé: { tags: [...] } }
const TAG_EXCLU = 'exclu';

/* Index mot normalisé -> entrée, reconstruit à chaque (re)chargement du
   dictionnaire (voir reconstruitIndexMotsRares()). Évite un .find() linéaire
   dans MOTS_RARES à chaque appel de tagsDeclares/tagsDuMot — sensible dès
   que MOTS_RARES dépasse quelques centaines d'entrées (import en masse). */
let MOTS_RARES_INDEX = new Map();

function reconstruitIndexMotsRares(){
  MOTS_RARES_INDEX = new Map();
  MOTS_RARES.forEach(e => {
    if (e && e.mot) MOTS_RARES_INDEX.set(normaliseMot(e.mot), e);
  });
}

function tagsDeclares(mot){
  const entree = MOTS_RARES_INDEX.get(normaliseMot(mot));
  return (entree && Array.isArray(entree.tags)) ? entree.tags : [];
}

function tagsDuMot(mot){
  const w = normaliseMot(mot);
  const declares = tagsDeclares(mot);
  const perso = (MOTS_RARES_META[w] && MOTS_RARES_META[w].tags) || [];
  return [...new Set([...declares, ...perso])];
}

/* Couleur stable par tag (même tag = même couleur partout), en réutilisant
   la palette déjà utilisée pour les rimes/syllabes plutôt que d'en créer
   une nouvelle. "exclu" garde toujours son rouge dédié (cohérent avec
   l'icône 🚫), les autres tags piochent dans la palette par hash du nom. */
function couleurTag(tag){
  if (tag === TAG_EXCLU) return '#a3831f';
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return PALETTE_RIMES[hash % PALETTE_RIMES.length];
}

/* Puce de tag colorée, réutilisée partout où on affiche des tags (chips du
   mot courant, chips de filtres actifs...). onRemove optionnel : ajoute
   un × cliquable. */
function creeChipTag(container, tag, onRemove){
  const chip = container.createSpan({ cls: 'cp-tag-chip' + (tag === TAG_EXCLU ? ' cp-tag-chip-exclu' : '') });
  if (tag !== TAG_EXCLU) {
    const c = couleurTag(tag);
    chip.style.background = c;
    chip.style.borderColor = c;
    chip.style.color = '#fff';
  }
  chip.createSpan({ text: tag });
  if (onRemove) {
    const btnX = chip.createSpan({ cls: 'cp-tag-chip-x', text: ' ×' });
    btnX.addEventListener('click', onRemove);
  }
  return chip;
}

/* Panneau dépliable listant tous les tags disponibles, avec un champ de
   recherche en direct — remplace un simple mur de pastilles (illisible
   dès qu'il y a beaucoup de tags) par quelque chose qu'on peut filtrer en
   tapant, plutôt que de devoir tout scanner à l'œil. Partagé entre
   l'ajout de tag sur le mot courant et le filtre de tirage.
   toggleBtn : bouton "Voir tous les tags (N)" déjà créé par l'appelant.
   getTags : () => string[] tags actuellement proposables.
   onPick : (tag) => void, appelé au clic sur une pastille. */
// Registre partagé des panneaux "voir tous les tags" actuellement instanciés
// (inclusion + exclusion du Hasard) : en ouvrir un ferme les autres, pour
// ne jamais avoir deux longues grilles de tags affichées en même temps —
// source de confusion (laquelle est "inclure", laquelle est "exclure" ?).
const PANNEAUX_TOUS_TAGS = [];

/* Section repliable générique (titre cliquable + badge de compte quand
   replié + corps masqué par défaut) — utilisée pour "Filtrer par tags" et
   "Exclure des tags" dans le Hasard, pour que la page reste épurée tant
   qu'on n'a pas besoin d'aller au-delà des raccourcis rapides, SANS pour
   autant perdre de vue qu'un filtre est actif (le badge reste visible même
   replié, contrairement à un simple accordéon classique). */
function creeSectionRepliable(container, titre, classeCouleur){
  const wrap = container.createDiv({ cls: 'cp-hasard-section-repliable' + (classeCouleur ? ' ' + classeCouleur : '') });
  const header = wrap.createDiv({ cls: 'cp-hasard-section-header' });
  const caretEl = header.createSpan({ cls: 'cp-hasard-section-caret', text: '▸' });
  header.createSpan({ cls: 'cp-hasard-section-titre', text: titre });
  const badgeEl = header.createSpan({ cls: 'cp-hasard-section-badge' });
  const body = wrap.createDiv({ cls: 'cp-hasard-section-body' });
  body.style.display = 'none';
  let ouvert = false;
  let compteBadge = () => 0;
  const render = () => {
    const n = compteBadge();
    badgeEl.setText(n > 0 ? `· ${n} actif${n > 1 ? 's' : ''}` : '');
    caretEl.setText(ouvert ? '▾' : '▸');
    body.style.display = ouvert ? 'block' : 'none';
  };
  header.addEventListener('click', () => { ouvert = !ouvert; render(); });
  return { body, render, setCompteBadge: (fn) => { compteBadge = fn; } };
}

function creePanneauTousTags(container, toggleBtn, getTags, onPick, libelle){
  libelle = libelle || 'Voir tous les tags';
  let ouvert = false;
  const boxDiv = container.createDiv({ cls: 'cp-hasard-tous-tags-box' });
  boxDiv.style.display = 'none';
  const filtreInput = boxDiv.createEl('input', { attr: { type: 'text', placeholder: 'Filtrer la liste…' }, cls: 'cp-hasard-tous-tags-filtre' });
  const grilleDiv = boxDiv.createDiv({ cls: 'cp-hasard-tous-tags-grille' });

  const renderGrille = () => {
    const recherche = filtreInput.value.trim().toLowerCase();
    grilleDiv.empty();
    const tags = getTags().filter(t => !recherche || t.includes(recherche));
    if (tags.length === 0) {
      grilleDiv.createEl('p', { cls: 'cp-vide', text: 'Aucun tag ne correspond.' });
      return;
    }
    tags.forEach(tag => {
      const btn = grilleDiv.createEl('button', { cls: 'cp-hasard-preset-btn-mini', text: tag });
      const c = couleurTag(tag);
      btn.style.borderColor = c;
      btn.style.color = c;
      btn.addEventListener('click', () => onPick(tag));
    });
  };
  filtreInput.addEventListener('input', renderGrille);

  const render = () => {
    const tags = getTags();
    toggleBtn.style.display = tags.length > 0 ? 'inline-block' : 'none';
    toggleBtn.setText(ouvert ? 'Masquer les autres tags' : `${libelle} (${tags.length})`);
    boxDiv.style.display = ouvert ? 'block' : 'none';
    if (ouvert) renderGrille();
  };
  const fermer = () => { if (ouvert) { ouvert = false; render(); } };
  toggleBtn.addEventListener('click', () => {
    const prochainEtat = !ouvert;
    if (prochainEtat) PANNEAUX_TOUS_TAGS.forEach(p => { if (p.fermer !== fermer) p.fermer(); });
    ouvert = prochainEtat;
    render();
  });
  const api = { render, fermer };
  PANNEAUX_TOUS_TAGS.push(api);
  return api;
}

function estExclu(mot){
  return tagsDuMot(mot).includes(TAG_EXCLU);
}

async function ajouteTagMot(plugin, mot, tag){
  tag = (tag || '').trim().toLowerCase();
  if (!tag) return;
  const w = normaliseMot(mot);
  if (!MOTS_RARES_META[w]) MOTS_RARES_META[w] = { tags: [] };
  if (!MOTS_RARES_META[w].tags.includes(tag)) MOTS_RARES_META[w].tags.push(tag);
  const data = (await plugin.loadData()) || {};
  data.motsRaresMeta = MOTS_RARES_META;
  await plugin.saveData(data);
}

async function retireTagMot(plugin, mot, tag){
  const w = normaliseMot(mot);
  if (MOTS_RARES_META[w]) {
    MOTS_RARES_META[w].tags = MOTS_RARES_META[w].tags.filter(t => t !== tag);
  }
  const data = (await plugin.loadData()) || {};
  data.motsRaresMeta = MOTS_RARES_META;
  await plugin.saveData(data);
}

/* Vide l'entrée data.json d'un mot (zone tampon), typiquement après l'avoir
   gravé dans dictionnaire-perso.json : ses tags vivent désormais dans le
   fichier perso lui-même, plus besoin de les garder en double ici. */
async function purgeMetaMot(plugin, mot){
  const w = normaliseMot(mot);
  if (!MOTS_RARES_META[w]) return;
  delete MOTS_RARES_META[w];
  const data = (await plugin.loadData()) || {};
  data.motsRaresMeta = MOTS_RARES_META;
  await plugin.saveData(data);
}

/* Liste des tags actuellement en usage sur au moins un mot (hors "exclu",
   géré à part dans l'interface), pour construire les filtres à la volée. */
function tousLesTagsUtilises(){
  const tags = new Set();
  MOTS_RARES.forEach(e => tagsDuMot(e.mot).forEach(t => tags.add(t)));
  return [...tags].sort();
}

/* Comme tousLesTagsUtilises, mais trié par fréquence d'usage décroissante
   plutôt qu'alphabétique — sert à proposer des boutons de tag "presets"
   (les plus utilisés en premier). "exclu" en est toujours absent : il a
   déjà son propre bouton dédié (👎). */
function tagsParFrequence(){
  const compte = new Map();
  MOTS_RARES.forEach(e => tagsDuMot(e.mot).forEach(t => {
    if (t === TAG_EXCLU) return;
    compte.set(t, (compte.get(t) || 0) + 1);
  }));
  return [...compte.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

/* Historique des derniers mots tirés (en mémoire, pas persisté), pour
   éviter l'impression de répétition — la fenêtre s'adapte à la taille du
   pool filtré courant pour ne jamais le vider complètement. */
let HISTORIQUE_TIRAGE = [];
const HISTORIQUE_MAX = 40;

/* Tags "significatifs" d'un mot : tous les tags sauf le marqueur réservé
   "exclu" (qui répond à une question différente — dans quel bassin on
   pioche — pas "à quelle catégorie appartient ce mot"). Sert de base
   commune à masquerTagues, modeMultiTagues, et aux statistiques. */
function tagsSignificatifs(mot){
  return tagsDuMot(mot).filter(t => t !== TAG_EXCLU);
}

/* Filtre MOTS_RARES selon les mêmes critères que motAuHasard, mais renvoie
   la liste entière plutôt qu'un tirage — réutilisé à la fois pour le
   tirage lui-même et pour afficher la taille du pool en direct avant de
   tirer. */
function filtrePoolMots(options){
  const { tagsActifs = new Set(), modeET = false, modePlusUnAutre = false, tagsExclus = new Set(),
    masquerTagues = false, modeMultiTagues = false, modeRevueExclus = false } = options || {};
  // "exclu" décide dans QUEL bassin on pioche (mots mis de côté vs actifs),
  // les tags décident QUELS mots dans ce bassin — les deux se combinent
  // naturellement (ex. revoir "les mots exclus tagués méral").
  let pool = MOTS_RARES.filter(e => estExclu(e.mot) === modeRevueExclus);
  if (tagsActifs.size > 0) {
    pool = pool.filter(e => {
      const tags = tagsDuMot(e.mot);
      return modeET
        ? [...tagsActifs].every(t => tags.includes(t))
        : tags.some(t => tagsActifs.has(t));
    });
    if (modePlusUnAutre) {
      // En plus du tag (ou des tags) coché(s) : au moins UN tag
      // supplémentaire, quel qu'il soit — "méral ET n'importe quel autre
      // tag", "femme + autre", sans avoir à coder un cas par tag.
      pool = pool.filter(e => tagsSignificatifs(e.mot).some(t => !tagsActifs.has(t)));
    }
  }
  if (tagsExclus.size > 0) {
    // Exclusion générique (NOT/NOR) : retranche tout mot portant AU MOINS
    // UN des tags de cette liste — "masquer les mots connus" en est
    // maintenant un raccourci (équivalent à exclure juste "connu"), plutôt
    // qu'un booléen séparé codé en dur.
    pool = pool.filter(e => !tagsDuMot(e.mot).some(t => tagsExclus.has(t)));
  }
  if (masquerTagues) {
    // Ne garde que les mots SANS AUCUN tag significatif (0) — contenu
    // totalement neuf, jamais catégorisé.
    pool = pool.filter(e => tagsSignificatifs(e.mot).length === 0);
  }
  if (modeMultiTagues) {
    // Miroir de masquerTagues : ne garde que les mots avec 2 tags
    // significatifs ou plus — utile pour repérer les mots déjà bien
    // recoupés (plusieurs catégories à la fois), plutôt que ceux qui
    // n'ont qu'une étiquette isolée.
    pool = pool.filter(e => tagsSignificatifs(e.mot).length >= 2);
  }
  return pool;
}

function motAuHasard(options){
  const pool = filtrePoolMots(options);
  if (pool.length === 0) return null;

  const fenetre = Math.min(HISTORIQUE_MAX, Math.floor(pool.length / 2));
  const recents = new Set(HISTORIQUE_TIRAGE.slice(-fenetre));
  let candidats = pool.filter(e => !recents.has(normaliseMot(e.mot)));
  if (candidats.length === 0) candidats = pool; // pool trop petit pour filtrer, on retire la contrainte

  const choix = candidats[Math.floor(Math.random() * candidats.length)];
  HISTORIQUE_TIRAGE.push(normaliseMot(choix.mot));
  if (HISTORIQUE_TIRAGE.length > HISTORIQUE_MAX) HISTORIQUE_TIRAGE.shift();
  return choix;
}

function chercheSynonymes(motSaisi){
  const w = normaliseMot(motSaisi);
  const wSouple = normaliseSouple(motSaisi);
  if (!w) return null;
  const correspondances = SYNONYMES.filter(e => normaliseMot(e.mot) === w || normaliseSouple(e.mot) === wSouple);

  // Format C (bulk kaikki) : synonymes/antonymes déjà résolus phonétiquement,
  // stockés à part (SYNONYMES_PHONETIQUE) plutôt que dans SYNONYMES lui-même
  // pour ne pas alourdir la structure existante — on les fusionne ici à
  // l'affichage, comme n'importe quelle autre source locale.
  const depuisPhon = (!DEBUG_IGNORER_DICO_PERSO && SYNONYMES_PHONETIQUE) ? SYNONYMES_PHONETIQUE.get(w) : null;

  if (correspondances.length === 0 && !depuisPhon) return null;

  const synonymes = new Set(correspondances.flatMap(e => e.synonymes || []));
  const antonymes = new Set(correspondances.flatMap(e => e.antonymes || []));
  if (depuisPhon) {
    depuisPhon.synonymes.forEach(s => synonymes.add(s.mot));
    depuisPhon.antonymes.forEach(a => antonymes.add(a.mot));
  }
  return { mot: correspondances[0] ? correspondances[0].mot : motSaisi, synonymes: [...synonymes], antonymes: [...antonymes] };
}

