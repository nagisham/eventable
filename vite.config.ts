import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		alias: {
			src: resolve("src"),
		},
	},
	build: {
		minify: true,
		sourcemap: true,
		outDir: "package/eventable",
		lib: {
			name: "@nagisham/eventable",
			entry: "src/main.ts",
			fileName: "index",
			formats: ["es", "cjs"],
		},
		rollupOptions: {
			external: ["@nagisham/standard"],
		},
	},
});
