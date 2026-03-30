import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { onUrlRemoved, onUrlSaved } from "@/lib/callbacks";
import type { AppSettings, SavedUrl } from "@/store/AppContext";

interface TabInfo {
	url: string;
	name: string;
	favIconUrl?: string;
	windowId: number;
}

type Status = "loading" | "idle" | "saved";

export default function App() {
	const [tab, setTab] = useState<TabInfo | null>(null);
	const [status, setStatus] = useState<Status>("loading");

	useEffect(() => {
		chrome.tabs.query({ active: true, currentWindow: true }).then(async ([t]) => {
			if (!t?.url?.startsWith("http") || !t.windowId) {
				setStatus("idle");
				return;
			}
			const info: TabInfo = {
				url: t.url,
				name: t.title ?? t.url,
				favIconUrl: t.favIconUrl,
				windowId: t.windowId,
			};
			setTab(info);

			const result = await chrome.storage.local.get("savedUrls");
			const saved: SavedUrl[] = (result.savedUrls as SavedUrl[]) ?? [];
			setStatus(saved.some((e) => e.url === info.url) ? "saved" : "idle");
		});
	}, []);

	async function handleSave() {
		if (!tab) return;
		const result = await chrome.storage.local.get("savedUrls");
		const saved: SavedUrl[] = (result.savedUrls as SavedUrl[]) ?? [];
		if (saved.some((e) => e.url === tab.url)) return;
		const entry: SavedUrl = { url: tab.url, name: tab.name, savedAt: Date.now() };
		await chrome.storage.local.set({ savedUrls: [...saved, entry] });
		const s = await chrome.storage.local.get(["syncMode", "keepLinkApiKey", "serverUrl", "authToken"]);
		await onUrlSaved(entry, { syncMode: (s.syncMode ?? "local") as AppSettings["syncMode"], keepLinkApiKey: (s.keepLinkApiKey ?? "") as string, serverUrl: (s.serverUrl ?? "") as string, authToken: (s.authToken ?? "") as string });
		setStatus("saved");
	}

	async function handleUnsave() {
		if (!tab) return;
		const result = await chrome.storage.local.get("savedUrls");
		const saved: SavedUrl[] = (result.savedUrls as SavedUrl[]) ?? [];
		await chrome.storage.local.set({ savedUrls: saved.filter((e) => e.url !== tab.url) });
		const s = await chrome.storage.local.get(["syncMode", "keepLinkApiKey", "serverUrl", "authToken"]);
		await onUrlRemoved(tab.url, { syncMode: (s.syncMode ?? "local") as AppSettings["syncMode"], keepLinkApiKey: (s.keepLinkApiKey ?? "") as string, serverUrl: (s.serverUrl ?? "") as string, authToken: (s.authToken ?? "") as string });
		setStatus("idle");
	}

	async function handleOpenPanel() {
		if (!tab) return;
		await chrome.sidePanel.open({ windowId: tab.windowId });
		window.close();
	}

	const favicon = tab?.favIconUrl
		?? (tab ? `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32` : undefined);

	return (
		<div className="p-3 flex flex-col gap-3 antialiased">
			{/* Current page */}
			<div className="flex items-center gap-2.5">
				<div className="size-9 rounded-lg bg-secondary shrink-0 flex items-center justify-center overflow-hidden">
					{favicon ? (
						<img src={favicon} alt="" className="size-5" />
					) : (
						<GlobeIcon className="size-4 text-muted-foreground" />
					)}
				</div>
				<div className="flex flex-col min-w-0">
					<span className="text-[0.82rem] font-semibold text-foreground truncate leading-snug">
						{status === "loading" ? "Loading…" : (tab?.name ?? "—")}
					</span>
					<span className="text-[0.68rem] text-muted-foreground truncate leading-snug">
						{tab?.url ?? ""}
					</span>
				</div>
			</div>

			{/* Divider */}
			<div className="h-px bg-border" />

			{/* Actions */}
			<div className="flex gap-2">
				{status === "idle" && (
					<Button size="sm" className="flex-1 gap-1.5 h-8 text-xs" onClick={handleSave}>
						<BookmarkIcon className="size-3.5" />
						Save page
					</Button>
				)}
				{status === "saved" && (
					<Button
						size="sm"
						variant="secondary"
						className="flex-1 gap-1.5 h-8 text-xs"
						onClick={handleUnsave}
					>
						<BookmarkFilledIcon className="size-3.5" />
						Saved — Unsave
					</Button>
				)}
				{status === "loading" && (
					<Button size="sm" className="flex-1 h-8 text-xs" disabled>
						…
					</Button>
				)}

				<Button
					size="sm"
					variant="outline"
					className="flex-1 gap-1.5 h-8 text-xs"
					onClick={handleOpenPanel}
					disabled={status === "loading"}
				>
					Open panel
					<PanelRightIcon className="size-3.5" />
				</Button>
			</div>
		</div>
	);
}

function GlobeIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
		</svg>
	);
}

function BookmarkIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
			<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
		</svg>
	);
}

function BookmarkFilledIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
			<path d="M17 3H7a2 2 0 0 0-2 2v16l7-4 7 4V5a2 2 0 0 0-2-2z" />
		</svg>
	);
}

function PanelRightIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
			<rect width="18" height="18" x="3" y="3" rx="2" />
			<path d="M15 3v18" />
		</svg>
	);
}
