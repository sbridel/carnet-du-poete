
/* =========================================================
   FORMES FIXES — vérification d'un poème contre une forme (sonnet…)
   verifieForme(texte, idForme) -> { nom, regles: [{ libelle, ok, vers, detail }] }
   « vers » = numéros (à partir de 1) des vers en défaut, pour le bilan.
   Pour ajouter une forme : une entrée dans FORMES_FIXES avec ses coupes
   (hémistiche) et une fonction regles(p) qui renvoie la liste ci-dessus.
   ========================================================= */

// Fin de vers sur une vraie pause : ponctuation finale (guillemets ou
// parenthèses fermants tolérés après).
function finitSurPause(texte){
  return /[.,;:!?…—–-]["»”’)\]\s]*$/.test((texte || '').trim());
}

// Même mot, éventuellement sous une autre forme (relit → Relis, leste →
// Lesté, novice → Novice) : égalité, flexion connue, ou racine commune.
function memeMotOuForme(a, b){
  const x = retireContraction(normaliseMot(a)), y = retireContraction(normaliseMot(b));
  if (!x || !y) return false;
  if (x === y || estFlexionDe(x, y) || estFlexionDe(y, x)) return true;
  const sansAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const u = sansAccent(x), v = sansAccent(y);
  let k = 0;
  while (k < u.length && k < v.length && u[k] === v[k]) k++;
  return k >= 3 && k >= Math.min(u.length, v.length) - 2;
}

const premierMot = r => r.details.length ? r.details[0].mot : '';
const dernierMot = r => r.details.length ? r.details[r.details.length - 1].mot : '';

// Le mètre visé est atteint par la lecture par défaut ou par la diérèse.
const atteintMetre = (r, metre) => r.total === metre || (r.hasHiatus && r.total <= metre && r.totalMax >= metre);

// Contexte commun : vers non vides numérotés, strophes, lettres de rime
// continues sur tout le poème (indépendantes du réglage d'affichage).
function contexteForme(texte, coupes){
  const poeme = analysePoeme(texte);
  const vers = [];
  poeme.lignes.forEach(l => { if (!l.vide) vers.push(l); });
  const numero = new Map();
  let n = 0;
  poeme.lignes.forEach((l, i) => { if (!l.vide) numero.set(i, ++n); });
  const strophes = poeme.strophes.map(s => s.indices.map(i => poeme.lignes[i]));
  const lettres = calculeSchemaStrophe(vers.map(l => dernierMot(l.r)), { representants: [], prochaine: 0 });
  vers.forEach((l, i) => { l.lettreGlobale = lettres[i]; l.numero = i + 1; l.hemistiche = calculeHemistiche(l.r, coupes); });
  return { vers, strophes, numero };
}

const regle = (libelle, fautifs, detail) => ({ libelle, ok: fautifs.length === 0, vers: fautifs, detail: detail || '' });
// Règle indicative : signalée « à vérifier » (⚠), sans compter comme une faute,
// quand l'outil ne peut pas trancher seul (ex. une pause sans ponctuation).
const conseil = (libelle, fautifs, detail) => Object.assign(regle(libelle, fautifs, detail), { conseil: true });

function reglesStructure(c, tailles){
  const vues = c.strophes.map(s => s.length);
  const ok = vues.length === tailles.length && vues.every((t, i) => t === tailles[i]);
  return { libelle: `${tailles.length} strophes (${tailles.join(' + ')} vers)`, ok, vers: [], detail: ok ? '' : `trouvé : ${vues.join(' + ') || 'aucune'}` };
}

// Deux vers identiques (refrain) : même texte, sans tenir compte de la
// ponctuation, de la casse ni des espaces.
function texteVersNormalise(t){
  return (t || '').toLowerCase().replace(/[’‘‛]/g, "'").replace(/[^a-zàâäéèêëîïôöùûüÿœç']+/gi, ' ').trim();
}
function memeVers(a, b){ return !!texteVersNormalise(a) && texteVersNormalise(a) === texteVersNormalise(b); }

/* Vérifie un motif de rimes (ex. 'ABaAabAB' — la casse ne compte pas)
   sur les vers d'indices donnés (tous les vers par défaut) : même lettre
   du motif = même rime, lettres différentes = rimes différentes. Renvoie
   les numéros des vers fautifs. */
function fautesMotif(c, motif, indices){
  const lettres = motif.replace(/\s+/g, '').split('');
  const idx = indices || lettres.map((_, k) => k);
  const rimeDe = new Map(), lettreDe = new Map(), fautes = [];
  lettres.forEach((m, k) => {
    const l = c.vers[idx[k]];
    if (!l) return;
    const cle = m.toLowerCase(), x = l.lettreGlobale;
    if (!x) { fautes.push(l.numero); return; }
    if (!rimeDe.has(cle)) {
      if (lettreDe.has(x)) fautes.push(l.numero); // deux lettres du motif sur une même rime
      rimeDe.set(cle, x); lettreDe.set(x, cle);
    } else if (rimeDe.get(cle) !== x) fautes.push(l.numero);
  });
  return fautes;
}

const regleNbVers = (c, n) => ({ libelle: `${n} vers`, ok: c.vers.length === n, vers: [], detail: c.vers.length === n ? '' : `trouvé : ${c.vers.length}` });

// Même mètre pour tous les vers donnés (celui du premier, diérèse comprise).
function regleIsometrie(c, indices){
  const vers = (indices || c.vers.map((_, i) => i)).map(i => c.vers[i]).filter(Boolean);
  if (!vers.length) return regle('Isométrie', []);
  const metre = vers[0].r.total;
  return regle(`Isométrie (${metre} syllabes)`, vers.filter(l => !atteintMetre(l.r, metre)).map(l => l.numero));
}

// Mètres imposés vers par vers (haïku, tanka).
function regleMetres(c, metres){
  return regle(`Syllabes ${metres.join('-')}`, c.vers.filter((l, i) => metres[i] !== undefined && !atteintMetre(l.r, metres[i])).map(l => l.numero));
}

// Refrains : chaque paire [i, j] (numéros de vers, à partir de 1) doit être identique.
function regleRefrains(c, libelle, paires){
  const fautes = [];
  paires.forEach(([i, j]) => { const a = c.vers[i - 1], b = c.vers[j - 1]; if (a && b && !memeVers(a.texte, b.texte)) fautes.push(j); });
  return regle(libelle, fautes);
}

const FORMES_FIXES = {
  libre: { nom: 'Libre' },

  haiku: {
    nom: 'Haïku', famille: 'breves',
    regles: c => [regleNbVers(c, 3), regleMetres(c, [5, 7, 5])]
  },

  tanka: {
    nom: 'Tanka', famille: 'breves',
    regles: c => [regleNbVers(c, 5), regleMetres(c, [5, 7, 5, 7, 7])]
  },

  triolet: {
    nom: 'Triolet', famille: 'breves',
    regles: c => [regleNbVers(c, 8), regleIsometrie(c),
      regle('Rimes ABaAabAB', c.vers.length === 8 ? fautesMotif(c, 'ABaAabAB') : []),
      regleRefrains(c, 'Refrains : le vers 1 revient en 4 et 7, le vers 2 en 8', [[1, 4], [1, 7], [2, 8]])]
  },

  shakespearien: {
    nom: 'Sonnet shakespearien', famille: 'sonnets', coupes: { 12: 6, 10: 4 },
    regles: c => [regleNbVers(c, 14), regleIsometrie(c),
      regle('Rimes ABAB CDCD EFEF GG', c.vers.length === 14 ? fautesMotif(c, 'ABAB CDCD EFEF GG') : [])]
  },

  rondel: {
    nom: 'Rondel', famille: 'refrain',
    regles: c => [reglesStructure(c, [4, 4, 5]), regleIsometrie(c),
      regle('Rimes ABBA ABAB ABBAA (deux rimes)', c.vers.length === 13 ? fautesMotif(c, 'ABBA ABAB ABBAA') : []),
      regleRefrains(c, 'Refrains : les vers 1 et 2 reviennent en 7 et 8, le vers 1 en 13', [[1, 7], [2, 8], [1, 13]])]
  },

  rondeau: {
    nom: 'Rondeau', famille: 'refrain',
    // 5 + 3 vers + rentrement, puis 5 vers + rentrement : 15 lignes en 5 + 4 + 6.
    regles(c){
      const r = [reglesStructure(c, [5, 4, 6])];
      if (c.vers.length !== 15) return r;
      const principaux = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13];
      r.push(regleIsometrie(c, principaux));
      r.push(regle('Rimes AABBA AAB AABBA (deux rimes)', fautesMotif(c, 'AABBA AAB AABBA', principaux)));
      const debut = texteVersNormalise(c.vers[0].texte);
      const fautes = [9, 15].filter(n => {
        const rent = texteVersNormalise(c.vers[n - 1].texte);
        return !rent || rent === debut || !(debut + ' ').startsWith(rent + ' ');
      });
      r.push(regle('Rentrement : les premiers mots du poème reviennent en fin des strophes 2 et 3', fautes));
      return r;
    }
  },

  villanelle: {
    nom: 'Villanelle', famille: 'refrain',
    regles: c => [reglesStructure(c, [3, 3, 3, 3, 3, 4]), regleIsometrie(c),
      regle('Rimes ABA ×5 puis ABAA (deux rimes)', c.vers.length === 19 ? fautesMotif(c, 'ABA ABA ABA ABA ABA ABAA') : []),
      regleRefrains(c, 'Refrains : le vers 1 revient en 6, 12, 18 ; le vers 3 en 9, 15, 19',
        [[1, 6], [1, 12], [1, 18], [3, 9], [3, 15], [3, 19]])]
  },

  ballade: {
    nom: 'Ballade', famille: 'refrain',
    // 3 huitains ababbcbC + envoi bcbC (octosyllabes), ou 3 dizains
    // ababbccdcD + envoi ccdcD (décasyllabes) : mêmes rimes partout.
    regles(c){
      const dizains = c.strophes.length && c.strophes[0].length === 10;
      const [taille, envoi, motif, motifEnvoi] = dizains ? [10, 5, 'ababbccdcD', 'ccdcD'] : [8, 4, 'ababbcbC', 'bcbC'];
      const r = [reglesStructure(c, [taille, taille, taille, envoi])];
      r.push(regleIsometrie(c));
      if (c.vers.length === 3 * taille + envoi) {
        r.push(regle(`Rimes ${motif} ×3 + envoi ${motifEnvoi}, les mêmes partout`, fautesMotif(c, motif + motif + motif + motifEnvoi)));
        const fins = [taille, 2 * taille, 3 * taille, 3 * taille + envoi];
        r.push(regleRefrains(c, 'Refrain en fin de chaque strophe et de l\'envoi', fins.slice(1).map(n => [fins[0], n])));
      }
      return r;
    }
  },

  pantoum: {
    nom: 'Pantoum', famille: 'enchainement',
    regles(c){
      const n = c.strophes.length;
      const r = [{ libelle: 'Quatrains (au moins deux)', ok: n >= 2 && c.strophes.every(s => s.length === 4), vers: [], detail: '' }];
      r.push(regleIsometrie(c));
      const fautesRimes = [], fautesChaine = [];
      c.strophes.forEach((s, k) => {
        if (s.length !== 4) return;
        const debut = c.vers.indexOf(s[0]);
        fautesRimes.push(...fautesMotif(c, 'ABAB', [debut, debut + 1, debut + 2, debut + 3]));
        const suiv = c.strophes[k + 1];
        if (suiv && suiv.length === 4) {
          if (!memeVers(s[1].texte, suiv[0].texte)) fautesChaine.push(suiv[0].numero);
          if (!memeVers(s[3].texte, suiv[2].texte)) fautesChaine.push(suiv[2].numero);
        }
      });
      r.push(regle('Rimes ABAB dans chaque quatrain', fautesRimes));
      r.push(regle('Enchaînement : les vers 2 et 4 d\'une strophe deviennent les vers 1 et 3 de la suivante', fautesChaine));
      const premier = c.vers[0], dernier = c.vers[c.vers.length - 1];
      r.push(regle('Le dernier vers reprend le premier', premier && dernier && memeVers(premier.texte, dernier.texte) ? [] : (dernier ? [dernier.numero] : [])));
      const s0 = c.strophes[0], sn = c.strophes[n - 1];
      if (s0 && sn && s0.length === 4 && sn.length === 4) {
        r.push(conseil('L\'avant-dernier vers reprend le 3e (bouclage classique)', memeVers(s0[2].texte, sn[1].texte) ? [] : [sn[1].numero]));
      }
      return r;
    }
  },

  terzarima: {
    nom: 'Terza rima', famille: 'enchainement',
    regles(c){
      const s = c.strophes;
      const tercets = s.length && s[s.length - 1].length === 1 ? s.slice(0, -1) : s;
      const final = tercets !== s ? s[s.length - 1][0] : null;
      const r = [{ libelle: 'Tercets terminés par un vers isolé', ok: tercets.length >= 2 && tercets.every(t => t.length === 3) && !!final, vers: [], detail: '' }];
      r.push(regleIsometrie(c));
      const fautes = [];
      tercets.forEach((t, k) => {
        if (t.length !== 3) return;
        if (t[0].lettreGlobale !== t[2].lettreGlobale || t[0].lettreGlobale === t[1].lettreGlobale) fautes.push(t[2].numero);
        const suiv = tercets[k + 1];
        if (suiv && suiv.length === 3 && suiv[0].lettreGlobale !== t[1].lettreGlobale) fautes.push(suiv[0].numero);
      });
      const dernierTercet = tercets[tercets.length - 1];
      if (final && dernierTercet && dernierTercet.length === 3 && final.lettreGlobale !== dernierTercet[1].lettreGlobale) fautes.push(final.numero);
      r.push(regle('Rimes enchaînées ABA BCB CDC…, le vers final sur la rime du milieu', fautes));
      return r;
    }
  },

  sextine: {
    nom: 'Sextine', famille: 'enchainement',
    // Les six mots de fin du 1er sizain reviennent dans chaque sizain
    // suivant selon l'ordre 6-1-5-2-4-3 ; envoi de 3 vers qui les reprend.
    regles(c){
      const s = c.strophes;
      const r = [reglesStructure(c, [6, 6, 6, 6, 6, 6, 3])];
      r.push(regleIsometrie(c));
      const fautes = [];
      if (s.length >= 2 && s.slice(0, 6).every(x => x.length === 6)) {
        let ordre = s[0].map(l => dernierMot(l.r));
        for (let k = 1; k < 6; k++) {
          ordre = [5, 0, 4, 1, 3, 2].map(i => ordre[i]);
          s[k].forEach((l, i) => { if (!memeMotOuForme(dernierMot(l.r), ordre[i])) fautes.push(l.numero); });
        }
        r.push(regle('Mots-rimes en rotation 6-1-5-2-4-3', fautes));
        const envoi = s[6];
        if (envoi) {
          const mots = new Set(envoi.flatMap(l => l.r.details.map(d => retireContraction(normaliseMot(d.mot)))));
          const absents = s[0].map(l => dernierMot(l.r)).filter(m => ![...mots].some(x => memeMotOuForme(x, m)));
          r.push(conseil('L\'envoi reprend les six mots-rimes', absents.length ? envoi.map(l => l.numero) : [], absents.length ? `manquent : ${absents.join(', ')}` : ''));
        }
      }
      return r;
    }
  },
  sonnet: {
    nom: 'Sonnet (français)', famille: 'sonnets',
    coupes: { 12: 6, 10: 4 },
    regles(c){
      const r = [reglesStructure(c, [4, 4, 3, 3])];
      const metre = c.vers.length && atteintMetre(c.vers[0].r, 12) ? 12 : 10;
      r.push(regle(`Isométrie : ${metre === 12 ? 'alexandrins' : 'décasyllabes'}`, c.vers.filter(l => !atteintMetre(l.r, metre)).map(l => l.numero)));
      r.push(regle('Hémistiche régulier', c.vers.filter(l => l.hemistiche && l.hemistiche.rompue).map(l => l.numero)));
      if (c.vers.length === 14) {
        const L = c.vers.map(l => l.lettreGlobale);
        const A = L[0], B = L[1];
        const quatrainsOk = A !== B && [0, 3, 4, 7].every(i => L[i] === A) && [1, 2, 5, 6].every(i => L[i] === B);
        r.push({ libelle: 'Quatrains ABBA ABBA (mêmes rimes)', ok: quatrainsOk, vers: [], detail: quatrainsOk ? '' : `trouvé : ${L.slice(0, 8).join('')}` });
        const t = L.slice(8);
        const neuves = t.every(x => x !== A && x !== B);
        const eed = t[0] === t[1] && t[2] === t[5] && t[3] === t[4] && t[0] !== t[2] && t[2] !== t[3] && t[0] !== t[3];
        const ede = t[0] === t[1] && t[2] === t[4] && t[3] === t[5] && t[0] !== t[2] && t[2] !== t[3] && t[0] !== t[3];
        r.push({ libelle: 'Tercets CCD EED ou CCD EDE', ok: neuves && (eed || ede), vers: [], detail: neuves && (eed || ede) ? '' : `trouvé : ${t.join('')}` });
      }
      r.push(regle('Alternance masculine/féminine', c.vers.filter(l => l.alternanceRompue).map(l => l.numero)));
      return r;
    }
  },

  fahsee: {
    nom: 'Fahsee', famille: 'miennes',
    coupes: { 10: 5 },
    regles(c){
      const r = [reglesStructure(c, [5, 5, 5, 5, 5])];
      r.push(regle('Décasyllabes', c.vers.filter(l => !atteintMetre(l.r, 10)).map(l => l.numero)));
      r.push(regle('Coupe au milieu (5 // 5)', c.vers.filter(l => !l.hemistiche || l.hemistiche.rompue).map(l => l.numero)));
      // Rimes ABABA dans chaque strophe, deux rimes propres à chaque strophe,
      // sauf la 5e dont le A reprend le A de la 1re (son B est libre).
      const fautesSchema = [], rimes = [];
      c.strophes.forEach(s => {
        if (s.length !== 5) { rimes.push(null); return; }
        const L = s.map(l => l.lettreGlobale);
        const ok = L[0] && L[1] && L[0] !== L[1] && L[2] === L[0] && L[4] === L[0] && L[3] === L[1];
        if (!ok) s.forEach(l => fautesSchema.push(l.numero));
        rimes.push(ok ? { A: L[0], B: L[1] } : null);
      });
      r.push(regle('Rimes ABABA dans chaque strophe', fautesSchema));
      const fautesNeuves = [];
      // Strophes 1 à 4 : leurs rimes n'apparaissent dans aucune autre des
      // strophes 1 à 4, ni dans le A de la 5e (sauf le A de la 1re, que la
      // 5e doit justement reprendre). Le B de la 5e est libre.
      rimes.slice(0, 4).forEach((x, i) => {
        if (!x) return;
        const autres = [];
        rimes.slice(0, 4).forEach((y, j) => { if (y && j !== i) autres.push(y.A, y.B); });
        if (rimes[4] && i !== 0) autres.push(rimes[4].A);
        if (autres.includes(x.A) || autres.includes(x.B) || (i === 0 && rimes[4] && rimes[4].A === x.B)) fautesNeuves.push(c.strophes[i][0].numero);
      });
      if (rimes[0] && rimes[4] && rimes[4].A !== rimes[0].A) fautesNeuves.push(c.strophes[4][0].numero);
      r.push(regle('Rimes propres à chaque strophe, la 5e reprenant le A de la 1re', [...new Set(fautesNeuves)]));
      // Une vraie pause n'a pas toujours besoin d'une ponctuation : simple
      // signalement des vers qui n'en ont pas, à relire par le poète.
      r.push(conseil('Chaque vers finit sur une pause (pas de rejet)', c.vers.filter(l => !finitSurPause(l.texte)).map(l => l.numero), 'pas de ponctuation finale'));
      const fautesLien = [];
      for (let i = 0; i + 1 < c.strophes.length; i++) {
        const fin = c.strophes[i][c.strophes[i].length - 1], debut = c.strophes[i + 1][0];
        if (!memeMotOuForme(dernierMot(fin.r), premierMot(debut.r))) fautesLien.push(debut.numero);
      }
      r.push(regle('Mot de lien entre les strophes', fautesLien));
      const premier = c.vers[0], dernier = c.vers[c.vers.length - 1];
      const retourOk = premier && dernier && memeMotOuForme(premierMot(premier.r), dernierMot(dernier.r));
      r.push(regle('Mot de retour (le dernier mot est le premier)', retourOk ? [] : (dernier ? [dernier.numero] : [])));
      return r;
    }
  }
};
// Menu Forme : groupes affichés (intitulés non sélectionnables), dans l'ordre.
const FORMES_FIXES_GROUPES = [
  { nom: 'Formes brèves', ids: ['haiku', 'tanka', 'triolet'] },
  { nom: 'Sonnets', ids: ['sonnet', 'shakespearien'] },
  { nom: 'Formes à refrain', ids: ['rondel', 'rondeau', 'villanelle', 'ballade'] },
  { nom: 'Formes à enchaînement', ids: ['pantoum', 'terzarima', 'sextine'] },
  { nom: 'Mes formes', ids: ['fahsee'] }
];
const FORMES_FIXES_ORDRE = ['libre', ...FORMES_FIXES_GROUPES.flatMap(g => g.ids)];

function coupesDeForme(idForme){
  const f = FORMES_FIXES[idForme];
  return (f && f.coupes) || COUPES_PAR_DEFAUT;
}

/* Extrait le poème d'une note Obsidian (bouton « Note active ») :
   priorité à la sélection de l'éditeur, puis au premier bloc ```poeme,
   puis à toute la note. Le frontmatter est retiré, et chaque ligne est
   débarrassée de la syntaxe Markdown qui fausserait le compte (#, >,
   puces, **, *, _, liens [[…]]). Renvoie { texte, source }. */
function extraitPoemeDeNote(contenu, selection){
  let texte, source;
  if (selection && selection.trim()) { texte = selection; source = 'sélection'; }
  else {
    const corps = (contenu || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    const bloc = corps.match(/^(`{3,}|~{3,})\s*po[eè]me\b[^\n]*\n([\s\S]*?)^\1\s*$/mi);
    if (bloc) { texte = bloc[2]; source = 'bloc poeme'; }
    else { texte = corps; source = 'note entière'; }
  }
  const lignes = texte.replace(/\r\n?/g, '\n').split('\n').map(l => l
    .replace(/^\s*#{1,6}\s+/, '')            // titres
    .replace(/^\s*(>\s*)+(\[![^\]]*\]\S*\s*)?/, '') // citations et callouts
    .replace(/^\s*([-*+]|\d+[.)])\s+/, '')     // puces et listes numérotées
    .replace(/!?\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2') // liens internes [[cible|texte]]
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // liens Markdown [texte](url)
    .replace(/(\*\*|__|\*|_|~~|==)/g, '')         // emphase, barré, surlignage
    .replace(/<[^>]+>/g, '')                     // HTML en ligne
    .replace(/\s+$/, ''));
  // lignes purement techniques (séparateurs ---, ```, tags seuls) : vidées
  const propres = lignes.map(l => /^(-{3,}|\*{3,}|`{3,}.*|~{3,}.*|(#[\w/-]+\s*)+)$/.test(l.trim()) ? '' : l);
  return { texte: propres.join('\n').replace(/\n{3,}/g, '\n\n').trim(), source };
}

/* Conseils de rime valables pour toute forme (⚠, jamais bloquants) :
   - rime du même au même : un mot qui rime avec lui-même, ou avec un
     composé/dérivé de lui-même (faire / défaire, jour / toujours) ;
   - consonne finale écrite : en versification classique, les mots en -s,
     -x, -z ne riment qu'entre eux, et plus largement la consonne finale
     muette doit concorder à l'écrit (amour / jours, sang / absent). */
function consonneFinaleEcrite(mot){
  let w = retireContraction(normaliseMot(mot));
  if (!w) return '';
  if (w.length > 2 && w.endsWith('h') && estVoyelle(w[w.length - 2])) w = w.slice(0, -1); // h final muet (Shorah, ah)
  const m = w.match(/[^aeiouyàâäéèêëîïôöùûüÿœ]+$/);
  if (!m) return '';
  const c = m[0];
  if (/[sxz]$/.test(c)) return 'S'; // s, x, z : une seule classe
  return c;
}
function reglesRimesCommunes(c){
  const parRime = new Map();
  c.vers.forEach(l => {
    if (!l.lettreGlobale) return;
    if (!parRime.has(l.lettreGlobale)) parRime.set(l.lettreGlobale, []);
    parRime.get(l.lettreGlobale).push(l);
  });
  const memeAuMeme = [], consonnes = [];
  parRime.forEach(groupe => {
    for (let i = 1; i < groupe.length; i++) {
      const a = dernierMot(groupe[i - 1].r), b = dernierMot(groupe[i].r);
      const radical = w => retireContraction(normaliseMot(w)).replace(/[sx]$/, '');
      const x = radical(a), y = radical(b);
      if (memeVers(groupe[i - 1].texte, groupe[i].texte)) continue; // refrain ou vers repris : voulu par la forme
      if (x && y && (x === y || (x.length >= 3 && y.endsWith(x)) || (y.length >= 3 && x.endsWith(y)))) memeAuMeme.push(groupe[i].numero);
      if (consonneFinaleEcrite(a) !== consonneFinaleEcrite(b)) consonnes.push(groupe[i].numero);
    }
  });
  return [
    conseil('Rime du même au même (un mot avec lui-même ou son dérivé)', [...new Set(memeAuMeme)]),
    conseil('Consonne finale écrite concordante (-s/-x/-z entre eux)', [...new Set(consonnes)], 'convention classique')
  ];
}

function verifieForme(texte, idForme){
  const f = FORMES_FIXES[idForme];
  if (!f || !f.regles) return null;
  const c = contexteForme(texte, f.coupes);
  return { nom: f.nom, regles: [...f.regles(c), ...reglesRimesCommunes(c)] };
}
