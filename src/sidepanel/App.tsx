import { createSignal, Show } from "solid-js";
import "./App.css";
import RemyIcon from "@/icons/RemyIcon";
import SaveAllIcon from "@/icons/SaveAllIcon";
import SettingsIcon from "@/icons/SettingsIcon";
import RemyView from "./views/RemyView";
import SavedLinksView from "./views/SavedLinksView";
import SettingsView from "./views/SettingsView";

type View = "saved" | "remy" | "settings";

function App() {
	const [view, setView] = createSignal<View>("saved");

	return (
		<div class="panel">
			<header>
				<span class="brand">Remembery</span>
				<nav>
					<button
						type="button"
						class={view() === "remy" ? "active" : ""}
						onClick={() => setView("remy")}
					>
						<RemyIcon />
						Remy
					</button>
					<button
						type="button"
						class={view() === "saved" ? "active" : ""}
						onClick={() => setView("saved")}
					>
						<SaveAllIcon />
						Saved
					</button>
					<button
						type="button"
						class={view() === "settings" ? "active" : ""}
						onClick={() => setView("settings")}
					>
						<SettingsIcon />
						Settings
					</button>
				</nav>
			</header>

			<main>
				<Show when={view() === "saved"}>
					<SavedLinksView />
				</Show>

				<Show when={view() === "remy"}>
					<RemyView />
				</Show>

				<Show when={view() === "settings"}>
					<SettingsView />
				</Show>
			</main>
		</div>
	);
}

export default App;
