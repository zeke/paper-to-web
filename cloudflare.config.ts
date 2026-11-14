import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
	worker: {
		name: "paper-to-web",
		compatibilityDate: "2026-10-01",
		entrypoint,
		env: {
			BUCKET: bindings.r2({ name: "paper-to-web" }),
		},
	},
});
