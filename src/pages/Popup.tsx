import { useEffect } from "react";
import "./Popup.css";
import type browser from "webextension-polyfill";

async function openExtensionSidebar() {
	const ffApi = globalThis.browser as
		| (typeof browser & {
				sidebarAction?: {
					open: () => Promise<void>;
				};
		  })
		| undefined;

	if (ffApi?.sidebarAction?.open) {
		await ffApi.sidebarAction.open();
		window.close();
		return;
	}

	const chromeApi = globalThis.chrome as
		| (typeof chrome & {
				sidePanel?: {
					open: (options: { windowId: number }) => Promise<void>;
				};
		  })
		| undefined;

	if (chromeApi?.sidePanel?.open) {
		const [tab] = await chromeApi.tabs.query({
			active: true,
			currentWindow: true,
		});

		if (tab?.windowId != null) {
			await chromeApi.sidePanel.open({ windowId: tab.windowId });
			window.close();
			return;
		}
	}

	throw new Error(
		`No supported sidebar API in this browser. browser.sidebarAction=${!!ffApi?.sidebarAction}, chrome.sidePanel=${!!chromeApi?.sidePanel}`,
	);
}

export default function Popup() {
	useEffect(() => {
		console.log("Hello from the popup!");
	}, []);

	return (
		<div>
			<button onClick={openExtensionSidebar}>Open Sidebar</button>
		</div>
	);
}
