/**
 * Backend callbacks — the single place to wire up server logic.
 *
 * Every outbound action has a stub here. Swap the bodies for real API calls
 * when your backend is ready. Nothing else in the extension needs to change.
 *
 * Sync modes
 * ──────────
 *  "local"    → no network calls, all stubs are no-ops
 *  "keeplink" → routes to the keepl.ink SaaS API (KEEPLINK_API_URL) using
 *               the user's keepl.ink API key as the Bearer token
 *  "custom"   → routes to the user-supplied serverUrl with their authToken
 *
 * Auth: every request receives `Authorization: Bearer <token>` when a token
 * is present. Tokens are stored in extension local storage (sandboxed to this
 * extension, never put in URLs).
 */

import type { AppSettings, SavedUrl } from "@/store/AppContext";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Base URL of the keepl.ink SaaS backend. */
const KEEPLINK_API_URL = "https://api.keepl.ink";

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface Endpoint {
	serverUrl: string;
	authToken: string;
}

/**
 * Resolves the active server URL and auth token based on the current sync
 * mode. Returns null when sync is disabled ("local").
 */
function getEffectiveEndpoint(settings: AppSettings): Endpoint | null {
	switch (settings.syncMode) {
		case "local":
			return null;
		case "keeplink":
			if (!settings.keepLinkApiKey) return null;
			return { serverUrl: KEEPLINK_API_URL, authToken: settings.keepLinkApiKey };
		case "custom":
			if (!settings.serverUrl) return null;
			return { serverUrl: settings.serverUrl, authToken: settings.authToken };
	}
}

/**
 * Returns headers for every outbound request.
 * Injects `Authorization: Bearer` only when a token is present.
 */
function buildHeaders(endpoint: Endpoint): Record<string, string> {
	const h: Record<string, string> = { "Content-Type": "application/json" };
	if (endpoint.authToken) h["Authorization"] = `Bearer ${endpoint.authToken}`;
	return h;
}

// ─── Settings callbacks ───────────────────────────────────────────────────────

/**
 * Called after settings are saved to local storage.
 * Pings GET /healthz to validate the active endpoint and credentials.
 *
 * Throws an Error with a human-readable `.message` on failure so the
 * Settings UI can display it directly.
 * No-op when sync mode is "local".
 */
export async function onServerUrlChanged(settings: AppSettings): Promise<void> {
	const endpoint = getEffectiveEndpoint(settings);
	if (!endpoint) return;

	let res: Response;
	try {
		res = await fetch(`${endpoint.serverUrl}/healthz`, {
			headers: buildHeaders(endpoint),
		});
	} catch {
		throw new Error("Could not reach the server. Check the URL and try again.");
	}

	if (res.status === 401 || res.status === 403) {
		throw new Error("Authentication failed. Check your API key or token.");
	}
	if (!res.ok) {
		throw new Error(`Server returned ${res.status}. Check the URL and try again.`);
	}
}

// ─── URL callbacks ────────────────────────────────────────────────────────────

/**
 * Called after a new URL is saved to local storage.
 * Use to sync the entry to the backend / trigger indexing.
 */
export async function onUrlSaved(
	_entry: SavedUrl,
	_settings: AppSettings,
): Promise<void> {
	// const endpoint = getEffectiveEndpoint(_settings);
	// if (!endpoint) return;
	// await fetch(`${endpoint.serverUrl}/urls`, {
	//   method: "POST",
	//   headers: buildHeaders(endpoint),
	//   body: JSON.stringify(_entry),
	// });
}

/**
 * Called after a URL is removed from local storage.
 * Use to delete the entry from the backend.
 */
export async function onUrlRemoved(
	_url: string,
	_settings: AppSettings,
): Promise<void> {
	// const endpoint = getEffectiveEndpoint(_settings);
	// if (!endpoint) return;
	// await fetch(`${endpoint.serverUrl}/urls/${encodeURIComponent(_url)}`, {
	//   method: "DELETE",
	//   headers: buildHeaders(endpoint),
	// });
}

// ─── Chat callback ────────────────────────────────────────────────────────────

/**
 * Called when the user sends a message to Remy.
 * Returns Remy's reply as a plain string.
 *
 * Throws `"no_backend"` when sync mode is "local" or no credentials are set,
 * so the UI can show a friendly prompt instead of a generic error.
 */
export async function onChatMessage(
	message: string,
	savedUrls: SavedUrl[],
	settings: AppSettings,
): Promise<string> {
	const endpoint = getEffectiveEndpoint(settings);
	if (!endpoint) throw new Error("no_backend");

	const res = await fetch(`${endpoint.serverUrl}/chat`, {
		method: "POST",
		headers: buildHeaders(endpoint),
		body: JSON.stringify({ message, savedUrls }),
	});

	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = (await res.json()) as { reply?: string };
	return data.reply ?? "No response.";
}
