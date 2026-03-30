import "./Sidebar.css";

import { Bookmark, Bot, Settings2 } from "lucide-react";
import { useEffect } from "react";

import RemyView from "@/components/sidebar/views/Remy";
import SavedLinksView from "@/components/sidebar/views/SavedLinksView";
import SettingsView from "@/components/sidebar/views/SettingsView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SidebarView } from "@/lib/types";

import { initializeAppStore, useAppStore } from "@/store/useAppStore";

export default function App() {
	const activeView = useAppStore((state) => state.sidebarView);
	const setSidebarView = useAppStore((state) => state.setSidebarView);

	useEffect(() => {
		void initializeAppStore();
	}, []);

	return (
		<Tabs
			value={activeView}
			onValueChange={(value) => void setSidebarView(value as SidebarView)}
			className="h-screen bg-background text-foreground antialiased"
		>
			{/* Header */}
			<header className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
				<span className="text-sm font-semibold tracking-tight">Keepl.ink</span>
				<TabsList className="h-auto p-0.5 gap-0">
					<TabsTrigger value="remy" className="px-2.5 py-1 text-xs gap-1.5">
						<Bot className="size-3.5" />
						Remy
					</TabsTrigger>
					<TabsTrigger value="saved" className="px-2.5 py-1 text-xs gap-1.5">
						<Bookmark className="size-3.5" />
						Saved
					</TabsTrigger>
					<TabsTrigger value="settings" className="px-2.5 py-1 text-xs gap-1.5">
						<Settings2 className="size-3.5" />
						Settings
					</TabsTrigger>
				</TabsList>
			</header>

			{/* Views */}
			<TabsContent value="remy" className="mt-0 min-h-0 h-[calc(100vh-3rem)]">
				<RemyView />
			</TabsContent>
			<TabsContent value="saved" className="mt-0 min-h-0 h-[calc(100vh-3rem)]">
				<SavedLinksView />
			</TabsContent>
			<TabsContent
				value="settings"
				className="mt-0 min-h-0 h-[calc(100vh-3rem)]"
			>
				<SettingsView />
			</TabsContent>
		</Tabs>
	);
}
