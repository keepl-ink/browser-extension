import path from "node:path";
import { crx, type CrxPlugin } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import zip from "vite-plugin-zip-pack";
import { createManifest, type ExtensionTargetBrowser } from "./manifest.config.ts";
import { name, version } from "./package.json";

const isWatchBuild = process.argv.includes("--watch");

function resolveTargetBrowser(mode: string): ExtensionTargetBrowser {
	return mode === "firefox" ? "firefox" : "chrome";
}

function firefoxSidebarManifestPlugin(): CrxPlugin {
	let root = "";
	let sidepanelRefId: string | undefined;

	return {
		name: "firefox-sidebar-manifest",
		configResolved(config) {
			root = config.root;
		},
		transformCrxManifest(manifest) {
			const defaultPanel = manifest.side_panel?.default_path;
			if (!defaultPanel) return manifest;

			sidepanelRefId ??= this.emitFile({
				type: "chunk",
				id: path.join(root, defaultPanel),
				name: path.basename(defaultPanel),
			});

			return manifest;
		},
		renderCrxManifest(manifest) {
			const defaultPanel = manifest.side_panel?.default_path;
			if (!defaultPanel) return manifest;

			const firefoxManifest = manifest as typeof manifest & {
				sidebar_action?: {
					default_panel?: string;
				};
			};

			firefoxManifest.sidebar_action = {
				default_panel: sidepanelRefId
					? this.getFileName(sidepanelRefId)
					: defaultPanel,
			};
			delete firefoxManifest.side_panel;

			firefoxManifest.permissions =
				firefoxManifest.permissions?.filter(
					(permission) => permission !== "sidePanel",
				) ?? [];

			return firefoxManifest;
		},
	};
}

export default defineConfig(({ mode }) => {
	const browser = resolveTargetBrowser(mode);
	const outDir = `dist/${browser}`;
	const plugins = [
		react(),
		crx({ manifest: createManifest(browser), browser }),
		...(browser === "firefox" ? [firefoxSidebarManifestPlugin()] : []),
		...(!isWatchBuild
			? [
					zip({
						inDir: outDir,
						outDir: "release",
						outFileName: `${name}-${version}-${browser}.zip`,
					}),
				]
			: []),
		tailwindcss(),
	];

	return {
		resolve: {
			alias: {
				"@": `${path.resolve(__dirname, "src")}`,
			},
		},
		build: {
			outDir,
			emptyOutDir: true,
		},
		plugins,
		server: {
			cors: {
				origin: [/chrome-extension:\/\//, /moz-extension:\/\//],
			},
		},
	};
});
