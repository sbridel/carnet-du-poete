# Le Carnet du Poète — plugin Obsidian

Compteur de syllabes (versification française) et dictionnaire de rimes, directement dans Obsidian.

## Installation manuelle

1. Repère le dossier de plugins de ton coffre : `<ton-coffre>/.obsidian/plugins/`
   (si le dossier `plugins` n'existe pas encore, crée-le).
2. Copie le dossier entier `carnet-du-poete-plugin` à l'intérieur, puis renomme-le `carnet-du-poete`
   (le dossier doit contenir `manifest.json`, `main.js`, `styles.css`).
3. Dans Obsidian : **Paramètres → Plugins tiers**. Désactive le "Mode sans échec" si besoin,
   puis active **Carnet du Poète** dans la liste.
4. Une plume 🪶 apparaît dans la barre latérale gauche : clique dessus pour ouvrir le carnet.

Aucune compilation n'est nécessaire : le plugin est écrit en JavaScript pur, prêt à l'emploi.

## Ce que fait le plugin

- **Panneau "Syllabes"** : colle ou écris tes vers, chaque ligne est comptée en direct selon
  la règle du *e* caduc (compté seulement s'il n'est ni en fin de vers, ni suivi d'un mot
  commençant par une voyelle). Le mètre (octosyllabe, alexandrin…) est reconnu automatiquement.
  Quand un mot contient un hiatus ambigu (ex. "nation", "poésie", "patience"), le compte
  "avec diérèse" est affiché à côté — à toi de choisir la lecture qui sert ton vers.
- **Panneau "Rimes"** : tape un mot, l'outil reconnaît sa famille sonore parmi une soixantaine
  de familles et propose des rimes masculines/féminines avec leur nombre de syllabes.
- **Brouillon persistant** : ton texte est sauvegardé automatiquement (stocké dans les données
  du plugin, propre à ton coffre).
- **Commandes** (palette de commandes, `Ctrl/Cmd+P`) :
  - *Ouvrir le Carnet du Poète*
  - *Compter les syllabes de la sélection (ou de la ligne courante)* — affiche le résultat
    dans une notification, utilisable directement pendant l'écriture d'une note.
  - *Chercher des rimes pour le mot sélectionné* — ouvre une fenêtre de résultats.

## Étendre le dictionnaire de rimes

Le dictionnaire intégré (~60 familles de sons, ~1000 mots) est un choix éditorial, pas un
lexique phonétique exhaustif — il ne remplace pas un vrai dictionnaire de rimes basé sur des
transcriptions phonétiques complètes (ex. Lexique383, ou l'API du projet open source
[Remède](https://github.com/camarm-dev/remede)). Générer un tel lexique complet demande un
gros fichier de données (des dizaines de Mo) que je n'ai pas pu embarquer directement ici.

Tu peux toutefois ajouter tes propres familles de rimes sans toucher au code : crée un fichier
`dictionnaire-perso.json` dans le dossier du plugin (`.obsidian/plugins/carnet-du-poete/`),
au format :

```json
{
  "familles": [
    {
      "son": "-onk [personnalisé]",
      "exemple": "conque, jonque",
      "terms": ["onque", "onk"],
      "mots": ["conque", "jonque", "adonque"]
    }
  ]
}
```

- `terms` : les terminaisons orthographiques qui déclenchent cette famille (les plus longues
  et spécifiques gagnent en cas de conflit).
- `mots` : la liste de mots proposés comme rimes.

Le fichier est rechargé à chaque démarrage d'Obsidian (ou en désactivant/réactivant le plugin).
Si tu génères un jour un export JSON depuis Remède ou Dico-Rimes dans ce format, tu peux
l'utiliser directement de cette façon pour remplacer/compléter le dictionnaire intégré.

## Limites connues

- Le comptage syllabique est une heuristique orthographique (comme la plupart des outils
  gratuits en ligne), pas une transcription phonétique complète : les cas très irréguliers
  (liaisons complexes, mots rares, latin/grec francisé) peuvent nécessiter un ajustement manuel.
- La détection de diérèse/synérèse repose sur une liste de diphtongues "fixes" (toujours 1
  syllabe) ; tout hiatus vocalique hors de cette liste est signalé comme "diérèse possible",
  à toi d'arbitrer selon le mètre visé.
- Le dictionnaire de rimes est curaté à la main : un mot rare peut ne pas être reconnu.
