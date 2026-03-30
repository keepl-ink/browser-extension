import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RemyIcon from "@/icons/RemyIcon";
import SaveAllIcon from "@/icons/SaveAllIcon";
import SettingsIcon from "@/icons/SettingsIcon";
import RemyView from "./views/RemyView";
import SavedLinksView from "./views/SavedLinksView";
import SettingsView from "./views/SettingsView";

export default function App() {

	return (
		<Tabs
			defaultValue="saved"
			className="h-screen bg-background text-foreground antialiased"
		>
			{/* Header */}
			<header className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
				<span className="text-sm font-semibold tracking-tight">Keepl.ink</span>
				<TabsList className="h-auto p-0.5 gap-0">
					<TabsTrigger value="remy" className="px-2.5 py-1 text-xs gap-1.5">
						<RemyIcon />
						Remy
					</TabsTrigger>
					<TabsTrigger value="saved" className="px-2.5 py-1 text-xs gap-1.5">
						<SaveAllIcon />
						Saved
					</TabsTrigger>
					<TabsTrigger value="settings" className="px-2.5 py-1 text-xs gap-1.5">
						<SettingsIcon />
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
