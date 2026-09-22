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
  // "-ent" verbal muet (3e pers. pluriel : ils dorment, elles s'enivrent) :
  // sonne comme le radical suivi d'un "e" muet ("enivr" + e ~ "enivre"),
  // donc comparable aux mots qui se terminent naturellement par ce genre
  // de "e" (livre, ombre...). Sans cette équivalence, ces verbes ne
  // pouvaient matcher QUE la famille nasale "-ent [ɑ̃]" (toujours fausse
  // ici, w.endsWith('ent') étant systématiquement vrai), jamais leur
  // vraie famille de son — le classement par terme le plus long
  // (longueurMax ci-dessous) suffit à préférer ce candidat dès qu'une
  // famille plus spécifique matche, sans easer la famille nasale pour les
  // mots qui la méritent vraiment (moment, président...).
  const wEntMuet = (w.endsWith('ent') && w.length > 3 && finMuetteEnEnt(w)) ? w.slice(0, -3) + 'e' : null;
  let meilleure = null, longueurMax = 0;
  FAMILLES.forEach(fam => {
    fam.terms.forEach(t => {
      if ((w.endsWith(t) || (wSansS && wSansS.endsWith(t)) || (wEntMuet && wEntMuet.endsWith(t))) && t.length > longueurMax) {
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

  // Repli approximatif limité aux variantes de fin de mot (pluriel,
  // féminin : "forêts" -> forêt, "châteaux" -> château) : la saisie doit
  // COMMENCER par le mot-clé et ne le dépasser que de 3 lettres au plus.
  // L'ancien test dans les deux sens (includes) produisait des faux
  // positifs du type "chat" -> Château (mot-clé contenant la saisie).
  const partiels = CHAMPS_LEXICAUX.filter(champ =>
    champ.motsClefs.some(k => {
      const kn = normaliseSouple(k);
      return kn.length > 3 && wSouple.startsWith(kn) && wSouple.length - kn.length <= 3;
    })
  );
  return partiels;
}

