const { Plugin, ItemView, Modal, Notice, requestUrl, PluginSettingTab, Setting } = require('obsidian');

const VIEW_TYPE = 'carnet-du-poete-view';

/* =========================================================
   MOTEUR SYLLABIQUE FRANÇAIS
   - règle du e caduc (compté seulement si non final de vers
     et suivi d'un mot commençant par une consonne)
   - détection des hiatus (diérèse possible) vs diphtongues
     fixes (toujours en synérèse, 1 syllabe)
   ========================================================= */

const VOYELLES = "aeiouyàâäéèêëîïôöùûüÿœ";
const DIPHTONGUES_FIXES = ['ai','ei','au','eau','eu','œu','oeu','ou','oi','oy','ay','ée'];

function estVoyelle(ch){ return !!ch && VOYELLES.includes(ch.toLowerCase()); }

function nettoieMot(mot){
  // normalise l'apostrophe typographique (’) et les guillemets simples
  // courbes vers l'apostrophe droite, sinon "l'ombre" perdait son
  // apostrophe et devenait "lombre"
  return (mot || '').toLowerCase().replace(/[’‘‛]/g, "'").replace(/[^a-zàâäéèêëîïôöùûüÿœç']/gi, '');
}

function trouveGroupesAvecPositions(w){
  // Cas particulier du français : un "y" entre deux voyelles (ra-yon,
  // cra-yon, vo-yage, essa-yer...) se comporte comme un double "i" et
  // sépare deux syllabes au lieu de fusionner avec elles. Un "y" qui
  // n'est PAS entre deux voyelles (yeux, pays, cycle...) reste une
  // voyelle normale.
  // Autre cas particulier : le "u" des digraphes "qu"/"gu" (que, qui,
  // quoi, vague, guerre...) ne forme jamais sa propre syllabe — il est
  // muet ou une semi-consonne — donc on ne le compte pas comme une
  // voyelle à cet endroit précis. Pour "gu" spécifiquement, la lecture
  // du "e" final qui en résulte (ex. "vague") reste ambiguë selon le
  // contexte : elle est traitée comme une variante possible (voir
  // compteSyllabesMot) plutôt que tranchée silencieusement.
  const groupes = [];
  let debut = -1;
  for (let i = 0; i <= w.length; i++){
    const ch = w[i];
    let estVoyelleIci = false;
    if (ch !== undefined) {
      if (ch === 'y') {
        const avantVoyelle = i > 0 && estVoyelle(w[i - 1]);
        const apresVoyelle = i < w.length - 1 && estVoyelle(w[i + 1]);
        estVoyelleIci = !(avantVoyelle && apresVoyelle);
      } else if (ch === 'u' && i > 0 && (w[i - 1] === 'q' || w[i - 1] === 'g')) {
        estVoyelleIci = false;
      } else {
        estVoyelleIci = estVoyelle(ch);
      }
    }
    if (estVoyelleIci) {
      if (debut === -1) debut = i;
    } else if (debut !== -1) {
      groupes.push({ texte: w.slice(debut, i), debut, fin: i });
      debut = -1;
    }
  }
  return groupes;
}

function trouveGroupesVoyelles(w){
  return trouveGroupesAvecPositions(w).map(g => g.texte);
}

function detecteHiatus(w, groupes){
  let count = 0;
  groupes.forEach((g, idx) => {
    let check = g;
    const estDernier = idx === groupes.length - 1;
    if (estDernier && g.endsWith('e') && w.endsWith(g)) {
      check = g.slice(0, -1); // on retire le e muet final pour juger le hiatus
    }
    if (check.length >= 2 && DIPHTONGUES_FIXES.indexOf(check) === -1) {
      count++;
    }
  });
  return count;
}

/* PARTIE 1 — vérification phonétique (prioritaire, si le mot est dans le
   dictionnaire complet) : le "-ent" est prononcé si la transcription se
   termine par une voyelle (ex. président → pRezid@, @ = voyelle), muet si
   elle se termine par une consonne (ex. pleurent → pl9R, R = consonne).
   Exact, aucune supposition. Renvoie true/false si le mot est connu,
   null sinon (mot absent du dictionnaire — voir PARTIE 3). Définie ici
   mais s'appuie sur phonetiqueMot/VOYELLES_PHON, déclarés plus bas dans
   ce fichier (sans souci : ni l'un ni l'autre n'est évalué avant qu'un
   appel réel n'ait lieu, bien après le chargement complet du module). */
function finMuetteEnEntPhonetique(mot){
  const phon = typeof phonetiqueMot === 'function' ? phonetiqueMot(mot) : null;
  if (!phon) return null;
  const dernier = phon[phon.length - 1];
  return !VOYELLES_PHON.has(dernier);
}

/* PARTIE 2 — repli heuristique (utilisé uniquement quand le mot est
   absent du dictionnaire phonétique, y compris pour quelqu'un qui
   n'en a pas du tout configuré) : mots courants en "-ent" où ce n'est
   PAS la terminaison verbale muette de 3e personne du pluriel (ils/elles
   parl-ent, comme "pleurent"), mais un nom/adjectif/adverbe où le son
   [ɑ̃] est réellement prononcé (récent, argent, moment...) — même
   principe que les exceptions -er/-ez pour les rimes plus bas dans ce
   fichier : liste non exhaustive, à compléter au fil des cas rencontrés.
   Ne concerne que la forme se terminant EXACTEMENT par "ent" — un
   pluriel en "-ents" ne peut de toute façon jamais être une forme
   verbale, donc ne pose pas cette ambiguïté. */
const EXCEPTIONS_ENT_PRONONCE = new Set([
  'lent', 'cent', 'gent', 'dent', 'vent', 'absent', 'présent', 'décent', 'indécent',
  'récent', 'urgent', 'ardent', 'prudent', 'imprudent', 'innocent', 'excellent',
  'intelligent', 'conséquent', 'inconséquent', 'fréquent', 'infréquent', 'éloquent',
  'éminent', 'imminent', 'permanent', 'patient', 'impatient', 'client', 'agent',
  'régent', 'sergent', 'moment', 'élément', 'document', 'instrument', 'gouvernement',
  'département', 'appartement', 'événement', 'mouvement', 'changement', 'jugement',
  'sentiment', 'testament', 'firmament', 'tourment', 'ciment', 'aliment', 'piment',
  'froment', 'serment', 'sarment', 'président', 'différent', 'indifférent',
  'équivalent', 'violent', 'réticent', 'latent', 'virulent', 'opulent', 'indolent',
  'somnolent', 'truculent', 'féculent', 'turbulent', 'pertinent', 'impertinent',
  'continent', 'incontinent', 'contingent', 'tangent', 'diligent', 'négligent',
  'intransigent', 'indigent', 'talent', 'accent', 'comment', 'souvent', 'orient',
]);

/* PARTIE 3 — point d'entrée unique, utilisé par estMuetFinal/
   syllabifieMot/compteSyllabesMot : consulte le dictionnaire phonétique
   en priorité (exact), et ne retombe sur la liste d'exceptions ci-dessus
   que si le mot en est absent — garde-fou qui reste utile même pour
   quelqu'un qui teste le plugin sans avoir configuré de dictionnaire
   personnel du tout. */
function finMuetteEnEnt(w){
  if (!w.endsWith('ent')) return false;
  const viaPhon = finMuetteEnEntPhonetique(w);
  if (viaPhon !== null) return viaPhon;
  return !EXCEPTIONS_ENT_PRONONCE.has(w);
}

function estMuetFinal(w){
  let base = w;
  if (base.endsWith('s') && !base.endsWith('ss') && base.length > 2) base = base.slice(0, -1);
  // Deux graphies pour le même "e" caduc : "e" simple (rose, chante) ou
  // "-ent" verbal (pleurent, chantent) — sans cette seconde branche, un
  // vers finissant par un verbe conjugué à la 3e personne du pluriel
  // comptait toujours une syllabe de trop (le muet n'étant reconnu que
  // sous sa forme "e" simple).
  return base.endsWith('e') || finMuetteEnEnt(base);
}

/* Découpage des consonnes entre deux noyaux vocaliques en (coda de la
   syllabe précédente) + (attaque de la syllabe suivante). Les groupes
   consonne+liquide usuels (bl, cl, fl, gl, pl, br, cr, dr, fr, gr, pr,
   tr, vr) restent groupés comme attaque de la syllabe suivante plutôt
   que d'être coupés en deux (ex. "re-gret", pas "reg-ret"). */
const CLUSTERS_LIQUIDES = new Set([
  'bl','cl','fl','gl','pl','br','cr','dr','fr','gr','pr','tr','vr',
  'gn','ch','ph','th', // digraphes représentant un seul son, jamais coupés
  'qu','gu' // le u y est toujours muet, toujours avec la voyelle qui suit
]);
function decoupeConsonnes(cluster){
  if (cluster.length === 0) return ['', ''];
  if (cluster.length === 1) return ['', cluster];
  const deuxDerniers = cluster.slice(-2).toLowerCase();
  if (CLUSTERS_LIQUIDES.has(deuxDerniers)) {
    return [cluster.slice(0, -2), cluster.slice(-2)];
  }
  return [cluster.slice(0, -1), cluster.slice(-1)];
}

/* Découpe un mot en syllabes affichables (approximation graphique des
   règles de syllabation du français). diereseIndices : ensemble
   d'indices de groupes vocaliques à scinder en deux syllabes plutôt
   qu'à lire en synérèse (pour la variante "avec diérèse"). */
function syllabifieMot(motBrut, finalEPrononce, diereseIndices){
  diereseIndices = diereseIndices || new Set();
  const w = nettoieMot(motBrut);
  if (!w) return [];
  if (MOTS_ES_TOUJOURS_PLEIN.has(w)) return [w];
  const groupes = trouveGroupesAvecPositions(w);
  if (groupes.length === 0) return [w];

  const syllabes = [];
  let prefixe = w.slice(0, groupes[0].debut);

  for (let i = 0; i < groupes.length; i++){
    const g = groupes[i];
    const estDernierGroupe = i === groupes.length - 1;
    const finDeMotAvecS = w.endsWith('s') && !w.endsWith('ss') && g.fin === w.length - 1;
    const finDeMotSansS = g.fin === w.length;
    // "-ent" verbal (pleurent, chantent...) : le "e" n'est pas la toute
    // dernière lettre (il reste "nt" après), donc ni finDeMotAvecS ni
    // finDeMotSansS ne le détectaient — troisième cas de figure explicite.
    const finDeMotEnt = g.fin === w.length - 2 && finMuetteEnEnt(w) && !finalEPrononce;
    const estMuetADroper = estDernierGroupe && g.texte === 'e' && estMuetFinal(w)
      && !finalEPrononce && (finDeMotAvecS || finDeMotSansS || finDeMotEnt);

    if (diereseIndices.has(i) && g.texte.length >= 2) {
      const partie1 = g.texte.slice(0, 1);
      const partie2 = g.texte.slice(1);
      syllabes.push(prefixe + partie1);
      syllabes.push(partie2);
    } else if (estMuetADroper) {
      // Ce qui suit le "e" muet (rien, "s" pluriel, ou "nt" verbal) rejoint
      // la syllabe précédente plutôt que de former sa propre syllabe.
      const queueFinale = w.slice(g.fin);
      if (syllabes.length > 0) {
        syllabes[syllabes.length - 1] += prefixe + g.texte + queueFinale;
      } else {
        syllabes.push(prefixe + g.texte + queueFinale);
      }
    } else {
      syllabes.push(prefixe + g.texte);
    }
    prefixe = '';

    if (!estDernierGroupe) {
      const cluster = w.slice(g.fin, groupes[i + 1].debut);
      const [coda, attaque] = decoupeConsonnes(cluster);
      if (syllabes.length > 0) syllabes[syllabes.length - 1] += coda;
      prefixe = attaque;
    } else if (!estMuetADroper) {
      syllabes[syllabes.length - 1] += w.slice(g.fin);
    }
  }
  return syllabes.filter(s => s.length > 0);
}

// Retourne {min, max, hiatus} pour un mot isolé.
// finalEPrononce: le e caduc final doit-il être compté (mot suivi d'une
// consonne, pas en fin de vers) ?
// Déterminants/pronoms qui se terminent en -es mais se prononcent avec un
// é fermé plein, jamais un e muet élidable (contrairement à "se", "que"...)
// — sans cette exception, "ses"/"mes" etc. étaient parfois comptés pour 0
// syllabe, comme s'il s'agissait du e caduc du pronom réfléchi "se".
const MOTS_ES_TOUJOURS_PLEIN = new Set(['les', 'ces', 'des', 'mes', 'tes', 'ses']);

function compteSyllabesMot(motBrut, finalEPrononce){
  let w = nettoieMot(motBrut);
  if (!w) return { min: 0, max: 0, hiatus: false };
  if (MOTS_ES_TOUJOURS_PLEIN.has(w)) return { min: 1, max: 1, hiatus: false };
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 2) {
    w = w.slice(0, -1);
  }
  const groupes = trouveGroupesVoyelles(w);
  let compte = groupes.length;

  if (groupes.length > 0) {
    const dernier = groupes[groupes.length - 1];
    const idxDernier = w.lastIndexOf(dernier);
    // un groupe "e" isolé ne peut être atteint que s'il n'est pas fusionné
    // avec une voyelle précédente (sinon le regroupement l'aurait inclus
    // dans un groupe plus long) — donc dès qu'il y a quelque chose avant
    // lui, ce quelque chose agit forcément comme une consonne ici (que ce
    // soit une vraie consonne, ou un "u" muet de qu/gu).
    const precedeParConsonne = idxDernier > 0;
    // le e n'est un "e caduc" muet que s'il est la toute dernière lettre du
    // mot (ex. "rose", "chante"), ou fait partie d'un "-ent" verbal muet
    // (ex. "pleurent" — voir finMuetteEnEnt) — pas quand il est suivi de
    // m/n formant une voyelle nasale suivie d'une consonne dans un mot qui
    // n'est ni l'un ni l'autre cas (ex. "temps", "m'attend").
    const finMuetteGraphie = w.endsWith('e') || finMuetteEnEnt(w);
    if (dernier === 'e' && precedeParConsonne && finMuetteGraphie && !finalEPrononce) {
      compte -= 1;
    }
  }
  compte = Math.max(compte, 0);

  let hiatusCount = detecteHiatus(w, groupes);
  // Cas particulier ambigu : un mot en "-gue" (vague, guerre, digue...)
  // dont le e final est élidé — certains lecteurs (et certains outils de
  // référence, de façon incohérente) comptent malgré tout ce e comme une
  // syllabe prononcée. On l'expose comme une variante possible plutôt que
  // de trancher silencieusement dans un sens ou dans l'autre.
  if (w.endsWith('gue') && compte < groupes.length) {
    hiatusCount += 1;
  }
  return { min: compte, max: compte + hiatusCount, hiatus: hiatusCount > 0 };
}

/* Indices des groupes vocaliques comportant un hiatus possible, pour un
   mot déjà nettoyé (utilisé par syllabifieMot pour la variante diérèse). */
function indicesHiatus(motBrut){
  const w = nettoieMot(motBrut);
  const groupes = trouveGroupesAvecPositions(w);
  const indices = new Set();
  groupes.forEach((g, idx) => {
    let check = g.texte;
    const estDernier = idx === groupes.length - 1;
    if (estDernier && g.texte.endsWith('e') && w.endsWith(g.texte)) {
      check = g.texte.slice(0, -1);
    }
    if (check.length >= 2 && DIPHTONGUES_FIXES.indexOf(check) === -1) {
      indices.add(idx);
    }
  });
  return indices;
}

/* Réintègre la ponctuation de bord (virgule, tiret, guillemet...) que
   nettoieMot a retirée, autour du découpage syllabique, pour l'affichage. */
function segmenteMotPourAffichage(motBrut, syllabes){
  if (!syllabes || syllabes.length === 0) return motBrut;
  const avantMatch = motBrut.match(/^[^a-zàâäéèêëîïôöùûüÿœç'’‘‛]*/i);
  const apresMatch = motBrut.match(/[^a-zàâäéèêëîïôöùûüÿœç'’‘‛]*$/i);
  const avant = avantMatch ? avantMatch[0] : '';
  const apres = apresMatch ? apresMatch[0] : '';
  const copie = syllabes.slice();
  copie[0] = avant + copie[0];
  copie[copie.length - 1] = copie[copie.length - 1] + apres;
  return copie.join('‧');
}

function analyseLigne(ligne){
  // le trait d'union sépare deux mots phonétiques distincts (ex. "vois-tu", "dit-il")
  // on écarte aussi les tokens de pure ponctuation isolés par une espace
  // (ex. l'espace avant ";" ou "!" en typographie française), qui ne sont
  // pas de vrais "mots suivants" et fausseraient la règle du e caduc.
  const mots = ligne.trim().split(/[\s\-]+/).filter(m => nettoieMot(m) !== '');
  let total = 0, totalMax = 0, hasHiatus = false;
  const details = [];
  mots.forEach((motBrut, i) => {
    const estDernier = i === mots.length - 1;
    const motSuivant = !estDernier ? nettoieMot(mots[i + 1]) : null;
    const suivantVoyelleOuH = motSuivant ? /^[aeiouyàâäéèêëîïôöùûüÿœh]/.test(motSuivant) : false;
    const finalEPrononce = !estDernier && !suivantVoyelleOuH;
    const r = compteSyllabesMot(motBrut, finalEPrononce);
    const syllabes = syllabifieMot(motBrut, finalEPrononce, new Set());
    let syllabesDierese = null;
    if (r.hiatus) {
      const hIndices = indicesHiatus(motBrut);
      if (hIndices.size > 0) {
        syllabesDierese = syllabifieMot(motBrut, finalEPrononce, hIndices);
      } else {
        // l'écart min/max vient uniquement du cas ambigu "-gue" (vague,
        // guerre...) : la variante restaure simplement le e final au lieu
        // de scinder un groupe de voyelles.
        syllabesDierese = syllabifieMot(motBrut, true, new Set());
      }
    }
    total += r.min; totalMax += r.max;
    if (r.hiatus) hasHiatus = true;
    details.push({ mot: motBrut, min: r.min, max: r.max, hiatus: r.hiatus, syllabes, syllabesDierese });
  });
  return { total, totalMax, hasHiatus, details };
}

/* Clé de rime d'un mot, utilisée pour regrouper les vers d'une strophe :
   dictionnaire phonétique complet en priorité (le plus fiable), sinon la
   famille de rime approchée, sinon un simple repli sur les 3 dernières
   lettres (mieux que rien pour les mots absents des deux dictionnaires). */
/* Contractions élidées ("m'", "l'", "qu'"...) à retirer avant toute
   comparaison de rime : la rime porte sur le mot lui-même, pas sur la
   consonne d'élision qui le précède (ex. "m'assieds" doit rimer comme
   "assieds", pas rester bloqué par son "m'"). */
function retireContraction(norm){
  return (norm || '').replace(/^(jusqu|lorsqu|puisqu|quoiqu|qu|[ldjmtsnc])'/, '');
}

/* "-tion" en fin de mot se prononce [sjɔ̃], exactement comme "-ssion"
   (passion/nation riment vraiment), SAUF quand un "s" précède déjà le
   "t" (question, digestion... qui gardent [tj]) : on convertit donc "t"
   en "s" dans ce seul cas, pour que la comparaison orthographique ne
   traite plus à tort ces deux graphies comme des sons différents. */
function normaliseTiVersS(w){
  return w.replace(/([^s])tion$/, '$1sion');
}

/* Mots où le "-er" final se prononce vraiment (le "r" s'entend), à ne
   PAS confondre avec l'infinitif muet (chanter → [ʃɑ̃te]) : liste non
   exhaustive des cas les plus courants — mots natifs courts, emprunts
   anglais fréquents, et les invariables en "-ers" (dont le "s" pluriel
   est déjà retiré plus haut, laissant "...er" comme les autres). Signaler
   toute omission plutôt que de supposer que la liste est complète. */
const EXCEPTIONS_ER_PRONONCE = new Set([
  'mer', 'fer', 'cher', 'hier', 'ver', 'fier', 'cuiller', 'hiver', 'enfer',
  'super', 'cancer', 'amer', 'éther', 'revolver',
  'divers', 'univers', 'travers', 'envers', 'revers', 'pers',
  'leader', 'container', 'reporter', 'gangster', 'cracker', 'poker',
  'roller', 'thriller', 'cluster', 'master', 'mixer', 'scooter', 'sweater', 'toaster',
].map(m => m.replace(/s$/, ''))); // les invariables en -ers ont déjà perdu leur "s" avant cet appel

/* Mots où le "-ez" final se prononce vraiment (rare : quelques noms
   communs, et surtout des patronymes/toponymes d'origine hispanique où
   le "z" est audible, [-ɛz]) — liste non exhaustive, mêmes réserves que
   ci-dessus. */
const EXCEPTIONS_EZ_PRONONCE = new Set([
  'fez', 'suez',
  'perez', 'pérez', 'sanchez', 'sánchez', 'gomez', 'gómez', 'fernandez', 'fernández',
  'martinez', 'martínez', 'gonzalez', 'gonzález', 'hernandez', 'hernández',
  'dominguez', 'domínguez', 'rodriguez', 'rodríguez', 'velazquez', 'velázquez',
  'chavez', 'chávez', 'jimenez', 'jiménez', 'ramirez', 'ramírez', 'alvarez', 'álvarez',
  'lopez', 'lópez', 'nunez', 'núñez',
]);

/* Prépare un mot pour toute comparaison de rime : contraction élidée,
   pluriel, infinitif en "-er" et "-ez" tous deux ramenés à "é" (sauf
   exceptions ci-dessus où ils se prononcent — vérifié AVANT le retrait
   d/t/x ci-dessous, jamais après : sinon "concert" perdrait son "t" muet
   d'abord, se retrouverait à tort terminé en "-er" ["concer"], et serait
   converti par erreur), consonne finale muette (d/t/x) sinon, puis règle
   "-tion" → "-ssion". Base commune à cleFinApprox et aux fonctions de
   classement pauvre/suffisante/riche/très riche/léonine plus bas. */
function preparerMotRime(mot){
  let w = retireContraction(normaliseMot(mot));
  if (!w) return '';
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 2) w = w.slice(0, -1);
  if (w.endsWith('er') && w.length > 2 && !EXCEPTIONS_ER_PRONONCE.has(w)) {
    w = w.slice(0, -2) + 'é';
  } else if (w.endsWith('ez') && w.length > 2 && !EXCEPTIONS_EZ_PRONONCE.has(w)) {
    w = w.slice(0, -2) + 'é';
  } else {
    w = w.replace(/[dtx]$/, '');
  }
  return normaliseTiVersS(w);
}

/* Applique à une clé de fin de mot (déjà ancrée sur la dernière voyelle
   prononcée) toutes les équivalences graphie↔son utilisées pour juger si
   deux mots riment : circonflexe neutre, semi-consonne i/y en tête,
   nasales équivalentes, graphies du son [ɛ] (ê/è/ei/e fermé), "s"
   intervocalique → [z], lettres doublées → un seul son. Partagée par
   cleFinApprox (détection "ça rime ou pas") ET segmentsPhonetiques
   (comptage pauvre/suffisante/riche) pour que les deux jugent les mêmes
   sons équivalents — sans quoi un mot ne bénéficiant de ces équivalences
   que dans l'un des deux calculs se retrouvait sous-évalué en richesse
   alors même qu'il était déjà reconnu comme rimant (ex. "airs"/"concerts"). */
function normaliseSonsFinal(cle){
  // Le circonflexe sur i/a/u ne change pas le timbre de la voyelle (î=i,
  // â=a, û=u à l'oreille) : on le neutralise avant tout le reste, pour que
  // "traîne" (aîne) matche "peine" (eine → ai ne, cf. plus bas) sans que
  // le "î" fasse obstacle à la comparaison.
  cle = cle.replace(/î/g, 'i').replace(/â/g, 'a').replace(/û/g, 'u');

  // Un "i" ou un "y" suivi d'une autre voyelle dans le même groupe n'est
  // jamais la voyelle porteuse de la rime : c'est une semi-consonne [j]
  // (attaque de syllabe), comme dans "yeux" [jø] ou "chaumière" [-mjɛʁ].
  // On le retire donc en tête de clé pour que "cieux"/"yeux" (ieu/yeu →
  // eu) et "chaumières"/"chères" (ière/ère → ère) soient bien reconnus
  // comme la même rime, avant d'appliquer la normalisation ê/è/e ci-dessous.
  cle = cle.replace(/^[iy](?=[aeiouyàâäéèêëîïôöùûüÿœ])/, '');

  // Normalise quelques graphies nasales équivalentes en début de clé
  // (démente/envoûtante doivent matcher malgré "en" vs "an" ; ombre/
  // nombre doivent matcher malgré "om" vs futur "on")
  cle = cle
    .replace(/^ein(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'in')
    .replace(/^ain(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'in')
    .replace(/^yn(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'in')
    // Même nasale [ɛ̃], mais devant un "m" plutôt qu'un "n" (faim/main,
    // Reims) — pas de règle "^em" ici : "em" devant consonne est déjà la
    // nasale [ɑ̃] (comme "en"), pas [ɛ̃] (sauf cas particuliers déjà rares).
    .replace(/^aim(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'in')
    .replace(/^eim(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'in')
    .replace(/^im(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'in')
    .replace(/^ym(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'in')
    .replace(/^en(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'an')
    .replace(/^om(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'on')
    // Même principe pour la 4e nasale [œ̃] : "um" devant consonne/fin se
    // prononce comme "un" (parfum/brun, aucun/parfum).
    .replace(/^um(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'un')
    // Graphies équivalentes du son oral [ɛ] : "ê"/"è"/"ei" se prononcent
    // comme "ai" (chêne/plaine, peine/traîne, treize/fraise...), et un
    // "e" isolé suivi d'une seule consonne en fin de mot (syllabe finale
    // fermée, donc tonique) se prononce aussi [ɛ] (concert/air, sel/balai).
    .replace(/^ê/, 'ai')
    .replace(/^è/, 'ai')
    .replace(/^ei(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'ai')
    .replace(/^e(?=[^aeiouyàâäéèêëîïôöùûüÿœ])/, 'ai')
    // "eau" et "au" se prononcent tous les deux [o] fermé, comme "o" seul
    // en syllabe OUVERTE — rien après la voyelle, un "e" muet, ou un "s"
    // intervocalique (qui deviendra [z] plus bas dans cette même fonction :
    // "pause"/"pose"/"morose" sont bien tous fermés) — (chaud/pot,
    // chapeau/pot, pause/pose). En syllabe fermée par une AUTRE consonne en
    // revanche, le "o" écrit peut être fermé (rose) OU ouvert (note) selon
    // le mot, de façon imprévisible depuis la seule orthographe — dans ce
    // cas on ne convertit PAS, pour ne pas risquer de faire rimer à tort
    // "faute" [fot] et "note" [nɔt] : deux timbres différents malgré la
    // graphie proche. "eau" d'abord, sinon la règle "au" plus bas le
    // prendrait en écharpe et laisserait un "e" résiduel.
    .replace(/^eau(?=z|s[aeiouyàâäéèêëîïôöùûüÿœ]|e?$)/, 'o')
    .replace(/^au(?=z|s[aeiouyàâäéèêëîïôöùûüÿœ]|e?$)/, 'o')
    // "œu"/"oeu" (avec ou sans ligature) se prononcent comme "eu" seul —
    // ICI pas besoin de la même restriction qu'au-dessus : "eu" et "œu"
    // suivent tous les deux la même règle de position (fermé [ø] en
    // syllabe ouverte, ouvert [œ] en syllabe fermée), donc les fusionner
    // ne mélange jamais deux timbres différents — contrairement à au/eau
    // qui est TOUJOURS fermé quelle que soit la syllabe. cœur/heure et
    // cœur/fleur (syllabe fermée, [œ] dans les deux graphies) doivent
    // rimer tout autant que vœu/peu (syllabe ouverte, [ø] dans les deux).
    .replace(/^œu/, 'eu')
    .replace(/^oeu/, 'eu');

  // Un "s" isolé entre deux voyelles se prononce [z], jamais [s] (rose,
  // fraise, maison...) — à distinguer du "ss" doublé qui reste [s] et
  // n'est pas touché ici (le motif exige une voyelle des deux côtés).
  cle = cle.replace(/([aeiouyàâäéèêëîïôöùûüÿœ])s([aeiouyàâäéèêëîïôöùûüÿœ])/g, '$1z$2');

  // Une lettre doublée ne représente qu'un seul son (pierre "rr" = lumière
  // "r") : appliqué en tout dernier, après la règle du "s" ci-dessus pour
  // ne pas la perturber (un "ss" doublé doit rester [s], jamais devenir un
  // "s" isolé qu'on convertirait ensuite à tort en [z]).
  cle = cle.replace(/(.)\1+/g, '$1');

  return cle;
}

/* Clé approchée toujours disponible (orthographique) : contraction et
   pluriel retirés, puis une éventuelle consonne finale muette fréquente
   (d, t, x) retirée à son tour, avant de garder les 2 dernières lettres.
   Sert de filet de sécurité quand la clé "riche" ci-dessous est absente
   ou incohérente entre deux mots qui riment pourtant à l'oreille. */
function cleFinApprox(mot){
  const w = preparerMotRime(mot);
  if (!w) return null;

  const groupes = trouveGroupesAvecPositions(w);
  if (groupes.length === 0) return w;

  // On ancre la clé sur la DERNIÈRE voyelle réellement prononcée, pas sur
  // un nombre fixe de lettres : "sombre" et "ténèbres" se terminent tous
  // les deux en "-bre" mais ne riment pas (voyelles différentes) — un
  // simple découpage aux 2 dernières lettres les confondait à tort.
  let idxAncre = groupes.length - 1;
  const dernier = groupes[idxAncre];
  if (dernier.texte === 'e' && dernier.fin === w.length && idxAncre > 0) {
    idxAncre--; // e muet final : la vraie rime est portée par la voyelle d'avant
  }
  const cle = normaliseSonsFinal(w.slice(groupes[idxAncre].debut));

  return cle || null;
}

/* Clé "riche" quand disponible : dictionnaire phonétique complet en
   priorité, sinon famille de rime approchée. Peut être absente (null)
   si le mot ne figure dans ni l'un ni l'autre. */
function cleRicheMot(mot){
  const w = retireContraction(normaliseMot(mot));
  if (!w) return null;
  if (!DEBUG_IGNORER_DICO_PERSO && typeof DICO_PHONETIQUE !== 'undefined' && DICO_PHONETIQUE && DICO_PHONETIQUE.has(w)) {
    return 'PH:' + DICO_PHONETIQUE.get(w);
  }
  const fam = trouveFamille(w);
  return fam ? 'FAM:' + fam.son : null;
}

/* Deux mots sont considérés comme rimant ensemble si LEUR clé riche
   concorde (le plus fiable), OU si leur clé approchée concorde (filet de
   sécurité : évite qu'un mot présent dans le dictionnaire phonétique et
   son partenaire absent de ce même dictionnaire se retrouvent, à tort,
   dans deux groupes différents). */
/* Extrait le "noyau vocalique" en tête d'une clé de cleFinApprox (les
   lettres voyelles avant la première consonne) — sert de garde-fou pour
   ne pas faire confiance aveuglément à un dictionnaire phonétique externe
   qui regrouperait à tort des mots par leur seule terminaison consonantique
   (ex. un dictionnaire qui mettrait "sombre" et "ténèbres" ensemble juste
   parce qu'ils finissent tous les deux en "-bre", alors que "o" et "è" ne
   riment pas). */
function coeurVocalique(cle){
  if (!cle) return '';
  const m = cle.match(new RegExp('^[' + VOYELLES + ']+'));
  if (!m) return '';
  let coeur = m[0];
  // si la voyelle est suivie d'un seul m/n lui-même suivi d'une consonne
  // (ou de rien), ce m/n la nasalise et fait partie intégrante du son —
  // "ombre" (nasal "om") ne doit jamais être confondu avec "octobre"
  // (oral "o" suivi de "b"), même si les deux commencent par la lettre "o".
  const suite = cle.slice(coeur.length);
  if (/^[mn]/.test(suite) && !estVoyelle(suite[1])) {
    coeur += suite[0];
  }
  return coeur;
}

// Bascule globale "mode assonance" — équivalent, pour les rimes, du
// toggle diérèse pour les syllabes. Désactivée par défaut (mode strict).
let MODE_ASSONANCE = false;

// Debug uniquement (Settings → Carnet du Poète) : ignore temporairement le
// dictionnaire personnel (Formats B/C) partout où il serait normalement
// consulté, pour comparer le comportement avec/sans lui sans avoir à le
// retirer du vault ni à recharger le plugin.
let DEBUG_IGNORER_DICO_PERSO = false;

/* Classe la relation entre deux mots en fin de vers :
   - 'rime'      : terminaison réellement identique (voyelle + tout ce qui suit)
   - 'assonance' : même voyelle porteuse, mais terminaison différente
                   ensuite (ex. "ombre"/"montre" : même "on" nasal, mais
                   "b" ≠ "t" juste avant le "r" final)
   - null        : aucun rapport identifiable (ex. "sombre"/"ténèbres") */
function classifieRime(motA, motB){
  const finA = cleFinApprox(motA), finB = cleFinApprox(motB);
  if (finA && finB && finA === finB) return 'rime';

  const coeurA = coeurVocalique(finA), coeurB = coeurVocalique(finB);
  const coeurCompatible = !!(coeurA && coeurB && coeurA === coeurB);

  const richeA = cleRicheMot(motA), richeB = cleRicheMot(motB);
  if (richeA && richeB && richeA === richeB) {
    // le dictionnaire phonétique dit qu'ils sont dans le même groupe : on ne
    // fait confiance que si rien à l'écrit ne le contredit franchement
    if (!coeurA || !coeurB || coeurCompatible) return 'rime';
    return null;
  }

  if (coeurCompatible) return 'assonance';
  return null;
}

/* Vrai si les deux mots sont acceptés comme "rimant ensemble" selon le
   mode courant : rimes strictes uniquement, ou rimes + assonances si le
   mode assonance est activé. Utilisé partout où une simple réponse
   oui/non suffit (schéma de rimes, filtrage des sources en ligne). */
function memeRime(motA, motB){
  const classe = classifieRime(motA, motB);
  return MODE_ASSONANCE ? classe !== null : classe === 'rime';
}

const PALETTE_RIMES = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d68910', '#16a085', '#c2185b', '#5d4037', '#455a64', '#7f8c8d'];

/* Attribue une lettre A, B, C... à chaque vers d'une strophe selon sa
   rime (par ordre d'apparition des sons distincts dans la strophe). */
function calculeSchemaStrophe(derniersMots){
  const lettres = [];
  const representants = []; // { mot, lettre }
  let prochaine = 0;
  derniersMots.forEach(mot => {
    if (!mot || !normaliseMot(mot)) { lettres.push(null); return; }
    const rep = representants.find(r => memeRime(r.mot, mot));
    if (rep) {
      lettres.push(rep.lettre);
    } else {
      const lettre = String.fromCharCode(65 + (prochaine % 26));
      prochaine++;
      representants.push({ mot, lettre });
      lettres.push(lettre);
    }
  });
  return lettres;
}

function nomSchema(lettres){
  if (!lettres || lettres.length !== 4 || lettres.some(l => !l)) return null;
  const [a, b, c, d] = lettres;
  if (a === b && c === d && a !== c) return 'rimes plates (AABB)';
  if (a === c && b === d && a !== b) return 'rimes croisées (ABAB)';
  if (a === d && b === c && a !== b) return 'rimes embrassées (ABBA)';
  return null;
}

/* Analyse un poème entier : découpage en strophes (séparées par une ligne
   vide), analyseLigne pour chaque vers, et schéma de rimes par strophe.
   Réutilisé à la fois par l'affichage et par l'export Markdown. */
function analysePoeme(texteComplet){
  const lignesBrutes = texteComplet.split('\n');
  const lignes = lignesBrutes.map(ligne => ({
    texte: ligne,
    vide: !ligne.trim(),
    r: ligne.trim() ? analyseLigne(ligne) : null,
    lettre: null,
    coulIdx: null,
    qualite: null
  }));

  const strophes = [];
  let indicesCourants = [];
  lignes.forEach((l, i) => {
    if (l.vide) {
      if (indicesCourants.length > 0) { strophes.push(indicesCourants); indicesCourants = []; }
    } else {
      indicesCourants.push(i);
    }
  });
  if (indicesCourants.length > 0) strophes.push(indicesCourants);

  const schemaStrophes = strophes.map(indices => {
    const derniersMots = indices.map(i => {
      const det = lignes[i].r.details;
      return det.length ? det[det.length - 1].mot : '';
    });
    const lettres = calculeSchemaStrophe(derniersMots);
    const premierMotParLettre = new Map();
    indices.forEach((idx, k) => {
      lignes[idx].lettre = lettres[k];
      lignes[idx].coulIdx = lettres[k] ? (lettres[k].charCodeAt(0) - 65) % PALETTE_RIMES.length : null;
      if (lettres[k]) {
        const motActuel = derniersMots[k];
        if (!premierMotParLettre.has(lettres[k])) {
          premierMotParLettre.set(lettres[k], motActuel);
        } else {
          lignes[idx].qualite = classeRime(premierMotParLettre.get(lettres[k]), motActuel);
        }
      }
    });
    return { indices, lettres, nom: nomSchema(lettres) };
  });

  return { lignes, strophes: schemaStrophes };
}

const METRES = {
  4:'tétrasyllabe', 5:'pentasyllabe', 6:'hexasyllabe', 7:'heptasyllabe',
  8:'octosyllabe', 9:'ennéasyllabe', 10:'décasyllabe', 11:'hendécasyllabe', 12:'alexandrin'
};

/* =========================================================
   DICTIONNAIRE DE RIMES — ~60 familles de sons
   ========================================================= */

const FAMILLES_BASE = [
  {son:"-oi / -oie [wa]", exemple:"roi, joie", terms:['oie','oies','ois','oit','oix','oi'],
   mots:["roi","loi","joie","voix","moi","toi","soi","quoi","foi","croix","fois","emploi","effroi","désarroi","autrefois","parfois","pourquoi","tournoi","proie","courroie","soie","voie","oie"]},
  {son:"-an / -ent / -emps [ɑ̃]", exemple:"temps, enfant", terms:['emps','ant','ent','ang','and','an'],
   mots:["temps","enfant","grand","blanc","vent","sang","chant","argent","moment","instant","printemps","tourment","élan","volant","brillant","courant","méchant","plan","banc","flanc","océan","artisan","tyran","gourmand","marchand"]},
  {son:"-in / -ain / -ein [ɛ̃]", exemple:"vin, chemin", terms:['ein','ain','yn','un','in'],
   mots:["vin","chemin","main","pain","plein","matin","jardin","destin","chagrin","refrain","certain","lendemain","parfum","humain","romain","souverain","écrivain","gamin","câlin","malin","félin","voisin","cousin","assassin","brun"]},
  {son:"-on / -ont [ɔ̃]", exemple:"son, maison", terms:['ont','on'],
   mots:["son","nom","pont","don","ton","front","rond","fond","horizon","saison","maison","chanson","façon","raison","poison","prison","avion","million","pardon","moisson","frisson","poisson","buisson","foison"]},
  {son:"-eau / -ôt [o]", exemple:"eau, chapeau", terms:['eau','eaux','ôt','aud','aut'],
   mots:["eau","beau","chapeau","oiseau","château","cadeau","bateau","gâteau","tableau","drapeau","rideau","plateau","tôt","mot","sot","repos","propos","écho","manteau","chameau","morceau","ruisseau","tombeau","corbeau","museau"]},
  {son:"-ou / -oux [u]", exemple:"fou, genou", terms:['oux','out','ou'],
   mots:["fou","cou","doux","tout","loup","coup","bout","genou","hibou","joujou","chou","sous","dessous","verrou","matou","clou","remous","cachou","gourou","caillou","filou"]},
  {son:"-our / -ours [uʁ]", exemple:"jour, amour", terms:['ours','our'],
   mots:["jour","amour","tour","cour","tambour","retour","discours","secours","toujours","alentour","contour","séjour","velours","autour","détour","labour","four","vautour","carrefour"]},
  {son:"-i / -ie [i]", exemple:"vie, ami", terms:['ie','is','it','i'],
   mots:["vie","nuit","pluie","ami","envie","oubli","souris","habit","écrit","fruit","bruit","ennui","lui","cri","mari","tapis","paradis","pari","roulis","épi","parti","joli","infini","aujourd'hui"]},
  {son:"-u / -ue [y]", exemple:"vue, rue", terms:['ue','us','ut','u'],
   mots:["vue","rue","tortue","statue","venue","tenue","perdu","connu","voulu","entendu","têtu","salut","but","tissu","vécu","aperçu","charrue","avenue","revue","cru","chevelu"]},
  {son:"-é / -ée / -er / -ez [e]", exemple:"été, marché", terms:['ée','é','er','ez'],
   mots:["été","aimer","chanter","danser","blé","marché","pré","gré","nez","laissez","passé","tomber","penser","rêver","léger","degré","vérité","café","fée","poupée","année","journée","pensée","entrée","arrivée","idée"]},
  {son:"-è / -ait / -ais [ɛ]", exemple:"forêt, lait", terms:['ait','ais','aid','aie','ès','êt','et'],
   mots:["forêt","lait","fait","mais","jamais","palais","français","succès","procès","après","exprès","épais","anglais","désormais","discret","complet","regret","portrait","trait","attrait","extrait","retrait","jouet","objet","sujet","souhait","secret"]},
  {son:"-eur / -œur [œʁ]", exemple:"cœur, fleur", terms:['œur','eur'],
   mots:["cœur","fleur","couleur","douleur","chaleur","honneur","bonheur","malheur","peur","sœur","valeur","saveur","senteur","hauteur","lueur","ardeur","rumeur","lenteur","largeur","longueur","profondeur","splendeur","terreur","erreur"]},
  {son:"-age [aʒ]", exemple:"page, voyage", terms:['age'],
   mots:["âge","page","image","village","voyage","nuage","orage","mirage","courage","sillage","message","paysage","visage","rivage","sauvage","ouvrage","dommage","mariage","passage","langage","ménage","naufrage","otage"]},
  {son:"-oir / -oire [waʁ]", exemple:"soir, mémoire", terms:['oire','oir'],
   mots:["soir","noir","espoir","miroir","mémoire","histoire","victoire","gloire","pouvoir","savoir","devoir","revoir","mouchoir","avoir","arrosoir","désespoir","trottoir","comptoir","territoire","armoire","ivoire","foire","mâchoire"]},
  {son:"-ière / -ier [jɛʁ]", exemple:"lumière, papier", terms:['ière','ier'],
   mots:["lumière","rivière","prière","dernière","poussière","paupière","pierre","hier","fier","papier","cahier","sentier","escalier","premier","quartier","panier","grenier","sorcière","chaumière","clairière","lisière","frontière"]},
  {son:"-al / -ale [al]", exemple:"cheval, journal", terms:['al'],
   mots:["cheval","journal","animal","national","fatal","banal","capital","canal","signal","festival","idéal","hôpital","général","végétal","mental","brutal","oral","rival","total","martial","régional"]},
  {son:"-elle / -êle [ɛl]", exemple:"belle, chandelle", terms:['êle','elle'],
   mots:["belle","elle","nouvelle","chandelle","ficelle","ruelle","hirondelle","querelle","ombrelle","dentelle","passerelle","sentinelle","tourelle","vaisselle","prunelle","chapelle","fidèle","modèle","grêle","mademoiselle"]},
  {son:"-or / -ore [ɔʁ]", exemple:"or, aurore", terms:['ore','or'],
   mots:["or","dehors","décor","trésor","effort","remords","corps","mort","sort","port","fort","encore","alors","aurore","flore","sonore","essor","confort","ressort","transport","dévore","colore"]},
  {son:"-at / -atte [a]", exemple:"chat, résultat", terms:['atte','at'],
   mots:["chat","plat","rat","éclat","combat","climat","résultat","état","soldat","syndicat","format","patte","natte","chatte","datte"]},
  {son:"-ette [ɛt]", exemple:"fillette, baguette", terms:['ette'],
   mots:["fillette","chouette","cachette","fourchette","silhouette","baguette","allumette","trompette","chansonnette","miette","brouette","calculette","assiette"]},
  {son:"-ance / -anse [ɑ̃s]", exemple:"danse, chance", terms:['ance','anse'],
   mots:["danse","chance","France","transe","avance","romance","croissance","naissance","souffrance","puissance","confiance","distance","enfance","connaissance","espérance","alliance","vengeance","tolérance"]},
  {son:"-ise [iz]", exemple:"valise, surprise", terms:['ise'],
   mots:["valise","église","surprise","franchise","chemise","bêtise","sottise","entreprise","brise","prise","crise","exquise","marchandise","méprise","remise"]},
  {son:"-ile / -île [il]", exemple:"ville, fragile", terms:['île','ile'],
   mots:["ville","tranquille","fragile","facile","difficile","utile","habile","docile","mobile","île","fossile","immobile","textile","missile","hostile","subtile"]},
  {son:"-ombre [ɔ̃bʁ]", exemple:"ombre, sombre", terms:['ombre'],
   mots:["ombre","nombre","sombre","décombre","encombre","pénombre"]},
  {son:"-ude [yd]", exemple:"étude, solitude", terms:['ude'],
   mots:["étude","attitude","habitude","altitude","solitude","multitude","certitude","latitude","gratitude","exactitude","quiétude","inquiétude"]},
  {son:"-esse [ɛs]", exemple:"tristesse, jeunesse", terms:['esse'],
   mots:["tristesse","jeunesse","richesse","faiblesse","vitesse","promesse","tendresse","sagesse","adresse","paresse","allégresse","princesse","caresse","ivresse","détresse","noblesse"]},
  {son:"-tion / -sion [sjɔ̃]", exemple:"nation, passion", terms:['tion','sion'],
   mots:["nation","action","passion","émotion","question","attention","création","révolution","tradition","direction","situation","imagination","destination","solution","condition","position","admiration","inspiration","illusion","décision"]},
  {son:"-if / -ive [if]", exemple:"vif, actif", terms:['ive','if'],
   mots:["vif","actif","motif","captif","fugitif","natif","naïf","massif","passif","sportif","plaintif","furtif"]},
  {son:"-ique [ik]", exemple:"musique, magique", terms:['ique'],
   mots:["musique","unique","magique","publique","physique","poétique","tragique","comique","panique","mystique","épique","mécanique","romantique","fantastique","pratique","technique","critique"]},
  {son:"-aire [ɛʁ]", exemple:"affaire, salaire", terms:['aire'],
   mots:["affaire","grammaire","questionnaire","anniversaire","salaire","adversaire","nécessaire","ordinaire","extraordinaire","solitaire","volontaire","sanctuaire","dictionnaire"]},
  {son:"-ivre [ivʁ]", exemple:"livre, vivre", terms:['ivre'],
   mots:["livre","vivre","délivre","poursuivre","suivre"]},
  {son:"-isme [ism]", exemple:"réalisme, prisme", terms:['isme'],
   mots:["romantisme","réalisme","optimisme","pessimisme","égoïsme","mysticisme","journalisme","symbolisme","classicisme","héroïsme","prisme","charisme","organisme","mécanisme"]},
  {son:"-oute / -oûte [ut]", exemple:"route, écoute", terms:['oûte','oute'],
   mots:["route","doute","croûte","déroute","écoute","voûte","redoute"]},
  {son:"-onde [ɔ̃d]", exemple:"onde, blonde", terms:['onde'],
   mots:["onde","monde","blonde","seconde","fronde","ronde","profonde","immonde","réponde"]},
  {son:"-anche [ɑ̃ʃ]", exemple:"manche, avalanche", terms:['anche'],
   mots:["manche","blanche","branche","tranche","avalanche","revanche","dimanche","planche","pervenche"]},
  {son:"-ange [ɑ̃ʒ]", exemple:"ange, mélange", terms:['ange'],
   mots:["ange","mange","range","étrange","mélange","orange","échange","vendange","dérange","louange"]},
  {son:"-acle [akl]", exemple:"miracle, obstacle", terms:['acle'],
   mots:["miracle","spectacle","obstacle","oracle","cénacle","tabernacle"]},
  {son:"-eil / -eille [ɛj]", exemple:"abeille, soleil", terms:['eille','eil'],
   mots:["abeille","oreille","corneille","merveille","groseille","bouteille","vieille","réveille","pareille","oseille","soleil","réveil","appareil","sommeil","orteil","conseil","vermeil"]},
  {son:"-aille [aj]", exemple:"taille, bataille", terms:['aille'],
   mots:["taille","paille","bataille","muraille","médaille","écaille","volaille","entaille","trouvaille"]},
  {son:"-ouille [uj]", exemple:"grenouille, rouille", terms:['ouille'],
   mots:["grenouille","citrouille","andouille","nouille","rouille","fripouille"]},
  {son:"-asse / -ace [as]", exemple:"terrasse, trace", terms:['asse','ace'],
   mots:["terrasse","carcasse","menace","espace","grimace","surface","trace","face","place","race","audace","glace","disgrâce"]},
  {son:"-ousse [us]", exemple:"mousse, trousse", terms:['ousse'],
   mots:["mousse","pousse","brousse","secousse","rousse","trousse"]},
  {son:"-erie [ʁi]", exemple:"rêverie, féerie", terms:['erie'],
   mots:["rêverie","sorcellerie","boulangerie","féerie","tricherie","moquerie","flânerie","songerie","tromperie","causerie"]},
  {son:"-oisie / -aisie [izi]", exemple:"poésie, jalousie", terms:['oisie','aisie'],
   mots:["jalousie","courtoisie","fantaisie","poésie"]},
  {son:"-esque [ɛsk]", exemple:"grotesque, arabesque", terms:['esque'],
   mots:["grotesque","pittoresque","romanesque","gigantesque","arabesque"]},
  {son:"-ogue [ɔɡ]", exemple:"dialogue, catalogue", terms:['ogue'],
   mots:["dialogue","catalogue","vogue","épilogue","analogue"]},
  {son:"-igue [iɡ]", exemple:"fatigue, intrigue", terms:['igue'],
   mots:["fatigue","digue","intrigue","prodigue","ligue"]},
  {son:"-ige [iʒ]", exemple:"vertige, prestige", terms:['ige'],
   mots:["vertige","prestige","litige","vestige","tige","prodige"]},
  {son:"-ainte / -einte [ɛ̃t]", exemple:"crainte, empreinte", terms:['ainte','einte'],
   mots:["crainte","plainte","empreinte","atteinte","contrainte","teinte","feinte","éteinte"]},
  {son:"-ouble / -ouple [ubl]", exemple:"double, couple", terms:['ouble','ouple'],
   mots:["double","trouble","couple","redouble"]},
  {son:"-ombe [ɔ̃b]", exemple:"tombe, colombe", terms:['ombe'],
   mots:["tombe","colombe","retombe"]},
  {son:"-osse [ɔs]", exemple:"fosse, carrosse", terms:['osse'],
   mots:["fosse","carrosse","bosse","rosse"]},
  {son:"-âtre [ɑtʁ]", exemple:"théâtre, plâtre", terms:['âtre'],
   mots:["théâtre","plâtre","folâtre","opiniâtre"]},
  {son:"-itre / -ître [itʁ]", exemple:"titre, chapitre", terms:['ître','itre'],
   mots:["titre","chapitre","épître","huître","maître"]},
  {son:"-être [ɛtʁ]", exemple:"être, fenêtre", terms:['être'],
   mots:["être","ancêtre","fenêtre","champêtre"]},
  {son:"-otte [ɔt]", exemple:"carotte, botte", terms:['otte'],
   mots:["carotte","culotte","botte","hotte","marmotte","calotte"]},
  {son:"-oche [ɔʃ]", exemple:"cloche, brioche", terms:['oche'],
   mots:["cloche","brioche","reproche","pioche","poche"]},
  {son:"-euse [øz]", exemple:"heureuse, curieuse", terms:['euse'],
   mots:["heureuse","joyeuse","curieuse","précieuse","chanteuse","danseuse","peureuse"]},
  {son:"-inte / -ointe [wɛ̃t]", exemple:"pointe, disjointe", terms:['ointe'],
   mots:["pointe","disjointe"]},
  {son:"-ade [ad]", exemple:"promenade, façade", terms:['ade'],
   mots:["promenade","façade","escapade","embrassade","tornade","balade","salade","parade","limonade","charade","cascade"]},
  {son:"-ude / -itude (bis) [yd]", exemple:"prélude, étude", terms:['ude'],
   mots:["prélude"]},
  {son:"-ure [yʁ]", exemple:"nature, aventure", terms:['ure'],
   mots:["nature","aventure","figure","voiture","fracture","peinture","ceinture","créature","froidure","murmure","verdure","brûlure","chevelure","écriture","clôture","rature","allure","armure","bordure","mesure"]},
  {son:"-ique (bis) / -yque", exemple:"lyrique, angélique", terms:['yque'],
   mots:["lyrique"]}
];
const FAMILLES = FAMILLES_BASE.slice();

function normaliseMot(mot){
  return (mot || '').toLowerCase().trim().replace(/[’‘‛]/g, "'").replace(/[^a-zàâäéèêëîïôöùûüÿœç']/gi, '');
}

/* Découpe un thème en mots-clés de recherche individuels, contrairement à
   normaliseMot() qui supprime purement et simplement les espaces et
   ponctuations (utile pour comparer deux mots, mais désastreux pour un
   thème à plusieurs mots : "Nuit & obscurité" deviendrait "nuitobscurité",
   une chaîne que personne ne tape jamais en recherche). Ici chaque mot du
   thème redevient sa propre entrée de motsClefs. */
function motsClefsDepuisTheme(theme){
  return (theme || '')
    .toLowerCase()
    .split(/[^a-zàâäéèêëîïôöùûüÿœç]+/i)
    .map(t => t.trim())
    .filter(t => t.length > 1);
}

/* =========================================================
   CHAMPS LEXICAUX — inspiration de vocabulaire
   Contrairement aux rimes (question de son), il s'agit ici de
   proximité de sens : on tape un mot courant ("forêt") et on
   reçoit un vocabulaire plus rare, littéraire ou désuet autour
   du même thème ("canopée", "futaie", "orée"...), avec une courte
   définition pour ne pas se tromper de sens.
   ========================================================= */
const CHAMPS_LEXICAUX_BASE = [
  { theme: "Forêt & arbres", motsClefs: ["forêt","bois","arbre","arbres","forestier"],
    mots: [
      { mot:"canopée", note:"voûte formée par les cimes des arbres" },
      { mot:"sylve", note:"forêt (littéraire, poétique)" },
      { mot:"futaie", note:"forêt de grands arbres menés à maturité" },
      { mot:"frondaison", note:"ensemble du feuillage d'un arbre" },
      { mot:"ramure", note:"ensemble des branches" },
      { mot:"orée", note:"lisière, bordure d'un bois" },
      { mot:"bocage", note:"paysage de prés entourés de haies et d'arbres" },
      { mot:"taillis", note:"jeunes arbres qu'on coupe régulièrement" },
      { mot:"sous-bois", note:"végétation basse sous les arbres" },
      { mot:"bosquet", note:"petit groupe d'arbres" },
      { mot:"essart", note:"terrain défriché par le feu (vieilli)" },
      { mot:"hallier", note:"buisson touffu et enchevêtré" },
      { mot:"ramée", note:"branchage feuillu (littéraire)" },
      { mot:"gaulis", note:"jeune taillis de perches" } ] },

  { theme: "Mer & eau", motsClefs: ["mer","eau","océan","vague","vagues","onde"],
    mots: [
      { mot:"abysse", note:"fond marin insondable" },
      { mot:"écume", note:"mousse blanche des vagues" },
      { mot:"ressac", note:"retour violent des vagues sur le rivage" },
      { mot:"embruns", note:"gouttelettes d'eau de mer soulevées par le vent" },
      { mot:"houle", note:"mouvement ondulatoire de la mer sans déferler" },
      { mot:"onde", note:"mot littéraire pour « eau, vague »" },
      { mot:"nef", note:"navire (vieilli, poétique)" },
      { mot:"estran", note:"partie du rivage découverte à marée basse" },
      { mot:"grève", note:"rivage de sable ou de galets (vieilli)" },
      { mot:"lame", note:"vague isolée" },
      { mot:"flot", note:"masse d'eau en mouvement (souvent au pluriel, poétique)" },
      { mot:"écueil", note:"rocher à fleur d'eau, dangereux" } ] },

  { theme: "Nuit & obscurité", motsClefs: ["nuit","obscurité","noir","sombre"],
    mots: [
      { mot:"ténèbres", note:"obscurité profonde et menaçante" },
      { mot:"pénombre", note:"demi-jour, lumière faible" },
      { mot:"crépuscule", note:"lumière incertaine du soir (ou de l'aube)" },
      { mot:"noirceur", note:"qualité de ce qui est noir, obscur" },
      { mot:"obombrer", note:"couvrir d'ombre (verbe vieilli, littéraire)" },
      { mot:"veille", note:"état de qui reste éveillé la nuit" },
      { mot:"brune", note:"tombée de la nuit (vieilli, « à la brune »)" } ] },

  { theme: "Lumière & soleil", motsClefs: ["lumière","soleil","clarté","éclat"],
    mots: [
      { mot:"rai", note:"mince rayon de lumière (littéraire)" },
      { mot:"lueur", note:"faible lumière" },
      { mot:"clarté", note:"lumière qui rend les choses visibles" },
      { mot:"embrasement", note:"fait de s'enflammer, grande lumière rougeoyante" },
      { mot:"fulgurance", note:"éclat soudain et intense" },
      { mot:"resplendir", note:"briller avec éclat (verbe)" },
      { mot:"aurore", note:"lumière du levant avant le soleil" },
      { mot:"éclaircie", note:"moment de lumière entre deux nuages" } ] },

  { theme: "Vent", motsClefs: ["vent","brise","tempête"],
    mots: [
      { mot:"zéphyr", note:"vent doux et léger (mythologique, poétique)" },
      { mot:"bise", note:"vent froid et sec du nord" },
      { mot:"aquilon", note:"vent du nord, violent (poétique, antique)" },
      { mot:"autan", note:"vent du sud-est (Occitanie)" },
      { mot:"bourrasque", note:"coup de vent violent et bref" },
      { mot:"tourbillon", note:"mouvement d'air en spirale" } ] },

  { theme: "Feu", motsClefs: ["feu","flamme","flammes","incendie"],
    mots: [
      { mot:"brasier", note:"masse de bois ou de charbons ardents" },
      { mot:"âtre", note:"foyer de la cheminée (vieilli, poétique)" },
      { mot:"tison", note:"reste de bois brûlé, encore incandescent" },
      { mot:"flammèche", note:"petite flamme qui s'échappe d'un brasier" },
      { mot:"fournaise", note:"lieu extrêmement chaud, four immense" },
      { mot:"ardeur", note:"chaleur intense (souvent figuré, passion)" } ] },

  { theme: "Temps qui passe", motsClefs: ["temps","éphémère","passager","fugitif"],
    mots: [
      { mot:"éphémère", note:"qui ne dure qu'un jour, très bref" },
      { mot:"fugace", note:"qui disparaît vite" },
      { mot:"caduc", note:"qui tombe, qui n'a plus cours" },
      { mot:"suranné", note:"vieilli, passé de mode" },
      { mot:"révolu", note:"entièrement écoulé, terminé" },
      { mot:"vétuste", note:"dégradé, affaibli par le temps" } ] },

  { theme: "Mort", motsClefs: ["mort","mourir","décès","tombe"],
    mots: [
      { mot:"trépas", note:"la mort (littéraire)" },
      { mot:"linceul", note:"drap qui enveloppe un corps mort" },
      { mot:"glas", note:"sonnerie de cloche annonçant une mort" },
      { mot:"sépulcre", note:"tombeau (littéraire, biblique)" },
      { mot:"faucheuse", note:"personnification de la mort armée d'une faux" },
      { mot:"dépouille", note:"corps du défunt" },
      { mot:"funeste", note:"qui apporte le malheur, la mort" },
      { mot:"outre-tombe", note:"qui est au-delà de la mort" } ] },

  { theme: "Amour", motsClefs: ["amour","aimer","amoureux","aimé"],
    mots: [
      { mot:"émoi", note:"trouble, agitation causé par une émotion" },
      { mot:"flamme", note:"passion amoureuse (littéraire, « déclarer sa flamme »)" },
      { mot:"transport", note:"élan violent d'un sentiment (vieilli)" },
      { mot:"idylle", note:"amour naissant, tendre et simple" },
      { mot:"épris", note:"qui éprouve un amour vif (adjectif)" },
      { mot:"soupirant", note:"homme amoureux qui courtise (vieilli)" } ] },

  { theme: "Tristesse & mélancolie", motsClefs: ["tristesse","triste","mélancolie","chagrin"],
    mots: [
      { mot:"spleen", note:"mélancolie profonde et vague (Baudelaire)" },
      { mot:"langueur", note:"faiblesse mêlée de tristesse douce" },
      { mot:"affliction", note:"grande douleur morale" },
      { mot:"désolation", note:"tristesse profonde, désespoir" },
      { mot:"accablement", note:"épuisement moral sous le poids d'un malheur" },
      { mot:"morosité", note:"tendance à la tristesse, à la maussaderie" } ] },

  { theme: "Joie", motsClefs: ["joie","joyeux","bonheur","content"],
    mots: [
      { mot:"allégresse", note:"joie vive et communicative" },
      { mot:"liesse", note:"joie collective, en public" },
      { mot:"jubilation", note:"joie exubérante" },
      { mot:"félicité", note:"bonheur parfait et calme (littéraire)" },
      { mot:"exultation", note:"joie débordante" } ] },

  { theme: "Peur", motsClefs: ["peur","effrayé","effrayant","angoisse"],
    mots: [
      { mot:"effroi", note:"peur violente et soudaine" },
      { mot:"épouvante", note:"peur extrême" },
      { mot:"frayeur", note:"peur vive mais brève" },
      { mot:"transir", note:"glacer de froid ou de peur (verbe)" } ] },

  { theme: "Colère", motsClefs: ["colère","fâché","furieux"],
    mots: [
      { mot:"courroux", note:"colère violente (littéraire)" },
      { mot:"ire", note:"colère (très vieilli, médiéval)" },
      { mot:"fureur", note:"colère extrême, violente" } ] },

  { theme: "Solitude & silence", motsClefs: ["solitude","seul","silence"],
    mots: [
      { mot:"esseulement", note:"état d'être seul, abandonné" },
      { mot:"claustration", note:"fait d'être enfermé, isolé" },
      { mot:"mutisme", note:"silence volontaire, fait de ne pas parler" },
      { mot:"taciturnité", note:"caractère de qui parle peu" },
      { mot:"susurrement", note:"murmure très doux" } ] },

  { theme: "Ciel & étoiles", motsClefs: ["ciel","étoile","étoiles","astre"],
    mots: [
      { mot:"firmament", note:"la voûte céleste (littéraire)" },
      { mot:"éther", note:"air pur des hautes régions du ciel (mythologique)" },
      { mot:"empyrée", note:"partie la plus élevée du ciel, séjour des dieux" },
      { mot:"zénith", note:"point le plus haut, au sommet" },
      { mot:"astre", note:"corps céleste (étoile, planète)" } ] },

  { theme: "Lune", motsClefs: ["lune","clair de lune"],
    mots: [
      { mot:"astre des nuits", note:"périphrase poétique désignant la lune" },
      { mot:"croissant", note:"forme de la lune à certaines phases" } ] },

  { theme: "Fleurs & jardin", motsClefs: ["fleur","fleurs","jardin","parfum"],
    mots: [
      { mot:"corolle", note:"ensemble des pétales d'une fleur" },
      { mot:"calice", note:"enveloppe extérieure d'une fleur, sous les pétales" },
      { mot:"effluve", note:"émanation, odeur subtile qui se dégage" },
      { mot:"fragrance", note:"odeur agréable et délicate" },
      { mot:"parterre", note:"partie d'un jardin où sont plantées des fleurs" } ] },

  { theme: "Oiseaux", motsClefs: ["oiseau","oiseaux","chant"],
    mots: [
      { mot:"ramage", note:"chant des oiseaux dans les arbres (littéraire)" },
      { mot:"pépiement", note:"petits cris des oiseaux" },
      { mot:"envergure", note:"distance entre les extrémités des ailes déployées" } ] },

  { theme: "Voix & parole", motsClefs: ["voix","parole","parler"],
    mots: [
      { mot:"susurrement", note:"murmure très doux" },
      { mot:"verbe", note:"la parole elle-même (registre soutenu, « le verbe haut »)" },
      { mot:"éloquence", note:"art de bien parler, de toucher par la parole" } ] },

  { theme: "Regard & yeux", motsClefs: ["yeux","regard","œil"],
    mots: [
      { mot:"prunelle", note:"la pupille de l'œil (littéraire)" },
      { mot:"chatoyant", note:"qui change de couleur selon la lumière" } ] },

  { theme: "Mains", motsClefs: ["main","mains"],
    mots: [
      { mot:"paume", note:"intérieur de la main" } ] },

  { theme: "Chemin & voyage", motsClefs: ["chemin","voyage","route"],
    mots: [
      { mot:"sente", note:"petit chemin étroit (vieilli, poétique)" },
      { mot:"errance", note:"fait d'errer sans but précis" },
      { mot:"pérégrination", note:"long voyage, souvent avec détours" },
      { mot:"vagabondage", note:"fait d'errer sans domicile ni but" } ] },

  { theme: "Rêve & sommeil", motsClefs: ["rêve","sommeil","dormir"],
    mots: [
      { mot:"songe", note:"rêve (littéraire, « faire un songe »)" },
      { mot:"torpeur", note:"engourdissement, somnolence profonde" },
      { mot:"chimère", note:"illusion, rêve irréalisable" },
      { mot:"assoupissement", note:"fait de s'endormir à moitié" } ] },

  { theme: "Destin", motsClefs: ["destin","sort","destinée"],
    mots: [
      { mot:"fatum", note:"le destin inéluctable (mot latin utilisé en littérature)" },
      { mot:"augure", note:"signe qui annonce l'avenir" },
      { mot:"présage", note:"signe annonciateur" } ] },

  { theme: "Âme & esprit", motsClefs: ["âme","esprit"],
    mots: [
      { mot:"tréfonds", note:"partie la plus profonde et cachée (d'un sentiment, de l'âme)" },
      { mot:"for intérieur", note:"la conscience la plus intime" } ] },

  { theme: "Larmes", motsClefs: ["larme","larmes","pleurer"],
    mots: [
      { mot:"sanglot", note:"pleur bruyant, entrecoupé de hoquets" },
      { mot:"pleur", note:"larme (littéraire, souvent au pluriel « des pleurs »)" } ] },

  { theme: "Sang & blessure", motsClefs: ["sang","blessure","rouge"],
    mots: [
      { mot:"vermeil", note:"rouge vif, couleur du sang (littéraire)" },
      { mot:"pourpre", note:"rouge très vif, couleur royale" },
      { mot:"stigmate", note:"marque laissée par une blessure" },
      { mot:"meurtrissure", note:"marque laissée par un coup" } ] },

  { theme: "Guerre & chevalerie (médiéval)", motsClefs: ["guerre","combat","épée","chevalier"],
    mots: [
      { mot:"glaive", note:"épée (littéraire, biblique)" },
      { mot:"heaume", note:"casque du chevalier médiéval couvrant tout le visage" },
      { mot:"destrier", note:"cheval de bataille du chevalier" },
      { mot:"joute", note:"combat singulier à cheval (tournoi médiéval)" },
      { mot:"preux", note:"brave, vaillant (« preux chevalier »)" },
      { mot:"oriflamme", note:"bannière, étendard" },
      { mot:"estoc", note:"pointe de l'épée (« frapper d'estoc et de taille »)" } ] },

  { theme: "Château & Moyen Âge", motsClefs: ["château","moyen-âge","moyen age","seigneur"],
    mots: [
      { mot:"donjon", note:"tour principale d'un château fort" },
      { mot:"créneau", note:"ouverture dans un rempart pour tirer à l'abri" },
      { mot:"douve", note:"fossé rempli d'eau autour d'un château" },
      { mot:"poterne", note:"petite porte dérobée dans une fortification" },
      { mot:"écuyer", note:"jeune noble au service d'un chevalier" },
      { mot:"vassal", note:"celui qui doit fidélité à un seigneur" },
      { mot:"suzerain", note:"seigneur dont dépendent des vassaux" },
      { mot:"trouvère", note:"poète-musicien médiéval du nord de la France" },
      { mot:"ménestrel", note:"musicien-poète ambulant du Moyen Âge" },
      { mot:"damoiselle", note:"jeune fille noble non mariée" } ] },

  { theme: "Vocabulaire désuet & archaïque", motsClefs: ["vieux","désuet","archaïque","ancien"],
    mots: [
      { mot:"jadis", note:"autrefois, il y a longtemps" },
      { mot:"naguère", note:"il y a peu de temps (souvent confondu avec « jadis »)" },
      { mot:"céans", note:"ici, dans cette maison (« le maître de céans »)" },
      { mot:"ouïr", note:"entendre (verbe archaïque)" },
      { mot:"moult", note:"beaucoup (très archaïque, médiéval)" },
      { mot:"icelui, icelle", note:"celui-ci, celle-ci (archaïque, juridique)" },
      { mot:"derechef", note:"de nouveau, une seconde fois" },
      { mot:"adonc", note:"alors, donc (très archaïque)" },
      { mot:"quérir", note:"chercher, aller chercher (« aller quérir »)" },
      { mot:"forban", note:"pirate, hors-la-loi" },
      { mot:"gent, gente", note:"gracieux, gentil (« la gent dame »)" } ] },

  { theme: "Automne", motsClefs: ["automne","feuilles mortes"],
    mots: [
      { mot:"effeuillaison", note:"chute des feuilles" },
      { mot:"glaner", note:"ramasser ce qui reste après la récolte (aussi figuré)" } ] },

  { theme: "Hiver", motsClefs: ["hiver","froid","neige","gel"],
    mots: [
      { mot:"frimas", note:"brouillard givrant, froid rigoureux (souvent « les frimas de l'hiver »)" },
      { mot:"givre", note:"fine couche de glace qui couvre les objets par temps froid" } ] },

  { theme: "Printemps", motsClefs: ["printemps","renaissance"],
    mots: [
      { mot:"éclosion", note:"fait de s'ouvrir, de naître (aussi figuré)" },
      { mot:"renouveau", note:"retour de la vie, du printemps (aussi figuré)" },
      { mot:"sève", note:"liquide nourricier des plantes (aussi figuré, « la sève de la jeunesse »)" } ] },

  { theme: "Montagne", motsClefs: ["montagne","sommet","pic"],
    mots: [
      { mot:"cime", note:"sommet d'une montagne ou d'un arbre" },
      { mot:"escarpement", note:"pente raide et abrupte" },
      { mot:"contrefort", note:"chaîne secondaire au pied d'une montagne" } ] },

  { theme: "Poésie & écriture", motsClefs: ["poésie","poème","écrire","plume"],
    mots: [
      { mot:"muse", note:"source d'inspiration (mythologique)" },
      { mot:"élégie", note:"poème mélancolique, souvent sur la perte" },
      { mot:"ode", note:"poème lyrique célébrant quelque chose" },
      { mot:"calame", note:"roseau taillé servant à écrire dans l'Antiquité" },
      { mot:"parchemin", note:"peau préparée pour écrire (médiéval, antique)" } ] }
];
const CHAMPS_LEXICAUX = CHAMPS_LEXICAUX_BASE.slice();

function trouveFamille(mot){
  const w = normaliseMot(mot);
  const wSansS = (w.endsWith('s') && !w.endsWith('ss') && w.length > 2) ? w.slice(0, -1) : null;
  let meilleure = null, longueurMax = 0;
  FAMILLES.forEach(fam => {
    fam.terms.forEach(t => {
      if ((w.endsWith(t) || (wSansS && wSansS.endsWith(t))) && t.length > longueurMax) {
        meilleure = fam; longueurMax = t.length;
      }
    });
  });
  return meilleure;
}

/* Recherche d'inspiration : on cherche le(s) thème(s) dont un des
   mots-clés correspond exactement au mot saisi ; à défaut, on tente
   une correspondance partielle (le mot-clé contient la saisie ou
   l'inverse), utile pour les pluriels ou variantes non listées. */
function sansAccents(s){
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Normalisation "souple" pour la recherche d'inspiration : ignore les
// accents et un éventuel -s final de pluriel simple.
function normaliseSouple(mot){
  let s = sansAccents(normaliseMot(mot));
  if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) s = s.slice(0, -1);
  return s;
}

function chercheInspiration(motSaisi){
  const w = normaliseMot(motSaisi);
  const wSouple = normaliseSouple(motSaisi);
  if (!w) return [];

  const exacts = CHAMPS_LEXICAUX.filter(champ =>
    champ.motsClefs.some(k => normaliseMot(k) === w || normaliseSouple(k) === wSouple)
  );
  if (exacts.length > 0) return exacts;

  const partiels = CHAMPS_LEXICAUX.filter(champ =>
    champ.motsClefs.some(k => {
      const kn = normaliseSouple(k);
      return kn.length > 3 && (kn.includes(wSouple) || wSouple.includes(kn));
    })
  );
  return partiels;
}

/* =========================================================
   SYNONYMES & ANTONYMES
   ========================================================= */
const SYNONYMES_BASE = [
  { mot:"beau", synonymes:["magnifique","splendide","superbe","radieux","ravissant"], antonymes:["laid","hideux","affreux"] },
  { mot:"laid", synonymes:["hideux","affreux","difforme","disgracieux"], antonymes:["beau","splendide"] },
  { mot:"grand", synonymes:["immense","vaste","colossal","gigantesque"], antonymes:["petit","minuscule","infime"] },
  { mot:"petit", synonymes:["minuscule","infime","menu","chétif"], antonymes:["grand","immense","vaste"] },
  { mot:"fort", synonymes:["puissant","robuste","vigoureux","solide"], antonymes:["faible","fragile","chétif"] },
  { mot:"faible", synonymes:["fragile","chétif","débile","frêle"], antonymes:["fort","puissant","robuste"] },
  { mot:"joyeux", synonymes:["gai","heureux","allègre","radieux","jubilant"], antonymes:["triste","morose","chagrin"] },
  { mot:"triste", synonymes:["mélancolique","morose","chagrin","affligé","sombre"], antonymes:["joyeux","gai","radieux"] },
  { mot:"aimer", synonymes:["chérir","adorer","affectionner","idolâtrer"], antonymes:["haïr","détester","abhorrer"] },
  { mot:"haïr", synonymes:["détester","abhorrer","exécrer","abominer"], antonymes:["aimer","chérir","adorer"] },
  { mot:"lumière", synonymes:["clarté","éclat","lueur","luminosité"], antonymes:["obscurité","ténèbres","ombre"] },
  { mot:"obscurité", synonymes:["ténèbres","noirceur","pénombre"], antonymes:["lumière","clarté","éclat"] },
  { mot:"vie", synonymes:["existence","souffle","destinée"], antonymes:["mort","trépas","néant"] },
  { mot:"mort", synonymes:["trépas","décès","fin","néant"], antonymes:["vie","naissance","existence"] },
  { mot:"jeune", synonymes:["juvénile","adolescent","nouveau"], antonymes:["vieux","âgé","ancien"] },
  { mot:"vieux", synonymes:["âgé","ancien","antique","suranné"], antonymes:["jeune","nouveau","neuf"] },
  { mot:"rapide", synonymes:["vif","prompt","fulgurant","véloce"], antonymes:["lent","lourd","poussif"] },
  { mot:"lent", synonymes:["lourd","poussif","languissant"], antonymes:["rapide","vif","prompt"] },
  { mot:"chaud", synonymes:["brûlant","ardent","torride","tiède"], antonymes:["froid","glacial","gelé"] },
  { mot:"froid", synonymes:["glacial","gelé","frais","glacé"], antonymes:["chaud","brûlant","torride"] },
  { mot:"doux", synonymes:["tendre","suave","délicat","moelleux"], antonymes:["dur","rude","âpre"] },
  { mot:"dur", synonymes:["rude","âpre","rigide","sévère"], antonymes:["doux","tendre","suave"] },
  { mot:"calme", synonymes:["paisible","serein","tranquille","apaisé"], antonymes:["agité","tumultueux","fébrile"] },
  { mot:"agité", synonymes:["tumultueux","fébrile","houleux","turbulent"], antonymes:["calme","paisible","serein"] },
  { mot:"riche", synonymes:["fortuné","opulent","aisé","prospère"], antonymes:["pauvre","démuni","indigent"] },
  { mot:"pauvre", synonymes:["démuni","indigent","misérable","besogneux"], antonymes:["riche","fortuné","opulent"] },
  { mot:"libre", synonymes:["indépendant","affranchi","dégagé"], antonymes:["captif","prisonnier","asservi"] },
  { mot:"captif", synonymes:["prisonnier","enchaîné","asservi"], antonymes:["libre","indépendant","affranchi"] },
  { mot:"vrai", synonymes:["véritable","authentique","sincère","réel"], antonymes:["faux","mensonger","factice"] },
  { mot:"faux", synonymes:["mensonger","factice","trompeur","illusoire"], antonymes:["vrai","authentique","sincère"] },
  { mot:"pur", synonymes:["limpide","immaculé","candide","intact"], antonymes:["impur","souillé","corrompu"] },
  { mot:"silence", synonymes:["mutisme","calme","quiétude"], antonymes:["bruit","vacarme","tumulte"] },
  { mot:"bruit", synonymes:["vacarme","tumulte","fracas","brouhaha"], antonymes:["silence","calme","quiétude"] },
  { mot:"proche", synonymes:["voisin","proximité","attenant"], antonymes:["lointain","distant","éloigné"] },
  { mot:"lointain", synonymes:["distant","éloigné","reculé"], antonymes:["proche","voisin","attenant"] },
  { mot:"commencer", synonymes:["débuter","entamer","amorcer","engager"], antonymes:["finir","achever","terminer"] },
  { mot:"finir", synonymes:["achever","terminer","conclure","clore"], antonymes:["commencer","débuter","entamer"] },
  { mot:"monter", synonymes:["grimper","s'élever","gravir","escalader"], antonymes:["descendre","dévaler","chuter"] },
  { mot:"descendre", synonymes:["dévaler","chuter","tomber"], antonymes:["monter","s'élever","gravir"] },
  { mot:"ouvrir", synonymes:["déployer","dévoiler","entrouvrir"], antonymes:["fermer","clore","refermer"] },
  { mot:"fermer", synonymes:["clore","refermer","verrouiller"], antonymes:["ouvrir","déployer","dévoiler"] },
  { mot:"donner", synonymes:["offrir","céder","octroyer"], antonymes:["prendre","ôter","retirer"] },
  { mot:"prendre", synonymes:["saisir","s'emparer","capturer"], antonymes:["donner","offrir","céder"] },
  { mot:"espoir", synonymes:["espérance","confiance","attente"], antonymes:["désespoir","désillusion","abattement"] },
  { mot:"désespoir", synonymes:["désillusion","abattement","accablement"], antonymes:["espoir","espérance","confiance"] },
  { mot:"courage", synonymes:["bravoure","vaillance","hardiesse","témérité"], antonymes:["lâcheté","peur","couardise"] },
  { mot:"lâcheté", synonymes:["couardise","pusillanimité"], antonymes:["courage","bravoure","vaillance"] },
  { mot:"sagesse", synonymes:["prudence","raison","discernement"], antonymes:["folie","démence","déraison"] },
  { mot:"folie", synonymes:["démence","déraison","délire"], antonymes:["sagesse","raison","prudence"] },
  { mot:"paix", synonymes:["harmonie","sérénité","concorde"], antonymes:["guerre","conflit","discorde"] },
  { mot:"guerre", synonymes:["conflit","combat","bataille"], antonymes:["paix","harmonie","concorde"] },
  { mot:"ombre", synonymes:["obscurité","pénombre","ténèbres"], antonymes:["lumière","clarté","éclat"] },
  { mot:"vide", synonymes:["creux","vacant","dépouillé"], antonymes:["plein","comblé","rempli"] },
  { mot:"plein", synonymes:["comblé","rempli","empli"], antonymes:["vide","creux","vacant"] },
  { mot:"éphémère", synonymes:["fugace","passager","transitoire"], antonymes:["éternel","perpétuel","durable"] },
  { mot:"éternel", synonymes:["perpétuel","durable","immortel"], antonymes:["éphémère","fugace","passager"] },
  { mot:"immense", synonymes:["colossal","gigantesque","démesuré"], antonymes:["minuscule","infime","microscopique"] },
  { mot:"clair", synonymes:["lumineux","limpide","transparent"], antonymes:["sombre","obscur","opaque"] },
  { mot:"sombre", synonymes:["obscur","ténébreux","opaque"], antonymes:["clair","lumineux","limpide"] },
  { mot:"heureux", synonymes:["joyeux","comblé","radieux","satisfait"], antonymes:["malheureux","misérable","accablé"] },
  { mot:"malheureux", synonymes:["misérable","accablé","infortuné"], antonymes:["heureux","comblé","radieux"] },
  { mot:"beauté", synonymes:["splendeur","grâce","charme","éclat"], antonymes:["laideur","difformité"] },
  { mot:"tendresse", synonymes:["affection","douceur","attachement"], antonymes:["dureté","froideur","indifférence"] },
  { mot:"souvenir", synonymes:["mémoire","réminiscence","évocation"], antonymes:["oubli"] },
  { mot:"oubli", synonymes:["amnésie","effacement"], antonymes:["souvenir","mémoire"] }
];
const SYNONYMES = SYNONYMES_BASE.slice();

/* =========================================================
   MOTS RARES & OUBLIÉS — pour l'onglet "Hasard"
   Une réserve de mots peu courants, littéraires, savants ou
   désuets, à tirer au hasard pour la surprise et l'inspiration.
   ========================================================= */
const MOTS_RARES_BASE = [
  { mot:"s'ennuiter", note:"se dit du jour qui tombe, qui devient nuit (verbe rare, poétique)" },
  { mot:"smaragdin", note:"vert émeraude" },
  { mot:"coruscant", note:"qui brille d'un éclat vif et scintillant" },
  { mot:"pétrichor", note:"odeur caractéristique de la terre après la pluie" },
  { mot:"acrimonie", note:"aigreur, âpreté dans le ton ou le comportement" },
  { mot:"aubade", note:"musique donnée à l'aube sous les fenêtres de quelqu'un" },
  { mot:"absidiole", note:"petite chapelle secondaire d'une église, autour du chœur" },
  { mot:"brumasser", note:"bruiner très légèrement, faire une brume fine" },
  { mot:"cénacle", note:"petit cercle fermé d'intellectuels ou d'artistes" },
  { mot:"dulcifier", note:"adoucir (vieilli)" },
  { mot:"élucubration", note:"réflexion compliquée et peu raisonnable" },
  { mot:"entéléchie", note:"réalisation parfaite et achevée d'une potentialité (philosophie)" },
  { mot:"fatidique", note:"qui semble marqué, fixé par le destin" },
  { mot:"fuligineux", note:"qui a la couleur ou l'aspect de la suie, noirâtre" },
  { mot:"gongoriser", note:"parler ou écrire de façon précieuse et ampoulée" },
  { mot:"hiémal", note:"relatif à l'hiver (très rare, savant)" },
  { mot:"ignivome", note:"qui vomit du feu (se dit d'un volcan)" },
  { mot:"irisation", note:"jeu de couleurs changeantes comme celles de l'arc-en-ciel" },
  { mot:"lambrequin", note:"bande d'étoffe ou de bois décorative retombante" },
  { mot:"lancinant", note:"qui cause une douleur ou une pensée persistante et obsédante" },
  { mot:"liminaire", note:"placé au tout début, qui sert d'introduction" },
  { mot:"mordoré", note:"brun chaud aux reflets dorés" },
  { mot:"musarder", note:"flâner sans but précis, perdre son temps agréablement" },
  { mot:"nacré", note:"qui a l'éclat chatoyant de la nacre" },
  { mot:"nébuleux", note:"couvert de nuages ; par extension, confus, obscur" },
  { mot:"noctambule", note:"qui aime sortir, errer la nuit" },
  { mot:"nyctalope", note:"qui voit bien dans l'obscurité" },
  { mot:"opalin", note:"qui a la teinte laiteuse et changeante de l'opale" },
  { mot:"oripeaux", note:"vieux vêtements usés mais encore voyants" },
  { mot:"palimpseste", note:"manuscrit dont on a effacé le texte pour en écrire un autre" },
  { mot:"persifler", note:"se moquer de quelqu'un avec une ironie légère" },
  { mot:"ponant", note:"l'ouest, le couchant (poétique, vocabulaire marin)" },
  { mot:"rutilant", note:"qui brille d'un éclat rouge ou doré très vif" },
  { mot:"tarabiscoté", note:"excessivement orné, compliqué à l'excès" },
  { mot:"vespéral", note:"qui a rapport au soir, qui se produit le soir" },
  { mot:"cacophonie", note:"mélange discordant de sons ou de voix" },
  { mot:"catoptrique", note:"relatif aux miroirs, aux images réfléchies" },
  { mot:"chatoiement", note:"reflet changeant qui joue à la surface d'une étoffe, d'une pierre" },
  { mot:"crépusculaire", note:"relatif au crépuscule, à la lumière incertaine du soir" },
  { mot:"désopilant", note:"qui fait rire aux éclats" },
  { mot:"diaphane", note:"si fin qu'il laisse passer la lumière, presque transparent" },
  { mot:"ébouriffant", note:"qui surprend au point de décoiffer, extraordinaire" },
  { mot:"écarlate", note:"rouge vif et éclatant" },
  { mot:"effluve", note:"émanation légère, souvent odorante, qui se dégage de quelque chose" },
  { mot:"élégiaque", note:"empreint d'une tristesse tendre et mélancolique" },
  { mot:"éphélides", note:"terme savant pour désigner les taches de rousseur" },
  { mot:"esquif", note:"petite embarcation légère (littéraire)" },
  { mot:"forfaire", note:"manquer gravement à son devoir, à sa parole (vieilli)" },
  { mot:"fugace", note:"qui disparaît très vite, éphémère" },
  { mot:"funambule", note:"acrobate qui marche sur un fil ; par extension, qui prend des risques" },
  { mot:"galimatias", note:"discours ou texte confus, embrouillé" },
  { mot:"gouailleur", note:"qui se moque avec un air moqueur et populaire" },
  { mot:"immarcescible", note:"qui ne peut se flétrir, impérissable (très littéraire)" },
  { mot:"inextinguible", note:"qu'on ne peut éteindre ni apaiser" },
  { mot:"languide", note:"qui exprime une langueur douce et alanguie" },
  { mot:"lippée", note:"repas copieux et savoureux, pris avec plaisir" },
  { mot:"loquace", note:"qui parle beaucoup et avec aisance" },
  { mot:"lumignon", note:"petite lumière faible, bout de bougie qui brûle encore" },
  { mot:"maussade", note:"qui manifeste de la mauvaise humeur, morose" },
  { mot:"myriade", note:"quantité immense et innombrable" },
  { mot:"nyctalopie", note:"faculté de bien voir la nuit (forme nominale de nyctalope)" },
  { mot:"obombrer", note:"couvrir d'ombre, assombrir (vieilli, littéraire)" },
  { mot:"pantois", note:"stupéfait au point d'en rester sans voix" },
  { mot:"pérenne", note:"qui dure toujours, qui ne cesse pas" },
  { mot:"pusillanime", note:"qui manque de courage, craintif à l'excès" },
  { mot:"rocambolesque", note:"extraordinaire, invraisemblable comme une aventure de roman" },
  { mot:"sibyllin", note:"dont le sens est obscur, énigmatique" },
  { mot:"sinuosité", note:"suite de courbes, de détours" },
  { mot:"stochastique", note:"qui relève du hasard, régi par le hasard (savant)" },
  { mot:"tergiverser", note:"user de détours pour éviter de se prononcer" },
  { mot:"vagissement", note:"cri faible et plaintif du nouveau-né" },
  { mot:"volute", note:"forme enroulée en spirale, comme une fumée qui monte" }
];
const MOTS_RARES = MOTS_RARES_BASE.slice();

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

/* =========================================================
   SOURCES EN LIGNE (synonymes/antonymes)
   Chaque source expose : id, nom, url(mot), chercher(mot) -> Promise<{synonymes, antonymes}>
   Ajouter une nouvelle source = ajouter une entrée ici + à
   SOURCES_EN_LIGNE_ORDRE. requestUrl (API Obsidian) est utilisé
   plutôt que fetch() : il fonctionne sans restriction CORS, sur
   ordinateur comme sur mobile.
   ========================================================= */

function extraitLiensDepuisSegment(html, motExclu){
  const mots = [];
  const regex = /<a\b[^>]*>([^<]+)<\/a>/gi;
  let m;
  while ((m = regex.exec(html))) {
    const texte = m[1].replace(/&amp;/g, '&').replace(/&eacute;/g, 'é').trim();
    if (texte && normaliseMot(texte) !== normaliseMot(motExclu || '')) {
      mots.push(texte);
    }
  }
  return [...new Set(mots)];
}

/* Certains sites bloquent ou traitent différemment les requêtes sans
   en-tête User-Agent de navigateur (ce que requestUrl n'envoie pas par
   défaut). On l'ajoute systématiquement pour toutes les sources en ligne. */
const ENTETES_NAVIGATEUR = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9'
};

async function chercheSynonymesWiktionnaire(mot){
  const url = `https://fr.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(mot)}&format=json&prop=wikitext&origin=*`;
  const reponse = await requestUrl({ url, headers: ENTETES_NAVIGATEUR, throw: false });
  if (reponse.status !== 200) throw new Error(`HTTP ${reponse.status}`);
  const data = reponse.json;
  if (!data || data.error || !data.parse) return { synonymes: [], antonymes: [], trouve: false };

  const wikitextComplet = (data.parse.wikitext && data.parse.wikitext['*']) || '';

  // La page Wiktionnaire d'un mot couvre TOUTES les langues qui l'utilisent
  // (ex. "rage" existe aussi en néerlandais, en anglais...), chacune dans sa
  // propre section "== {{langue|xx}} ==". Sans ce découpage, une recherche
  // de "{{S|synonymes}}" sur le texte entier pouvait remonter la section
  // d'une tout autre langue si le français n'a pas cette sous-section.
  const isoleSectionLangue = (wikitext, langue) => {
    const m = new RegExp('==\\s*\\{\\{langue\\|' + langue + '\\}\\}\\s*==', 'i').exec(wikitext);
    if (!m) return wikitext; // repli : découpage par langue introuvable, on garde tout comme avant
    const debut = m.index + m[0].length;
    const suite = wikitext.slice(debut);
    const finMatch = suite.match(/\n==[^=]/); // prochain titre de niveau 2 = langue suivante
    return finMatch ? suite.slice(0, finMatch.index) : suite;
  };

  const wikitext = isoleSectionLangue(wikitextComplet, 'fr');

  const extraitSection = (nomSection) => {
    const regexDebut = new RegExp('\\{\\{S\\|' + nomSection + '[^}]*\\}\\}', 'i');
    const m = regexDebut.exec(wikitext);
    if (!m) return [];
    const debut = m.index + m[0].length;
    const suite = wikitext.slice(debut);
    const finMatch = suite.match(/\n==|\{\{S\|/);
    const bloc = finMatch ? suite.slice(0, finMatch.index) : suite.slice(0, 1000);
    const mots = [];
    let mm;
    const reLien = /\{\{lien\|([^|}]+)/g;
    while ((mm = reLien.exec(bloc))) mots.push(mm[1]);
    const reL = /\{\{l\|([^|}]+)/g;
    while ((mm = reL.exec(bloc))) mots.push(mm[1]);
    const reCrochets = /\[\[([^\]|#]+)/g;
    while ((mm = reCrochets.exec(bloc))) mots.push(mm[1]);
    return [...new Set(mots.map(s => s.trim()).filter(Boolean))]
      .filter(s => normaliseMot(s) !== normaliseMot(mot));
  };

  return {
    synonymes: extraitSection('synonymes'),
    antonymes: extraitSection('antonymes'),
    trouve: true
  };
}

async function chercheSynonymesCrisco(mot){
  const url = `https://crisco4.unicaen.fr/des/synonymes/${encodeURIComponent(mot)}`;
  const reponse = await requestUrl({ url, headers: ENTETES_NAVIGATEUR, throw: false });
  if (reponse.status !== 200) throw new Error(`HTTP ${reponse.status}`);
  const html = reponse.text || '';

  if (!/synonymes\//i.test(html)) return { synonymes: [], antonymes: [], trouve: false };

  const synMatch = html.match(/(\d+)\s*synonymes?/i);
  const antoMatch = html.match(/(\d+)\s*antonymes?/i);
  const finSection = html.search(/Classement des premiers synonymes/i);

  let synonymes = [];
  if (synMatch) {
    const debut = synMatch.index + synMatch[0].length;
    let fin = antoMatch ? antoMatch.index : (finSection !== -1 ? finSection : debut + 4000);
    if (fin < debut) fin = debut + 4000;
    synonymes = extraitLiensDepuisSegment(html.slice(debut, fin), mot);
  }

  let antonymes = [];
  if (antoMatch) {
    const debut = antoMatch.index + antoMatch[0].length;
    const fin = finSection !== -1 && finSection > debut ? finSection : debut + 2000;
    antonymes = extraitLiensDepuisSegment(html.slice(debut, fin), mot);
  }

  return { synonymes, antonymes, trouve: synMatch || antoMatch ? true : false };
}

const SOURCES_EN_LIGNE = {
  wiktionnaire: { id: 'wiktionnaire', nom: 'Wiktionnaire', chercher: chercheSynonymesWiktionnaire },
  crisco: { id: 'crisco', nom: 'CRISCO', chercher: chercheSynonymesCrisco }
};
const SOURCES_EN_LIGNE_ORDRE = ['wiktionnaire', 'crisco'];

/* =========================================================
   CNRTL (Trésor de la Langue Française informatisé)
   Définitions riches + étymologie, à la demande uniquement
   (onglet "Définitions" dédié, pas de recherche automatique).
   ========================================================= */
function texteBrutDepuisHtml(html){
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/* Le CNRTL affiche depuis peu (annonce de refonte du portail au 1er
   septembre 2026) un bandeau d'annonce suivi d'un menu de navigation qui
   peut se retrouver capturé AVANT la vraie définition selon la page. On le
   retire s'il est présent, en se basant sur des repères de texte stables
   plutôt que sur une position fixe (le bandeau disparaîtra peut-être un
   jour, mais ce nettoyage restera inoffensif s'il n'y a rien à retirer). */
function retireBoilerplateCnrtl(texte){
  const debutBandeau = texte.indexOf('Chers usagers du portail lexical');
  if (debutBandeau === -1) return texte;
  const reperesFin = ['Police de caractères', 'Concordance Aide', 'DMF ('];
  let finBandeau = -1, repereTrouve = '';
  reperesFin.forEach(rep => {
    const idx = texte.indexOf(rep, debutBandeau);
    if (idx !== -1 && idx > finBandeau) { finBandeau = idx; repereTrouve = rep; }
  });
  if (finBandeau === -1) return texte; // rien de fiable trouvé, on ne touche à rien
  return texte.slice(0, debutBandeau) + texte.slice(finBandeau + repereTrouve.length);
}

async function chercheCnrtl(mot){
  const url = `https://www.cnrtl.fr/definition/${encodeURIComponent(mot)}`;
  const reponse = await requestUrl({ url, headers: ENTETES_NAVIGATEUR, throw: false });
  if (reponse.status !== 200) throw new Error(`HTTP ${reponse.status}`);
  const html = reponse.text || '';
  if (/n['’]a pas été trouvé|(?:la|cette) forme[\s\S]{0,60}introuvable/i.test(html)) {
    return { trouve: false, url };
  }

  let texte = texteBrutDepuisHtml(html);
  texte = retireBoilerplateCnrtl(texte);
  const motMaj = mot.toUpperCase();

  // Le vrai début de l'article se reconnaît à "MOT," (ou "MOT1,", "MOT2,"
  // pour les homographes numérotés par le TLFi, ex. "ombre" = OMBRE1 le
  // phénomène optique / OMBRE2 le poisson) suivi d'une catégorie
  // grammaticale — parfois avec la forme féminine intercalée juste avant
  // ("DRACONIEN¹, IENNE, adj."). Le numéro d'homographe peut être un
  // chiffre normal ou un chiffre en exposant unicode (¹²³... non reconnus
  // par \d), et — quand il est rendu via une balise <sup> dans le HTML
  // source — se retrouve entouré d'espaces après le nettoyage des balises
  // (chaque balise est remplacée par un espace), d'où les \s* de part et
  // d'autre. On ne se rabat sur "MOT " (sans virgule) qu'en dernier
  // recours, car ce motif plus large peut aussi matcher un simple titre de
  // page ("OMBRE : Définition de OMBRE") plutôt que le vrai contenu.
  const regexDebut = new RegExp(motMaj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[0-9¹²³⁰⁴⁵⁶⁷⁸⁹]{0,2}\\s*,');
  const matchDebut = regexDebut.exec(texte);
  let debutArticle = matchDebut ? matchDebut.index : -1;
  if (debutArticle === -1) debutArticle = texte.indexOf(motMaj + ' ');
  const etymIdx = texte.indexOf('Étymol. et Hist.');

  let definition = '';
  if (debutArticle !== -1) {
    const finDef = etymIdx !== -1 ? etymIdx : debutArticle + 1000;
    definition = texte.slice(debutArticle, Math.min(finDef, debutArticle + 1000)).replace(/\s+/g, ' ').trim();
  }

  let etymologie = '';
  if (etymIdx !== -1) {
    const freqIdx = texte.indexOf('Fréq. abs.', etymIdx);
    const bbgIdx = texte.indexOf('Bbg.', etymIdx);
    let finEtym = etymIdx + 900;
    if (freqIdx !== -1 && freqIdx < finEtym) finEtym = freqIdx;
    else if (bbgIdx !== -1 && bbgIdx < finEtym) finEtym = bbgIdx;
    etymologie = texte.slice(etymIdx, finEtym).replace(/\s+/g, ' ').trim();
  }

  return { trouve: !!(definition || etymologie), definition, etymologie, url };
}

/* =========================================================
   RIMES SOLIDES (source de rimes en ligne complémentaire)
   ========================================================= */
/* Message d'erreur clair pour une source en ligne en échec, distinguant
   les cas HTTP courants (429 = trop de requêtes, 403 = bloqué, 5xx = souci
   côté site) d'un simple problème réseau/timeout — plus utile que le
   générique "voir la console" pour savoir quoi faire (réessayer tout de
   suite ou plus tard). */
function messageErreurSource(err, nomSource){
  const msg = (err && err.message) || '';
  const mHttp = /^HTTP (\d+)$/.exec(msg);
  if (mHttp) {
    const code = mHttp[1];
    if (code === '429') return `${nomSource} : trop de requêtes envoyées trop vite (code 429) — réessaie dans une minute.`;
    if (code === '403') return `${nomSource} : accès refusé (code 403) — le site bloque peut-être temporairement les requêtes automatisées.`;
    if (code.startsWith('5')) return `${nomSource} : problème du côté du site (code ${code}) — réessaie plus tard.`;
    return `${nomSource} : réponse inattendue du site (code ${code}) — voir la console.`;
  }
  return `${nomSource} : recherche impossible (pas de connexion, site injoignable, ou délai dépassé) — voir la console pour le détail.`;
}

async function chercheRimesSolides(mot){
  const url = `https://www.rimessolides.com/rime.aspx?m=${encodeURIComponent(mot)}`;
  const reponse = await requestUrl({ url, headers: ENTETES_NAVIGATEUR, throw: false });
  if (reponse.status !== 200) throw new Error(`HTTP ${reponse.status}`);
  const html = reponse.text || '';
  if (!/rime\.aspx\?m=/i.test(html)) {
    // Signes typiques d'un blocage anti-bot/rate-limit plutôt que d'un
    // vrai changement de format de page (utile pour distinguer les deux
    // la prochaine fois que ça arrive, avant de retoucher le parsing).
    const indiceBlocage = /captcha|cloudflare|access denied|too many requests|rate limit/i.test(html);
    console.warn('[Carnet du Poète] RimesSolides : page reçue sans résultat reconnaissable pour', JSON.stringify(mot),
      '— longueur de la réponse :', html.length,
      '| indice de blocage anti-bot :', indiceBlocage,
      '| début :', html.slice(0, 200));
    return { mots: [], trouve: false, url };
  }

  const regex = /<a\b[^>]*href="[^"]*rime\.aspx\?m=[^"]*"[^>]*>([^<]+)<\/a>/gi;
  const mots = [];
  let m;
  while ((m = regex.exec(html))) {
    const texte = m[1].trim();
    if (texte && normaliseMot(texte) !== normaliseMot(mot)) mots.push(texte);
  }
  return { mots: [...new Set(mots)], trouve: mots.length > 0, url };
}

function estFeminine(mot){
  let w = normaliseMot(mot);
  if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  // rime féminine : le mot se termine par un e non accentué (vie, joie,
  // écartée, rose...), quelle que soit la lettre qui le précède —
  // contrairement à une précédente version, un e précédé d'une voyelle
  // (comme dans "vie" ou "écartée") compte aussi comme féminin.
  return w.endsWith('e');
}

/* Genre de la rime d'un vers : féminine si le dernier mot se termine par
   un e muet (ou -es/-ent qui s'y ramène), masculine sinon. C'est le
   dernier mot du vers qui compte, pas forcément le dernier "détail"
   analysé (la ponctuation pure est déjà filtrée par analyseLigne). */
function genreDuVers(details){
  if (!details || details.length === 0) return null;
  const dernier = details[details.length - 1].mot;
  return estFeminine(dernier) ? 'F' : 'M';
}

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

async function trouveEtLisDictionnairePerso(plugin){
  const adapter = plugin.app.vault.adapter;
  const configDir = plugin.app.vault.configDir; // en général ".obsidian", mais peut être renommé
  const pluginDir = plugin.manifest.dir || `${configDir}/plugins/${plugin.manifest.id}`;
  const nomFichier = 'dictionnaire-perso.json';

  // 0) Chemin personnalisé explicitement configuré dans les réglages du
  //    plugin (prioritaire sur tout le reste s'il est renseigné et existe)
  try {
    const data = await plugin.loadData();
    const cheminPerso = data && data.cheminDictionnairePerso && data.cheminDictionnairePerso.trim();
    if (cheminPerso) {
      if (await adapter.exists(cheminPerso)) {
        console.log('[Carnet du Poète] dictionnaire personnel trouvé (chemin personnalisé) :', cheminPerso);
        return await adapter.read(cheminPerso);
      }
      console.warn('[Carnet du Poète] chemin personnalisé configuré mais introuvable :', cheminPerso, '— repli sur la recherche automatique.');
    }
  } catch (e) {
    console.warn('[Carnet du Poète] erreur en lisant le chemin personnalisé configuré', e);
  }

  // 1) Emplacements précis les plus probables, testés directement (rapide,
  //    fonctionne même sur Android où l'exploration de fichiers est limitée)
  const candidats = [
    `${pluginDir}/${nomFichier}`,   // dossier du plugin (installation manuelle)
    `${configDir}/${nomFichier}`,   // racine de .obsidian (dépôt "à la racine du coffre .obsidian")
    nomFichier                      // racine du coffre lui-même
  ];
  for (const chemin of candidats) {
    try {
      if (await adapter.exists(chemin)) {
        console.log('[Carnet du Poète] dictionnaire personnel trouvé :', chemin);
        return await adapter.read(chemin);
      }
    } catch (e) {
      console.warn('[Carnet du Poète] erreur en testant', chemin, e);
    }
  }

  // 2) N'importe où dans le contenu normal du coffre (notes, sous-dossiers)
  try {
    const fichier = plugin.app.vault.getFiles().find(f => f.name === nomFichier);
    if (fichier) {
      console.log('[Carnet du Poète] trouvé dans le coffre :', fichier.path);
      return await plugin.app.vault.read(fichier);
    }
  } catch (e) {
    console.warn('[Carnet du Poète] recherche dans le coffre impossible', e);
  }

  // 3) Recherche récursive dans tout le dossier .obsidian (au cas où le
  //    fichier a été déposé dans un sous-dossier inattendu — dossier
  //    "plugins/" directement, autre plugin, etc.), profondeur limitée
  //    pour rester rapide y compris sur mobile.
  try {
    const trouve = await chercheRecursivementDansDossier(adapter, configDir, nomFichier, 5);
    if (trouve) {
      console.log('[Carnet du Poète] trouvé par recherche récursive dans .obsidian :', trouve);
      return await adapter.read(trouve);
    }
  } catch (e) {
    console.warn('[Carnet du Poète] recherche récursive impossible', e);
  }

  console.log('[Carnet du Poète] dictionnaire personnel introuvable. Emplacements testés :', candidats.join(' | '), '+ tout le coffre + recherche récursive dans', configDir);
  return null;
}

/* Enregistre (ou met à jour) une entrée de synonymes/antonymes dans
   dictionnaire-perso.json : réutilise le fichier existant s'il y en a
   un (peu importe où il a été trouvé), sinon en crée un nouveau à la
   racine du coffre. Recharge ensuite le dictionnaire en mémoire. */
async function enregistreSynonymePerso(plugin, mot, synonymes, antonymes){
  const adapter = plugin.app.vault.adapter;
  let chemin = null;
  let data = {};

  // on retente les mêmes emplacements que trouveEtLisDictionnairePerso,
  // en gardant le chemin cette fois (pas seulement le contenu)
  const configDir = plugin.app.vault.configDir;
  const pluginDir = plugin.manifest.dir || `${configDir}/plugins/${plugin.manifest.id}`;
  chemin = await cheminDictionnairePersoConfigure(plugin);
  if (!chemin) {
    const candidats = [`${pluginDir}/dictionnaire-perso.json`, `${configDir}/dictionnaire-perso.json`, 'dictionnaire-perso.json'];
    for (const c of candidats) {
      if (await adapter.exists(c)) { chemin = c; break; }
    }
  }
  if (!chemin) {
    const fichierVault = plugin.app.vault.getFiles().find(f => f.name === 'dictionnaire-perso.json');
    if (fichierVault) chemin = fichierVault.path;
  }
  if (!chemin) {
    chemin = await chercheRecursivementDansDossier(adapter, configDir, 'dictionnaire-perso.json', 5);
  }

  if (chemin) {
    try {
      const raw = await adapter.read(chemin);
      data = JSON.parse(raw);
      if (!data || typeof data !== 'object') data = {};
    } catch (e) {
      console.warn('[Carnet du Poète] impossible de relire dictionnaire-perso.json existant, un nouveau contenu sera écrit avec prudence', e);
      data = {};
    }
  } else {
    // aucun fichier existant : on en crée un nouveau à la racine du coffre
    chemin = 'dictionnaire-perso.json';
    data = {};
  }

  if (!Array.isArray(data.synonymes)) data.synonymes = [];
  const motNorm = normaliseMot(mot);
  const existante = data.synonymes.find(e => e && normaliseMot(e.mot) === motNorm);
  if (existante) {
    existante.synonymes = [...new Set([...(existante.synonymes || []), ...synonymes])];
    existante.antonymes = [...new Set([...(existante.antonymes || []), ...antonymes])];
  } else {
    data.synonymes.push({ mot, synonymes, antonymes });
  }

  const contenu = JSON.stringify(data, null, 2);
  try {
    if (await adapter.exists(chemin)) {
      await adapter.write(chemin, contenu);
    } else {
      await plugin.app.vault.create(chemin, contenu);
    }
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
  const adapter = plugin.app.vault.adapter;
  let chemin = null;
  let data = {};

  const configDir = plugin.app.vault.configDir;
  const pluginDir = plugin.manifest.dir || `${configDir}/plugins/${plugin.manifest.id}`;
  chemin = await cheminDictionnairePersoConfigure(plugin);
  if (!chemin) {
    const candidats = [`${pluginDir}/dictionnaire-perso.json`, `${configDir}/dictionnaire-perso.json`, 'dictionnaire-perso.json'];
    for (const c of candidats) {
      if (await adapter.exists(c)) { chemin = c; break; }
    }
  }
  if (!chemin) {
    const fichierVault = plugin.app.vault.getFiles().find(f => f.name === 'dictionnaire-perso.json');
    if (fichierVault) chemin = fichierVault.path;
  }
  if (!chemin) {
    chemin = await chercheRecursivementDansDossier(adapter, configDir, 'dictionnaire-perso.json', 5);
  }

  if (chemin) {
    try {
      const raw = await adapter.read(chemin);
      data = JSON.parse(raw);
      if (!data || typeof data !== 'object') data = {};
    } catch (e) {
      console.warn('[Carnet du Poète] impossible de relire dictionnaire-perso.json existant, un nouveau contenu sera écrit avec prudence', e);
      data = {};
    }
  } else {
    chemin = 'dictionnaire-perso.json';
    data = {};
  }

  if (!Array.isArray(data.motsRares)) data.motsRares = [];
  const motNorm = normaliseMot(mot);
  const existante = data.motsRares.find(e => e && normaliseMot(e.mot) === motNorm);
  if (existante) {
    if (note) existante.note = note;
    existante.tags = [...new Set([...(existante.tags || []), ...(tags || [])])];
  } else {
    const entree = { mot, note: note || '' };
    if (tags && tags.length > 0) entree.tags = tags;
    data.motsRares.push(entree);
  }

  const contenu = JSON.stringify(data, null, 2);
  try {
    if (await adapter.exists(chemin)) {
      await adapter.write(chemin, contenu);
    } else {
      await plugin.app.vault.create(chemin, contenu);
    }
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

  const adapter = plugin.app.vault.adapter;
  const configDir = plugin.app.vault.configDir;
  const pluginDir = plugin.manifest.dir || `${configDir}/plugins/${plugin.manifest.id}`;
  let chemin = await cheminDictionnairePersoConfigure(plugin);
  if (!chemin) {
    const candidats = [`${pluginDir}/dictionnaire-perso.json`, `${configDir}/dictionnaire-perso.json`, 'dictionnaire-perso.json'];
    for (const c of candidats) {
      if (await adapter.exists(c)) { chemin = c; break; }
    }
  }
  if (!chemin) {
    const fichierVault = plugin.app.vault.getFiles().find(f => f.name === 'dictionnaire-perso.json');
    if (fichierVault) chemin = fichierVault.path;
  }
  if (!chemin) {
    chemin = await chercheRecursivementDansDossier(adapter, configDir, 'dictionnaire-perso.json', 5);
  }

  let data = {};
  if (chemin) {
    try {
      const raw = await adapter.read(chemin);
      data = JSON.parse(raw);
      if (!data || typeof data !== 'object') data = {};
    } catch (e) {
      console.warn('[Carnet du Poète] impossible de relire dictionnaire-perso.json existant pour la gravure en masse', e);
      data = {};
    }
  } else {
    chemin = 'dictionnaire-perso.json';
    data = {};
  }
  if (!Array.isArray(data.motsRares)) data.motsRares = [];

  let compte = 0;
  motsAvecMeta.forEach(w => {
    const entreeSource = MOTS_RARES_INDEX.get(w);
    const mot = entreeSource ? entreeSource.mot : w;
    const note = entreeSource ? (entreeSource.note || '') : '';
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

  const contenu = JSON.stringify(data, null, 2);
  try {
    if (await adapter.exists(chemin)) {
      await adapter.write(chemin, contenu);
    } else {
      await plugin.app.vault.create(chemin, contenu);
    }
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
  const adapter = plugin.app.vault.adapter;
  let chemin = null;
  let data = {};

  const configDir = plugin.app.vault.configDir;
  const pluginDir = plugin.manifest.dir || `${configDir}/plugins/${plugin.manifest.id}`;
  chemin = await cheminDictionnairePersoConfigure(plugin);
  if (!chemin) {
    const candidats = [`${pluginDir}/dictionnaire-perso.json`, `${configDir}/dictionnaire-perso.json`, 'dictionnaire-perso.json'];
    for (const c of candidats) {
      if (await adapter.exists(c)) { chemin = c; break; }
    }
  }
  if (!chemin) {
    const fichierVault = plugin.app.vault.getFiles().find(f => f.name === 'dictionnaire-perso.json');
    if (fichierVault) chemin = fichierVault.path;
  }
  if (!chemin) {
    chemin = await chercheRecursivementDansDossier(adapter, configDir, 'dictionnaire-perso.json', 5);
  }

  if (chemin) {
    try {
      const raw = await adapter.read(chemin);
      data = JSON.parse(raw);
      if (!data || typeof data !== 'object') data = {};
    } catch (e) {
      console.warn('[Carnet du Poète] impossible de relire dictionnaire-perso.json existant, un nouveau contenu sera écrit avec prudence', e);
      data = {};
    }
  } else {
    chemin = 'dictionnaire-perso.json';
    data = {};
  }

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

  const contenu = JSON.stringify(data, null, 2);
  try {
    if (await adapter.exists(chemin)) {
      await adapter.write(chemin, contenu);
    } else {
      await plugin.app.vault.create(chemin, contenu);
    }
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
  const adapter = plugin.app.vault.adapter;
  const configDir = plugin.app.vault.configDir;
  const pluginDir = plugin.manifest.dir || `${configDir}/plugins/${plugin.manifest.id}`;
  let chemin = await cheminDictionnairePersoConfigure(plugin);
  if (!chemin) {
    const candidats = [`${pluginDir}/dictionnaire-perso.json`, `${configDir}/dictionnaire-perso.json`, 'dictionnaire-perso.json'];
    for (const c of candidats) {
      if (await adapter.exists(c)) { chemin = c; break; }
    }
  }
  if (!chemin) {
    const fichierVault = plugin.app.vault.getFiles().find(f => f.name === 'dictionnaire-perso.json');
    if (fichierVault) chemin = fichierVault.path;
  }
  if (!chemin) {
    chemin = await chercheRecursivementDansDossier(adapter, configDir, 'dictionnaire-perso.json', 5);
  }
  if (!chemin) {
    new Notice('Carnet du Poète : aucun dictionnaire-perso.json trouvé, rien à nettoyer.');
    return;
  }

  let data;
  try {
    const raw = await adapter.read(chemin);
    data = JSON.parse(raw);
    if (!data || typeof data !== 'object') { new Notice('Carnet du Poète : dictionnaire-perso.json invalide, nettoyage annulé.'); return; }
  } catch (e) {
    console.error('[Carnet du Poète] impossible de lire dictionnaire-perso.json pour le nettoyage', e);
    new Notice('Carnet du Poète : impossible de lire le fichier (voir la console).');
    return;
  }

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

  const contenu = JSON.stringify(data, null, 2);
  try {
    await adapter.write(chemin, contenu);
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
  DICO_PHONETIQUE_GROUPES = null;
  PHONETIQUE_MOT = null;
  SYNONYMES_PHONETIQUE = null;

  try {
    const raw = await trouveEtLisDictionnairePerso(plugin);
    if (raw === null) {
      console.log('[Carnet du Poète] aucun dictionnaire-perso.json trouvé (ni dans le dossier du plugin, ni dans le coffre).');
      if (notifierAbsence) {
        new Notice('Carnet du Poète : aucun dictionnaire-perso.json trouvé — ni dans le dossier du plugin, ni à la racine de .obsidian, ni dans le coffre, ni dans les sous-dossiers de .obsidian. Vérifie le nom exact du fichier (voir la console pour le détail).', 8000);
      }
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      console.error('[Carnet du Poète] dictionnaire-perso.json : JSON invalide', parseErr);
      new Notice('Carnet du Poète : dictionnaire-perso.json trouvé mais le JSON est invalide (voir la console pour le détail).');
      return;
    }

    if (!data || typeof data !== 'object') {
      new Notice('Carnet du Poète : dictionnaire-perso.json trouvé, mais son contenu n\'est pas un objet JSON valide.');
      return;
    }

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
        new Notice(`Carnet du Poète : ${raresCount} mot(s) rare(s) personnalisé(s) chargé(s).`);
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
      return;
    }

    // Format B : dictionnaire phonétique complet (objet plat clé -> mots[])
    // Format C : même principe, mais objet plat clé -> { mot -> {phonetique,
    // synonymes, antonymes} } — donne en plus la transcription phonétique
    // complète de chaque mot et ses synonymes/antonymes déjà résolus.
    // (on exclut les clés déjà traitées ci-dessus pour ne pas les confondre
    // avec des groupes de rimes)
    const cles = Object.keys(data).filter(k => k !== 'familles' && k !== 'champsLexicaux' && k !== 'synonymes' && k !== 'motsRares');
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
      });
    });

    DICO_PHONETIQUE = index;
    DICO_PHONETIQUE_GROUPES = groupesPhonetiquesUniquement;
    if (phonMap.size > 0) PHONETIQUE_MOT = phonMap;
    if (synoMap.size > 0) SYNONYMES_PHONETIQUE = synoMap;

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

  const queue = normaliseSonsFinal(w.slice(groupes[idxAncre].debut));
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

/* ===== Moteur de rime phonétique (Format C) =====
   Même principe que le moteur orthographique ci-dessus, mais sur les vrais
   phonèmes SAMPA-like du dictionnaire complet : plus aucune heuristique à
   deviner (pas de ê/è/ei/s→z/glide/doublons — le phonème est déjà le bon),
   utilisé quand les deux mots comparés ont une transcription connue. */

// Voyelles de l'alphabet SAMPA-like utilisé par le dictionnaire (Format C) :
// a i y u o e É(=ɛ) O(=ɔ) 2(=ø) 9(=œ) °(=ə) puis les 4 nasales @/§/5/1.
const VOYELLES_PHON = new Set(['a','i','y','u','o','e','E','O','2','9','°','@','§','5','1']);
// Semi-consonnes : toujours attachées à la voyelle qui suit (jamais coupées).
const GLIDES_PHON = new Set(['j','w','8']);
// Groupes obstruante+liquide valides en attaque de syllabe française.
const CLUSTERS_VALIDES_PHON = new Set(['pl','bl','kl','gl','fl','pR','bR','tR','dR','kR','gR','fR','vR']);

function phonetiqueMot(mot){
  if (DEBUG_IGNORER_DICO_PERSO || !PHONETIQUE_MOT) return null;
  const w = normaliseMot(mot);
  return w ? (PHONETIQUE_MOT.get(w) || null) : null;
}

function estimeSonsCommunsPhon(phonA, phonB){
  let i = phonA.length - 1, j = phonB.length - 1, n = 0;
  while (i >= 0 && j >= 0 && phonA[i] === phonB[j]) { n++; i--; j--; }
  return n;
}

/* Combien de phonèmes (en partant de la fin) d'un groupe de consonnes
   rejoignent l'attaque de la syllabe suivante — même logique que
   pointDeCoupure ci-dessus, adaptée à l'alphabet phonétique : une semi-
   consonne finale s'attache toujours à la voyelle suivante. */
function pointDeCoupurePhon(cons){
  if (cons.length <= 1) return cons.length;
  if (GLIDES_PHON.has(cons[cons.length - 1])) return 1;
  if (CLUSTERS_VALIDES_PHON.has(cons.slice(-2))) return 2;
  return 1;
}

/* Découpe une transcription phonétique complète en syllabes { onset, noyau,
   coda }, un phonème = une unité, sans aucune des approximations requises
   à l'orthographe (pas de e muet à retirer : un phonème absent de la
   transcription n'est simplement pas prononcé). */
function decoupeSyllabesPhonetique(transcription){
  if (!transcription) return [];
  const positions = [];
  for (let i = 0; i < transcription.length; i++) {
    if (VOYELLES_PHON.has(transcription[i])) positions.push(i);
  }
  if (positions.length === 0) return [{ onset: transcription, noyau: '', coda: '' }];

  const n = positions.length;
  const clusters = [];
  for (let i = 0; i < n - 1; i++) {
    clusters.push(transcription.slice(positions[i] + 1, positions[i + 1]));
  }
  const coupures = clusters.map(pointDeCoupurePhon);

  const syllabes = [];
  for (let i = 0; i < n; i++) {
    const onset = i === 0
      ? transcription.slice(0, positions[0])
      : clusters[i - 1].slice(clusters[i - 1].length - coupures[i - 1]);
    const coda = i === n - 1
      ? transcription.slice(positions[n - 1] + 1)
      : clusters[i].slice(0, clusters[i].length - coupures[i]);
    syllabes.push({ onset, noyau: transcription[positions[i]], coda });
  }
  return syllabes;
}

/* Même barème à 5 niveaux que classeRimeOrthographique, mais calculé sur
   les vrais phonèmes plutôt que sur une approximation orthographique. */
function classeRimePhonetique(phonA, phonB){
  const n = estimeSonsCommunsPhon(phonA, phonB);
  if (n <= 1) return 'pauvre';
  if (n === 2) return 'suffisante';

  const sa = decoupeSyllabesPhonetique(phonA), sb = decoupeSyllabesPhonetique(phonB);
  if (sa.length === 0 || sb.length === 0) return 'riche';
  const finA = sa[sa.length - 1], finB = sb[sb.length - 1];
  const syllabeFinaleComplete = finA.onset === finB.onset && finA.coda === finB.coda;
  if (!syllabeFinaleComplete || sa.length < 2 || sb.length < 2) return 'riche';

  const prevA = sa[sa.length - 2], prevB = sb[sb.length - 2];
  if (prevA.noyau !== prevB.noyau) return 'riche';
  return (prevA.onset === prevB.onset && prevA.coda === prevB.coda) ? 'leonine' : 'tresriche';
}

/* Classe une rime en 5 niveaux, du plus faible au plus fort :
   - pauvre      : 1 seul son commun (la voyelle finale)
   - suffisante  : 2 sons communs
   - riche       : 3 sons communs ou plus
   - très riche  : la syllabe finale est intégralement identique (attaque
                   + voyelle + coda) ET la voyelle de la syllabe d'avant
                   coïncide aussi (mais pas son attaque)
   - léonine     : la syllabe finale ET la syllabe d'avant sont toutes
                   les deux intégralement identiques
   Très riche et léonine ne sont que des affinements de "riche" : le seuil
   pauvre/suffisante/riche reste le comptage additif ci-dessus. */
function classeRimeOrthographique(motA, motB){
  const n = estimeSonsCommuns(motA, motB);
  if (n <= 1) return 'pauvre';
  if (n === 2) return 'suffisante';

  const sa = decoupeSyllabesRime(motA), sb = decoupeSyllabesRime(motB);
  if (sa.length === 0 || sb.length === 0) return 'riche';
  const finA = sa[sa.length - 1], finB = sb[sb.length - 1];
  const syllabeFinaleComplete = finA.onset === finB.onset && finA.coda === finB.coda;
  if (!syllabeFinaleComplete || sa.length < 2 || sb.length < 2) return 'riche';

  const prevA = sa[sa.length - 2], prevB = sb[sb.length - 2];
  if (prevA.noyau !== prevB.noyau) return 'riche';
  return (prevA.onset === prevB.onset && prevA.coda === prevB.coda) ? 'leonine' : 'tresriche';
}

/* Point d'entrée unique utilisé partout ailleurs dans le fichier : bascule
   automatiquement sur le moteur phonétique (Format C) quand les DEUX mots
   comparés ont une transcription connue — bien plus fiable, aucune
   approximation — et retombe sur l'heuristique orthographique sinon. */
function classeRime(motA, motB){
  const phonA = phonetiqueMot(motA), phonB = phonetiqueMot(motB);
  if (phonA && phonB) return classeRimePhonetique(phonA, phonB);
  return classeRimeOrthographique(motA, motB);
}

/* Bucket d'affichage/filtrage regroupant très riche et léonine sous
   "riche" pour les 3 filtres principaux de l'UI (les deux distinctions
   plus fines restent des sous-filtres optionnels). */
function classeRimeGroupe(q){
  return (q === 'tresriche' || q === 'leonine') ? 'riche' : q;
}

/* Cherche des assonances pour un mot dans TOUT le dictionnaire phonétique
   (pas seulement le groupe auquel le mot appartient) : deux mots peuvent
   avoir la même voyelle porteuse sans partager la même clé externe
   (ex. "ombre" est dans un groupe, "montre" dans un autre). Coûteux
   (parcourt tout le dictionnaire) donc appelé seulement à la demande
   explicite (recherche + mode assonance activé), jamais en continu. */
function chercheAssonancesDansDico(motSaisi, dejaConnus){
  if (!DICO_PHONETIQUE_GROUPES) return [];
  const exclus = new Set([normaliseMot(motSaisi), ...dejaConnus.map(normaliseMot)]);
  const trouves = new Set();
  for (const cle in DICO_PHONETIQUE_GROUPES) {
    const mots = DICO_PHONETIQUE_GROUPES[cle];
    if (!Array.isArray(mots)) continue;
    for (const m of mots) {
      if (exclus.has(normaliseMot(m)) || trouves.has(m)) continue;
      if (classifieRime(motSaisi, m) === 'assonance') trouves.add(m);
    }
  }
  return [...trouves];
}

function chercheRimes(motSaisi){
  const motLower = (motSaisi || '').trim().toLowerCase();
  const motNorm = normaliseMot(motSaisi);

  if (!DEBUG_IGNORER_DICO_PERSO && DICO_PHONETIQUE && DICO_PHONETIQUE.has(motLower)) {
    const cle = DICO_PHONETIQUE.get(motLower);
    const tousLesMots = (DICO_PHONETIQUE_GROUPES[cle] || [])
      .filter(m => m.toLowerCase() !== motLower)
      // un dictionnaire phonétique externe peut regrouper à tort des mots
      // qui ne riment pas vraiment (ex. "sombre"/"ténèbres" sous une même
      // clé "finit en -bre" sans distinguer la voyelle) — on ne garde que
      // les mots dont la voyelle de fin est réellement compatible.
      .filter(m => memeRime(motSaisi, m));
    if (MODE_ASSONANCE) {
      const assonances = chercheAssonancesDansDico(motSaisi, tousLesMots);
      return { mode: 'exact', cle, mots: [...tousLesMots, ...assonances] };
    }
    return { mode: 'exact', cle, mots: tousLesMots };
  }

  const famille = trouveFamille(motSaisi);
  if (famille) {
    const mots = famille.mots.filter(m => normaliseMot(m) !== motNorm);
    return { mode: 'heuristique', son: famille.son, exemple: famille.exemple, mots };
  }

  return { mode: 'aucun', mots: [] };
}

/* Rendu partagé des résultats de rimes (panneau + fenêtre modale).
   Les groupes phonétiques exacts peuvent contenir plusieurs milliers
   de mots (ex. toutes les conjugaisons en -erai) : on n'affiche que
   les 100 premiers par défaut, avec un bouton pour dérouler le reste. */
const COULEURS_QUALITE = { pauvre: '#7f8c8d', suffisante: '#2980b9', riche: '#c0392b', tresriche: '#8e44ad', leonine: '#d4af37' };
const LABELS_QUALITE = { pauvre: 'pauvre', suffisante: 'suffisante', riche: 'riche', tresriche: 'très riche', leonine: 'léonine' };
const LETTRES_QUALITE = { pauvre: 'P', suffisante: 'S', riche: 'R', tresriche: 'T', leonine: 'L' };
const EXPLICATIONS_QUALITE = {
  pauvre: 'seule la voyelle finale est commune',
  suffisante: 'voyelle + un appui (avant ou après) communs',
  riche: 'syllabe finale entière commune (voyelle + deux appuis)',
  tresriche: 'syllabe finale entière + la voyelle de la syllabe précédente',
  leonine: 'deux syllabes finales entières, communes'
};

function badgeQualite(badgeMot, mot, saisie){
  const q = classeRime(saisie, mot);
  badgeMot.style.borderLeftColor = COULEURS_QUALITE[q];
  const b = badgeMot.createEl('sup', { cls: 'cp-qualite cp-qualite-' + q, text: LETTRES_QUALITE[q] });
  b.setAttr('title', `Rime ${LABELS_QUALITE[q]} — ${EXPLICATIONS_QUALITE[q]} (heuristique phonétique approchée)`);
  b.setAttr('title', `Rime ${q} (approximatif, orthographique)`);
  return q;
}

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
    if (filtres.qualites && filtres.qualites.size > 0 && filtres.qualites.size < 3) {
      l = l.filter(m => filtres.qualites.has(classeRimeGroupe(classeRime(saisie, m))));
    }
    if (filtres.sousQualites && filtres.sousQualites.size > 0) {
      // sous-filtre optionnel : ne restreint que l'intérieur du groupe
      // "riche+" (très riche / léonine), sans jamais exclure pauvre/suffisante
      l = l.filter(m => {
        const q = classeRime(saisie, m);
        return classeRimeGroupe(q) !== 'riche' || filtres.sousQualites.has(q);
      });
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

/* Rendu partagé des résultats d'inspiration (panneau + fenêtre modale). */
/* Bouton "+" à côté d'un mot d'inspiration, ouvrant un petit formulaire
   inline pour l'ajouter à un champ lexical personnel (existant ou
   nouveau, créé à la volée). blocParent = conteneur où insérer le
   formulaire (pleine largeur) ; ligneParent = élément juste après lequel
   le placer. Ne s'affiche pas sans plugin (ex. depuis la fenêtre modale). */
/* Rend un mot d'inspiration cliquable pour le sélectionner/désélectionner
   (accumulation possible à travers plusieurs recherches successives —
   utile pour composer un champ depuis "mer" + "couleur" par exemple).
   selectionApi = { estSelectionne, toggle } fourni par buildPanelInspiration ;
   absent (ex. depuis la fenêtre modale) => mot non cliquable, comportement
   inchangé. */
function rendMotSelectionnable(el, mot, themeSuggere, note, selectionApi){
  if (!selectionApi) return;
  const w = normaliseMot(mot);
  const maj = () => el.toggleClass('cp-selectionne', selectionApi.estSelectionne(w));
  maj();
  el.addClass('cp-inspi-cliquable');
  el.addEventListener('click', () => {
    selectionApi.toggle(mot, themeSuggere, note);
    maj();
  });
}

function renderResultatsInspiration(container, motSaisi, plugin, sourcesActives, selectionApi){
  container.empty();
  const saisie = (motSaisi || '').trim();
  if (!saisie) return;

  const themes = chercheInspiration(saisie);
  if (themes.length === 0) {
    container.createEl('p', {
      cls: 'cp-vide',
      text: `Pas de champ lexical reconnu pour « ${saisie} » — essaie un mot plus général (ex. « forêt », « mer », « nuit », « amour »…) ou ajoute ton propre champ lexical via dictionnaire-perso.json.`
    });
  } else {
    themes.forEach(champ => {
      const bloc = container.createDiv({ cls: 'cp-groupe' });
      bloc.createDiv({ cls: 'cp-son-label', text: champ.theme });
      const liste = bloc.createDiv({ cls: 'cp-inspi-liste' });
      champ.mots.forEach(entree => {
        const ligne = liste.createDiv({ cls: 'cp-inspi-mot' });
        const terme = ligne.createSpan({ cls: 'cp-inspi-terme', text: entree.mot });
        if (entree.note) {
          ligne.createSpan({ cls: 'cp-inspi-note', text: entree.note });
        }
        rendMotSelectionnable(terme, entree.mot, champ.theme, entree.note || '', selectionApi);
      });
    });
  }

  // --- bonus : mots proches trouvés en ligne (à piocher comme inspiration) ---
  const themeSuggereEnLigne = saisie.charAt(0).toUpperCase() + saisie.slice(1);
  const liste = (sourcesActives || []).map(id => SOURCES_EN_LIGNE[id]).filter(Boolean);
  liste.forEach(source => {
    const bloc = container.createDiv({ cls: 'cp-groupe cp-source-en-ligne' });
    bloc.createDiv({ cls: 'cp-son-label', text: `Mots proches via ${source.nom} (en ligne)` });
    const statut = bloc.createEl('p', { cls: 'cp-vide', text: 'Recherche en cours…' });

    source.chercher(saisie).then(resultat => {
      statut.remove();
      const mots = [...(resultat.synonymes || []), ...(resultat.antonymes || [])];
      if (!resultat || !resultat.trouve || mots.length === 0) {
        bloc.createEl('p', { cls: 'cp-vide', text: `Rien trouvé sur ${source.nom} pour « ${saisie} ».` });
        return;
      }
      const motsDiv = bloc.createDiv({ cls: 'cp-mots' });
      mots.forEach(m => {
        const span = motsDiv.createSpan({ cls: 'cp-mot cp-mot-syno', text: m });
        rendMotSelectionnable(span, m, themeSuggereEnLigne, '', selectionApi);
      });
    }).catch(err => {
      console.error(`[Carnet du Poète] erreur ${source.nom}`, err);
      statut.setText(messageErreurSource(err, source.nom));
    });
  });
}

/* Rendu partagé des résultats de synonymes/antonymes. motRimeRef (optionnel)
   : mot par rapport auquel afficher un badge de qualité de rime sur chaque
   chip qui rime VRAIMENT avec lui (le mot de départ par défaut, ou le mot
   de la case "Rime avec" quand elle est renseignée — auquel cas la liste
   est déjà filtrée en amont pour ne garder que ces mots-là). classeRime
   seul ne suffit pas comme garde-fou : il renvoie toujours un niveau (même
   "pauvre") pour n'importe quelle paire de mots, y compris ceux qui ne
   riment pas du tout — d'où le badge qui semblait s'afficher partout. */
function buildGroupeMots(container, titre, liste, cls, motRimeRef){
  if (!liste || liste.length === 0) return;
  const g = container.createDiv({ cls: 'cp-groupe' });
  g.createDiv({ cls: 'cp-titre', text: titre });
  const motsDiv = g.createDiv({ cls: 'cp-mots' });
  liste.forEach(m => {
    const span = motsDiv.createSpan({ cls: cls, text: m });
    if (motRimeRef && memeRime(motRimeRef, m)) badgeQualite(span, m, motRimeRef);
  });
}

/* Variante de buildGroupeMots où chaque chip est cliquable pour l'exclure
   (grisé/barré) avant sauvegarde dans le dictionnaire personnel — utile
   quand une source en ligne renvoie de mauvaises entrées (ex. une page
   Wiktionnaire mêlant plusieurs langues) qu'on ne veut pas polluer son
   dictionnaire perso avec. `exclus` est un Set partagé, rempli/vidé par le
   clic, relu par le bouton "Enregistrer" au moment de sauvegarder. */
function buildGroupeMotsExcluable(container, titre, liste, cls, motRimeRef, exclus){
  if (!liste || liste.length === 0) return;
  const g = container.createDiv({ cls: 'cp-groupe' });
  g.createDiv({ cls: 'cp-titre', text: titre });
  const motsDiv = g.createDiv({ cls: 'cp-mots' });
  liste.forEach(m => {
    const span = motsDiv.createSpan({ cls: cls, text: m });
    span.setAttr('title', 'Clique pour exclure ce mot avant de l\'enregistrer dans ton dictionnaire personnel (reclique pour annuler).');
    span.addClass('cp-mot-excluable');
    span.addEventListener('click', () => {
      if (exclus.has(m)) { exclus.delete(m); span.removeClass('cp-mot-exclu'); }
      else { exclus.add(m); span.addClass('cp-mot-exclu'); }
    });
    if (motRimeRef && memeRime(motRimeRef, m)) badgeQualite(span, m, motRimeRef);
  });
}

/* Filtre une liste de mots pour ne garder que ceux qui riment réellement
   avec la cible (utilisé par la case "Rime avec" de l'onglet Synonymes) —
   s'appuie sur memeRime, donc sur le même critère strict que l'onglet Rimes
   (et bascule automatiquement en phonétique quand les deux mots sont dans
   le dictionnaire complet). */
function filtreParRime(liste, cible){
  if (!cible) return liste || [];
  return (liste || []).filter(m => memeRime(cible, m));
}

async function renderResultatsSynonymes(container, motSaisi, plugin, sourcesActives, motRimeCible){
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
  const blocLocal = container.createDiv({ cls: 'cp-groupe' });
  blocLocal.createDiv({ cls: 'cp-son-label', text: `${saisie} — dictionnaire local` });
  const entree = chercheSynonymes(saisie);
  if (entree) {
    const syn = filtreParRime(entree.synonymes, cible);
    const anto = filtreParRime(entree.antonymes, cible);
    if (cible && syn.length === 0 && anto.length === 0) {
      blocLocal.createEl('p', { cls: 'cp-vide', text: `Aucun synonyme/antonyme local de « ${saisie} » ne rime avec « ${cible} ».` });
    } else {
      buildGroupeMots(blocLocal, 'Synonymes', syn, 'cp-mot cp-mot-syno', motRimeRef);
      buildGroupeMots(blocLocal, 'Antonymes', anto, 'cp-mot cp-mot-anto', motRimeRef);
    }
  } else {
    blocLocal.createEl('p', { cls: 'cp-vide', text: 'Pas d\'entrée locale pour ce mot.' });
  }

  // --- sources en ligne sélectionnées ---
  const liste = (sourcesActives || []).map(id => SOURCES_EN_LIGNE[id]).filter(Boolean);
  liste.forEach(source => {
    const bloc = container.createDiv({ cls: 'cp-groupe cp-source-en-ligne' });
    bloc.createDiv({ cls: 'cp-son-label', text: `${saisie} — ${source.nom}` });
    const statut = bloc.createEl('p', { cls: 'cp-vide', text: 'Recherche en cours…' });

    source.chercher(saisie).then(resultat => {
      statut.remove();
      if (!resultat || !resultat.trouve || (resultat.synonymes.length === 0 && resultat.antonymes.length === 0)) {
        bloc.createEl('p', { cls: 'cp-vide', text: `Rien trouvé sur ${source.nom} pour « ${saisie} ».` });
        return;
      }
      const synEnLigne = filtreParRime(resultat.synonymes, cible);
      const antoEnLigne = filtreParRime(resultat.antonymes, cible);
      if (cible && synEnLigne.length === 0 && antoEnLigne.length === 0) {
        bloc.createEl('p', { cls: 'cp-vide', text: `Aucun résultat ${source.nom} ne rime avec « ${cible} ».` });
        return;
      }
      const exclusSyn = new Set();
      const exclusAnto = new Set();
      buildGroupeMotsExcluable(bloc, 'Synonymes', synEnLigne, 'cp-mot cp-mot-syno', motRimeRef, exclusSyn);
      buildGroupeMotsExcluable(bloc, 'Antonymes', antoEnLigne, 'cp-mot cp-mot-anto', motRimeRef, exclusAnto);

      if (plugin && (synEnLigne.length > 0 || antoEnLigne.length > 0)) {
        const btnSauver = bloc.createEl('button', { cls: 'cp-link-btn', text: `💾 Enregistrer dans mon dictionnaire personnel` });
        btnSauver.setAttr('title', 'Enregistre tout ce qui est affiché ci-dessus, sauf les mots grisés/barrés (clique sur un mot pour l\'exclure).');
        btnSauver.addEventListener('click', async () => {
          btnSauver.disabled = true;
          btnSauver.setText('Enregistrement…');
          const synARetenir = synEnLigne.filter(m => !exclusSyn.has(m));
          const antoARetenir = antoEnLigne.filter(m => !exclusAnto.has(m));
          await enregistreSynonymePerso(plugin, saisie, synARetenir, antoARetenir);
          btnSauver.setText('Enregistré ✓');
        });
      }
    }).catch(err => {
      console.error(`[Carnet du Poète] erreur ${source.nom}`, err);
      statut.setText(messageErreurSource(err, source.nom));
    });
  });
}

/* =========================================================
   VUE PRINCIPALE
   ========================================================= */

class CarnetView extends ItemView {
  constructor(leaf, plugin){
    super(leaf);
    this.plugin = plugin;
  }
  getViewType(){ return VIEW_TYPE; }
  getDisplayText(){ return 'Carnet du Poète'; }
  getIcon(){ return 'feather'; }

  async onOpen(){
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('carnet-poete-view');

    container.createEl('h2', { text: 'Le Carnet du Poète' });

    const tabBar = container.createDiv({ cls: 'cp-tabs' });
    const tabSyl = tabBar.createEl('button', { text: 'Syllabes', cls: 'cp-tab active' });
    const tabRimes = tabBar.createEl('button', { text: 'Rimes', cls: 'cp-tab' });
    const tabInspi = tabBar.createEl('button', { text: 'Inspiration', cls: 'cp-tab' });
    const tabSyno = tabBar.createEl('button', { text: 'Synonymes', cls: 'cp-tab' });
    const tabGuide = tabBar.createEl('button', { text: 'Guide', cls: 'cp-tab' });
    const tabDefs = tabBar.createEl('button', { text: 'Définitions', cls: 'cp-tab' });
    const tabHasard = tabBar.createEl('button', { text: 'Hasard', cls: 'cp-tab' });
    const tabNotes = tabBar.createEl('button', { text: 'Notes', cls: 'cp-tab' });

    const panelSyl = container.createDiv({ cls: 'cp-panel active' });
    const panelRimes = container.createDiv({ cls: 'cp-panel' });
    const panelInspi = container.createDiv({ cls: 'cp-panel' });
    const panelSyno = container.createDiv({ cls: 'cp-panel' });
    const panelGuide = container.createDiv({ cls: 'cp-panel' });
    const panelDefs = container.createDiv({ cls: 'cp-panel' });
    const panelHasard = container.createDiv({ cls: 'cp-panel' });
    const panelNotes = container.createDiv({ cls: 'cp-panel' });

    const switchTab = (which) => {
      tabSyl.toggleClass('active', which === 'syl');
      tabRimes.toggleClass('active', which === 'rimes');
      tabInspi.toggleClass('active', which === 'inspi');
      tabSyno.toggleClass('active', which === 'syno');
      tabGuide.toggleClass('active', which === 'guide');
      tabDefs.toggleClass('active', which === 'defs');
      tabHasard.toggleClass('active', which === 'hasard');
      tabNotes.toggleClass('active', which === 'notes');
      panelSyl.toggleClass('active', which === 'syl');
      panelRimes.toggleClass('active', which === 'rimes');
      panelInspi.toggleClass('active', which === 'inspi');
      panelSyno.toggleClass('active', which === 'syno');
      panelGuide.toggleClass('active', which === 'guide');
      panelDefs.toggleClass('active', which === 'defs');
      panelHasard.toggleClass('active', which === 'hasard');
      panelNotes.toggleClass('active', which === 'notes');
      if (which === 'notes' && this._rafraichitPanelNotes) this._rafraichitPanelNotes();
      if (which === 'rimes' && this._rafraichitAssonanceRimes) this._rafraichitAssonanceRimes();
    };
    tabSyl.addEventListener('click', () => switchTab('syl'));
    tabRimes.addEventListener('click', () => switchTab('rimes'));
    tabInspi.addEventListener('click', () => switchTab('inspi'));
    tabSyno.addEventListener('click', () => switchTab('syno'));
    tabGuide.addEventListener('click', () => switchTab('guide'));
    tabDefs.addEventListener('click', () => switchTab('defs'));
    tabHasard.addEventListener('click', () => switchTab('hasard'));
    tabNotes.addEventListener('click', () => switchTab('notes'));
    this._switchTab = switchTab;

    this.buildPanelSyllabes(panelSyl);
    this.buildPanelRimes(panelRimes);
    this.buildPanelInspiration(panelInspi);
    this.buildPanelSynonymes(panelSyno);
    this.buildPanelGuide(panelGuide);
    this.buildPanelDefinitions(panelDefs);
    this.buildPanelHasard(panelHasard);
    this.buildPanelNotes(panelNotes);

    const footer = container.createEl('p', { cls: 'cp-footer' });
    footer.setText('Comptage heuristique : règle du e caduc + détection des hiatus (diérèse affichée en variante complète). Dictionnaires curatés, non exhaustifs — vous pouvez les étendre via un fichier dictionnaire-perso.json (familles de rimes, dictionnaire phonétique, champs lexicaux, synonymes).');
  }

  buildPanelSyllabes(panelSyl){
    const textarea = panelSyl.createEl('textarea', {
      cls: 'cp-textarea',
      attr: { placeholder: 'Écris ou colle tes vers ici, un vers par ligne…' }
    });
    const toolbar = panelSyl.createDiv({ cls: 'cp-toolbar' });
    const toggleDiereseLabel = toolbar.createEl('label', { cls: 'cp-source-toggle' });
    const toggleDierese = toggleDiereseLabel.createEl('input', { attr: { type: 'checkbox' } });
    toggleDiereseLabel.createSpan({ text: ' Variante diérèse' });
    const toggleRimesLabel = toolbar.createEl('label', { cls: 'cp-source-toggle' });
    const toggleRimes = toggleRimesLabel.createEl('input', { attr: { type: 'checkbox' } });
    toggleRimesLabel.createSpan({ text: ' Couleurs de rimes' });
    const saveState = toolbar.createEl('span', { cls: 'cp-save-state' });
    const btnExport = toolbar.createEl('button', { text: '📋 Exporter en Markdown', cls: 'cp-link-btn' });
    const btnCopierBrouillon = toolbar.createEl('button', { text: '📄 Copier le brouillon', cls: 'cp-link-btn' });
    const btnClear = toolbar.createEl('button', { text: 'Effacer le brouillon', cls: 'cp-link-btn' });
    const analyseDiv = panelSyl.createDiv({ cls: 'cp-analyse' });
    const schemaDiv = panelSyl.createDiv({ cls: 'cp-schema-rimes' });
    const totalBar = panelSyl.createDiv({ cls: 'cp-total-bar' });
    totalBar.style.display = 'none';

    (async () => {
      const data = await this.plugin.loadData();
      toggleDierese.checked = !data || data.afficheDierese !== false; // activé par défaut
      toggleRimes.checked = !!(data && data.afficheCouleursRimes);
      renderAnalyse();
    })();
    toggleDierese.addEventListener('change', async () => {
      const data = (await this.plugin.loadData()) || {};
      data.afficheDierese = toggleDierese.checked;
      await this.plugin.saveData(data);
      renderAnalyse();
    });
    toggleRimes.addEventListener('change', async () => {
      const data = (await this.plugin.loadData()) || {};
      data.afficheCouleursRimes = toggleRimes.checked;
      await this.plugin.saveData(data);
      renderAnalyse();
    });

    const renderAnalyse = () => {
      analyseDiv.empty();
      schemaDiv.empty();
      const texteComplet = textarea.value;
      const nonVides = texteComplet.split('\n').filter(l => l.trim());
      if (nonVides.length === 0) {
        totalBar.style.display = 'none';
        return;
      }

      const poeme = analysePoeme(texteComplet);
      let total = 0, nb = 0;

      poeme.lignes.forEach(ligneInfo => {
        if (ligneInfo.vide) return;
        const r = ligneInfo.r;
        nb++;
        total += r.total;
        const ligneEl = analyseDiv.createDiv({ cls: 'cp-ligne' });
        const ligneTop = ligneEl.createDiv({ cls: 'cp-ligne-top' });
        const texteStandard = r.details.map(d => segmenteMotPourAffichage(d.mot, d.syllabes)).join(' ');
        const texteSpan = ligneTop.createSpan({ cls: 'cp-texte', text: texteStandard });
        if (toggleRimes.checked && ligneInfo.coulIdx !== null) {
          texteSpan.style.borderLeft = `3px solid ${PALETTE_RIMES[ligneInfo.coulIdx]}`;
          texteSpan.style.paddingLeft = '6px';
        }
        const badges = ligneTop.createDiv({ cls: 'cp-badges' });
        if (toggleRimes.checked && ligneInfo.lettre) {
          const badgeRime = badges.createSpan({ cls: 'cp-rime-lettre', text: ligneInfo.lettre });
          badgeRime.style.color = PALETTE_RIMES[ligneInfo.coulIdx];
          badgeRime.style.borderColor = PALETTE_RIMES[ligneInfo.coulIdx];
          const titreQualite = ligneInfo.qualite ? ` (rime ${LABELS_QUALITE[ligneInfo.qualite] || ligneInfo.qualite})` : '';
          badgeRime.setAttr('title', `Groupe de rime ${ligneInfo.lettre}${titreQualite}`);
        }
        const genre = genreDuVers(r.details);
        if (genre) {
          const badgeGenre = badges.createSpan({
            cls: genre === 'F' ? 'cp-genre cp-genre-f' : 'cp-genre cp-genre-m',
            text: genre
          });
          badgeGenre.setAttr('title', genre === 'F'
            ? 'Rime féminine : le vers se termine par un e muet'
            : 'Rime masculine : le vers ne se termine pas par un e muet');
        }
        if (METRES[r.total]) {
          badges.createSpan({ cls: 'cp-metre', text: METRES[r.total] });
        }
        if (toggleDierese.checked && r.hasHiatus && r.totalMax !== r.total) {
          const badgeSynerese = badges.createSpan({ cls: 'cp-hiatus-badge cp-hiatus-badge-synerese', text: 'synérèse' });
          badgeSynerese.setAttr('title', 'Lecture par défaut : les hiatus de ce vers sont lus en une seule syllabe.');
        }
        badges.createSpan({ cls: 'cp-compte', text: String(r.total) });

        if (toggleDierese.checked && r.hasHiatus && r.totalMax !== r.total) {
          const ligneAlt = ligneEl.createDiv({ cls: 'cp-ligne-alt' });
          const texteAlt = r.details.map(d => segmenteMotPourAffichage(d.mot, d.syllabesDierese || d.syllabes)).join(' ');
          ligneAlt.createSpan({ cls: 'cp-texte-alt', text: texteAlt });
          const badgesAlt = ligneAlt.createDiv({ cls: 'cp-badges' });
          const badgeDierese = badgesAlt.createSpan({ cls: 'cp-hiatus-badge', text: 'diérèse' });
          badgeDierese.setAttr('title', 'Les hiatus de ce vers sont lus en deux syllabes séparées.');
          badgesAlt.createSpan({ cls: 'cp-compte cp-compte-alt', text: String(r.totalMax) });
        }
      });

      // schéma de rimes par strophe (affiché seulement s'il y a plus d'une strophe
      // ou qu'un nom de schéma classique a été reconnu — sinon peu d'intérêt)
      const utile = poeme.strophes.some(s => s.nom) || poeme.strophes.length > 1;
      if (utile) {
        poeme.strophes.forEach((s, i) => {
          const ligne = schemaDiv.createDiv({ cls: 'cp-schema-ligne' });
          const prefixe = poeme.strophes.length > 1 ? `Strophe ${i + 1} : ` : 'Schéma : ';
          ligne.createSpan({ text: prefixe + s.lettres.map(l => l || '?').join('') });
          if (s.nom) ligne.createSpan({ cls: 'cp-metre', text: s.nom });
        });
      }

      totalBar.style.display = 'flex';
      totalBar.empty();
      totalBar.createSpan({ text: `${nb} vers` });
      totalBar.createEl('strong', { text: `${total} syllabes` });
      totalBar.createSpan({ text: `≈ ${(total / nb).toFixed(1)} / vers` });
    };
    // Exposé pour pouvoir forcer un recalcul depuis l'extérieur (ex. le
    // toggle debug "ignorer le dictionnaire personnel" dans Settings, qui
    // change le comportement des rimes sans que le brouillon ait changé).
    this._renderAnalyseSyllabes = renderAnalyse;

    btnExport.addEventListener('click', () => {
      const poeme = analysePoeme(textarea.value);
      const lignesUtiles = poeme.lignes.filter(l => !l.vide);
      if (lignesUtiles.length === 0) { new Notice('Rien à exporter.'); return; }
      let md = '| Vers | Syllabes | Genre | Rime | Qualité |\n| --- | --- | --- | --- | --- |\n';
      lignesUtiles.forEach(l => {
        const genre = genreDuVers(l.r.details) || '';
        const texteEchappe = l.texte.replace(/\|/g, '\\|');
        md += `| ${texteEchappe} | ${l.r.total} | ${genre} | ${l.lettre || ''} | ${l.qualite ? (LABELS_QUALITE[l.qualite] || l.qualite) : ''} |\n`;
      });
      navigator.clipboard.writeText(md).then(() => {
        new Notice('Analyse copiée en Markdown — colle-la où tu veux.');
      }).catch(() => {
        new Notice('Impossible de copier automatiquement ; voir la console pour le Markdown généré.');
        console.log(md);
      });
    });

    btnCopierBrouillon.addEventListener('click', () => {
      if (!textarea.value.trim()) { new Notice('Le brouillon est vide.'); return; }
      navigator.clipboard.writeText(textarea.value).then(() => {
        new Notice('Brouillon copié dans le presse-papier.');
      }).catch(() => {
        new Notice('Impossible de copier automatiquement (voir la console).');
        console.log(textarea.value);
      });
    });

    let saveTimeout = null;
    textarea.addEventListener('input', () => {
      renderAnalyse();
      saveState.setText('…');
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        const data = (await this.plugin.loadData()) || {};
        data.poeme = textarea.value;
        await this.plugin.saveData(data);
        saveState.setText('brouillon enregistré');
        setTimeout(() => saveState.setText(''), 1200);
      }, 700);
    });

    btnClear.addEventListener('click', async () => {
      textarea.value = '';
      renderAnalyse();
      const data = (await this.plugin.loadData()) || {};
      data.poeme = '';
      await this.plugin.saveData(data);
    });

    (async () => {
      const data = await this.plugin.loadData();
      if (data && data.poeme) {
        textarea.value = data.poeme;
        renderAnalyse();
      }
    })();
  }

  buildPanelRimes(panelRimes){
    const rimeForm = panelRimes.createDiv({ cls: 'cp-rime-form' });
    const motInput = rimeForm.createEl('input', { attr: { type: 'text', placeholder: 'Un mot… (ex. lumière, chapeau, courage)' } });
    const btnChercher = rimeForm.createEl('button', { text: 'Chercher' });

    const filtresDiv = panelRimes.createDiv({ cls: 'cp-filtres' });
    const lettreInput = filtresDiv.createEl('input', { cls: 'cp-filtre-lettre', attr: { type: 'text', maxlength: '1', placeholder: 'Lettre' } });
    const syllabesSelect = filtresDiv.createEl('select', { cls: 'cp-filtre-syllabes' });
    [['', 'Toutes syllabes'], ['1','1 syll.'], ['2','2 syll.'], ['3','3 syll.'], ['4','4 syll.'], ['5+','5+ syll.']]
      .forEach(([val, label]) => syllabesSelect.createEl('option', { attr: { value: val }, text: label }));

    const qualiteDiv = filtresDiv.createDiv({ cls: 'cp-qualite-filtres' });
    const casesQualite = {};
    [['pauvre','Pauvre'],['suffisante','Suffisante'],['riche','Riche+']].forEach(([id, label]) => {
      const lbl = qualiteDiv.createEl('label', { cls: 'cp-source-toggle' });
      const c = lbl.createEl('input', { attr: { type: 'checkbox' } });
      c.checked = true;
      lbl.createSpan({ text: ' ' + label });
      casesQualite[id] = c;
    });

    // Sous-filtres optionnels, à l'intérieur du groupe "Riche+" : décochés
    // par défaut (aucune restriction supplémentaire tant que l'un des deux
    // n'est pas explicitement coché).
    const sousQualiteDiv = filtresDiv.createDiv({ cls: 'cp-qualite-filtres cp-qualite-sousfiltres' });
    const casesSousQualite = {};
    [['tresriche','Très riche'],['leonine','Léonine']].forEach(([id, label]) => {
      const lbl = sousQualiteDiv.createEl('label', { cls: 'cp-source-toggle' });
      const c = lbl.createEl('input', { attr: { type: 'checkbox' } });
      c.checked = false;
      lbl.createSpan({ text: ' ' + label });
      casesSousQualite[id] = c;
    });

    const sourcesDiv = panelRimes.createDiv({ cls: 'cp-sources' });
    sourcesDiv.createSpan({ cls: 'cp-sources-label', text: 'Compléter en ligne : ' });
    const caseRimesSolides = sourcesDiv.createEl('label', { cls: 'cp-source-toggle' });
    const inputRimesSolides = caseRimesSolides.createEl('input', { attr: { type: 'checkbox' } });
    caseRimesSolides.createSpan({ text: ' RimesSolides' });

    const modeDiv = panelRimes.createDiv({ cls: 'cp-sources' });
    const modeLabel = modeDiv.createEl('label', { cls: 'cp-source-toggle' });
    const inputModeAssonance = modeLabel.createEl('input', { attr: { type: 'checkbox' } });
    modeLabel.createSpan({ text: ' Mode assonance (accepte les rimes approchées)' });
    inputModeAssonance.setAttr('title', 'Rime stricte par défaut : les résultats doivent réellement rimer. Coche pour aussi accepter les assonances (même voyelle, terminaison différente — ex. « ombre »/« montre »), affichées à part.');

    const resultatsDiv = panelRimes.createDiv({ cls: 'cp-resultats' });

    (async () => {
      const data = await this.plugin.loadData();
      inputModeAssonance.checked = !!(data && data.modeAssonance);
      MODE_ASSONANCE = inputModeAssonance.checked;
    })();
    inputModeAssonance.addEventListener('change', async () => {
      MODE_ASSONANCE = inputModeAssonance.checked;
      const data = (await this.plugin.loadData()) || {};
      data.modeAssonance = inputModeAssonance.checked;
      await this.plugin.saveData(data);
      chercher();
    });
    // Le réglage global (Settings → Carnet du Poète) peut changer
    // MODE_ASSONANCE pendant qu'on est sur un autre onglet ; on resynchronise
    // la case visuellement à chaque retour sur l'onglet Rimes plutôt que de
    // la figer à l'ouverture initiale du panneau.
    this._rafraichitAssonanceRimes = () => { inputModeAssonance.checked = MODE_ASSONANCE; };

    const lireFiltres = () => ({
      lettre: lettreInput.value.trim(),
      syllabes: syllabesSelect.value,
      qualites: new Set(Object.keys(casesQualite).filter(id => casesQualite[id].checked)),
      sousQualites: new Set(Object.keys(casesSousQualite).filter(id => casesSousQualite[id].checked))
    });
    const sourcesActives = () => (inputRimesSolides.checked ? ['rimessolides'] : []);

    const chercher = () => renderResultatsRimes(resultatsDiv, motInput.value, lireFiltres(), this.plugin, sourcesActives());
    // Même raison que _renderAnalyseSyllabes : permettre un recalcul externe
    // (toggle debug dico perso) sans avoir à retaper la recherche.
    this._rechercherRimes = chercher;

    btnChercher.addEventListener('click', chercher);
    motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });
    lettreInput.addEventListener('input', chercher);
    syllabesSelect.addEventListener('change', chercher);
    Object.values(casesQualite).forEach(c => c.addEventListener('change', chercher));
    Object.values(casesSousQualite).forEach(c => c.addEventListener('change', chercher));
    inputRimesSolides.addEventListener('change', chercher);

    this._prefillRimeInput = (mot) => {
      motInput.value = mot;
      chercher();
    };
  }

  buildPanelInspiration(panelInspi){
    const intro = panelInspi.createEl('p', { cls: 'cp-inspi-intro' });
    intro.setText('Tape un mot courant, reçois du vocabulaire plus rare, littéraire ou désuet autour du même thème. Clique sur un mot pour le sélectionner, puis ajoute ta sélection à un champ lexical ou comme mots rares.');

    const sourcesDiv = panelInspi.createDiv({ cls: 'cp-sources' });
    sourcesDiv.createSpan({ cls: 'cp-sources-label', text: 'Compléter en ligne : ' });
    const cases = {};
    SOURCES_EN_LIGNE_ORDRE.forEach(id => {
      const source = SOURCES_EN_LIGNE[id];
      const label = sourcesDiv.createEl('label', { cls: 'cp-source-toggle' });
      const case_ = label.createEl('input', { attr: { type: 'checkbox' } });
      label.createSpan({ text: ' ' + source.nom });
      cases[id] = case_;
    });

    const form = panelInspi.createDiv({ cls: 'cp-rime-form' });
    const motInput = form.createEl('input', { attr: { type: 'text', placeholder: 'Un thème… (ex. forêt, mer, nuit, amour, moyen-âge)' } });
    const btnChercher = form.createEl('button', { text: 'Chercher' });

    // --- sélection persistante à travers les recherches + barre d'action ---
    const selectionMots = new Map(); // normaliseMot(mot) -> { mot, themeSuggere, note }
    const actionBarDiv = panelInspi.createDiv({ cls: 'cp-inspi-action-bar' });
    actionBarDiv.style.display = 'none';

    const renderActionBar = () => {
      actionBarDiv.empty();
      if (selectionMots.size === 0) { actionBarDiv.style.display = 'none'; return; }
      actionBarDiv.style.display = 'flex';

      const chipsRow = actionBarDiv.createDiv({ cls: 'cp-inspi-selection-chips' });
      chipsRow.createSpan({ cls: 'cp-sources-label', text: `${selectionMots.size} mot(s) sélectionné(s) : ` });
      [...selectionMots.values()].forEach(({ mot }) => {
        const chip = chipsRow.createSpan({ cls: 'cp-tag-chip' });
        chip.createSpan({ text: mot });
        const btnX = chip.createSpan({ cls: 'cp-tag-chip-x', text: ' ×' });
        btnX.addEventListener('click', () => { toggleSelection(mot); });
      });
      const btnClear = chipsRow.createEl('button', { cls: 'cp-link-btn', text: 'Tout désélectionner' });
      btnClear.addEventListener('click', () => { selectionMots.clear(); renderActionBar(); });

      const actionsRow = actionBarDiv.createDiv({ cls: 'cp-inspi-selection-actions' });
      const btnChamp = actionsRow.createEl('button', { cls: 'cp-hasard-graver-btn', text: '+ Ajouter à un champ lexical' });
      const btnRare = actionsRow.createEl('button', { cls: 'cp-hasard-graver-btn', text: '+ Ajouter comme mot(s) rare(s)' });

      let formChamp = null;
      btnChamp.addEventListener('click', () => {
        if (formChamp) { formChamp.remove(); formChamp = null; return; }
        formChamp = actionBarDiv.createDiv({ cls: 'cp-inspi-ajout-form' });
        const datalistId = 'cp-inspi-themes-' + Math.random().toString(36).slice(2, 8);
        const themeInput = formChamp.createEl('input', { attr: { type: 'text', placeholder: 'thème (ex. Bretagne)', list: datalistId } });
        const datalist = formChamp.createEl('datalist', { attr: { id: datalistId } });
        tousLesThemesLexicaux().forEach(t => datalist.createEl('option', { attr: { value: t } }));
        const clefsInput = formChamp.createEl('input', { attr: { type: 'text', placeholder: 'mots-clés séparés par virgule (si nouveau thème)' } });
        const btnValider = formChamp.createEl('button', { cls: 'cp-link-btn', text: `Ajouter les ${selectionMots.size} mot(s)` });

        // Suggestion affichée à part (jamais pré-remplie en silence) : si
        // tous les mots sélectionnés viennent du même champ reconnu, on
        // propose ce thème, mais seul un clic explicite l'applique — un
        // mot présent dans deux champs à la fois (ex. rattaché à "Nuit &
        // obscurité" ET à "Noir") ne doit jamais faire deviner le mauvais.
        const themesSuggeres = [...new Set([...selectionMots.values()].map(v => v.themeSuggere).filter(Boolean))];
        if (themesSuggeres.length === 1) {
          const suggestion = formChamp.createDiv({ cls: 'cp-inspi-suggestion' });
          suggestion.createSpan({ text: 'Suggestion : ' });
          const btnSuggestion = suggestion.createEl('button', { cls: 'cp-link-btn', text: themesSuggeres[0] });
          btnSuggestion.addEventListener('click', () => { themeInput.value = themesSuggeres[0]; themeInput.focus(); });
        }

        const valider = async () => {
          const theme = themeInput.value.trim();
          if (!theme) { new Notice('Le thème est requis.'); return; }
          const motsClefs = clefsInput.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
          const mots = [...selectionMots.values()];
          for (const { mot, note } of mots) {
            await ajouteMotChampLexicalPerso(this.plugin, theme, motsClefs, mot, note || '', { silencieux: true });
          }
          new Notice(`Carnet du Poète : ${mots.length} mot(s) ajouté(s) au champ lexical « ${theme} ».`);
          selectionMots.clear();
          renderActionBar();
        };
        btnValider.addEventListener('click', valider);
        themeInput.addEventListener('keydown', e => { if (e.key === 'Enter') valider(); });
      });

      btnRare.addEventListener('click', async () => {
        const mots = [...selectionMots.values()];
        for (const { mot, note } of mots) {
          await ajouteMotRarePerso(this.plugin, mot, note || '', []);
        }
        new Notice(`Carnet du Poète : ${mots.length} mot(s) ajouté(s) comme mot(s) rare(s) dans dictionnaire-perso.json.`);
        selectionMots.clear();
        renderActionBar();
      });
    };

    const toggleSelection = (mot, themeSuggere, note) => {
      const w = normaliseMot(mot);
      if (selectionMots.has(w)) selectionMots.delete(w);
      else selectionMots.set(w, { mot, themeSuggere, note });
      renderActionBar();
    };
    const selectionApi = {
      estSelectionne: (w) => selectionMots.has(w),
      toggle: toggleSelection
    };

    const resultatsDiv = panelInspi.createDiv({ cls: 'cp-resultats' });

    const sourcesActives = () => SOURCES_EN_LIGNE_ORDRE.filter(id => cases[id].checked);

    const sauvePreference = async () => {
      const data = (await this.plugin.loadData()) || {};
      data.sourcesEnLigneInspiration = sourcesActives();
      await this.plugin.saveData(data);
    };
    (async () => {
      const data = await this.plugin.loadData();
      const prefs = (data && Array.isArray(data.sourcesEnLigneInspiration)) ? data.sourcesEnLigneInspiration : [];
      SOURCES_EN_LIGNE_ORDRE.forEach(id => { cases[id].checked = prefs.includes(id); });
    })();
    Object.values(cases).forEach(c => c.addEventListener('change', sauvePreference));

    const chercher = () => renderResultatsInspiration(resultatsDiv, motInput.value, this.plugin, sourcesActives(), selectionApi);

    btnChercher.addEventListener('click', chercher);
    motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });

    this._prefillInspiInput = (mot) => {
      motInput.value = mot;
      chercher();
    };
  }

  buildPanelSynonymes(panelSyno){
    const intro = panelSyno.createEl('p', { cls: 'cp-inspi-intro' });
    intro.setText('Tape un mot courant pour voir ses synonymes et ses antonymes — utile pour varier une rime ou un rythme sans changer le sens.');

    const sourcesDiv = panelSyno.createDiv({ cls: 'cp-sources' });
    sourcesDiv.createSpan({ cls: 'cp-sources-label', text: 'Rechercher aussi en ligne : ' });
    const cases = {};
    SOURCES_EN_LIGNE_ORDRE.forEach(id => {
      const source = SOURCES_EN_LIGNE[id];
      const label = sourcesDiv.createEl('label', { cls: 'cp-source-toggle' });
      const case_ = label.createEl('input', { attr: { type: 'checkbox' } });
      label.createSpan({ text: ' ' + source.nom });
      cases[id] = case_;
    });

    const form = panelSyno.createDiv({ cls: 'cp-rime-form' });
    const motInput = form.createEl('input', { attr: { type: 'text', placeholder: 'Un mot… (ex. beau, triste, lumière)' } });
    const btnChercher = form.createEl('button', { text: 'Chercher' });

    const rimeCibleDiv = panelSyno.createDiv({ cls: 'cp-filtres' });
    const rimeCibleInput = rimeCibleDiv.createEl('input', { cls: 'cp-filtre-lettre', attr: { type: 'text', placeholder: 'Rime avec… (optionnel)', style: 'width:180px' } });
    rimeCibleInput.setAttr('title', 'Optionnel : ne garder que les synonymes/antonymes qui riment aussi avec ce second mot — utile quand tu cherches un synonyme de X contraint par une rime déjà fixée par un autre vers.');

    const resultatsDiv = panelSyno.createDiv({ cls: 'cp-resultats' });

    const sourcesActives = () => SOURCES_EN_LIGNE_ORDRE.filter(id => cases[id].checked);

    const sauvePreferenceSources = async () => {
      const data = (await this.plugin.loadData()) || {};
      data.sourcesEnLigne = sourcesActives();
      await this.plugin.saveData(data);
    };

    (async () => {
      const data = await this.plugin.loadData();
      const prefs = (data && Array.isArray(data.sourcesEnLigne)) ? data.sourcesEnLigne : ['wiktionnaire'];
      SOURCES_EN_LIGNE_ORDRE.forEach(id => { cases[id].checked = prefs.includes(id); });
    })();

    Object.values(cases).forEach(c => c.addEventListener('change', sauvePreferenceSources));

    const chercher = () => renderResultatsSynonymes(resultatsDiv, motInput.value, this.plugin, sourcesActives(), rimeCibleInput.value);
    this._rechercherSynonymes = chercher;

    btnChercher.addEventListener('click', chercher);
    motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });
    rimeCibleInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });
    rimeCibleInput.addEventListener('input', chercher);

    this._prefillSynoInput = (mot) => {
      motInput.value = mot;
      chercher();
    };
  }

  buildPanelGuide(panelGuide){
    const section = (titre) => {
      const el = panelGuide.createEl('h3', { cls: 'cp-guide-titre', text: titre });
      return el;
    };
    const para = (texte) => { panelGuide.createEl('p', { cls: 'cp-guide-p', text: texte }); };
    const liste = (items) => {
      const ul = panelGuide.createEl('ul', { cls: 'cp-guide-liste' });
      items.forEach(it => {
        const li = ul.createEl('li');
        if (typeof it === 'string') {
          li.setText(it);
        } else {
          li.createEl('strong', { text: it.titre + ' — ' });
          li.createSpan({ text: it.texte });
        }
      });
    };

    section('Compter les syllabes en français');
    para('On compte les groupes de voyelles réellement prononcés dans le vers, pas les lettres.');
    liste([
      { titre:'Le e caduc (e muet)', texte:'compté seulement s\'il est suivi d\'un mot commençant par une consonne ; jamais compté en fin de vers ; élidé (jamais compté) devant un mot commençant par une voyelle ou un h muet — ex. « la fleuve aux vagues » : le e de « fleuve » ne compte pas devant « aux ».' },
      { titre:'Les diphtongues fixes', texte:'ai, au, eau, eu, ou, oi, ei... comptent toujours pour une seule syllabe (« beau » = 1 syllabe).' },
      { titre:'Le hiatus et la diérèse', texte:'deux voyelles qui ne forment pas une diphtongue fixe (comme « ti-on », « pi-eu », « lu-mi-ère ») peuvent se lire en une seule syllabe (synérèse, la lecture la plus courante) ou en deux (diérèse, souvent utilisée pour allonger un vers) — c\'est un choix du poète selon le mètre recherché. Le Carnet du Poète affiche les deux lectures quand le cas se présente.' },
      { titre:'La liaison', texte:'change la prononciation mais pas le nombre de syllabes.' },
      { titre:'Le y intervocalique', texte:'entre deux voyelles (rayon, crayon, voyage), il sépare deux syllabes au lieu de fusionner avec elles.' }
    ]);

    section('Quelques formes de poèmes classiques');
    liste([
      { titre:'Sonnet', texte:'14 vers, généralement en alexandrins : deux quatrains suivis de deux tercets. Schéma de rimes fréquent : ABBA ABBA CCD EED (ou CCD EDE).' },
      { titre:'Rondeau', texte:'forme à refrain, souvent 13 ou 15 vers en trois strophes ; le début du premier vers revient comme refrain.' },
      { titre:'Ballade', texte:'trois strophes suivies d\'un envoi plus court, avec un même vers-refrain répété à la fin de chaque strophe.' },
      { titre:'Villanelle', texte:'19 vers : cinq tercets puis un quatrain, avec deux vers-refrains qui reviennent alternativement.' },
      { titre:'Pantoum', texte:'forme d\'origine malaise : les 2e et 4e vers de chaque strophe deviennent les 1er et 3e vers de la strophe suivante.' },
      { titre:'Ode', texte:'poème lyrique de forme régulière célébrant une personne, une chose ou une idée.' },
      { titre:'Haïku', texte:'poème très court d\'origine japonaise, en 3 vers (5-7-5 syllabes en tradition japonaise), qui capture un instant, souvent lié à la nature.' },
      { titre:'Fable', texte:'court récit en vers, souvent animalier, portant une morale (La Fontaine).' },
      { titre:'Acrostiche', texte:'la première lettre de chaque vers, lue verticalement, forme un mot.' }
    ]);

    section('Les rimes : généralités');
    para('Disposition des rimes dans une strophe (les trois formes courantes, détectées automatiquement dans l\'onglet Syllabes) :');
    liste([
      { titre:'Rimes plates (ou suivies) — AABB', texte:'deux vers qui riment se suivent directement.' },
      { titre:'Rimes croisées — ABAB', texte:'un vers sur deux rime avec le suivant du même type.' },
      { titre:'Rimes embrassées — ABBA', texte:'deux rimes s\'enferment autour de deux autres.' }
    ]);
    para('Formes plus rares (non détectées automatiquement, à repérer soi-même) :');
    liste([
      { titre:'Rimes annexées (ou concaténées)', texte:'la fin d\'un vers est reprise au début du vers suivant.' },
      { titre:'Rimes internes (ou brisées)', texte:'une rime sonne à la fois à la césure et à la fin du même vers.' },
      { titre:'Rimes batelées', texte:'la fin d\'un vers trouve son écho à la césure du vers suivant.' },
      { titre:'Rimes sénées', texte:'tous les mots d\'un même vers commencent par le même son.' },
      { titre:'Rimes couronnées', texte:'le mot-rime est répété deux fois de suite en fin de vers.' },
      { titre:'Rimes triplées', texte:'trois vers de suite sur la même rime (aaa), plutôt romantique — la poésie classique préférait s\'arrêter à deux.' },
      { titre:'Rimes emperières', texte:'un même son revient trois fois dans le même vers ; pure prouesse de rhétoriqueur.' }
    ]);
    para('Qualité d\'une rime — comptage classique du nombre de sons communs en partant de la fin des mots (2 unités pour la voyelle tonique, qui porte le son dominant ; 1 unité par consonne d\'appui) :');
    liste([
      { titre:'Rime pauvre', texte:'un seul son commun, seule la voyelle finale (ex. « ami / parti »).' },
      { titre:'Rime suffisante', texte:'deux sons communs (ex. « chagrin / matin »).' },
      { titre:'Rime riche', texte:'trois sons communs ou plus (ex. « tendresse / paresse »).' },
      { titre:'Rime très riche', texte:'la syllabe finale est intégralement identique, et la voyelle de la syllabe précédente coïncide aussi — deux syllabes homophones moins un phonème (ex. « patin / matin », « ambroisie / cramoisie »).' },
      { titre:'Rime léonine', texte:'deux syllabes entières, consonnes d\'appui comprises, sont identiques (ex. « railleur / ferrailleur », « sultans / insultants »).' }
    ]);
    para('Une nuance utile : une voyelle d\'appui (la voyelle de la syllabe qui précède la rime) enrichit davantage qu\'une simple consonne d\'appui, car elle est plus audible — « harem / Jérusalem » ou « aurore / sonore » riment plus richement qu\'une consonne d\'appui seule ne le laisserait penser. C\'est cette logique qui distingue « riche » de « très riche » ci-dessus.');
    para('Genre d\'une rime, et règle d\'alternance classique :');
    liste([
      { titre:'Rime féminine', texte:'le vers se termine par un e muet (ex. « montagne », « chêne »).' },
      { titre:'Rime masculine', texte:'le vers ne se termine pas par un e muet (ex. « amour », « instant »).' },
      { titre:'Alternance', texte:'la poésie classique française alterne généralement rimes masculines et féminines d\'une strophe à l\'autre (c\'est la pastille F/M affichée dans l\'onglet Syllabes).' }
    ]);

    section('Le vers : mètre, césure, coupe');
    para('Nom du mètre selon le nombre de syllabes du vers :');
    liste([
      '4 : tétrasyllabe', '5 : pentasyllabe', '6 : hexasyllabe', '7 : heptasyllabe',
      '8 : octosyllabe', '9 : ennéasyllabe', '10 : décasyllabe', '11 : hendécasyllabe',
      '12 : alexandrin (le plus utilisé dans la poésie classique française)'
    ]);
    liste([
      { titre:'La césure', texte:'une pause obligatoire à l\'intérieur du vers. Dans l\'alexandrin classique, elle tombe au milieu (6/6) ; on parle de « trimètre » quand elle est remplacée par deux coupes plus légères créant trois groupes (souvent 4/4/4, fréquent chez Hugo et les romantiques).' },
      { titre:'La coupe', texte:'une pause plus légère et facultative ailleurs dans le vers, qui structure son rythme intérieur.' }
    ]);

    section('Construction du vers : enjambement, rejet, contre-rejet');
    liste([
      { titre:'Enjambement', texte:'une phrase ou un groupe de mots déborde du vers sur le suivant, sans pause syntaxique à la rime.' },
      { titre:'Rejet', texte:'un enjambement où un élément court est repoussé seul en tout début du vers suivant, le mettant en valeur.' },
      { titre:'Contre-rejet', texte:'l\'inverse : un élément court annonce, en toute fin de vers, la phrase qui se développera au vers suivant.' }
    ]);

    section('La strophe : la nommer par son nombre de vers');
    liste([
      '2 vers : distique', '3 vers : tercet', '4 vers : quatrain', '5 vers : quintil',
      '6 vers : sizain', '7 vers : septain', '8 vers : huitain', '10 vers : dizain'
    ]);

    section('D\'autres formes à explorer');
    liste([
      { titre:'Triolet', texte:'8 vers sur 2 rimes, avec reprise des 1er, 4e et 7e vers comme refrain.' },
      { titre:'Virelai', texte:'forme médiévale à refrain, sur deux rimes qui s\'échangent de strophe en strophe.' },
      { titre:'Tanka', texte:'poème japonais de 31 syllabes en 5 vers (5-7-5-7-7), qui prolonge le haïku d\'une réflexion personnelle.' },
      { titre:'Calligramme', texte:'poème dont la disposition graphique sur la page dessine une forme en lien avec le sujet (Apollinaire).' },
      { titre:'Vers libres', texte:'vers sans mètre fixe ni rimes obligatoires, qui s\'appuient sur le rythme et la respiration plutôt que sur des règles strictes (Rimbaud, Laforgue, et la majeure partie de la poésie depuis le XXe siècle).' },
      { titre:'Vers blancs', texte:'vers de mètre régulier mais sans rime.' }
    ]);

    section('Deux nuances utiles sur les rimes');
    liste([
      { titre:'Rime pour l\'œil vs rime pour l\'oreille', texte:'une rime « pour l\'œil » se ressemble à l\'écrit mais pas à l\'oral (ex. « femme » / « lame » ne riment pas vraiment à l\'oreille) ; une bonne rime classique doit fonctionner à l\'oral, pas seulement visuellement.' },
      { titre:'Rime normande ou approximative', texte:'certains poètes jouent volontairement avec des rimes approchantes (assonances) plutôt que des rimes strictes, notamment en poésie moderne et en chanson.' }
    ]);
  }

  buildPanelDefinitions(panelDefs){
    const intro = panelDefs.createEl('p', { cls: 'cp-inspi-intro' });
    intro.setText('Vérifie le sens exact et le registre d\'un mot rare avant de l\'utiliser — définitions et étymologie tirées du Trésor de la Langue Française informatisé (CNRTL), à la demande.');

    const form = panelDefs.createDiv({ cls: 'cp-rime-form' });
    const motInput = form.createEl('input', { attr: { type: 'text', placeholder: 'Un mot… (ex. mélancolie, canopée, ire)' } });
    const btnChercher = form.createEl('button', { text: 'Chercher' });
    const resultatsDiv = panelDefs.createDiv({ cls: 'cp-resultats' });

    const chercher = async () => {
      const saisie = motInput.value.trim();
      resultatsDiv.empty();
      if (!saisie) return;
      resultatsDiv.createDiv({ cls: 'cp-son-label', text: `${saisie} — CNRTL / TLFi` });
      const statut = resultatsDiv.createEl('p', { cls: 'cp-vide', text: 'Recherche en cours…' });
      try {
        const r = await chercheCnrtl(saisie);
        statut.remove();
        if (!r.trouve) {
          resultatsDiv.createEl('p', { cls: 'cp-vide', text: `« ${saisie} » n'a pas été trouvé sur le CNRTL.` });
          return;
        }
        const lien = resultatsDiv.createEl('a', { text: `Voir « ${saisie} » sur le CNRTL →`, attr: { href: r.url, target: '_blank', rel: 'noopener' } });
        lien.addClass('cp-cnrtl-lien');
        if (r.definition) {
          const blocDef = resultatsDiv.createDiv({ cls: 'cp-cnrtl-bloc' });
          blocDef.createDiv({ cls: 'cp-cnrtl-titre', text: 'Définition' });
          blocDef.createEl('p', { cls: 'cp-cnrtl-texte', text: r.definition });
        }
        if (r.etymologie) {
          const blocEtym = resultatsDiv.createDiv({ cls: 'cp-cnrtl-bloc' });
          blocEtym.createDiv({ cls: 'cp-cnrtl-titre', text: 'Étymologie' });
          blocEtym.createEl('p', { cls: 'cp-cnrtl-texte', text: r.etymologie });
        }
      } catch (err) {
        console.error('[Carnet du Poète] erreur CNRTL', err);
        statut.setText('Recherche impossible (pas de connexion, ou le site a changé — voir la console).');
      }
    };

    btnChercher.addEventListener('click', chercher);
    motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });

    this._prefillDefsInput = (mot) => {
      motInput.value = mot;
      chercher();
    };
  }

  buildPanelHasard(panelHasard){
    const intro = panelHasard.createEl('p', { cls: 'cp-inspi-intro' });
    intro.setText('Un mot rare, oublié ou savant, tiré au hasard — pour la surprise et l\'inspiration.');

    // --- stats de progression (utile pour savoir quand importer un
    // nouveau lot de mots, ex. Méral, sans redemander à voir les mêmes).
    // Repliées par défaut en bas de l'onglet (cf. plus bas) pour ne pas
    // surcharger le haut du panel ; statsDiv est assigné après coup.
    let statsDiv = null;
    let compteurPoolEl = null;
    const renderStats = () => {
      if (!statsDiv) return;
      statsDiv.empty();
      const total = MOTS_RARES.length;
      const exclus = MOTS_RARES.filter(e => estExclu(e.mot)).length;
      const sansTag = MOTS_RARES.filter(e => tagsSignificatifs(e.mot).length === 0).length;
      const vus = total - sansTag;
      const pct = total > 0 ? Math.round((vus / total) * 100) : 0;
      const item = (texte, cls) => statsDiv.createSpan({ cls: 'cp-hasard-stat ' + cls, text: texte });
      item(`${total} mot(s) au total`, 'cp-hasard-stat-total');
      item(`${exclus} exclu(s)`, 'cp-hasard-stat-exclus');
      item(`${sansTag} sans tag`, 'cp-hasard-stat-sanstag');
      item(`${pct}% déjà vu(s)`, 'cp-hasard-stat-vu');

      // Détail par tag et par combinaison de tags RÉELLEMENT observée
      // (pas toutes les combinaisons théoriques, qui exploseraient très
      // vite — seulement celles qui existent dans le dictionnaire).
      const parTag = new Map();
      const parCombo = new Map();
      MOTS_RARES.forEach(e => {
        const tags = tagsSignificatifs(e.mot);
        tags.forEach(t => parTag.set(t, (parTag.get(t) || 0) + 1));
        if (tags.length > 0) {
          const cle = [...tags].sort().join(' + ');
          parCombo.set(cle, (parCombo.get(cle) || 0) + 1);
        }
      });

      const detailsDiv = statsDiv.createDiv({ cls: 'cp-hasard-stats-detail' });
      const blocTags = detailsDiv.createDiv({ cls: 'cp-hasard-stats-bloc' });
      blocTags.createDiv({ cls: 'cp-titre', text: 'Par tag' });
      const listeTags = blocTags.createDiv({ cls: 'cp-hasard-stats-liste' });
      [...parTag.entries()].sort((a, b) => b[1] - a[1]).forEach(([tag, n]) => {
        const chip = listeTags.createSpan({ cls: 'cp-hasard-stats-chip' });
        const c = couleurTag(tag);
        chip.style.borderColor = c; chip.style.color = c;
        chip.setText(`${tag} · ${n}`);
      });

      const combosMultiples = [...parCombo.entries()].filter(([cle]) => cle.includes(' + '));
      if (combosMultiples.length > 0) {
        const blocCombos = detailsDiv.createDiv({ cls: 'cp-hasard-stats-bloc' });
        blocCombos.createDiv({ cls: 'cp-titre', text: 'Combinaisons observées' });
        const listeCombos = blocCombos.createDiv({ cls: 'cp-hasard-stats-liste' });
        combosMultiples.sort((a, b) => b[1] - a[1]).forEach(([cle, n]) => {
          listeCombos.createSpan({ cls: 'cp-hasard-stats-chip', text: `${cle} · ${n}` });
        });
      }
    };

    // --- filtres par tags (élargissent le pool ; OU logique). "exclu"
    // bascule en mode revue : ne tire QUE parmi les mots exclus. ---
    const filtresDiv = panelHasard.createDiv({ cls: 'cp-hasard-filtres' });

    // --- Bandeau de raccourcis rapides : toujours visible, 3 pilules de
    // même forme (auparavant "Masquer les mots déjà tagués" était une
    // case à cocher isolée, visuellement différente des deux boutons
    // "Explorer") ---
    const bandeauDiv = filtresDiv.createDiv({ cls: 'cp-hasard-bandeau' });
    bandeauDiv.createDiv({ cls: 'cp-titre', text: 'Tirage rapide' });
    const filtresRapidesDiv = bandeauDiv.createDiv({ cls: 'cp-hasard-filtres-rapides' });

    // --- Section "Filtrer par tags" (inclusion, OU par défaut, bascule ET
    // possible) : repliée par défaut ---
    const sectionInclusion = creeSectionRepliable(filtresDiv, 'Filtrer par tags', 'cp-hasard-section-inclusion');
    const ligneFormInclusion = sectionInclusion.body.createDiv({ cls: 'cp-hasard-ligne-form' });
    const datalistId = 'cp-hasard-taglist-' + Math.random().toString(36).slice(2, 8);
    const filtreInput = ligneFormInclusion.createEl('input', { attr: { type: 'text', placeholder: 'un tag (ou clique plusieurs pastilles ci-dessous)…', list: datalistId } });
    const filtreDatalist = ligneFormInclusion.createEl('datalist', { attr: { id: datalistId } });
    const btnAjouterFiltre = ligneFormInclusion.createEl('button', { cls: 'cp-link-btn', text: '+ ajouter tag' });
    const btnTousTagsFiltre = ligneFormInclusion.createEl('button', { cls: 'cp-link-btn cp-hasard-voir-tous-tags', text: 'Voir tous les tags' });
    btnTousTagsFiltre.style.display = 'none';
    // Bascule OU (au moins un tag coché) / ET (tous les tags cochés) —
    // utile dès qu'un tag a un volume disproportionné par rapport aux
    // autres (ex. un import en masse) : en OU, le cocher avec un autre tag
    // revient presque à ne cocher que lui, il faut le mode ET pour une
    // vraie intersection.
    const modeETLabel = sectionInclusion.body.createEl('label', { cls: 'cp-hasard-mode-et' });
    const modeETCase = modeETLabel.createEl('input', { attr: { type: 'checkbox' } });
    modeETLabel.createSpan({ text: ' Tous les tags cochés (ET) plutôt qu\'au moins un (OU)' });
    // Générique plutôt que codé pour un tag précis : "méral" + n'importe
    // quel autre tag, ou "femme" + n'importe quel autre — même mécanique,
    // s'applique à ce qui est coché ci-dessus, quel que soit le tag.
    const modePlusUnAutreLabel = sectionInclusion.body.createEl('label', { cls: 'cp-hasard-mode-et' });
    const modePlusUnAutreCase = modePlusUnAutreLabel.createEl('input', { attr: { type: 'checkbox' } });
    modePlusUnAutreLabel.createSpan({ text: ' + au moins un tag en plus de ceux cochés' });
    const filtresChipsDiv = sectionInclusion.body.createDiv({ cls: 'cp-hasard-filtres-chips' });

    // --- Section "Exclure des tags" (NOT/NOR) : symétrique, repliée par
    // défaut. "Masquer les mots connus" est un raccourci compact sur la
    // même ligne que le formulaire plutôt qu'un gros bouton à part —
    // c'est probablement l'action la plus utilisée de la zone, donc
    // gardée à taille normale (juste alignée avec le reste, pas réduite
    // à une mini-puce). "Masquer les mots déjà tagués" reste dans le
    // bandeau du haut : sémantique différente (AUCUN tag, pas "pas tel
    // tag précis"), pas pliable dans cette exclusion générique. ---
    const sectionExclusion = creeSectionRepliable(filtresDiv, 'Exclure des tags', 'cp-hasard-section-exclusion');
    const ligneFormExclusion = sectionExclusion.body.createDiv({ cls: 'cp-hasard-ligne-form' });
    const exclusionRapidesDiv = ligneFormExclusion.createDiv({ cls: 'cp-hasard-filtres-rapides cp-hasard-filtres-rapides-inline' });
    const exclusionDatalistId = 'cp-hasard-exclutaglist-' + Math.random().toString(36).slice(2, 8);
    const exclusionInput = ligneFormExclusion.createEl('input', { attr: { type: 'text', placeholder: 'un tag à exclure (ou clique plusieurs pastilles)…', list: exclusionDatalistId } });
    const exclusionDatalist = ligneFormExclusion.createEl('datalist', { attr: { id: exclusionDatalistId } });
    const btnAjouterExclusion = ligneFormExclusion.createEl('button', { cls: 'cp-link-btn', text: '+ exclure' });
    const btnTousTagsExclusion = ligneFormExclusion.createEl('button', { cls: 'cp-link-btn cp-hasard-voir-tous-tags', text: 'Voir tous les tags à exclure' });
    btnTousTagsExclusion.style.display = 'none';
    const exclusionChipsDiv = sectionExclusion.body.createDiv({ cls: 'cp-hasard-filtres-chips' });

    const filtresExclus = new Set();
    const filtresActifs = new Set();
    // Mode revue des exclus : un booléen À PART, plus un pseudo-tag dans
    // filtresActifs comme avant — "exclu" décide dans QUEL bassin on
    // pioche (les mis de côté, plutôt que les actifs), les tags normaux
    // décident QUELS mots dans ce bassin. Les deux se combinent maintenant
    // naturellement (revoir "les mots exclus tagués méral", par exemple),
    // sans le bricolage d'exclusivité qu'il fallait avant pour éviter
    // qu'un filtre "actif" silencieusement ignoré ne prête à confusion.
    let modeRevueExclus = false;
    // Datalist du champ "ajouter un tag" (créé plus bas dans le DOM) —
    // référence assignée après coup, mais rafraîchie depuis ici pour rester
    // synchronisée avec la liste des tags à chaque changement.
    let tagAjoutDatalist = null;

    sectionInclusion.setCompteBadge(() => filtresActifs.size);
    sectionExclusion.setCompteBadge(() => filtresExclus.size);

    // "déjà tagués" et "multi-tagués" (0 vs 2+ tags significatifs) sont
    // deux booléens à part, miroirs l'un de l'autre, affichés comme
    // pilules du bandeau, harmonisées avec les deux "Explorer".
    const masquerTaguesCase = { checked: false };
    const multiTaguesCase = { checked: false };
    let btnMasquerTagues = null;

    const activeFiltre = (tag) => { filtresActifs.add(tag); renderFiltresTags(); };
    const desactiveFiltre = (tag) => { filtresActifs.delete(tag); renderFiltresTags(); };
    const panneauTousTagsFiltre = creePanneauTousTags(
      sectionInclusion.body,
      btnTousTagsFiltre,
      () => tousLesTagsUtilises().filter(t => t !== TAG_EXCLU && !filtresActifs.has(t)),
      activeFiltre
    );
    modeETCase.addEventListener('change', () => { renderFiltresTags(); });
    modePlusUnAutreCase.addEventListener('change', () => { renderFiltresTags(); });

    // Raccourcis toujours visibles dans le bandeau du haut : "exclu" (mode
    // revue, booléen à part désormais — voir plus haut), "like" (fixe, pas
    // "le tag le plus utilisé" — un import en masse comme méral peut
    // largement dépasser en volume les tags qu'on pose soi-même, sans que
    // ça les rende plus pertinents comme raccourci rapide), "masquer déjà
    // tagués" et son miroir "multi-tagués" (2+ tags significatifs, plutôt
    // que 0 — pour repérer les mots déjà bien recoupés).
    const renderFiltresRapides = () => {
      filtresRapidesDiv.empty();
      const rapides = [
        { tag: TAG_EXCLU, label: '🚫 Explorer les exclus', actif: modeRevueExclus,
          toggle: () => { modeRevueExclus = !modeRevueExclus; renderFiltresTags(); }, couleur: couleurTag(TAG_EXCLU) },
        ...(tousLesTagsUtilises().includes('like') ? [{ tag: 'like', label: '☆ Explorer « like »', actif: filtresActifs.has('like'),
          toggle: () => { filtresActifs.has('like') ? desactiveFiltre('like') : activeFiltre('like'); }, couleur: couleurTag('like') }] : []),
        { tag: '__masquerTagues', label: '📭 Masquer les mots déjà tagués', actif: masquerTaguesCase.checked,
          toggle: () => { masquerTaguesCase.checked = !masquerTaguesCase.checked; renderFiltresTags(); }, couleur: 'var(--text-muted)' },
        { tag: '__multiTagues', label: '🏷️ Explorer les multi-tagués', actif: multiTaguesCase.checked,
          toggle: () => { multiTaguesCase.checked = !multiTaguesCase.checked; renderFiltresTags(); }, couleur: 'var(--text-muted)' },
      ];
      rapides.forEach(r => {
        const btn = filtresRapidesDiv.createEl('button', {
          cls: 'cp-hasard-filtre-rapide' + (r.actif ? ' cp-hasard-filtre-rapide-actif' : ''),
          text: r.label
        });
        btn.style.borderColor = r.couleur;
        if (r.actif) { btn.style.background = r.couleur; btn.style.color = '#fff'; }
        else { btn.style.color = r.couleur; }
        btn.addEventListener('click', r.toggle);
        if (r.tag === '__masquerTagues') btnMasquerTagues = btn;
      });
    };

    const renderFiltresTags = () => {
      renderStats();
      renderFiltresRapides();
      sectionInclusion.render();
      sectionExclusion.render();
      if (compteurPoolEl) {
        const n = filtrePoolMots({
          tagsActifs: filtresActifs, modeET: modeETCase.checked, modePlusUnAutre: modePlusUnAutreCase.checked,
          tagsExclus: filtresExclus, masquerTagues: masquerTaguesCase.checked, modeMultiTagues: multiTaguesCase.checked,
          modeRevueExclus,
        }).length;
        compteurPoolEl.setText(n === 0 ? 'Aucun mot ne correspond à ces filtres' : `${n} mot${n > 1 ? 's' : ''} correspond${n > 1 ? 'ent' : ''} à ces filtres`);
      }
      const tags = tousLesTagsUtilises().filter(t => t !== TAG_EXCLU);
      filtreDatalist.empty();
      tags.forEach(tag => {
        if (filtresActifs.has(tag)) return;
        filtreDatalist.createEl('option', { attr: { value: tag } });
      });
      if (tagAjoutDatalist) {
        tagAjoutDatalist.empty();
        tags.forEach(tag => tagAjoutDatalist.createEl('option', { attr: { value: tag } }));
      }
      panneauTousTagsFiltre.render();
      filtresChipsDiv.empty();
      if (filtresActifs.size === 0) return;
      filtresChipsDiv.createSpan({ cls: 'cp-sources-label', text: 'Filtres actifs : ' });
      [...filtresActifs].forEach(tag => {
        creeChipTag(filtresChipsDiv, tag, () => desactiveFiltre(tag));
      });
    };
    renderFiltresTags();

    const ajouterFiltre = () => {
      const tag = filtreInput.value.trim().toLowerCase();
      if (!tag) return;
      activeFiltre(tag);
      filtreInput.value = '';
    };
    btnAjouterFiltre.addEventListener('click', ajouterFiltre);
    filtreInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ajouterFiltre(); } });

    // --- Exclusion (NOT/NOR) : symétrique de l'inclusion ci-dessus ---
    const activeExclusion = (tag) => { filtresExclus.add(tag); renderExclusionTags(); };
    const desactiveExclusion = (tag) => { filtresExclus.delete(tag); renderExclusionTags(); };
    const panneauTousTagsExclusion = creePanneauTousTags(
      sectionExclusion.body,
      btnTousTagsExclusion,
      () => tousLesTagsUtilises().filter(t => t !== TAG_EXCLU && !filtresExclus.has(t)),
      activeExclusion,
      'Voir tous les tags à exclure'
    );

    const renderExclusionRapides = () => {
      exclusionRapidesDiv.empty();
      if (!tousLesTagsUtilises().includes('connu')) return;
      const actif = filtresExclus.has('connu');
      const btn = exclusionRapidesDiv.createEl('button', {
        cls: 'cp-hasard-filtre-rapide' + (actif ? ' cp-hasard-filtre-rapide-actif' : ''),
        text: '🚫 Masquer les mots connus'
      });
      const c = couleurTag('connu');
      btn.style.borderColor = c;
      if (actif) { btn.style.background = c; btn.style.color = '#fff'; } else { btn.style.color = c; }
      btn.addEventListener('click', () => { actif ? desactiveExclusion('connu') : activeExclusion('connu'); });
    };

    const renderExclusionTags = () => {
      renderFiltresTags(); // rafraîchit aussi les badges/bandeau partagés
      renderExclusionRapides();
      const tags = tousLesTagsUtilises().filter(t => t !== TAG_EXCLU);
      exclusionDatalist.empty();
      tags.forEach(tag => {
        if (filtresExclus.has(tag)) return;
        exclusionDatalist.createEl('option', { attr: { value: tag } });
      });
      panneauTousTagsExclusion.render();
      exclusionChipsDiv.empty();
      if (filtresExclus.size === 0) return;
      exclusionChipsDiv.createSpan({ cls: 'cp-sources-label', text: 'Exclus : ' });
      [...filtresExclus].forEach(tag => {
        creeChipTag(exclusionChipsDiv, tag, () => desactiveExclusion(tag));
      });
    };
    renderExclusionTags();

    const ajouterExclusion = () => {
      const tag = exclusionInput.value.trim().toLowerCase();
      if (!tag) return;
      activeExclusion(tag);
      exclusionInput.value = '';
    };
    btnAjouterExclusion.addEventListener('click', ajouterExclusion);
    exclusionInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ajouterExclusion(); } });



    const zone = panelHasard.createDiv({ cls: 'cp-hasard-zone' });
    compteurPoolEl = zone.createDiv({ cls: 'cp-hasard-compteur-pool' });
    const btnTirerWrap = zone.createDiv({ cls: 'cp-hasard-bouton-wrap' });
    const btnTirer = btnTirerWrap.createEl('button', { text: '🎲 Tire un mot au hasard', cls: 'cp-hasard-bouton' });
    renderFiltresTags(); // calcule le compteur maintenant qu'il existe (il n'existait pas au tout premier appel plus haut)
    const motEl = zone.createEl('div', { cls: 'cp-hasard-mot' });
    const noteEl = zone.createDiv({ cls: 'cp-hasard-note' });
    // Affiche une note en gérant le séparateur de fusion ("---" inséré par
    // nettoieEtFusionneDictionnairePerso quand deux notes différentes sont
    // agrégées) avec un espacement compact et maîtrisé, plutôt que de
    // dépendre du nombre de retours à la ligne bruts stockés dans le texte
    // — corrige aussi les notes déjà fusionnées sans avoir à les retoucher.
    const afficheNoteHasard = (texte) => {
      noteEl.empty();
      const parties = (texte || '').split(/\n*\s*---\s*\n*/)
        // Les "\n" internes viennent souvent d'une mise en page à largeur
        // fixe dans la source scannée (retour à la ligne arbitraire au
        // milieu d'une phrase, pas un vrai saut de paragraphe) — on les
        // aplati en simples espaces pour laisser le texte s'enchaîner
        // naturellement, et laisser le CSS (justify) gérer le retour à la
        // ligne proprement plutôt que de cumuler les deux.
        .map(p => p.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      parties.forEach((partie, i) => {
        if (i > 0) noteEl.createDiv({ cls: 'cp-hasard-note-sep', text: '· · ·' });
        noteEl.createDiv({ cls: 'cp-hasard-note-partie', text: partie });
      });
    };
    const chipsDiv = zone.createDiv({ cls: 'cp-hasard-tags' });

    // actions de navigation (définition, rimes, exclusion) — séparées de
    // la gravure et du tagging, qui vivent dans leurs propres zones plus bas
    const actions = zone.createDiv({ cls: 'cp-hasard-actions' });
    actions.style.display = 'none';
    const btnDefs = actions.createEl('button', { cls: 'cp-link-btn', text: 'Voir sa définition (CNRTL) →' });
    const btnRimes = actions.createEl('button', { cls: 'cp-link-btn', text: 'Chercher ses rimes →' });
    const btnExclure = actions.createEl('button', { cls: 'cp-link-btn cp-btn-exclure', text: '🚫 Ne plus tirer ce mot' });

    // boutons de tag rapide (presets dynamiques, les plus utilisés en
    // premier) + accès à la liste complète, colorée et cliquable, plutôt
    // que le datalist natif du champ texte (illisible dès qu'il y a
    // beaucoup de tags — liste plate, non triée par pertinence, sans
    // couleur pour s'y repérer).
    const presetsDiv = zone.createDiv({ cls: 'cp-hasard-tag-presets' });
    const btnTousTags = zone.createEl('button', { cls: 'cp-link-btn cp-hasard-voir-tous-tags', text: 'Voir tous les tags' });
    btnTousTags.style.display = 'none';

    const choisirTag = async (tag) => {
      if (!motCourant) return;
      await ajouteTagMot(this.plugin, motCourant, tag);
      renderChips();
      renderFiltresTags();
      renderPresets();
    };
    const panneauTousTags = creePanneauTousTags(zone, btnTousTags, () => {
      const tous = tagsParFrequence();
      return tous.length > 6 ? [...tous].sort() : [];
    }, choisirTag);

    const renderPresets = () => {
      presetsDiv.empty();
      tagsParFrequence().slice(0, 6).forEach(tag => {
        const btn = presetsDiv.createEl('button', { cls: 'cp-hasard-preset-btn', text: '+ ' + tag });
        const c = couleurTag(tag);
        btn.style.borderColor = c;
        btn.style.color = c;
        btn.addEventListener('click', () => choisirTag(tag));
      });
      panneauTousTags.render();
    };

    // ajout de tag rapide (libre) sur le mot courant
    const tagFormDiv = zone.createDiv({ cls: 'cp-hasard-tag-ajout' });
    tagFormDiv.style.display = 'none';
    const tagAjoutDatalistId = 'cp-hasard-tagajout-' + Math.random().toString(36).slice(2, 8);
    const tagInput = tagFormDiv.createEl('input', { attr: { type: 'text', placeholder: 'ajouter un tag (ex. désuet)', list: tagAjoutDatalistId } });
    tagAjoutDatalist = tagFormDiv.createEl('datalist', { attr: { id: tagAjoutDatalistId } });
    tousLesTagsUtilises().forEach(tag => tagAjoutDatalist.createEl('option', { attr: { value: tag } }));
    const btnAjouterTag = tagFormDiv.createEl('button', { cls: 'cp-link-btn', text: '+ tag' });

    // gravure : tout en bas, APRÈS le tagging — on tague d'abord ce que le
    // mot évoque, on grave ensuite pour committer ça dans le fichier, pas
    // l'inverse. Sa propre zone, séparée visuellement par un filet.
    const graverWrap = zone.createDiv({ cls: 'cp-hasard-graver-wrap' });
    graverWrap.style.display = 'none';
    const btnGraver = graverWrap.createEl('button', { cls: 'cp-hasard-graver-btn', text: '💾 Graver dans dictionnaire-perso.json' });

    let motCourant = null;
    let noteCourante = '';

    const renderChips = () => {
      chipsDiv.empty();
      if (!motCourant) return;
      tagsDuMot(motCourant).forEach(tag => {
        creeChipTag(chipsDiv, tag, async () => {
          await retireTagMot(this.plugin, motCourant, tag);
          renderChips();
          renderFiltresTags();
          renderPresets();
        });
      });
    };

    const tirer = () => {
      const entree = motAuHasard({
        tagsActifs: filtresActifs,
        modeET: modeETCase.checked,
        modePlusUnAutre: modePlusUnAutreCase.checked,
        tagsExclus: filtresExclus,
        masquerTagues: masquerTaguesCase.checked,
        modeMultiTagues: multiTaguesCase.checked,
        modeRevueExclus,
      });
      if (!entree) {
        motEl.setText('Aucun mot disponible avec ces filtres.');
        afficheNoteHasard('');
        chipsDiv.empty();
        presetsDiv.empty();
        actions.style.display = 'none';
        graverWrap.style.display = 'none';
        tagFormDiv.style.display = 'none';
        motCourant = null;
        return;
      }
      motCourant = entree.mot;
      noteCourante = entree.note || '';
      motEl.setText(entree.mot);
      afficheNoteHasard(noteCourante);
      renderChips();
      renderPresets();
      actions.style.display = 'flex';
      graverWrap.style.display = 'flex';
      tagFormDiv.style.display = 'flex';
    };

    btnDefs.addEventListener('click', () => {
      if (!motCourant) return;
      if (this._switchTab) this._switchTab('defs');
      if (this._prefillDefsInput) this._prefillDefsInput(motCourant);
    });
    btnRimes.addEventListener('click', () => {
      if (!motCourant) return;
      if (this._switchTab) this._switchTab('rimes');
      if (this._prefillRimeInput) this._prefillRimeInput(motCourant);
    });
    btnExclure.addEventListener('click', async () => {
      if (!motCourant) return;
      await ajouteTagMot(this.plugin, motCourant, TAG_EXCLU);
      new Notice(`« ${motCourant} » ne sera plus tiré au hasard.`);
      renderFiltresTags();
      tirer();
    });
    btnGraver.addEventListener('click', async () => {
      if (!motCourant) return;
      const mot = motCourant;
      const tags = tagsDuMot(mot);
      await ajouteMotRarePerso(this.plugin, mot, noteCourante, tags);
      await purgeMetaMot(this.plugin, mot);
      new Notice(`« ${mot} » gravé dans dictionnaire-perso.json (zone tampon vidée).`);
      renderFiltresTags();
      renderPresets();
      if (motCourant && normaliseMot(motCourant) === normaliseMot(mot)) renderChips();
    });
    btnAjouterTag.addEventListener('click', async () => {
      if (!motCourant || !tagInput.value.trim()) return;
      await ajouteTagMot(this.plugin, motCourant, tagInput.value);
      tagInput.value = '';
      renderChips();
      renderFiltresTags();
      renderPresets();
    });
    tagInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnAjouterTag.click(); });

    btnTirer.addEventListener('click', tirer);
    tirer();

    // --- ajout manuel d'un mot rare ---
    const ajoutDetails = panelHasard.createEl('details', { cls: 'cp-hasard-ajout' });
    ajoutDetails.createEl('summary', { text: '+ Ajouter un mot rare manuellement' });
    const ajoutForm = ajoutDetails.createDiv({ cls: 'cp-hasard-ajout-form' });
    const inputMot = ajoutForm.createEl('input', { attr: { type: 'text', placeholder: 'mot' } });
    const inputNote = ajoutForm.createEl('input', { attr: { type: 'text', placeholder: 'définition courte (optionnel)' } });
    const inputTags = ajoutForm.createEl('input', { attr: { type: 'text', placeholder: 'tags séparés par une virgule (optionnel)' } });
    const btnAjouterMot = ajoutForm.createEl('button', { cls: 'cp-link-btn', text: 'Ajouter à mon dictionnaire personnel' });
    btnAjouterMot.addEventListener('click', async () => {
      const mot = inputMot.value.trim();
      if (!mot) { new Notice('Le mot est requis.'); return; }
      const tags = inputTags.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      await ajouteMotRarePerso(this.plugin, mot, inputNote.value.trim(), tags);
      new Notice(`« ${mot} » ajouté à ton dictionnaire personnel.`);
      inputMot.value = ''; inputNote.value = ''; inputTags.value = '';
      renderFiltresTags();
    });

    // --- stats, repliées en bas pour ne pas surcharger le haut du panel ---
    const statsDetails = panelHasard.createEl('details', { cls: 'cp-hasard-stats-details' });
    statsDetails.createEl('summary', { text: 'Afficher les statistiques' });
    statsDiv = statsDetails.createDiv({ cls: 'cp-hasard-stats' });
    statsDetails.addEventListener('toggle', () => { if (statsDetails.open) renderStats(); });
    renderStats();
  }

  buildPanelNotes(panelNotes){
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
            await ajouteMotRarePerso(this.plugin, e.mot, note, []);
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
            await ajouteMotChampLexicalPerso(this.plugin, theme, [], mot, note, { silencieux: true });
          });
        });
      }
    };
    rerender();
    btnRefresh.addEventListener('click', rerender);
    this._rafraichitPanelNotes = rerender;
  }

  async onClose(){}
}

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

/* =========================================================
   STYLE INJECTÉ EN JS
   (indépendant du chargement de styles.css, qui n'est pas
   toujours pris en compte selon la plateforme/le moment
   d'installation — on l'injecte donc nous-mêmes pour être sûr
   que l'affichage ne se retrouve jamais "tout collé")
   ========================================================= */
const CARNET_CSS = `
.carnet-poete-view{ padding: 4px 14px 24px; font-family: var(--font-interface); }
.carnet-poete-view h2{ font-family: var(--font-text); font-style: italic; font-weight: 500; margin-bottom: 4px; }
.cp-tabs{ display:flex; flex-wrap: wrap; gap: 2px 4px; margin: 10px 0 16px; border-bottom: 1px solid var(--background-modifier-border); }
.cp-tab{ background:none; border:none; box-shadow:none; padding: 6px 12px 8px; cursor:pointer; color: var(--text-muted); font-weight: 600; font-size: 0.88em; }
.cp-tab.active{ color: var(--text-normal); border-bottom: 2px solid var(--text-accent); }
.cp-panel{ display:none; }
.cp-panel.active{ display:block; }
.cp-textarea{ width: 100%; min-height: 160px; resize: vertical; font-family: var(--font-monospace); font-size: 0.92em; line-height: 1.8; padding: 10px 12px; border-radius: 4px; background: var(--background-primary-alt); border: 1px solid var(--background-modifier-border); color: var(--text-normal); }
.cp-toolbar{ display:flex; flex-wrap: wrap; justify-content: flex-end; align-items:center; gap: 8px 12px; margin-top: 6px; }
.cp-save-state{ font-size: 0.75em; color: var(--text-faint); font-style: italic; }
.cp-link-btn{ background:none; border:none; box-shadow:none; color: var(--text-muted); text-decoration: underline; font-size: 0.78em; cursor:pointer; padding:0; }
.cp-link-btn:hover{ color: var(--text-accent); }
.cp-analyse{ margin-top: 14px; }
.cp-ligne{ padding: 7px 0; border-bottom: 1px dashed var(--background-modifier-border); font-family: var(--font-monospace); font-size: 0.88em; }
.cp-ligne:last-child{ border-bottom:none; }
.cp-ligne-top{ display:flex; flex-wrap: wrap; align-items:center; row-gap: 4px; column-gap: 10px; }
.cp-ligne-alt{ display:flex; flex-wrap: wrap; align-items:center; row-gap: 4px; column-gap: 10px; margin-top: 4px; padding-top: 4px; border-top: 1px dotted var(--background-modifier-border); opacity: 0.85; }
.cp-texte{ flex: 1 1 220px; min-width: 140px; color: var(--text-normal); white-space: pre-wrap; word-break: break-word; letter-spacing: 0.2px; }
.cp-texte-alt{ flex: 1 1 220px; min-width: 140px; color: var(--text-muted); white-space: pre-wrap; word-break: break-word; font-style: italic; }
.cp-badges{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-left:auto; }
.cp-compte{ display:inline-block; color: #fff; background: var(--text-accent); font-weight: 700; min-width: 18px; text-align:center; padding: 2px 9px; border-radius: 10px; }
.cp-compte-alt{ background: var(--text-muted); }
.cp-metre{ font-family: var(--font-interface); font-size: 0.68em; color: var(--text-muted); background: var(--background-modifier-hover); padding: 2px 8px; border-radius: 10px; white-space:nowrap; }
.cp-genre{ display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; font-size:0.66em; font-weight:700; cursor:help; flex-shrink:0; }
.cp-genre-f{ background: var(--text-accent); color:#fff; }
.cp-genre-m{ background: var(--text-muted); color:#fff; }
.cp-total-bar{ display:flex; flex-wrap:wrap; justify-content: space-between; gap:8px; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--background-modifier-border); font-family: var(--font-monospace); font-size: 0.82em; color: var(--text-muted); }
.cp-total-bar strong{ color: var(--text-normal); }
.cp-rime-form{ display:flex; gap:6px; margin-bottom: 16px; }
.cp-sources{ display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:12px; font-size:0.82em; color: var(--text-muted); }
.cp-sources-label{ font-weight:600; }
.cp-source-toggle{ display:inline-flex; align-items:center; cursor:pointer; color: var(--text-normal); gap:2px; }
.cp-hasard-ligne-raccourcis{ display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:8px; }
.cp-hasard-toggle-pool{ display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:0.8em; font-weight:500; color: var(--text-muted); background: var(--background-primary-alt); border:1.5px solid var(--background-modifier-border); border-radius:14px; padding:4px 12px; }
.cp-hasard-toggle-pool:has(input:checked){ color: var(--text-normal); border-color: var(--text-accent); background: var(--background-modifier-hover); }
.cp-hasard-toggle-pool input{ margin:0; }
.cp-source-toggle input{ cursor:pointer; }
.cp-source-en-ligne{ border-left: 2px solid var(--background-modifier-border); padding-left: 10px; }
.cp-cnrtl-bloc{ border:1px solid var(--background-modifier-border); border-radius:8px; padding:12px 14px; margin-bottom:12px; background: var(--background-primary-alt); }
.cp-cnrtl-titre{ font-family: var(--font-text); font-weight:700; font-size:1em; color: var(--text-accent); margin-bottom:8px; }
.cp-cnrtl-texte{ font-size:0.86em; line-height:1.6; color: var(--text-normal); white-space: normal; }
.cp-cnrtl-lien{ display:inline-block; margin-bottom:12px; font-size:0.85em; }
.cp-filtres{ display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:10px; font-size:0.82em; }
.cp-filtre-lettre{ width:56px; text-align:center; }
.cp-filtre-syllabes{ font-size:0.9em; }
.cp-qualite-filtres{ display:flex; gap:8px; flex-wrap:wrap; }
.cp-qualite-sousfiltres{ margin-left:16px; padding-left:10px; border-left: 2px solid var(--background-modifier-border); font-size:0.95em; opacity:0.85; }
.cp-qualite{ margin-left:3px; font-weight:700; border-radius:3px; padding:0 3px; cursor:help; }
.cp-qualite-pauvre{ color: var(--text-faint); }
.cp-qualite-suffisante{ color: var(--text-muted); }
.cp-qualite-riche{ color: var(--text-accent); }
.cp-qualite-tresriche{ color: #8e44ad; }
.cp-qualite-leonine{ color: #d4af37; }
.cp-synthese-qualite{ display:flex; gap:14px; flex-wrap:wrap; margin-bottom:10px; font-size:0.78em; color: var(--text-muted); }
.cp-synthese-item{ display:inline-flex; align-items:center; gap:5px; text-transform:capitalize; }
.cp-synthese-pastille{ display:inline-block; width:9px; height:9px; border-radius:50%; }
.cp-rime-lettre{ display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; border:1.5px solid; font-size:0.62em; font-weight:700; cursor:help; flex-shrink:0; }
.cp-schema-rimes{ margin-top:8px; }
.cp-schema-ligne{ display:flex; align-items:center; gap:8px; font-family: var(--font-monospace); font-size:0.8em; color: var(--text-muted); padding:2px 0; letter-spacing:0.15em; }
.cp-hasard-bouton-wrap{ display:flex; justify-content:center; margin-bottom:20px; }
.cp-hasard-bouton{ display:inline-flex; align-items:center; justify-content:center; text-align:center; width:auto; padding:12px 32px; font-family: var(--font-text); font-style:italic; font-size:1.1em; font-weight:600; background: var(--background-primary) !important; color: var(--text-muted) !important; border:1.5px solid var(--text-faint) !important; border-radius:24px; cursor:pointer; transition: background 0.15s, border-color 0.15s, transform 0.1s; }
.cp-hasard-bouton:hover{ border-color: var(--text-muted) !important; color: var(--text-normal) !important; transform: translateY(-1px); }
.cp-hasard-zone{ margin-top:22px; text-align:center; padding:24px 20px; background: var(--background-primary-alt); border:1px solid var(--background-modifier-border); border-radius:12px; }
.cp-hasard-mot{ font-family: var(--font-text); font-style:italic; font-weight:700; font-size:2em; color:#c0392b; margin-bottom:10px; }
.cp-hasard-note{ font-size:0.9em; color: var(--text-muted); max-width:44ch; margin:0 auto 16px; line-height:1.6; }
.cp-hasard-note-partie{ white-space:pre-line; text-align:justify; }
.cp-hasard-note-partie + .cp-hasard-note-partie{ margin-top:8px; }
.cp-hasard-note-sep{ font-size:0.8em; opacity:0.45; margin:6px 0; letter-spacing:0.2em; }
.cp-hasard-actions{ display:flex; justify-content:center; gap:18px; flex-wrap:wrap; }
.cp-hasard-stats{ display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.cp-hasard-compteur-pool{ font-size:0.78em; color: var(--text-faint); margin-bottom:8px; }
.cp-hasard-stats-detail{ display:flex; flex-direction:column; gap:10px; margin-top:12px; width:100%; }
.cp-hasard-stats-bloc .cp-titre{ font-size:0.7em; text-transform:uppercase; letter-spacing:0.05em; color: var(--text-faint); margin-bottom:4px; }
.cp-hasard-stats-liste{ display:flex; flex-wrap:wrap; gap:4px; }
.cp-hasard-stats-chip{ font-size:0.72em; border:1px solid; border-radius:8px; padding:1px 8px; }
.cp-hasard-stats-details{ margin-top:20px; font-size:0.85em; }
.cp-hasard-stats-details summary{ cursor:pointer; color: var(--text-muted); }
.cp-hasard-stat{ font-size:0.75em; font-weight:600; border-radius:10px; padding:2px 10px; border:1px solid; }
.cp-hasard-stat-total{ color: var(--text-muted); background: var(--background-primary-alt); border-color: var(--background-modifier-border); }
.cp-hasard-stat-exclus{ color:#a3831f; background: rgba(212,175,55,0.15); border-color:#a3831f; }
.cp-hasard-stat-sanstag{ color:#d68910; background: rgba(214,137,16,0.12); border-color:#d68910; }
.cp-hasard-stat-vu{ color:#27ae60; background: rgba(39,174,96,0.12); border-color:#27ae60; }
.cp-hasard-filtres{ font-size:0.82em; margin-bottom:4px; }

/* Bandeau de raccourcis toujours visible : boîte titrée, pilules centrées */
.cp-hasard-bandeau{ padding:10px 12px; border-radius:8px; background: var(--background-primary-alt); border:1px solid var(--background-modifier-border); margin-bottom:10px; }
.cp-hasard-bandeau .cp-titre{ font-size:0.72em; text-transform:uppercase; letter-spacing:0.05em; color: var(--text-faint); margin-bottom:8px; text-align:center; }
.cp-hasard-bandeau .cp-hasard-filtres-rapides{ justify-content:center; }

/* Section repliable (Filtrer / Exclure) */
.cp-hasard-section-repliable{ border-radius:8px; margin-bottom:10px; overflow:hidden; }
.cp-hasard-section-header{ display:flex; align-items:center; gap:6px; padding:8px 12px; cursor:pointer; user-select:none; }
.cp-hasard-section-caret{ font-size:0.75em; color: var(--text-faint); width:1em; }
.cp-hasard-section-titre{ font-size:0.78em; text-transform:uppercase; letter-spacing:0.05em; font-weight:700; }
.cp-hasard-section-badge{ font-size:0.78em; font-weight:600; opacity:0.85; }
.cp-hasard-section-body{ padding:0 12px 12px; }
.cp-hasard-section-inclusion{ background: rgba(142,68,173,0.06); border:1px solid rgba(142,68,173,0.25); }
.cp-hasard-section-inclusion .cp-hasard-section-titre, .cp-hasard-section-inclusion .cp-hasard-section-badge{ color:#8e44ad; }
.cp-hasard-section-inclusion .cp-hasard-tous-tags-box{ border-color: rgba(142,68,173,0.25); }
.cp-hasard-section-exclusion{ background: rgba(212,175,55,0.08); border:1px solid rgba(212,175,55,0.35); }
.cp-hasard-section-exclusion .cp-hasard-section-titre, .cp-hasard-section-exclusion .cp-hasard-section-badge{ color:#a3831f; }
.cp-hasard-section-exclusion .cp-hasard-tous-tags-box{ border-color: rgba(212,175,55,0.35); }

/* Formulaire sur une seule ligne : champ + bouton d'ajout + voir tous les
   tags, tous alignés plutôt qu'empilés sur des lignes séparées */
.cp-hasard-ligne-form{ display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.cp-hasard-mode-et{ display:flex; align-items:center; gap:6px; font-size:0.8em; color: var(--text-muted); cursor:pointer; margin-top:8px; }
.cp-hasard-mode-et input{ cursor:pointer; }
.cp-hasard-ligne-form input{ font-size:0.85em; flex:1; min-width:140px; }
.cp-hasard-filtres-rapides-inline{ flex:0 0 auto; }

.cp-hasard-filtres-rapides{ display:flex; flex-wrap:wrap; gap:8px; }
.cp-hasard-filtre-rapide{ font-size:0.8em; font-weight:500; background:transparent; border:1.5px solid; border-radius:14px; padding:4px 12px; cursor:pointer; transition: background 0.15s, color 0.15s; }
.cp-hasard-filtre-rapide-actif{ font-weight:700; }
.cp-hasard-filtres-chips{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:8px; }
.cp-hasard-tags{ display:flex; justify-content:center; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
.cp-hasard-graver-wrap{ display:flex; justify-content:center; margin-top:18px; padding-top:18px; border-top:1.5px solid var(--text-faint); }
.cp-hasard-graver-btn{ font-size:0.82em; font-weight:500; background:transparent; border:1.5px solid var(--text-accent); color: var(--text-accent); border-radius:14px; padding:6px 16px; cursor:pointer; }
.cp-hasard-graver-btn:hover{ background: var(--text-accent); color:#fff; }
.cp-hasard-tag-presets{ display:flex; justify-content:center; gap:6px; flex-wrap:wrap; margin-top:18px; padding-top:18px; margin-bottom:6px; border-top:1.5px solid var(--text-faint); }
.cp-hasard-voir-tous-tags{ font-size:0.78em; flex:0 0 auto; }
.cp-hasard-preset-btn{ font-size:0.75em; background:transparent; border:1.5px solid var(--background-modifier-border); border-radius:10px; padding:2px 10px; cursor:pointer; }
/* Panneau "tous les tags" aplati : plus de boîte-dans-la-boîte quand il vit
   dans une section déjà colorée — un simple séparateur suffit */
.cp-hasard-tous-tags-box{ margin-top:10px; padding-top:10px; background:transparent; border:none; border-top:1px solid var(--background-modifier-border); border-radius:0; }
.cp-hasard-tous-tags-filtre{ width:100%; font-size:0.82em; margin-bottom:8px; }
.cp-hasard-tous-tags-grille{ display:flex; flex-wrap:wrap; gap:4px; max-height:160px; overflow-y:auto; }
.cp-hasard-preset-btn-mini{ font-size:0.72em; background: var(--background-primary); border:1px solid var(--background-modifier-border); border-radius:8px; padding:1px 8px; cursor:pointer; }
.cp-hasard-preset-btn-mini:hover{ opacity:0.75; }
.cp-hasard-preset-btn:hover{ opacity:0.75; }
.cp-tag-chip{ display:inline-flex; align-items:center; gap:2px; font-size:0.72em; font-weight:500; background: var(--background-primary-alt); border:1px solid var(--background-modifier-border); border-radius:10px; padding:2px 8px; color: var(--text-muted); }
.cp-tag-chip-exclu{ background:#a3831f; border-color:#a3831f; color:#fff; }
.cp-tag-chip-x{ cursor:pointer; opacity:0.75; }
.cp-tag-chip-x:hover{ opacity:1; }
.cp-btn-exclure{ color:#a3831f; }
.cp-hasard-tag-ajout{ display:flex; justify-content:center; gap:8px; margin-top:12px; }
.cp-hasard-tag-ajout input{ background: var(--background-primary); border:1px solid var(--background-modifier-border); }
.cp-hasard-tag-ajout input{ font-size:0.8em; width:180px; }
.cp-hasard-exclus, .cp-hasard-ajout{ margin-top:20px; font-size:0.85em; }
.cp-hasard-exclus summary, .cp-hasard-ajout summary{ cursor:pointer; color: var(--text-muted); }
.cp-hasard-exclu-ligne{ display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px dashed var(--background-modifier-border); }
.cp-hasard-ajout-form{ display:flex; flex-direction:column; gap:6px; margin-top:8px; max-width:400px; }
.cp-hasard-exclus, .cp-hasard-ajout{ margin-top:16px; font-size:0.85em; color: var(--text-muted); }
.cp-hasard-exclus summary, .cp-hasard-ajout summary{ cursor:pointer; }
.cp-rime-form input{ flex:1; }
.cp-son-label{ font-family: var(--font-text); font-style: italic; color: var(--text-accent); margin-bottom: 10px; }
.cp-groupe{ margin-bottom: 10px; }
.cp-titre{ font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); margin-bottom: 6px; }
.cp-mots{ display:flex; flex-wrap:wrap; gap:6px; }
.cp-mot{ display:inline-block; font-family: var(--font-monospace); font-size: 0.84em; background: var(--background-primary-alt); border: 1px solid var(--background-modifier-border); border-left: 3px solid var(--text-accent); padding: 4px 8px; border-radius: 3px; color: var(--text-normal); }
.cp-mot sup{ color: var(--text-faint); margin-left:2px; }
.cp-mot-syno{ border-left-color: var(--text-accent); }
.cp-mot-excluable{ cursor:pointer; }
.cp-mot-exclu{ opacity:0.4; text-decoration: line-through; }
.cp-mot-anto{ border-left-color: var(--text-muted); opacity: 0.85; }
.cp-mot-assonance{ border-left-style: dashed; border-left-color: var(--text-faint); opacity: 0.8; }
.cp-label-assonance{ color: var(--text-faint); font-style: italic; }
.cp-bloc-assonance{ border-top: 1px dashed var(--background-modifier-border); padding-top: 10px; margin-top: 6px; }
.cp-guide-titre{ font-family: var(--font-text); font-style: italic; font-weight: 500; font-size: 1.05em; margin: 22px 0 8px; color: var(--text-accent); }
.cp-guide-titre:first-child{ margin-top: 0; }
.cp-guide-p{ font-size: 0.86em; color: var(--text-muted); line-height: 1.6; margin: 0 0 8px; }
.cp-guide-liste{ margin: 0 0 14px; padding-left: 20px; font-size: 0.86em; line-height: 1.6; }
.cp-guide-liste li{ margin-bottom: 8px; color: var(--text-normal); }
.cp-guide-liste strong{ color: var(--text-accent); }
.cp-vide{ color: var(--text-muted); font-style: italic; font-size:0.9em; }
.cp-inspi-intro{ color: var(--text-muted); font-size:0.85em; margin-bottom:14px; line-height:1.5; }
.cp-inspi-liste{ display:flex; flex-direction:column; gap:6px; }
.cp-inspi-mot{ display:flex; flex-wrap:wrap; align-items:baseline; gap:8px; padding:5px 0; border-bottom:1px dashed var(--background-modifier-border); }
.cp-inspi-mot:last-child{ border-bottom:none; }
.cp-inspi-terme{ font-family: var(--font-text); font-weight:600; color: var(--text-accent); white-space:nowrap; }
.cp-inspi-note{ font-size:0.82em; color: var(--text-muted); font-style:italic; }
.cp-inspi-cliquable{ cursor:pointer; border-radius:3px; }
.cp-inspi-cliquable:hover{ box-shadow: 0 0 0 2px var(--background-modifier-hover); }
.cp-inspi-cliquable.cp-selectionne{ background:#c0392b !important; border-color:#c0392b !important; color:#fff !important; }
.cp-inspi-action-bar{ display:flex; flex-direction:column; gap:10px; margin:14px 0; padding:12px; background: var(--background-primary-alt); border:1px solid var(--background-modifier-border); border-radius:8px; }
.cp-inspi-selection-chips{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:0.85em; }
.cp-inspi-selection-actions{ display:flex; flex-wrap:wrap; gap:10px; }
.cp-inspi-ajout-form{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; width:100%; margin-top:4px; padding:8px; background: var(--background-primary); border-radius:6px; }
.cp-inspi-ajout-form input{ font-size:0.82em; }
.cp-inspi-ajout-form input[placeholder^="thème"]{ width:150px; }
.cp-inspi-ajout-form input[placeholder^="mots-clés"]{ flex:1; min-width:160px; }
.cp-inspi-suggestion{ width:100%; font-size:0.8em; color: var(--text-muted); }
.cp-inspi-suggestion .cp-link-btn{ font-weight:600; }
.cp-footer{ margin-top: 20px; padding-top: 10px; border-top: 1px solid var(--background-modifier-border); font-size: 0.72em; color: var(--text-faint); line-height: 1.6; }
.cp-hiatus-badge{ display:inline-block; font-size: 0.68em; color: var(--text-accent); border: 1px solid var(--text-accent); border-radius: 8px; padding: 1px 7px; white-space: nowrap; }
.cp-hiatus-badge-synerese{ color: var(--text-muted); border-color: var(--background-modifier-border); cursor: help; }
`;

/* =========================================================
   PLUGIN
   ========================================================= */

module.exports = class CarnetDuPoetePlugin extends Plugin {
  async onload(){
    this.injectStyles();
    await chargeDictionnairePerso(this);

    const data = await this.loadData();
    MODE_ASSONANCE = !!(data && data.modeAssonance);
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
