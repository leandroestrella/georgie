<img src="assets/georgie.gif" alt="georgie animated avatar" width=50% height=50%>

# georgie

a web app for managing our physical home library — browsing, cataloguing, lending, and exchanging the books on our shelves.

**georgie** was the family nickname of jorge luis borges, inherited from the english side of his family. before he was the writer who imagined paradise as a kind of library, he was a boy called georgie who grew up roaming his father's library in buenos aires — the place he would mythologize for the rest of his life, and to which he eventually returned as director of argentina's national library. this project borrows his nickname for a much smaller library: the one at home.

> live at [georgie.leandroestrella.com](https://georgie.leandroestrella.com/)

> 🚧 under construction — see [PLAN.md](PLAN.md) for the implementation plan.

## how it works?

the catalog lives in a google sheet. a static web app reads and displays it publicly; admins sign in with google to make changes, which flow through a google apps script api back into the sheet.

```mermaid
%%{init: {'theme': 'dark'}}%%
flowchart LR
    V[visitor] -->|browse, search, filter| SPA[georgie web app]
    A[admin] -->|google sign-in| SPA
    SPA -->|read catalog| GAS[apps script api]
    SPA -->|writes, token-verified| GAS
    GAS --> SHEET[(google sheet)]
    SPA -->|isbn metadata + covers| EXT[google books / open library]
```

## features

- 📚 public, read-only catalog — search, filter and sort by zone, theme, owner, language and more
- 🔎 book details fetched from the web by isbn (google books + open library), covers included
- ✏️ admin sign-in to add, edit and archive books
- 🤝 loan tracking — flag a book as borrowed, by whom and since when
- 🔁 exchange flag for books offered on book-exchange platforms
- 🗂 categories driven by the sheet itself: zones (with their own colors) grouping themes, mirroring the physical shelves
- 🌍 interface in english, italiano and español
- 🪪 human-readable call-number ids (`ORW-198-1950`)

## tech stack

- [vite](https://vitejs.dev/) + [react](https://react.dev/) + [typescript](https://www.typescriptlang.org/) — static frontend
- [tailwind css](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) — styling and components
- [react-i18next](https://react.i18next.com/) — internationalization
- [google apps script](https://developers.google.com/apps-script) + [clasp](https://github.com/google/clasp) — backend api bound to the sheet
- [google identity services](https://developers.google.com/identity) — admin sign-in
- [google sheets](https://www.google.com/sheets/about/) — the database
- [ftp-deploy-action](https://github.com/SamKirkland/FTP-Deploy-Action) — deploys to cpanel on push to `master`

## repository layout

```
web/          the spa (vite + react)
apps-script/  the backend api (synced with clasp)
```

## run your own instance

georgie is a template for anyone who wants to catalog their own shelves:

1. copy the google sheet template (a `Catalog` tab with the book columns, a `Zones` tab defining your categories, a `Lists` tab for owners/languages)
2. create a bound apps script on your sheet: `cd apps-script`, `npm install`, `npx clasp login`, then `clasp clone <scriptId>` (or create the project in the sheet's Extensions → Apps Script and `clasp push`). deploy it as a web app ("execute as: me", "access: anyone")
3. create a google oauth client id for the sign-in button
4. set your admin emails in the script properties
5. copy `web/.env.example` to `web/.env.local` and fill in `VITE_API_URL` (your `/exec` url) and `VITE_GOOGLE_CLIENT_ID` — both are public, so they can also live in github repo secrets for the deploy action
6. `npm install && npm run build` in `web/`, and host the `dist/` folder anywhere static files live

both config values are safe to publish (the oauth client id is public by design, and writes are gated server-side by token verification) — nothing secret ever lands in the repo.

## development

work happens on the `develop` branch; merging to `master` triggers the build and ftp deploy to cpanel via github actions.

```bash
cd web
npm install
npm run dev
```

## license

[apache 2.0](LICENSE)
