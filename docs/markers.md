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

| Title (zone)                           | Description | Themes | **Marker** |
| --------------------------------------- | ----------- | ------ | ---------- |
| The Studio (Making & Images)            | …           | …      | `📐`       |
| The Commons (Power & Collective Life)   | …           | …      | `✊`        |
| The Reading Room (Living Fiction)       | …           | …      | `https://example.com/reading-room.png` |

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

Run **Sync → Sync now** from the sheet's menu (or wait for the next visit to pick
the edit up), then reload the app. Reads are public, so no sign-in is needed to
see the new markers. The columns are found by header name, so adding or removing
them needs no code change.

## Fallbacks (so nothing looks broken)

If a marker cell is blank (or the columns don't exist yet), the app falls back to
the built-in maps in
[`web/src/catalog/ownerLogos.ts`](../web/src/catalog/ownerLogos.ts) and
[`web/src/catalog/zoneEmojis.ts`](../web/src/catalog/zoneEmojis.ts), and finally
(for an owner with nothing at all) to the owner's initial. Once the sheet
provides a marker, it always wins over these built-ins.
