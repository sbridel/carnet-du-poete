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
const COULEURS_QUALITE = { pauvre: '#a1a8a8', suffisante: '#5f9ac0', riche: '#c26f66', tresriche: '#a478b6', leonine: '#ccb97c' };
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
  badgeMot.style.borderColor = COULEURS_QUALITE[q];
  const b = badgeMot.createEl('sup', { cls: 'cp-qualite cp-qualite-' + q, text: LETTRES_QUALITE[q] });
  b.setAttr('title', `Rime ${LABELS_QUALITE[q]} — ${EXPLICATIONS_QUALITE[q]} (heuristique phonétique approchée)`);
  b.setAttr('title', `Rime ${q} (approximatif, orthographique)`);
  return q;
}

