import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BACKGROUND, buildManifest, parsePageUrl, webpSize } from "../src/manifest.mjs";

test("parsePageUrl", () => {
	assert.deepEqual(parsePageUrl("https://app.paper.design/file/FILE123/p-N-0"), { fileId: "FILE123", pageId: "p-N-0" });
	assert.throws(() => parsePageUrl("https://app.paper.design/file/FILE123"));
	assert.throws(() => parsePageUrl("https://example.com/file/a/b"));
});

test("buildManifest maps boards and fills null sizes from the 2x export", () => {
	const m = buildManifest({
		title: "Page",
		boards: [
			{ name: "A", worldX: 0, worldY: 0, width: 1440, height: 900, lo: "l1", hi: "h1", hiSize: { width: 2880, height: 1800 } },
			{ name: "B", worldX: 1600, worldY: 0, width: null, height: null, lo: "l2", hi: "h2", hiSize: { width: 2880, height: 2000 } },
		],
	});
	assert.equal(m.background, DEFAULT_BACKGROUND);
	assert.deepEqual(m.boards[1], { name: "B", x: 1600, y: 0, w: 1440, h: 1000, lo: "/img/l2.webp", hi: "/img/h2.webp" });
});

test("buildManifest rejects boards without a position", () => {
	assert.throws(() => buildManifest({ title: "P", boards: [{ name: "A", worldX: null, worldY: 0, hiSize: {} }] }), /no position/);
});

test("webpSize reads VP8X headers", () => {
	const b = Buffer.alloc(30);
	b.write("RIFF", 0);
	b.write("WEBP", 8);
	b.write("VP8X", 12);
	b.writeUIntLE(2879, 24, 3);
	b.writeUIntLE(3509, 27, 3);
	assert.deepEqual(webpSize(b), { width: 2880, height: 3510 });
});
