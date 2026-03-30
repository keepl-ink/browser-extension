chrome.action.onClicked.addListener(async (tab) => {
	// Must open side panel synchronously within the user gesture
	chrome.sidePanel.open({ windowId: tab.windowId! });

	const url = tab.url ?? "";
	const name = tab.title ?? "";

	console.log("[remembery] clicked:", { url, name });

	const { savedUrls = [] } = await chrome.storage.local.get("savedUrls");
	const alreadySaved = savedUrls.some(
		(entry: { url: string }) => entry.url === url,
	);

	if (!alreadySaved && url) {
		savedUrls.push({ url, name, savedAt: Date.now() });
		await chrome.storage.local.set({ savedUrls });
	}
});
