const { Plugin, ItemView, Modal, Notice, requestUrl } = require('obsidian');

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
  return (mot || '').toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüÿœç']/gi, '');
}

function trouveGroupesAvecPositions(w){
  // Cas particulier du français : un "y" entre deux voyelles (ra-yon,
  // cra-yon, vo-yage, essa-yer...) se comporte comme un double "i" et
  // sépare deux syllabes au lieu de fusionner avec elles. Un "y" qui
  // n'est PAS entre deux voyelles (yeux, pays, cycle...) reste une
  // voyelle normale.
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

function estMuetFinal(w){
  let base = w;
  if (base.endsWith('s') && !base.endsWith('ss') && base.length > 2) base = base.slice(0, -1);
  return base.endsWith('e');
}

/* Découpage des consonnes entre deux noyaux vocaliques en (coda de la
   syllabe précédente) + (attaque de la syllabe suivante). Les groupes
   consonne+liquide usuels (bl, cl, fl, gl, pl, br, cr, dr, fr, gr, pr,
   tr, vr) restent groupés comme attaque de la syllabe suivante plutôt
   que d'être coupés en deux (ex. "re-gret", pas "reg-ret"). */
const CLUSTERS_LIQUIDES = new Set([
  'bl','cl','fl','gl','pl','br','cr','dr','fr','gr','pr','tr','vr',
  'gn','ch','ph','th' // digraphes représentant un seul son, jamais coupés
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
  const groupes = trouveGroupesAvecPositions(w);
  if (groupes.length === 0) return [w];

  const syllabes = [];
  let prefixe = w.slice(0, groupes[0].debut);

  for (let i = 0; i < groupes.length; i++){
    const g = groupes[i];
    const estDernierGroupe = i === groupes.length - 1;
    const finDeMotAvecS = w.endsWith('s') && !w.endsWith('ss') && g.fin === w.length - 1;
    const finDeMotSansS = g.fin === w.length;
    const estMuetADroper = estDernierGroupe && g.texte === 'e' && estMuetFinal(w)
      && !finalEPrononce && (finDeMotAvecS || finDeMotSansS);

    if (diereseIndices.has(i) && g.texte.length >= 2) {
      const partie1 = g.texte.slice(0, 1);
      const partie2 = g.texte.slice(1);
      syllabes.push(prefixe + partie1);
      syllabes.push(partie2);
    } else if (estMuetADroper) {
      const sFinal = finDeMotAvecS ? 's' : '';
      if (syllabes.length > 0) {
        syllabes[syllabes.length - 1] += prefixe + g.texte + sFinal;
      } else {
        syllabes.push(prefixe + g.texte + sFinal);
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
function compteSyllabesMot(motBrut, finalEPrononce){
  let w = nettoieMot(motBrut);
  if (!w) return { min: 0, max: 0, hiatus: false };
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 2) {
    w = w.slice(0, -1);
  }
  const groupes = trouveGroupesVoyelles(w);
  let compte = groupes.length;

  if (groupes.length > 0) {
    const dernier = groupes[groupes.length - 1];
    const idxDernier = w.lastIndexOf(dernier);
    const precedeParConsonne = idxDernier > 0 && !estVoyelle(w[idxDernier - 1]);
    // le e n'est un "e caduc" muet que s'il est la toute dernière lettre du
    // mot (ex. "rose", "chante") — pas quand il est suivi de m/n formant une
    // voyelle nasale suivie d'une consonne (ex. "temps", "m'attend")
    const estDerniereLettre = w.endsWith('e');
    if (dernier === 'e' && precedeParConsonne && estDerniereLettre && !finalEPrononce) {
      compte -= 1;
    }
  }
  compte = Math.max(compte, 0);

  const hiatusCount = detecteHiatus(w, groupes);
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
  const avantMatch = motBrut.match(/^[^a-zàâäéèêëîïôöùûüÿœç']*/i);
  const apresMatch = motBrut.match(/[^a-zàâäéèêëîïôöùûüÿœç']*$/i);
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
    const syllabesDierese = r.hiatus
      ? syllabifieMot(motBrut, finalEPrononce, indicesHiatus(motBrut))
      : null;
    total += r.min; totalMax += r.max;
    if (r.hiatus) hasHiatus = true;
    details.push({ mot: motBrut, min: r.min, max: r.max, hiatus: r.hiatus, syllabes, syllabesDierese });
  });
  return { total, totalMax, hasHiatus, details };
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
  return (mot || '').toLowerCase().trim().replace(/[^a-zàâäéèêëîïôöùûüÿœç']/gi, '');
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
  let meilleure = null, longueurMax = 0;
  FAMILLES.forEach(fam => {
    fam.terms.forEach(t => {
      if (w.endsWith(t) && t.length > longueurMax) {
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

function chercheSynonymes(motSaisi){
  const w = normaliseMot(motSaisi);
  const wSouple = normaliseSouple(motSaisi);
  if (!w) return null;
  return SYNONYMES.find(e => normaliseMot(e.mot) === w || normaliseSouple(e.mot) === wSouple) || null;
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

async function chercheSynonymesWiktionnaire(mot){
  const url = `https://fr.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(mot)}&format=json&prop=wikitext&origin=*`;
  const reponse = await requestUrl({ url, throw: false });
  if (reponse.status !== 200) throw new Error(`HTTP ${reponse.status}`);
  const data = reponse.json;
  if (!data || data.error || !data.parse) return { synonymes: [], antonymes: [], trouve: false };

  const wikitext = (data.parse.wikitext && data.parse.wikitext['*']) || '';

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
  const reponse = await requestUrl({ url, throw: false });
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

async function trouveEtLisDictionnairePerso(plugin){
  const adapter = plugin.app.vault.adapter;
  const configDir = plugin.app.vault.configDir; // en général ".obsidian", mais peut être renommé
  const pluginDir = plugin.manifest.dir || `${configDir}/plugins/${plugin.manifest.id}`;
  const nomFichier = 'dictionnaire-perso.json';

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
  const candidats = [`${pluginDir}/dictionnaire-perso.json`, `${configDir}/dictionnaire-perso.json`, 'dictionnaire-perso.json'];
  for (const c of candidats) {
    if (await adapter.exists(c)) { chemin = c; break; }
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

async function chargeDictionnairePerso(plugin, opts){
  const notifierAbsence = !!(opts && opts.notifierAbsence);
  // on repart toujours de la base pour ne jamais accumuler de doublons
  // si cette fonction est appelée plusieurs fois (rechargement manuel)
  FAMILLES.length = 0;
  FAMILLES.push(...FAMILLES_BASE);
  CHAMPS_LEXICAUX.length = 0;
  CHAMPS_LEXICAUX.push(...CHAMPS_LEXICAUX_BASE);
  SYNONYMES.length = 0;
  SYNONYMES.push(...SYNONYMES_BASE);
  DICO_PHONETIQUE = null;
  DICO_PHONETIQUE_GROUPES = null;

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
    // ci-dessous : peut cohabiter avec l'un ou l'autre dans le même fichier)
    let champsCount = 0;
    if (Array.isArray(data.champsLexicaux)) {
      data.champsLexicaux.forEach(c => {
        if (c && c.theme && Array.isArray(c.motsClefs) && Array.isArray(c.mots)) {
          CHAMPS_LEXICAUX.push(c);
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
      } else if (champsCount === 0 && synoCount === 0) {
        new Notice('Carnet du Poète : dictionnaire-perso.json trouvé, mais aucune famille valide dedans (il manque "son", "terms" ou "mots" quelque part).');
      }
      return;
    }

    // Format B : dictionnaire phonétique complet (objet plat clé -> mots[])
    // (on exclut les clés déjà traitées ci-dessus pour ne pas les confondre
    // avec des groupes de rimes)
    const cles = Object.keys(data).filter(k => k !== 'familles' && k !== 'champsLexicaux' && k !== 'synonymes');
    const clesValides = cles.filter(k => Array.isArray(data[k]));
    if (clesValides.length === 0) {
      if (champsCount === 0 && synoCount === 0) {
        new Notice('Carnet du Poète : dictionnaire-perso.json trouvé, mais son format n\'est reconnu ni comme familles personnalisées, ni comme champs lexicaux, ni comme synonymes, ni comme dictionnaire phonétique (objet clé → liste de mots).');
      }
      return;
    }

    const index = new Map();
    let totalMots = 0;
    clesValides.forEach(cle => {
      data[cle].forEach(mot => {
        if (typeof mot === 'string' && mot.trim()) {
          index.set(mot.trim().toLowerCase(), cle);
          totalMots++;
        }
      });
    });

    DICO_PHONETIQUE = index;
    DICO_PHONETIQUE_GROUPES = data;

    new Notice(`Carnet du Poète : dictionnaire de rimes complet chargé — ${clesValides.length} groupes phonétiques, ${totalMots} mots.`);
    console.log(`[Carnet du Poète] dictionnaire phonétique chargé : ${clesValides.length} groupes, ${totalMots} mots.`);
  } catch (e) {
    console.error('[Carnet du Poète] erreur de chargement du dictionnaire personnel', e);
    new Notice('Carnet du Poète : erreur lors du chargement du dictionnaire personnel (voir la console : Ctrl/Cmd+Maj+I).');
  }
}

/* Recherche unifiée : dictionnaire phonétique complet en priorité
   (correspondance exacte), puis repli sur les familles heuristiques
   orthographiques si le mot n'y figure pas. */
function chercheRimes(motSaisi){
  const motLower = (motSaisi || '').trim().toLowerCase();
  const motNorm = normaliseMot(motSaisi);

  if (DICO_PHONETIQUE && DICO_PHONETIQUE.has(motLower)) {
    const cle = DICO_PHONETIQUE.get(motLower);
    const tousLesMots = (DICO_PHONETIQUE_GROUPES[cle] || []).filter(m => m.toLowerCase() !== motLower);
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
function renderResultatsRimes(container, motSaisi){
  container.empty();
  const saisie = (motSaisi || '').trim();
  if (!saisie) return;

  const resultat = chercheRimes(saisie);

  if (resultat.mode === 'aucun') {
    container.createEl('p', { cls: 'cp-vide', text: `Pas de rime trouvée pour « ${saisie} » dans les dictionnaires chargés.` });
    return;
  }

  if (resultat.mode === 'exact') {
    container.createDiv({ cls: 'cp-son-label', text: `Rimes exactes pour « ${saisie} » (dictionnaire phonétique complet)` });
  } else {
    container.createDiv({ cls: 'cp-son-label', text: `Son ${resultat.son} — comme dans « ${resultat.exemple} » (dictionnaire approché)` });
  }

  const masculins = resultat.mots.filter(m => !estFeminine(m));
  const feminins = resultat.mots.filter(m => estFeminine(m));
  const LIMITE = 100;

  const buildGroupe = (titre, liste) => {
    if (liste.length === 0) return;
    const g = container.createDiv({ cls: 'cp-groupe' });
    g.createDiv({ cls: 'cp-titre', text: `${titre} (${liste.length})` });
    const motsDiv = g.createDiv({ cls: 'cp-mots' });
    const afficheListe = (sousListe) => {
      sousListe.forEach(m => {
        const r = compteSyllabesMot(m, false);
        const badge = motsDiv.createSpan({ cls: 'cp-mot', text: m });
        badge.createEl('sup', { text: String(r.min) });
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
}

/* Rendu partagé des résultats d'inspiration (panneau + fenêtre modale). */
function renderResultatsInspiration(container, motSaisi){
  container.empty();
  const saisie = (motSaisi || '').trim();
  if (!saisie) return;

  const themes = chercheInspiration(saisie);
  if (themes.length === 0) {
    container.createEl('p', {
      cls: 'cp-vide',
      text: `Pas de champ lexical reconnu pour « ${saisie} » — essaie un mot plus général (ex. « forêt », « mer », « nuit », « amour »…) ou ajoute ton propre champ lexical via dictionnaire-perso.json.`
    });
    return;
  }

  themes.forEach(champ => {
    const bloc = container.createDiv({ cls: 'cp-groupe' });
    bloc.createDiv({ cls: 'cp-son-label', text: champ.theme });
    const liste = bloc.createDiv({ cls: 'cp-inspi-liste' });
    champ.mots.forEach(entree => {
      const ligne = liste.createDiv({ cls: 'cp-inspi-mot' });
      ligne.createSpan({ cls: 'cp-inspi-terme', text: entree.mot });
      if (entree.note) {
        ligne.createSpan({ cls: 'cp-inspi-note', text: entree.note });
      }
    });
  });
}

/* Rendu partagé des résultats de synonymes/antonymes. */
function buildGroupeMots(container, titre, liste, cls){
  if (!liste || liste.length === 0) return;
  const g = container.createDiv({ cls: 'cp-groupe' });
  g.createDiv({ cls: 'cp-titre', text: titre });
  const motsDiv = g.createDiv({ cls: 'cp-mots' });
  liste.forEach(m => { motsDiv.createSpan({ cls: cls, text: m }); });
}

async function renderResultatsSynonymes(container, motSaisi, plugin, sourcesActives){
  container.empty();
  const saisie = (motSaisi || '').trim();
  if (!saisie) return;

  // --- dictionnaire local (toujours vérifié en premier, instantané) ---
  const blocLocal = container.createDiv({ cls: 'cp-groupe' });
  blocLocal.createDiv({ cls: 'cp-son-label', text: `${saisie} — dictionnaire local` });
  const entree = chercheSynonymes(saisie);
  if (entree) {
    buildGroupeMots(blocLocal, 'Synonymes', entree.synonymes, 'cp-mot cp-mot-syno');
    buildGroupeMots(blocLocal, 'Antonymes', entree.antonymes, 'cp-mot cp-mot-anto');
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
      buildGroupeMots(bloc, 'Synonymes', resultat.synonymes, 'cp-mot cp-mot-syno');
      buildGroupeMots(bloc, 'Antonymes', resultat.antonymes, 'cp-mot cp-mot-anto');

      if (plugin && (resultat.synonymes.length > 0 || resultat.antonymes.length > 0)) {
        const btnSauver = bloc.createEl('button', { cls: 'cp-link-btn', text: `💾 Enregistrer dans mon dictionnaire personnel` });
        btnSauver.addEventListener('click', async () => {
          btnSauver.disabled = true;
          btnSauver.setText('Enregistrement…');
          await enregistreSynonymePerso(plugin, saisie, resultat.synonymes, resultat.antonymes);
          btnSauver.setText('Enregistré ✓');
        });
      }
    }).catch(err => {
      console.error(`[Carnet du Poète] erreur ${source.nom}`, err);
      statut.setText(`Recherche impossible sur ${source.nom} (pas de connexion, ou le site a changé — voir la console).`);
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

    const panelSyl = container.createDiv({ cls: 'cp-panel active' });
    const panelRimes = container.createDiv({ cls: 'cp-panel' });
    const panelInspi = container.createDiv({ cls: 'cp-panel' });
    const panelSyno = container.createDiv({ cls: 'cp-panel' });
    const panelGuide = container.createDiv({ cls: 'cp-panel' });

    const switchTab = (which) => {
      tabSyl.toggleClass('active', which === 'syl');
      tabRimes.toggleClass('active', which === 'rimes');
      tabInspi.toggleClass('active', which === 'inspi');
      tabSyno.toggleClass('active', which === 'syno');
      tabGuide.toggleClass('active', which === 'guide');
      panelSyl.toggleClass('active', which === 'syl');
      panelRimes.toggleClass('active', which === 'rimes');
      panelInspi.toggleClass('active', which === 'inspi');
      panelSyno.toggleClass('active', which === 'syno');
      panelGuide.toggleClass('active', which === 'guide');
    };
    tabSyl.addEventListener('click', () => switchTab('syl'));
    tabRimes.addEventListener('click', () => switchTab('rimes'));
    tabInspi.addEventListener('click', () => switchTab('inspi'));
    tabSyno.addEventListener('click', () => switchTab('syno'));
    tabGuide.addEventListener('click', () => switchTab('guide'));

    this.buildPanelSyllabes(panelSyl);
    this.buildPanelRimes(panelRimes);
    this.buildPanelInspiration(panelInspi);
    this.buildPanelSynonymes(panelSyno);
    this.buildPanelGuide(panelGuide);

    const footer = container.createEl('p', { cls: 'cp-footer' });
    footer.setText('Comptage heuristique : règle du e caduc + détection des hiatus (diérèse affichée en variante complète). Dictionnaires curatés, non exhaustifs — vous pouvez les étendre via un fichier dictionnaire-perso.json (familles de rimes, dictionnaire phonétique, champs lexicaux, synonymes).');
  }

  buildPanelSyllabes(panelSyl){
    const textarea = panelSyl.createEl('textarea', {
      cls: 'cp-textarea',
      attr: { placeholder: 'Écris ou colle tes vers ici, un vers par ligne…' }
    });
    const toolbar = panelSyl.createDiv({ cls: 'cp-toolbar' });
    const saveState = toolbar.createEl('span', { cls: 'cp-save-state' });
    const btnClear = toolbar.createEl('button', { text: 'Effacer le brouillon', cls: 'cp-link-btn' });
    const analyseDiv = panelSyl.createDiv({ cls: 'cp-analyse' });
    const totalBar = panelSyl.createDiv({ cls: 'cp-total-bar' });
    totalBar.style.display = 'none';

    const renderAnalyse = () => {
      analyseDiv.empty();
      const lignes = textarea.value.split('\n');
      const nonVides = lignes.filter(l => l.trim());
      if (nonVides.length === 0) {
        totalBar.style.display = 'none';
        return;
      }
      let total = 0, nb = 0;
      lignes.forEach(ligne => {
        if (!ligne.trim()) return;
        nb++;
        const r = analyseLigne(ligne);
        total += r.total;
        const ligneEl = analyseDiv.createDiv({ cls: 'cp-ligne' });
        const ligneTop = ligneEl.createDiv({ cls: 'cp-ligne-top' });
        const texteStandard = r.details.map(d => segmenteMotPourAffichage(d.mot, d.syllabes)).join(' ');
        ligneTop.createSpan({ cls: 'cp-texte', text: texteStandard });
        const badges = ligneTop.createDiv({ cls: 'cp-badges' });
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
        badges.createSpan({ cls: 'cp-compte', text: String(r.total) });

        if (r.hasHiatus && r.totalMax !== r.total) {
          const ligneAlt = analyseDiv.createDiv({ cls: 'cp-ligne-alt' });
          const texteAlt = r.details.map(d => segmenteMotPourAffichage(d.mot, d.syllabesDierese || d.syllabes)).join(' ');
          ligneAlt.createSpan({ cls: 'cp-texte-alt', text: texteAlt });
          const badgesAlt = ligneAlt.createDiv({ cls: 'cp-badges' });
          badgesAlt.createSpan({ cls: 'cp-hiatus-badge', text: 'avec diérèse' });
          badgesAlt.createSpan({ cls: 'cp-compte cp-compte-alt', text: String(r.totalMax) });
        }
      });
      totalBar.style.display = 'flex';
      totalBar.empty();
      totalBar.createSpan({ text: `${nb} vers` });
      totalBar.createEl('strong', { text: `${total} syllabes` });
      totalBar.createSpan({ text: `≈ ${(total / nb).toFixed(1)} / vers` });
    };

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
    const resultatsDiv = panelRimes.createDiv({ cls: 'cp-resultats' });

    const chercher = () => renderResultatsRimes(resultatsDiv, motInput.value);

    btnChercher.addEventListener('click', chercher);
    motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });

    this._prefillRimeInput = (mot) => {
      motInput.value = mot;
      chercher();
    };
  }

  buildPanelInspiration(panelInspi){
    const intro = panelInspi.createEl('p', { cls: 'cp-inspi-intro' });
    intro.setText('Tape un mot courant, reçois du vocabulaire plus rare, littéraire ou désuet autour du même thème.');

    const form = panelInspi.createDiv({ cls: 'cp-rime-form' });
    const motInput = form.createEl('input', { attr: { type: 'text', placeholder: 'Un thème… (ex. forêt, mer, nuit, amour, moyen-âge)' } });
    const btnChercher = form.createEl('button', { text: 'Chercher' });
    const resultatsDiv = panelInspi.createDiv({ cls: 'cp-resultats' });

    const chercher = () => renderResultatsInspiration(resultatsDiv, motInput.value);

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

    const chercher = () => renderResultatsSynonymes(resultatsDiv, motInput.value, this.plugin, sourcesActives());

    btnChercher.addEventListener('click', chercher);
    motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });

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
    para('Disposition des rimes dans une strophe :');
    liste([
      { titre:'Rimes plates (ou suivies) — AABB', texte:'deux vers qui riment se suivent directement.' },
      { titre:'Rimes croisées — ABAB', texte:'un vers sur deux rime avec le suivant du même type.' },
      { titre:'Rimes embrassées — ABBA', texte:'deux rimes s\'enferment autour de deux autres.' }
    ]);
    para('Qualité d\'une rime (nombre de sons communs à la fin des mots) :');
    liste([
      { titre:'Rime pauvre', texte:'un seul son commun (ex. « ami / parti »).' },
      { titre:'Rime suffisante', texte:'deux sons communs (ex. « chagrin / matin »).' },
      { titre:'Rime riche', texte:'trois sons communs ou plus (ex. « tendresse / paresse »).' }
    ]);
    para('Genre d\'une rime, et règle d\'alternance classique :');
    liste([
      { titre:'Rime féminine', texte:'le vers se termine par un e muet (ex. « montagne », « chêne »).' },
      { titre:'Rime masculine', texte:'le vers ne se termine pas par un e muet (ex. « amour », « instant »).' },
      { titre:'Alternance', texte:'la poésie classique française alterne généralement rimes masculines et féminines d\'une strophe à l\'autre (c\'est la pastille F/M affichée dans l\'onglet Syllabes).' }
    ]);
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
.cp-toolbar{ display:flex; justify-content: flex-end; align-items:center; gap: 12px; margin-top: 6px; }
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
.cp-source-toggle input{ cursor:pointer; }
.cp-source-en-ligne{ border-left: 2px solid var(--background-modifier-border); padding-left: 10px; }
.cp-rime-form input{ flex:1; }
.cp-son-label{ font-family: var(--font-text); font-style: italic; color: var(--text-accent); margin-bottom: 10px; }
.cp-groupe{ margin-bottom: 10px; }
.cp-titre{ font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); margin-bottom: 6px; }
.cp-mots{ display:flex; flex-wrap:wrap; gap:6px; }
.cp-mot{ display:inline-block; font-family: var(--font-monospace); font-size: 0.84em; background: var(--background-primary-alt); border: 1px solid var(--background-modifier-border); border-left: 3px solid var(--text-accent); padding: 4px 8px; border-radius: 3px; color: var(--text-normal); }
.cp-mot sup{ color: var(--text-faint); margin-left:2px; }
.cp-mot-syno{ border-left-color: var(--text-accent); }
.cp-mot-anto{ border-left-color: var(--text-muted); opacity: 0.85; }
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
.cp-footer{ margin-top: 20px; padding-top: 10px; border-top: 1px solid var(--background-modifier-border); font-size: 0.72em; color: var(--text-faint); line-height: 1.6; }
.cp-hiatus-badge{ display:inline-block; font-size: 0.68em; color: var(--text-accent); border: 1px solid var(--text-accent); border-radius: 8px; padding: 1px 7px; white-space: nowrap; }
`;

/* =========================================================
   PLUGIN
   ========================================================= */

module.exports = class CarnetDuPoetePlugin extends Plugin {
  async onload(){
    this.injectStyles();
    await chargeDictionnairePerso(this);

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
