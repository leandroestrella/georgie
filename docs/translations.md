# Translating catalog content (EN / IT / ES)

The UI chrome (buttons, labels) is translated in the i18n locale files
(`web/src/i18n/locales/*.json`). Catalog *content* is translated in two places,
depending on the kind:

## Controlled vocabulary — in code

Zone names, theme names, and language names are stored **canonically in English**
in the sheet, and their IT/ES translations live in
[`web/src/i18n/vocab.ts`](../web/src/i18n/vocab.ts), keyed by the English value.
Anything without a translation falls back to the English original. Owners/readers
are people's names and are never translated.

Add or edit these in `vocab.ts` (a code change).

## Zone descriptions — in the sheet

The zone **descriptions** are longer prose, so they're editable directly on the
**Zones** tab. Alongside the English `Description` column, add one column per
language, headed `Description (<code>)`:

| Title (zone)                        | Description (English) | Description (it) | Description (es) |
| ----------------------------------- | --------------------- | ---------------- | ---------------- |
| Contemporary Art, Curation & Design | Physical and visual … | Pratiche fisiche … | Prácticas físicas … |

- The header must match exactly, e.g. `Description (it)`, `Description (es)`
  (two-letter language code in parentheses).
- Put the text on the zone's **title row** (same row as the name/English
  description), like the other zone columns.
- **A blank translation falls back to the English `Description`.** So you can add
  a language column and fill it in gradually.

These show up wherever a zone description appears — the tooltip on the zone pill
(book detail) and the hover text in the Zone filter menu — and switch with the
app's language.

### After editing

Reads are live, so editing a translation just needs a reload. Adding a brand-new
`Description (xx)` **column** is picked up by header name, so it needs the Apps
Script backend deployed with the current `apps-script/` code (`clasp push` +
redeploy) once — after that, editing values needs no redeploy.
