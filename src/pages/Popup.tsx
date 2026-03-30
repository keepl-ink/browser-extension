import "./Popup.css";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getFaviconUrl, openExtensionPanel, queryActiveTab } from "@/lib/browser";
import { initializeAppStore, useAppStore } from "@/store/useAppStore";

export default function App() {
	const savedUrls = useAppStore((state) => state.savedUrls);
	const addUrl = useAppStore((state) => state.addUrl);
	const removeUrl = useAppStore((state) => state.removeUrl);

	const [tab, setTab] = useState<Awaited<ReturnType<typeof queryActiveTab>>>(null);
	const [loadingTab, setLoadingTab] = useState(true);
	const [busy, setBusy] = useState<"save" | "unsave" | "panel" | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function loadPopup() {
			try {
				await initializeAppStore();
				const activeTab = await queryActiveTab();

				if (!cancelled) {
					setTab(activeTab);
				}
			} catch (error) {
				console.error("Failed to load popup state.", error);
				if (!cancelled) {
					setActionError("Unable to read the current tab.");
				}
			} finally {
				if (!cancelled) {
					setLoadingTab(false);
				}
			}
		}

		void loadPopup();

		return () => {
			cancelled = true;
		};
	}, []);

	async function handleSave() {
		if (!tab) return;

		setActionError(null);
		setBusy("save");

		try {
			await addUrl(tab.url, tab.name);
		} catch (error) {
			console.error("Failed to save URL.", error);
			setActionError("Unable to save this page.");
		} finally {
			setBusy(null);
		}
	}

	async function handleUnsave() {
		if (!tab) return;

		setActionError(null);
		setBusy("unsave");

		try {
			await removeUrl(tab.url);
		} catch (error) {
			console.error("Failed to remove URL.", error);
			setActionError("Unable to remove this page.");
		} finally {
			setBusy(null);
		}
	}

	async function handleOpenPanel() {
		if (!tab) return;

		setActionError(null);
		setBusy("panel");

		try {
			const opened = await openExtensionPanel(tab.windowId);

			if (!opened) {
				setActionError("This browser does not expose the extension panel API.");
				return;
			}

			window.close();
		} catch (error) {
			console.error("Failed to open panel.", error);
			setActionError(
				error instanceof Error ? error.message : "Unable to open the panel.",
			);
		} finally {
			setBusy(null);
		}
	}

	const isSaved = useMemo(
		() => Boolean(tab && savedUrls.some((entry) => entry.url === tab.url)),
		[savedUrls, tab],
	);

	const status: "loading" | "idle" | "saved" = loadingTab
		? "loading"
		: isSaved
			? "saved"
			: "idle";

	const favicon = tab ? getFaviconUrl(tab.url, tab.favIconUrl) : undefined;

	return (
		<div className="p-3 flex flex-col gap-3 antialiased">
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
						{status === "loading"
							? "Loading…"
							: (tab?.name ?? "This page cannot be saved")}
					</span>
					<span className="text-[0.68rem] text-muted-foreground truncate leading-snug">
						{tab?.url ?? "Open any regular http or https page to save it with KeepLink."}
					</span>
				</div>
			</div>

			<div className="h-px bg-border" />

			<div className="flex gap-2">
				{status === "idle" && (
					<Button
						size="sm"
						className="flex-1 gap-1.5 h-8 text-xs"
						onClick={() => void handleSave()}
						disabled={!tab || busy !== null}
					>
						<BookmarkIcon className="size-3.5" />
						{busy === "save" ? "Saving…" : "Save page"}
					</Button>
				)}

				{status === "saved" && (
					<Button
						size="sm"
						variant="secondary"
						className="flex-1 gap-1.5 h-8 text-xs"
						onClick={() => void handleUnsave()}
						disabled={!tab || busy !== null}
					>
						<BookmarkFilledIcon className="size-3.5" />
						{busy === "unsave" ? "Removing…" : "Saved — Unsave"}
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
					onClick={() => void handleOpenPanel()}
					disabled={!tab || loadingTab || busy === "panel"}
				>
					{busy === "panel" ? "Opening…" : "Open panel"}
					<PanelRightIcon className="size-3.5" />
				</Button>
			</div>

			{actionError ? (
				<p className="text-[0.68rem] text-red-600 leading-snug">{actionError}</p>
			) : null}
		</div>
	);
}

function GlobeIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			className={className}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
			/>
		</svg>
	);
}

function BookmarkIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
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
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<rect width="18" height="18" x="3" y="3" rx="2" />
			<path d="M15 3v18" />
		</svg>
	);
}
