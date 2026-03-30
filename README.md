# Keepl.ink — Chrome Extension

A Chrome side-panel extension that lets you save, search, and chat with your browsing history via an optional self-hosted backend.

## API Contract

All requests use `Content-Type: application/json`.
The base URL is whatever the user sets in the Settings panel (`settings.serverUrl`), stored without a trailing slash.

### Authentication

When the user has configured an **Auth Token** in Settings, every request includes:

```
Authorization: Bearer <token>
```

The token is stored in `chrome.storage.local`, which is sandboxed to this extension and inaccessible to web pages. It is **never** appended to URLs (query params appear in server logs; headers don't).

On the backend, validate the header on every endpoint. Unauthenticated requests should return `401` or `403` — the extension surfaces these specifically as *"Authentication failed. Check your token."*
---

### `GET /healthz`

Liveness check. Called when the user saves a new backend URL in Settings.

#### Response `200 OK`

```json
{ "ok": true }
```

Any non-2xx response is treated as a configuration error and should be surfaced to the user.

---

### `POST /urls`

Called every time a page is saved to local storage. Use this to index the page on the backend (e.g. fetch content, generate embeddings, persist to a DB).

#### Request body

```ts
{
  url:     string;  // full URL        — "https://example.com/article"
  name:    string;  // page <title>    — "My Article | Example"
  savedAt: number;  // Unix ms         — 1711234567890
}
```

#### Response `200 OK`

Body is ignored by the extension.

---

### `DELETE /urls/:url`

Called every time a saved page is removed. `:url` is the full URL, **percent-encoded**.

#### Example

```
DELETE /urls/https%3A%2F%2Fexample.com%2Farticle
```

#### Response `200 OK` or `204 No Content`

Body is ignored.

---

### `POST /chat`

Called when the user sends a message to Remy. The extension passes the full saved-URL list as context so the backend can filter or embed before calling an LLM.

#### Request body

```ts
{
  message:   string;     // user's plain-text question
  savedUrls: SavedUrl[]; // full saved list for RAG context (see types below)
}
```

#### Response `200 OK`

```ts
{
  reply: string;  // Remy's response — rendered as plain text in the chat UI
}
```

Any non-2xx response shows the user:
> *"Couldn't reach the backend. Check your server URL in Settings."*

A missing `serverUrl` (not yet configured) throws the sentinel `"no_backend"` error, which shows:
> *"No backend URL configured. Go to Settings to add one."*

---

## Shared Types

Mirror these on the backend — they are the canonical wire format.

```ts
/** A single saved page entry. */
interface SavedUrl {
  url:     string;  // fully-qualified URL
  name:    string;  // page <title> at save time
  savedAt: number;  // Date.now() — milliseconds since Unix epoch
}

/** User-configurable extension settings. */
interface AppSettings {
  serverUrl: string;  // backend base URL, no trailing slash
  authToken: string;  // bearer token; empty string if not configured
}
```

---

## Local Storage Schema

The extension persists state in `chrome.storage.local` under these keys:

| Key         | Type         | Description                                              |
|-------------|--------------|----------------------------------------------------------|
| `savedUrls`  | `SavedUrl[]` | Ordered list of saved pages (newest last)                      |
| `serverUrl`  | `string`     | Backend base URL entered in Settings; empty string if unset    |
| `authToken`  | `string`     | Bearer token; empty string if not configured                   |

---

## Development

```bash
npm install
npm run dev     # Vite + CRXJS with HMR
```

Load the project root as an **unpacked extension** at `chrome://extensions` (enable Developer mode first).

> After editing `manifest.config.ts` or the background service worker, click **Reload** on `chrome://extensions` — HMR does not cover these files.
