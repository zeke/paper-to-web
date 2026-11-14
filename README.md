# paper-to-web

[Paper](https://paper.design) is a design tool with an infinite canvas. This project publishes a single Paper page as a web page you can pan and zoom on a phone or desktop. Each artboard keeps its position, its label and the canvas background from Paper.

Drag with one finger or the mouse to move around. Pinch, Cmd/Ctrl+scroll or `+`/`-` to zoom. Arrow keys pan, `0` fits everything.

Images live in Cloudflare R2 and a Cloudflare Worker serves the viewer. Each published page gets an unguessable UUID link. That's not access control: anyone with the link can view it.

See [AGENTS.md](AGENTS.md) for setup, scripts and architecture.

Prior art: [zeke/paper-previews-starter](https://github.com/zeke/paper-previews-starter).
