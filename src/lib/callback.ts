import { getHostname } from "@/lib/browser";
import type { AppSettings, SavedUrl } from "@/lib/types";

function formatSavedUrl(entry: SavedUrl) {
	return `- ${entry.name || entry.url} (${getHostname(entry.url)})`;
}

function scoreSavedUrl(entry: SavedUrl, tokens: string[]) {
	const haystack = `${entry.name} ${entry.url} ${getHostname(entry.url)}`.toLowerCase();
	let score = 0;

	for (const token of tokens) {
		if (haystack.includes(token)) {
			score += entry.name.toLowerCase().includes(token) ? 3 : 1;
		}
	}

	return score;
}

function buildLocalReply(message: string, savedUrls: SavedUrl[]) {
	if (!savedUrls.length) {
		return "You do not have any saved pages yet. Save one from the popup and I can help you search through it here.";
	}

	const normalizedMessage = message.trim().toLowerCase();

	if (!normalizedMessage) {
		return `You have ${savedUrls.length} saved ${savedUrls.length === 1 ? "page" : "pages"}.`;
	}

	if (/\b(count|how many|total)\b/.test(normalizedMessage)) {
		return `You currently have ${savedUrls.length} saved ${savedUrls.length === 1 ? "page" : "pages"}.`;
	}

	const recent = [...savedUrls]
		.sort((left, right) => right.savedAt - left.savedAt)
		.slice(0, 3);

	if (/\b(recent|latest|newest|last)\b/.test(normalizedMessage)) {
		return `Your most recent saves are:\n${recent.map(formatSavedUrl).join("\n")}`;
	}

	const tokens = normalizedMessage.split(/[^a-z0-9]+/).filter(Boolean);
	const matches = [...savedUrls]
		.map((entry) => ({ entry, score: scoreSavedUrl(entry, tokens) }))
		.filter((entry) => entry.score > 0)
		.sort((left, right) => right.score - left.score || right.entry.savedAt - left.entry.savedAt)
		.slice(0, 5)
		.map((entry) => entry.entry);

	if (!matches.length) {
		return `I could not find a close match for "${message.trim()}". Your recent saves are:\n${recent.map(formatSavedUrl).join("\n")}`;
	}

	return `I found these saved pages related to "${message.trim()}":\n${matches.map(formatSavedUrl).join("\n")}`;
}

async function requestCustomChatReply(
	message: string,
	savedUrls: SavedUrl[],
	settings: AppSettings,
) {
	if (!settings.serverUrl) {
		throw new Error("no_backend");
	}

	const endpoint = new URL("/chat", `${settings.serverUrl.replace(/\/+$/, "")}/`);
	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(settings.authToken
				? { Authorization: `Bearer ${settings.authToken}` }
				: {}),
		},
		body: JSON.stringify({
			message,
			savedUrls,
		}),
	});

	if (!response.ok) {
		throw new Error(`Custom backend returned ${response.status}.`);
	}

	const payload = (await response.json()) as Record<string, unknown>;

	if (typeof payload.reply === "string") {
		return payload.reply;
	}

	if (typeof payload.message === "string") {
		return payload.message;
	}

	if (typeof payload.text === "string") {
		return payload.text;
	}

	throw new Error("Custom backend did not return a usable reply.");
}

export async function onUrlSaved(entry: SavedUrl, settings: AppSettings) {
	if (settings.syncMode !== "local") {
		console.info("Saved URL callback invoked.", { entry, syncMode: settings.syncMode });
	}
}

export async function onUrlRemoved(url: string, settings: AppSettings) {
	if (settings.syncMode !== "local") {
		console.info("Removed URL callback invoked.", { url, syncMode: settings.syncMode });
	}
}

export async function onChatMessage(
	message: string,
	savedUrls: SavedUrl[],
	settings: AppSettings,
) {
	if (settings.syncMode === "custom") {
		return requestCustomChatReply(message, savedUrls, settings);
	}

	return buildLocalReply(message, savedUrls);
}
