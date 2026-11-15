// Private publisher state, kept outside the checkout so any clone keeps the same URLs.
import { randomInt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const STATE = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "paper-to-web");

export const readJSON = async (file, fallback) => JSON.parse(await readFile(file, "utf8").catch(() => JSON.stringify(fallback)));

export const writeJSON = async (file, value) => {
	await mkdir(dirname(file), { recursive: true });
	await writeFile(file, `${JSON.stringify(value, null, "\t")}\n`);
};

// The deployed Worker URL from `cf deploy` output.
export function findWorkerUrl(output) {
	return /https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/.exec(output)?.[0];
}

const ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// A 12-character base62 page ID (about 71 random bits) for short, unguessable URLs.
export function newPageId() {
	return Array.from({ length: 12 }, () => ID_ALPHABET[randomInt(62)]).join("");
}
