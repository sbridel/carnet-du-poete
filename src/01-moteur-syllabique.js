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
  if (w.endsWith('ent') && w.length > 3 && finMuetteEnEnt(w)) {
    // "-ent" verbal muet, 3e personne du pluriel (ils dorment, elles
    // s'enivrent...) : réutilise finMuetteEnEnt, déjà écrite et déjà
    // utilisée pour le comptage de syllabes, mais qui n'était jusqu'ici
    // jamais consultée par le moteur de rimes. Sans ce retrait, "enivrent"
    // gardait son "-ent" et se comparait comme s'il se terminait par le
    // son nasal [ɑ̃], au lieu du vrai son [ivʁ] partagé avec "livres".
    w = w.slice(0, -3);
  } else if (w.endsWith('er') && w.length > 2 && !EXCEPTIONS_ER_PRONONCE.has(w)) {
    w = w.slice(0, -2) + 'é';
  } else if (w.endsWith('ez') && w.length > 2 && !EXCEPTIONS_EZ_PRONONCE.has(w)) {
    w = w.slice(0, -2) + 'é';
  }
  // NB : la consonne finale muette (d/t/x) n'est PLUS retirée ici — elle
  // reste dans le mot le temps du découpage en syllabes (cleFinApprox,
  // segmentsPhonetiques, decoupeSyllabesRime), pour que ces fonctions
  // puissent s'appuyer dessus et repérer la vraie syllabe finale porteuse
  // de la rime. Avant ce correctif, la retirer ici faisait apparaître un
  // "e" en toute fin de mot (ex. "rejet" -> "reje") qui se faisait alors
  // passer à tort pour un e muet classique (comme "vole") : l'ancrage
  // reculait vers une syllabe précédente sans rapport ("re-" au lieu de
  // "-jet"), cassant la rime avec "jais"/"forêt" etc. Chacune des 3
  // fonctions retire maintenant cette consonne elle-même, une fois la clé
  // déjà assemblée (voir stripConsonneMuetteFinale ci-dessous).
  return normaliseTiVersS(w);
}

/* Retire une consonne finale muette (d/t/x) d'une clé de rime déjà
   assemblée — miroir du retrait autrefois fait trop tôt dans
   preparerMotRime (voir commentaire ci-dessus). Centralisé ici pour que
   les 3 fonctions qui en ont besoin (cleFinApprox, segmentsPhonetiques,
   decoupeSyllabesRime) appliquent exactement la même règle. */
function stripConsonneMuetteFinale(cle){
  return (cle || '').replace(/[dtx]$/, '');
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

  // Un "y" qui EST la voyelle (pas suivi d'une autre voyelle, donc pas le
  // cas semi-consonne juste au-dessus) se prononce exactement comme "i"
  // (zéphyr/frémir, rugby/pari, martyr/sortir) — sans cette équivalence,
  // "yr" et "ir" restent deux clés différentes pour le même son [iʁ].
  cle = cle.replace(/^y(?=[^aeiouyàâäéèêëîïôöùûüÿœ]|$)/, 'i');

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

  // "ille" final = yod [j] (fille, abeille, grenouille...), un timbre
  // différent d'un simple "elle" [ɛl] (nouvelle, ficelle...) malgré une
  // écriture proche. Sans ce cas à part, les deux s'effondrent sur la
  // même clé via les règles générales plus bas (bug constaté :
  // "abeille"/"nouvelle" jugées comme une rime exacte) — la règle "ei→ai"
  // et la règle "e isolé devant consonne→ai" produisent par coïncidence
  // la même sortie intermédiaire "aille" une fois la lettre doublée
  // réduite, sans qu'aucune des deux ne sache qu'il s'agissait en fait
  // d'un yod. Marqueur "J" majuscule (pas "y") : la constante VOYELLES
  // est tout en minuscules, donc coeurVocalique() s'arrête bien avant le
  // marqueur au lieu de l'avaler dans le "cœur" — sinon le mode assonance
  // ne reconnaissait plus "fille"/"ville" comme partageant la même
  // voyelle "i", puisque leurs deux clés ("iy" et "ile") semblaient ne
  // rien avoir en commun dès que le "y" était compté comme une voyelle.
  // Même liste d'exceptions que pour la trame phonique (illResteConsonne)
  // — ville/tranquille/mille... où "ill" reste deux vraies consonnes l.
  const finYod = w.match(/([aeiouyàâäéèêëîïôöùûüÿœ]*i)lle?$/);
  if (finYod && !illResteConsonne(w)) {
    return (normaliseSonsFinal(finYod[1]) || '') + 'J';
  }

  const groupes = trouveGroupesAvecPositions(w);
  if (groupes.length === 0) return w;

  // On ancre la clé sur la DERNIÈRE voyelle réellement prononcée, pas sur
  // un nombre fixe de lettres : "sombre" et "ténèbres" se terminent tous
  // les deux en "-bre" mais ne riment pas (voyelles différentes) — un
  // simple découpage aux 2 dernières lettres les confondait à tort.
  let idxAncre = groupes.length - 1;
  const dernier = groupes[idxAncre];
  let finCle = w.length;
  if (dernier.fin === w.length && dernier.texte.endsWith('e')) {
    // e muet final : la vraie rime est portée par la voyelle d'avant.
    // On retire uniquement la lettre "e" finale — que le groupe de
    // voyelles soit "e" tout seul (vole -> ol) ou fusionné avec d'autres
    // voyelles qui le précèdent (effraie -> ai, joue -> ou, rue -> u) :
    // dans les deux cas ce "e" ne se prononce pas et ne doit jamais
    // rester dans la clé. "vole" (avec e) et "bol" (sans e) ont
    // exactement le même son [ɔl], seul le genre change — déjà suivi
    // séparément par le badge F/M. Avant ce correctif, seul le cas "e"
    // isolé était traité : "effraie" gardait un "aie" bien distinct du
    // "ai" de "frais"/"forêt", empêchant toute concordance de clé pour
    // toute la famille de mots en "-aie"/"-oue"/"-ue" (rime jugée à tort
    // "assonance", voire refusée, y compris quand le dico phonétique
    // confirmait pourtant l'accord).
    finCle = w.length - 1;
    if (finCle <= dernier.debut && idxAncre > 0) {
      // le groupe ne contenait QUE ce "e" -> reculer au groupe vocalique précédent
      idxAncre--;
    }
  }
  const cle = stripConsonneMuetteFinale(normaliseSonsFinal(w.slice(groupes[idxAncre].debut, finCle)));

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

// Bascule globale "rimes continues entre strophes" : par défaut, la
// nomenclature des rimes (A, B, C...) repart de zéro à chaque strophe.
// Activée, elle se poursuit d'une strophe à l'autre (utile pour les
// sonnets : quatrains ABBA ABBA puis tercets CCD EED plutôt que AAB AAB).
let RIMES_CONTINUES = false;

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
  const richeA = cleRicheMot(motA), richeB = cleRicheMot(motB);
  const finA = cleFinApprox(motA), finB = cleFinApprox(motB);
  const coeurA = coeurVocalique(finA), coeurB = coeurVocalique(finB);
  const coeurCompatible = !!(coeurA && coeurB && coeurA === coeurB);

  if (richeA && richeB) {
    // Les deux mots sont couverts par le dico phonétique : priorité au
    // dico, comme partout ailleurs dans le plugin ("dico d'abord, repli
    // heuristique ensuite") — l'approximation orthographique ne sert plus
    // qu'à écarter un faux positif si le dico se trompait franchement,
    // jamais à imposer une rime que le dico contredit. Avant ce
    // réordonnancement, une coïncidence purement orthographique pouvait
    // renvoyer "rime" sans même consulter le dico (ex. "abeille"/"nouvelle"
    // partagent la même clé approximative "aile" malgré des sons réels
    // différents, [ɛj] contre [ɛl] — jamais rattrapé si les deux mots
    // étaient dans le dico avec des transcriptions distinctes).
    if (richeA === richeB) {
      // Même groupe du dico. Si les deux mots ont une transcription
      // complète, c'est la voyelle finale TRANSCRITE qui départage (ex.
      // "sombre" [§] / "ténèbres" [E] sous une même clé "bR" : pas de
      // rime). L'orthographe ne sert qu'en l'absence de transcription :
      // elle ne peut pas savoir que "aimerai" (futur) se prononce [e] et
      // refusait à tort "aimerai"/"juré" une fois le dico corrigé.
      const vA = voyelleFinalePhon(motA), vB = voyelleFinalePhon(motB);
      if (vA && vB) return vA === vB ? 'rime' : null;
      return (!coeurA || !coeurB || coeurCompatible) ? 'rime' : null;
    }
    // Groupes dico différents : pas de "rime riche" partagée (la consonne
    // d'attaque de la dernière syllabe diffère, ex. "frais" [fʁɛ] vs
    // "jais" [ʒɛ] : "RE" contre "ZE"). Mais si les deux mots n'ont plus
    // rien après leur voyelle finale (fin réduite à son seul noyau
    // vocalique des deux côtés) et que ce noyau concorde, c'est encore
    // une rime valide au sens classique — une "rime pauvre" (même son
    // final, rien à faire concorder ensuite), pas une simple assonance.
    // Dès qu'il reste une consonne après la voyelle dans l'un des deux
    // mots, on ne peut pas garantir qu'elle concorderait aussi (on
    // n'a que la clé de groupe, pas la transcription complète) : on
    // reste alors prudemment sur "assonance", comme avant.
    // Même principe qu'au-dessus : transcriptions complètes d'abord (fin
    // réduite à la voyelle = transcription qui se termine par elle).
    const pA = phonetiqueMot(motA), pB = phonetiqueMot(motB);
    const vA = voyelleFinalePhon(motA), vB = voyelleFinalePhon(motB);
    if (vA && vB) {
      if (vA === vB && pA.endsWith(vA) && pB.endsWith(vB)) return 'rime';
      return vA === vB ? 'assonance' : null;
    }
    if (coeurCompatible && finA === coeurA && finB === coeurB) return 'rime';
    return coeurCompatible ? 'assonance' : null;
  }

  // Repli : au moins un des deux mots n'est pas couvert par le dico — on
  // se fie à l'approximation orthographique seule. Le marqueur yod "J"
  // (voir cleFinApprox) distingue déjà correctement "eille"/"elle" ici.
  if (finA && finB && finA === finB) return 'rime';
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
   rime (par ordre d'apparition des sons distincts dans la strophe).
   Par défaut, repart de zéro à chaque appel (une strophe = son propre
   alphabet). Si un `etat` partagé ({ representants, prochaine }) est
   fourni, il est réutilisé ET mis à jour en place, ce qui permet de
   poursuivre la nomenclature d'une strophe à l'autre (mode continu). */
function calculeSchemaStrophe(derniersMots, etat){
  const lettres = [];
  const representants = etat ? etat.representants : []; // { mot, lettre }
  derniersMots.forEach(mot => {
    if (!mot || !normaliseMot(mot)) { lettres.push(null); return; }
    const rep = representants.find(r => memeRime(r.mot, mot));
    if (rep) {
      lettres.push(rep.lettre);
    } else {
      const prochaine = etat ? etat.prochaine : representants.length;
      const lettre = String.fromCharCode(65 + (prochaine % 26));
      if (etat) etat.prochaine++;
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

  // En mode continu, un seul état (représentants + compteur de lettres)
  // est partagé et mis à jour au fil des strophes ; sinon chaque strophe
  // repart de zéro (comportement historique).
  const etatContinu = RIMES_CONTINUES ? { representants: [], prochaine: 0 } : null;

  const schemaStrophes = strophes.map(indices => {
    const derniersMots = indices.map(i => {
      const det = lignes[i].r.details;
      return det.length ? det[det.length - 1].mot : '';
    });
    const lettres = calculeSchemaStrophe(derniersMots, etatContinu);
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

