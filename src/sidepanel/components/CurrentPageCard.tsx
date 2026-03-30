import { useEffect, useRef, useState } from "react";
import type Browser from "webextension-polyfill";
import { Button } from "@/components/ui/button";
import { ext, type ExtensionTab, type ExtensionTabChangeInfo } from "@/lib/ext";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/AppContext";

interface TabInfo {
	url: string;
	name: string;
	favIconUrl?: string;
}

type Status =
	| "loading"   // querying the tab
	| "idle"      // not saved, ready to save
	| "saving"    // addUrl in flight
	| "saved"     // just saved — undo window open
	| "existing"; // was already saved when the panel opened

const UNDO_WINDOW_MS = 5_000;

export default function CurrentPageCard() {
	const { savedUrls, addUrl, removeUrl } = useAppStore();
	const [tab, setTab] = useState<TabInfo | null>(null);
	const [status, setStatus] = useState<Status>("loading");
	const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Load whichever tab is currently active and reset the save status.
	function loadActiveTab() {
		if (undoTimer.current) { clearTimeout(undoTimer.current); undoTimer.current = null; }
		setStatus("loading");
		ext.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
			if (!t?.url?.startsWith("http")) { setTab(null); setStatus("idle"); return; }
			setTab({ url: t.url, name: t.title ?? t.url, favIconUrl: t.favIconUrl });
			// status will be resolved by the savedUrls effect below
		});
	}

	useEffect(() => {
		loadActiveTab();

		// User switches to a different tab
		const onActivated = (_activeInfo: Browser.Tabs.OnActivatedActiveInfoType) => loadActiveTab();
		ext.tabs.onActivated.addListener(onActivated);

		// Active tab navigates to a new URL or finishes loading a new title
		const onUpdated = (
			_tabId: number,
			changeInfo: ExtensionTabChangeInfo,
			updatedTab: ExtensionTab,
		) => {
			if (!updatedTab.active) return;
			if (changeInfo.status === "complete" || changeInfo.title) loadActiveTab();
		};
		ext.tabs.onUpdated.addListener(onUpdated);

		return () => {
			ext.tabs.onActivated.removeListener(onActivated);
			ext.tabs.onUpdated.removeListener(onUpdated);
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// Derive whether the tab is in the saved list
	useEffect(() => {
		if (!tab) return;
		// Don't override "saved" during the undo window
		if (status === "saved") return;
		setStatus(savedUrls.some((e) => e.url === tab.url) ? "existing" : "idle");
	}, [tab, savedUrls]); // eslint-disable-line react-hooks/exhaustive-deps

	// Clean up timer on unmount
	useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

	async function handleSave() {
		if (!tab || status === "saving") return;
		setStatus("saving");
		await addUrl(tab.url, tab.name);
		setStatus("saved");
		undoTimer.current = setTimeout(() => setStatus("existing"), UNDO_WINDOW_MS);
	}

	async function handleUndo() {
		if (!tab) return;
		if (undoTimer.current) { clearTimeout(undoTimer.current); undoTimer.current = null; }
		await removeUrl(tab.url);
		setStatus("idle");
	}

	const favicon = tab?.favIconUrl
		?? (tab ? `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32` : undefined);

	return (
		<div className="flex items-center gap-3 px-3 py-2.5 border border-border rounded-lg bg-card mx-3 mt-3">
			{/* Favicon */}
			<div className="size-8 rounded-md bg-muted shrink-0 flex items-center justify-center overflow-hidden">
				{favicon ? (
					<img src={favicon} alt="" className="size-5" />
				) : (
					<GlobeIcon className="size-4 text-muted-foreground" />
				)}
			</div>

			{/* Title + URL */}
			<div className="flex flex-col min-w-0 flex-1">
				<span className="text-[0.8rem] font-medium text-foreground truncate leading-snug">
					{tab?.name ?? "Loading…"}
				</span>
				<span className="text-[0.68rem] text-muted-foreground truncate leading-snug">
					{tab?.url ?? ""}
				</span>
			</div>

			{/* Action */}
			<div className="shrink-0 flex items-center gap-1.5">
				{status === "loading" && (
					<span className="text-[0.72rem] text-muted-foreground">…</span>
				)}

				{status === "idle" && (
					<Button size="sm" className="h-7 text-xs px-2.5" onClick={handleSave}>
						Save
					</Button>
				)}

				{status === "saving" && (
					<Button size="sm" className="h-7 text-xs px-2.5" disabled>
						Saving…
					</Button>
				)}

				{status === "saved" && (
					<>
						<span className={cn("text-[0.72rem] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1")}>
							<CheckIcon className="size-3.5" />
							Saved
						</span>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
							onClick={handleUndo}
						>
							Undo
						</Button>
					</>
				)}

				{status === "existing" && (
					<span className="text-[0.72rem] text-muted-foreground flex items-center gap-1">
						<CheckIcon className="size-3.5" />
						Saved
					</span>
				)}
			</div>
		</div>
	);
}

function CheckIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 16 16" fill="currentColor" className={className}>
			<path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
		</svg>
	);
}

function GlobeIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
		</svg>
	);
}
