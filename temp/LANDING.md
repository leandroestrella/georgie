# georgie — placeholder landing page

A simple black & white "coming soon" page for **georgie**, shown while the real app is being built. Intentionally light on technical detail. This is separate from the actual project (see [README.md](README.md)).

## What's here

- **`index.html`** — the entire landing page. Self-contained (HTML + CSS + a small inline script, no dependencies, no build step). Open it in any browser to preview.

## Design

- Black & white only (the whole page is grayscale-filtered, so even color source assets render B&W).
- All text lowercase.
- Each content block (tagline, subtag, badge) stays on a single line — no wrapping.
- Structure: hero image, the name "georgie", a tagline, a subtag, and a "coming soon" badge. No footer.

## Languages

Three languages with a top-center toggle: **es / it / en**.

Default is picked from the visitor's **browser language** (`navigator.language`), falling back to english — *not* IP/geolocation based. All strings live in the `i18n` object inside `index.html`; edit there to change wording.

## Assets (drop-in required)

Two files must sit next to `index.html`:

- **`georgie.gif`** — the animated hero image.
- **`favicon.jpg`** — the browser tab icon.

The page references them by these exact filenames; without them you'll see a broken-image icon and no favicon.

## Notes / ideas

- Add the actual `georgie.gif` and `favicon.jpg` assets.
- Copy is placeholder — align it with the real project description in `README.md` when ready.
- Optional: remember the visitor's manual language choice via `localStorage` so it isn't re-guessed on return visits.
- Decide where this should ultimately live (repo root currently) so it doesn't collide with the `web/` app build.
