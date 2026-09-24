#!/usr/bin/env node
// Fait tourner tous les tests du moteur (rimes + sonorités) contre le
// vrai main.js du plugin. Usage : node tests/run.js
// Code de sortie 0 si tout passe, 1 sinon — utilisable dans un script de
// vérification avant release.

const { chargeMoteur } = require('./load-engine');
const { resume } = require('./framework');

console.log('Chargement du moteur (main.js)...\n');
const moteur = chargeMoteur();

require('./test-rimes')(moteur);
require('./test-sonorites')(moteur);
require('./test-dico-base')(moteur);

resume();
