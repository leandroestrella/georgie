# Owner, reader & zone markers

Each **owner/reader** shows a small badge and each **zone** shows a small icon
throughout the app (catalog cards, the table, the filter menus). These "markers"
are read from the spreadsheet, so you can change them without touching code.

A marker's value is **auto-detected**:

- starts with `http://` or `https://` → rendered as an **image** (like a book's
  `Cover URL`);
- anything else → rendered as **emoji / text** (e.g. `🖍️`, `✊`).

## Where to put them

### Zones → a `Marker` column on the **Zones** tab

Add a column headed exactly **`Marker`**. Fill it on each zone's **title row**
(the same row that has the zone name and description); theme-only rows below it
are left blank.

| Title (zone)                              | Description | Themes | **Marker** |
| ----------------------------------------- | ----------- | ------ | ---------- |
| Contemporary Art, Curation & Design       | …           | …      | `🖍️`       |
| Radical Politics, Philosophy & Society    | …           | …      | `✊`        |
| Net-Art, Cybernetics & Sonic Fictions     | …           | …      | `https://example.com/net-art.png` |

### Owners & readers → an `Owner marker` column on the **Lists** tab

Add a column headed exactly **`Owner marker`**, next to the existing
`Owner options` column. Put each owner's marker on the **same row** as their name.

| Owner options | Owner marker |
| ------------- | ------------ |
| leandro       | `https://www.leandroestrella.com/img/favicon.ico` |
| maria         | `🐈`          |
| hugo          |              |

Readers (the `Read by` field) are the same people as owners, so they reuse these
same owner markers automatically — there's no separate reader column.

## After editing the sheet

Reload the app. Reads are public, so no sign-in is needed to see the new markers.

> **First-time setup only:** the backend has to know about the two new columns.
> They're parsed by header name, so once the Apps Script backend is deployed with
> the current `apps-script/` code (`clasp push` + redeploy), adding/removing the
> columns needs no further code changes.

## Fallbacks (so nothing looks broken)

If a marker cell is blank (or the columns don't exist yet), the app falls back to
the built-in maps in
[`web/src/catalog/ownerLogos.ts`](../web/src/catalog/ownerLogos.ts) and
[`web/src/catalog/zoneEmojis.ts`](../web/src/catalog/zoneEmojis.ts), and finally
(for an owner with nothing at all) to the owner's initial. Once the sheet
provides a marker, it always wins over these built-ins.
