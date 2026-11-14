import assert from "node:assert/strict";
import { test } from "node:test";
import {
	MAX_ZOOM,
	MIN_ZOOM,
	bounds,
	centerOn,
	fit,
	formatHash,
	parseHash,
	wheelZoomFactor,
	worldCenter,
	zoomAt,
} from "../src/viewer/camera.js";

const toScreen = (cam, wx, wy) => ({ x: wx * cam.z + cam.x, y: wy * cam.z + cam.y });

test("zoomAt keeps the point under the cursor fixed", () => {
	const cam = { x: 30, y: -40, z: 0.5 };
	const next = zoomAt(cam, 3, 200, 150);
	const world = { x: (200 - cam.x) / cam.z, y: (150 - cam.y) / cam.z };
	const s = toScreen(next, world.x, world.y);
	assert.ok(Math.abs(s.x - 200) < 1e-9 && Math.abs(s.y - 150) < 1e-9);
	assert.equal(next.z, 1.5);
});

test("zoom is clamped", () => {
	assert.equal(zoomAt({ x: 0, y: 0, z: 1 }, 1000, 0, 0).z, MAX_ZOOM);
	assert.equal(zoomAt({ x: 0, y: 0, z: 1 }, 1e-6, 0, 0).z, MIN_ZOOM);
});

test("fit centers all boards inside the padded viewport", () => {
	const boards = [
		{ x: 0, y: 0, w: 1440, h: 1755 },
		{ x: 3200, y: 2200, w: 1440, h: 1450 },
	];
	const rect = bounds(boards);
	assert.deepEqual(rect, { x: 0, y: 0, w: 4640, h: 3650 });
	const cam = fit(rect, 1000, 800, 50);
	const tl = toScreen(cam, rect.x, rect.y);
	const br = toScreen(cam, rect.x + rect.w, rect.y + rect.h);
	assert.ok(tl.x >= 50 - 1e-9 && tl.y >= 50 - 1e-9 && br.x <= 950 + 1e-9 && br.y <= 750 + 1e-9);
	assert.ok(Math.abs((tl.x + br.x) / 2 - 500) < 1e-9);
});

test("hash round-trips the world center and zoom", () => {
	const cam = centerOn(1234, -567, 0.25, 800, 600);
	const parsed = parseHash(formatHash(cam, 800, 600));
	assert.deepEqual(parsed, { x: 1234, y: -567, z: 0.25 });
	assert.deepEqual(worldCenter(cam, 800, 600), { x: 1234, y: -567 });
	assert.equal(parseHash("#nope"), null);
	assert.equal(parseHash("#1,2,0"), null);
});

test("wheel zoom direction and limits", () => {
	assert.ok(wheelZoomFactor(-10) > 1);
	assert.ok(wheelZoomFactor(10) < 1);
	assert.equal(wheelZoomFactor(1000), wheelZoomFactor(50));
});
