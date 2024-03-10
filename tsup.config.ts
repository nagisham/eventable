import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	outDir: "package/eventable",
	format: "esm",
	dts: true,
	clean: true,
	sourcemap: true,
	minify: "terser",
	external: ['@nagisham/standard']
});
