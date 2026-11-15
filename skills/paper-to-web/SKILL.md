---
name: paper-to-web
description: Publish a Paper (paper.design) page as a pannable, zoomable web page on the user's own paper-to-web instance, a Cloudflare Worker, and get back a shareable link. Use when asked to publish, share, put online, get a link for, or view on a phone a Paper page, canvas, or set of artboards, to republish pages published before, to change a published page's background color, or to set up paper-to-web.
---

# paper-to-web

[paper-to-web](https://github.com/zeke/paper-to-web) exports every visible artboard on one Paper page as WebP, uploads the images to Cloudflare R2, and serves a viewer that lays the boards out at their canvas positions. Each page gets a public, unguessable URL with a 12-character ID on the user's own Worker.

## Find the instance

Read `~/.config/paper-to-web/config.json` (`$XDG_CONFIG_HOME/paper-to-web/` if that's set). It has `url`, the deployed Worker, and `checkout`, the local clone. Run every command below from `checkout`.

If the file or the checkout is missing, set up:

1. Check for macOS, Node 24+ and git. Paper Desktop has to be open to publish.
2. Ask where to clone, defaulting to `~/paper-to-web`, then `git clone https://github.com/zeke/paper-to-web <dir>`.
3. Make sure `npx cf auth whoami` shows the account the user wants. If not, have them run `npx cf auth login`. The account needs an R2 subscription, which the user adds once in the dashboard under Storage & databases > R2 (free tier included). If the first deploy fails on the bucket, that's the likely cause.
4. Run `script/setup`. It installs dependencies and deploys the Worker; the R2 bucket is created on first deploy. It then saves the URL and checkout path to the config file. For a custom domain on a zone in the same account, put `PAPER_TO_WEB_DOMAIN=<hostname>` in the checkout's `.env` before deploying; check that no other Worker already serves that hostname, because deploying takes it over.

The worker and bucket are both named `paper-to-web`. Before the first deploy, check that the account has no unrelated Worker with that name.

Publish state (`pages.json`, which maps Paper pages to their public URLs) lives in the config directory, not the checkout, so a new clone keeps old URLs. It's per machine: publishing the same page from another machine creates a new URL.

## Publish

Page URLs look like `https://app.paper.design/file/<fileId>/<pageId>`. Ask the user for one, or get `url` from the Paper MCP's `get_basic_info` if those tools are available. The publisher talks to Paper's local MCP server directly, so it doesn't need them.

Publishing makes the page public to anyone with the link. Confirm the page before publishing a new one.

```bash
script/publish 'https://app.paper.design/file/<fileId>/<pageId>'
```

- Several URLs publish several pages.
- No URLs republishes every page published before, keeping their URLs.
- `--background '<css color>'` sets the page background (default `#282828`). It's remembered for later republishes.
- `--local` uploads to local R2 for `script/server` instead of production.

The last line per page is `<page name>: <url>/<id>`. Give the user that URL.

## Troubleshooting

- "More than one account available": set `CLOUDFLARE_ACCOUNT_ID` for the command.
- `code: 7403` or `code: 10000` while `npx cf auth whoami` shows the right account: a stray `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_API_KEY` env var is overriding the login. Rerun with those unset.
- Paper connection errors: Paper Desktop isn't open, or its MCP server is off.

## Notes

- Only visible artboards are published.
- Republishing an unchanged page still re-uploads some images: Paper's WebP exports aren't byte-identical across runs.
- Exports pass through `~/Downloads` and are deleted after reading.
- Never share file IDs, node IDs, or the config directory's contents. Only viewer URLs are meant to be public.
- To change the project itself, read its `AGENTS.md`.
