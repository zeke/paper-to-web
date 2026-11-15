import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

declare const process: { env: Record<string, string | undefined> };
// Optional custom domain, e.g. PAPER_TO_WEB_DOMAIN=paper.example.com in .env. script/deploy loads .env.
const domain = process.env.PAPER_TO_WEB_DOMAIN;

export default defineConfig({
	worker: {
		name: "paper-to-web",
		compatibilityDate: "2026-10-01",
		entrypoint,
		domains: domain ? [domain] : undefined,
		// Keep workers.dev on; cf turns it off when domains are set unless this is explicit.
		workersDev: true,
		env: {
			BUCKET: bindings.r2({ name: "paper-to-web" }),
		},
	},
});
