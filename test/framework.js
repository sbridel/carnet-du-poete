// Framework de test minimal, volontairement sans dépendance (pas de
// jest/mocha à installer) — juste assez pour regrouper des assertions
// par thème, afficher un résumé clair, et sortir avec un code d'erreur
// non nul si quelque chose casse (utilisable dans un script de release).

let groupeActuel = null;
const resultats = [];

function groupe(nom, fn) {
  groupeActuel = nom;
  fn();
  groupeActuel = null;
}

function test(description, fn) {
  const nomComplet = groupeActuel ? `${groupeActuel} — ${description}` : description;
  try {
    fn();
    resultats.push({ nom: nomComplet, ok: true });
  } catch (e) {
    resultats.push({ nom: nomComplet, ok: false, erreur: e.message });
  }
}

function assertEqual(actuel, attendu, contexte) {
  if (actuel !== attendu) {
    throw new Error(`${contexte ? contexte + ' — ' : ''}attendu ${JSON.stringify(attendu)}, obtenu ${JSON.stringify(actuel)}`);
  }
}

function assertTrue(valeur, contexte) {
  if (!valeur) throw new Error(`${contexte ? contexte + ' — ' : ''}attendu une valeur vraie, obtenu ${JSON.stringify(valeur)}`);
}

function assertFalse(valeur, contexte) {
  if (valeur) throw new Error(`${contexte ? contexte + ' — ' : ''}attendu une valeur fausse, obtenu ${JSON.stringify(valeur)}`);
}

function resume() {
  const echecs = resultats.filter(r => !r.ok);
  const reussites = resultats.filter(r => r.ok);

  console.log(`\n${reussites.length}/${resultats.length} tests passés.\n`);

  if (echecs.length > 0) {
    console.log('Échecs :');
    echecs.forEach(r => console.log(`  ✗ ${r.nom}\n    ${r.erreur}`));
    console.log('');
  }

  process.exitCode = echecs.length > 0 ? 1 : 0;
}

module.exports = { groupe, test, assertEqual, assertTrue, assertFalse, resume };
