// Export Paper pages to R2 as pannable, zoomable web pages.
// Usage: node src/publish.mjs [--local] [--background <css color>] [<paper page url> ...]
// With no URLs, republishes every page published before.
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs, promisify } from "node:util";
import { buildManifest, parsePageUrl, webpSize } from "./manifest.mjs";
import { Paper } from "./paper.mjs";

const BUCKET = "paper-to-web";
const BASE_URL = "https://paper-to-web.ziki.workers.dev";
const STATE = ".state";
const CF = "node_modules/.bin/cf";
// Where `cf dev` keeps local resource state, so script/server sees local publishes.
const LOCAL_STATE = ".cloudflare/state";
const SCALES = { lo: "0.5x", hi: "2x" };

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: { local: { type: "boolean", default: false }, background: { type: "string" } },
});
const target = values.local ? "local" : "remote";

const readJSON = async (file, fallback) => JSON.parse(await readFile(file, "utf8").catch(() => JSON.stringify(fallback)));
const writeJSON = async (file, value) => {
	await mkdir(STATE, { recursive: true });
	await writeFile(file, `${JSON.stringify(value, null, "\t")}\n`);
};

// "<fileId>/<pageId>" -> { id: public UUID, background? }
const pagesFile = join(STATE, "pages.json");
const pages = await readJSON(pagesFile, {});
// Image hashes already uploaded, per target, so reruns skip them.
const uploadedFile = join(STATE, `uploaded-${target}.json`);
const uploaded = new Set(await readJSON(uploadedFile, []));

const keys = positionals.length
	? positionals.map((u) => {
			const { fileId, pageId } = parsePageUrl(u);
			return `${fileId}/${pageId}`;
		})
	: Object.keys(pages);
if (!keys.length) {
	console.error("Usage: script/publish [--local] [--background <color>] <paper page url> ...");
	process.exit(1);
}

const sh = promisify(execFile);
const put = (key, file, type) =>
	sh(CF, ["r2", "objects", "put", key, "--bucket-name", BUCKET, "--file", file, "--content-type", type, ...(values.local ? ["--local", "--persist-to", LOCAL_STATE] : [])]);

const paper = await new Paper().connect();
const tmp = await mkdtemp(join(tmpdir(), "paper-to-web-"));

try {
	for (const key of keys) {
		const [fileId, pageId] = key.split("/");
		const page = (pages[key] ??= { id: randomUUID() });
		if (values.background) page.background = values.background;

		const info = await paper.call("get_basic_info", { fileId, pageId });
		const artboards = [];
		for (const a of info.artboards) {
			const node = await paper.call("get_node_info", { fileId, nodeId: a.id });
			if (node.isVisible) artboards.push(a);
		}
		if (!artboards.length) throw Error(`No visible artboards on "${info.pageName}"`);
		console.log(`${info.pageName}: exporting ${artboards.length} artboards`);

		const images = {}; // artboard id -> { lo, hi, hiSize }
		for (const [size, scale] of Object.entries(SCALES)) {
			const nodes = Object.fromEntries(artboards.map((a) => [a.id, [{ format: "webp", scale }]]));
			const { exports } = await paper.call("export", { fileId, pageId, nodes });
			for (const a of artboards) {
				// Only read the exact path Paper returned, then remove it from ~/Downloads.
				const path = exports.find((e) => e.nodeId === a.id)?.filePath;
				if (!path) throw Error(`Paper returned no ${scale} export for "${a.name}"`);
				const bytes = await readFile(path);
				await rm(path);
				const hash = createHash("sha256").update(bytes).digest("hex");
				await writeFile(join(tmp, `${hash}.webp`), bytes);
				images[a.id] = { ...images[a.id], [size]: hash };
				if (size === "hi") images[a.id].hiSize = webpSize(bytes);
			}
		}

		const manifest = buildManifest({
			title: info.pageName,
			background: page.background,
			boards: artboards.map((a) => ({ ...a, ...images[a.id] })),
		});

		const pending = [...new Set(Object.values(images).flatMap((i) => [i.lo, i.hi]))].filter((h) => !uploaded.has(h));
		console.log(`${info.pageName}: uploading ${pending.length} new images`);
		const queue = [...pending];
		await Promise.all(
			Array.from({ length: 4 }, async () => {
				for (let hash; (hash = queue.shift()); ) {
					await put(`img/${hash}.webp`, join(tmp, `${hash}.webp`), "image/webp");
					uploaded.add(hash);
				}
			}),
		);
		await writeJSON(uploadedFile, [...uploaded]);

		// Upload the manifest last so the page never points at missing images.
		const manifestPath = join(tmp, `${page.id}.json`);
		await writeFile(manifestPath, JSON.stringify(manifest));
		await put(`pages/${page.id}.json`, manifestPath, "application/json");
		await writeJSON(pagesFile, pages);
		console.log(`${info.pageName}: ${values.local ? "" : BASE_URL}/${page.id}`);
	}
} finally {
	await rm(tmp, { recursive: true, force: true });
}
