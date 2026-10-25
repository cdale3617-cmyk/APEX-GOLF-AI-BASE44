# Base44 Project

Use this repository to run and edit the app locally, then publish changes back through Base44.

Any change pushed to the repo will also be reflected in the Base44 Builder.

## Prerequisites

1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.
4. Install the Base44 CLI: `npm install -g base44@latest`.
5. Install [Deno](https://docs.deno.com/runtime/getting_started/installation/) — the local Base44 backend runs on it.

Run `base44 --help` (or see the [CLI reference](https://docs.base44.com/developers/references/cli/commands/introduction)) for the full command surface.

## Run Locally

Three commands, from the project root:

```bash
base44 login   # one-time per machine
base44 link    # one-time per clone
base44 dev     # local backend + frontend together
```

Open the frontend URL that `base44 dev` prints (typically `http://localhost:5173`).

Notes:

- **Every fresh clone needs `base44 link`.** It writes `base44/.app.jsonc` (the app-id pointer), which is deliberately gitignored. Your app id is in the Builder URL (`app.base44.com/apps/<id>/...`); `base44 link --help` shows the non-interactive flags.
- **`base44 dev` runs the frontend for you** (via `site.serveCommand` in this repo's `base44/config.jsonc`) — never run `npm run dev` yourself: alone it serves a UI with no backend behind it (`[base44] Proxy not enabled`, every `/api` call fails), and alongside `base44 dev` the second Vite silently takes the next port and you end up looking at the wrong one.
- **The app must be published at least once for the UI to load under `base44 dev`.** The frontend boots by fetching app settings from the hosted app; before the first publish that fails and every page redirects to login. The local API works regardless.
- Entities, functions, and auth run locally — entity data is **in-memory only**, wiped when `base44 dev` restarts. Everything else (Core integrations, OAuth login) is forwarded to your deployed app. Full breakdown: [Local development overview](https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview).

## Frontend Only, Hosted Backend

To work on just the frontend against your app's live hosted backend:

```bash
base44 dev --remote
```

⚠️ In this mode writes go to your app's **production data** — plain `base44 dev` keeps everything local.

## Publish Your Changes

After pushing your changes to git, open the Base44 dashboard and publish the app:

```bash
base44 dashboard open
```

This repo syncs to Base44 through git, so publish from the dashboard rather than `base44 deploy` — a CLI deploy ships your local tree directly, bypassing the sync, and the deployed state silently diverges from the repo.

## Repository checks and release boundaries

### Offline course downloads

Live Play uses a lengthways split within the area between the app header and
bottom navigation: 60% map above, 40% controls below, on phones and wide screens.
Short control panels scroll instead of clipping buttons. Searching and selecting
a course does not require downloading it first. Live vector requests are scoped
to the selected hole; changing holes cancels the previous request, clears old
artwork, and frames the next hole. Downloaded vectors are clipped to the same
selected-hole area; complete hole metadata remains available for navigation
and scoring. Satellite imagery itself can still show neighbouring terrain.

Open Tools → Course Downloads (or the link in Saved Courses) while connected.
Search by course or town, download a mapped course, and wait for its on-device
verification. Downloads are separate IndexedDB records with actual hole
coordinates, available vector features, an update action that preserves the
previous pack if it fails, and a remove action that does not delete rounds.
An unmapped course is not marked downloaded. Check any derived par against the
course card; OSM coverage varies, especially for layouts with missing holes.
The app hides online raster tiles while offline and uses saved vector features
and mapped hole positions. **Satellite imagery is not included.** The installed
Android app bundles its screens, but reopening the *website* offline is not
guaranteed; browser storage can be evicted, and uninstalling the app deletes
its local downloads. These packs use OpenStreetMap, not Garmin's licensed
catalogue. User-mapped JSON imports/exports remain separate in Tour Suite.

Run `npm ci`, `npm audit --audit-level=low`, `npm run lint`,
`npm run typecheck`, `npm test`, and `npm run build` before merging.
CI runs these checks and builds a debug Android APK on pull requests.
Application pages, core libraries, API code, and imported UI primitives are
typechecked. Unused generated `src/components/ui` primitives are excluded from
the TypeScript root list but remain linted; imported primitives are followed
and checked by TypeScript.

Round history remains device-local. Saving or deleting now reports blocked/full
storage instead of claiming success. Export important scorecards before clearing
app data or uninstalling. Performance indicators and the relative-to-par
handicap estimate are not measured strokes gained or an official handicap.

`getCourseHoles` now requires a valid Base44 user and validates bounded geometry
before shared-cache access. Cache keys derive from validated geometry rather
than caller-supplied names or keys. Its cache-miss limiter is per runtime
instance; configure platform-wide limits for production abuse protection.

The Worker directory contains a tested replacement API contract, not a recovered
copy of the deployed Worker. Follow `cloudflare-worker/README.md` to back up
the live source, confirm R2 bindings/index, and approve deployment separately.
Base44 backend changes require the dashboard's normal Git-sync publication flow.
Do not overwrite either live service merely to match a local checkout.

Debug APK publication now requires an explicit manual workflow on `main`.
It is not a signed production release. Validate GPS, native permissions,
Bluetooth, motion sensors and S24/Lenovo pairing on the actual hardware;
browser/unit checks cannot establish those outcomes.

## Docs & Support

GitHub integration: [https://docs.base44.com/developers/app-code/local-development/github](https://docs.base44.com/developers/app-code/local-development/github)

Local development: [https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview](https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview)

Support: [https://app.base44.com/support](https://app.base44.com/support)
