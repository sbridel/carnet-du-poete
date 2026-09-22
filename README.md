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
- [Version history](#version-history) — full changelog archive

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
  optionally tick Wiktionnaire and/or CRISCO to pull in related words fetched live as extra
  inspiration candidates. **Click any word** (from a recognised theme or an online source) to
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
into browser CORS restrictions). Four sources are built in:

- **Wiktionnaire** (`fr.wiktionary.org`) — the French Wiktionary's own API, parsed for its
  "Synonymes"/"Antonymes" sections. Used in the Synonyms and Inspiration tabs.
- **CRISCO** (`crisco4.unicaen.fr`) — Université de Caen's *Dictionnaire Électronique des
  Synonymes*, an academic resource with tens of thousands of curated entries. Used in the
  Synonyms and Inspiration tabs.
- **RimesSolides** (`rimessolides.com`) — a French rhyming dictionary with IPA transcriptions.
  Used in the Rhymes tab.
- **CNRTL** (`cnrtl.fr`) — the CNRTL portal's own internal JSON API, covering seven dictionaries
  at once (TLFi, Wiktionnaire, Académie 9th/8th/4th editions, Littré, DMF), used in the
  Definitions tab. Unlike the other three, this one has no opt-in checkbox: it is only ever
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
- **2.24.0** — Three real accuracy fixes to the rhyme engine, all found via a single test poem
  from Alucard ("effraie/chasse/place/frais/jais/forêt/fées/rejet") and confirmed with
  `node tests/run.js` (82/82) plus targeted checks before shipping:
  - A word's final mute e was still left dangling in the rhyme key whenever it fused with
    another vowel instead of standing alone on its own — the "vole"/"bol" case (isolated e) was
    fixed back in 2.19.0, but "effraie" (ending in "aie", the e fused with "ai") kept a
    different key from "frais"/"forêt" ("aie" vs "ai") despite the identical sound. Same fix now
    applies whether the mute e stands alone or is fused with the vowel before it — also
    corrects "joue"/"rue"-type endings the same way.
  - When two words are both covered by the phonetic dictionary but land in different
    dictionary groups (no shared "rime riche"), the engine now still recognises a genuine
    "rime pauvre" between them if neither word has anything left after its final vowel — e.g.
    "frais" [fʁɛ] and "jais" [ʒɛ] share the exact same final sound with nothing following,
    differing only in the onset consonant before the vowel. Previously this case was capped at
    "assonance", one level below what it actually is.
  - The silent final consonant (d/t/x) was being stripped from the word *before* syllable
    segmentation, which could expose an unrelated earlier vowel as if it were a genuine mute e
    — "rejet" lost its "t" first, becoming "reje", and the resulting final "e" (which is very
    much pronounced, [ʒɛ]) was then mistaken for a real mute e, sending the anchor back to the
    unrelated "e" of "re-". Whole family of words affected: rejet, objet, projet, sujet, effet,
    regret, and more generally any "-et/-ed/-ex" word preceded by a separate syllable. Fixed by
    keeping the consonant through segmentation and stripping it only afterwards, once the real
    rhyme-bearing syllable is already correctly anchored — applied consistently to the rhyme
    key itself and to the two functions behind the pauvre/suffisante/riche/très
    riche/léonine quality badge, which had the exact same bug.
  - Known related limitation, found along the way but left as-is: when a
    `dictionnaire-perso.json` entry is a homograph with two unrelated pronunciations (e.g. "jet"
    as in "avion à réaction" [dʒɛt] vs the native French "jet" as in "lancer" [ʒɛ]), the
    dictionary format can only store one entry per word — whichever sense is present is the one
    used everywhere. Same limitation already documented below for "président"/"fier".
## Version history

- **2.23.0** — First real automated test suite (`tests/`, run with `node tests/run.js` — no
  dependency to install, loads the actual `main.js` unmodified). 82 assertions covering
  everything found and fixed across the last several releases: mute e no longer dangling in a
  rhyme key, yod ("ille") staying distinct from "elle", "y" as a vowel equalling "i", doubled
  consonants, intervocalic "s", "-tion" softening, "ch"=[k] exceptions, CaReFuL, nasalisation,
  vowel-family coverage, homéotéleute filtering, and the full zéphyr/frémir rhyme-scheme case.
  Building it surfaced one more real bug, caught before it shipped: "grenouille"/"chatouille"
  were producing a phantom "oui" vowel group — the final "i" before "ille" is the same yod as in
  "fille", not a third vowel merging with "ou" ("grenouille" is [ɡʁənuj], not [ɡʁənwi]). Fixed at
  the source in the internal vowel-grouping logic, not by adding "oui" as if it were a real sound.
- **2.22.0** — Fixed a real gap in the rhyme engine: a bare "y" that IS the vowel itself (not a
  semi-consonant before another vowel, already handled separately) is pronounced exactly like
  "i" — "zéphyr"/"frémir", "rugby"/"pari", "martyr"/"sortir" — but "yr" and "ir" were staying
  two different keys for the same [iʁ] sound, so words spelled with a final "y" never matched
  their "i"-spelled rhyme partners. Found via a real poem (thank you, Alucard) using "zéphyr" as
  a rhyme for "frémir"/"souffrir" — confirmed correct by ear, wrong in the tool. Also worth
  noting for anyone who ran into this already: this fix had actually been written and tested
  earlier in the process of tracking the report down, but was left sitting in a working copy
  and never actually packaged into a release — this version is the first one that genuinely
  includes it, sorry for the runaround while we nailed down what was and wasn't shipped.

- **2.21.0** — Two ergonomic changes to the Rimes tab, both purely cosmetic, no behaviour
  change:
  - The rhyme-quality pill colours (Pauvre/Suffisante/Riche/Très riche/Léonine) are noticeably
    softer now — same hue family, less saturated, slightly lighter — instead of the fairly
    strong original palette. Applies everywhere that palette is used: the pills themselves, the
    small coloured left border on word chips in Rimes/Synonymes results, and the quality-summary
    dots. Checked-pill text switched from white to a dark grey to keep it readable against the
    lighter fills (white text on the lightened colours was dropping well below a readable
    contrast ratio on some of them, most noticeably "Léonine").
- **2.20.0** — A dedicated audit poem (built from real entries in Alucard's own
  `dictionnaire-perso.json`) surfaced one more small gap: "ch" pronounced [k] instead of the
  usual [ʃ] in a handful of Greek-origin/technical words — "pétrichor", "chœur", "chrome",
  "chronique", "choral", "écho", "orchestre", "psychologie", "archéologie", "chaos", "chlore",
  "chrétien", "technique", "technologie", "orchidée"... Fixed in both allitérations (for words
  actually starting with "ch") and Trame phonique (for "ch" anywhere in the word, which is how
  this was first noticed — "pétrichor" was landing in the same [ʃ] bucket as "chien"/"chaleur"
  instead of its own [k] one). Small root-based exception list, not exhaustive, same pattern as
  the other exceptions already in this section (CaReFuL, "-er" infinitives, "ill"...).
- **2.19.0** — A systematic audit pass over the Sonorités panel and the underlying rhyme engine,
  triggered by real test cases from Alucard. Several genuine accuracy bugs found and fixed,
  each confirmed by direct testing:
  - **Trame phonique**: doubled consonants ("addition", "attention", "couronne") were counted
    twice instead of once; a lone "s" between two vowels ("poison", "maison") wasn't recognised
    as [z]; "t" followed by "-tion" (not preceded by s/x) wasn't softened to [s] ("nation",
    "national" — "question"/"gestion" correctly stay [t]); "ill" after a vowel is now recognised
    as the yod glide [j] by default ("fille", "brillant"), with a proper exception list for
    words where it stays a real double L ("ville", "tranquille", "mille"/million-milliard,
    "distiller", "osciller", words ending in "-illaire", words starting with the "ill-" prefix,
    and a few proper nouns/medical terms) — also fixed the "Trame phonique" section not using
    the same stable per-theme colours as Allitérations, an inconsistency from 2.17.0.
  - **Allitérations**: a word covered by the phonetic dictionary could return a consonant found
    *anywhere* in its transcription as if it were word-initial (fixed in 2.18.0 for "écrit"-like
    cases); yod [j] is now recognised as a valid initial sound too ("ion", "yeux", "hier"),
    dictionary and spelling-based alike.
  - **The rhyme engine itself** (used everywhere — rhyme scheme, Rimes tab, quality badges):
    `classifieRime` now checks the phonetic dictionary first when both words are covered by it,
    falling back to the spelling approximation only when at least one isn't — previously the
    approximation could return a match without the dictionary ever being consulted, even when
    available and correct. Separately, "eille"/"ille" (yod) endings no longer collapse onto
    plain "elle" endings ("abeille" was being treated as a perfect rhyme with "nouvelle") — a
    dedicated key is computed for the yod case, using a marker character that mode assonance's
    core-vowel comparison correctly skips (an early version of this fix accidentally broke
    "fille"/"ville" assonance matching by using a marker that looked like a vowel itself). Also
    fixed: a word's final mute e was being left dangling in the rhyme key when anchoring on the
    vowel before it, making e.g. "vole" and "bol" — the exact same sound, [ɔl], differing only
    in grammatical gender — compare as merely "assonance" instead of a full "rime" unless the
    phonetic dictionary happened to override it.
  - Two remaining known gaps, found along the way but not fixed: verb infinitives in
    "-iller"/"-eiller" (e.g. "travailler") still lose the yod distinction, since an earlier rule
    converts their ending before the yod check can run; and words where the anchor vowel and a
    trailing mute e merge into one written group ("vue" vs "vu") aren't yet reconciled the same
    way "vole"/"bol" now are. (Update, 2.24.0: the fused-vowel case is now fixed too, see above.)
- **2.18.0** — Continued work on the Sonorités panel from 2.17.0:
  - **New**: a 4th figure, "Trame phonique" (réseau consonantique) — a consonant sound that
    recurs anywhere in a word (attack, middle, coda), not just word-initial like allitération.
    Click a sound in its list to spotlight only its occurrences in the draft (everything else
    dims), rather than adding a permanent 3rd highlight colour to the text.
  - **New**: a frequency ratio ("×N.N") next to every sound in the three lists (allitérations,
    assonances, trame phonique), comparing how often it occurs in this poem against its normal
    frequency in French — sourced from Lexique 3 (New, 2006) via C. dos Santos' thesis (Lyon 2,
    2007), which breaks consonant frequency down by position in the syllable. Allitération uses
    the word-initial-position figures specifically, trame phonique the all-positions figures —
    the two can differ a lot (e.g. /ʁ/ is 3.7% word-initial but 30.4% after a vowel), so using
    one shared number for both would have been misleading.
  - **Fixed** several real accuracy issues surfaced while building the above, all confirmed by
    direct testing: an off-by-N position bug meant highlighted letters could land on the wrong
    character for any elided word (l'/d'/qu'...); "c"/"g" followed by an *accented* e/i/y (é,
    è, ê, ë, î, ï) wasn't softened to [s]/[ʒ] — the regex only matched plain unaccented letters,
    so "Cérynie" was coloured as if it started with [k]; silent final consonants (the "t" in
    "forêt", "offrant", "chantant"...) were counted as if pronounced — now skipped by default
    except c/r/f/l ("CaReFuL"), with -er infinitives (r silent) as a further exception to that;
    "n"/"m" absorbed into a preceding nasal vowel (démente, argentin — neither has an audible
    [n]) were being counted as their own consonant sound; a word found in the phonetic
    dictionary could return a consonant found *anywhere* in its transcription as if it were the
    word-initial sound, even for vowel-initial words like "écrit" or "offrant".

- **2.17.0** — New "Sonorités" panel in the Syllabes tab (flip the card with the button next to
  Export/Copy/Clear — now a cyan pill on the left): detects allitérations (repeated initial
  consonant sound), internal assonances (repeated vowel, not just end-of-line rhyme), and
  homéotéleutes (echoing word endings elsewhere in the poem, not just the rhyme scheme — only
  surfaced when at least one occurrence is mid-line, otherwise it would just restate the
  existing rhyme scheme). Results show as a list (word/line references) and as coloured
  highlighting directly in the draft, with a legend. Three grouping levels — exact sounds,
  simplified families (manner of articulation / vowel timbre), or extended families (adds
  voiced/voiceless distinctions) — with colours kept stable per theme across all three levels
  rather than reassigned by order of appearance. Also: "Exclure mots outils", a seuil (minimum
  occurrences, default 3), and "Surligner seulement les 3 plus fréquents" to keep the draft
  readable on sonorité-heavy poems. Several real coverage bugs fixed along the way: "oi"/"ui"
  and mid-word "eau"/"au" weren't recognised as vowel sounds at all; nasal vowels ("chantant",
  "jasmin"...) weren't being detected as nasal; the dictionary's phonetic alphabet (R/S/Z/J)
  didn't match the fallback heuristic's symbols (r/ʃ/ʒ/ɲ), so dictionary-covered words formed
  their own stray one-word "family" instead of joining the right group; a word's own final mute
  e was counted as an assonance with itself. The Guide tab got a matching new section, plus a
  reorganisation (rhymes and poem forms were each split across unrelated sections) and a
  collapsible table of contents. Also, in the Synonymes tab: each synonym/antonym chip now
  shows its syllable count, and a new "syllable count" dropdown filters results down to a
  given count — same style as the existing syllable filter in the Rimes tab.
- **2.16.0** — Rimes tab ergonomics pass and a real filtering bug fix:
  - **Fixed**: the rhyme-quality filters (Pauvre/Suffisante/Riche+/Très riche/Léonine) had a
    silent edge case — unchecking every one of the 3 main checkboxes was treated internally as
    "no filter" instead of "show nothing", and the Très riche/Léonine sub-filters could only
    narrow *within* Riche+, never exclude the plain "riche" category on their own. Checking
    just "Léonine", for instance, still silently showed "Suffisante" results too. The 5
    qualities are now independent, always-applied checkboxes (Riche is no longer a parent that
    can only be narrowed, it's just one of the five) — unchecking all of them now correctly
    shows nothing. "Riche+" is kept as a one-click action button that checks/unchecks
    Riche + Très riche + Léonine together, but it's no longer a piece of state itself, so it
    can't drift out of sync with the checkboxes it acts on.
  - The filter checkboxes, the "Toutes syllabes" dropdown, and "Mode assonance" are now
    pill-style buttons matching the Hasard/Syllabes tabs, coloured to match each quality's
    badge colour in the results below; "Mode assonance" moved onto the same row as "Compléter
    en ligne", and the syllable-count dropdown got a small ▾ to signal it opens a menu.
  - "Pauvre" is now unchecked by default (Suffisante/Riche/Très riche/Léonine still on).


Full changelog archive, oldest first below — the 5 most recent versions are in the
[Changelog](#changelog) section above.

- **2.15.0** — New "Rimes continues entre strophes" toggle in the Syllabes tab: by default each
  stanza's rhyme lettering (A, B, C...) restarts at A, which meant a sonnet's tercets always
  came out as AAB/AAB instead of the conventional CCD/EED continuing on from the quatrains'
  ABBA/ABBA. Toggling it on shares the lettering across the whole poem instead — now on by
  default, alongside "Couleurs de rimes" (previously off by default). Also reworked the
  Syllabes toolbar: the display toggles are now pill-style buttons (matching the Hasard tab's
  look), and Export/Copy/Clear moved to a compact icon row above the draft box.
- **2.14.0** — Two fixes to the **syllable counter** specifically (Syllabes tab / `analyseLigne`
  — a separate engine from the rhyme one, they'd never shared any logic before this):
  - **Fixed**: a verse ending on a 3rd-person-plural verb ("...qu'elles pleurent") was counted
    one syllable too many. The mute-e detection only recognised a literal final "e" (rose,
    chante) — never the "-ent" of "ils/elles pleurent, chantent...", which is the exact same
    silent sound, just spelled differently. Classical versification confirms this ending never
    counts at the end of a line, same as any other mute e (checked against several current
    French versification references while fixing this).
  - Since "-ent" is genuinely ambiguous from spelling alone (silent 3rd-plural verb ending in
    *pleurent*, but a real pronounced [ɑ̃] in nouns/adjectives like *récent*, *argent*,
    *moment*, *président*...), the fix now checks the extended phonetic dictionary first when
    available — exact, no guessing (a transcription ending in a consonant means the "-ent"
    added no sound at all; ending in the nasal vowel means it's genuinely pronounced) — and
    falls back to a curated list of ~70 common non-verb exceptions only for words outside the
    dictionary, so the fix still helps even without one configured.
- **2.13.0** — Large rework of the Hasard tab's tag filtering, prompted by importing a big
  batch of words (the classic "one tag now dwarfs every other in volume" problem) and by a
  visual redesign pass on the whole filter area:
  - **Filtering semantics, please read if combining tags**: checking several tags is **OR by
    default** (matches *any* of them) — with an uneven tag distribution, OR-combining a huge
    tag with a small one mostly just gives the huge one back. A new **"Tous les tags cochés
    (ET)"** toggle switches to requiring *every* checked tag at once for a real intersection.
    A further **"+ au moins un tag en plus de ceux cochés"** toggle asks for the checked
    tag(s) plus *any* other tag on top, generic rather than hardcoded to one specific tag.
  - **Fixed**: the live pool counter used the new ET/"+1 tag" options, but the actual draw
    button forgot to pass them along and used the old OR-only logic — the counter said one
    number, the draw came from a bigger pool. Both now share the exact same filtering call.
  - The exclusion review mode ("🚫 Explorer les exclus") is no longer a pseudo-tag mutually
    exclusive with everything else — it's its own toggle now, and combines properly with tag
    filters (e.g. review just the excluded words also tagged "méral").
  - New "🏷️ Explorer les multi-tagués" shortcut (2+ tags at once), the mirror of the existing
    "📭 Masquer les mots déjà tagués" (0 tags) — both now based on a shared helper that
    excludes the reserved "exclu" tag from the count, so review mode doesn't skew it.
  - The "☆ Explorer" bandeau shortcut is now fixed to your "like" tag specifically, instead of
    "whichever tag is used most" — a bulk import's tag can otherwise dwarf your own in raw
    count without being more useful as a shortcut.
  - Stats panel gained a per-tag breakdown and every tag combination actually observed in your
    dictionary (not all theoretically possible ones, just the real ones).
  - **Fixed**: merging two notes for the same word (via "🧹 Nettoyer et fusionner" in Settings,
    or a re-import) used to silently keep whichever note was seen first, discarding the other
    even if it was richer. Now: if one note fully contains the other, the more complete one
    wins; if they genuinely differ, both are kept, joined by a compact "· · ·" separator at
    render time (works retroactively on already-merged notes too, no data migration needed).
  - **Fixed**: notes imported from OCR'd/scanned sources often have arbitrary mid-sentence line
    breaks (fixed-width original page layout) — now flattened to normal flowing text instead of
    rendering as ragged short lines.
  - Visual pass on the whole filter area: harmonised pill shapes for the top shortcuts, two
    colour-coded collapsible sections (violet = include, gold = exclude — freeing up red to
    mean only "the drawn word" and "Graver"), badges showing active-filter counts even while
    collapsed, mutually-exclusive "voir tous les tags" panels (opening one closes the other),
    and the draw button/word card restructured into a single visual block (button now above
    the result, definition text justified instead of centered, "Graver" moved after the
    tagging controls since you tag first and commit second).
- **2.12.0** — Several more spelling/sound equivalences added to the **orthographic heuristic**
  used by rhyme detection and quality (pauvre/suffisante/riche/très riche/léonine) — see the
  important scope note below before reading the list.
  - `au`/`eau` ≈ `o` when genuinely closed [o] — word-final, before a mute e, or before an
    intervocalic "s" that becomes [z] (*chaud*/*pot*, *chapeau*/*pot*, *pause*/*pose*/*morose*).
    Deliberately **not** applied before any other consonant, since a plain "o" there can be
    either closed (*rose*) or open (*note*) unpredictably from spelling alone — merging them
    would have wrongly rhymed *faute* [fot] with *note* [nɔt].
  - `œu`/`oeu` ≈ `eu` (*vœu*/*peu*, *cœur*/*fleur*) — no restriction needed here, unlike au/eau:
    both spellings follow the exact same open/closed rule based on syllable position, so
    merging them never crosses a timbre boundary.
  - `um` ≈ `un` and `im`/`aim`/`eim`/`ym` ≈ `in` (the two remaining nasal vowels) — *parfum*/
    *brun*, *faim*/*main*.
  - Infinitive `-er` (silent r) and `-ez` (silent z) now both resolve to the same key as `-é`
    (*chanter*/*aimé*, *chantez*/*aimé*, *nez*/*été*), with a short exception list for the
    genuine cases where the final consonant is pronounced (*mer*, *fer*, *cher*, *hier*, *ver*,
    *fier*, *cuiller*, *hiver*, *enfer*, *cancer*, *amer*, *éther*, *revolver*, the invariable
    "-ers" nouns like *divers*/*travers*/*envers*/*revers*, a few common English loanwords, and
    for `-ez` specifically *fez* and Hispanic surnames/place names like *Pérez*, *Sánchez*,
    *Gómez*, *Suez*). Neither list claims to be exhaustive.
  - **Important scope note**: all of the above — today's additions and everything already in
    `normaliseSonsFinal` (ê/è/ei, circumflex, i/y semi-consonant, intervocalic s→z, doubled
    letters, -tion≈-ssion...) — only ever runs as the **orthographic fallback**, used when at
    least one of the two compared words has no known transcription in an extended phonetic
    dictionary (format F). When *both* words are covered by one, `classeRime` uses the real
    phonemes directly and none of this applies. This can occasionally make the phonetic result
    *more conservative* than the heuristic one, not just more permissive: e.g. the heuristic
    counted *pose*/*morose* as "riche" (its trailing mute *e* was miscounted as a third shared
    son), whereas the real transcription (`poz`/`mORoz`, 2 shared phonemes: o+z, differing
    onset) correctly gives "suffisante" — a case where the phonetic engine caught the
    heuristic being too generous, not too strict.
  - Also fixed two bugs found while testing the above: the -er/-ez check ran *after* the
    silent d/t/x removal, so a word like *concert* lost its "t" first and then looked like a
    (wrongly convertible) "-er" word — reordered so -er/-ez is checked on the original ending
    first. And the Hispanic-surname exceptions were missing their accented forms (*Pérez* vs
    *perez*) in the very first pass.
- **2.11.0** — Follow-ups to the phonetic engine (2.10.0), mostly bug fixes surfaced by
  actually using it on real dictionaries/searches:
  - **Fixed**: the Wiktionnaire scraper searched the whole page for a "synonyms" section
    without first isolating the French-language block — a word that also exists in another
    language (e.g. *rage*, which is also Dutch) could return that other language's synonyms
    instead of French ones. Now scoped to `== {{langue|fr}} ==` first.
  - **Fixed**: the new rhyme-quality badge in the Synonyms tab was showing on every single
    synonym/antonym, even ones that don't rhyme at all with the searched word — `classeRime`
    always returns a level (even "pauvre") for any pair, it was never meant to be called
    without first checking there's a genuine rhyme. The badge now only appears when `memeRime`
    confirms one.
  - **New**: click any synonym/antonym chip (in the online-source results) to exclude it
    before saving — useful for the case above, or any bad match from an online source — click
    again to un-exclude; the "💾 Save" button only writes what's left.
  - **New**: clearer, differentiated error messages for the three online sources (429 = rate
    limited, 403 = blocked, 5xx = the site's own problem, vs. a generic network/timeout
    message) instead of a single generic "see the console".
  - **New**: debug-only toggle in Settings ("ignore the personal dictionary") to instantly
    compare rhyme results with/without it loaded, without touching the vault file — and it now
    actually forces every open tab (Syllables, Rhymes, Synonyms) to recompute immediately,
    instead of only taking effect on the next fresh search or after clearing/repasting the
    draft.
  - **Fixed**: the "Mode assonance" checkbox in the Rhymes tab could go visually stale if you
    changed the same global setting from Settings while that tab was already open — it now
    resyncs every time you switch back to the Rhymes tab.
- **2.10.0** — New "Format C" for `dictionnaire-perso.json`: an object nested one level
  deeper than Format B (`group → word → {phonetique, synonymes, antonymes}`), giving each
  word its full phonetic transcription (SAMPA-like, one character per phoneme) plus its own
  synonyms/antonyms, each already phonetically resolved when they're part of the same
  dictionary. Both formats can coexist in the same file. When a word has a known phonetic
  transcription, rhyme quality (pauvre/suffisante/riche/très riche/léonine) is now computed on
  the real phonemes instead of the orthographic approximation — a genuinely reliable result
  for anything covered by the phonetic dictionary, with the existing heuristic still used as a
  fallback for everything else. The Synonyms tab now also merges in synonyms/antonyms coming
  from this new format, shows a rhyme-quality badge on every synonym/antonym chip (relative to
  the word you searched), and gained an optional "Rime avec…" field to narrow the list down to
  only the synonyms/antonyms that also rhyme with a second word of your choice — handy when a
  rhyme is already fixed by another line and you need a synonym that still fits it.
- **2.9.0** — Rhyme quality is now a 5-level scale (*pauvre* / *suffisante* / *riche* / *très
  riche* / *léonine*) instead of 3, with **Très riche** and **Léonine** as optional sub-filters
  narrowing the new "Riche+" filter bucket. The two extra levels rely on a syllable-aware check
  (attack + vowel + coda) using approximate French syllabification rules (valid onset clusters
  such as "pl"/"tr" stay grouped; doubled letters split as one sound) instead of the previous
  naive "all consonants join the next syllable" convention — this is what lets pairs like
  *sultans*/*insultants* or *railleur*/*ferrailleur* be correctly recognised as léonine. Several
  phonetic-matching gaps were also closed along the way, since they fed into the same
  comparison: "-tion" now matches "-ssion" (*passion*/*nation* rhyme for real, not just look
  similar); a monosyllabic word's leading consonant is no longer dropped from the comparison
  (*beau*/*escabeau*); and doubled letters, the "i"/"y" semi-consonant glide, the ê/è/ei/circumflex
  spellings of the same oral vowel, and an intervocalic "s" pronounced [z] are now recognised as
  equivalent (*chêne*/*plaine*, *cieux*/*yeux*, *chaumières*/*chères*, *treize*/*fraise*,
  *pierre*/*lumière* and more now correctly match, which also fixes some rhyme-scheme/colour
  groupings in the Syllables tab that previously separated genuine rhyme pairs). Quality badges'
  tooltips now explain the criterion in plain language instead of just "approximatif,
  orthographique". Guide tab expanded with the voyelle/consonne d'appui distinction, très riche
  vs léonine definitions and examples, and the fuller list of rhyme-succession forms (annexées,
  internes, batelées, sénées, couronnées, triplées, emperières).
- **2.8.2** — Hasard filter refinements:
  - Fixed the stats panel not updating after excluding a word ("🚫 Ne plus tirer ce mot") — it
    refreshed correctly after tagging actions but not after that specific one, the most common of
    all.
  - New "Masquer les mots déjà tagués" checkbox, always visible, next to "Masquer les mots
    connus" — same AND-style subtraction, but for *any* tag rather than just "connu". Useful for
    drawing only from genuinely untouched words, e.g. right after a bulk import.
  - Both the tag-add field and the tag-filter field now offer a "Voir tous les tags" expandable
    panel with a live search box, instead of relying solely on the browser's native (unstyled,
    unsorted, hard to scan once there are many tags) autocomplete dropdown.
  - The quick-filter buttons ("🚫 Explorer les exclus" / "☆ Explorer «tag»") and the two
    "Masquer..." checkboxes now share a single row/flex-wrap group instead of being stacked on
    separate lines.
- **2.8.1** — Hasard: new "Masquer les mots connus" checkbox next to the tag filters. Unlike
  regular tags (which widen the draw pool — OR logic), this one subtracts: when checked, it
  excludes anything tagged "connu" from the draw regardless of any other active filter, including
  theme filters or the "exclu" review mode — handy for using "connu" as a personal
  already-mastered marker and drawing only from what's left to learn. Only shown once the
  "connu" tag has actually been used at least once; unchecked by default on each panel open.
- **2.8.0** — Large Hasard and Inspiration rework, aimed at curating a big personal dictionary
  incrementally (e.g. after a bulk import) rather than all at once:
  - **Hasard**: tag filtering redesigned as a text field with autocomplete plus two always-
    visible quick-filter buttons ("🚫 Explorer les exclus" and one for your most-used tag),
    mutually exclusive with each other and with typed filters (combining "exclu" with another
    tag used to silently ignore the second one — fixed by making the choice explicit). The old
    "Voir les mots exclus" panel is gone, replaced by that same exclu quick-filter. Tags now get
    a stable colour each, reused across filter chips, the drawn word's chips, and dynamic preset
    buttons (your most-used tags, one click to apply). New "💾 Graver" button commits the drawn
    word permanently into `dictionnaire-perso.json` and clears its temporary tag record. New
    collapsible stats panel (total / excluded / untagged / % already seen).
  - **Inspiration**: replaced the old per-word "+" popover (which had a DOM bug silently
    breaking it for online-source words) with a click-to-select model — words stay selected
    across successive searches, and a shared action bar lets you add the whole selection at once
    to a lexical field or as rare word(s), reusing each word's known definition when available.
    Theme suggestions are now shown as an explicit clickable hint rather than silently
    pre-filled, after a word belonging to two overlapping themes could end up filed under the
    wrong one without it being obvious.
  - **New Notes tab**: lists rare words and lexical-field words missing a definition, editable
    inline, saved straight to `dictionnaire-perso.json`.
  - **Fixed**: personal `champsLexicaux` entries sharing a theme name with an existing one
    (built-in or personal) were never merged, only silently duplicated and hidden behind the
    first match — themes are now merged on load (see the `dictionnaire-perso.json` section
    above), plus a new Settings → "Nettoyer et fusionner" button to clean up files written
    before this fix, including repairing glued auto-generated keyword lists.
  - **Fixed** two more CNRTL parsing gaps in the Definitions tab: a homograph number rendered
    via a `<sup>` tag (as opposed to plain digits) left stray whitespace after tag-stripping
    that the article-start detection didn't tolerate, and the "word not found" message wasn't
    recognised in one of its phrasings — both could surface the site's own display-options menu
    instead of a real definition, or instead of a clean "not found" message. Also fixed
    definitions/etymologies occasionally rendering one character per line (multi-element markup,
    e.g. a Greek etymology spelled out letter by letter, flattened into stray line breaks).
    Definitions and etymology are now shown in their own boxed sections with a coloured heading.
  - Perf: the personal-dictionary tag lookup used a linear scan per word, fine at the built-in
    scale but quadratic overall once `motsRares` grows into the thousands (e.g. after a bulk
    import) — now backed by an index rebuilt on each dictionary (re)load.
- **2.7.0** — New tagging system for the Hasard tab's rare words: free-form tags addable/
  removable on the fly, used to filter the random draw (OR logic — checking tags widens the
  pool). "exclu" is a reserved tag that permanently removes a word from the draw by default,
  with a one-click "👎" shortcut and a review panel to un-exclude. The draw also now avoids
  repeating recently-shown words, with a window that adapts to the current filtered pool size.
  A manual-entry form lets you add a rare word straight to your personal dictionary without an
  external source. New **settings tab** (Obsidian Settings → Carnet du Poète): toggle Mode
  assonance from there too, set a custom path for `dictionnaire-perso.json` instead of relying
  on automatic search, and reload the personal dictionary with one click.
- **2.6.2** — Fixed another CNRTL pollution case: words with numbered homographs in the TLFi
  (e.g. "ombre" is listed as OMBRE1/OMBRE2) weren't matched by the exact "MOT," pattern, falling
  through to a looser match that could grab the site's own display-options panel (font/colour
  legend) instead of the real entry. The article-start detection now accounts for an optional
  homograph number.
- **2.6.1** — Fixed the Synonyms tab silently ignoring personal entries saved for a word that
  already exists in the built-in dictionary (only the first match was ever returned; entries are
  now merged, so nothing you save is hidden). Fixed the CNRTL/TLFi definitions occasionally
  getting polluted by the site's own announcement banner and navigation menu instead of the real
  definition, and made the article-start detection more precise to avoid matching a page title
  instead of the actual entry. Added a "📄 Copier le brouillon" button to copy the raw draft text
  to the clipboard.
- **2.6.0** — New global "Mode assonance" toggle in the Rhymes tab (like the diaeresis toggle,
  off by default): when enabled, assonances (same vowel, different ending) are shown in their
  own clearly separate section instead of being excluded entirely, for both the local phonetic
  dictionary (now searched across all its groups, not just the query word's own group) and
  RimesSolides. The same toggle also loosens the Syllables tab's rhyme-scheme detection and
  colour-coding. Also fixed a latent bug this surfaced: the local phonetic dictionary's internal
  word-list storage still included the `motsRares`/`champsLexicaux`/`synonymes` custom-dictionary
  sections, which could crash a full-dictionary scan.
- **2.5.5** — RimesSolides results now go through the same vowel-consistency filter as the local
  phonetic dictionary. RimesSolides accepts a looser definition of "rime" than classical French
  poetry (e.g. it lists "montre", "rompre", "fondre" as rhyming with "ombre" — same nasal vowel,
  but a different consonant right before the final "r", which is an assonance, not a true rhyme).
  The plugin now applies its own stricter standard consistently, regardless of what a given
  source considers acceptable.
- **2.5.4** — All four online sources (Wiktionnaire, CRISCO, CNRTL, RimesSolides) now send a
  standard browser User-Agent header with their request; some sites treat unidentified/non-browser
  requests differently, which could silently return an empty or different page even though the
  same URL works fine when fetched normally. If RimesSolides still returns nothing for a word
  that clearly has results on the site, check the developer console — it now logs the response
  length and a preview of what was actually received, to make the real cause visible.
- **2.5.3** — The vowel-consistency safety net (added in 2.5.2 for the Syllables tab's rhyme
  scheme/colours only) is now also applied to the **Rhymes tab's actual search results**, which
  is the more important fix: a phonetic dictionary group that wrongly mixes unrelated vowels
  (e.g. everything ending in "-bre") no longer surfaces bad matches in search results or their
  quality badge. Also fixed the nasal/oral distinction itself: "ombre" (nasal) and "octobre"
  (oral, despite both starting with the letter "o") were still being treated as compatible; the
  consistency check now accounts for the nasalising m/n that follows a vowel, not just the
  vowel letter itself.
- **2.5.2** — The rhyme-scheme/colour-coding matcher no longer blindly trusts a match from the
  optional phonetic dictionary when it clearly contradicts the spelling-based vowel check (e.g.
  a dictionary that groups "sombre" and "ténèbres" together purely because both end in "-bre",
  ignoring the very different preceding vowel — not a real rhyme, at best an assonance). The
  phonetic dictionary is still trusted when nothing contradicts it.
- **2.5.1** — Fixed the rhyme-scheme/colour-coding fallback key wrongly matching words that only
  share their last two letters regardless of the preceding vowel sound (e.g. "sombre" and
  "ténèbres" were flagged as rhyming — an assonance at best, sharing only the "-bre" ending, not
  a real rhyme). The key is now anchored on the last actually-pronounced vowel instead of a fixed
  number of trailing letters, with common nasal-vowel spelling equivalences (en/an, ain/ein/yn
  → in) still normalised so genuine matches like "démente"/"envoûtante" keep working.
- **2.5.0** — The "-gue" ambiguity (vague, guerre, digue... when the final e would normally
  elide) is no longer silently resolved one way or the other: it now surfaces through the same
  synérèse/diérèse variant mechanism as hiatus, so both readings are visible and you choose.
  This was prompted by spotting a genuine inconsistency in Scribblab itself on this exact
  point (its own displayed breakdown didn't match its own displayed total for a "vague" line) —
  rather than pick a side, the ambiguity is now made explicit.
- **2.4.1** — The main (synérèse) line is now explicitly labelled as such whenever a diaeresis
  variant exists underneath, instead of only the diaeresis line being labelled — makes it clear
  at a glance which reading is which.
- **2.4.0** — Two significant syllable-counting fixes found by testing Lamartine's complete
  "L'Isolement" against Scribblab (went from 3/14 to 11-12/14 exact matches on this poem): the
  silent "u" in "qu" (que, qui, quoi, qu'il...) was wrongly counted as its own vowel, inflating
  counts by one in any line containing an elision like "qu'une" or "jusqu'à"; and "les/ces/des/
  mes/tes/ses" were sometimes wrongly treated as elidable like the schwa word "se", occasionally
  dropping to 0 syllables when followed by a vowel-starting word — these determiners always keep
  their closed "é" sound and are never elided. (A similar fix for the "gu" digraph, e.g. "vague",
  was tried and reverted after it regressed a previously-validated case — treated as a genuine
  ambiguity for now rather than force a guess.)
- **2.3.3** — Fixed the Syllables tab toolbar (diaeresis/colour toggles, export, clear) overflowing
  off-screen on narrow mobile widths instead of wrapping onto a new line.
- **2.3.2** — Markdown export from the Syllables tab now includes a rhyme quality column
  (pauvre/suffisante/riche), computed relative to the first line of each rhyme group; the
  colour-coded rhyme badge's tooltip also shows it.
- **2.3.1** — Rhymes tab: each rhyme group now shows a colour-coded quality summary
  (pauvre/suffisante/riche counts) and every word chip carries a matching coloured border and
  badge; fixed the "🎲 Tire un mot au hasard" button not being centred.
- **2.3.0** — New Hasard tab (random rare/forgotten French word with a gloss and quick links to
  Definitions/Rhymes); fixed rhyme-group matching so that a word found in the optional phonetic
  dictionary while its true rhyme partner is missing from it no longer get sorted into different
  groups (affected both the rhyme-scheme detector and colour-coding) — elided contractions
  ("m'assieds") are now also stripped before matching.
- **2.2.0** — New Definitions tab (CNRTL/TLFi definitions and etymology, on demand); Rhymes tab
  gained filters (first letter, syllable count, rhyme quality) and an optional RimesSolides
  online source; automatic rhyme-scheme detection per stanza (AABB/ABAB/ABBA when applicable)
  with optional colour-coded rhyme badges in the Syllables tab; Markdown export of the analysis
  (verse / syllables / gender / rhyme letter) to the clipboard; fixed `trouveFamille` not
  matching plural words against singular-form rhyme family endings (e.g. "décombres" against
  the "-ombre" family).
- **2.1.0** — Fixed a typographic apostrophe (’) being stripped from words (e.g. "l'ombre"
  becoming "lombre"); fixed the diaeresis variant line sometimes appearing visually attached to
  the following verse instead of its own; added a toggle to show/hide the diaeresis variant;
  Inspiration tab can now optionally pull in live results from Wiktionnaire/CRISCO as bonus
  vocabulary; expanded the Guide with metre names, caesura, enjambment/rejet, stanza naming,
  more poem forms (triolet, virelai, tanka, calligramme, free/blank verse), and a note on
  eye-rhymes vs ear-rhymes.
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
- **1.6.0** — Rhyme gender badge (F/M) added to every line in the Syllables tab.
- **1.5.0** — Fixed intervocalic "y" (*rayon*, *crayon*, *voyage*...), which was wrongly merged
  with neighbouring vowels instead of separating two syllables; fixed punctuation preceded by a
  French typographic space (e.g. before ";") being wrongly treated as a following word.
- **1.3.0** — "ç" was no longer incorrectly stripped from analysed text (was breaking words like
  *leçon*, *français*, *commença*).
- **1.2.0** — Nasal vowels (*temps*, *enfant*, *m'attends* at the end of a line) were no longer
  wrongly counted as a droppable silent *e*.
