# Translating catalog content (EN / IT / ES)

The UI chrome (buttons, labels) is translated in the i18n locale files
(`web/src/i18n/locales/*.json`). Catalog *content* is translated in two places,
depending on the kind:

## Zone and theme names + descriptions — in the sheet

Zone and theme names, and zone and theme descriptions, are all editable directly
on the **Zones** tab — canonically in English, with one extra column per
language for each:

| Column               | What it's for                    | Per-language columns                        |
| --------------------- | --------------------------------- | -------------------------------------------- |
| `Title`                | Zone name                         | `Title (it)`, `Title (es)`                    |
| `Description`          | Zone description                  | `Description (it)`, `Description (es)`        |
| `Themes`                | Theme name                        | `Themes (it)`, `Themes (es)`                  |
| `Theme description`    | Theme description                 | `Theme description (it)`, `Theme description (es)` |

- Every header must match exactly, e.g. `Title (it)`, `Themes (es)`, `Theme
  description (it)` (two-letter language code in parentheses).
- Zone-level columns (`Title`, `Description`, and their translations) go on the
  zone's **title row**. Theme-level columns (`Themes`, `Theme description`, and
  their translations) go on **each theme's own row**, same as the plain `Themes`
  column already does.
- **A blank translation cell falls back to the English value** (`Title`/
  `Description`/`Themes`/`Theme description`). So you can add a language column
  and fill it in gradually, zone by zone or theme by theme.

Zone names/descriptions show up on the zone pill's tooltip (book detail) and the
Zone filter menu's hover text; theme names/descriptions show up the same way on
the theme pill and the Theme filter menu. All of it switches with the app's
language.

### After editing

Reads are live, so editing a translation just needs a reload. Adding a brand-new
`<Column> (xx)` **column** is picked up by header name, so it needs the Apps
Script backend deployed with the current `apps-script/` code (`clasp push` +
redeploy) once — after that, editing values needs no redeploy.

## Language names — in code

Language names (the `Languages` column on the `Lists` tab) have no per-language
translation columns — there are ~20 of them and they change rarely, so their
IT/ES translations live in
[`web/src/i18n/vocab.ts`](../web/src/i18n/vocab.ts) instead, keyed by the
English value. Anything without a translation falls back to the English
original. Owners/readers are people's names and are never translated.

Add or edit these in `vocab.ts` (a code change).

## The About page's README — one file per language

The in-app About page ([web/src/pages/AboutPage.tsx](../web/src/pages/AboutPage.tsx))
renders this repo's own README, so it's translated the same way: `README.md`
(English, the fallback), `README.it.md`, `README.es.md` at the repo root, each
cross-linked at the top of the others. `README_BY_LANGUAGE` in `AboutPage.tsx`
picks the file matching the app's current language; clicking one of the
language links *inside* the rendered README switches the app's language in
place (`README_LANGUAGE_LINKS`) rather than navigating to a dead repo-relative
link.

Adding a language later: translate the README into a new `README.<code>.md`,
add a language link for it at the top of every `README*.md` file, import it
with `?raw` in `AboutPage.tsx`, and add it to both `README_BY_LANGUAGE` and the
language-switcher `LANGUAGES` list in [web/src/i18n/index.ts](../web/src/i18n/index.ts).

## Checking the locales agree

There's no automated check, so before shipping a translation change confirm
every locale has exactly the same key set:

```bash
cd web && node -e "
const flat = o => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? Object.keys(v).map(x => k + '.' + x) : [k])
const en = flat(require('./src/i18n/locales/en.json'))
for (const code of ['it', 'es']) {
  const other = flat(require('./src/i18n/locales/' + code + '.json'))
  console.log(code,
    '| missing:', en.filter(k => !other.includes(k)),
    '| extra:', other.filter(k => !en.includes(k)))
}"
```

Both lists should be empty for every locale.
