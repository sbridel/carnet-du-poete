# Carnet du Poete

![Obsidian](https://img.shields.io/badge/Obsidian-Plugin-purple?logo=obsidian&logoColor=white) ![Téléchargements dernière release](https://img.shields.io/github/downloads/sbridel/carnet-du-poete/latest/total) ![Téléchargements cumulés](https://img.shields.io/github/downloads/sbridel/carnet-du-poete/total) ![Dernière release](https://img.shields.io/github/v/release/sbridel/carnet-du-poete) ![Dernier commit](https://img.shields.io/github/last-commit/sbridel/carnet-du-poete?color=blue) ![Licence](https://img.shields.io/github/license/sbridel/carnet-du-poete)

A companion for writing French verse in Obsidian: syllable counting with full scansion
breakdown, a rhyming dictionary, thematic vocabulary, synonyms/antonyms (including live
lookup from external sources), and a quick reference on French versification — all in one
side panel, no internet connection required for the core features.

## Quick start

1. Install the plugin (see [Manual installation](#manual-installation)) and enable it in
   **Settings → Community plugins**.
2. Click the quill 🪶 icon in the left ribbon to open the notebook.
3. Type or paste a verse in the **Syllables** tab, or a word in the **Rhymes** tab.
4. On first launch, the plugin downloads its ~210,000-word phonetic dictionary (1.9 MB, once
   per dictionary version — see [Base dictionary and personal layer](#base-dictionary-and-personal-layer)).

## Contents

- [Features](#features)
  - [Syllables](#syllables) · [Rhymes](#rhymes) · [Inspiration](#inspiration) ·
    [Synonyms](#synonyms) · [Definitions](#definitions) · [Hasard](#hasard) ·
    [Notes](#notes) · [Guide](#guide) · [Commands](#commands)
- [Manual installation](#manual-installation)
- [Extending your dictionaries with `dictionnaire-perso.json`](#extending-your-dictionaries-with-dictionnaire-persojson)
  - [Base dictionary and personal layer](#base-dictionary-and-personal-layer) ·
    [Where the plugin looks for it](#where-the-plugin-looks-for-it)
  - [Supported formats](#supported-formats): [A](#format-a-custom-rhyme-families) ·
    [B](#format-b-complete-phonetic-rhyme-dictionary) ·
    [C](#format-c-vocabulary-themes-for-the-inspiration-tab) ·
    [D](#format-d-synonyms-and-antonyms) · [E](#format-e-rare-words-for-the-hasard-tab) ·
    [F](#format-f-extended-phonetic-dictionary)
- [Online sources](#online-sources)
- [Data sources & licences](#data-sources--licences)
- [Known limitations](#known-limitations)
- [Changelog](#changelog) — 5 most recent versions · [Full changelog](CHANGELOG.md)

## Features

The plugin opens as a side panel with eight tabs. Everything below works offline, except the
sources you choose to query online (see [Online sources](#online-sources)).

### Syllables

Paste or type your verses: each line is broken down into syllables in real time
(`mon/ta/gne`).

- **Silent *e*** — counted following the classic rule: only when it is neither at the end of a
  line nor followed by a word starting with a vowel.
- **Metre and rhyme gender** — the metre (octosyllable, alexandrine…) is detected
  automatically, and a small **F/M badge** gives the rhyme's gender (feminine if the line ends
  on a silent *e*, masculine otherwise).
- **Synérèse / diérèse** — when a word contains an ambiguous hiatus (*nation*, *poésie*,
  *paupière*), the main line shows the **synérèse** reading (hiatus as one syllable) and a
  second line underneath shows the **diérèse** (hiatus split in two). You choose the reading
  that fits your verse; the "Variante diérèse" checkbox hides that second line.
- **Rhyme scheme detection** — the poem is split into stanzas (blank-line separated); each
  stanza's end-rhymes are labelled A/B/C…, and a quatrain matching AABB, ABAB or ABBA is named
  accordingly. By default each stanza restarts at A; tick "Rimes continues entre strophes" to
  keep the lettering going across the whole poem (a sonnet's tercets as CCD/EED after its
  ABBA/ABBA quatrains).
- **Rhyme colour-coding** — "Couleurs de rimes" gives each line a coloured badge and border
  matching its rhyme group, in the analysis view (not in the raw text box, which a plain
  `<textarea>` cannot colour).
- **Markdown export** — "📋 Exporter en Markdown" copies a table (verse / syllables / rhyme
  gender / rhyme letter / rhyme quality) to your clipboard. Rhyme quality is filled in from the
  second line of each rhyme group, relative to the first. "📄 Copier le brouillon" copies the
  raw draft as-is.
- **Persistent draft** — your text is saved automatically between sessions.

### Rhymes

Type a word and get masculine/feminine rhyme suggestions with their syllable count.

- **Sources** — roughly sixty built-in sound families, overridden by exact matches from a
  complete phonetic dictionary when you have one (see
  [Extending your dictionaries](#extending-your-dictionaries-with-dictionnaire-persojson)). The
  base dictionary downloaded on first launch covers ~210,000 words.
- **Filters** — first letter, syllable count, rhyme quality (*pauvre* / *suffisante* /
  *riche+*, with **Très riche** and **Léonine** as sub-filters of *riche+*), and, since 2.29,
  **grammatical category** (Nom / Verbe / Adjectif / Adverbe / Autres — a word can match
  several, e.g. *abaissé* is both verb and adjective). Quality is estimated from the trailing
  sounds shared with your word, with a syllable-aware check (attack + vowel + coda) separating
  riche / très riche / léonine. The grammatical category comes from Lexique383 and, for words
  Lexique doesn't cover, Morphalou; a local-dictionary word it can't categorize is never hidden
  by this filter, and it doesn't apply at all to RimesSolides/Wiktionnaire results (see below).
- **Visual read** — each group shows a colour-coded quality summary, and every word chip
  carries a matching coloured border and badge, with a tooltip explaining the criterion.
- **Online complements** — tick **RimesSolides** ([rimessolides.com](https://www.rimessolides.com))
  and/or **Wiktionnaire** (the words it files under the same rhyme category — partial coverage,
  handy as a fallback and for rare words). Letter, syllable count and quality filters apply to
  their results too, so you can narrow a 4,000-word RimesSolides list the way the site itself
  can't — the grammatical category filter, though, only applies to the local dictionary, since
  its data comes from Lexique383/Morphalou, not from these online sources. Local and online
  results appear in separate collapsible blocks.
- **No self-rhymes** — the searched word's own inflections (*armée* → *armées*, *armé*,
  *armer*…) are left out, since a word doesn't rhyme with itself.
- **Mode assonance** (off by default) — also shows words sharing the same vowel but differing
  after it (*ombre*/*montre*), in a separate dashed-border section, never mixed with true
  rhymes. It also loosens rhyme-scheme detection and colour-coding in the Syllables tab, which
  share the same check.

### Inspiration

Type a common word (*forest*, *sea*, *night*, *love*, *medieval*…) and get rarer, more
literary or archaic vocabulary on the same theme (*forest* → *canopée*, *sylve*, *futaie*,
*orée*), each with a short gloss.

- **Built-in themes** — about thirty, including one dedicated to old/archaic French.
- **Online sources** — optionally tick CNRTL, Wiktionnaire and/or JeuxDeMots for lexical-field
  material fetched live (collocations, related vocabulary, derived words, sayings,
  characteristics, parts…). Sub-sections are coloured by nature, not by source (see the
  collapsible legend).
- **Build your own fields** — click any word to select it; the selection persists across
  searches, so you can combine several queries (*sea* + *colour*). An action bar then adds the
  whole selection to a **lexical field** (existing, autocompleted, or created on the fly with its
  own trigger keywords) or as **rare words** into `dictionnaire-perso.json`. Known definitions
  are carried over; words from online sources can be defined later in the **Notes** tab.

### Synonyms

Type a word to see synonyms and antonyms.

- **Offline first** — a small built-in dictionary answers instantly, extended by the synonyms of
  your personal dictionary.
- **Online sources** — CNRTL, CRISCO (Université de Caen) and/or Wiktionnaire, each toggled
  independently. A one-click button saves any online result into your personal dictionary for
  offline use; click a chip first to exclude it from that save.
- **Rhyme-aware** — every synonym/antonym that rhymes with your word gets a quality badge, and
  the optional **"Rime avec…"** field keeps only those that also rhyme with a second word —
  handy when another line has already fixed the rhyme.

### Definitions

Look up a rare word before using it.

- A quick one-line definition appears immediately, then up to seven dictionaries (TLFi,
  Wiktionnaire, Académie 9th/8th/4th editions, Littré, DMF for Middle French — only those that
  cover the word) are offered as pills, TLFi first.
- Each source is split into collapsible sections (numbered senses, locutions, historical
  notes…), with pure-definition text highlighted as on the CNRTL site.
- "Ouvrir sur CNRTL ↗" opens the real site for whatever you've typed. Nothing is looked up
  automatically.

### Hasard

One button, one rare or forgotten French word at random (*smaragdin*, *coruscant*,
*pétrichor*, *s'ennuiter*…), with a short gloss and quick links to the Definitions and Rhymes
tabs. A live counter shows how many words match the current filters *before* you draw, and the
draw avoids repeating recent words (a rolling window adapted to the filtered pool).

- **Tags** — every word can carry free-form tags (désuet, savant, poétique…), each with its own
  stable colour, added or removed on the fly: preset buttons (your most-used tags first), a
  free-text field with autocomplete, or several pills at once in the "voir tous les tags" panel.
- **Filtrer par tags** (collapsible, purple) — **OR by default** (at least one checked tag).
  Tick **"Tous les tags cochés (ET)"** for a real intersection (*méral* + *poésie* together).
  **"+ au moins un tag en plus de ceux cochés"** asks for the checked tag(s) *plus* any other
  tag — "this tag, but already categorised further".
- **Exclure des tags** (collapsible, gold) — the NOT logic: removes any word carrying one of the
  checked tags, whatever the include filters. "🚫 Masquer les mots connus" toggles the reserved
  "connu" tag into this set.
- **Shortcuts** — "🚫 Explorer les exclus" (review mode, combinable with tag filters), "☆ Explorer
  « like »" (your "like" tag), "📭 Masquer les mots déjà tagués" (0 tags) and "🏷️ Explorer les
  multi-tagués" (2+ tags).
- **Saving** — "💾 Graver dans dictionnaire-perso.json" (after the tagging controls: tag first,
  commit second) writes the drawn word's tags permanently and clears its session record; a bulk
  "Graver en masse" lives in Settings. Merging never silently drops a note: if two differ and
  neither contains the other, both are kept, joined by "· · ·".
- **Stats** (collapsible) — total words, excluded/untagged counts, "% already seen", a per-tag
  breakdown and every tag *combination* actually present — handy to decide when to import new
  words or spot an over-used tag.
- **Manual entry** — a small form adds a rare word (word, optional gloss, optional tags)
  straight into your personal dictionary. Tags can also be declared directly in the file (see
  [Format E](#format-e-rare-words-for-the-hasard-tab)), e.g. to pre-tag a bulk import.

### Notes

A maintenance tab listing every rare word and lexical-field word still missing a definition
(typically after a bulk import or an online source with no gloss), each with an inline field
to write one — saved to `dictionnaire-perso.json`, and removed from the list once done.

### Guide

A quick reference on French versification: syllable counting, metre names, caesura,
enjambment, stanza names, classic forms (sonnet, rondeau, ballade, villanelle, pantoum,
triolet, virelai, tanka, calligramme, ode, haiku, fable, acrostic, free verse…), and the basics
of rhyme (schemes, quality, masculine/feminine alternation, eye-rhymes vs. ear-rhymes).

### Commands

From the Command palette (`Ctrl/Cmd+P`):

- *Open the Carnet du Poete*
- *Count the syllables in the selection (or the current line)* — result in a notification,
  with rhyme gender and diaeresis alternative.
- *Search for rhymes for the selected word* — opens a pop-up with the same results as the
  Rhymes tab.
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
custom data file. The base dictionary is downloaded by the plugin itself (see the next
section), and your personal `dictionnaire-perso.json` lives in your vault.

## Extending your dictionaries with `dictionnaire-perso.json`

Everything below is optional. Out of the box, the plugin already ships with a curated rhyme
dictionary, ~30 vocabulary themes, and a small synonym list. `dictionnaire-perso.json` lets you
add to (or, for rhymes, largely replace) any of these — all from a single file.

### Base dictionary and personal layer

Since 2.28, the dictionary is split in two files:

- **`dictionnaire-base.json.gz`** — the published dictionary (~210,000 words with phonetics,
  synonyms, Didier Méral's rare words). **The plugin downloads it from this repository's GitHub
  release** into its own folder, on first launch and again only when a new version of the base
  is published. **This is the plugin's only automatic network access**; no data about you or your
  vault is sent. Offline, the plugin keeps the base it already has and retries at the next launch.
  The plugin never writes to this file, so it can be replaced safely.
- **`dictionnaire-perso.json`** — your own additions only (synonyms, rare words, tags, notes,
  vocabulary themes), created in your vault at your first annotation. On loading, it is merged
  over the base: tags add up, your note is shown above the base note, words you never touched receive
  the base's corrections. A new base can therefore never erase your work, and uninstalling the
  plugin doesn't delete it.

**Upgrading from 2.27 or earlier**: an old all-in-one `dictionnaire-perso.json` is converted
automatically at the first launch of 2.28 — the plugin first saves a timestamped copy
(`dictionnaire-perso.sauvegarde-YYYYMMDD-HHMM.json`, next to the new file; you can delete it
once everything looks right), then keeps only what differs from the base. If the old file was in
the plugin's folder, the new one is written at the root of the vault.

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

#### Format A: custom rhyme families

Added to the built-in ones:

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

#### Format B: complete phonetic rhyme dictionary

Exact matches from it take priority over the built-in approximation:

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

#### Format C: vocabulary themes for the Inspiration tab

Added to the built-in ones:

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
ignores accents and simple plurals). A theme is matched against an existing one (built-in or
already loaded) by its name, case/accent-insensitively — if it matches, the two are **merged**
(keywords unioned, words added, empty notes filled in) rather than kept as a separate, invisible
duplicate. If your `dictionnaire-perso.json` predates this behaviour, run **Settings → Carnet du
Poète → "Nettoyer et fusionner dictionnaire-perso.json"** once to merge any existing duplicates
and repair auto-generated keyword lists from before the fix (a multi-word theme used to collapse
into one unsearchable glued string, e.g. "Night & darkness" → `nightdarkness` instead of
`["night", "darkness"]`).

#### Format D: synonyms and antonyms

Added to the built-in ones — this is also exactly what the "💾 Save to my personal dictionary"
button in the Synonyms tab writes for you automatically:

```json
{
  "synonymes": [
    { "mot": "brume", "synonymes": ["brouillard", "vapeur"], "antonymes": ["clarté"] }
  ]
}
```

#### Format E: rare words for the Hasard tab

Added to the built-in pool of rare/forgotten words, with optional tags for filtering the random draw (also addable/removable later from the UI):

```json
{
  "motsRares": [
    { "mot": "estival", "note": "qui appartient à l'été", "tags": ["saison"] }
  ]
}
```
This is also the format for bulk-importing a large word list (thousands of entries at once are
fine performance-wise). Tags added from the UI during a session live temporarily in Obsidian's
plugin data, not in this file — use the "💾 Graver" button (per word, Hasard tab) or "Graver en
masse" (Settings, all at once) to commit them here permanently.

#### Format F: extended phonetic dictionary

A richer variant of format B, informally called "Format C" in the changelog, which can coexist
with format B keys in the same file. Instead of a flat
list of words, each key maps to an object of `word → details`, giving the word's full
phonetic transcription and its own synonyms/antonyms:

```json
{
  "sE": {
    "abaissai": {
      "phonetique": "abEsE",
      "synonymes": [{ "mot": "baisser", "phonetique": "bese" }],
      "antonymes": []
    }
  }
}
```

The phonetic alphabet is SAMPA-like, one character per phoneme (vowels: `a i y u o e E O 2 9
° @ § 5 1` — `E`=[ɛ], `O`=[ɔ], `2`=[ø], `9`=[œ], `°`=[ə], `@ § 5 1`=the four nasal vowels
[ɑ̃ ɔ̃ ɛ̃ œ̃]; consonants use their usual letter, `R`=[ʁ], `S`=[ʃ], `Z`=[ʒ], `N`=[ɲ], and `j`/`w`/`8`
for the semi-vowels [j]/[w]/[ɥ] — this matches the phonetic column exported by
[Lexique383](http://www.lexique.org/)-based tools). `synonymes`/`antonymes` entries can be
plain strings or, better, `{"mot": "...", "phonetique": "..."}` objects — when the phonetic
field is filled in (because that synonym is itself a key elsewhere in the same dictionary),
rhyme quality between it and any other word becomes exact rather than approximated.
Whenever both words being compared (for rhyme quality, or in the Synonyms tab's "Rime avec…"
field) have a known phonetic transcription, the plugin uses it instead of the orthographic
heuristic — see [Known limitations](#known-limitations).

## Online sources

Apart from the one-time download of the base dictionary from GitHub (see
[Base dictionary and personal layer](#base-dictionary-and-personal-layer)), the plugin only goes
online when you tick a source. Several tabs can query external sites live, directly from your device (through Obsidian's
`requestUrl` API, which works the same on desktop and mobile, without browser CORS
restrictions).

| Source | Used in | What it brings |
|---|---|---|
| **CNRTL** (`cnrtl.fr`) | Definitions, Synonyms, Inspiration | The portal's internal JSON API: seven dictionaries (TLFi, Wiktionnaire, Académie 9th/8th/4th, Littré, DMF), synonyms, collocations, word family, sayings. When a word has several entries (*os* adjective vs noun), an "Entrée" pill row lets you pick one — the noun by default. |
| **Wiktionnaire** (`fr.wiktionary.org`) | Synonyms, Inspiration, Rhymes | Its API: "Synonymes"/"Antonymes" sections; related vocabulary, derived words, etymological relatives, locutions and sayings; and the "Rimes en français" categories for rhymes. |
| **CRISCO** (`crisco4.unicaen.fr`) | Synonyms | Université de Caen's *Dictionnaire Électronique des Synonymes*, tens of thousands of curated entries. |
| **JeuxDeMots** (`jdm-api.demo.lirmm.fr`) | Inspiration | The LIRMM's crowd-built, weighted lexical network (associated ideas, characteristics, parts), sorted by weight. A demo endpoint: it may change or go offline without notice. |
| **RimesSolides** (`rimessolides.com`) | Rhymes | A French rhyming dictionary with IPA transcriptions. |

**Nothing is sent by default.** In the Rhymes, Synonyms and Inspiration tabs every online source
is an opt-in checkbox, queried only when ticked (your ticked sources are remembered per tab); the Definitions tab queries CNRTL only when you
search. In the Synonyms and Inspiration tabs, a **"💾 Save to my personal dictionary"** button
writes results into `dictionnaire-perso.json` in one click (creating it at the root of your vault
if needed), so they stay available offline.

**Adding a source** to the Synonyms/Inspiration tabs is a small, self-contained change: a
function that takes a word and returns `{ synonymes: [...], antonymes: [...], trouve: true|false }`,
registered in the `SOURCES_EN_LIGNE` table (`src/07-sources-en-ligne.js`). Open an issue if
you'd like a specific source added.

*Fair use note:* these are third-party sites without a public API contract; the plugin fetches
their normal pages (or, for CNRTL, its internal JSON API) and extracts the relevant section. If a
site changes its layout, that source may temporarily return nothing — the other sources and the
local dictionaries are unaffected. CNRTL's portal redesign did break the plugin's HTML scraping
(see 2.24.3); the Definitions tab now uses their JSON API, more resilient but not a public
contract either.

## Data sources & licences

**The plugin's code is licensed under GPL-3.0** (see `LICENSE`). **The published
dictionary `dictionnaire-base.json.gz` is a separate work**: derived from Lexique383, it is shared under
**CC BY-SA 4.0**.

The base dictionary published with this repository is built from three
sources. Every word carries a `src` code recording where it comes from (explained in the
`_legende` field at the top of the file):

- **L — [Lexique383](http://www.lexique.org/)** (B. New, C. Pallier et al.): phonetic
  transcriptions of ~121,000 word forms. Licence **CC BY-SA 4.0** — the dictionary file, as a
  derived work, is shared under the same licence.
- **M — [Morphalou 3.1](https://www.ortolang.fr/market/lexicons/morphalou)** (ATILF – CNRS,
  Nancy): ~89,000 additional forms (nouns, adjectives, participles, infinitives, adverbs), their
  phonetics converted to Lexique's notation. Licence **LGPL-LR**.
- **R — Didier Méral's inventory of rare, forgotten or obsolete French words**, freely shared by
  its author since 2006 (rare-word list and definitions, tag `méral`).

A `cor` field marks the entries whose source phonetics were corrected: `ai` = future and
simple-past 1st-person *-ai* pronounced [e] rather than [ɛ] (*aimerai*, *chantai*), which Lexique383
transcribes as [ɛ].

## Known limitations

- Syllable counting is a spelling-based heuristic (like most free online tools), not a full
  phonetic transcription: very irregular cases (complex liaisons, rare words, Latinate or
  Greek-derived words) may need manual judgement. One specific ambiguity — whether a word
  ending in "-ent" is a silent 3rd-person-plural verb form (*pleurent*) or a genuinely
  pronounced noun/adjective (*récent*, *argent*, *président*...) — is resolved exactly against
  the extended phonetic dictionary when the word is covered by one, and falls back to a curated
  list of ~70 common exceptions otherwise (not exhaustive).
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
- Rhyme quality (*pauvre* / *suffisante* / *riche* / *très riche* / *léonine*) is exact when
  both compared words have a known transcription in an extended phonetic dictionary (format F
  above) — real phonemes, no guessing. Otherwise it falls back to a spelling-based heuristic
  that handles common mismatches (-tion≈-ssion, doubled letters, i/y semi-consonant,
  ê/è/ei/circumflex, intervocalic "s"→[z], au/eau≈o, œu/oeu≈eu, um≈un, im≈in, infinitive
  -er/-ez≈é...) but isn't infallible, especially on rare or irregular words — and can
  occasionally be *more generous* than the real phonemes would be (a silent final e has, on
  rare occasions, been miscounted as an extra shared son). The très riche/léonine distinction
  (both engines) relies on an approximate syllabification (valid onset clusters, e.g. "pl",
  "tr"); very unusual consonant clusters may still be split incorrectly.
- The online sources depend on third-party websites staying reachable and structurally
  unchanged; treat them as a bonus on top of, not a replacement for, the offline dictionaries.
- Rhyme-pair colour-coding applies to the rendered analysis below the text box, not to the raw
  text box itself, which a plain HTML `<textarea>` cannot style character-by-character.

## Changelog

- **2.29.0** — Grammatical filter in the Rhymes tab.
  - New checkboxes — Nom, Verbe, Adjectif, Adverbe, Autres — narrow rhyme results by
    grammatical category, on top of the existing letter/syllable/quality filters. A word can
    match several categories at once (e.g. *abaissé*, verb and adjective) and passes if any
    checked box fits.
  - The base dictionary now carries this category for every word, from Lexique383 and, where
    Lexique has no entry, Morphalou. A local-dictionary word with no known category is never
    hidden by the filter, and the filter doesn't apply at all to RimesSolides/Wiktionnaire
    results — unlike the letter/syllable/quality filters, which do.
  - Old dictionaries migrating straight from 2.27 or earlier are unaffected: the new field is
    ignored when deciding what counts as a personal change, so it can't inflate your personal
    file.
- **2.28.0** — The dictionary is split into a published base and your personal layer.
  - **`dictionnaire-base.json.gz`** (the ~210,000-word dictionary, 1.9 MB compressed instead of
    13 MB) is **downloaded automatically** from the GitHub release on first launch, and again
    only when a new base is published. Offline, the plugin keeps the base it already has.
  - **`dictionnaire-perso.json` now holds only your own additions** (synonyms, rare words, tags,
    notes, vocabulary themes) and is merged over the base on loading: a new base can no longer
    erase your work, and words you never touched receive its corrections. When you annotate a
    rare word, your note is shown above Didier Méral's (separated by `---`), which stays intact.
  - **Automatic migration** of an old all-in-one file, after a timestamped backup copy.
  - **Safer saving**: if `dictionnaire-perso.json` can't be read back (e.g. a broken edit made
    outside Obsidian), the plugin now refuses to save instead of overwriting it with a nearly
    empty file. The five saving functions share one read/write path.
- **2.27.1** — The Rhymes tab now remembers its ticked online sources (RimesSolides,
  Wiktionnaire) between sessions, like the Synonyms and Inspiration tabs already did; they
  start unticked by default. The README was reorganised for easier reading: a quick start, a
  two-level table of contents, one sub-section per tab, proper headings for the
  `dictionnaire-perso.json` formats (A–F) and a table of online sources — and a few outdated
  statements were corrected along the way.
- **2.27.0** — A bigger, more accurate rhyme dictionary.
  - **The published `dictionnaire-perso.json` grows from ~121,000 to ~210,000 words**: ~89,000
    forms from **Morphalou 3.1** (nouns, adjectives, participles, infinitives, adverbs) join the
    Lexique383 base, their phonetics converted to Lexique's notation (137 doubtful entries left
    out). Every word now carries its **lineage** (`src`: L = Lexique383, M = Morphalou, R = Méral
    rare word), explained in a `_legende` field at the top of the file; see the new "Data sources
    & licences" section.
  - **Future and simple-past *-ai* now rhyme in [e]** (2,289 forms corrected, marked `cor: "ai"`):
    *aimerai* rhymes with *juré*, *jurer*, *jouerez* — no longer with *aimerais*, *jarret* or
    *jetterait* ([ɛ]). Lexique383 transcribes them [ɛ], which classical French prosody rejects.
  - **The rhyme engine now trusts the transcribed vowel over spelling** when both words are in the
    phonetic dictionary: spelling alone cannot tell that *aimerai* ends in [e], and was vetoing
    *aimerai*/*juré* even with a corrected dictionary. Spelling remains the fallback for words
    outside the dictionary.
  - **Smaller file**: the dictionary is written without indentation and without empty
    synonym/antonym lists — 13 MB instead of 17 MB despite 75% more words — and the plugin now
    keeps it compact when it saves to it.
- **2.26.0** — Rhymes tab: a second online source, and the same layout as Synonyms/Inspiration.
  - **Wiktionnaire as a second opt-in online source**, next to RimesSolides. The plugin reads the
    rhyme category the Wiktionnaire assigns to the searched word ("Rimes en français en …",
    keeping the most specific one — /jo/ rather than /o/) and lists that category's members (up
    to 1,000). Coverage is partial — many words have no rhyme category yet, in which case the
    block says so — but it works as a fallback when RimesSolides is down and brings in rare words
    and multi-word phrases. Its results go through exactly the same filters as RimesSolides
    (strict-rhyme check, letter, syllables, quality, assonance mode); both sources now share one
    rendering function.
  - **The searched word's own inflections are no longer offered as rhymes** (searching *armée* no
    longer lists *armées*, *armés*, *armé*, *armer*, *armez*), in the local dictionary and the
    online sources alike — a word doesn't rhyme with itself. It is a heuristic without a
    lemmatizer: the longest inflectional ending leaving a stem of at least 3 letters is removed,
    and "stem + inflectional ending" candidates are dropped; for short words (*né*, *mer*) only
    the -s/-x/-e/-es variants are, so *nez* still rhymes with *né*. Compounds (*réarmer*) are kept
    on purpose: rhyming a word with its compound is discouraged, not forbidden, and prefix
    detection would misfire (*séjour*, *réparer*).
  - **Same layout as the Synonyms and Inspiration tabs**: a "dictionnaire local" collapsible
    block, then one collapsible block per online source (the first open, the others folded). The
    Wiktionnaire block's title shows the rhyme found, e.g. *armée — Wiktionnaire /me/*. The
    "Search rhymes for the selected word" command's pop-up uses the same rendering.
- **2.25.0** — The Inspiration tab's online part was rebuilt around lexical fields instead of
  synonyms (already covered by the Synonyms tab). Three opt-in sources, each in its own
  collapsible block below the local one: **CNRTL** (collocations, word family, sayings with their
  meaning, plus small "Proxémie ↗" and "Fiche CNRTL ↗" links), **Wiktionnaire** (related
  vocabulary, derived words, etymological relatives, phrases, sayings) and the new
  **JeuxDeMots** (associated ideas, characteristics, parts — weighted, sorted by strength,
  technical/foreign/proper-noun entries filtered out). Sub-sections are coloured by nature
  (lexical field, word family, expressions, characteristics, parts) whatever the source, with a
  collapsible colour legend. Sayings show five at a time with a "+N more" button. CNRTL
  homographs are now handled in the Inspiration, Synonyms and Definitions tabs: a word with
  several entries gets an "Entrée" pill row (noun by default), whereas the API used to silently
  return a default entry — *os* came back as the adjective. CNRTL answers are cached per session.
  Fixes: a common word no longer matches an unrelated built-in theme by substring (*chat* used to
  bring up the *Château* theme — partial matching now only covers plural/feminine endings);
  chips no longer show a meaningless rhyme badge when an expression simply ends with the searched
  word itself (*aller à l'os*); CNRTL no longer lists the searched word among its own
  collocations.

Full history of every version: see [CHANGELOG.md](CHANGELOG.md).
