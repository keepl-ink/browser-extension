import { useState } from "react";
import { ext } from "@/lib/ext";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/AppContext";
import CurrentPageCard from "../components/CurrentPageCard";

interface ContextMenuState {
	x: number;
	y: number;
	url: string;
}

function formatDate(ts: number) {
	return new Date(ts).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export default function SavedLinksView() {
	const { savedUrls, removeUrl } = useAppStore();
	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
	const [query, setQuery] = useState("");

	const filtered = query.trim()
		? savedUrls.filter((e) => {
				const q = query.toLowerCase();
				return e.name.toLowerCase().includes(q) || e.url.toLowerCase().includes(q);
		  })
		: savedUrls;

	function openMenu(e: React.MouseEvent, url: string) {
		e.preventDefault();
		setContextMenu({ x: e.clientX, y: e.clientY, url });
	}

	function handleOpen(url: string) {
		ext.tabs.create({ url });
		setContextMenu(null);
	}

	function handleCopy(url: string) {
		navigator.clipboard.writeText(url);
		setContextMenu(null);
	}

	function handleRemove(url: string) {
		void removeUrl(url);
		setContextMenu(null);
	}

	return (
		<div className="flex flex-col h-full overflow-hidden" onClick={() => setContextMenu(null)}>

			{/* ── Current page card ── */}
			<CurrentPageCard />

			{/* ── Separator ── */}
			<div className="flex items-center gap-2 px-3 pt-3 pb-1">
				<div className="h-px flex-1 bg-border" />
				<span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-medium">
					Saved pages
				</span>
				<div className="h-px flex-1 bg-border" />
			</div>

			{/* ── Search ── */}
			{savedUrls.length > 0 && (
				<div className="px-3 pb-1 relative">
					<SearchIcon className="absolute left-5.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
					<input
						type="text"
						placeholder="Search…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring/30 transition-shadow"
					/>
				</div>
			)}

			{/* ── List or empty state ── */}
			<div className="flex-1 overflow-y-auto">
				{filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full gap-2 px-6 pb-8 text-center text-muted-foreground">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-9 opacity-25 mb-1">
							{query.trim() ? (
								<path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
							) : (
								<path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
							)}
						</svg>
						{query.trim() ? (
							<>
								<p className="text-sm font-semibold text-foreground">No results for "{query}"</p>
								<button type="button" className="text-xs text-primary hover:underline" onClick={() => setQuery("")}>Clear search</button>
							</>
						) : (
							<>
								<p className="text-sm font-semibold text-foreground">Nothing saved yet.</p>
								<span className="text-xs">Hit Save above to bookmark this page.</span>
							</>
						)}
					</div>
				) : (
					<ul className="flex flex-col gap-1.5 p-3">
						{filtered.map((entry) => (
							<li
								key={entry.url}
								onContextMenu={(e) => openMenu(e, entry.url)}
								className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-colors cursor-default select-none"
							>
								<img
									className="size-4 rounded-sm shrink-0"
									src={`https://www.google.com/s2/favicons?domain=${new URL(entry.url).hostname}&sz=32`}
									alt=""
								/>
								<a
									href={entry.url}
									target="_blank"
									rel="noreferrer"
									className="flex flex-col min-w-0 flex-1 no-underline"
								>
									<span className="text-[0.8rem] font-medium text-foreground truncate leading-snug">
										{entry.name || entry.url}
									</span>
									<span className="text-[0.68rem] text-muted-foreground truncate leading-snug">
										{entry.url}
									</span>
								</a>
								<time className="text-[0.68rem] text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
									{formatDate(entry.savedAt)}
								</time>
							</li>
						))}
					</ul>
				)}
			</div>

			{/* ── Context menu ── */}
			{contextMenu && (
				<div
					className="fixed z-50 min-w-40 bg-popover border border-border rounded-lg shadow-lg p-1 flex flex-col"
					style={{ top: contextMenu.y, left: contextMenu.x }}
					onClick={(e) => e.stopPropagation()}
				>
					<ContextMenuItem
						onClick={() => handleOpen(contextMenu.url)}
						icon={
							<svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
								<path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
								<path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
							</svg>
						}
					>
						Open in new tab
					</ContextMenuItem>

					<ContextMenuItem
						onClick={() => handleCopy(contextMenu.url)}
						icon={
							<svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
								<path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
								<path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
							</svg>
						}
					>
						Copy URL
					</ContextMenuItem>

					<div className="h-px bg-border my-0.5" />

					<ContextMenuItem
						onClick={() => handleRemove(contextMenu.url)}
						variant="danger"
						icon={
							<svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
								<path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
							</svg>
						}
					>
						Remove
					</ContextMenuItem>
				</div>
			)}
		</div>
	);
}

function ContextMenuItem({
	children,
	icon,
	onClick,
	variant = "default",
}: {
	children: React.ReactNode;
	icon: React.ReactNode;
	onClick: () => void;
	variant?: "default" | "danger";
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-2 w-full px-2 py-1.5 text-xs font-medium rounded-md transition-colors text-left",
				variant === "danger"
					? "text-destructive hover:bg-destructive/10"
					: "text-foreground hover:bg-secondary",
			)}
		>
			<span className={cn(variant === "danger" ? "text-destructive" : "text-muted-foreground")}>
				{icon}
			</span>
			{children}
		</button>
	);
}

function SearchIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
			<circle cx="11" cy="11" r="8" />
			<path d="m21 21-4.3-4.3" />
		</svg>
	);
}
