# Carnet du Poete

Syllable counter (French versification) and rhyming dictionary, directly within Obsidian.

## Manual installation

1. Locate your vault’s plugins folder: `<your-vault>/.obsidian/plugins/`
   (if the `plugins` folder does not yet exist, create it).
2. Copy the entire `carnet-du-poete-plugin` folder into it, then rename it to `carnet-du-poete`
   (the folder must contain `manifest.json`, `main.js` and `styles.css`).
3. In Obsidian: **Settings → Third-party plugins**. Disable “Safe Mode” if necessary,
   then enable **Poet’s Notebook** from the list.
4. A quill 🪶 appears in the left-hand sidebar: click on it to open the notebook.

No compilation is required: the plugin is written in pure JavaScript and is ready to use.

## What the plugin does

- **‘Syllables’ panel**: paste or type your verses; each line is counted in real time according to
  the rule for the silent *e* (counted only if it is neither at the end of a line nor followed by a word
  beginning with a vowel). The metre (octosyllable, alexandrine, etc.) is recognised automatically.
  When a word contains an ambiguous hiatus (e.g. ‘nation’, ‘poésie’, ‘patience’), the count
  ‘with diaeresis’ is displayed alongside — it’s up to you to choose the pronunciation that best suits your verse.
- **‘Rhymes’ panel**: type in a word, and the tool identifies its sound family from among around sixty
  families and suggests masculine/feminine rhymes along with their syllable counts.
- **Persistent draft**:Your text is saved automatically (stored in the plugin’s data,
  specific to your vault).
- **Commands** (commands palette, `Ctrl/Cmd+P`):
  - *Open the Poet’s Notebook*
  - *Count the syllables in the selection (or the current line)* — displays the result
    in a notification, which can be used directly whilst writing a note.
  - *Search for rhymes for the selected word* — opens a results window.

## Expanding the rhyme dictionary

The built-in dictionary (~60 sound families, ~1,000 words) is an editorial selection, not an
exhaustive phonetic lexicon — it is no substitute for a proper rhyme dictionary based on
complete phonetic transcriptions (e.g. Lexique383, or the API of the open-source project
[Remède](https://github.com/camarm-dev/remede)). Generating such a comprehensive lexicon requires a
large data file (tens of MB) which I have not been able to embed directly here.

However, you can add your own rhyme families without touching the code: create a file
`personal-dictionary.json` in the plugin folder (`.obsidian/plugins/carnet-du-poete/`),
in the following format:

```json
{
  ‘families’: [
    {
      ‘son’: ‘-onk [custom]’,
      ‘example’: ‘conque, jonque’,
      ‘terms’: [“onque”, ‘onk’],
      ‘words’: [‘conque’, “jonque”, ‘adonque’]
    }
  ]
}
```

- `terms`: the spelling endings that trigger this family (the longest
  and most specific ones take precedence in the event of a conflict).
- `words`: the list of words suggested as rhymes.

The file is reloaded every time Obsidian starts up (or when you disable and re-enable the plugin).
If you ever generate a JSON export from Remède or Dico-Rimes in this format, you can
use it directly in this way to replace or supplement the built-in dictionary.

## Known limitations

- Syllable counting is a spelling heuristic (like most
  free online tools), not a complete phonetic transcription: highly irregular cases
  (complex liaisons, rare words, Latin/Greek words adapted to French) may require manual adjustment.
- The detection of dieresis/syneresis is based on a list of ‘fixed’ diphthongs (always 1
  syllable); any vowel hiatus not on this list is flagged as ‘possible dieresis’,
  and it is up to you to decide based on the intended metre.
- The rhyming dictionary is curated manually: a rare word may not be recognised.
