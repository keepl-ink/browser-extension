import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { onChatMessage } from "@/lib/callbacks";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/AppContext";

interface Message {
	role: "user" | "keepl";
	text: string;
}

export default function RemyView() {
	const { savedUrls, settings } = useAppStore();
	const [messages, setMessages] = useState<Message[]>([
		{
			role: "keepl",
			text: "Hi! I'm Keepl. Ask me anything about your saved pages.",
		},
	]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const listRef = useRef<HTMLDivElement>(null);

	function scrollToBottom() {
		if (listRef.current)
			listRef.current.scrollTop = listRef.current.scrollHeight;
	}

	async function send() {
		const text = input.trim();
		if (!text || loading) return;

		setMessages((m) => [...m, { role: "user", text }]);
		setInput("");
		setLoading(true);
		setTimeout(scrollToBottom, 0);

		try {
			const reply = await onChatMessage(text, savedUrls, settings);
			setMessages((m) => [...m, { role: "keepl", text: reply }]);
		} catch (err) {
			const isNoBackend = err instanceof Error && err.message === "no_backend";
			setMessages((m) => [
				...m,
				{
					role: "keepl",
					text: isNoBackend
						? "No backend URL configured. Go to Settings to add one."
						: "Couldn't reach the backend. Check your server URL in Settings.",
				},
			]);
		}

		setLoading(false);
		setTimeout(scrollToBottom, 0);
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void send();
		}
	}

	return (
		<div className="flex flex-col h-full">
			{/* Messages */}
			<div
				ref={listRef}
				className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 p-3"
			>
				{messages.map((msg, i) => (
					<div
						key={i}
						className={cn(
							"max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed break-words",
							msg.role === "user"
								? "self-end bg-primary text-primary-foreground rounded-br-sm"
								: "self-start bg-secondary text-secondary-foreground border border-border rounded-bl-sm",
						)}
					>
						{msg.text}
					</div>
				))}

				{/* Typing indicator */}
				{loading && (
					<div className="self-start bg-secondary border border-border rounded-2xl rounded-bl-sm px-3.5 py-3 flex gap-1 items-center">
						<span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
						<span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
						<span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
					</div>
				)}
			</div>

			{/* Input bar */}
			<div className="flex gap-2 items-end px-3 py-2.5 border-t border-border bg-background shrink-0">
				<textarea
					rows={1}
					placeholder="Ask Remy…"
					value={input}
					onChange={(e) => setInput(e.currentTarget.value)}
					onKeyDown={onKeyDown}
					className="flex-1 resize-none bg-secondary text-foreground text-xs leading-relaxed rounded-xl px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 max-h-28 overflow-y-auto transition-shadow border border-transparent focus:border-ring/30"
				/>
				<Button
					size="icon-sm"
					onClick={() => void send()}
					disabled={loading || !input.trim()}
					className="shrink-0 mb-0.5"
				>
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path d="M3.105 2.288a.75.75 0 00-.826.95l1.414 4.926A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.155.75.75 0 000-1.114A28.897 28.897 0 003.105 2.288z" />
					</svg>
				</Button>
			</div>
		</div>
	);
}
