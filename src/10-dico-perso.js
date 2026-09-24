/* =========================================================
   DICTIONNAIRE PERSONNEL (optionnel) — deux formats acceptés
   Fichier dictionnaire-perso.json dans le dossier du plugin :

   A) Familles "maison", en plus du dictionnaire intégré :
   {
     "familles": [
       { "son": "-onk [personnalisé]", "exemple": "...", "terms": ["onk"], "mots": ["..."] }
     ]
   }

   B) Dictionnaire phonétique complet (ex. export type Remède/
   Dico-Rimes) : un objet plat où chaque clé est un code de rime
   phonétique et la valeur la liste des mots qui riment vraiment
   (regroupement par prononciation, pas par orthographe) :
   {
     "ka": ["avocat", "cas", "syndicat", ...],
     "sa": ["cassa", "dansa", "pensa", ...],
     ...
   }
   Ce second format prend le pas sur le dictionnaire intégré dès
   qu'un mot y est trouvé (recherche exacte, beaucoup plus fiable
   que les familles orthographiques faites à la main).
   ========================================================= */

let DICO_PHONETIQUE = null;        // Map: mot (minuscule) -> clé de rime
let DICO_PHONETIQUE_GROUPES = null; // objet brut: clé de rime -> [mots]

/* Format C (dictionnaire phonétique complet + synonymes) : en plus du
   regroupement par clé de rime ci-dessus (compatible Format B), ce format
   donne, par mot, sa transcription phonétique complète (alphabet SAMPA-like
   à un caractère par phonème) et ses synonymes/antonymes — eux-mêmes déjà
   résolus phonétiquement quand ils font partie du même dictionnaire.
   PHONETIQUE_MOT sert d'index partagé (Rimes, Syllabes, Synonymes) pour
   calculer une richesse de rime exacte sur les vrais phonèmes plutôt que
   sur l'heuristique orthographique, dès que le mot y figure. */
let PHONETIQUE_MOT = null;         // Map: mot (minuscule) -> transcription phonétique complète
let SYNONYMES_PHONETIQUE = null;   // Map: mot (minuscule) -> { synonymes: [{mot,phonetique}], antonymes: [...] }
let CGRAM_MOT = null;              // Map: mot (minuscule) -> ['NOM','ADJ',...] (catégories grammaticales connues)
let STATS_DICO = null;             // { base: {version,mots,motsRares}|null, perso: {chemin,octets,motsRares,champsLexicaux,synonymes,motsPhonetiques}|null } — pour l'onglet Réglages

/* =========================================================
   BASE PUBLIÉE + CALQUE PERSONNEL (depuis 2.28)
   - dictionnaire-base.json.gz : dictionnaire publié (phonétique, synonymes,
     mots rares de Méral), téléchargé depuis la release GitHub dans le
     dossier du plugin. Jamais écrit par le plugin en dehors du
     téléchargement : il peut être remplacé à chaque nouvelle version.
   - dictionnaire-perso.json : dans le coffre, ne contient QUE les ajouts et
     modifications de l'utilisateur (clé = le mot). Fusionné par-dessus la
     base au chargement : les tags s'additionnent, la note perso s'affiche
     avant celle de la base (séparées par ---),
     une entrée phonétique perso remplace celle de la base.
   Un ancien dictionnaire-perso.json « tout-en-un » (2.27 et avant) est
   migré automatiquement, après copie de sauvegarde horodatée.
   ========================================================= */
const VERSION_BASE = '2.29.0'; // à changer uniquement quand la base change
const NOM_FICHIER_BASE = 'dictionnaire-base.json.gz';
const URL_BASE = `https://github.com/sbridel/carnet-du-poete/releases/download/${VERSION_BASE}/${NOM_FICHIER_BASE}`;
const FORMAT_PERSO = 1;
const CLES_HORS_GROUPES = ['familles', 'champsLexicaux', 'synonymes', 'motsRares', '_legende', 'formatPerso', 'formatBase', 'versionBase'];
let ECHEC_TELECHARGEMENT_BASE = false;   // pas de nouvel essai réseau dans la même session
let NOTES_BASE_PUBLIEE = new Map();      // mot normalisé -> note de la base (évite de la recopier dans le perso)

/* Clés de groupes phonétiques (Format C) d'un objet dictionnaire. */
function clesGroupesPhonetiques(data){
  return Object.keys(data || {}).filter(k => !CLES_HORS_GROUPES.includes(k)
    && data[k] && typeof data[k] === 'object' && !Array.isArray(data[k]));
}

/* Ancien fichier tout-en-un : contient des groupes phonétiques mais pas de
   marqueur formatPerso. */
function estAncienFormatComplet(data){
  return !!data && typeof data === 'object' && data.formatPerso === undefined
    && clesGroupesPhonetiques(data).length > 0;
}

/* Fusionne le calque perso par-dessus la base (fonction pure hors mutation
   assumée de `base`, relue à chaque chargement). Renvoie un objet au même
   format qu'un ancien dictionnaire-perso.json complet. */
function fusionneBasePerso(base, perso){
  if (!base) return perso || null;
  if (!perso) return base;
  const out = base;
  // Un même mot peut légitimement figurer dans deux groupes (homographes :
  // « sens », « boxer », « ferment »…) : la fusion se fait groupe par groupe.
  clesGroupesPhonetiques(perso).forEach(cle => {
    if (!out[cle] || typeof out[cle] !== 'object' || Array.isArray(out[cle])) out[cle] = {};
    Object.keys(perso[cle]).forEach(mot => {
      const ep = perso[cle][mot];
      if (!ep || typeof ep !== 'object') return;
      const eb = out[cle][mot];
      out[cle][mot] = (eb && typeof eb === 'object') ? Object.assign({}, eb, ep) : ep;
    });
  });
  if (Array.isArray(perso.motsRares)) {
    const rares = Array.isArray(out.motsRares) ? out.motsRares : [];
    const index = new Map();
    rares.forEach(e => { if (e && e.mot) index.set(normaliseMot(e.mot), e); });
    perso.motsRares.forEach(p => {
      if (!p || !p.mot) return;
      const w = normaliseMot(p.mot);
      const tagsPerso = Array.isArray(p.tags) ? p.tags : [];
      const b = index.get(w);
      if (b) {
        // Note perso + note de la base, toutes deux affichées (sans être
        // stockées ensemble) ; une note perso qui contient déjà celle de la
        // base (ancienne fusion, ou note réenregistrée telle qu'affichée)
        // est gardée telle quelle.
        const noteP = (p.note || '').trim(), noteB = (b.note || '').trim();
        if (noteP && noteP !== noteB) b.note = (!noteB || noteP.includes(noteB)) ? p.note : `${noteP}\n\n---\n\n${noteB}`;
        const tags = [...new Set([...(Array.isArray(b.tags) ? b.tags : []), ...tagsPerso])];
        if (tags.length > 0) b.tags = tags;
      } else {
        const e = { mot: p.mot, note: p.note || '' };
        if (tagsPerso.length > 0) e.tags = [...tagsPerso];
        rares.push(e);
        index.set(w, e);
      }
    });
    out.motsRares = rares;
  }
  ['champsLexicaux', 'synonymes', 'familles'].forEach(k => {
    if (Array.isArray(perso[k])) out[k] = [...(Array.isArray(out[k]) ? out[k] : []), ...perso[k]];
  });
  return out;
}

/* Migration : ne garde d'un ancien fichier complet que ce qui diffère de la
   base (tags en plus, note différente, mots absents, entrées phonétiques
   modifiées ; champs lexicaux, synonymes et familles gardés tels quels). */
function extraitDifferencesPerso(ancien, base){
  const perso = { formatPerso: FORMAT_PERSO };
  ['champsLexicaux', 'synonymes', 'familles'].forEach(k => {
    if (Array.isArray(ancien[k]) && ancien[k].length > 0) perso[k] = ancien[k];
  });
  const baseRares = new Map();
  (Array.isArray(base.motsRares) ? base.motsRares : []).forEach(e => { if (e && e.mot) baseRares.set(normaliseMot(e.mot), e); });
  const rares = [];
  (Array.isArray(ancien.motsRares) ? ancien.motsRares : []).forEach(e => {
    if (!e || !e.mot) return;
    const b = baseRares.get(normaliseMot(e.mot));
    if (!b) { rares.push(e); return; }
    const tagsBase = Array.isArray(b.tags) ? b.tags : [];
    const tagsEnPlus = (Array.isArray(e.tags) ? e.tags : []).filter(t => !tagsBase.includes(t));
    const note = (e.note || '').trim() !== (b.note || '').trim() ? (e.note || '') : '';
    if (tagsEnPlus.length > 0 || note) {
      const d = { mot: e.mot, note };
      if (tagsEnPlus.length > 0) d.tags = tagsEnPlus;
      rares.push(d);
    }
  });
  if (rares.length > 0) perso.motsRares = rares;
  // Champs ajoutés à la base après la 2.28 (ex. cgram, 2.29) : un ancien
  // fichier ne les a jamais eus, donc leur seule présence ne doit pas faire
  // passer un mot pour "modifié" par l'utilisateur.
  const CHAMPS_IGNORES_MIGRATION = ['cgram'];
  const sansChampsIgnores = (e) => {
    if (CHAMPS_IGNORES_MIGRATION.every(c => !(c in (e || {})))) return e;
    const c2 = Object.assign({}, e);
    CHAMPS_IGNORES_MIGRATION.forEach(c => delete c2[c]);
    return c2;
  };
  clesGroupesPhonetiques(ancien).forEach(cle => {
    const groupeBase = (base[cle] && typeof base[cle] === 'object' && !Array.isArray(base[cle])) ? base[cle] : {};
    Object.keys(ancien[cle]).forEach(mot => {
      const e = ancien[cle][mot];
      if (JSON.stringify(sansChampsIgnores(groupeBase[mot])) === JSON.stringify(sansChampsIgnores(e))) return;
      (perso[cle] = perso[cle] || {})[mot] = e;
    });
  });
  return perso;
}

function dossierPlugin(plugin){
  const configDir = plugin.app.vault.configDir;
  return plugin.manifest.dir || `${configDir}/plugins/${plugin.manifest.id}`;
}

async function decompresseGzip(octets){
  if (typeof DecompressionStream === 'function') {
    const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(flux).text();
  }
  const zlib = require('zlib'); // repli bureau (Electron) si l'API web manque
  return zlib.gunzipSync(Buffer.from(octets)).toString('utf-8');
}

/* Télécharge la base, la valide (décompression + JSON) AVANT de l'écrire :
   une base existante n'est jamais remplacée par un fichier corrompu. */
async function telechargeBase(plugin){
  const rep = await requestUrl({ url: URL_BASE, throw: false });
  if (!rep || rep.status !== 200 || !rep.arrayBuffer) throw new Error(`réponse HTTP ${rep && rep.status}`);
  const base = JSON.parse(await decompresseGzip(rep.arrayBuffer));
  if (!base || typeof base !== 'object' || base.formatBase === undefined) throw new Error('fichier de base inattendu');
  await plugin.app.vault.adapter.writeBinary(`${dossierPlugin(plugin)}/${NOM_FICHIER_BASE}`, rep.arrayBuffer);
  const data = (await plugin.loadData()) || {};
  data.versionBase = VERSION_BASE;
  await plugin.saveData(data);
  console.log(`[Carnet du Poète] base ${VERSION_BASE} téléchargée depuis ${URL_BASE}`);
  return base;
}

/* Renvoie la base (objet) ou null : téléchargement si absente ou d'une
   autre version, sinon lecture locale ; hors ligne, garde l'ancienne. */
async function chargeBase(plugin){
  const adapter = plugin.app.vault.adapter;
  const chemin = `${dossierPlugin(plugin)}/${NOM_FICHIER_BASE}`;
  const data = (await plugin.loadData()) || {};
  const presente = await adapter.exists(chemin);
  if ((!presente || data.versionBase !== VERSION_BASE) && !ECHEC_TELECHARGEMENT_BASE) {
    try {
      const base = await telechargeBase(plugin);
      new Notice(`Carnet du Poète : dictionnaire de base ${VERSION_BASE} téléchargé.`);
      return base;
    } catch (e) {
      ECHEC_TELECHARGEMENT_BASE = true;
      console.warn('[Carnet du Poète] téléchargement de la base impossible', e);
      new Notice(presente
        ? 'Carnet du Poète : nouvelle base non téléchargée (hors ligne ?) — l\'ancienne est utilisée, nouvel essai au prochain lancement.'
        : 'Carnet du Poète : dictionnaire de base non téléchargé (hors ligne ?) — nouvel essai au prochain lancement.');
    }
  }
  if (!presente) return null;
  try {
    return JSON.parse(await decompresseGzip(await adapter.readBinary(chemin)));
  } catch (e) {
    console.error('[Carnet du Poète] base locale illisible', e);
  }
  if (!ECHEC_TELECHARGEMENT_BASE) {
    try { return await telechargeBase(plugin); }
    catch (e) { ECHEC_TELECHARGEMENT_BASE = true; console.warn('[Carnet du Poète] nouveau téléchargement impossible', e); }
  }
  new Notice('Carnet du Poète : dictionnaire de base illisible — le plugin continue avec le dictionnaire personnel seul.');
  return null;
}

/* Sauvegarde l'ancien fichier, écrit le calque perso à sa place (ou à la
   racine du coffre s'il était dans le dossier du plugin, effacé à la
   désinstallation) et renvoie le nouveau calque. */
async function migreAncienDictionnaire(plugin, chemin, raw, ancien, base){
  const adapter = plugin.app.vault.adapter;
  const racine = 'dictionnaire-perso.json';
  let destination = chemin;
  if (chemin.startsWith(dossierPlugin(plugin) + '/') && !(await adapter.exists(racine))) destination = racine;
  const dossier = destination.includes('/') ? destination.slice(0, destination.lastIndexOf('/') + 1) : '';
  const d = new Date();
  const p2 = n => String(n).padStart(2, '0');
  const horodatage = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
  const cheminSauvegarde = `${dossier}dictionnaire-perso.sauvegarde-${horodatage}.json`;
  await adapter.write(cheminSauvegarde, raw);
  if (!(await adapter.exists(cheminSauvegarde))) throw new Error('sauvegarde non créée');
  const perso = extraitDifferencesPerso(ancien, base);
  if (await adapter.exists(destination)) await adapter.write(destination, JSON.stringify(perso));
  else await plugin.app.vault.create(destination, JSON.stringify(perso));
  if (destination !== chemin) await adapter.remove(chemin);
  new Notice(`Carnet du Poète : dictionnaire personnel migré au nouveau format (${destination}). Ancien fichier sauvegardé : ${cheminSauvegarde}.`, 10000);
  console.log('[Carnet du Poète] migration terminée :', destination, '— sauvegarde :', cheminSauvegarde);
  return { perso, chemin: destination };
}

/* Lecture pour écriture : si le fichier existe mais ne se relit pas, on
   lève une erreur plutôt que de l'écraser par un contenu vide. */
async function lisPersoPourEcriture(plugin){
  const adapter = plugin.app.vault.adapter;
  let chemin = await trouveCheminDictionnairePerso(plugin);
  if (!chemin) {
    chemin = (await cheminDictionnairePersoConfigure(plugin)) || 'dictionnaire-perso.json';
    return { chemin, data: { formatPerso: FORMAT_PERSO } };
  }
  const data = JSON.parse(await adapter.read(chemin));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('contenu JSON inattendu');
  return { chemin, data };
}

async function ecritPerso(plugin, chemin, data){
  // un ancien fichier complet pas encore migré (base indisponible) garde
  // son format, sinon il ne serait plus jamais migré
  if (!estAncienFormatComplet(data)) data.formatPerso = FORMAT_PERSO;
  const contenu = JSON.stringify(data);
  const adapter = plugin.app.vault.adapter;
  if (await adapter.exists(chemin)) await adapter.write(chemin, contenu);
  else await plugin.app.vault.create(chemin, contenu);
}

function signaleLecturePersoImpossible(e){
  console.error('[Carnet du Poète] dictionnaire-perso.json illisible, écriture annulée', e);
  new Notice('Carnet du Poète : dictionnaire-perso.json illisible — enregistrement annulé pour ne pas l\'écraser (voir la console).');
}

/* Cherche dictionnaire-perso.json à deux endroits, dans l'ordre :
   1. Le dossier technique du plugin (.obsidian/plugins/carnet-du-poete/)
      — pratique en installation manuelle sur ordinateur.
   2. N'importe où dans le coffre lui-même (comme une note normale)
      — c'est le cas le plus utile en pratique : BRAT ne télécharge que
      main.js/manifest.json/styles.css, jamais de fichier de données
      personnalisé, et le dossier .obsidian est souvent caché ou
      inaccessible sur mobile. En posant le fichier n'importe où dans
      le coffre (même à la racine), Obsidian le retrouve tout seul. */
async function chercheRecursivementDansDossier(adapter, dossier, nomFichier, profondeurMax){
  if (profondeurMax <= 0) return null;
  let listing;
  try {
    listing = await adapter.list(dossier);
  } catch (e) {
    return null;
  }
  if (listing && Array.isArray(listing.files)) {
    const trouve = listing.files.find(f => f.split('/').pop() === nomFichier);
    if (trouve) return trouve;
  }
  if (listing && Array.isArray(listing.folders)) {
    for (const sousDossier of listing.folders) {
      const res = await chercheRecursivementDansDossier(adapter, sousDossier, nomFichier, profondeurMax - 1);
      if (res) return res;
    }
  }
  return null;
}

async function cheminDictionnairePersoConfigure(plugin){
  const data = await plugin.loadData();
  const c = data && data.cheminDictionnairePerso && data.cheminDictionnairePerso.trim();
  return c || null;
}

async function trouveCheminDictionnairePerso(plugin){
  const adapter = plugin.app.vault.adapter;
  const configDir = plugin.app.vault.configDir; // en général ".obsidian", mais peut être renommé
  const pluginDir = dossierPlugin(plugin);
  const nomFichier = 'dictionnaire-perso.json';

  // 0) Chemin personnalisé explicitement configuré dans les réglages du
  //    plugin (prioritaire sur tout le reste s'il est renseigné et existe)
  try {
    const cheminPerso = await cheminDictionnairePersoConfigure(plugin);
    if (cheminPerso) {
      if (await adapter.exists(cheminPerso)) return cheminPerso;
      console.warn('[Carnet du Poète] chemin personnalisé configuré mais introuvable :', cheminPerso, '— repli sur la recherche automatique.');
    }
  } catch (e) {
    console.warn('[Carnet du Poète] erreur en lisant le chemin personnalisé configuré', e);
  }

  // 1) Emplacements précis les plus probables, testés directement (rapide,
  //    fonctionne même sur Android où l'exploration de fichiers est limitée)
  const candidats = [
    `${pluginDir}/${nomFichier}`,   // dossier du plugin (installation manuelle)
    `${configDir}/${nomFichier}`,   // racine de .obsidian
    nomFichier                      // racine du coffre lui-même
  ];
  for (const chemin of candidats) {
    try {
      if (await adapter.exists(chemin)) return chemin;
    } catch (e) {
      console.warn('[Carnet du Poète] erreur en testant', chemin, e);
    }
  }

  // 2) N'importe où dans le contenu normal du coffre (notes, sous-dossiers)
  try {
    const fichier = plugin.app.vault.getFiles().find(f => f.name === nomFichier);
    if (fichier) return fichier.path;
  } catch (e) {
    console.warn('[Carnet du Poète] recherche dans le coffre impossible', e);
  }

  // 3) Recherche récursive dans tout le dossier .obsidian, profondeur
  //    limitée pour rester rapide y compris sur mobile.
  try {
    const trouve = await chercheRecursivementDansDossier(adapter, configDir, nomFichier, 5);
    if (trouve) return trouve;
  } catch (e) {
    console.warn('[Carnet du Poète] recherche récursive impossible', e);
  }
  return null;
}

/* Renvoie { chemin, raw } ou null si aucun dictionnaire-perso.json. */
async function trouveEtLisDictionnairePerso(plugin){
  const chemin = await trouveCheminDictionnairePerso(plugin);
  if (!chemin) {
    console.log('[Carnet du Poète] dictionnaire personnel introuvable (réglage, dossier du plugin, .obsidian, coffre, recherche récursive).');
    return null;
  }
  console.log('[Carnet du Poète] dictionnaire personnel trouvé :', chemin);
  return { chemin, raw: await plugin.app.vault.adapter.read(chemin) };
}

/* Enregistre (ou met à jour) une entrée de synonymes/antonymes dans
   dictionnaire-perso.json : réutilise le fichier existant s'il y en a
   un (peu importe où il a été trouvé), sinon en crée un nouveau à la
   racine du coffre. Recharge ensuite le dictionnaire en mémoire. */
async function enregistreSynonymePerso(plugin, mot, synonymes, antonymes){
  let chemin, data;
  try { ({ chemin, data } = await lisPersoPourEcriture(plugin)); }
  catch (e) { signaleLecturePersoImpossible(e); return; }

  if (!Array.isArray(data.synonymes)) data.synonymes = [];
  const motNorm = normaliseMot(mot);
  const existante = data.synonymes.find(e => e && normaliseMot(e.mot) === motNorm);
  if (existante) {
    existante.synonymes = [...new Set([...(existante.synonymes || []), ...synonymes])];
    existante.antonymes = [...new Set([...(existante.antonymes || []), ...antonymes])];
  } else {
    data.synonymes.push({ mot, synonymes, antonymes });
  }

  // Écriture compacte (sans indentation) : le dictionnaire complet pèse
  // ~13 Mo compact contre ~20 Mo indenté ; même contenu, seul l'affichage
  // brut du fichier change (un éditeur peut le remettre en forme).
  try {
    await ecritPerso(plugin, chemin, data);
    new Notice(`Carnet du Poète : « ${mot} » enregistré dans ${chemin}.`);
    await chargeDictionnairePerso(plugin);
  } catch (e) {
    console.error('[Carnet du Poète] échec de l\'écriture de dictionnaire-perso.json', e);
    new Notice('Carnet du Poète : échec de l\'enregistrement (voir la console).');
  }
}

/* Ajoute un mot rare saisi manuellement au dictionnaire personnel (même
   mécanique de recherche/écriture de fichier que enregistreSynonymePerso). */
async function ajouteMotRarePerso(plugin, mot, note, tags){
  let chemin, data;
  try { ({ chemin, data } = await lisPersoPourEcriture(plugin)); }
  catch (e) { signaleLecturePersoImpossible(e); return; }

  if (!Array.isArray(data.motsRares)) data.motsRares = [];
  const motNorm = normaliseMot(mot);
  const existante = data.motsRares.find(e => e && normaliseMot(e.mot) === motNorm);
  // une note identique à celle de la base n'est pas recopiée dans le perso
  // (le mot recevra ainsi les corrections futures de la base)
  const noteBase = NOTES_BASE_PUBLIEE.get(motNorm);
  const egaleBase = noteBase !== undefined && (note || '').trim() === noteBase.trim();
  if (existante) {
    if (egaleBase) existante.note = '';
    else if (note) existante.note = note;
    existante.tags = [...new Set([...(existante.tags || []), ...(tags || [])])];
  } else {
    const entree = { mot, note: egaleBase ? '' : (note || '') };
    if (tags && tags.length > 0) entree.tags = tags;
    data.motsRares.push(entree);
  }

  try {
    await ecritPerso(plugin, chemin, data);
    await chargeDictionnairePerso(plugin);
  } catch (e) {
    console.error('[Carnet du Poète] échec de l\'écriture de dictionnaire-perso.json', e);
    new Notice('Carnet du Poète : échec de l\'enregistrement (voir la console).');
  }
}

/* Gravure en masse : transfère en une seule lecture/écriture TOUS les mots
   qui ont des tags en attente dans data.json (zone tampon, MOTS_RARES_META)
   vers dictionnaire-perso.json, puis vide entièrement data.json. Plus
   efficace et moins risqué qu'une boucle d'appels à ajouteMotRarePerso
   (qui relit/réécrit le fichier à chaque mot). Déclenché depuis les
   réglages du plugin, où l'UI demande une confirmation avant d'appeler
   cette fonction — pas de confirmation ici, elle est supposée acquise. */
async function graverTousLesMotsRaresEnMasse(plugin){
  const motsAvecMeta = Object.keys(MOTS_RARES_META)
    .filter(w => MOTS_RARES_META[w] && Array.isArray(MOTS_RARES_META[w].tags) && MOTS_RARES_META[w].tags.length > 0);

  if (motsAvecMeta.length === 0) {
    new Notice('Carnet du Poète : aucun tag en attente dans data.json, rien à graver.');
    return 0;
  }

  let chemin, data;
  try { ({ chemin, data } = await lisPersoPourEcriture(plugin)); }
  catch (e) { signaleLecturePersoImpossible(e); return 0; }
  if (!Array.isArray(data.motsRares)) data.motsRares = [];

  let compte = 0;
  motsAvecMeta.forEach(w => {
    const entreeSource = MOTS_RARES_INDEX.get(w);
    const mot = entreeSource ? entreeSource.mot : w;
    // mot de la base : sa note y est déjà, seuls les tags vont dans le perso
    const note = (entreeSource && !NOTES_BASE_PUBLIEE.has(w)) ? (entreeSource.note || '') : '';
    const tags = tagsDuMot(mot);
    const existante = data.motsRares.find(e => e && normaliseMot(e.mot) === w);
    if (existante) {
      if (!existante.note && note) existante.note = note;
      existante.tags = [...new Set([...(existante.tags || []), ...tags])];
    } else {
      const entree = { mot, note };
      if (tags.length > 0) entree.tags = tags;
      data.motsRares.push(entree);
    }
    compte++;
  });

  try {
    await ecritPerso(plugin, chemin, data);
  } catch (e) {
    console.error('[Carnet du Poète] échec de l\'écriture en masse de dictionnaire-perso.json', e);
    new Notice('Carnet du Poète : échec de la gravure en masse (voir la console).');
    return 0;
  }

  MOTS_RARES_META = {};
  const metaData = (await plugin.loadData()) || {};
  metaData.motsRaresMeta = {};
  await plugin.saveData(metaData);

  await chargeDictionnairePerso(plugin);
  new Notice(`Carnet du Poète : ${compte} mot(s) gravé(s) en masse dans ${chemin}, data.json vidé.`);
  return compte;
}

/* Ajoute un mot à un champ lexical personnel, en le créant s'il n'existe
   pas encore (même mécanique de recherche/écriture de fichier que
   ajouteMotRarePerso). motsClefs ne sert qu'à la création d'un nouveau
   champ : on n'élargit jamais silencieusement la portée de recherche
   d'un champ existant juste parce qu'on lui ajoute un mot. */
async function ajouteMotChampLexicalPerso(plugin, theme, motsClefs, mot, note, opts){
  let chemin, data;
  try { ({ chemin, data } = await lisPersoPourEcriture(plugin)); }
  catch (e) { signaleLecturePersoImpossible(e); return; }

  if (!Array.isArray(data.champsLexicaux)) data.champsLexicaux = [];
  const themeNorm = normaliseMot(theme);
  let champ = data.champsLexicaux.find(c => c && normaliseMot(c.theme) === themeNorm);
  if (!champ) {
    const clefs = (motsClefs && motsClefs.length > 0) ? motsClefs : motsClefsDepuisTheme(theme);
    champ = { theme, motsClefs: clefs, mots: [] };
    data.champsLexicaux.push(champ);
  }
  if (!Array.isArray(champ.mots)) champ.mots = [];
  const motNorm = normaliseMot(mot);
  const existante = champ.mots.find(m => m && normaliseMot(m.mot) === motNorm);
  if (existante) {
    if (note) existante.note = note;
  } else {
    champ.mots.push({ mot, note: note || '' });
  }

  try {
    await ecritPerso(plugin, chemin, data);
    if (!(opts && opts.silencieux)) new Notice(`Carnet du Poète : « ${mot} » ajouté au champ lexical « ${champ.theme} ».`);
    await chargeDictionnairePerso(plugin);
  } catch (e) {
    console.error('[Carnet du Poète] échec de l\'écriture de dictionnaire-perso.json', e);
    new Notice('Carnet du Poète : échec de l\'enregistrement (voir la console).');
  }
}

/* Liste des thèmes actuellement connus (intégrés + personnels), pour
   l'autocomplétion du champ "thème" au moment d'ajouter un mot. */
function tousLesThemesLexicaux(){
  return [...new Set(CHAMPS_LEXICAUX.map(c => c.theme))].sort();
}

/* Relit dictionnaire-perso.json, fusionne toute entrée dupliquée (même
   thème pour les champs lexicaux, même mot pour les mots rares et les
   synonymes/antonymes) et réécrit le fichier nettoyé. Corrige les
   doublons accumulés par des sessions successives (ex. avant le
   correctif de fusion à la lecture des champs lexicaux) — et redécoupe au
   passage les motsClefs "collés" auto-générés par l'ancien comportement
   (ex. "nuitobscurité") en mots-clés séparés et recherchables. Déclenché
   depuis les réglages, avec confirmation en deux temps côté UI. */
async function nettoieEtFusionneDictionnairePerso(plugin){
  if (!(await trouveCheminDictionnairePerso(plugin))) {
    new Notice('Carnet du Poète : aucun dictionnaire-perso.json trouvé, rien à nettoyer.');
    return;
  }
  let chemin, data;
  try { ({ chemin, data } = await lisPersoPourEcriture(plugin)); }
  catch (e) { signaleLecturePersoImpossible(e); return; }
  let champsAvant = 0, champsApres = 0, raresAvant = 0, raresApres = 0, synoAvant = 0, synoApres = 0;

  // --- champs lexicaux : fusion par thème normalisé ---
  if (Array.isArray(data.champsLexicaux)) {
    champsAvant = data.champsLexicaux.length;
    const fusion = [];
    data.champsLexicaux.forEach(c => {
      if (!c || !c.theme) return;
      const themeNorm = normaliseMot(c.theme);
      let cible = fusion.find(f => normaliseMot(f.theme) === themeNorm);
      if (!cible) {
        cible = { theme: c.theme, motsClefs: [], mots: [] };
        fusion.push(cible);
      }
      const clefsSource = Array.isArray(c.motsClefs) ? c.motsClefs : [];
      // remplace un motClef "collé" auto-généré (égal au thème normalisé
      // en un seul bloc) par sa version proprement découpée, pour que les
      // fichiers écrits avant ce correctif redeviennent recherchables
      const clefsCorrigees = clefsSource.flatMap(k => (k === themeNorm ? motsClefsDepuisTheme(c.theme) : [k]));
      cible.motsClefs = [...new Set([...cible.motsClefs, ...clefsCorrigees])];
      (Array.isArray(c.mots) ? c.mots : []).forEach(m => {
        if (!m || !m.mot) return;
        const mNorm = normaliseMot(m.mot);
        const existante = cible.mots.find(e => e && normaliseMot(e.mot) === mNorm);
        if (existante) {
          if (!existante.note && m.note) existante.note = m.note;
        } else {
          cible.mots.push({ mot: m.mot, note: m.note || '' });
        }
      });
    });
    data.champsLexicaux = fusion;
    champsApres = fusion.length;
  }

  // --- mots rares : fusion par mot normalisé ---
  if (Array.isArray(data.motsRares)) {
    raresAvant = data.motsRares.length;
    const fusion = [];
    // Ne perd jamais une note au profit d'une autre : la première note
    // rencontrée n'est plus "gagnante" par défaut (c'était le cas avant,
    // et pouvait écraser silencieusement une note plus riche venue d'un
    // import ultérieur, ex. Méral). Si l'une contient déjà l'autre, on
    // garde la plus complète ; sinon, contenu vraiment différent des deux
    // côtés, on agrège au lieu de choisir arbitrairement.
    const fusionneNotes = (a, b) => {
      const notA = (a || '').trim(), notB = (b || '').trim();
      if (!notA) return notB;
      if (!notB) return notA;
      if (notA === notB || notA.includes(notB)) return notA;
      if (notB.includes(notA)) return notB;
      return notA + '\n\n---\n\n' + notB;
    };
    data.motsRares.forEach(m => {
      if (!m || !m.mot) return;
      const mNorm = normaliseMot(m.mot);
      let cible = fusion.find(f => normaliseMot(f.mot) === mNorm);
      if (!cible) {
        cible = { mot: m.mot, note: m.note || '', tags: Array.isArray(m.tags) ? [...m.tags] : [] };
        fusion.push(cible);
      } else {
        cible.note = fusionneNotes(cible.note, m.note);
        cible.tags = [...new Set([...(cible.tags || []), ...(Array.isArray(m.tags) ? m.tags : [])])];
      }
    });
    fusion.forEach(c => { if (c.tags.length === 0) delete c.tags; });
    data.motsRares = fusion;
    raresApres = fusion.length;
  }

  // --- synonymes/antonymes : fusion par mot normalisé ---
  if (Array.isArray(data.synonymes)) {
    synoAvant = data.synonymes.length;
    const fusion = [];
    data.synonymes.forEach(s => {
      if (!s || !s.mot) return;
      const mNorm = normaliseMot(s.mot);
      let cible = fusion.find(f => normaliseMot(f.mot) === mNorm);
      if (!cible) {
        cible = { mot: s.mot, synonymes: Array.isArray(s.synonymes) ? [...s.synonymes] : [], antonymes: Array.isArray(s.antonymes) ? [...s.antonymes] : [] };
        fusion.push(cible);
      } else {
        cible.synonymes = [...new Set([...cible.synonymes, ...(Array.isArray(s.synonymes) ? s.synonymes : [])])];
        cible.antonymes = [...new Set([...cible.antonymes, ...(Array.isArray(s.antonymes) ? s.antonymes : [])])];
      }
    });
    data.synonymes = fusion;
    synoApres = fusion.length;
  }

  try {
    await ecritPerso(plugin, chemin, data);
  } catch (e) {
    console.error('[Carnet du Poète] échec de l\'écriture après nettoyage', e);
    new Notice('Carnet du Poète : échec de l\'écriture du fichier nettoyé (voir la console).');
    return;
  }

  await chargeDictionnairePerso(plugin);

  const messages = [];
  if (champsAvant !== champsApres) messages.push(`${champsAvant - champsApres} champ(s) lexical(aux) fusionné(s) (${champsAvant} → ${champsApres})`);
  if (raresAvant !== raresApres) messages.push(`${raresAvant - raresApres} mot(s) rare(s) fusionné(s) (${raresAvant} → ${raresApres})`);
  if (synoAvant !== synoApres) messages.push(`${synoAvant - synoApres} entrée(s) de synonymes fusionnée(s) (${synoAvant} → ${synoApres})`);
  new Notice(messages.length > 0
    ? `Carnet du Poète : nettoyage terminé — ${messages.join(', ')}.`
    : 'Carnet du Poète : nettoyage terminé, aucun doublon trouvé.');
}

async function chargeDictionnairePerso(plugin, opts){
  const notifierAbsence = !!(opts && opts.notifierAbsence);
  // on repart toujours de la base pour ne jamais accumuler de doublons
  // si cette fonction est appelée plusieurs fois (rechargement manuel)
  FAMILLES.length = 0;
  FAMILLES.push(...FAMILLES_BASE);
  CHAMPS_LEXICAUX.length = 0;
  CHAMPS_LEXICAUX.push(...CHAMPS_LEXICAUX_BASE.map(c => ({
    theme: c.theme,
    motsClefs: [...c.motsClefs],
    mots: c.mots.map(m => ({ ...m }))
  })));
  SYNONYMES.length = 0;
  SYNONYMES.push(...SYNONYMES_BASE);
  MOTS_RARES.length = 0;
  MOTS_RARES.push(...MOTS_RARES_BASE);
  reconstruitIndexMotsRares();
  DICO_PHONETIQUE = null;
  CGRAM_MOT = null;
  STATS_DICO = null;
  DICO_PHONETIQUE_GROUPES = null;
  PHONETIQUE_MOT = null;
  SYNONYMES_PHONETIQUE = null;

  NOTES_BASE_PUBLIEE = new Map();

  try {
    const base = await chargeBase(plugin);
    if (base && Array.isArray(base.motsRares)) {
      base.motsRares.forEach(e => { if (e && e.mot) NOTES_BASE_PUBLIEE.set(normaliseMot(e.mot), e.note || ''); });
    }
    // Capturés AVANT toute fusion : fusionneBasePerso mutera `base` en
    // place (out.motsRares y grossit avec les entrées du perso), donc ces
    // deux nombres seraient faux s'ils étaient lus plus tard (voir STATS_DICO).
    const motsBaseAvantFusion = base ? clesGroupesPhonetiques(base).reduce((n, cle) => n + Object.keys(base[cle]).length, 0) : 0;
    const raresBaseAvantFusion = (base && Array.isArray(base.motsRares)) ? base.motsRares.length : 0;

    // Calque perso. S'il est illisible, on continue avec la base seule ;
    // les écritures, elles, refuseront de l'écraser (lisPersoPourEcriture).
    let perso = null;
    const lu = await trouveEtLisDictionnairePerso(plugin);
    if (lu) {
      try {
        perso = JSON.parse(lu.raw);
        if (!perso || typeof perso !== 'object' || Array.isArray(perso)) {
          new Notice('Carnet du Poète : dictionnaire-perso.json trouvé, mais son contenu n\'est pas un objet JSON valide.');
          perso = null;
        }
      } catch (parseErr) {
        console.error('[Carnet du Poète] dictionnaire-perso.json : JSON invalide', parseErr);
        new Notice('Carnet du Poète : dictionnaire-perso.json trouvé mais le JSON est invalide (voir la console pour le détail).');
      }
      if (perso && base && estAncienFormatComplet(perso)) {
        try {
          const migre = await migreAncienDictionnaire(plugin, lu.chemin, lu.raw, perso, base);
          perso = migre.perso;
          lu.chemin = migre.chemin; // pour STATS_DICO plus bas : refléter le nouvel emplacement, pas l'ancien
        } catch (e) {
          console.error('[Carnet du Poète] migration du dictionnaire personnel impossible', e);
          new Notice('Carnet du Poète : migration du dictionnaire personnel impossible — ancien fichier utilisé tel quel (voir la console).');
        }
      }
    }

    if (!base && !perso) {
      console.log('[Carnet du Poète] ni base ni dictionnaire-perso.json disponibles.');
      if (notifierAbsence) {
        new Notice('Carnet du Poète : aucun dictionnaire disponible — base non téléchargée et aucun dictionnaire-perso.json trouvé (voir la console pour le détail).', 8000);
      }
      return;
    }

    const data = fusionneBasePerso(base, perso);

    // Champs lexicaux personnalisés (indépendant du format familles/phonétique
    // ci-dessous : peut cohabiter avec l'un ou l'autre dans le même fichier).
    // Si un champ du même nom existe déjà (intégré ou déjà fusionné), on
    // l'enrichit au lieu de pousser un doublon distinct — sinon la
    // recherche ne renvoie que la première correspondance trouvée et le
    // doublon personnel reste invisible.
    let champsCount = 0;
    if (Array.isArray(data.champsLexicaux)) {
      data.champsLexicaux.forEach(c => {
        if (c && c.theme && Array.isArray(c.motsClefs) && Array.isArray(c.mots)) {
          const themeNorm = normaliseMot(c.theme);
          const existant = CHAMPS_LEXICAUX.find(ch => normaliseMot(ch.theme) === themeNorm);
          if (existant) {
            existant.motsClefs = [...new Set([...existant.motsClefs, ...c.motsClefs])];
            c.mots.forEach(m => {
              if (!m || !m.mot) return;
              const mNorm = normaliseMot(m.mot);
              const dejaPresent = existant.mots.find(e => e && normaliseMot(e.mot) === mNorm);
              if (dejaPresent) {
                if (!dejaPresent.note && m.note) dejaPresent.note = m.note;
              } else {
                existant.mots.push({ mot: m.mot, note: m.note || '' });
              }
            });
          } else {
            CHAMPS_LEXICAUX.push({ theme: c.theme, motsClefs: [...c.motsClefs], mots: c.mots.map(m => ({ ...m })) });
          }
          champsCount++;
        }
      });
      if (champsCount > 0) {
        new Notice(`Carnet du Poète : ${champsCount} champ(s) lexical(aux) personnalisé(s) chargé(s).`);
      }
    }

    // Synonymes/antonymes personnalisés (idem, indépendant)
    let synoCount = 0;
    if (Array.isArray(data.synonymes)) {
      data.synonymes.forEach(s => {
        if (s && s.mot && (Array.isArray(s.synonymes) || Array.isArray(s.antonymes))) {
          SYNONYMES.push({ mot: s.mot, synonymes: s.synonymes || [], antonymes: s.antonymes || [] });
          synoCount++;
        }
      });
      if (synoCount > 0) {
        new Notice(`Carnet du Poète : ${synoCount} entrée(s) de synonymes/antonymes personnalisée(s) chargée(s).`);
      }
    }

    // Mots rares personnalisés (idem, indépendant) — format : { "motsRares": [{"mot":"...", "note":"..."}] }
    let raresCount = 0;
    if (Array.isArray(data.motsRares)) {
      data.motsRares.forEach(m => {
        if (m && m.mot) {
          MOTS_RARES.push({ mot: m.mot, note: m.note || '', tags: Array.isArray(m.tags) ? m.tags : [] });
          raresCount++;
        }
      });
      if (raresCount > 0) {
        new Notice(`Carnet du Poète : ${raresCount} mot(s) rare(s) chargé(s) (base + personnels).`);
      }
      reconstruitIndexMotsRares();
    }

    // Format A : familles personnalisées
    if (Array.isArray(data.familles)) {
      let count = 0;
      data.familles.forEach(f => {
        if (f && f.son && Array.isArray(f.terms) && Array.isArray(f.mots)) {
          FAMILLES.push(f);
          count++;
        }
      });
      if (count > 0) {
        new Notice(`Carnet du Poète : ${count} famille(s) personnalisée(s) chargée(s) depuis dictionnaire-perso.json.`);
      } else if (champsCount === 0 && synoCount === 0 && raresCount === 0) {
        new Notice('Carnet du Poète : dictionnaire-perso.json trouvé, mais aucune famille valide dedans (il manque "son", "terms" ou "mots" quelque part).');
      }
      if (clesGroupesPhonetiques(data).length === 0) return;
    }

    // Format B : dictionnaire phonétique complet (objet plat clé -> mots[])
    // Format C : même principe, mais objet plat clé -> { mot -> {phonetique,
    // synonymes, antonymes} } — donne en plus la transcription phonétique
    // complète de chaque mot et ses synonymes/antonymes déjà résolus.
    // (on exclut les clés déjà traitées ci-dessus pour ne pas les confondre
    // avec des groupes de rimes)
    const cles = Object.keys(data).filter(k => !CLES_HORS_GROUPES.includes(k));
    const clesFormatB = cles.filter(k => Array.isArray(data[k]));
    const clesFormatC = cles.filter(k => !Array.isArray(data[k]) && data[k] && typeof data[k] === 'object');
    if (clesFormatB.length === 0 && clesFormatC.length === 0) {
      if (champsCount === 0 && synoCount === 0 && raresCount === 0) {
        new Notice('Carnet du Poète : dictionnaire-perso.json trouvé, mais son format n\'est reconnu ni comme familles personnalisées, ni comme champs lexicaux, ni comme synonymes, ni comme dictionnaire phonétique (objet clé → liste de mots, ou clé → mot → détails).');
      }
      return;
    }

    const index = new Map();
    const groupesPhonetiquesUniquement = {};
    let totalMots = 0;

    // Format B : chaque clé -> simple liste de mots
    clesFormatB.forEach(cle => {
      groupesPhonetiquesUniquement[cle] = data[cle];
      data[cle].forEach(mot => {
        if (typeof mot === 'string' && mot.trim()) {
          index.set(mot.trim().toLowerCase(), cle);
          totalMots++;
        }
      });
    });

    // Format C : chaque clé -> { mot -> {phonetique, synonymes, antonymes} }
    const phonMap = new Map();
    const synoMap = new Map();
    const cgramMap = new Map();
    let totalMotsPhon = 0;
    let totalMotsAvecSynonymes = 0;

    const normaliseListeSynAnto = (liste) => (Array.isArray(liste) ? liste : [])
      .map(item => {
        if (typeof item === 'string') return { mot: item, phonetique: null };
        if (item && typeof item === 'object' && item.mot) return { mot: item.mot, phonetique: item.phonetique || null };
        return null;
      })
      .filter(Boolean);

    clesFormatC.forEach(cle => {
      const mots = Object.keys(data[cle]);
      groupesPhonetiquesUniquement[cle] = mots; // pour rester compatible avec chercheRimes (Format B)
      mots.forEach(mot => {
        const infos = data[cle][mot];
        if (!infos || typeof infos !== 'object') return;
        const motNorm = mot.trim().toLowerCase();
        if (!motNorm) return;

        index.set(motNorm, cle);
        totalMots++;

        if (typeof infos.phonetique === 'string' && infos.phonetique) {
          phonMap.set(motNorm, infos.phonetique);
          totalMotsPhon++;
        }

        const syn = normaliseListeSynAnto(infos.synonymes);
        const anto = normaliseListeSynAnto(infos.antonymes);
        if (syn.length > 0 || anto.length > 0) {
          synoMap.set(motNorm, { synonymes: syn, antonymes: anto });
          totalMotsAvecSynonymes++;
        }

        if (typeof infos.cgram === 'string' && infos.cgram) cgramMap.set(motNorm, infos.cgram.split(','));
      });
    });

    DICO_PHONETIQUE = index;
    DICO_PHONETIQUE_GROUPES = groupesPhonetiquesUniquement;
    if (phonMap.size > 0) PHONETIQUE_MOT = phonMap;
    if (synoMap.size > 0) SYNONYMES_PHONETIQUE = synoMap;
    if (cgramMap.size > 0) CGRAM_MOT = cgramMap;

    // Stats pour l'onglet Réglages : rien de nouveau à calculer, seulement
    // mémoriser ce qui l'est déjà ici (base capturée AVANT fusion, voir
    // motsBaseAvantFusion/raresBaseAvantFusion plus haut).
    const pluginData = await plugin.loadData();
    STATS_DICO = {
      base: base ? { version: (pluginData && pluginData.versionBase) || VERSION_BASE, mots: motsBaseAvantFusion, motsRares: raresBaseAvantFusion } : null,
      perso: perso ? {
        chemin: lu ? lu.chemin : null,
        octets: new TextEncoder().encode(JSON.stringify(perso)).length,
        motsRares: Array.isArray(perso.motsRares) ? perso.motsRares.length : 0,
        champsLexicaux: Array.isArray(perso.champsLexicaux) ? perso.champsLexicaux.length : 0,
        synonymes: Array.isArray(perso.synonymes) ? perso.synonymes.length : 0,
        motsPhonetiques: clesGroupesPhonetiques(perso).reduce((n, cle) => n + Object.keys(perso[cle]).length, 0)
      } : null
    };

    const nbGroupes = clesFormatB.length + clesFormatC.length;
    let messageCharge = `Carnet du Poète : dictionnaire de rimes complet chargé — ${nbGroupes} groupes phonétiques, ${totalMots} mots`;
    if (totalMotsPhon > 0) messageCharge += `, ${totalMotsPhon} avec transcription phonétique complète`;
    if (totalMotsAvecSynonymes > 0) messageCharge += `, ${totalMotsAvecSynonymes} avec synonymes/antonymes`;
    messageCharge += '.';
    new Notice(messageCharge);
    console.log(`[Carnet du Poète] dictionnaire phonétique chargé : ${nbGroupes} groupes, ${totalMots} mots ` +
      `(${totalMotsPhon} avec phonétique complète, ${totalMotsAvecSynonymes} avec synonymes/antonymes).`);
  } catch (e) {
    console.error('[Carnet du Poète] erreur de chargement du dictionnaire personnel', e);
    new Notice('Carnet du Poète : erreur lors du chargement du dictionnaire personnel (voir la console : Ctrl/Cmd+Maj+I).');
  }
}

/* Recherche unifiée : dictionnaire phonétique complet en priorité
   (correspondance exacte), puis repli sur les familles heuristiques
   orthographiques si le mot n'y figure pas. */
/* Découpe la partie finale d'un mot en unités "consonantiques" grossières :
   une lettre doublée (ss, ll, tt...) ou un digramme courant représentant
   un seul son (ch, ph, gn, qu, gu) compte pour UNE unité, pas deux —
   sinon on surcompte des lettres qui ne correspondent à aucun son
   supplémentaire à l'oreille. */
const DIGRAMMES_UN_SON = ['ch', 'ph', 'gn', 'qu', 'gu'];
function decoupeConsonnesSons(cons){
  const out = [];
  let i = 0;
  while (i < cons.length) {
    if (i + 1 < cons.length && cons[i] === cons[i + 1]) { out.push(cons[i]); i += 2; continue; }
    if (i + 1 < cons.length && DIGRAMMES_UN_SON.includes(cons.slice(i, i + 2))) { out.push(cons.slice(i, i + 2)); i += 2; continue; }
    out.push(cons[i]); i += 1;
  }
  return out;
}

/* Découpe un mot en une suite d'unités phonétiques grossières (noyau
   vocalique, consonnes attenantes) en s'appuyant sur trouveGroupesAvecPositions
   (déjà utilisé par cleFinApprox) plutôt que sur les lettres brutes. Sert
   de base à estimeSonsCommuns pour éviter qu'une lettre qui matche par
   coïncidence orthographique (ex. le "i" de "-ssion" vs "-bion") soit
   comptée comme un son à part entière alors qu'elle ne porte, à l'oreille,
   aucun son distinct de la voyelle nasale qui l'englobe. Capture aussi
   les consonnes d'attaque du tout premier groupe vocalique du mot (ex.
   le "b" de "beau"), sans quoi un mot monosyllabique perdait toujours
   sa consonne d'appui dans la comparaison. */
function segmentsPhonetiques(mot){
  const w = preparerMotRime(mot);
  if (!w) return [];

  const groupes = trouveGroupesAvecPositions(w);
  if (groupes.length === 0) return w.split('');

  // Ancre sur la dernière voyelle réellement prononcée, comme cleFinApprox,
  // pour pouvoir appliquer à cette partie EXACTEMENT les mêmes équivalences
  // phonétiques (ê/è/ei/e, i/y semi-consonne, s→z, lettres doublées) —
  // sans quoi un mot pouvait être reconnu comme rimant (via cleFinApprox)
  // tout en étant sous-évalué en richesse ici, faute des mêmes équivalences
  // (ex. "airs"/"concerts" ressortait "pauvre" alors qu'ils riment déjà).
  let idxAncre = groupes.length - 1;
  const dernier = groupes[idxAncre];
  if (dernier.texte === 'e' && dernier.fin === w.length && idxAncre > 0) idxAncre--;

  const queue = stripConsonneMuetteFinale(normaliseSonsFinal(w.slice(groupes[idxAncre].debut)));
  const groupesQueue = trouveGroupesAvecPositions(queue);
  const segments = [];
  let posQueue = queue.length;
  for (let i = groupesQueue.length - 1; i >= 0; i--) {
    const g = groupesQueue[i];
    const consApres = queue.slice(g.fin, posQueue);
    if (consApres) segments.unshift(...decoupeConsonnesSons(consApres));
    segments.unshift(g.texte);
    posQueue = g.debut;
  }
  const consInitialesQueue = queue.slice(0, posQueue);
  if (consInitialesQueue) segments.unshift(...decoupeConsonnesSons(consInitialesQueue));

  // Syllabes précédant l'ancre (pour pouvoir compter au-delà de la finale,
  // utile aux rimes très riches) : méthode brute, sans ces équivalences —
  // elles ne s'appliquent qu'à la voyelle réellement porteuse de la rime.
  let pos = groupes[idxAncre].debut;
  for (let i = idxAncre - 1; i >= 0; i--) {
    const g = groupes[i];
    const consApres = w.slice(g.fin, pos);
    if (consApres) segments.unshift(...decoupeConsonnesSons(consApres));
    segments.unshift(g.texte);
    pos = g.debut;
  }
  const consInitiales = w.slice(0, pos);
  if (consInitiales) segments.unshift(...decoupeConsonnesSons(consInitiales));
  return segments;
}

/* Estimation orthographique du nombre de "sons" partagés en fin de mot
   (approximation : s'appuie sur un découpage en unités phonétiques
   grossières, pas une vraie transcription phonétique IPA). Sert de base
   au classement pauvre (1 son) / suffisante (2 sons) / riche (3+ sons). */
function estimeSonsCommuns(motA, motB){
  const a = segmentsPhonetiques(motA);
  const b = segmentsPhonetiques(motB);
  let i = a.length - 1, j = b.length - 1, n = 0;
  while (i >= 0 && j >= 0 && a[i] === b[j]) { n++; i--; j--; }
  return n;
}

/* Attaques de syllabe valides en français pour un groupe de 2 consonnes :
   une obstruante suivie d'une liquide (l/r). Un mot français ne commence
   jamais par un autre groupe de 2 consonnes (pas de "ns-", "lt-", "rb-"...). */
const ATTAQUES_VALIDES = ['pl','bl','cl','gl','fl','pr','br','tr','dr','cr','gr','fr','vr'];

/* Détermine, pour un groupe de consonnes entre deux voyelles, combien de
   caractères (en partant de la fin) rejoignent l'attaque de la syllabe
   SUIVANTE — le reste retombe en coda de la syllabe précédente. Règle
   d'attaque maximale contrainte par les attaques valides du français :
   - 0 ou 1 consonne : tout part dans l'attaque suivante (V.CV)
   - lettre doublée (ss, mm, tt...) : un seul son, tout part dans l'attaque
     suivante (pas de coupure au milieu d'un seul son)
   - digramme à un son (ch, ph, gn, qu, gu) : idem, reste groupé
   - obstruante+liquide (pl, tr, vr...) : ce groupe de 2 forme l'attaque
     suivante, le reste (s'il y en a) reste en coda de la précédente
   - sinon : seule la toute dernière consonne rejoint l'attaque suivante
     (ex. "ns" dans "in-sul-tant" : le "n" reste dans la syllabe d'avant). */
function pointDeCoupure(cons){
  if (cons.length <= 1) return cons.length;
  const derniers2 = cons.slice(-2);
  if (derniers2[0] === derniers2[1]) return 2;
  if (DIGRAMMES_UN_SON.includes(derniers2)) return 2;
  if (ATTAQUES_VALIDES.includes(derniers2)) return 2;
  return 1;
}

/* Reconnaît une nasale dont la graphie du noyau vocalique varie selon la
   consonne qui suit immédiatement (ombre → "om" nasal ; démente/envoûtante
   → "en"/"an" équivalents), pour que deux mots utilisant des graphies
   différentes du même son nasal soient reconnus comme syllabiquement
   identiques. Retourne le noyau normalisé et le nombre de caractères
   "consommés" dans la queue (0 ou 1 : la consonne nasale elle-même). */
function normaliseNasaleSyllabe(noyau, premierCarQueue){
  const paire = noyau + (premierCarQueue || '');
  if (paire === 'ein' || paire === 'ain' || paire === 'yn') return { noyau: 'in', consomme: 1 };
  if (paire === 'en') return { noyau: 'an', consomme: 1 };
  if (paire === 'om') return { noyau: 'on', consomme: 1 };
  return { noyau, consomme: 0 };
}

/* Écrase une lettre doublée en une seule occurrence (ss, rr, ll... ne
   représentent qu'un seul son à l'oreille) : appliqué UNIQUEMENT après la
   coupure syllabique ci-dessus (qui a besoin de la longueur brute pour
   décider où couper), jamais avant, pour ne pas fausser pointDeCoupure. */
function normaliseGroupesConsonnes(str){
  return (str || '').replace(/(.)\1+/g, '$1');
}

/* Découpe un mot en syllabes { onset, noyau, coda } (attaque / voyelle /
   coda), utilisé UNIQUEMENT pour distinguer riche / très riche / léonine
   une fois qu'on sait déjà (via estimeSonsCommuns) qu'on est au moins à
   "riche". Chaque groupe de consonnes entre deux voyelles est réparti via
   pointDeCoupure ci-dessus plutôt que d'être systématiquement rattaché à
   la syllabe suivante — ce qui permet de distinguer p. ex. "sultans" en
   sul-tans plutôt que su-ltans. */
function decoupeSyllabesRime(mot){
  let w = preparerMotRime(mot);
  if (!w) return [];
  let groupes = trouveGroupesAvecPositions(w);
  if (groupes.length > 1) {
    const dernier = groupes[groupes.length - 1];
    if (dernier.texte === 'e' && dernier.fin === w.length) {
      w = w.slice(0, -1); // e muet final : pas une syllabe à part pour la rime
      groupes = trouveGroupesAvecPositions(w);
    }
  }
  // Consonne finale muette (d/t/x) : retirée seulement maintenant, une fois
  // l'ancrage de la vraie syllabe finale déjà décidé ci-dessus (voir
  // preparerMotRime et stripConsonneMuetteFinale). Ce retrait ne modifie
  // aucune position de groupe déjà calculée : il ne touche qu'un caractère
  // situé après la fin du dernier groupe de voyelles.
  if (/[dtx]$/.test(w)) w = w.slice(0, -1);
  if (groupes.length === 0) return [{ onset: w, noyau: '', coda: '' }];

  const nasal = groupes.map(g => normaliseNasaleSyllabe(g.texte, w[g.fin]));
  const n = groupes.length;

  // Groupe de consonnes brut entre chaque paire de voyelles consécutives
  // (nasale déjà consommée exclue), et sa coupure onset-suivant/coda-précédent.
  const clusters = [];
  for (let i = 0; i < n - 1; i++) {
    const debut = groupes[i].fin + nasal[i].consomme;
    clusters.push(w.slice(debut, groupes[i + 1].debut));
  }
  const coupures = clusters.map(pointDeCoupure);

  const queueFinale = w.slice(groupes[n - 1].fin + nasal[n - 1].consomme);

  const syllabes = [];
  for (let i = 0; i < n; i++) {
    const onset = i === 0
      ? w.slice(0, groupes[0].debut)
      : clusters[i - 1].slice(clusters[i - 1].length - coupures[i - 1]);
    const coda = i === n - 1
      ? queueFinale
      : clusters[i].slice(0, clusters[i].length - coupures[i]);
    syllabes.push({ onset: normaliseGroupesConsonnes(onset), noyau: nasal[i].noyau, coda: normaliseGroupesConsonnes(coda) });
  }
  return syllabes;
}

