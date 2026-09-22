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

/* CNRTL fournit ses propres synonymes/antonymes via la même API JSON que
   l'onglet Définitions (voir chercheCnrtl), avec un score de pertinence
   "rank" (0-100) par mot — absent chez Wiktionnaire/CRISCO. On renvoie ici
   la liste COMPLÈTE, triée par pertinence décroissante, sous forme d'objets
   {mot, rang} plutôt que de simples chaînes : ça permet d'afficher ce score
   (opacité) et de le filtrer localement (curseur de seuil) sans refaire de
   requête réseau à chaque réglage — voir le curseur dans
   renderResultatsSynonymes. Les autres sources continuent de renvoyer de
   simples chaînes ; texteDe/rangDe (plus bas) uniformisent l'accès pour le
   reste du code, qui n'a pas à savoir laquelle des deux formes il reçoit. */
/* Accès partagé à l'API CNRTL /api/word/{mot}/ — ou /api/word/{mot}/{pos}
   pour un homographe précis (ex. "os" nom vs adjectif : sans catégorie,
   l'API renvoie une entrée par défaut, pas forcément la bonne). Réponses
   gardées en cache (petit plafond) : revenir sur une catégorie déjà vue, ou
   passer d'un onglet à l'autre pour le même mot, ne relance pas de requête. */
const CACHE_CNRTL = new Map();
const CACHE_CNRTL_MAX = 40;
async function jsonMotCnrtl(mot, pos){
  const url = `https://www.cnrtl.fr/api/word/${encodeURIComponent(mot)}/${pos ? encodeURIComponent(pos) : ''}`;
  if (CACHE_CNRTL.has(url)) return CACHE_CNRTL.get(url);
  const reponse = await requestUrl({ url, headers: ENTETES_NAVIGATEUR, throw: false });
  if (reponse.status !== 200) throw new Error(`HTTP ${reponse.status}`);
  let data;
  try {
    data = JSON.parse(reponse.text || '{}');
  } catch (err) {
    throw new Error('Réponse CNRTL illisible (format inattendu)');
  }
  if (CACHE_CNRTL.size >= CACHE_CNRTL_MAX) CACHE_CNRTL.delete(CACHE_CNRTL.keys().next().value);
  CACHE_CNRTL.set(url, data);
  return data;
}

/* Homographes CNRTL d'un mot, via l'autocomplétion du site
   (/api/search/{mot}) : on ne garde que les entrées dont la forme est
   exactement le mot (pas "ôs" ni "oscar" pour "os"), une par catégorie
   grammaticale (seule la catégorie sert à demander la fiche). Ne rejette
   jamais : en cas d'erreur, liste vide = comportement d'avant (entrée par
   défaut de l'API). */
const CACHE_HOMOGRAPHES = new Map();
async function homographesCnrtl(mot){
  const cle = (mot || '').trim().toLowerCase();
  if (!cle) return [];
  if (CACHE_HOMOGRAPHES.has(cle)) return CACHE_HOMOGRAPHES.get(cle);
  let liste = [];
  try {
    const reponse = await requestUrl({ url: `https://www.cnrtl.fr/api/search/${encodeURIComponent(cle)}?autofix=true`, headers: ENTETES_NAVIGATEUR, throw: false });
    if (reponse.status === 200) {
      const data = JSON.parse(reponse.text || '[]');
      const vus = new Map();
      (Array.isArray(data) ? data : []).forEach(e => {
        if (!e || typeof e.form !== 'string' || typeof e.pos !== 'string' || !e.pos) return;
        if (e.form.trim().toLowerCase() !== cle) return;
        const libelle = (typeof e.label === 'string' && e.label.includes(',')) ? e.label.split(',').slice(1).join(',').trim() : e.pos;
        if (vus.has(e.pos)) vus.get(e.pos).libelle = e.pos; // ex. "livre" nom masc./fém. : même catégorie
        else vus.set(e.pos, { pos: e.pos, libelle: libelle || e.pos });
      });
      liste = [...vus.values()];
    }
  } catch (err) {
    console.error('[Carnet du Poète] homographes CNRTL', err);
    liste = [];
  }
  if (CACHE_HOMOGRAPHES.size >= CACHE_CNRTL_MAX) CACHE_HOMOGRAPHES.delete(CACHE_HOMOGRAPHES.keys().next().value);
  CACHE_HOMOGRAPHES.set(cle, liste);
  return liste;
}

/* Rangée de pills "adjectif | nom masculin" en tête d'une zone CNRTL,
   seulement s'il existe plusieurs homographes. `remplir(cible, pos)`
   (fourni par chaque onglet) vide `cible` et y affiche l'entrée demandée.
   Par défaut : le nom s'il existe, sinon la première entrée. */
function brancheHomographesCnrtl(parent, mot, remplir){
  const pillsDiv = parent.createDiv({ cls: 'cp-cnrtl-seuil cp-cnrtl-homographes' });
  const contenu = parent.createDiv();
  contenu.createEl('p', { cls: 'cp-vide', text: 'Recherche en cours…' }); // vidé par remplir()
  homographesCnrtl(mot).then(homos => {
    if (homos.length <= 1) { pillsDiv.remove(); remplir(contenu, null); return; }
    let actif = (homos.find(h => h.pos === 'nom') || homos[0]).pos;
    pillsDiv.createSpan({ cls: 'cp-sources-label', text: 'Entrée : ' });
    const boutons = [];
    homos.forEach(h => {
      const btn = pillsDiv.createEl('button', { cls: 'cp-hasard-toggle-pool', text: h.libelle });
      if (h.pos === actif) btn.addClass('active');
      btn.addEventListener('click', () => {
        if (h.pos === actif) return;
        actif = h.pos;
        boutons.forEach(b => b.removeClass('active'));
        btn.addClass('active');
        remplir(contenu, h.pos);
      });
      boutons.push(btn);
    });
    remplir(contenu, actif);
  });
}

async function chercheSynonymesAntonymesCnrtl(mot, pos){
  const data = await jsonMotCnrtl(mot, pos);
  if (!data.header) return { synonymes: [], antonymes: [], trouve: false };

  const extrait = (id) => {
    const entree = (data.content || []).find(c => c.id === id);
    if (!entree || !Array.isArray(entree.content)) return [];
    return entree.content
      .filter(item => item && typeof item.value === 'string' && item.value.trim())
      .map(item => ({ mot: item.value.trim(), rang: typeof item.rank === 'number' ? item.rank : 0 }))
      .sort((a, b) => b.rang - a.rang);
  };

  const synonymes = extrait('synonyms');
  const antonymes = extrait('antonyms');
  return { synonymes, antonymes, trouve: synonymes.length > 0 || antonymes.length > 0 };
}

/* Onglet Inspiration : même API CNRTL que ci-dessus, mais on y lit les clés
   qui relèvent du champ lexical plutôt que des synonymes (déjà couverts par
   l'onglet Synonymes) — collocations (mots souvent employés avec le mot),
   famille de mots (dérivés), proverbes — plus le lien Proxémie fourni tel
   quel par l'API. Aucune de ces données ne passe par le moteur de rimes
   autrement que via le rendu des chips (mots simples). */
async function chercheInspirationCnrtl(mot, pos){
  const data = await jsonMotCnrtl(mot, pos);
  const vide = { collocations: [], famille: [], proverbes: [], proxemie: null, trouve: false };
  if (!data.header) return vide;

  const bloc = (id) => {
    const entree = (data.content || []).find(c => c && c.id === id);
    return entree ? entree.content : null;
  };

  const brutsCollocs = Array.isArray(bloc('collocations')) ? bloc('collocations') : [];
  const collocations = brutsCollocs
    .filter(c => c && typeof c.key === 'string' && c.key.trim())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map(c => c.key.trim())
    // CNRTL renvoie parfois le mot lui-même parmi ses collocations ("os" pour "os").
    .filter(k => normaliseMot(k) !== normaliseMot(mot) && normaliseMot(k) !== normaliseMot((data.header && data.header.form) || ''));

  // Famille : on écarte les noms propres, le mot lui-même (saisi ou forme
  // de base renvoyée par l'API) et les doublons (ex. "sylvain" adj. + nom).
  const exclus = new Set([normaliseMot(mot), normaliseMot((data.header && data.header.form) || '')]);
  const vus = new Set();
  const noeuds = (bloc('families') && Array.isArray(bloc('families').nodes)) ? bloc('families').nodes : [];
  const famille = [];
  noeuds.forEach(n => {
    if (!n || typeof n.label !== 'string' || !n.label.trim()) return;
    if (n.fpos === 'Nom propre') return;
    const label = n.label.trim();
    const cle = normaliseMot(label);
    if (exclus.has(cle) || vus.has(cle)) return;
    vus.add(cle);
    famille.push(label);
  });

  const brutsProverbes = Array.isArray(bloc('proverbs')) ? bloc('proverbs') : [];
  const proverbes = brutsProverbes
    .filter(p => p && typeof p.proverb === 'string' && p.proverb.trim())
    .map(p => ({ html: p.proverb, sens: typeof p.meaning === 'string' ? p.meaning.trim() : '' }));

  const lienProx = bloc('proxemie');
  const proxemie = (typeof lienProx === 'string' && /^https:\/\//.test(lienProx)) ? lienProx : null;

  return { collocations, famille, proverbes, proxemie,
    trouve: collocations.length > 0 || famille.length > 0 || proverbes.length > 0 };
}

/* Affiche un proverbe CNRTL sans injecter son HTML : on le lit via
   DOMParser (aucun script exécuté) et on ne recrée que le texte, avec le
   mot surligné par CNRTL (span.s-highlight) remis en gras. */
function renderProverbeCnrtl(parent, html){
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const racine = doc.body.firstElementChild;
  if (!racine) return;
  racine.childNodes.forEach(n => {
    if (n.nodeType === 3) parent.appendText(n.textContent);
    else if (n.nodeType === 1) {
      if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
      if (n.classList && n.classList.contains('s-highlight')) parent.createEl('strong', { text: n.textContent });
      else parent.appendText(n.textContent);
    }
  });
}

/* Onglet Inspiration — Wiktionnaire : mêmes requête et découpage par langue
   que chercheSynonymesWiktionnaire (fonction laissée intacte), mais on lit
   les sections de champ lexical plutôt que les synonymes. Chaque section
   peut apparaître sous plusieurs classes grammaticales (nom, adjectif…) :
   on les rassemble toutes. Le titre de section est reconnu sous son nom
   complet ou son abréviation Wiktionnaire ({{S|drv}} = {{S|dérivés}}…). */
const SECTIONS_WIKT_INSPIRATION = {
  vocabulaire: 'vocabulaire', voc: 'vocabulaire',
  'dérivés': 'derives', drv: 'derives',
  'apparentés': 'apparentes', apr: 'apparentes',
  locutions: 'locutions', loc: 'locutions',
  proverbes: 'proverbes', prov: 'proverbes'
};

async function chercheInspirationWiktionnaire(mot){
  const url = `https://fr.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(mot)}&format=json&prop=wikitext&origin=*`;
  const reponse = await requestUrl({ url, headers: ENTETES_NAVIGATEUR, throw: false });
  if (reponse.status !== 200) throw new Error(`HTTP ${reponse.status}`);
  const data = reponse.json;
  const vide = { vocabulaire: [], derives: [], apparentes: [], locutions: [], proverbes: [], trouve: false };
  if (!data || data.error || !data.parse) return vide;

  const complet = (data.parse.wikitext && data.parse.wikitext['*']) || '';
  // Section française seule (même logique que pour les synonymes).
  const mLangue = /==\s*\{\{langue\|fr\}\}\s*==/i.exec(complet);
  let wikitext = complet;
  if (mLangue) {
    const suite = complet.slice(mLangue.index + mLangue[0].length);
    const fin = suite.match(/\n==[^=]/);
    wikitext = fin ? suite.slice(0, fin.index) : suite;
  }

  const res = { vocabulaire: [], derives: [], apparentes: [], locutions: [], proverbes: [] };
  const vus = { vocabulaire: new Set(), derives: new Set(), apparentes: new Set(), locutions: new Set(), proverbes: new Set() };
  const soi = normaliseMot(mot);
  const ajoute = (cle, texte) => {
    const t = (texte || '').replace(/_/g, ' ').trim();
    if (!t || t.includes(':')) return; // Thésaurus:, Catégorie:, Annexe:…
    const n = normaliseMot(t);
    if (!n || n === soi || vus[cle].has(n)) return;
    vus[cle].add(n);
    res[cle].push(t);
  };

  const reTitre = /^=+\s*\{\{S\|([^|}]+)[^}]*\}\}\s*=+\s*$/gm;
  const titres = [];
  let m;
  while ((m = reTitre.exec(wikitext))) titres.push({ nom: m[1].trim().toLowerCase(), debut: m.index + m[0].length, pos: m.index });
  titres.forEach((t, i) => {
    const cle = SECTIONS_WIKT_INSPIRATION[t.nom];
    if (!cle) return;
    const corps = wikitext.slice(t.debut, i + 1 < titres.length ? titres[i + 1].pos : wikitext.length);
    let mm;
    const reLien = /\{\{(?:lien|l)\|([^|}]+)/g;
    const reCrochets = /\[\[([^\]|#]+)/g;
    // On garde l'ordre d'apparition dans la page : on relève les positions
    // des deux types de liens puis on les trie.
    const trouves = [];
    while ((mm = reLien.exec(corps))) trouves.push({ i: mm.index, t: mm[1] });
    while ((mm = reCrochets.exec(corps))) trouves.push({ i: mm.index, t: mm[1] });
    trouves.sort((a, b) => a.i - b.i).forEach(x => ajoute(cle, x.t));
  });

  const trouve = Object.values(res).some(l => l.length > 0);
  return Object.assign(res, { trouve });
}

/* Onglet Inspiration — JeuxDeMots (réseau lexical du LIRMM, API publique
   de démonstration). Relations pondérées : 0 = idées associées, 17 =
   caractéristiques, 9 = parties. L'API ne trie pas par poids (ordre des
   identifiants) : on récupère tout au-dessus d'un seuil et on trie ici.
   Deux appels en parallèle, car les idées associées sont bien plus
   nombreuses et demandent un seuil plus haut. */
const JDM_API = 'https://jdm-api.demo.lirmm.fr/v0/relations/from/';
const JDM_SEUIL_ASSOCIEES = 200;
const JDM_SEUIL_PRECIS = 20;

function decodeEntitesHtml(texte){
  if (!texte || texte.indexOf('&') === -1) return texte;
  const doc = new DOMParser().parseFromString(`<div>${texte}</div>`, 'text/html');
  return doc.body.textContent || texte;
}

async function appelJdm(mot, types, seuil){
  const params = types.map(t => `types_ids=${t}`).join('&');
  const url = `${JDM_API}${encodeURIComponent(mot)}?${params}&min_weight=${seuil}`;
  const reponse = await requestUrl({ url, headers: ENTETES_NAVIGATEUR, throw: false });
  if (reponse.status === 404) return { nodes: [], relations: [] }; // mot inconnu du réseau
  if (reponse.status !== 200) throw new Error(`HTTP ${reponse.status}`);
  let data;
  try { data = JSON.parse(reponse.text || '{}'); }
  catch (err) { throw new Error('Réponse JeuxDeMots illisible (format inattendu)'); }
  return { nodes: Array.isArray(data.nodes) ? data.nodes : [], relations: Array.isArray(data.relations) ? data.relations : [] };
}

async function chercheInspirationJdm(mot){
  const [a, b] = await Promise.all([
    appelJdm(mot, [0], JDM_SEUIL_ASSOCIEES),
    appelJdm(mot, [17, 9], JDM_SEUIL_PRECIS)
  ]);
  const noms = new Map();
  [...a.nodes, ...b.nodes].forEach(n => { if (n && n.type === 1 && typeof n.name === 'string') noms.set(n.id, n.name); });
  const soi = normaliseMot(mot);
  const parType = { 0: [], 17: [], 9: [] };
  [...a.relations, ...b.relations].forEach(r => {
    if (!r || !(r.type in parType) || typeof r.w !== 'number' || r.w <= 0) return;
    let nom = noms.get(r.node2);
    if (!nom) return;                                   // nœud technique (type ≠ 1)
    if (nom.startsWith('::') || /^[a-z]{2}:/.test(nom)) return; // interne, autre langue (en:…)
    nom = decodeEntitesHtml(nom.split('>')[0]).trim();  // "matou>150" -> "matou"
    if (!nom || /^[A-ZÀ-Ý]/.test(nom)) return;          // noms propres
    parType[r.type].push({ mot: nom, w: r.w });
  });
  const nettoie = (liste) => {
    const vus = new Set();
    return liste.sort((x, y) => y.w - x.w).filter(x => {
      const n = normaliseMot(x.mot);
      if (!n || n === soi || vus.has(n)) return false;
      vus.add(n);
      return true;
    }).map(x => x.mot);
  };
  const associees = nettoie(parType[0]);
  const caracteristiques = nettoie(parType[17]);
  const parties = nettoie(parType[9]);
  return { associees, caracteristiques, parties,
    trouve: associees.length > 0 || caracteristiques.length > 0 || parties.length > 0 };
}

/* Légende de l'onglet Inspiration : une couleur par NATURE de contenu,
   quelle que soit la source (la même classe CSS colore sous-sections et
   pastilles de la légende, donc un réglage de teinte suit partout). */
const NATURES_INSPIRATION = [
  { cle: 'lexical', nom: 'Champ lexical', detail: 'Collocations (CNRTL) · Vocabulaire apparenté (Wiktionnaire) · Idées associées (JeuxDeMots)' },
  { cle: 'famille', nom: 'Famille de mots', detail: 'Famille de mots (CNRTL) · Dérivés, Apparentés étymologiques (Wiktionnaire)' },
  { cle: 'expression', nom: 'Expressions', detail: 'Proverbes (CNRTL) · Locutions, Proverbes (Wiktionnaire)' },
  { cle: 'carac', nom: 'Caractéristiques', detail: 'JeuxDeMots' },
  { cle: 'parties', nom: 'Parties', detail: 'JeuxDeMots' }
];

const SOURCES_EN_LIGNE = {
  wiktionnaire: { id: 'wiktionnaire', nom: 'Wiktionnaire', chercher: chercheSynonymesWiktionnaire },
  crisco: { id: 'crisco', nom: 'CRISCO', chercher: chercheSynonymesCrisco },
  cnrtl: { id: 'cnrtl', nom: 'CNRTL', chercher: chercheSynonymesAntonymesCnrtl }
};
const SOURCES_EN_LIGNE_ORDRE = ['cnrtl', 'crisco', 'wiktionnaire'];
// Onglet Inspiration : sources de champ lexical (pas de synonymes, déjà
// couverts par l'onglet Synonymes). Ordre = ordre d'affichage des blocs ;
// seul le premier bloc coché s'ouvre par défaut.
const SOURCES_INSPIRATION = [
  { id: 'cnrtl', nom: 'CNRTL' },
  { id: 'wiktionnaire', nom: 'Wiktionnaire' },
  { id: 'jdm', nom: 'JeuxDeMots' }
];

