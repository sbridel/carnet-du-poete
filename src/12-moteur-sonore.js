/* =========================================================
   MOTEUR D'ANALYSE SONORE (allitérations / assonances internes)
   ========================================================= */

const MOTS_OUTILS = new Set([
  'le','la','les','un','une','des','du','de','au','aux','ce','ces','cet','cette',
  'je','tu','il','elle','on','nous','vous','ils','elles','me','te','se','lui','leur',
  'mon','ma','mes','ton','ta','tes','son','sa','ses','notre','votre','leurs',
  'et','ou','mais','donc','or','ni','car','que','qui','quoi','dont',
  'à','en','dans','sur','sous','par','pour','avec','sans','vers','chez','entre',
  'ne','pas','plus','y','si','est','sont'
]);

// Combien de lettres orthographiques correspondent au son consonantique
// initial, pour savoir quoi souligner dans le brouillon (indépendant de
// la source du son lui-même — dico ou heuristique).
function longueurSonInitial(mot){
  const w = nettoieMot(mot).replace(/^[l dtsqcnm]'/, ''); // retire une élision (l'humus → humus)
  const digraphes = ['ch','ph','gn','qu','gu'];
  for (const d of digraphes) if (w.startsWith(d)) return d.length;
  return 1;
}

/* Alphabet du dictionnaire phonétique (type X-SAMPA) → symboles utilisés
   par le repli heuristique et les tables de familles/thèmes. Sans ce
   passage, un mot trouvé dans le dico (ex. transcrit avec R/S/Z/J
   majuscules) formait sa propre "famille" à un seul membre au lieu de
   rejoindre r/ʃ/ʒ/ɲ — visible dans la légende comme un symbole isolé à
   côté des vrais noms de familles. */
const CONSONNE_PHON_VERS_HEURISTIQUE = { R:'r', S:'ʃ', Z:'ʒ', J:'ɲ' };

// "ch" se prononce [k] dans une poignée de mots d'origine grecque ou
// technique (chœur, chrome, écho, orchestre, psychologie, pétrichor...)
// au lieu du [ʃ] habituel (chien, chaleur...). Racines vérifiées par
// inclusion, comme illResteConsonne, pour couvrir les dérivés
// (chronologie, archéologique, technologique...) sans les lister un par
// un. Liste courte et non exhaustive, comme les autres exceptions du
// repli heuristique.
const RACINES_CH_K = [
  'chœur', 'choeur', 'chrom', 'chron', 'chora', 'choré', 'écho', 'orchest',
  'psych', 'archéo', 'archaïq', 'chaos', 'chaotiq', 'chlor', 'chrétien',
  'techniqu', 'technolog', 'pétrichor', 'orchid', 'chiropra'
];
function chEstK(w){
  return RACINES_CH_K.some(racine => w.includes(racine));
}

/* Son initial d'un mot (pour allitérations). Mode dico prioritaire via
   phonetiqueMot (transcription complète déjà utilisée pour le e muet),
   repli sur une petite table orthographique sinon. Ignore les mots
   commençant par une voyelle (pas d'allitération consonantique claire) et
   le h muet. */
function soninitial(mot){
  const w = nettoieMot(mot).replace(/^[ldtsqcnm]'/, '');
  if (!w) return null;
  const phon = phonetiqueMot(mot);
  if (phon) {
    // Le mot doit VRAIMENT commencer par un son consonne — sinon la
    // boucle ci-dessous trouvait la première consonne n'importe où dans
    // la transcription (ex. "écrit" → « ekri » → renvoyait "k", trouvé au
    // milieu, comme si le mot commençait par lui). Un mot qui commence
    // par une voyelle n'a par définition aucune allitération possible.
    if (VOYELLES_PHON.has(phon[0])) return null;
    // Le yod [j] compte comme un vrai son initial pour l'allitération
    // (yeux, hier, ion...) — cohérent avec la trame phonique, qui le
    // reconnaît déjà. Les autres semi-consonnes (w, ɥ) restent ignorées,
    // comme avant : trop rares en position initiale pour valoir la peine.
    if (phon[0] === 'j') return 'j';
    for (const ch of phon) {
      if (!VOYELLES_PHON.has(ch) && !GLIDES_PHON.has(ch)) return CONSONNE_PHON_VERS_HEURISTIQUE[ch] || ch;
    }
    return null; // transcription entière en voyelles/semi-consonnes
  }
  let w2 = w;
  if (w2[0] === 'h') w2 = w2.slice(1); // h muet, le plus souvent
  if (!w2) return null;
  // "y" en tête suivi d'une voyelle est un yod (yeux, yoga, yaourt), pas
  // la voyelle [i] qu'il représente ailleurs (stylo, gym) — même logique
  // que le "j" du dico juste au-dessus, appliquée ici par écriture plutôt
  // que par transcription.
  if (w2[0] === 'y' && estVoyelle(w2[1])) return 'j';
  if (estVoyelle(w2[0])) return null;
  if (w2.startsWith('ch')) return chEstK(w2) ? 'k' : 'ʃ';
  if (w2.startsWith('ph')) return 'f';
  if (w2.startsWith('gn')) return 'ɲ';
  if (w2.startsWith('qu')) return 'k';
  if (w2.startsWith('gu') && estVoyelle(w2[2])) return 'g';
  if (w2[0] === 'c') return /^[eéèêëiîïy]/.test(w2.slice(1)) ? 's' : 'k';
  if (w2[0] === 'g') return /^[eéèêëiîïy]/.test(w2.slice(1)) ? 'ʒ' : 'g';
  return w2[0];
}

// Normalise un groupe de voyelles interne à un mot, en tenant compte du
// contexte (dernier groupe ? nasalisation ?) — contrairement à la version
// précédente, purement textuelle, qui confondait par exemple "chien"
// (nasal [j̃ɛ̃]) avec "miel"/"dernier" (non nasal [jɛ]), et le "-ie" final
// de "poésie"/"cérynie" (i réel + e muet) avec le "ie" glissant de
// "miel" (semi-consonne + e).
function normaliseGroupeInterne(w, g, estDernier){
  let texte = g.texte;

  // "-ie" final après une consonne (poésie, cérynie, vie...) : le e est
  // muet, seul le "i" est réellement prononcé — à distinguer du "ie"
  // glissant de "miel"/"dernier" (semi-consonne + e), traité plus bas.
  if (estDernier && g.fin === w.length && texte.length > 1 && texte.endsWith('e')) {
    texte = texte.slice(0, -1);
  } else if (estDernier && texte === 'e' && g.fin === w.length) {
    return null; // e muet seul (tombe, orage...) : rien à garder
  }

  // Nasalisation : un m/n juste après ce groupe, non suivi d'une voyelle
  // (ni d'un autre m/n), nasalise la voyelle. Vérifié sur le texte BRUT
  // (avant de retirer la semi-consonne i/y ci-dessous), car "ien"/"yen"
  // (chien, bien, moyen...) est une exception connue : toujours [j̃ɛ̃],
  // jamais la famille "an" qu'on attendrait d'un "en" nasalisé isolé.
  const suite = w.slice(g.fin);
  const nasalise = /^[mn](?![mnaeiouyàâäéèêëîïôöùûüÿœ])/.test(suite);
  if (nasalise) {
    if (/^[iy]en?$/.test(texte)) texte = 'in'; // chien, bien, moyen — exception
    else {
      const NASAL_MAP = { a:'an', e:'an', ai:'in', ei:'in', i:'in', y:'in', o:'on', u:'un', oi:'in', io:'on' };
      if (NASAL_MAP[texte]) texte = NASAL_MAP[texte];
    }
  }

  // Semi-consonne i/y en attaque devant une autre voyelle du même groupe
  // (chien, miel, pierre...) : ce n'est pas la voyelle porteuse du son.
  texte = texte.replace(/^[iy](?=[aeiouyàâäéèêëîïôöùûüÿœ])/, '');
  if (!texte) return null;

  // "i" final de groupe suivi de "ll" (grenouille, chatouille...) : même
  // yod que dans "fille" [fij], pas une troisième voyelle qui fusionne
  // avec "ou" — "grenouille" ne se prononce pas [ɡʁənwi] mais [ɡʁənuj].
  // Retiré ici pour la même raison que la semi-consonne en attaque
  // au-dessus, sauf dans les mots où "ill" reste une vraie consonne l
  // (ville, tranquille...), même liste que pour la trame phonique.
  if (texte.length > 1 && texte.endsWith('i') && w.slice(g.fin, g.fin + 2) === 'll' && !illResteConsonne(w)) {
    texte = texte.slice(0, -1);
  }
  if (!texte) return null;

  // Équivalences sans condition de position (toujours vraies, qu'on soit
  // en fin de mot ou non). "eau"/"au" se prononcent [o] de façon fiable
  // quelle que soit la position (contrairement au "o" seul, qui peut être
  // ouvert ou fermé selon le mot) — contrairement aux autres règles de
  // normaliseSonsFinal, celle-ci ne dépend pas de ce qui suit.
  texte = texte
    .replace(/î/g, 'i').replace(/â/g, 'a').replace(/û/g, 'u')
    .replace(/^œu/, 'eu').replace(/^oeu/, 'eu')
    .replace(/^ê/, 'e').replace(/^è/, 'e')
    .replace(/^eau/, 'o').replace(/^au/, 'o');
  return texte || null;
}

/* Tous les groupes de voyelles d'un mot, normalisés pour repérer les
   échos internes (assonances). Toujours calculé par voie orthographique
   (trouveGroupesAvecPositions) : c'est la seule source qui donne des
   positions exploitables pour le surlignage dans le brouillon — le dico
   phonétique n'offre qu'une chaîne à plat, sans correspondance fiable
   avec les lettres d'origine. */
function groupesVoyellesMot(mot){
  const w = nettoieMot(mot);
  const groupes = trouveGroupesAvecPositions(w);
  return groupes
    .map((g, idx) => {
      const son = normaliseGroupeInterne(w, g, idx === groupes.length - 1);
      return son ? { son, debut: g.debut, fin: g.fin } : null;
    })
    .filter(Boolean);
}

/* Regroupement optionnel par familles de sons, pour réduire le nombre de
   couleurs distinctes à l'écran. Deux logiques différentes : les
   consonnes (allitérations) se regroupent par mode d'articulation, les
   voyelles (assonances) par timbre. Un son non couvert par la table
   reste affiché sous son symbole exact (pas de perte silencieuse).
   Deux granularités : "simplifiée" (peu de familles, priorité à la
   lisibilité) et "étendue" (classification phonétique plus complète —
   sourdes/sonores séparées pour les consonnes notamment — au prix de
   davantage de couleurs). */
const FAMILLES_CONSONNES_SIMPLE = {
  s:'Sifflantes/chuintantes', 'ʃ':'Sifflantes/chuintantes', 'ʒ':'Sifflantes/chuintantes', z:'Sifflantes/chuintantes',
  p:'Occlusives', t:'Occlusives', k:'Occlusives', b:'Occlusives', d:'Occlusives', g:'Occlusives',
  l:'Liquides', r:'Liquides',
  m:'Nasales', n:'Nasales', 'ɲ':'Nasales',
  f:'Fricatives', v:'Fricatives'
};
const FAMILLES_VOYELLES_SIMPLE = {
  i:'Voyelles claires', y:'Voyelles claires', 'é':'Voyelles claires', e:'Voyelles claires', ai:'Voyelles claires', ei:'Voyelles claires', ui:'Voyelles claires',
  u:'Voyelles sombres', o:'Voyelles sombres', ou:'Voyelles sombres', eu:'Voyelles sombres', eui:'Voyelles sombres', 'œi':'Voyelles sombres',
  a:'Voyelle ouverte', oi:'Voyelle ouverte',
  in:'Nasales', an:'Nasales', on:'Nasales', un:'Nasales'
};
const FAMILLES_CONSONNES_ETENDU = {
  p:'Occlusives sourdes', t:'Occlusives sourdes', k:'Occlusives sourdes',
  b:'Occlusives sonores', d:'Occlusives sonores', g:'Occlusives sonores',
  f:'Fricatives sourdes', s:'Fricatives sourdes', 'ʃ':'Fricatives sourdes',
  v:'Fricatives sonores', z:'Fricatives sonores', 'ʒ':'Fricatives sonores',
  m:'Nasales', n:'Nasales', 'ɲ':'Nasales',
  l:'Liquides', r:'Liquides'
};
const FAMILLES_VOYELLES_ETENDU = {
  i:'Voyelles fermées', y:'Voyelles fermées', u:'Voyelles fermées', ou:'Voyelles fermées', ui:'Voyelles fermées',
  e:'Voyelles moyennes/ouvertes', 'é':'Voyelles moyennes/ouvertes', ai:'Voyelles moyennes/ouvertes', ei:'Voyelles moyennes/ouvertes', o:'Voyelles moyennes/ouvertes', eu:'Voyelles moyennes/ouvertes', a:'Voyelles moyennes/ouvertes', oi:'Voyelles moyennes/ouvertes', eui:'Voyelles moyennes/ouvertes', 'œi':'Voyelles moyennes/ouvertes',
  in:'Nasales', an:'Nasales', on:'Nasales', un:'Nasales'
};

/* Couleur fixe par thème plutôt que par ordre d'apparition : "Occlusives"
   (familles simplifiées) et "Occlusives sourdes" (familles étendues)
   doivent rester dans la même teinte, puisque c'est le même thème vu à
   deux granularités — sinon la différence entre les deux modes n'est
   visible que dans les libellés, jamais dans le surlignage lui-même.
   Deux tables séparées (consonnes / voyelles) : "Nasales" désigne un
   thème différent selon le cas et ne doit pas partager sa couleur. */
const THEME_CONSONNE = {
  p:'cp-son-c1', t:'cp-son-c1', k:'cp-son-c1', 'Occlusives':'cp-son-c1', 'Occlusives sourdes':'cp-son-c1',
  b:'cp-son-c2', d:'cp-son-c2', g:'cp-son-c2', 'Occlusives sonores':'cp-son-c2',
  s:'cp-son-c3', 'ʃ':'cp-son-c3', f:'cp-son-c3', 'Sifflantes/chuintantes':'cp-son-c3', 'Fricatives sourdes':'cp-son-c3',
  z:'cp-son-c4', 'ʒ':'cp-son-c4', v:'cp-son-c4', 'Fricatives':'cp-son-c4', 'Fricatives sonores':'cp-son-c4',
  m:'cp-son-c5', n:'cp-son-c5', 'ɲ':'cp-son-c5', 'Nasales':'cp-son-c5',
  l:'cp-son-c6', r:'cp-son-c6', 'Liquides':'cp-son-c6',
  j:'cp-son-c7', // yod (fille, brillant...) — semi-consonne à part, aucune famille ne lui correspond vraiment ; couleur dédiée, jamais utilisée ailleurs dans cette table.
  // Le mode dico (transcription complète, alphabet type X-SAMPA) peut
  // renvoyer des symboles différents de ceux du repli heuristique pour un
  // même son : R (majuscule) = r français, S = ʃ, Z = ʒ, J = ɲ. Sans ce
  // mapping ils tombaient hors table et redevenaient leur propre
  // "famille" à un seul membre (bug visible dans la légende : "S" et "R"
  // affichés à côté de "Occlusives"/"Liquides").
  R:'cp-son-c6', S:'cp-son-c3', Z:'cp-son-c4', J:'cp-son-c5'
};
const THEME_VOYELLE = {
  i:'cp-son-c1', y:'cp-son-c1', 'é':'cp-son-c1', e:'cp-son-c1', ai:'cp-son-c1', ei:'cp-son-c1', ui:'cp-son-c1', 'Voyelles claires':'cp-son-c1', 'Voyelles fermées':'cp-son-c1',
  u:'cp-son-c2', o:'cp-son-c2', ou:'cp-son-c2', eu:'cp-son-c2', eui:'cp-son-c2', 'œi':'cp-son-c2', 'Voyelles sombres':'cp-son-c2', 'Voyelles moyennes/ouvertes':'cp-son-c2',
  a:'cp-son-c7', oi:'cp-son-c7', 'Voyelle ouverte':'cp-son-c7',
  in:'cp-son-c3', an:'cp-son-c3', on:'cp-son-c3', un:'cp-son-c3', 'Nasales':'cp-son-c3'
};

/* Fréquence de référence des phonèmes dans le français courant — source
   Lexique 3 (New, 2006 ; 135 000 mots, corpus de romans récents +
   sous-titres de films), via les calculs de C. dos Santos (thèse Lyon 2,
   2007) qui décompose la fréquence de chaque consonne SELON SA POSITION
   dans la syllabe. Bien plus fiable que la première version de cette
   table (Wioland 1985, fréquence globale toutes positions confondues,
   sans distinction attaque/coda) — remplacée après vérification des
   chiffres exacts (merci Alucard d'avoir retrouvé le tableau).
   La position compte énormément pour certains sons : /ʁ/ (r) n'est qu'à
   3,7% en attaque de mot mais 30,4% après une voyelle — une différence
   que la version précédente ignorait complètement. D'où deux tables
   séparées : ATTAQUE pour l'allitération (qui ne regarde QUE le début du
   mot), TOUTES_POSITIONS pour la trame phonique (qui regarde tout le
   mot). Sert à calculer un ratio "ce son est-il plus présent dans CE
   poème que dans le français en général" plutôt qu'un simple compte
   brut : un "r" très présent en fin de syllabe est presque toujours
   normal, un "ʃ" présent dans les mêmes proportions est un vrai
   sur-usage, beaucoup plus rare par nature.
   - Sons exacts (consonnes) : correspondance directe et fiable.
   - Sons exacts (voyelles) : toujours Wioland 1985 faute de mieux — ce
     tableau-ci ne couvre que les consonnes. Nos symboles voyelles ne
     collent pas non plus toujours 1:1 aux catégories mesurées (ex.
     Wioland regroupe é/è/e sous un seul "E") — valeurs réparties de
     façon raisonnable mais approximative. "un" (son rare, absent des
     mesures courantes) est une estimation basse, pas une donnée sourcée.
   - Familles (simplifiées/étendues) : sommes des phonèmes réels qui
     composent chaque famille, calculées séparément pour chaque table de
     position — aussi fiables que les sons exacts. */
const FREQUENCE_BASE_CONSONNES_ATTAQUE = {
  s:12.2, t:11.5, l:10.9, d:9.6, v:8.4, p:8.1, m:7.5, n:6.9, k:6.4,
  'ʒ':6.3, r:3.7, f:3.2, b:2.1, 'ʃ':1.3, z:1.2, g:0.8, 'ɲ':0.05,
  // Familles simplifiées
  'Sifflantes/chuintantes':21.0, 'Occlusives':38.5, 'Liquides':14.6,
  'Nasales':14.45, 'Fricatives':11.6,
  // Familles étendues
  'Occlusives sourdes':26.0, 'Occlusives sonores':12.5,
  'Fricatives sourdes':16.7, 'Fricatives sonores':15.9
};
const FREQUENCE_BASE_CONSONNES_TOUTES = {
  r:13.1, l:12.8, t:11.4, s:11.3, d:7.6, m:6.5, n:6.5, v:6.4, p:6.0,
  k:5.8, 'ʒ':4.9, f:2.4, b:1.9, z:1.4, 'ʃ':1.2, g:0.7, 'ɲ':0.1,
  // Familles simplifiées
  'Sifflantes/chuintantes':18.8, 'Occlusives':33.4, 'Liquides':25.9,
  'Nasales':13.1, 'Fricatives':8.8,
  // Familles étendues
  'Occlusives sourdes':23.2, 'Occlusives sonores':10.2,
  'Fricatives sourdes':14.9, 'Fricatives sonores':12.7
};
const FREQUENCE_BASE_VOYELLES = {
  a:8.55, i:5.12, 'é':6.4, e:4.2, ai:4.2, ei:4.2, y:1.9, u:1.9,
  o:3.36, ou:2.43, eu:4.31, oi:8.55, ui:5.12, eui:4.31, 'œi':4.31,
  an:3.09, on:2.25, in:1.84, un:0.2,
  // Familles simplifiées
  'Voyelles claires':17.62, 'Voyelles sombres':10.10, 'Voyelle ouverte':8.55,
  // Familles étendues ("Nasales" partagée avec les consonnes ci-dessus
  // n'est jamais lue depuis cette table-ci, les deux restent séparées)
  'Voyelles fermées':12.14, 'Voyelles moyennes/ouvertes':21.05
};
// Les tables "Nasales" (consonnes m/n/ɲ vs voyelles an/in/on/un) sont
// homonymes mais désignent des sons différents — jamais mélangées, la
// bonne table est choisie selon qu'on regarde une allitération/trame
// (consonnes) ou une assonance (voyelles), exactement comme pour les
// couleurs (THEME_CONSONNE/THEME_VOYELLE).
FREQUENCE_BASE_VOYELLES['Nasales'] = 3.09 + 2.25 + 1.84 + 0.2;

/* Ratio d'usage par rapport à la fréquence normale du français, pour un
   son/famille donné. `pourcentageObserve` = compte de ce son / total de
   tous les sons de cette catégorie dans le poème (pas juste ceux qui
   passent le seuil). Retourne null si aucune donnée de référence
   n'existe pour ce son (jamais le cas pour nos tables, garde-fou). */
function ratioFrequence(table, son, pourcentageObserve){
  const base = table[son];
  if (!base) return null;
  return pourcentageObserve / base;
}

/* Analyse un poème entier : regroupe les mots par son initial partagé
   (allitérations) et par voyelle interne partagée (assonances). Ignore
   les mots outils si demandé, ne garde que les sons apparaissant au
   moins `seuilMin` fois. Si `famillesConsonnes`/`famillesVoyelles` sont
   fournies, regroupe par famille plutôt que par son exact. */
function analyseSonorites(texteComplet, opts){
  const exclureMotsOutils = !opts || opts.exclureMotsOutils !== false;
  const seuilMin = (opts && opts.seuilMin) || 2;
  const famillesConsonnes = opts && opts.famillesConsonnes;
  const famillesVoyelles = opts && opts.famillesVoyelles;
  const lignes = (texteComplet || '').split('\n');

  const allit = new Map(); // clé (son ou famille) -> [{mot, ligne}]
  const asson = new Map();

  lignes.forEach((ligne, idxLigne) => {
    const mots = ligne.split(/\s+/).filter(Boolean);
    mots.forEach(motBrut => {
      const mot = nettoieMot(motBrut);
      if (!mot) return;
      if (exclureMotsOutils && MOTS_OUTILS.has(mot)) return;

      const si = soninitial(mot);
      if (si) {
        const cle = famillesConsonnes ? (famillesConsonnes[si] || si) : si;
        if (!allit.has(cle)) allit.set(cle, []);
        allit.get(cle).push({ mot, ligne: idxLigne + 1 });
      }

      const vus = new Set(); // un même mot ne compte qu'une fois par son, même répété dedans
      groupesVoyellesMot(mot).forEach(g => {
        const cle = famillesVoyelles ? (famillesVoyelles[g.son] || g.son) : g.son;
        if (vus.has(cle)) return;
        vus.add(cle);
        if (!asson.has(cle)) asson.set(cle, []);
        asson.get(cle).push({ mot, ligne: idxLigne + 1 });
      });
    });
  });

  // Total tous sons confondus (avant filtrage par seuil) : nécessaire pour
  // calculer un pourcentage d'usage réel, comparable à la fréquence de
  // référence du français courant (voir FREQUENCE_BASE_CONSONNES/VOYELLES).
  const totalAllit = Array.from(allit.values()).reduce((n, l) => n + l.length, 0);
  const totalAsson = Array.from(asson.values()).reduce((n, l) => n + l.length, 0);

  const versListe = (map, total, table) => Array.from(map.entries())
    .map(([son, occurrences]) => ({
      son, occurrences, count: occurrences.length,
      ratio: total > 0 ? ratioFrequence(table, son, (occurrences.length / total) * 100) : null
    }))
    .filter(e => e.count >= seuilMin)
    .sort((a, b) => b.count - a.count);

  return {
    alliterations: versListe(allit, totalAllit, FREQUENCE_BASE_CONSONNES_ATTAQUE),
    assonances: versListe(asson, totalAsson, FREQUENCE_BASE_VOYELLES)
  };
}

/* Trame phonique (réseau consonantique) : un même son consonne qui
   revient n'importe où dans le mot — attaque, milieu, coda — pas
   seulement en début de mot comme l'allitération classique. Généralise
   les règles de soninitial() (digraphes ch/ph/gn/qu/gu, c/g contextuels)
   à toutes les positions plutôt qu'à la seule première lettre. Toujours
   calculé par voie orthographique (comme pour les assonances) : seule
   source qui donne des positions exploitables pour le surlignage. */
// Mnémonique "CaReFuL" : en position finale de mot, ces 4 consonnes se
// prononcent presque toujours ; les autres (b, d, g, p, q, s, t, x, z...)
// sont muettes par défaut en finale. Beaucoup d'exceptions existent des
// deux côtés (net, ouest, fils, plus...) — non couvertes, heuristique
// volontairement simple comme le reste du plugin.
const CONSONNES_FINALES_PRONONCEES = new Set(['c', 'r', 'f', 'l']);
// Cas particulier fréquent qui inverse la règle CaReFuL pour "r" : les
// infinitifs et noms en "-er" ont un r muet (parler, boulanger, léger),
// contrairement à la plupart des autres mots finissant en "-er" (mer,
// cher, fer, hiver, fier...) — liste d'exceptions courtes qui gardent le
// r prononcé malgré la terminaison "-er".
const EXCEPTIONS_ER_R_PRONONCE = new Set([
  'mer','cher','fer','fier','hier','hiver','ver','enfer','éther','cancer',
  'super','revolver','amer'
]);
// Deux autres exceptions courantes à CaReFuL, dans l'autre sens cette
// fois : des mots où c/l final est habituellement prononcé mais reste
// muet ici. Listes courtes et non exhaustives, comme les autres
// exceptions de cette section.
const EXCEPTIONS_L_MUET = new Set([
  'gentil','gentils','outil','outils','sourcil','sourcils','fusil','fusils','persil'
]);
const EXCEPTIONS_C_MUET = new Set([
  'blanc','banc','franc','flanc','tronc','jonc','accroc','estomac','caoutchouc'
]);

// "ill" (un i suivi de deux l) se prononce [j] (yod) par défaut — fille,
// famille, brillant... — sauf dans une liste de mots/racines où il reste
// [il], deux vraies consonnes l (ville, tranquille, mille et milli-,
// distiller, osciller, les mots en -illaire, ceux qui commencent par le
// préfixe ill-, quelques noms propres et termes médicaux). Racines
// vérifiées par inclusion plutôt que mot exact, pour couvrir directement
// les dérivés (village, tranquillité, millionnaire, distillerie...) sans
// devoir les lister un par un.
function illResteConsonne(w){
  if (w.startsWith('ill')) return true;
  if (w.endsWith('illaire')) return true;
  // "mill" ancré en début de mot seulement : mille/million/milliard...
  // commencent tous par "mill", contrairement à "famille" ou "Camille"
  // qui contiennent la même suite de lettres par pure coïncidence, au
  // milieu du mot — includes() les aurait exceptés à tort.
  if (w.startsWith('mill')) return true;
  const racines = [
    'vill','tranquill','pusillanim','imbécill','chinchill','codicill',
    'penicillin','pénicillin','defibrillat','défibrillat','distill','oscill',
    'lille','gilles','achille'
  ];
  return racines.some(racine => w.includes(racine));
}

function consonnesInternesMot(mot){
  const brut = nettoieMot(mot);
  const prefixe = brut.match(/^[ldtsqcnm]'/);
  const decalage = prefixe ? prefixe[0].length : 0; // pour renvoyer des positions relatives à `brut` (ce que l'appelant attend), pas à la version tronquée de l'élision
  const w = brut.slice(decalage);
  if (!w) return [];
  const resultats = [];
  let i = 0;
  while (i < w.length) {
    const ch = w[i];
    if (ch === "'" || ch === 'h' || estVoyelle(ch)) { i++; continue; }

    // n/m après une voyelle, non doublé et non suivi d'une autre voyelle :
    // absorbé dans la voyelle nasale précédente (an, in, on, un...), donc
    // pas un vrai son consonne à part entière — même règle que celle déjà
    // utilisée côté assonances (normaliseGroupeInterne) pour ne pas
    // compter deux fois le même phénomène. "couronne" (nn doublé) garde
    // bien son n prononcé ; "argentin" n'en a aucun (les deux nasalisent).
    if ((ch === 'n' || ch === 'm') && i > 0 && estVoyelle(w[i - 1])) {
      const nasalise = /^[mn](?![mnaeiouyàâäéèêëîïôöùûüÿœ])/.test(w.slice(i));
      if (nasalise) { i++; continue; }
    }

    const suite = w.slice(i);
    let son, longueur;
    if (suite.startsWith('ch')) { son = chEstK(w) ? 'k' : 'ʃ'; longueur = 2; }
    else if (suite.startsWith('ph')) { son = 'f'; longueur = 2; }
    else if (suite.startsWith('gn')) { son = 'ɲ'; longueur = 2; }
    else if (suite.startsWith('qu')) { son = 'k'; longueur = 2; }
    else if (suite.startsWith('gu') && estVoyelle(w[i + 2])) { son = 'g'; longueur = 2; }
    else if (ch === 'c') { son = /^[eéèêëiîïy]/.test(w.slice(i + 1)) ? 's' : 'k'; longueur = 1; }
    else if (ch === 'g') { son = /^[eéèêëiîïy]/.test(w.slice(i + 1)) ? 'ʒ' : 'g'; longueur = 1; }
    // "t" suivi de "ion" se ramollit en [s] (nation, attention, national,
    // fiction, création...) — sauf s'il est précédé d'un s ou d'un x, qui
    // bloque ce ramollissement (question, gestion, bastion restent [t]).
    // Règle assez fiable pour "-tion" précisément ; les terminaisons
    // voisines ("-tien", "-tie", "-tiel"...) ont trop d'exceptions
    // lexicales (chrétien, entier, métier gardent [t]) pour être couvertes
    // par la même règle sans plus de nuance — non traitées ici.
    else if (ch === 't' && w.slice(i + 1, i + 4) === 'ion' && !(i > 0 && (w[i - 1] === 's' || w[i - 1] === 'x'))) { son = 's'; longueur = 1; }
    // "ill" (i + deux l) = yod [j] par défaut (fille, brillant...), sauf
    // exceptions où ça reste deux vraies consonnes l (voir
    // illResteConsonne). Doit être vérifié avant la règle de doublement
    // générique juste en dessous, sinon "ll" y serait déjà traité comme
    // un simple l doublé avant d'arriver ici.
    else if (ch === 'l' && w[i + 1] === 'l' && i > 0 && w[i - 1] === 'i' && !illResteConsonne(w)) { son = 'j'; longueur = 2; }
    // Consonne doublée (deux fois la même lettre) : une seule frappe à
    // l'oral (addition, attention, pomme, terre...), jamais deux — sauf
    // c/g, déjà gérées ci-dessus au cas par cas (une paire comme "cc"
    // devant e/i peut se prononcer [ks], pas juste un [k] doublé —
    // "succès" — donc chaque lettre y reste évaluée séparément).
    else if ('ltdpbmnrsfv'.includes(ch) && w[i + 1] === ch) { son = ch; longueur = 2; }
    // "s" isolé entre deux voyelles se prononce [z] (poison, maison,
    // raison...) — contrairement au "s" doublé juste au-dessus, qui reste
    // [s] (poisson), ou au "s" en début/fin de mot ou à côté d'une
    // consonne, qui reste [s] normalement.
    else if (ch === 's' && i > 0 && estVoyelle(w[i - 1]) && estVoyelle(w[i + 1])) { son = 'z'; longueur = 1; }
    else { son = ch; longueur = 1; }

    const finAbs = i + longueur;
    const estFinaleMot = finAbs === w.length;
    // "-er" final : r muet par défaut (infinitifs/noms en -er), sauf la
    // courte liste d'exceptions ci-dessus qui le garde prononcé.
    const finEnEr = ch === 'r' && estFinaleMot && i > 0 && w[i - 1] === 'e';
    const rExceptionPrononce = finEnEr && EXCEPTIONS_ER_R_PRONONCE.has(w);
    // Exceptions inverses : c/l habituellement prononcés en finale
    // (CaReFuL) mais muets dans ces mots précis (gentil, blanc...).
    const exceptionMuette = estFinaleMot && (
      (ch === 'l' && EXCEPTIONS_L_MUET.has(w)) || (ch === 'c' && EXCEPTIONS_C_MUET.has(w))
    );
    const muette = estFinaleMot && (
      finEnEr ? !rExceptionPrononce : (exceptionMuette || !CONSONNES_FINALES_PRONONCEES.has(ch))
    );

    if (!muette) resultats.push({ son, debut: decalage + i, fin: decalage + finAbs });
    i += longueur;
  }
  return resultats;
}

/* Analyse un poème entier pour la trame phonique. Compte TOUTES les
   occurrences d'un son (attaque comprise) — contrairement à
   l'allitération, qui reste une figure à part entière centrée sur la
   seule position initiale. Même regroupement par familles que pour les
   allitérations (mêmes tables, mêmes sons). */
function analyseTramePhonique(texteComplet, opts){
  const exclureMotsOutils = !opts || opts.exclureMotsOutils !== false;
  const seuilMin = (opts && opts.seuilMin) || 2;
  const famillesConsonnes = opts && opts.famillesConsonnes;
  const lignes = (texteComplet || '').split('\n');
  const parSon = new Map();

  lignes.forEach((ligne, idxLigne) => {
    const mots = ligne.split(/\s+/).filter(Boolean);
    mots.forEach(motBrut => {
      const mot = nettoieMot(motBrut);
      if (!mot || (exclureMotsOutils && MOTS_OUTILS.has(mot))) return;
      const vus = new Set(); // un mot ne compte qu'une fois par son, même répété dedans
      consonnesInternesMot(mot).forEach(occ => {
        const cle = famillesConsonnes ? (famillesConsonnes[occ.son] || occ.son) : occ.son;
        if (vus.has(cle)) return;
        vus.add(cle);
        if (!parSon.has(cle)) parSon.set(cle, []);
        parSon.get(cle).push({ mot, ligne: idxLigne + 1 });
      });
    });
  });

  const total = Array.from(parSon.values()).reduce((n, l) => n + l.length, 0);
  return Array.from(parSon.entries())
    .map(([son, occurrences]) => ({
      son, occurrences, count: occurrences.length,
      ratio: total > 0 ? ratioFrequence(FREQUENCE_BASE_CONSONNES_TOUTES, son, (occurrences.length / total) * 100) : null
    }))
    .filter(e => e.count >= seuilMin)
    .sort((a, b) => b.count - a.count);
}

/* Homéotéleutes : finales de mots proches, n'importe où dans le vers —
   pas juste la rime de fin de vers. Réutilise cleFinApprox (déjà utilisée
   par le moteur de rimes), toujours disponible sans dépendre du
   dictionnaire phonétique. Seuil fixe à 2 (figure assez rare, pas besoin
   d'un réglage dédié) et ne garde que les groupes impliquant au moins un
   mot en milieu de vers — sinon ce ne serait qu'une redite du schéma de
   rimes déjà affiché dans l'onglet Syllabes. */
function analyseHomeoteleutes(texteComplet, exclureMotsOutils){
  const lignes = (texteComplet || '').split('\n');
  const parCle = new Map(); // clé de fin -> [{mot, ligne, finDeVers}]

  lignes.forEach((ligne, idxLigne) => {
    const mots = ligne.split(/\s+/).filter(Boolean).map(nettoieMot).filter(Boolean);
    mots.forEach((mot, idxMot) => {
      if (exclureMotsOutils && MOTS_OUTILS.has(mot)) return;
      const cle = cleFinApprox(mot);
      if (!cle) return;
      if (!parCle.has(cle)) parCle.set(cle, []);
      parCle.get(cle).push({ mot, ligne: idxLigne + 1, finDeVers: idxMot === mots.length - 1 });
    });
  });

  return Array.from(parCle.entries())
    .map(([son, occurrences]) => ({ son, occurrences, count: occurrences.length }))
    // Un homéotéleute relie des mots DIFFÉRENTS qui sonnent pareil en fin —
    // le même mot répété plusieurs fois n'en est pas un (c'est une
    // répétition/anaphore, une autre figure).
    .filter(e => new Set(e.occurrences.map(o => o.mot)).size >= 2)
    .filter(e => e.count >= 2 && e.occurrences.some(o => !o.finDeVers))
    .sort((a, b) => b.count - a.count);
}

