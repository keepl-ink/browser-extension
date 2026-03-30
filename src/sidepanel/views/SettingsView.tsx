import { createSignal, onMount } from "solid-js";
export default function SettingsView() {
	const [serverUrl, setServerUrl] = createSignal("");
	const [saved, setSaved] = createSignal(false);

	onMount(async () => {
		const { serverUrl: storedUrl = "" } = await chrome.storage.local.get([
			"serverUrl",
		]);
		setServerUrl(storedUrl as string);
		chrome.storage.onChanged.addListener((changes) => {
			if (changes.serverUrl) setServerUrl(changes.serverUrl.newValue ?? "");
		});
	});

	async function saveServerUrl() {
		await chrome.storage.local.set({ serverUrl: serverUrl() });
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	}

	return (
		<div class="settings">
			<h3>Backend</h3>
			<p>Connect remembery to your own backend to sync saved pages.</p>
			<label>
				Server URL
				<input
					type="url"
					placeholder="https://your-server.com"
					value={serverUrl()}
					onInput={(e) => setServerUrl(e.currentTarget.value)}
				/>
			</label>
			<button class="save-btn" onClick={saveServerUrl} type="button">
				{saved() ? "✓ Saved" : "Save"}
			</button>
		</div>
	);
}
