// Run `cf deploy` and remember the Worker URL and this checkout for script/publish and agents.
// Usage: node src/deploy.mjs [cf deploy flags]
import { spawn } from "node:child_process";
import { join } from "node:path";
import { STATE, findWorkerUrl, readJSON, writeJSON } from "./state.mjs";

// cf prints the URL to stderr, so read both streams.
const child = spawn("node_modules/.bin/cf", ["deploy", ...process.argv.slice(2)], { stdio: ["inherit", "pipe", "pipe"] });
let output = "";
for (const [stream, out] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
	stream.on("data", (chunk) => {
		out.write(chunk);
		output += chunk;
	});
}
const code = await new Promise((resolve) => child.on("close", resolve));
if (code) process.exit(code);

const url = findWorkerUrl(output);
if (url) {
	const file = join(STATE, "config.json");
	await writeJSON(file, { ...(await readJSON(file, {})), url, checkout: process.cwd() });
	console.log(`Saved ${url} to ${file}`);
}
