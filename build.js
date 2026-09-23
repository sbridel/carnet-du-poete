#!/usr/bin/env node
// Assemble le plugin : concatène src/*.js dans l'ordre alphabétique (d'où
// les préfixes numériques 00-, 01-…) pour produire main.js, et injecte
// src/styles.css dans la constante CARNET_CSS (marqueur /*@@CARNET_CSS@@*/).
// Copie aussi src/styles.css à la racine : les deux CSS (fichier livré et
// chaîne injectée) viennent désormais d'une seule source, plus de dérive.
// Aucune dépendance. Usage : node build.js
const fs = require('fs');
const path = require('path');

const racine = __dirname;
const dossierSrc = path.join(racine, 'src');
const MARQUEUR = '/*@@CARNET_CSS@@*/';

const css = fs.readFileSync(path.join(dossierSrc, 'styles.css'), 'utf-8');
// CARNET_CSS est un gabarit JS entre accents graves : ces caractères y
// changeraient de sens, on refuse plutôt que de produire un CSS faux.
if (/[`\\]|\$\{/.test(css)) {
  console.error('styles.css contient ` \\ ou ${ — interdit dans CARNET_CSS.');
  process.exit(1);
}

// Liste explicite des fichiers, dans l'ordre d'assemblage. Le build
// s'arrête si l'un manque ou si un .js inconnu apparaît dans src/ : un
// fichier perdu ne passe plus inaperçu. Les trous de numérotation sont
// voulus (place pour insérer sans renuméroter). Ajouter un fichier =
// l'ajouter ici.
const FICHIERS = [
  '00-entete.js',               // require('obsidian'), constantes de base
  '01-moteur-syllabique.js',    // comptage des syllabes, e caduc, hiatus, diérèse
  '02-familles-rimes.js',       // dictionnaire de rimes (~60 familles de sons)
  '03-champs-lexicaux.js',      // champs lexicaux intégrés (onglet Inspiration)
  '04-synonymes.js',            // synonymes & antonymes intégrés
  '05-mots-rares.js',           // corpus de mots rares
  '06-tags-mots-rares.js',      // tags des mots rares
  '07-sources-en-ligne.js',     // Wiktionnaire, CRISCO, CNRTL (cache, homographes), JeuxDeMots, légende
  '08-cnrtl-definitions.js',    // CNRTL pour l'onglet Définitions
  '09-rimessolides.js',         // RimesSolides
  '10-dico-perso.js',           // dictionnaire personnel (dictionnaire-perso.json)
  '11-moteur-phonetique.js',    // moteur de rime phonétique
  '12-moteur-sonore.js',        // analyse sonore (assonances, homéotéleutes…)
  '13-rendu-rimes.js',          // rendu partagé des résultats de rimes
  '14-rendu-inspiration.js',    // rendu partagé des résultats d'inspiration
  '15-rendu-synonymes.js',      // rendu partagé des résultats de synonymes
  '20-vue-debut.js',            // classe CarnetView (constructeur, onOpen, onClose)
  '21-onglet-syllabes.js',      // buildPanelSyllabes(vue, panel)
  '22-onglet-rimes.js',         // buildPanelRimes(vue, panel)
  '23-onglet-inspiration.js',   // buildPanelInspiration(vue, panel)
  '24-onglet-synonymes.js',     // buildPanelSynonymes(vue, panel)
  '25-onglet-guide.js',         // buildPanelGuide(vue, panel)
  '26-onglet-definitions.js',   // buildPanelDefinitions(vue, panel)
  '27-onglet-hasard.js',        // buildPanelHasard(vue, panel)
  '28-onglet-notes.js',         // buildPanelNotes(vue, panel)
  '30-modales.js',              // fenêtres modales
  '40-style.js',                // CARNET_CSS (reçoit src/styles.css)
  '50-plugin-reglages.js',      // classe du plugin + onglet de réglages
];

const presents = fs.readdirSync(dossierSrc).filter(f => f.endsWith('.js'));
const manquants = FICHIERS.filter(f => !presents.includes(f));
const inconnus = presents.filter(f => !FICHIERS.includes(f));
if (manquants.length || inconnus.length) {
  if (manquants.length) console.error('Fichier(s) manquant(s) dans src/ : ' + manquants.join(', '));
  if (inconnus.length) console.error('Fichier(s) inconnu(s) dans src/ (à ajouter à FICHIERS dans build.js) : ' + inconnus.join(', '));
  process.exit(1);
}
const fichiers = FICHIERS;
let sortie = fichiers.map(f => fs.readFileSync(path.join(dossierSrc, f), 'utf-8')).join('');

if (sortie.split(MARQUEUR).length !== 2) {
  console.error(`Le marqueur ${MARQUEUR} doit apparaître exactement une fois.`);
  process.exit(1);
}
sortie = sortie.replace(MARQUEUR, () => css);

fs.writeFileSync(path.join(racine, 'main.js'), sortie);
fs.writeFileSync(path.join(racine, 'styles.css'), css);
console.log(`main.js assemblé : ${fichiers.length} fichiers, ${sortie.split('\n').length} lignes.`);
