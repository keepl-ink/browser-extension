export type SavedUrl = {
	url: string;
	name: string;
	savedAt: number;
};

export type SyncMode = "local" | "keeplink" | "custom";

export type AppSettings = {
	syncMode: SyncMode;
	keepLinkApiKey: string;
	serverUrl: string;
	authToken: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
	syncMode: "local",
	keepLinkApiKey: "",
	serverUrl: "",
	authToken: "",
};

export type SidebarView = "remy" | "saved" | "settings";

export const DEFAULT_SIDEBAR_VIEW: SidebarView = "saved";

export type CurrentTabInfo = {
	url: string;
	name: string;
	favIconUrl?: string;
	windowId: number;
};
