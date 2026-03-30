import { createSignal, For, onMount, onCleanup, Show } from "solid-js";

interface SavedUrl {
	url: string;
	name: string;
	savedAt: number;
}

interface ContextMenu {
	x: number;
	y: number;
	entry: SavedUrl;
}

function formatDate(ts: number) {
	return new Date(ts).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export default function SavedLinksView() {
	const [savedUrls, setSavedUrls] = createSignal<SavedUrl[]>([]);
	const [contextMenu, setContextMenu] = createSignal<ContextMenu | null>(null);

	onMount(async () => {
		const { savedUrls = [] } = await chrome.storage.local.get("savedUrls");
		setSavedUrls(savedUrls as SavedUrl[]);

		chrome.storage.onChanged.addListener((changes) => {
			if (changes.savedUrls) setSavedUrls(changes.savedUrls.newValue ?? []);
		});
	});

	function openMenu(e: MouseEvent, entry: SavedUrl) {
		e.preventDefault();
		setContextMenu({ x: e.clientX, y: e.clientY, entry });
	}

	function closeMenu() {
		setContextMenu(null);
	}

	function handleOpen(url: string) {
		chrome.tabs.create({ url });
		closeMenu();
	}

	function handleCopy(url: string) {
		navigator.clipboard.writeText(url);
		closeMenu();
	}

	async function handleRemove(url: string) {
		const updated = savedUrls().filter((e) => e.url !== url);
		await chrome.storage.local.set({ savedUrls: updated });
		closeMenu();
	}

	onCleanup(() => document.removeEventListener("click", closeMenu));

	return (
		<>
			<Show
				when={savedUrls().length > 0}
				fallback={
					<div class="empty">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
						</svg>
						<p>No saved pages yet.</p>
						<span>Click the extension icon on any page to save it.</span>
					</div>
				}
			>
				<ul onClick={closeMenu}>
					<For each={savedUrls()}>
						{(entry) => (
							<li onContextMenu={(e) => openMenu(e, entry)}>
								<a href={entry.url} target="_blank" rel="noreferrer">
									<img
										class="favicon"
										src={`https://www.google.com/s2/favicons?domain=${new URL(entry.url).hostname}&sz=32`}
										alt=""
									/>
									<div class="entry-text">
										<span class="entry-name">{entry.name || entry.url}</span>
										<span class="entry-url">{entry.url}</span>
									</div>
								</a>
								<time>{formatDate(entry.savedAt)}</time>
							</li>
						)}
					</For>
				</ul>
			</Show>

			<Show when={contextMenu()}>
				{(menu) => (
					<div
						class="context-menu"
						style={{ top: `${menu().y}px`, left: `${menu().x}px` }}
						onClick={(e) => e.stopPropagation()}
					>
						<button type="button" onClick={() => handleOpen(menu().entry.url)}>
							<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clip-rule="evenodd"/></svg>
							Open in new tab
						</button>
						<button type="button" onClick={() => handleCopy(menu().entry.url)}>
							<svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"/><path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"/></svg>
							Copy URL
						</button>
						<hr />
						<button type="button" class="danger" onClick={() => handleRemove(menu().entry.url)}>
							<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd"/></svg>
							Remove
						</button>
					</div>
				)}
			</Show>
		</>
	);
}
