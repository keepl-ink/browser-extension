import { createSignal, For, onMount } from "solid-js";

interface Message {
	role: "user" | "remy";
	text: string;
}

export default function RemyView() {
	const [messages, setMessages] = createSignal<Message[]>([
		{ role: "remy", text: "Hi! I'm Remy. Ask me anything about your saved pages." },
	]);
	const [input, setInput] = createSignal("");
	const [serverUrl, setServerUrl] = createSignal("");
	const [loading, setLoading] = createSignal(false);
	let listRef: HTMLDivElement | undefined;

	onMount(async () => {
		const { serverUrl: stored = "" } = await chrome.storage.local.get("serverUrl");
		setServerUrl(stored as string);
		chrome.storage.onChanged.addListener((changes) => {
			if (changes.serverUrl) setServerUrl(changes.serverUrl.newValue ?? "");
		});
	});

	function scrollToBottom() {
		if (listRef) listRef.scrollTop = listRef.scrollHeight;
	}

	async function send() {
		const text = input().trim();
		if (!text || loading()) return;

		setMessages((m) => [...m, { role: "user", text }]);
		setInput("");
		setLoading(true);
		scrollToBottom();

		if (!serverUrl()) {
			setMessages((m) => [
				...m,
				{ role: "remy", text: "No backend URL configured. Go to Settings to add one." },
			]);
			setLoading(false);
			scrollToBottom();
			return;
		}

		try {
			const { savedUrls = [] } = await chrome.storage.local.get("savedUrls");
			const res = await fetch(`${serverUrl()}/chat`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: text, savedUrls }),
			});
			const data = await res.json();
			setMessages((m) => [...m, { role: "remy", text: data.reply ?? "No response." }]);
		} catch {
			setMessages((m) => [
				...m,
				{ role: "remy", text: "Couldn't reach the backend. Check your server URL in Settings." },
			]);
		}

		setLoading(false);
		scrollToBottom();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	return (
		<div class="remy">
			<div class="remy-messages" ref={listRef}>
				<For each={messages()}>
					{(msg) => (
						<div class={`remy-msg remy-msg--${msg.role}`}>
							<span>{msg.text}</span>
						</div>
					)}
				</For>
				{loading() && (
					<div class="remy-msg remy-msg--remy remy-msg--loading">
						<span class="dot" /><span class="dot" /><span class="dot" />
					</div>
				)}
			</div>
			<div class="remy-input-row">
				<textarea
					rows="1"
					placeholder="Ask Remy…"
					value={input()}
					onInput={(e) => setInput(e.currentTarget.value)}
					onKeyDown={onKeyDown}
				/>
				<button type="button" onClick={send} disabled={loading() || !input().trim()}>
					<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3.105 2.288a.75.75 0 00-.826.95l1.414 4.926A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.155.75.75 0 000-1.114A28.897 28.897 0 003.105 2.288z"/></svg>
				</button>
			</div>
		</div>
	);
}
