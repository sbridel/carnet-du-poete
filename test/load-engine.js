// Charge le vrai main.js du plugin pour en extraire les fonctions du
// moteur (rimes, sonorités) et les tester en dehors d'Obsidian.
//
// Important : on ne modifie JAMAIS le main.js livré. On en fait une copie
// temporaire, on lui ajoute un module.exports à la fin (main.js n'en a
// aucun normalement — Obsidian charge la classe du plugin autrement), et
// c'est cette copie qu'on charge. Le fichier original ne bouge pas.

const fs = require('fs');
const path = require('path');
const os = require('os');

const CHEMIN_MAIN = path.join(__dirname, '..', 'main.js');

// Liste des fonctions/tables du moteur qu'on veut pouvoir tester.
// Si un test a besoin d'autre chose, l'ajouter ici plutôt que de
// dupliquer du code ailleurs.
const A_EXPORTER = [
  // Syllabes
  'nettoieMot', 'compteSyllabesMot', 'syllabifieMot', 'estVoyelle',
  // Rimes
  'preparerMotRime', 'normaliseSonsFinal', 'cleFinApprox', 'cleRicheMot',
  'classifieRime', 'memeRime', 'classeRime', 'coeurVocalique',
  'analysePoeme', 'extraitCategorieRime', 'estFlexionDe',
  // Sonorités
  'soninitial', 'groupesVoyellesMot', 'consonnesInternesMot',
  'analyseSonorites', 'analyseTramePhonique', 'analyseHomeoteleutes',
  'illResteConsonne', 'chEstK',
  // Tables utiles pour des assertions directes
  'FAMILLES_CONSONNES_SIMPLE', 'FAMILLES_VOYELLES_SIMPLE',
  'FAMILLES_CONSONNES_ETENDU', 'FAMILLES_VOYELLES_ETENDU',
  'THEME_CONSONNE', 'THEME_VOYELLE',
];

function chargeMoteur() {
  const source = fs.readFileSync(CHEMIN_MAIN, 'utf-8');
  // Le setter est défini dans le MÊME fichier temporaire que le code
  // original, donc il partage la même portée de module et peut modifier
  // en direct la variable "let RIMES_CONTINUES" définie plus haut —
  // contrairement à un simple export de sa valeur, qui ne ferait que
  // capturer un instantané figé au moment du chargement.
  // _setDicoTest : installe un mini dictionnaire phonétique (mot -> transcription),
  // groupé par les 2 derniers phonèmes comme le vrai ; null pour le retirer.
  const exportLine = `\nfunction _setRimesContinues(v){ RIMES_CONTINUES = v; }\n`
    + `function _setDicoTest(phons){ if (!phons) { DICO_PHONETIQUE = null; PHONETIQUE_MOT = null; return; }`
    + ` DICO_PHONETIQUE = new Map(Object.entries(phons).map(([m, p]) => [m, p.slice(-2)]));`
    + ` PHONETIQUE_MOT = new Map(Object.entries(phons)); }\n`
    + `module.exports = { ${A_EXPORTER.join(', ')}, _setRimesContinues, _setDicoTest };\n`;

  // Dossier temporaire avec sa propre arborescence node_modules/obsidian,
  // pour que le require('obsidian') tout en haut de main.js résolve vers
  // notre mock plutôt que d'échouer (le vrai paquet n'existe pas hors
  // d'Obsidian).
  const dossierTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-tests-'));
  const cheminCopie = path.join(dossierTmp, 'main.js');
  fs.writeFileSync(cheminCopie, source + exportLine);

  const fauxCheminObsidian = path.join(dossierTmp, 'node_modules', 'obsidian', 'index.js');
  fs.mkdirSync(path.dirname(fauxCheminObsidian), { recursive: true });
  fs.copyFileSync(require.resolve('./mock-obsidian'), fauxCheminObsidian);

  const moteur = require(cheminCopie);

  fs.rmSync(dossierTmp, { recursive: true, force: true });
  return moteur;
}

module.exports = { chargeMoteur };
