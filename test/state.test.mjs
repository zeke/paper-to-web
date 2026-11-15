import assert from "node:assert/strict";
import { test } from "node:test";
import { findWorkerUrl } from "../src/state.mjs";

test("findWorkerUrl", () => {
	const output = "│  Deployed paper-to-web triggers (0.62 sec)\n│    https://paper-to-web.example.workers.dev\n│  Current Version ID: abc";
	assert.equal(findWorkerUrl(output), "https://paper-to-web.example.workers.dev");
	assert.equal(findWorkerUrl("Build complete"), undefined);
});
