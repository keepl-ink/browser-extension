import { create } from "zustand";

import { onUrlRemoved, onUrlSaved } from "@/lib/callback";
import {
	clearLegacySettingsFromLocal,
	readLegacySettingsFromLocal,
	savedUrlsStorageAdapter,
	settingsStorageAdapter,
	sidebarViewStorageAdapter,
} from "@/lib/storage-adapters";
import {
	DEFAULT_SETTINGS,
	DEFAULT_SIDEBAR_VIEW,
	type AppSettings,
	type SavedUrl,
	type SidebarView,
	type SyncMode,
} from "@/lib/types";

type AppStore = {
	hydrated: boolean;
	savedUrls: SavedUrl[];
	settings: AppSettings;
	sidebarView: SidebarView;
	initialize: () => Promise<void>;
	addUrl: (url: string, name: string) => Promise<SavedUrl>;
	removeUrl: (url: string) => Promise<void>;
	saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
	setSidebarView: (view: SidebarView) => Promise<void>;
	isUrlSaved: (url: string) => boolean;
};

let initializePromise: Promise<void> | null = null;
let subscriptionsBound = false;

function normalizeSyncMode(value: unknown): SyncMode {
	return value === "keeplink" || value === "custom" || value === "local"
		? value
		: DEFAULT_SETTINGS.syncMode;
}

function normalizeSettings(settings?: Partial<AppSettings> | null): AppSettings {
	return {
		syncMode: normalizeSyncMode(settings?.syncMode),
		keepLinkApiKey: settings?.keepLinkApiKey?.trim() ?? "",
		serverUrl: settings?.serverUrl?.trim().replace(/\/+$/, "") ?? "",
		authToken: settings?.authToken?.trim() ?? "",
	};
}

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

function normalizeSidebarView(view?: SidebarView) {
	return view === "remy" || view === "saved" || view === "settings"
		? view
		: DEFAULT_SIDEBAR_VIEW;
}

async function hydrateStore() {
	const [savedUrls, storedSettings, storedSidebarView, legacySettings] =
		await Promise.all([
			savedUrlsStorageAdapter.get(),
			settingsStorageAdapter.get(),
			sidebarViewStorageAdapter.get(),
			readLegacySettingsFromLocal(),
		]);

	const settings =
		legacySettings &&
		JSON.stringify(storedSettings) === JSON.stringify(DEFAULT_SETTINGS)
			? normalizeSettings(legacySettings)
			: normalizeSettings(storedSettings);

	if (legacySettings) {
		await settingsStorageAdapter.set(settings);
		await clearLegacySettingsFromLocal();
	}

	return {
		savedUrls: normalizeSavedUrls(savedUrls),
		settings,
		sidebarView: normalizeSidebarView(storedSidebarView),
	};
}

function bindSubscriptions(setState: (partial: Partial<AppStore>) => void) {
	if (subscriptionsBound) {
		return;
	}

	subscriptionsBound = true;

	savedUrlsStorageAdapter.subscribe((savedUrls) => {
		setState({ savedUrls: normalizeSavedUrls(savedUrls) });
	});

	settingsStorageAdapter.subscribe((settings) => {
		setState({ settings: normalizeSettings(settings) });
	});

	sidebarViewStorageAdapter.subscribe((sidebarView) => {
		setState({ sidebarView: normalizeSidebarView(sidebarView) });
	});
}

export const useAppStore = create<AppStore>((set, get) => ({
	hydrated: false,
	savedUrls: [],
	settings: DEFAULT_SETTINGS,
	sidebarView: DEFAULT_SIDEBAR_VIEW,

	async initialize() {
		if (!initializePromise) {
			initializePromise = (async () => {
				const state = await hydrateStore();
				set({
					...state,
					hydrated: true,
				});
				bindSubscriptions(set);
			})().catch((error) => {
				initializePromise = null;
				throw error;
			});
		}

		await initializePromise;
	},

	async addUrl(url, name) {
		await get().initialize();

		const entry: SavedUrl = {
			url,
			name: name.trim() || url,
			savedAt: Date.now(),
		};
		const nextSavedUrls = normalizeSavedUrls([
			...get().savedUrls.filter((savedUrl) => savedUrl.url !== url),
			entry,
		]);

		await savedUrlsStorageAdapter.set(nextSavedUrls);
		set({ savedUrls: nextSavedUrls });

		void onUrlSaved(entry, get().settings).catch((error) => {
			console.error("URL saved callback failed.", error);
		});

		return entry;
	},

	async removeUrl(url) {
		await get().initialize();

		const nextSavedUrls = get().savedUrls.filter(
			(savedUrl) => savedUrl.url !== url,
		);

		await savedUrlsStorageAdapter.set(nextSavedUrls);
		set({ savedUrls: nextSavedUrls });

		void onUrlRemoved(url, get().settings).catch((error) => {
			console.error("URL removal callback failed.", error);
		});
	},

	async saveSettings(settings) {
		await get().initialize();

		const nextSettings = normalizeSettings({
			...get().settings,
			...settings,
		});

		await settingsStorageAdapter.set(nextSettings);
		set({ settings: nextSettings });

		return nextSettings;
	},

	async setSidebarView(view) {
		const nextView = normalizeSidebarView(view);
		await sidebarViewStorageAdapter.set(nextView);
		set({ sidebarView: nextView });
	},

	isUrlSaved(url) {
		return get().savedUrls.some((savedUrl) => savedUrl.url === url);
	},
}));

export async function initializeAppStore() {
	await useAppStore.getState().initialize();
}
