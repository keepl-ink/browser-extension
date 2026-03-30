/**
 * Central app store.
 *
 * Single source of truth for all extension state. Reads the initial values
 * from extension storage, keeps them reactive via onChanged, and exposes typed
 * action methods that views can call without knowing about storage at all.
 *
 * Wrap the app with <AppProvider> and consume with useAppStore().
 */

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { onServerUrlChanged, onUrlRemoved, onUrlSaved } from "@/lib/callbacks";
import { ext, type ExtensionStorageChange } from "@/lib/ext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedUrl {
	url: string;
	name: string;
	savedAt: number;
}

export type SyncMode = "local" | "keeplink" | "custom";

export interface AppSettings {
	/** Which backend to sync with. Defaults to "local" (no sync). */
	syncMode: SyncMode;
	/** API key for the keepl.ink SaaS backend. */
	keepLinkApiKey: string;
	/** Base URL for a self-hosted custom backend. */
	serverUrl: string;
	/** Bearer token for the custom backend. Stored in extension local storage,
	 *  sandboxed to this extension only. */
	authToken: string;
}

interface AppStore {
	// ── State ──
	savedUrls: SavedUrl[];
	settings: AppSettings;

	// ── URL actions ──
	/** Save the given URL (no-op if already saved). */
	addUrl: (url: string, name: string) => Promise<void>;
	/** Remove a URL from the saved list. */
	removeUrl: (url: string) => Promise<void>;

	// ── Settings actions ──
	/** Persist new settings, notify callbacks, and run the healthz check. */
	saveSettings: (next: Partial<AppSettings>) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppStore | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
	const [savedUrls, setSavedUrls] = useState<SavedUrl[]>([]);
	const [settings, setSettings] = useState<AppSettings>({
		syncMode: "local",
		keepLinkApiKey: "",
		serverUrl: "",
		authToken: "",
	});

	// Keep a ref so url callbacks always see the latest settings without
	// needing to be re-created every time settings changes.
	const settingsRef = useRef(settings);
	useEffect(() => {
		settingsRef.current = settings;
	}, [settings]);

	// Load initial values and subscribe to changes from any context
	// (background, popup, another panel, etc.)
	useEffect(() => {
		ext.storage.local
			.get(["savedUrls", "syncMode", "keepLinkApiKey", "serverUrl", "authToken"])
			.then((result) => {
				setSavedUrls((result.savedUrls as SavedUrl[]) ?? []);
				setSettings({
					syncMode: (result.syncMode as SyncMode) ?? "local",
					keepLinkApiKey: (result.keepLinkApiKey as string) ?? "",
					serverUrl: (result.serverUrl as string) ?? "",
					authToken: (result.authToken as string) ?? "",
				});
			});

		const listener = (
			changes: Record<string, ExtensionStorageChange>,
			areaName: string,
		) => {
			if (areaName !== "local") return;
			if (changes.savedUrls)
				setSavedUrls((changes.savedUrls.newValue as SavedUrl[]) ?? []);
			if (changes.syncMode)
				setSettings((s) => ({ ...s, syncMode: (changes.syncMode.newValue as SyncMode) ?? "local" }));
			if (changes.keepLinkApiKey)
				setSettings((s) => ({ ...s, keepLinkApiKey: (changes.keepLinkApiKey.newValue as string) ?? "" }));
			if (changes.serverUrl)
				setSettings((s) => ({ ...s, serverUrl: (changes.serverUrl.newValue as string) ?? "" }));
			if (changes.authToken)
				setSettings((s) => ({ ...s, authToken: (changes.authToken.newValue as string) ?? "" }));
		};

		ext.storage.onChanged.addListener(listener);
		return () => ext.storage.onChanged.removeListener(listener);
	}, []);

	// Always reads from storage before writing to avoid stale-closure races.
	// Uses settingsRef so the callbacks always have fresh auth credentials.
	const addUrl = useCallback(async (url: string, name: string) => {
		if (!url.startsWith("http")) return;
		const result = await ext.storage.local.get("savedUrls");
		const current: SavedUrl[] = (result.savedUrls as SavedUrl[]) ?? [];
		if (current.some((e) => e.url === url)) return;
		const entry: SavedUrl = { url, name, savedAt: Date.now() };
		await ext.storage.local.set({ savedUrls: [...current, entry] });
		await onUrlSaved(entry, settingsRef.current);
	}, []);

	const removeUrl = useCallback(async (url: string) => {
		const result = await ext.storage.local.get("savedUrls");
		const current: SavedUrl[] = (result.savedUrls as SavedUrl[]) ?? [];
		const updated = current.filter((e) => e.url !== url);
		await ext.storage.local.set({ savedUrls: updated });
		await onUrlRemoved(url, settingsRef.current);
	}, []);

	const saveSettings = useCallback(
		async (next: Partial<AppSettings>) => {
			const merged: AppSettings = { ...settings, ...next };
			await ext.storage.local.set({
				syncMode: merged.syncMode,
				keepLinkApiKey: merged.keepLinkApiKey,
				serverUrl: merged.serverUrl,
				authToken: merged.authToken,
			});
			// Throws if the healthz check fails — callers should catch this.
			await onServerUrlChanged(merged);
		},
		[settings],
	);

	return (
		<AppContext.Provider
			value={{ savedUrls, settings, addUrl, removeUrl, saveSettings }}
		>
			{children}
		</AppContext.Provider>
	);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppStore(): AppStore {
	const ctx = useContext(AppContext);
	if (!ctx) throw new Error("useAppStore must be used within <AppProvider>");
	return ctx;
}
