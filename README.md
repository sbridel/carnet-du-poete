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
  contains an ambiguous hiatus (e.g. *nation*, *poésie*, *paupière*), the main line is labelled
  **synérèse** (the default reading, hiatus read as one syllable) and a second line underneath,
  labelled **diérèse**, shows the full breakdown with that hiatus split into two syllables — you
  decide which reading fits your verse. This second line can be toggled on/off with the
  "Variante diérèse" checkbox if you'd rather keep the view lighter.
  - **Rhyme scheme detection** — the poem is split into stanzas (blank-line separated); each
    stanza's end-rhymes are grouped and labelled A/B/C..., and a 4-line stanza matching AABB,
    ABAB or ABBA is named accordingly, shown just below the syllable counts.
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
  rhyme quality — *pauvre* / *suffisante* / *riche*, estimated from how many trailing letters
  the candidate shares with your word). Each group shows a colour-coded quality summary
  (counts per quality) and every word chip carries a matching coloured border and badge, for a
  quick visual read of the list. You can also tick **RimesSolides** to pull in additional live
  results from [rimessolides.com](https://www.rimessolides.com). A global **"Mode assonance"**
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
  instantly offline; you can additionally enable live lookups from **Wiktionnaire** and/or
  **CRISCO** (Université de Caen's synonym dictionary), toggled independently with checkboxes,
  with a one-click button to save any online result into your personal dictionary for future
  offline use. See [Online sources](#online-sources) below.
- **Definitions** — look up a rare word before using it: fetches a definition excerpt and
  etymology from **CNRTL** (the *Trésor de la Langue Française informatisé*), shown in its own
  boxed section with a link to the full entry. On-demand only — nothing is looked up
  automatically.
- **Hasard** — one button, one rare or forgotten French word at random (*smaragdin*,
  *coruscant*, *pétrichor*, *s'ennuiter*...), with a short gloss and quick links to look it up
  in the Definitions or Rhymes tab. Every word can carry free-form **tags** (désuet, savant,
  poétique...), each with its own stable colour (reused everywhere the tag appears), addable/
  removable on the fly from the drawn word — via dynamic preset buttons (your most-used tags
  first) or a free-text field with autocomplete. Tags widen the draw pool (checking several is
  OR logic). "exclu" is a reserved tag — a "🚫 Ne plus tirer ce mot" shortcut applies it, and two
  always-visible quick-filter buttons ("🚫 Explorer les exclus" / "☆ Explorer «
  most-used-tag »") let you toggle a review mode that draws *only* from that subset; picking one
  clears the other, since combining them silently ignored the second filter. A "💾 Graver dans
  dictionnaire-perso.json" button commits the currently-drawn word (with its tags) permanently
  into your personal dictionary and clears its temporary tag record from Obsidian's plugin data
  — a lightweight staging area for tags added mid-session, not meant to accumulate forever
  (a bulk "Graver en masse" version of the same action lives in Settings, for after a big
  tagging session). A collapsible stats panel at the bottom shows total word count, how many are
  excluded, how many have no tag yet, and the resulting "% already seen" — handy for deciding
  when it's time to import a fresh batch of words. Tags can also be declared directly in
  `dictionnaire-perso.json` (see below) — useful for pre-tagging a bulk import — and merge with
  tags added from the UI. The draw itself avoids repeating recently-shown words (a rolling
  window that adapts to the size of the current filtered pool, so a narrow tag filter never gets
  stuck empty). A small form lets you add a rare word manually (word, optional gloss, optional
  tags) straight into your personal dictionary without going through an external source.
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
- **CNRTL** (`cnrtl.fr`) — the *Trésor de la Langue Française informatisé*, used in the
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
their normal pages and extracts the relevant section. If a site changes its layout, that source
may temporarily return no results — the other source(s) and the local dictionaries are
unaffected. CNRTL has announced a full portal redesign for 1 September 2026
([details](https://www.portail-lexical.fr/)); if the URL structure changes after that date, the
Definitions tab may need an update.

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
- Rhyme quality (*pauvre* / *suffisante* / *riche*) is estimated by comparing trailing letters,
  not real phonetic transcription — a reasonable approximation for most common spelling
  patterns, but not infallible (silent letters can throw it off occasionally).
- The online sources depend on third-party websites staying reachable and structurally
  unchanged; treat them as a bonus on top of, not a replacement for, the offline dictionaries.
- Rhyme-pair colour-coding applies to the rendered analysis below the text box, not to the raw
  text box itself, which a plain HTML `<textarea>` cannot style character-by-character.

## Changelog

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
