import { getOptionalExtensionApi } from "@/lib/browser";
import {
	DEFAULT_SETTINGS,
	DEFAULT_SIDEBAR_VIEW,
	type AppSettings,
	type SavedUrl,
	type SidebarView,
} from "@/lib/types";

type StorageAreaName = "local" | "sync" | "session";

type StorageAdapter<T> = {
	get: () => Promise<T>;
	set: (value: T) => Promise<void>;
	remove: () => Promise<void>;
	subscribe: (listener: (value: T) => void) => () => void;
};

const memorySessionStorage = new Map<string, string>();

const LEGACY_SETTINGS_KEYS = [
	"syncMode",
	"keepLinkApiKey",
	"serverUrl",
	"authToken",
] as const;

function canUseDomSessionStorage() {
	return typeof window !== "undefined" && "sessionStorage" in window;
}

function getStorageArea(areaName: StorageAreaName) {
	const api = getOptionalExtensionApi();

	if (!api) {
		return undefined;
	}

	if (areaName === "session") {
		return api.storage.session;
	}

	return api.storage[areaName];
}

function readSessionFallback<T>(key: string, fallback: T) {
	try {
		if (canUseDomSessionStorage()) {
			const raw = window.sessionStorage.getItem(key);

			return raw ? (JSON.parse(raw) as T) : fallback;
		}

		const raw = memorySessionStorage.get(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

function writeSessionFallback<T>(key: string, value: T) {
	const raw = JSON.stringify(value);

	if (canUseDomSessionStorage()) {
		window.sessionStorage.setItem(key, raw);
		return;
	}

	memorySessionStorage.set(key, raw);
}

function removeSessionFallback(key: string) {
	if (canUseDomSessionStorage()) {
		window.sessionStorage.removeItem(key);
		return;
	}

	memorySessionStorage.delete(key);
}

function subscribeToSessionFallback<T>(key: string, fallback: T, listener: (value: T) => void) {
	if (typeof window === "undefined") {
		return () => {};
	}

	const handleStorage = (event: StorageEvent) => {
		if (event.storageArea !== window.sessionStorage || event.key !== key) {
			return;
		}

		try {
			listener(event.newValue ? (JSON.parse(event.newValue) as T) : fallback);
		} catch {
			listener(fallback);
		}
	};

	window.addEventListener("storage", handleStorage);

	return () => {
		window.removeEventListener("storage", handleStorage);
	};
}

function createStorageAdapter<T>(
	areaName: StorageAreaName,
	key: string,
	fallback: T,
): StorageAdapter<T> {
	return {
		async get() {
			const area = getStorageArea(areaName);

			if (!area) {
				if (areaName === "session") {
					return readSessionFallback(key, fallback);
				}

				return fallback;
			}

			const result = await area.get(key);
			return (result[key] as T | undefined) ?? fallback;
		},

		async set(value) {
			const area = getStorageArea(areaName);

			if (!area) {
				if (areaName === "session") {
					writeSessionFallback(key, value);
				}
				return;
			}

			await area.set({ [key]: value });
		},

		async remove() {
			const area = getStorageArea(areaName);

			if (!area) {
				if (areaName === "session") {
					removeSessionFallback(key);
				}
				return;
			}

			await area.remove(key);
		},

		subscribe(listener) {
			const api = getOptionalExtensionApi();

			if (api?.storage.onChanged) {
				const handleChange = (
					changes: Record<string, { newValue?: unknown }>,
					changedArea: StorageAreaName,
				) => {
					if (changedArea !== areaName || !(key in changes)) {
						return;
					}

					listener((changes[key]?.newValue as T | undefined) ?? fallback);
				};

				api.storage.onChanged.addListener(handleChange);

				return () => {
					api.storage.onChanged?.removeListener(handleChange);
				};
			}

			if (areaName === "session") {
				return subscribeToSessionFallback(key, fallback, listener);
			}

			return () => {};
		},
	};
}

function isSyncMode(value: unknown): value is AppSettings["syncMode"] {
	return value === "local" || value === "keeplink" || value === "custom";
}

export async function readLegacySettingsFromLocal() {
	const area = getStorageArea("local");

	if (!area) {
		return null;
	}

	const result = await area.get([...LEGACY_SETTINGS_KEYS]);
	const syncMode = isSyncMode(result.syncMode) ? result.syncMode : DEFAULT_SETTINGS.syncMode;
	const keepLinkApiKey =
		typeof result.keepLinkApiKey === "string" ? result.keepLinkApiKey : "";
	const serverUrl = typeof result.serverUrl === "string" ? result.serverUrl : "";
	const authToken = typeof result.authToken === "string" ? result.authToken : "";
	const hasLegacyValue = LEGACY_SETTINGS_KEYS.some((key) => {
		const value = result[key];
		return typeof value === "string" ? value.length > 0 : value != null;
	});

	if (!hasLegacyValue) {
		return null;
	}

	return {
		syncMode,
		keepLinkApiKey,
		serverUrl,
		authToken,
	} satisfies AppSettings;
}

export async function clearLegacySettingsFromLocal() {
	const area = getStorageArea("local");

	if (!area) {
		return;
	}

	await area.remove([...LEGACY_SETTINGS_KEYS]);
}

export const savedUrlsStorageAdapter = createStorageAdapter<SavedUrl[]>(
	"local",
	"savedUrls",
	[],
);

export const settingsStorageAdapter = createStorageAdapter<AppSettings>(
	"sync",
	"settings",
	DEFAULT_SETTINGS,
);

export const sidebarViewStorageAdapter = createStorageAdapter<SidebarView>(
	"session",
	"sidebarView",
	DEFAULT_SIDEBAR_VIEW,
);

export type { StorageAdapter };
