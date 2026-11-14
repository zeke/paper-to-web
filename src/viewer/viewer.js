import {
	bounds,
	centerOn,
	fit,
	formatHash,
	pan,
	parseHash,
	wheelZoomFactor,
	worldCenter,
	zoomAt,
} from "/camera.js";

const PAD = 48;
const LABEL_GAP = 6;
const KEY_PAN = 100;
const KEY_ZOOM = 1.25;
// Low-res images are exported at 0.5x. Swap to 2x once they would be upscaled.
const HI_RES_AT = 0.6;

const canvas = document.getElementById("canvas");
const manifest = await (await fetch(`${location.pathname}.json`)).json();
document.title = manifest.title;
document.documentElement.style.background = manifest.background;

const boards = manifest.boards.map((b) => {
	const img = document.createElement("img");
	img.src = b.lo;
	img.alt = b.name;
	img.draggable = false;
	img.decoding = "async";
	const label = document.createElement("div");
	label.className = "label";
	label.textContent = b.name;
	canvas.append(img, label);
	return { ...b, img, label, upgraded: false };
});
const world = bounds(boards);

const vw = () => canvas.clientWidth;
const vh = () => canvas.clientHeight;
const fitAll = () => fit(world, vw(), vh(), PAD);

let cam = (() => {
	const h = parseHash(location.hash);
	return h ? centerOn(h.x, h.y, h.z, vw(), vh()) : fitAll();
})();

let frame = 0;
let hashTimer = 0;
function set(next) {
	cam = next;
	if (!frame) frame = requestAnimationFrame(render);
	clearTimeout(hashTimer);
	hashTimer = setTimeout(() => history.replaceState(null, "", formatHash(cam, vw(), vh())), 250);
}

function render() {
	frame = 0;
	const { x, y, z } = cam;
	const w = vw();
	const h = vh();
	const wantHi = z * devicePixelRatio > HI_RES_AT;
	for (const b of boards) {
		const sx = b.x * z + x;
		const sy = b.y * z + y;
		const sw = b.w * z;
		const sh = b.h * z;
		b.img.style.transform = `translate(${sx}px, ${sy}px)`;
		b.img.style.width = `${sw}px`;
		b.img.style.height = `${sh}px`;
		b.label.style.transform = `translate(${sx}px, ${sy - LABEL_GAP}px) translateY(-100%)`;
		b.label.style.width = `${sw}px`;
		b.label.hidden = sw < 24;
		const visible = sx < w && sy < h && sx + sw > 0 && sy + sh > 0;
		if (wantHi && visible && !b.upgraded) upgrade(b);
	}
}

function upgrade(b) {
	b.upgraded = true;
	const img = new Image();
	img.src = b.hi;
	img.decode().then(
		() => (b.img.src = b.hi),
		() => (b.upgraded = false),
	);
}

// Pointer input: one pointer pans, two pointers pinch-zoom around their midpoint.
const pointers = new Map();
let lastTap = { t: 0, x: 0, y: 0 };

const local = (e) => {
	const r = canvas.getBoundingClientRect();
	return { x: e.clientX - r.left, y: e.clientY - r.top };
};

function gesture() {
	const [a, b] = [...pointers.values()];
	if (!b) return { x: a.x, y: a.y, d: 0 };
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
}

canvas.addEventListener("pointerdown", (e) => {
	if (e.pointerType === "mouse" && e.button !== 0) return;
	canvas.setPointerCapture(e.pointerId);
	pointers.set(e.pointerId, local(e));
	canvas.classList.add("dragging");
	if (e.pointerType === "touch" && pointers.size === 1) {
		const p = local(e);
		if (e.timeStamp - lastTap.t < 300 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) {
			set(zoomAt(cam, 2, p.x, p.y));
			lastTap.t = 0;
		} else lastTap = { t: e.timeStamp, ...p };
	}
});

canvas.addEventListener("pointermove", (e) => {
	if (!pointers.has(e.pointerId)) return;
	const before = gesture();
	pointers.set(e.pointerId, local(e));
	const after = gesture();
	let next = pan(cam, after.x - before.x, after.y - before.y);
	if (before.d && after.d) next = zoomAt(next, after.d / before.d, after.x, after.y);
	set(next);
});

function release(e) {
	pointers.delete(e.pointerId);
	if (!pointers.size) canvas.classList.remove("dragging");
}
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

canvas.addEventListener("dblclick", (e) => {
	const p = local(e);
	set(zoomAt(cam, e.shiftKey ? 0.5 : 2, p.x, p.y));
});

// Wheel: Cmd/Ctrl + wheel (and trackpad pinch, which arrives as ctrlKey) zooms; otherwise pan.
canvas.addEventListener(
	"wheel",
	(e) => {
		e.preventDefault();
		const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh() : 1;
		const dx = e.deltaX * unit;
		const dy = e.deltaY * unit;
		if (e.ctrlKey || e.metaKey) {
			const p = local(e);
			set(zoomAt(cam, wheelZoomFactor(dy), p.x, p.y));
		} else set(pan(cam, -dx, -dy));
	},
	{ passive: false },
);

// Safari on macOS reports trackpad pinches as gesture events instead of ctrl+wheel.
let gestureScale = 1;
canvas.addEventListener("gesturestart", (e) => {
	e.preventDefault();
	gestureScale = 1;
});
canvas.addEventListener("gesturechange", (e) => {
	e.preventDefault();
	if (pointers.size) return; // Touch pinches are handled by pointer events.
	const p = local(e);
	set(zoomAt(cam, e.scale / gestureScale, p.x, p.y));
	gestureScale = e.scale;
});
canvas.addEventListener("gestureend", (e) => e.preventDefault());

window.addEventListener("keydown", (e) => {
	const step = e.shiftKey ? KEY_PAN * 5 : KEY_PAN;
	const cx = vw() / 2;
	const cy = vh() / 2;
	const mod = e.metaKey || e.ctrlKey;
	if (mod && e.key.startsWith("Arrow")) return; // Leave browser shortcuts like Cmd+Left alone.
	let next;
	switch (e.key) {
		case "ArrowLeft":
			next = pan(cam, step, 0);
			break;
		case "ArrowRight":
			next = pan(cam, -step, 0);
			break;
		case "ArrowUp":
			next = pan(cam, 0, step);
			break;
		case "ArrowDown":
			next = pan(cam, 0, -step);
			break;
		case "+":
		case "=":
			next = zoomAt(cam, KEY_ZOOM, cx, cy);
			break;
		case "-":
		case "_":
			next = zoomAt(cam, 1 / KEY_ZOOM, cx, cy);
			break;
		case "0":
			next = fitAll();
			break;
		case "1":
			if (mod) return;
			next = zoomAt(cam, 1 / cam.z, cx, cy);
			break;
		default:
			return;
	}
	e.preventDefault();
	set(next);
});

// Keep the same world point centered when the viewport changes size.
let size = { w: vw(), h: vh() };
new ResizeObserver(() => {
	const c = worldCenter(cam, size.w, size.h);
	size = { w: vw(), h: vh() };
	set(centerOn(c.x, c.y, cam.z, size.w, size.h));
}).observe(canvas);

render();
