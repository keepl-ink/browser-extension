import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export type ExtensionTargetBrowser = "chrome" | "firefox";

export function createManifest(browser: ExtensionTargetBrowser) {
	return defineManifest({
		manifest_version: 3,
		name: pkg.name,
		version: pkg.version,

		icons: {
			48: "public/logo.png",
		},

		background:
			browser === "firefox"
				? {
						scripts: ["src/background/index.ts"], // Firefox MV3 still uses scripts
					}
				: {
						service_worker: "src/background/index.ts",
						type: "module",
					},

		action: {
			default_icon: {
				48: "public/logo.png",
			},
			default_popup: "src/popup/index.html",
		},

		content_scripts: [
			{
				js: ["src/content/main.tsx"],
				matches: ["https://*/*"],
			},
		],

		permissions:
			browser === "chrome"
				? ["sidePanel", "storage", "tabs"]
				: ["storage", "tabs"],

		...(browser === "chrome" && {
			side_panel: {
				default_path: "src/sidepanel/index.html",
			},
		}),

		...(browser === "firefox" && {
			sidebar_action: {
				default_title: pkg.name,
				default_panel: "src/sidepanel/index.html",
			},
		}),
	});
}

export default createManifest("chrome");
