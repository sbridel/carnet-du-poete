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

const fichiers = fs.readdirSync(dossierSrc).filter(f => f.endsWith('.js')).sort();
let sortie = fichiers.map(f => fs.readFileSync(path.join(dossierSrc, f), 'utf-8')).join('');

if (sortie.split(MARQUEUR).length !== 2) {
  console.error(`Le marqueur ${MARQUEUR} doit apparaître exactement une fois.`);
  process.exit(1);
}
sortie = sortie.replace(MARQUEUR, () => css);

fs.writeFileSync(path.join(racine, 'main.js'), sortie);
fs.writeFileSync(path.join(racine, 'styles.css'), css);
console.log(`main.js assemblé : ${fichiers.length} fichiers, ${sortie.split('\n').length} lignes.`);
