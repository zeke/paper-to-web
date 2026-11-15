# paper-to-web

[Paper](https://paper.design) is a design tool with an infinite canvas. This project publishes a single Paper page as a web page you can pan and zoom on a phone or desktop. Each artboard keeps its position, its label and the canvas background from Paper.

Drag with one finger or the mouse to move around. Pinch, Cmd/Ctrl+scroll or `+`/`-` to zoom. Arrow keys step from one artboard to the next, and `0` fits everything.

Images live in Cloudflare R2 and a Cloudflare Worker serves the viewer. Each published page gets a short, unguessable link. That's not access control: anyone with the link can view it.

## Set up your own

You need a Mac with [Paper Desktop](https://paper.design), Node.js 24 or newer, and a Cloudflare account with [R2 enabled](https://developers.cloudflare.com/r2/get-started/) (it has a free tier, but turning it on goes through a checkout in the dashboard). Paste this into your coding agent:

```text
Set up my own paper-to-web instance and install its agent skill:

https://github.com/zeke/paper-to-web

Install the skill with `npx skills add zeke/paper-to-web`, then follow it.
```

After that, ask your agent to publish a Paper page and it will reply with a link.

See [AGENTS.md](AGENTS.md) for setup, scripts and architecture.

Prior art: [zeke/paper-previews-starter](https://github.com/zeke/paper-previews-starter).
