
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

function reglesStructure(c, tailles){
  const vues = c.strophes.map(s => s.length);
  const ok = vues.length === tailles.length && vues.every((t, i) => t === tailles[i]);
  return { libelle: `${tailles.length} strophes (${tailles.join(' + ')} vers)`, ok, vers: [], detail: ok ? '' : `trouvé : ${vues.join(' + ') || 'aucune'}` };
}

const FORMES_FIXES = {
  libre: { nom: 'Libre' },

  sonnet: {
    nom: 'Sonnet',
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

  rehevkor: {
    nom: 'Rehevkor',
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
      r.push(regle('Chaque vers finit sur une pause (pas de rejet)', c.vers.filter(l => !finitSurPause(l.texte)).map(l => l.numero)));
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
const FORMES_FIXES_ORDRE = ['libre', 'sonnet', 'rehevkor'];

function coupesDeForme(idForme){
  const f = FORMES_FIXES[idForme];
  return (f && f.coupes) || COUPES_PAR_DEFAUT;
}

function verifieForme(texte, idForme){
  const f = FORMES_FIXES[idForme];
  if (!f || !f.regles) return null;
  return { nom: f.nom, regles: f.regles(contexteForme(texte, f.coupes)) };
}
