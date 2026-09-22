# Carnet du Poete

![Obsidian](https://img.shields.io/badge/Obsidian-Plugin-purple?logo=obsidian&logoColor=white) ![Téléchargements dernière release](https://img.shields.io/github/downloads/sbridel/carnet-du-poete/latest/total) ![Téléchargements cumulés](https://img.shields.io/github/downloads/sbridel/carnet-du-poete/total) ![Dernière release](https://img.shields.io/github/v/release/sbridel/carnet-du-poete) ![Dernier commit](https://img.shields.io/github/last-commit/sbridel/carnet-du-poete?color=blue) ![Licence](https://img.shields.io/github/license/sbridel/carnet-du-poete)

A companion for writing French verse in Obsidian: syllable counting with full scansion
breakdown, a rhyming dictionary, thematic vocabulary, synonyms/antonyms (including live
lookup from external sources), and a quick reference on French versification — all in one
side panel, no internet connection required for the core features.

## Sommaire

- [Features](#features)
- [Manual installation](#manual-installation)
- [Extending your dictionaries with `dictionnaire-perso.json`](#extending-your-dictionaries-with-dictionnaire-personjson)
- [Online sources](#online-sources)
- [Known limitations](#known-limitations)
- [Changelog](#changelog) — 5 most recent versions
- [Full changelog](CHANGELOG.md) — complete version history (separate file)

## Features

- **Syllables** — paste or type your verses; each line is broken down into syllables in
  real time (`mon/ta/gne`), following the classic rule for the silent *e* (counted only when
  it is neither at the end of a line nor followed by a word starting with a vowel). The metre
  (octosyllable, alexandrine, etc.) and the **rhyme's gender** (a small F/M badge — feminine if
  the line ends on a silent *e*, masculine otherwise) are detected automatically. When a word
  contains an ambiguous hiatus (e.g. *nation*, *poésie*, *paupière*), the main line is labelled
  **synérèse** (the default reading, hiatus read as one syllable) and a second line underneath,
  labelled **diérèse**, shows the full breakdown with that hiatus split into two syllables — you
  decide which reading fits your verse. This second line can be toggled on/off with the
  "Variante diérèse" checkbox if you'd rather keep the view lighter.
  - **Rhyme scheme detection** — the poem is split into stanzas (blank-line separated); each
    stanza's end-rhymes are grouped and labelled A/B/C..., and a 4-line stanza matching AABB,
    ABAB or ABBA is named accordingly, shown just below the syllable counts. By default each
    stanza restarts its own lettering from A; toggle "Rimes continues entre strophes" to keep
    the lettering going across the whole poem instead (e.g. a sonnet's two tercets labelled
    CCD/EED following on from the quatrains' ABBA/ABBA, rather than restarting at AAB/AAB).
  - **Rhyme colour-coding** — toggle "Couleurs de rimes" to give each line a coloured badge and
    border matching its rhyme group, making rhyme pairs easy to spot at a glance in the analysis
    view. (This applies to the rendered analysis, not the raw text box itself — colouring live
    text inside a plain editable text area isn't something a text `<textarea>` supports.)
  - **Markdown export** — the "📋 Exporter en Markdown" button copies a table (verse / syllable
    count / rhyme gender / rhyme letter / rhyme quality) to your clipboard, ready to paste into
    any note. Rhyme quality is only filled in for the second (and later) line of each rhyme
    group, relative to the first line that introduced it. A separate "📄 Copier le brouillon"
    button copies the raw draft text as-is, without the table formatting.
- **Rhymes** — type a word and get masculine/feminine rhyme suggestions with their syllable
  count, drawn from roughly sixty built-in sound families. If you supply a complete phonetic
  rhyme dictionary (see below), exact matches from it take priority over the built-in
  approximation. Results can be narrowed down with filters (first letter, syllable count, and
  rhyme quality — *pauvre* / *suffisante* / *riche+*, with **Très riche** and **Léonine** as
  optional sub-filters that narrow the "riche+" bucket further). Quality is estimated from how
  many trailing sounds the candidate shares with your word, with a syllable-aware check (attack
  + vowel + coda, using French syllabification rules) distinguishing riche / très riche / léonine
  once the basic count reaches "riche". Each group shows a colour-coded quality summary (counts
  per quality) and every word chip carries a matching coloured border and badge, with a tooltip
  explaining the criterion, for a quick visual read of the list. You can also tick
  **RimesSolides** to pull in additional live results from
  [rimessolides.com](https://www.rimessolides.com) — and every filter above (letter, syllable
  count, quality) applies to those results too, on top of the site's own pagination, so you can
  narrow down a 4000+-word RimesSolides list the same way you'd narrow the local dictionary,
  something the site's own interface doesn't offer. A global **"Mode assonance"**
  toggle (off by default — strict rhymes only) additionally surfaces words that share the same
  vowel but differ in what follows it (e.g. *ombre*/*montre* — same nasal vowel, but "b" vs "t"
  right before the final "r"), shown in a clearly separate, dashed-border section so they're
  never mixed in with true rhymes. This mode also loosens the rhyme-scheme detection and
  colour-coding in the Syllables tab, since both features share the same underlying check.
- **Inspiration** — type a common word (*forest*, *sea*, *night*, *love*, *medieval*...) and get
  rarer, more literary or archaic vocabulary on the same theme (e.g. *forest* → canopy-related
  words such as *canopée*, *sylve*, *futaie*, *orée*), each with a short gloss. About thirty
  themes are built in, including one dedicated to old/archaic French vocabulary. You can
  optionally tick CNRTL, Wiktionnaire and/or JeuxDeMots to pull in lexical-field material fetched
  live (collocations, related vocabulary, derived words, sayings, characteristics, parts…), each
  sub-section coloured by its nature rather than its source (see the collapsible legend). **Click any word** (from a recognised theme or an online source) to
  select it — the selection persists across successive searches, so you can build one field from
  several related queries (e.g. *sea* + *colour*). Once at least one word is selected, an action
  bar lets you add the whole selection in one go, either to a **lexical field** (existing —
  autocompleted — or a brand-new one, created on the fly with its own trigger keywords) or
  directly as **rare word(s)** into `dictionnaire-perso.json`. Definitions already known for a
  selected word (from a recognised theme) are carried over automatically; words coming from an
  online source have no definition and can be completed afterwards from the **Notes** tab.
- **Synonyms** — type a word to see synonyms and antonyms. A small built-in dictionary answers
  instantly offline, extended by any Format C entries in your personal dictionary; you can
  additionally enable live lookups from **Wiktionnaire** and/or **CRISCO** (Université de
  Caen's synonym dictionary), toggled independently with checkboxes, with a one-click button
  to save any online result into your personal dictionary for future offline use — click any
  chip first to exclude it from that save if a source returned a bad match. Every
  synonym/antonym that genuinely rhymes with your search word gets a rhyme-quality badge, and
  an optional **"Rime avec…"** field narrows the list down to only the ones that also rhyme
  with a second word of your choice — handy when a rhyme is already fixed by another line.
  See [Online sources](#online-sources) below.
- **Definitions** — look up a rare word before using it: a quick one-line definition is shown
  immediately, then pick from up to seven dictionary sources (TLFi, Wiktionnaire, Académie
  9th/8th/4th editions, Littré, DMF for Middle French — only the ones that actually cover the
  word are offered) via a row of pills, TLFi selected by default. Each source is broken down into
  collapsible sections (numbered senses, locutions, historical notes...) instead of one long
  block of text, with pure-definition text highlighted the same way the CNRTL site itself does.
  A quick "Ouvrir sur CNRTL ↗" link opens the real site directly for whatever you've typed, no
  lookup required. On-demand only — nothing is looked up automatically.
- **Hasard** — one button, one rare or forgotten French word at random (*smaragdin*,
  *coruscant*, *pétrichor*, *s'ennuiter*...), with a short gloss and quick links to look it up
  in the Definitions or Rhymes tab. A live counter above the button shows how many words match
  the current filters *before* you draw. Every word can carry free-form **tags** (désuet,
  savant, poétique...), each with its own stable colour (reused everywhere the tag appears),
  addable/removable on the fly from the drawn word — via dynamic preset buttons (your most-used
  tags first) or a free-text field with autocomplete (or click straight through several pills in
  the "voir tous les tags" panel, no need to re-type one at a time).
  - **Filtrer par tags** (collapsible, purple) — checking several tags is **OR by default**
    (any word carrying *at least one* of them): fine on its own, but if one tag has a much
    bigger volume than the others (e.g. after a bulk import), combining it with a smaller one
    in OR mostly just gives you the big one back. Tick **"Tous les tags cochés (ET)"** to
    require *every* checked tag at once instead — that's how you get a real intersection
    (e.g. "méral" + "poésie" together, not either). A further **"+ au moins un tag en plus de
    ceux cochés"** toggle asks for one checked tag (or an ET combination) *plus* any other tag
    on top — handy for "this tag, but already categorised further", without hardcoding which
    tag or which other one.
  - **Exclure des tags** (collapsible, gold) — the mirror, NOT/NOR logic: subtracts any word
    carrying at least one of the checked tags, regardless of the include filters above. A
    compact "🚫 Masquer les mots connus" shortcut lives here (toggles the reserved "connu" tag
    into this same exclusion set).
  - Always-visible shortcuts: "🚫 Explorer les exclus" (review mode: draws *only* from words
    you've excluded — combines properly with the tag filters above now, e.g. review just the
    excluded words also tagged "méral"), "☆ Explorer « like »" (fixed to your "like" tag, not
    "whichever tag is most common" — a bulk import can otherwise dwarf your own tags in
    frequency), "📭 Masquer les mots déjà tagués" (0 tags) and its mirror "🏷️ Explorer les
    multi-tagués" (2+ tags at once).
  - A "💾 Graver dans dictionnaire-perso.json" button (now placed *after* the tagging controls,
    not before — tag first, commit second) writes the currently-drawn word's tags permanently
    into your personal dictionary and clears its temporary session record (a bulk "Graver en
    masse" version lives in Settings). Merging (via that button, or the "🧹 Nettoyer et
    fusionner" Settings action) never silently drops one note in favour of another anymore: if
    the two differ and neither contains the other, both are kept, joined by a visible "· · ·"
    separator.
  - A collapsible stats panel at the bottom shows total word count, excluded/untagged counts,
    "% already seen", a per-tag breakdown, and every tag *combination* actually observed in
    your dictionary (not all theoretically possible combinations, just the ones that exist) —
    handy for deciding when it's time to import a fresh batch of words, or spotting an
    over-used tag. Tags can also be declared directly in `dictionnaire-perso.json` (see below)
    — useful for pre-tagging a bulk import — and merge with tags added from the UI. The draw
    itself avoids repeating recently-shown words (a rolling window that adapts to the size of
    the current filtered pool, so a narrow filter never gets stuck empty). A small form lets you
    add a rare word manually (word, optional gloss, optional tags) straight into your personal
    dictionary without going through an external source.
- **Notes** — a maintenance tab: lists every rare word and every lexical-field word that's
  missing a definition (typically after a bulk import, or a word added from an online source
  with no gloss available), each with an inline text field to write one by hand — saved directly
  to `dictionnaire-perso.json` on save, disappearing from the list once done.
- **Guide** — a quick reference: how French syllable counting works, metre names, caesura,
  enjambment, stanza names, a handful of classic poem forms (sonnet, rondeau, ballade,
  villanelle, pantoum, triolet, virelai, tanka, calligramme, ode, haiku, fable, acrostic, free
  verse...), and the basics of rhyme (rhyme schemes, rhyme quality, masculine/feminine
  alternation, eye-rhymes vs. ear-rhymes).
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
ignores accents and simple plurals). A theme is matched against an existing one (built-in or
already loaded) by its name, case/accent-insensitively — if it matches, the two are **merged**
(keywords unioned, words added, empty notes filled in) rather than kept as a separate, invisible
duplicate. If your `dictionnaire-perso.json` predates this behaviour, run **Settings → Carnet du
Poète → "Nettoyer et fusionner dictionnaire-perso.json"** once to merge any existing duplicates
and repair auto-generated keyword lists from before the fix (a multi-word theme used to collapse
into one unsearchable glued string, e.g. "Night & darkness" → `nightdarkness` instead of
`["night", "darkness"]`).

**D) Custom synonyms/antonyms** (added to the built-in ones — this is also exactly what the
"💾 Save to my personal dictionary" button in the Synonyms tab writes for you automatically):

```json
{
  "synonymes": [
    { "mot": "brume", "synonymes": ["brouillard", "vapeur"], "antonymes": ["clarté"] }
  ]
}
```

**E) Custom words for the Hasard tab** (added to the built-in pool of rare/forgotten words),
with optional tags for filtering the random draw (also addable/removable later from the UI):

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

**F) Extended phonetic dictionary** (a richer variant of format B, informally called "Format
C" in the changelog — can coexist with format B keys in the same file): instead of a flat
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

Several tabs can query external sites live, directly from your device (the plugin uses
Obsidian's `requestUrl` API, which works the same way on desktop and mobile, without running
into browser CORS restrictions). Five sources are built in:

- **Wiktionnaire** (`fr.wiktionary.org`) — the French Wiktionary's own API. Its
  "Synonymes"/"Antonymes" sections feed the Synonyms tab; its "Vocabulaire apparenté par le
  sens", "Dérivés", "Apparentés étymologiques", "Locutions" and "Proverbes" sections feed the
  Inspiration tab.
- **CRISCO** (`crisco4.unicaen.fr`) — Université de Caen's *Dictionnaire Électronique des
  Synonymes*, an academic resource with tens of thousands of curated entries. Used in the
  Synonyms tab.
- **JeuxDeMots** (`jdm-api.demo.lirmm.fr`) — the LIRMM's crowd-built, weighted French lexical
  network, through its public demo API. Used in the Inspiration tab (associated ideas,
  characteristics, parts), sorted by association weight. Being a demo endpoint, it may change
  or go offline without notice.
- **RimesSolides** (`rimessolides.com`) — a French rhyming dictionary with IPA transcriptions.
  Used in the Rhymes tab.
- **CNRTL** (`cnrtl.fr`) — the CNRTL portal's own internal JSON API, covering seven dictionaries
  at once (TLFi, Wiktionnaire, Académie 9th/8th/4th editions, Littré, DMF), used in the
  Definitions tab, and as an opt-in source in the Synonyms and Inspiration tabs. When a word has
  several entries (e.g. *os* adjective vs noun), an "Entrée" pill row lets you pick one — the
  noun by default. Unlike the other three, this one has no opt-in checkbox: it is only ever
  queried when you explicitly search in the Definitions tab.

The Wiktionnaire/CRISCO/RimesSolides checkboxes are opt-in (your choice is remembered per tab).
Nothing is queried unless you tick a box and press *Search* — nothing is sent anywhere by
default. In the Synonyms and Inspiration tabs, when a source returns results, a **"💾 Save to my
personal dictionary"** button lets you write them into `dictionnaire-perso.json` in one click
(creating the file at the root of your vault if none exists yet), so the word becomes available
offline from then on.

Adding another source to the Synonyms/Inspiration tabs is a small, self-contained change: it
needs a function that takes a word and returns `{ synonymes: [...], antonymes: [...], trouve:
true|false }`, registered in the `SOURCES_EN_LIGNE` table near the top of `main.js`. Open an
issue or ask if you'd like a specific source added.

*Fair use note:* these are third-party sites without a public API contract; the plugin fetches
their normal pages (or, for CNRTL, its own internal JSON API) and extracts the relevant section.
If a site changes its layout, that source may temporarily return no results — the other
source(s) and the local dictionaries are unaffected. CNRTL's announced portal redesign did
happen on schedule and broke the plugin's HTML scraping entirely (see 2.24.3): the Definitions
tab now talks to their JSON API instead, which should be more resilient to further front-end
changes going forward, but isn't a public contract either.

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
- **2.24.4** — CNRTL now also powers the Synonyms tab: it appears as a third online source
  alongside Wiktionnaire and CRISCO, contributing a relevance score (0-100) per synonym/antonym
  that the other two don't provide. Results are sorted by relevance, with a "Seuil de
  pertinence" pill row (Tout / 30% / 60% / 85%) to cut off the long low-relevance tail without a
  new network request per click — everything is refiltered locally from data already fetched.
  Very relevant matches (≥70) render in bold. The Synonyms tab itself got a broader rework: the
  local dictionary and each online source now sit in their own collapsible block (local
  dictionary open by default; when several online sources are active, only the highest-priority
  one — CNRTL, then CRISCO, then Wiktionnaire — opens automatically, the rest collapsed), long
  lists cap at 15 entries with a "+N more" reveal button, and synonym/antonym categories are
  distinguished at the block level (title colour + left border) rather than on every individual
  chip, which was colliding visually with the existing rhyme-quality colour badge on the same
  chip. That rhyme-quality signal, when present, now colours a chip's entire border instead of
  just its left edge, making an actual rhyme match easier to spot at a glance. All toggle pills
  across the plugin (quality filters, RimesSolides, online sources, this new relevance filter)
  render as solid-filled pills when active instead of showing a checkbox glyph next to a
  colour-outlined pill.
- **2.24.3** — CNRTL definitions were silently broken: the portal's announced September 1, 2026
  redesign (flagged as a risk in earlier notes) turned out to be a full rewrite to client-side
  rendering — the `/definition/{word}` page the plugin was scraping no longer contains any
  article text in its raw HTML at all, just an empty shell, so every lookup silently returned
  "not found" regardless of the word (caught by Alucard: "aucun mot n'est trouvé"). Fixed by
  switching to CNRTL's own internal JSON API (`/api/word/{word}/`), found by inspecting the
  site's network requests — far more reliable than HTML scraping, and considerably richer: the
  Définitions tab now exposes all seven dictionary sources this API bundles per word (TLFi,
  Wiktionnaire, Académie 9th/8th/4th editions, Littré, DMF/Middle French — only the ones actually
  present for a given word are shown), selectable via pills with TLFi selected by default. Each
  source is broken down into its own collapsible sections (numbered senses, locutions, historical
  notes...) instead of one wall of text — parsed generically from the HTML structure shared
  across all seven sources (numbered sense lists, annex sections, named locutions), so nothing is
  filtered or hard-coded per source; whatever doesn't match a recognised pattern still gets kept,
  in a catch-all "Complément" block, rather than silently dropped. Pure-definition spans
  (`s-definition` in CNRTL's own markup) are now visually highlighted, matching the site's own
  convention. A quick "Ouvrir sur CNRTL ↗" link next to the search box opens the real site
  directly for the currently typed word, with no lookup of our own involved. The previous
  text-based extraction (regex hunting for "Étymol. et Hist.", stripping an announcement banner,
  guessing where an article starts from "MOT," patterns...) is gone entirely — none of it is
  needed against structured JSON.
- **2.24.2** — Verb forms ending in a silent "-ent" (3rd person plural: "ils dorment", "elles
  s'enivrent") weren't recognised by the rhyme engine at all — found via a poem where "livres"
  and "enivrent" (same real sound, [ivʁ]) failed to rhyme. The function that already detects
  this silent ending, `finMuetteEnEnt` (with its exceptions list `EXCEPTIONS_ENT_PRONONCE` for
  words where "-ent" really is pronounced: moment, président, différent...), existed but was
  only ever used for syllable counting, never consulted by the rhyme engine. Now reused in two
  places: `preparerMotRime` (strips the silent "-ent" before building the rhyme key, the shared
  path used by both dictionary-backed and pure spelling-based comparison) and `trouveFamille`
  (the plain spelling-based fallback used when a word isn't covered by any dictionary at all —
  it was matching every "-ent" word against the nasal [ɑ̃] family by default; it now also tries
  matching the stem plus a silent e, "enivr" + e ~ "enivre", against the existing families, so
  it lands on the correct one instead). Confirmed against Alucard's real dictionary: the
  dictionary already agreed "livres"/"enivrent" belonged to the same phonetic group, but an
  orthography-based safety check downstream was overriding that correct agreement with `null` —
  same underlying pattern as three of the 2.24.0 fixes (the dictionary is right, the spelling
  heuristic wrongly overrides it).
  Known residual gap, not fixed: without any dictionary coverage, a verb like "dorment" ([ɔʁm])
  still falls back to the wrong nasal family, since no dedicated "-orme" family exists yet in
  the curated `FAMILLES` list — not a regression from this fix, just the pre-existing limit of
  a non-exhaustive list.
- **2.24.1** — The personal dictionary (`dictionnaire-perso.json`) no longer blocks plugin
  startup while it loads. Previously, loading it was the very first thing `onload()` did,
  `await`-ed before registering the view, ribbon icon, or any command — so on a large
  dictionary (measured: ~750 ms for 121k words on desktop, likely several seconds on mobile
  given the weaker CPU), nothing from the plugin appeared until that finished, which could feel
  like the whole plugin was stalling on startup, especially on mobile. The view/icon/commands
  now register immediately; the dictionary loads in the background right after, and the rhyme
  engine already falls back safely to its spelling-only heuristic for the brief window before
  it's ready (`DICO_PHONETIQUE` starts `null`, already handled everywhere it's checked).
  A separate attempt at speeding up the parsing loop itself (skipping `trim()`/`toLowerCase()`
  when a word is already clean) looked promising on a single measurement (189 ms → 137 ms) but
  turned out to be measurement noise once re-tested properly across several alternated runs
  (~46 ms vs ~43 ms median) — not shipped, since it would have added complexity to
  dictionary-parsing code for no real gain.

Full history of every version: see [CHANGELOG.md](CHANGELOG.md).
