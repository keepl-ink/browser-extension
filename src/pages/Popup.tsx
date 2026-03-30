import "./Popup.css"

import { Bookmark, BookmarkCheck, Globe, PanelRightOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
	const favicon = tab ? getFaviconUrl(tab.url, tab.favIconUrl) : undefined;
	const title = loadingTab ? "Loading page…" : tab?.name ?? "This page cannot be saved";
	const subtitle = tab?.url ?? "Open any regular http or https page to save it with KeepLink.";
	const saveDisabled = !tab || loadingTab || busy !== null;
	const saveLabel = busy === "save" ? "Saving…" : busy === "unsave" ? "Removing…" : isSaved ? "Saved page" : "Save page";

	return (
		<div className="relative w-[420px] overflow-hidden bg-[radial-gradient(circle_at_top_left,_#fffdf9_0,_#f6f0e8_52%,_#eee4d7_100%)] p-4 text-[#14110f]">
			<div className="absolute inset-x-8 top-0 h-px bg-white/80" />
			<div className="absolute -top-12 right-10 size-32 rounded-full bg-[#f2e9dd] blur-3xl" />

			<div className="relative overflow-hidden rounded-[30px] border border-[#e6ddd2] bg-white/95 p-5 shadow-[0_24px_60px_-32px_rgba(53,34,11,0.45)]">
				<div className="flex items-center gap-4">
					<div className="flex size-24 shrink-0 items-center justify-center rounded-[24px] bg-[#f7f3ed] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
						{favicon ? (
							<img src={favicon} alt="" className="size-12 rounded-[14px]" />
						) : (
							<Globe className="size-10 text-[#8f877e]" strokeWidth={1.8} />
						)}
					</div>

					<div className="min-w-0 flex-1">
						<p className="truncate text-[2rem] leading-[1.02] font-semibold tracking-[-0.05em]">
							{title}
						</p>
						<p className="mt-1 truncate text-[1.2rem] leading-tight tracking-[-0.035em] text-[#8a837a]">
							{subtitle}
						</p>
					</div>
				</div>

				<Separator className="my-5 bg-[#efe8df]" />

				<div className="grid grid-cols-2 gap-4">
					<Button
						className="h-16 rounded-[22px] bg-[#151312] text-[1.15rem] font-medium tracking-[-0.035em] text-white shadow-[0_14px_24px_-18px_rgba(0,0,0,0.75)] hover:bg-[#1e1b19] disabled:bg-[#3c3734]"
						onClick={() => void (isSaved ? handleUnsave() : handleSave())}
						type="button"
						disabled={saveDisabled}
					>
						{isSaved ? (
							<BookmarkCheck className="size-5" strokeWidth={2.2} />
						) : (
							<Bookmark className="size-5" strokeWidth={2.2} />
						)}
						{saveLabel}
					</Button>

					<Button
						className="h-16 rounded-[22px] border-[#e3dbd0] bg-white text-[1.15rem] font-medium tracking-[-0.035em] text-[#111111] shadow-none hover:bg-[#faf7f2]"
						onClick={() => void handleOpenPanel()}
						type="button"
						variant="outline"
						disabled={!tab || loadingTab || busy === "panel"}
					>
						{busy === "panel" ? "Opening…" : "Open panel"}
						<PanelRightOpen className="size-5" strokeWidth={2.1} />
					</Button>
				</div>

				{actionError ? (
					<p className="mt-4 text-sm text-[#9a3d30]">{actionError}</p>
				) : null}
			</div>
		</div>
	);
}
