import type { CurrentTabInfo } from "@/lib/types";

type StorageAreaName = "local" | "sync" | "session";

type StorageChange = {
	oldValue?: unknown;
	newValue?: unknown;
};

type StorageChangeListener = (
	changes: Record<string, StorageChange>,
	areaName: StorageAreaName,
) => void;

type BrowserTab = {
	active?: boolean;
	id?: number;
	url?: string;
	title?: string;
	favIconUrl?: string;
	windowId?: number;
};

type BrowserTabChangeInfo = {
	status?: string;
	title?: string;
	url?: string;
};

type ExtensionStorageArea = {
	get: (
		keys?: string | string[] | Record<string, unknown> | null,
	) => Promise<Record<string, unknown>>;
	set: (items: Record<string, unknown>) => Promise<void>;
	remove: (keys: string | string[]) => Promise<void>;
};

type ExtensionApi = {
	scripting?: {
		executeScript: (injection: {
			target: {
				tabId: number;
			};
			func: () => string | null;
		}) => Promise<Array<{ result?: unknown }>>;
	};
	storage: {
		local: ExtensionStorageArea;
		sync: ExtensionStorageArea;
		session?: ExtensionStorageArea;
		onChanged?: {
			addListener: (listener: StorageChangeListener) => void;
			removeListener: (listener: StorageChangeListener) => void;
		};
	};
	tabs: {
		query: (queryInfo: chrome.tabs.QueryInfo) => Promise<BrowserTab[]>;
		create: (
			createProperties: chrome.tabs.CreateProperties,
		) => Promise<BrowserTab | undefined>;
		executeScript?: (
			tabId: number,
			details: {
				code: string;
			},
		) => Promise<unknown[]>;
		onActivated?: {
			addListener: (listener: () => void) => void;
			removeListener: (listener: () => void) => void;
		};
		onUpdated?: {
			addListener: (
				listener: (
					tabId: number,
					changeInfo: BrowserTabChangeInfo,
					tab: BrowserTab,
				) => void,
			) => void;
			removeListener: (
				listener: (
					tabId: number,
					changeInfo: BrowserTabChangeInfo,
					tab: BrowserTab,
				) => void,
			) => void;
		};
	};
	sidePanel?: {
		open: (options: { windowId: number }) => Promise<void>;
	};
	sidebarAction?: {
		open: () => Promise<void>;
	};
};

function readGlobalApi() {
	const root = globalThis as typeof globalThis & {
		browser?: ExtensionApi;
		chrome?: ExtensionApi;
	};

	return root.browser ?? root.chrome;
}

export function getExtensionApi() {
	const api = readGlobalApi();

	if (!api) {
		throw new Error("Extension API unavailable.");
	}

	return api;
}

export function getOptionalExtensionApi() {
	return readGlobalApi();
}

export function isSavableUrl(url?: string) {
	return Boolean(url && /^https?:\/\//.test(url));
}

export function getHostname(url: string) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

export function getFaviconUrl(url: string, favIconUrl?: string) {
	if (favIconUrl) {
		return favIconUrl;
	}
	const hostname = getHostname(url);
	return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
}

async function readHeadTitleFromTab(tab: BrowserTab) {
	if (tab.id == null) {
		return null;
	}

	const api = getOptionalExtensionApi();

	if (!api) {
		return null;
	}

	try {
		if (api.scripting?.executeScript) {
			const [injectionResult] = await api.scripting.executeScript({
				target: { tabId: tab.id },
				func: () =>
					document.head?.querySelector("title")?.textContent?.trim() ||
					document.title?.trim() ||
					null,
			});

			return typeof injectionResult?.result === "string"
				? injectionResult.result.trim()
				: null;
		}

		if (api.tabs.executeScript) {
			const [result] = await api.tabs.executeScript(tab.id, {
				code: `
					(document.head?.querySelector("title")?.textContent || document.title || "")
						.trim();
				`,
			});

			return typeof result === "string" ? result.trim() : null;
		}
	} catch {
		return null;
	}

	return null;
}

async function normalizeTab(tab?: BrowserTab): Promise<CurrentTabInfo | null> {
	if (!tab?.url || !isSavableUrl(tab.url) || tab.windowId == null) {
		return null;
	}

	const headTitle = await readHeadTitleFromTab(tab);

	return {
		url: tab.url,
		name: headTitle || tab.title?.trim() || getHostname(tab.url),
		favIconUrl: tab.favIconUrl || undefined,
		windowId: tab.windowId,
	};
}

export async function queryActiveTab() {
	const [tab] = await getExtensionApi().tabs.query({
		active: true,
		currentWindow: true,
	});

	return await normalizeTab(tab);
}

export function subscribeToActiveTabChanges(onChange: () => void) {
	const api = getExtensionApi();
	const handleActivated = () => {
		onChange();
	};
	const handleUpdated = (
		_tabId: number,
		changeInfo: BrowserTabChangeInfo,
		tab: BrowserTab,
	) => {
		if (!tab.active) {
			return;
		}

		if (
			changeInfo.status === "complete" ||
			changeInfo.title ||
			changeInfo.url
		) {
			onChange();
		}
	};

	api.tabs.onActivated?.addListener(handleActivated);
	api.tabs.onUpdated?.addListener(handleUpdated);

	return () => {
		api.tabs.onActivated?.removeListener(handleActivated);
		api.tabs.onUpdated?.removeListener(handleUpdated);
	};
}

export async function openUrlInNewTab(url: string) {
	await getExtensionApi().tabs.create({ url });
}

export async function openExtensionPanel(windowId: number) {
	const api = getExtensionApi();

	if (api.sidePanel?.open) {
		await api.sidePanel.open({ windowId });
		return true;
	}

	if (api.sidebarAction?.open) {
		await api.sidebarAction.open();
		return true;
	}

	return false;
}
