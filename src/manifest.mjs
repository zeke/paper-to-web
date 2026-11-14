// Pure helpers for turning Paper page data into a viewer manifest.

export const DEFAULT_BACKGROUND = "#282828";

// https://app.paper.design/file/<fileId>/<pageId>
export function parsePageUrl(input) {
	const url = new URL(input);
	const m = /^\/file\/([^/]+)\/([^/]+)/.exec(url.pathname);
	if (url.hostname !== "app.paper.design" || !m) throw Error(`Not a Paper page URL: ${input}`);
	return { fileId: m[1], pageId: m[2] };
}

// Width and height of a WebP image from its header.
export function webpSize(bytes) {
	const b = Buffer.from(bytes);
	if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") throw Error("Not a WebP image");
	const chunk = b.toString("ascii", 12, 16);
	if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
	if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
	if (chunk === "VP8L") {
		const bits = b.readUInt32LE(21);
		return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
	}
	throw Error(`Unknown WebP chunk ${chunk}`);
}

// boards: [{ name, worldX, worldY, width, height, lo: hash, hi: hash, hiSize: {width, height} }]
// Sizes Paper leaves null (fit-content boards on inactive pages) come from the 2x export.
export function buildManifest({ title, background, boards }) {
	return {
		title,
		background: background ?? DEFAULT_BACKGROUND,
		boards: boards.map((b) => {
			if (b.worldX == null || b.worldY == null)
				throw Error(`Paper reported no position for "${b.name}". Open the page in Paper and retry.`);
			return {
				name: b.name,
				x: b.worldX,
				y: b.worldY,
				w: b.width ?? b.hiSize.width / 2,
				h: b.height ?? b.hiSize.height / 2,
				lo: `/img/${b.lo}.webp`,
				hi: `/img/${b.hi}.webp`,
			};
		}),
	};
}
