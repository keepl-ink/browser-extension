import { getHostname } from "@/lib/browser";
import type { AppSettings, SavedUrl } from "@/lib/types";

const KEEPLINK_API_BASE_URL = "https://api.keepl.ink";
const CUSTOM_HEALTH_PATH = "/api/extension/verify";
const CUSTOM_URLS_PATH = "/api/keeps";
const CUSTOM_CHAT_PATH = "/api/extension/chat";
const KEEPLINK_URLS_PATH = "/v1/keeps";
const KEEPLINK_CHAT_PATH = "/v1/chat";

function formatSavedUrl(entry: SavedUrl) {
	return `- ${entry.name || entry.url} (${getHostname(entry.url)})`;
}

function normalizeSavedUrl(entry: unknown): SavedUrl | null {
	if (typeof entry === "string") {
		return {
			url: entry,
			name: getHostname(entry),
			savedAt: Date.now(),
		};
	}

	if (!entry || typeof entry !== "object") {
		return null;
	}

	const value = entry as Partial<SavedUrl> & {
		name?: string;
		title?: string;
		label?: string;
	};

	if (typeof value.url !== "string" || !value.url) {
		return null;
	}

	return {
		url: value.url,
		name:
			typeof value.name === "string"
				? value.name
				: typeof value.title === "string"
					? value.title
					: typeof value.label === "string"
						? value.label
						: getHostname(value.url),
		savedAt: typeof value.savedAt === "number" ? value.savedAt : Date.now(),
	};
}

function normalizeSavedUrls(savedUrls: SavedUrl[]) {
	const uniqueByUrl = new Map<string, SavedUrl>();

	for (const entry of savedUrls) {
		if (!entry.url) {
			continue;
		}

		uniqueByUrl.set(entry.url, entry);
	}

	return [...uniqueByUrl.values()].sort(
		(left, right) => right.savedAt - left.savedAt,
	);
}

function extractSavedUrls(payload: unknown) {
	if (Array.isArray(payload)) {
		return normalizeSavedUrls(
			payload
				.map((entry) => normalizeSavedUrl(entry))
				.filter((entry): entry is SavedUrl => entry !== null),
		);
	}

	if (!payload || typeof payload !== "object") {
		return [];
	}

	for (const key of ["savedUrls", "urls", "items", "data"]) {
		const value = (payload as Record<string, unknown>)[key];
		if (Array.isArray(value)) {
			return extractSavedUrls(value);
		}
	}

	return [];
}

function getBackendBaseUrl(kind: "custom" | "keeplink", settings: AppSettings) {
	if (kind === "custom") {
		if (!settings.serverUrl) {
			throw new Error("Custom backend URL missing.");
		}

		return settings.serverUrl.replace(/\/+$/, "");
	}

	if (!settings.keepLinkApiKey) {
		throw new Error("Keepl.ink API key missing.");
	}

	return KEEPLINK_API_BASE_URL;
}

function getBackendHeaders(kind: "custom" | "keeplink", settings: AppSettings) {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (kind === "custom") {
		if (settings.authToken) {
			headers.Authorization = `Bearer ${settings.authToken}`;
		}

		return headers;
	}

	headers.Authorization = `Bearer ${settings.keepLinkApiKey}`;
	headers["X-API-Key"] = settings.keepLinkApiKey;

	return headers;
}

function getEndpoint(baseUrl: string, path: string) {
	return new URL(path, `${baseUrl}/`).toString();
}

function getUrlsPath(kind: "custom" | "keeplink") {
	return kind === "custom" ? CUSTOM_URLS_PATH : KEEPLINK_URLS_PATH;
}

function getChatPath(kind: "custom" | "keeplink") {
	return kind === "custom" ? CUSTOM_CHAT_PATH : KEEPLINK_CHAT_PATH;
}

async function parseResponseJson(response: Response) {
	try {
		return (await response.json()) as unknown;
	} catch {
		return null;
	}
}

async function requestSavedUrls(
	kind: "custom" | "keeplink",
	settings: AppSettings,
) {
	const response = await fetch(
		getEndpoint(getBackendBaseUrl(kind, settings), getUrlsPath(kind)),
		{
			method: "GET",
			headers: getBackendHeaders(kind, settings),
		},
	);

	if (!response.ok) {
		throw new Error(`${kind} backend returned ${response.status}.`);
	}

	return extractSavedUrls(await parseResponseJson(response));
}

async function requestSaveUrl(
	kind: "custom" | "keeplink",
	entry: SavedUrl,
	settings: AppSettings,
) {
	const baseUrl = getBackendBaseUrl(kind, settings);
	const headers = getBackendHeaders(kind, settings);
	const { name, ...rest } = entry;
	const response = await fetch(getEndpoint(baseUrl, getUrlsPath(kind)), {
		method: "POST",
		headers,
		body: JSON.stringify({ ...rest, title: entry.name }),
	});

	if (!response.ok) {
		throw new Error(`${kind} backend returned ${response.status}.`);
	}

	const payload = await parseResponseJson(response);
	const savedUrls = extractSavedUrls(payload);

	if (savedUrls.length) {
		return savedUrls;
	}

	return requestSavedUrls(kind, settings);
}

async function requestRemoveUrl(
	kind: "custom" | "keeplink",
	url: string,
	settings: AppSettings,
) {
	const baseUrl = getBackendBaseUrl(kind, settings);
	const headers = getBackendHeaders(kind, settings);
	const primaryResponse = await fetch(
		`${getEndpoint(baseUrl, getUrlsPath(kind))}/${encodeURIComponent(url)}`,
		{
			method: "DELETE",
			headers,
		},
	);

	let response = primaryResponse;

	if (!primaryResponse.ok) {
		response = await fetch(
			`${getEndpoint(baseUrl, getUrlsPath(kind))}?url=${encodeURIComponent(url)}`,
			{
				method: "DELETE",
				headers,
			},
		);
	}

	if (!response.ok) {
		throw new Error(`${kind} backend returned ${response.status}.`);
	}

	const payload = await parseResponseJson(response);
	const savedUrls = extractSavedUrls(payload);

	if (savedUrls.length) {
		return savedUrls;
	}

	return requestSavedUrls(kind, settings);
}

function scoreSavedUrl(entry: SavedUrl, tokens: string[]) {
	const haystack =
		`${entry.name} ${entry.url} ${getHostname(entry.url)}`.toLowerCase();
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
		.sort(
			(left, right) =>
				right.score - left.score || right.entry.savedAt - left.entry.savedAt,
		)
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
	const endpoint = getEndpoint(
		getBackendBaseUrl("custom", settings),
		getChatPath("custom"),
	);
	const response = await fetch(endpoint, {
		method: "POST",
		headers: getBackendHeaders("custom", settings),
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

export async function checkCustomBackendHealth(settings: AppSettings) {
	const response = await fetch(
		getEndpoint(getBackendBaseUrl("custom", settings), CUSTOM_HEALTH_PATH),
		{
			method: "GET",
			headers: getBackendHeaders("custom", settings),
		},
	);

	if (!response.ok) {
		throw new Error(
			`Custom backend health check failed with ${response.status}.`,
		);
	}
}

async function requestKeeplinkChatReply(
	message: string,
	savedUrls: SavedUrl[],
	settings: AppSettings,
) {
	const endpoint = getEndpoint(
		getBackendBaseUrl("keeplink", settings),
		getChatPath("keeplink"),
	);
	const response = await fetch(endpoint, {
		method: "POST",
		headers: getBackendHeaders("keeplink", settings),
		body: JSON.stringify({
			message,
			savedUrls,
		}),
	});

	if (!response.ok) {
		throw new Error(`Keepl.ink backend returned ${response.status}.`);
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

	throw new Error("Keepl.ink backend did not return a usable reply.");
}

export async function fetchCustomSavedUrls(settings: AppSettings) {
	return requestSavedUrls("custom", settings);
}

export async function saveCustomSavedUrl(
	entry: SavedUrl,
	settings: AppSettings,
) {
	return requestSaveUrl("custom", entry, settings);
}

export async function removeCustomSavedUrl(url: string, settings: AppSettings) {
	return requestRemoveUrl("custom", url, settings);
}

export async function fetchKeeplinkSavedUrls(settings: AppSettings) {
	return requestSavedUrls("keeplink", settings);
}

export async function saveKeeplinkSavedUrl(
	entry: SavedUrl,
	settings: AppSettings,
) {
	return requestSaveUrl("keeplink", entry, settings);
}

export async function removeKeeplinkSavedUrl(
	url: string,
	settings: AppSettings,
) {
	return requestRemoveUrl("keeplink", url, settings);
}

export async function onUrlSaved(entry: SavedUrl, settings: AppSettings) {
	console.info("Saved URL callback invoked.", {
		entry,
		syncMode: settings.syncMode,
	});
}

export async function onUrlRemoved(url: string, settings: AppSettings) {
	console.info("Removed URL callback invoked.", {
		url,
		syncMode: settings.syncMode,
	});
}

export async function onChatMessage(
	message: string,
	savedUrls: SavedUrl[],
	settings: AppSettings,
) {
	if (settings.syncMode === "custom") {
		return requestCustomChatReply(message, savedUrls, settings);
	}

	if (settings.syncMode === "keeplink") {
		return requestKeeplinkChatReply(message, savedUrls, settings);
	}

	return buildLocalReply(message, savedUrls);
}
