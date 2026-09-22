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

