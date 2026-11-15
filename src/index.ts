import { env } from "cloudflare:workers";
import html from "./viewer/index.html?raw";
import viewerJs from "./viewer/viewer.js?raw";
import cameraJs from "./viewer/camera.js?raw";

const REPO = "https://github.com/zeke/paper-to-web";
// 12-character base62 IDs, plus UUIDs from before short IDs.
const PAGE = /^\/([0-9A-Za-z]{12}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\.json)?$/;
const IMAGE = /^\/img\/([0-9a-f]{64})\.webp$/;
const SCRIPTS: Record<string, string> = { "/viewer.js": viewerJs, "/camera.js": cameraJs };

const common = {
	"x-robots-tag": "noindex, nofollow, noarchive",
	"referrer-policy": "no-referrer",
	"x-content-type-options": "nosniff",
};

const respond = (body: BodyInit | null, type: string, cache: string, status = 200) =>
	new Response(body, { status, headers: { ...common, "content-type": type, "cache-control": cache } });

const notFound = () => respond("Not found", "text/plain; charset=utf-8", "no-store", 404);

export default {
	async fetch(request) {
		const { pathname } = new URL(request.url);
		if (pathname === "/") return Response.redirect(REPO, 302);
		if (pathname === "/robots.txt") return respond("User-agent: *\nDisallow: /\n", "text/plain", "public, max-age=3600");
		if (SCRIPTS[pathname]) return respond(SCRIPTS[pathname], "text/javascript; charset=utf-8", "no-cache");

		const image = pathname.match(IMAGE);
		if (image) {
			const object = await env.BUCKET.get(`img/${image[1]}.webp`);
			if (!object) return notFound();
			return respond(object.body, "image/webp", "public, max-age=31536000, immutable");
		}

		const page = pathname.match(PAGE);
		if (!page) return notFound();
		const key = `pages/${page[1]}.json`;
		if (page[2]) {
			const manifest = await env.BUCKET.get(key);
			if (!manifest) return notFound();
			return respond(manifest.body, "application/json", "no-store");
		}
		if (!(await env.BUCKET.head(key))) return notFound();
		return respond(html, "text/html; charset=utf-8", "no-store");
	},
} satisfies ExportedHandler<Env>;
