import browser from "webextension-polyfill";
import type Browser from "webextension-polyfill";

export const ext = browser;

const sidepanelPagePath = "src/sidepanel/index.html";

const chromeSidePanel = globalThis.chrome?.sidePanel;

const sidebarAction = (() => {
	const extSidebarAction = Reflect.get(
		ext as object,
		"sidebarAction",
	) as Browser.SidebarAction.Static | undefined;

	if (extSidebarAction) return extSidebarAction;

	const runtimeBrowser = Reflect.get(globalThis as object, "browser") as
		| { sidebarAction?: Browser.SidebarAction.Static }
		| undefined;

	return runtimeBrowser?.sidebarAction;
})();

export const panelLabel = chromeSidePanel
	? "panel"
	: sidebarAction
		? "sidebar"
		: "panel";

/**
 * Opens the extension panel/sidebar depending on the browser.
 *
 * Chromium:
 * - Uses chrome.sidePanel.open({ windowId })
 *
 * Firefox:
 * - Uses browser.sidebarAction.open()
 * - Must be called directly from a user gesture handler
 *   like browser.action.onClicked / menus.onClicked / commands.onCommand
 *
 * Fallback:
 * - Opens the panel page in a normal tab
 */
export async function openExtensionPanel(windowId?: number): Promise<void> {
	if (chromeSidePanel) {
		if (windowId == null) {
			const currentWindow = await ext.windows.getCurrent();
			if (currentWindow.id == null) {
				throw new Error("Could not determine current window ID.");
			}

			await chromeSidePanel.open({ windowId: currentWindow.id });
			return;
		}

		await chromeSidePanel.open({ windowId });
		return;
	}

	if (sidebarAction) {
		try {
			await sidebarAction.open();
			return;
		} catch (error) {
			console.error(
				"Failed to open Firefox sidebar. Make sure this is called directly from a user action handler.",
				error,
			);
		}
	}

	await ext.tabs.create({
		url: ext.runtime.getURL(sidepanelPagePath),
		windowId,
		active: true,
	});
}

export async function isExtensionPanelOpen(windowId?: number): Promise<boolean | undefined> {
	if (!sidebarAction || typeof sidebarAction.isOpen !== "function") {
		return undefined;
	}

	try {
		if (windowId != null) {
			return await sidebarAction.isOpen({ windowId });
		}

		return await sidebarAction.isOpen({});
	} catch {
		return undefined;
	}
}

export type ExtensionStorageChange = Browser.Storage.StorageChange;
export type ExtensionTab = Browser.Tabs.Tab;
export type ExtensionTabChangeInfo = Browser.Tabs.OnUpdatedChangeInfoType;
