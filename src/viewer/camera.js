// Pure camera math. A camera maps world to screen: screen = world * z + (x, y).

export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 8;

export const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export const pan = (cam, dx, dy) => ({ x: cam.x + dx, y: cam.y + dy, z: cam.z });

// Zoom by a factor while keeping the world point under (sx, sy) fixed on screen.
export function zoomAt(cam, factor, sx, sy) {
	const z = clampZoom(cam.z * factor);
	const k = z / cam.z;
	return { x: sx - (sx - cam.x) * k, y: sy - (sy - cam.y) * k, z };
}

export function bounds(boards) {
	const minX = Math.min(...boards.map((b) => b.x));
	const minY = Math.min(...boards.map((b) => b.y));
	const maxX = Math.max(...boards.map((b) => b.x + b.w));
	const maxY = Math.max(...boards.map((b) => b.y + b.h));
	return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Fit a world rect into a viewport with padding (screen pixels) on every side.
export function fit(rect, vw, vh, pad) {
	const z = clampZoom(Math.min((vw - 2 * pad) / rect.w, (vh - 2 * pad) / rect.h));
	return { x: (vw - rect.w * z) / 2 - rect.x * z, y: (vh - rect.h * z) / 2 - rect.y * z, z };
}

// Put world point (wx, wy) at the viewport center at zoom z.
export const centerOn = (wx, wy, z, vw, vh) => ({ x: vw / 2 - wx * z, y: vh / 2 - wy * z, z: clampZoom(z) });

export const worldCenter = (cam, vw, vh) => ({ x: (vw / 2 - cam.x) / cam.z, y: (vh / 2 - cam.y) / cam.z });

// Indices of boards in reading order: rows top to bottom, then left to right.
// A board joins a row when its top is above the middle of the row's first board.
export function readingOrder(boards) {
	const byY = boards.map((b, i) => ({ ...b, i })).sort((a, b) => a.y - b.y || a.x - b.x);
	const rows = [];
	for (const b of byY) {
		const row = rows.at(-1);
		if (row && b.y < row[0].y + row[0].h / 2) row.push(b);
		else rows.push([b]);
	}
	return rows.flatMap((row) => row.sort((a, b) => a.x - b.x).map((b) => b.i));
}

// Index of the board whose center is closest to world point (wx, wy).
export function nearest(boards, wx, wy) {
	let best = 0;
	let bestD = Infinity;
	boards.forEach((b, i) => {
		const d = Math.hypot(b.x + b.w / 2 - wx, b.y + b.h / 2 - wy);
		if (d < bestD) [best, bestD] = [i, d];
	});
	return best;
}

// Camera partway (t in 0..1) between two cameras: the world center moves linearly and zoom geometrically.
export function between(from, to, t, vw, vh) {
	const a = worldCenter(from, vw, vh);
	const b = worldCenter(to, vw, vh);
	const z = from.z * (to.z / from.z) ** t;
	return centerOn(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, z, vw, vh);
}

// Wheel delta (pixels) to zoom factor. Trackpad pinches send small deltas, mouse wheels large ones.
export function wheelZoomFactor(deltaY) {
	const d = Math.max(-50, Math.min(50, deltaY));
	return Math.exp(-d * 0.01);
}

// The URL hash stores the world center and zoom so links survive different viewport sizes.
export function formatHash(cam, vw, vh) {
	const c = worldCenter(cam, vw, vh);
	return `#${Math.round(c.x)},${Math.round(c.y)},${+cam.z.toFixed(4)}`;
}

export function parseHash(hash) {
	const m = /^#(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/.exec(hash);
	if (!m) return null;
	const z = Number(m[3]);
	if (!(z > 0)) return null;
	return { x: Number(m[1]), y: Number(m[2]), z };
}
