# AGENTS.md

Keep this file current. Whenever you make a meaningful change to the project (stack, scripts, routes, manifest shape, gotchas), update this file in the same change.

## What it is

Turns one Paper (paper.design) page into a pannable, zoomable web page. A local Node script reads the page through Paper Desktop's local MCP server, exports each artboard as WebP, uploads to R2, and a Cloudflare Worker serves a viewer that lays the boards out at their Paper canvas positions.

## Stack

- Worker: `src/index.ts`, configured in `cloudflare.config.ts` (cf CLI, not Wrangler). Worker name and R2 bucket are both `paper-to-web`, deployed at https://paper-to-web.ziki.workers.dev on the personal account. Don't use the name `paper`: that's a separate paper-previews Worker.
- Viewer: `src/viewer/` (vanilla JS, no deps). The Worker imports these files with `?raw` and serves `/viewer.js` and `/camera.js` as ES modules. `camera.js` holds the pure pan/zoom math and is unit tested.
- Publisher: `src/publish.mjs` (Node 24+, macOS, Paper Desktop open). `src/paper.mjs` is the MCP client copied from zeke/paper-previews-starter. `src/manifest.mjs` holds pure helpers.

## Scripts

- `script/bootstrap`: npm install
- `script/server`: `cf dev` on http://localhost:5173 with local R2
- `script/publish [--local] [--background <color>] [<paper page url> ...]`: export and upload pages. No URLs republishes every page in `.state/pages.json`.
- `script/deploy`: `cf deploy`
- `script/test`: `node --test test/`
- `script/lint`: typecheck (`cf workers types && tsc`) and `node --check` on JS. No formatter or linter beyond that.

## Routes

- `/`: 302 to https://github.com/zeke/paper-to-web
- `/<uuid>`: viewer HTML, 404 if no manifest
- `/<uuid>.json`: manifest from R2 `pages/<uuid>.json`, `no-store`
- `/img/<sha256>.webp`: image from R2 `img/<sha256>.webp`, immutable

Manifest: `{ title, background, boards: [{ name, x, y, w, h, lo, hi }] }` in Paper world coordinates. `lo` is a 0.5x export, `hi` is 2x. The viewer swaps to `hi` per visible board once `zoom * devicePixelRatio > 0.6`.

## State

`.state/` is gitignored and private. `pages.json` maps `<fileId>/<pageId>` to its public UUID and optional background. `uploaded-<local|remote>.json` lists image hashes already uploaded. Losing `pages.json` means republishing creates new URLs. Never publish file IDs, node IDs or local paths.

## Gotchas

- Paper's MCP has no page background color. The default is `#282828`, sampled from Paper's dark canvas. Override per page with `--background`; it's remembered in `.state/pages.json`.
- Artboard `worldX`/`worldY`/`width`/`height` can be null on inactive pages for fit-content boards. Sizes fall back to the 2x export's WebP header; a null position throws.
- Paper's WebP exports aren't byte-identical across runs, so republishing re-uploads some unchanged boards. Old images stay in R2 (no cleanup yet).
- `cf r2 objects put --local` and `cf dev` only share data when the publisher passes `--persist-to .cloudflare/state`.
- Export writes to `~/Downloads`. Only read the exact `filePath` Paper returns, then delete it.
- Viewer positions each image and label in screen space every frame (no world-level CSS scale) so boards stay crisp at any zoom.
- Synthetic `PointerEvent`s in browser tests make `setPointerCapture` throw for unknown pointer IDs; stub it in tests. Emulated touch isn't physical-phone testing.

## Input map

Touch: one finger pans, pinch zooms, double tap zooms in. Mouse: drag pans, wheel or trackpad scroll pans, Cmd/Ctrl+wheel and trackpad pinch zoom, double-click zooms in (Shift zooms out). Safari trackpad pinch uses `gesture*` events. Keys: Right/Down fit the next board and Left/Up the previous one, in reading order (rows top to bottom, then left to right), wrapping at the ends, with a 300ms animation (instant under `prefers-reduced-motion`). After manual pan or zoom, stepping starts from the board nearest the center, or from the first/last board when everything is in view. `+`/`=`/`-` zoom, `0` fits all, `1` is 100%. The view is saved in the URL hash as `#worldX,worldY,zoom`.
