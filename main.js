const { Plugin, ItemView, Modal, Notice } = require('obsidian');

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
  return (mot || '').toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüÿœ']/gi, '');
}

function trouveGroupesVoyelles(w){
  const regex = new RegExp('[' + VOYELLES + ']+', 'g');
  const groupes = [];
  let m;
  while ((m = regex.exec(w))) groupes.push(m[0]);
  return groupes;
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

function analyseLigne(ligne){
  // le trait d'union sépare deux mots phonétiques distincts (ex. "vois-tu", "dit-il")
  const mots = ligne.trim().split(/[\s\-]+/).filter(Boolean);
  let total = 0, totalMax = 0, hasHiatus = false;
  const details = [];
  mots.forEach((motBrut, i) => {
    const estDernier = i === mots.length - 1;
    const motSuivant = !estDernier ? nettoieMot(mots[i + 1]) : null;
    const suivantVoyelleOuH = motSuivant ? /^[aeiouyàâäéèêëîïôöùûüÿœh]/.test(motSuivant) : false;
    const finalEPrononce = !estDernier && !suivantVoyelleOuH;
    const r = compteSyllabesMot(motBrut, finalEPrononce);
    total += r.min; totalMax += r.max;
    if (r.hiatus) hasHiatus = true;
    details.push({ mot: motBrut, min: r.min, max: r.max, hiatus: r.hiatus });
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

const FAMILLES = [
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

function normaliseMot(mot){
  return (mot || '').toLowerCase().trim().replace(/[^a-zàâäéèêëîïôöùûüÿœ']/gi, '');
}

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

function estFeminine(mot){
  let w = normaliseMot(mot);
  if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return /[^aeiouyàâäéèêëîïôöùûüÿœ]e$/.test(w);
}

/* =========================================================
   DICTIONNAIRE PERSONNEL (optionnel)
   Fichier JSON dans le dossier du plugin :
   {
     "familles": [
       { "son": "-onk [personnalisé]", "exemple": "...", "terms": ["onk"], "mots": ["..."] }
     ]
   }
   ========================================================= */
async function chargeDictionnairePerso(plugin){
  try {
    const dir = plugin.manifest.dir; // ex: .obsidian/plugins/carnet-du-poete
    const path = dir + '/dictionnaire-perso.json';
    const exists = await plugin.app.vault.adapter.exists(path);
    if (!exists) return;
    const raw = await plugin.app.vault.adapter.read(path);
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.familles)) {
      data.familles.forEach(f => {
        if (f && f.son && Array.isArray(f.terms) && Array.isArray(f.mots)) {
          FAMILLES.push(f);
        }
      });
      new Notice(`Carnet du Poète : ${data.familles.length} famille(s) personnalisée(s) chargée(s).`);
    }
  } catch (e) {
    console.error('Carnet du Poète — erreur de chargement du dictionnaire personnel', e);
  }
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

    const panelSyl = container.createDiv({ cls: 'cp-panel active' });
    const panelRimes = container.createDiv({ cls: 'cp-panel' });

    const switchTab = (which) => {
      tabSyl.toggleClass('active', which === 'syl');
      tabRimes.toggleClass('active', which === 'rimes');
      panelSyl.toggleClass('active', which === 'syl');
      panelRimes.toggleClass('active', which === 'rimes');
    };
    tabSyl.addEventListener('click', () => switchTab('syl'));
    tabRimes.addEventListener('click', () => switchTab('rimes'));

    this.buildPanelSyllabes(panelSyl);
    this.buildPanelRimes(panelRimes);

    const footer = container.createEl('p', { cls: 'cp-footer' });
    footer.setText('Comptage heuristique : règle du e caduc + détection des hiatus (diérèses possibles, affichées entre parenthèses). Dictionnaire curaté, non exhaustif — vous pouvez ajouter vos propres familles de rimes via un fichier dictionnaire-perso.json dans le dossier du plugin.');
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
        ligneEl.createSpan({ cls: 'cp-texte', text: ligne });
        if (METRES[r.total]) {
          ligneEl.createSpan({ cls: 'cp-metre', text: METRES[r.total] });
        }
        if (r.hasHiatus && r.totalMax !== r.total) {
          ligneEl.createSpan({ cls: 'cp-hiatus-badge', text: `diérèse possible : ${r.totalMax}` });
        }
        ligneEl.createSpan({ cls: 'cp-compte', text: String(r.total) });
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

    const chercher = () => {
      resultatsDiv.empty();
      const saisie = motInput.value.trim();
      if (!saisie) return;
      const famille = trouveFamille(saisie);
      const motNorm = normaliseMot(saisie);

      if (!famille) {
        resultatsDiv.createEl('p', { cls: 'cp-vide', text: `Pas de famille de rimes reconnue pour « ${saisie} » dans ce dictionnaire.` });
        return;
      }

      const candidats = famille.mots.filter(m => normaliseMot(m) !== motNorm);
      const masculins = candidats.filter(m => !estFeminine(m));
      const feminins = candidats.filter(m => estFeminine(m));

      resultatsDiv.createDiv({ cls: 'cp-son-label', text: `Son ${famille.son} — comme dans « ${famille.exemple} »` });

      const buildGroupe = (titre, liste) => {
        if (liste.length === 0) return;
        const g = resultatsDiv.createDiv({ cls: 'cp-groupe' });
        g.createDiv({ cls: 'cp-titre', text: titre });
        const motsDiv = g.createDiv({ cls: 'cp-mots' });
        liste.forEach(m => {
          const r = compteSyllabesMot(m, false);
          const badge = motsDiv.createSpan({ cls: 'cp-mot', text: m });
          badge.createEl('sup', { text: String(r.min) });
        });
      };
      buildGroupe('Rimes masculines', masculins);
      buildGroupe('Rimes féminines (finale en -e muet)', feminins);
    };

    btnChercher.addEventListener('click', chercher);
    motInput.addEventListener('keydown', e => { if (e.key === 'Enter') chercher(); });

    this._prefillRimeInput = (mot) => {
      motInput.value = mot;
      chercher();
    };
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

    const famille = trouveFamille(this.mot);
    const motNorm = normaliseMot(this.mot);

    if (!famille) {
      contentEl.createEl('p', { cls: 'cp-vide', text: `Pas de famille de rimes reconnue pour « ${this.mot} » dans ce dictionnaire.` });
      return;
    }
    const candidats = famille.mots.filter(m => normaliseMot(m) !== motNorm);
    const masculins = candidats.filter(m => !estFeminine(m));
    const feminins = candidats.filter(m => estFeminine(m));

    contentEl.createDiv({ cls: 'cp-son-label', text: `Son ${famille.son} — comme dans « ${famille.exemple} »` });

    const buildGroupe = (titre, liste) => {
      if (liste.length === 0) return;
      const g = contentEl.createDiv({ cls: 'cp-groupe' });
      g.createDiv({ cls: 'cp-titre', text: titre });
      const motsDiv = g.createDiv({ cls: 'cp-mots' });
      liste.forEach(m => {
        const r = compteSyllabesMot(m, false);
        const badge = motsDiv.createSpan({ cls: 'cp-mot', text: m });
        badge.createEl('sup', { text: String(r.min) });
      });
    };
    buildGroupe('Rimes masculines', masculins);
    buildGroupe('Rimes féminines (finale en -e muet)', feminins);
  }
  onClose(){ this.contentEl.empty(); }
}

/* =========================================================
   PLUGIN
   ========================================================= */

module.exports = class CarnetDuPoetePlugin extends Plugin {
  async onload(){
    await chargeDictionnairePerso(this);

    this.registerView(VIEW_TYPE, (leaf) => new CarnetView(leaf, this));

    this.addRibbonIcon('feather', 'Carnet du Poète', () => this.activateView());

    this.addCommand({
      id: 'ouvrir-carnet-du-poete',
      name: 'Ouvrir le Carnet du Poète',
      callback: () => this.activateView()
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
          return `${r.total}${suffixe} — ${l}`;
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
  }

  onunload(){
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
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
