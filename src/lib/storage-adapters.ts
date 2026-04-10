import {
	checkCustomBackendHealth,
	fetchCustomSavedUrls,
	fetchKeeplinkSavedUrls,
	removeCustomSavedUrl,
	removeKeeplinkSavedUrl,
	saveCustomSavedUrl,
	saveKeeplinkSavedUrl,
} from "@/lib/callback";
import { localSavedUrlsStorage } from "@/lib/extension-storage";
import type { AppSettings, SavedUrl } from "@/lib/types";

type UrlStorageAdapter = {
	kind: AppSettings["syncMode"];
	listUrls: (settings: AppSettings) => Promise<SavedUrl[]>;
	saveUrl: (entry: SavedUrl, settings: AppSettings) => Promise<SavedUrl[]>;
	removeUrl: (url: string, settings: AppSettings) => Promise<SavedUrl[]>;
};

function normalizeSavedUrls(savedUrls: SavedUrl[]) {
	const uniqueByUrl = new Map<string, SavedUrl>();

	for (const entry of savedUrls) {
		if (!entry?.url) {
			continue;
		}

		uniqueByUrl.set(entry.url, {
			url: entry.url,
			name: entry.name?.trim() || entry.url,
			savedAt: typeof entry.savedAt === "number" ? entry.savedAt : Date.now(),
		});
	}

	return [...uniqueByUrl.values()].sort(
		(left, right) => right.savedAt - left.savedAt,
	);
}

const localUrlStorageAdapter: UrlStorageAdapter = {
	kind: "local",

	async listUrls() {
		return normalizeSavedUrls(await localSavedUrlsStorage.get());
	},

	async saveUrl(entry) {
		const savedUrls = normalizeSavedUrls(await localSavedUrlsStorage.get());
		const nextSavedUrls = normalizeSavedUrls([
			...savedUrls.filter((savedUrl) => savedUrl.url !== entry.url),
			entry,
		]);

		await localSavedUrlsStorage.set(nextSavedUrls);

		return nextSavedUrls;
	},

	async removeUrl(url) {
		const savedUrls = normalizeSavedUrls(await localSavedUrlsStorage.get());
		const nextSavedUrls = savedUrls.filter((savedUrl) => savedUrl.url !== url);

		await localSavedUrlsStorage.set(nextSavedUrls);

		return nextSavedUrls;
	},
};

const customBackendUrlStorageAdapter: UrlStorageAdapter = {
	kind: "custom",
	listUrls: fetchCustomSavedUrls,
	saveUrl: saveCustomSavedUrl,
	removeUrl: removeCustomSavedUrl,
};

const keeplinkUrlStorageAdapter: UrlStorageAdapter = {
	kind: "keeplink",
	listUrls: fetchKeeplinkSavedUrls,
	saveUrl: saveKeeplinkSavedUrl,
	removeUrl: removeKeeplinkSavedUrl,
};

export function getUrlStorageAdapter(settings: AppSettings): UrlStorageAdapter {
	switch (settings.syncMode) {
		case "custom":
			return customBackendUrlStorageAdapter;
		case "keeplink":
			return keeplinkUrlStorageAdapter;
		default:
			return localUrlStorageAdapter;
	}
}

export async function validateUrlStorageAdapter(settings: AppSettings) {
	if (settings.syncMode === "custom") {
		await checkCustomBackendHealth(settings);
		return;
	}

	if (settings.syncMode === "keeplink" && !settings.keepLinkApiKey) {
		throw new Error("Keepl.ink API key missing.");
	}
}

export {
	customBackendUrlStorageAdapter,
	keeplinkUrlStorageAdapter,
	localUrlStorageAdapter,
};
export type { UrlStorageAdapter };
