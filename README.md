# Carnet du Poete

A companion for writing French verse in Obsidian: syllable counting with full scansion
breakdown, a rhyming dictionary, thematic vocabulary, synonyms/antonyms (including live
lookup from external sources), and a quick reference on French versification — all in one
side panel, no internet connection required for the core features.

## Features

- **Syllables** — paste or type your verses; each line is broken down into syllables in
  real time (`mon/ta/gne`), following the classic rule for the silent *e* (counted only when
  it is neither at the end of a line nor followed by a word starting with a vowel). The metre
  (octosyllable, alexandrine, etc.) and the **rhyme's gender** (a small F/M badge — feminine if
  the line ends on a silent *e*, masculine otherwise) are detected automatically. When a word
  contains an ambiguous hiatus (e.g. *nation*, *poésie*, *paupière*), a second line underneath
  shows the full breakdown **with diaeresis** — you decide which reading fits your verse.
- **Rhymes** — type a word and get masculine/feminine rhyme suggestions with their syllable
  count, drawn from roughly sixty built-in sound families. If you supply a complete phonetic
  rhyme dictionary (see below), exact matches from it take priority over the built-in
  approximation.
- **Inspiration** — type a common word (*forest*, *sea*, *night*, *love*, *medieval*...) and get
  rarer, more literary or archaic vocabulary on the same theme (e.g. *forest* → canopy-related
  words such as *canopée*, *sylve*, *futaie*, *orée*), each with a short gloss. About thirty
  themes are built in, including one dedicated to old/archaic French vocabulary.
- **Synonyms** — type a word to see synonyms and antonyms. A small built-in dictionary answers
  instantly offline; you can additionally enable live lookups from **Wiktionnaire** and/or
  **CRISCO** (Université de Caen's synonym dictionary), toggled independently with checkboxes,
  with a one-click button to save any online result into your personal dictionary for future
  offline use. See [Online synonym sources](#online-synonym-sources) below.
- **Guide** — a quick reference: how French syllable counting works, a handful of classic poem
  forms (sonnet, rondeau, ballade, villanelle, pantoum, ode, haiku, fable, acrostic...), and the
  basics of rhyme (rhyme schemes, rhyme quality, masculine/feminine alternation).
- **Persistent draft** — your syllable-counter text is saved automatically between sessions.
- **Commands** (Command palette, `Ctrl/Cmd+P`):
  - *Open the Carnet du Poete*
  - *Count the syllables in the selection (or the current line)* — shows the result, including
    rhyme gender and diaeresis alternative, in a notification.
  - *Search for rhymes for the selected word*
  - *Search for inspiration (vocabulary) for the selected word*
  - *Reload the personal dictionary (dictionnaire-perso.json)*

## Manual installation

1. Locate your vault's plugin folder: `<your-vault>/.obsidian/plugins/`
   (create the `plugins` folder if it doesn't exist yet).
2. Copy the entire plugin folder into it, then make sure it is named `carnet-du-poete`
   (it must contain `manifest.json`, `main.js` and `styles.css`).
3. In Obsidian: **Settings → Community plugins**. Turn off Restricted Mode if needed, then
   enable **Carnet du Poete** in the list.
4. A quill 🪶 icon appears in the left ribbon — click it to open the notebook.

No build step is required: the plugin is plain JavaScript, ready to run.

If you install via [BRAT](https://github.com/TfTHacker/obsidian42-brat), note that BRAT only
downloads `main.js`, `manifest.json` and `styles.css` from the repository — it never copies a
custom data file such as `dictionnaire-perso.json`. See the next section for where to put it
instead.

## Extending your dictionaries with `dictionnaire-perso.json`

Everything below is optional. Out of the box, the plugin already ships with a curated rhyme
dictionary, ~30 vocabulary themes, and a small synonym list. `dictionnaire-perso.json` lets you
add to (or, for rhymes, largely replace) any of these — all from a single file.

### Where the plugin looks for it

The plugin searches, in order, and stops at the first match:

1. The plugin's own folder (`.obsidian/plugins/carnet-du-poete/`).
2. The root of `.obsidian`.
3. The root of the vault itself.
4. Anywhere else in the vault's normal content (any note folder) — the simplest option on
   mobile or with BRAT: just drop the file into your vault like any other file.
5. Any subfolder of `.obsidian`, searched recursively (up to 5 levels deep), in case it ended
   up somewhere unexpected.

You can reload it at any time without restarting Obsidian via the command
**"Reload the personal dictionary (dictionnaire-perso.json)"** — a notification will confirm
what was found, or tell you it searched everywhere and found nothing.

### Supported formats

All of the following top-level keys are optional and can be combined freely in the same file.

**A) Custom rhyme families** (added to the built-in ones):

```json
{
  "familles": [
    {
      "son": "-onk [custom]",
      "exemple": "conque, jonque",
      "terms": ["onque", "onk"],
      "mots": ["conque", "jonque", "adonque"]
    }
  ]
}
```
`terms` are the spelling endings that trigger this family (longer, more specific endings win
ties). `mots` is the list of words offered as rhymes.

**B) A complete phonetic rhyme dictionary** (exact matches from it take priority over the
built-in approximation):

```json
{
  "ka": ["avocat", "cas", "syndicat", "..."],
  "sa": ["cassa", "dansa", "pensa", "..."]
}
```
A flat object where each key is a phonetic rhyme identifier (its exact form doesn't matter, it
is never shown) and the value is the list of words that truly rhyme, grouped by actual French
pronunciation rather than spelling. This is the export format used by projects such as
[Remède](https://github.com/camarm-dev/remede); if you ever generate one (for instance from a
phonetic lexicon such as Lexique383), drop it in as-is. Very large groups (some verb-conjugation
endings exceed a thousand words) are shown 100 at a time with a button to reveal the rest.

**C) Custom vocabulary themes for the Inspiration tab** (added to the built-in ones):

```json
{
  "champsLexicaux": [
    {
      "theme": "My custom theme",
      "motsClefs": ["trigger1", "trigger2"],
      "mots": [
        { "mot": "rareword", "note": "short gloss or nuance" }
      ]
    }
  ]
}
```
`motsClefs` are the everyday words that trigger this theme in the Inspiration tab (matching
ignores accents and simple plurals).

**D) Custom synonyms/antonyms** (added to the built-in ones — this is also exactly what the
"💾 Save to my personal dictionary" button in the Synonyms tab writes for you automatically):

```json
{
  "synonymes": [
    { "mot": "brume", "synonymes": ["brouillard", "vapeur"], "antonymes": ["clarté"] }
  ]
}
```

## Online synonym sources

The Synonyms tab can query external sites live, directly from your device (the plugin uses
Obsidian's `requestUrl` API, which works the same way on desktop and mobile, without running
into browser CORS restrictions). Two sources are built in:

- **Wiktionnaire** (`fr.wiktionary.org`) — the French Wiktionary's own API, parsed for its
  "Synonymes"/"Antonymes" sections.
- **CRISCO** (`crisco4.unicaen.fr`) — Université de Caen's *Dictionnaire Électronique des
  Synonymes*, an academic resource with tens of thousands of curated entries.

Both are opt-in via checkboxes above the search box (your choice is remembered). Neither is
queried unless you tick its box and press *Search* — nothing is sent anywhere by default. When
a source returns results, a **"💾 Save to my personal dictionary"** button lets you write them
into `dictionnaire-perso.json` in one click (creating the file at the root of your vault if none
exists yet), so the word becomes available offline from then on.

Adding a third source later is a small, self-contained change: it needs a function that takes a
word and returns `{ synonymes: [...], antonymes: [...], trouve: true|false }`, registered in the
`SOURCES_EN_LIGNE` table near the top of `main.js`. Open an issue or ask if you'd like a specific
source added.

*Fair use note:* these are third-party sites without a public API contract; the plugin fetches
their normal pages and extracts the relevant section. If a site changes its layout, that source
may temporarily return no results — the other source(s) and the local dictionary are unaffected.

## Known limitations

- Syllable counting is a spelling-based heuristic (like most free online tools), not a full
  phonetic transcription: very irregular cases (complex liaisons, rare words, Latinate or
  Greek-derived words) may need manual judgement.
- Whether a silent *e* elides before a word starting with a vowel follows the classic
  versification rule, but some other online tools don't apply this consistently — expect
  occasional differences with them, especially on free verse. The full syllable breakdown is
  shown precisely so you can check the choice yourself, line by line.
- Diaeresis/synaeresis detection relies on a list of "fixed" diphthongs (always 1 syllable);
  any vowel hiatus outside that list is flagged as a possible diaeresis, and the alternate
  breakdown is shown — the choice of reading is yours.
- The built-in rhyme, vocabulary and synonym dictionaries are hand-curated, not exhaustive; a
  rare word may not be recognised. The optional complete phonetic rhyme dictionary (format B
  above) largely closes that gap for rhymes specifically.
- The online synonym sources depend on third-party websites staying reachable and structurally
  unchanged; treat them as a bonus on top of, not a replacement for, the offline dictionaries.

## Changelog

- **2.0.0** — Synonyms tab can now query Wiktionnaire and/or CRISCO live (opt-in, selectable),
  with a one-click save into `dictionnaire-perso.json`; new `synonymes` custom-dictionary format
  usable independently or alongside rhyme families/phonetic dictionaries/vocabulary themes;
  English documentation rewrite.
- **1.9.0** — Personal-dictionary search widened to cover the root of `.obsidian`, the root of
  the vault, and a recursive scan of `.obsidian` — fixing cases where the file wasn't found on
  Android even when placed inside `.obsidian`.
- **1.8.0** — Full syllable-by-syllable breakdown displayed like a scansion tool
  (`mon/ta/gne`), with a second line showing the diaeresis variant when relevant; fixed rhyme
  gender detection for words whose silent *e* follows a vowel (*vie*, *écartées*, *joie* were
  previously misclassified as masculine); new Synonyms and Guide tabs.
- **1.7.0** — New Inspiration tab (thematic vocabulary), including a theme dedicated to
  archaic/medieval French, extensible via `champsLexicaux`.
- **1.1.6** — Rhyme gender badge (F/M) added to every line in the Syllables tab.
- **1.1.5** — Fixed intervocalic "y" (*rayon*, *crayon*, *voyage*...), which was wrongly merged
  with neighbouring vowels instead of separating two syllables; fixed punctuation preceded by a
  French typographic space (e.g. before ";") being wrongly treated as a following word.
- **1.1.3* — "ç" was no longer incorrectly stripped from analysed text (was breaking words like
  *leçon*, *français*, *commença*).
- **1.1.2* — Nasal vowels (*temps*, *enfant*, *m'attends* at the end of a line) were no longer
  wrongly counted as a droppable silent *e*.
