// Mock minimal — juste assez pour que main.js se charge sans erreur en
// dehors d'Obsidian. Aucune de ces classes n'est réellement utilisée par
// les fonctions qu'on teste (moteur de rimes, sonorités) : main.js les
// référence seulement dans les classes de vue/plugin, jamais dans les
// fonctions pures qu'on exporte pour les tests.
class Plugin {}
class ItemView {}
class Modal {}
// Notice garde un journal des messages affichés (tests des bilans de chargement, #1).
class Notice { constructor(m){ Notice.journal.push(String(m)); } }
Notice.journal = [];
class PluginSettingTab {}
class Setting {}
function requestUrl() { return Promise.resolve({ json: {} }); }

module.exports = { Plugin, ItemView, Modal, Notice, requestUrl, PluginSettingTab, Setting };
