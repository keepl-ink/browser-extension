import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ext } from "@/lib/ext";
import { cn } from "@/lib/utils";
import type { SyncMode } from "@/store/AppContext";
import { useAppStore } from "@/store/AppContext";

type ConnectionStatus =
	| { state: "idle" }
	| { state: "connecting" }
	| { state: "connected" }
	| { state: "error"; message: string };

export default function SettingsView() {
	const { settings, saveSettings } = useAppStore();

	// ── Drafts (local edit state before hitting Save) ─────────────────────────
	const [syncMode, setSyncMode] = useState<SyncMode>(settings.syncMode);
	const [keepLinkApiKey, setKeepLinkApiKey] = useState(settings.keepLinkApiKey);
	const [showKeepLinkKey, setShowKeepLinkKey] = useState(false);
	const [serverUrl, setServerUrl] = useState(settings.serverUrl);
	const [authToken, setAuthToken] = useState(settings.authToken);
	const [showToken, setShowToken] = useState(false);
	const [status, setStatus] = useState<ConnectionStatus>({ state: "idle" });

	// Sync drafts when the store loads from storage asynchronously
	useEffect(() => {
		setSyncMode(settings.syncMode);
		setKeepLinkApiKey(settings.keepLinkApiKey);
		setServerUrl(settings.serverUrl);
		setAuthToken(settings.authToken);
	}, [
		settings.syncMode,
		settings.keepLinkApiKey,
		settings.serverUrl,
		settings.authToken,
	]);

	// ── Helpers ───────────────────────────────────────────────────────────────

	const localOnly = syncMode === "local";
	const isCustom = syncMode === "custom";

	function handleLocalToggle(on: boolean) {
		// Turning local off defaults to keeplink unless custom was already active
		setSyncMode(on ? "local" : syncMode === "custom" ? "custom" : "keeplink");
		setStatus({ state: "idle" });
	}

	function handleCustomToggle(on: boolean) {
		setSyncMode(on ? "custom" : "keeplink");
		setStatus({ state: "idle" });
	}

	async function handleSave() {
		setStatus({ state: "connecting" });
		try {
			await saveSettings({ syncMode, keepLinkApiKey, serverUrl, authToken });
			setStatus({ state: "connected" });
			setTimeout(() => setStatus({ state: "idle" }), 3_000);
		} catch (err) {
			setStatus({
				state: "error",
				message:
					err instanceof Error ? err.message : "An unexpected error occurred.",
			});
		}
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="h-full overflow-y-auto p-4 flex flex-col gap-4">
			{/* ── Local only toggle ── */}
			<SettingRow
				label="Local only"
				description="Save pages to this device only. No data leaves your browser."
			>
				<Switch checked={localOnly} onCheckedChange={handleLocalToggle} />
			</SettingRow>

			{/* ── keepl.ink + custom sections (hidden when local only) ── */}
			{!localOnly && (
				<>
					<div className="h-px bg-border" />

					{/* keepl.ink card */}
					<div
						className={cn(
							"rounded-lg border p-3.5 flex flex-col gap-3 transition-opacity",
							isCustom
								? "opacity-40 pointer-events-none"
								: "border-primary/40 bg-primary/5",
						)}
					>
						<div className="flex items-start justify-between gap-2">
							<div className="flex flex-col gap-0.5">
								<div className="flex items-center gap-2">
									<span className="text-sm font-semibold text-foreground">
										keepl.ink
									</span>
									<span className="text-[0.65rem] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
										Recommended
									</span>
								</div>
								<p className="text-xs text-muted-foreground">
									AI-powered sync, search, and chat — the easiest way to use
									Keepl.ink.
								</p>
							</div>
						</div>

						{/* API key input */}
						<Field>
							<FieldLabel htmlFor="keeplink-key">API Key</FieldLabel>
							<div className="relative">
								<Input
									id="keeplink-key"
									type={showKeepLinkKey ? "text" : "password"}
									placeholder="kl_••••••••••••••••"
									value={keepLinkApiKey}
									onChange={(e) => setKeepLinkApiKey(e.target.value)}
									className="pr-9"
									autoComplete="off"
								/>
								<EyeToggle
									show={showKeepLinkKey}
									onToggle={() => setShowKeepLinkKey((v) => !v)}
								/>
							</div>
							<FieldDescription>
								Find your API key in the{" "}
								<button
									type="button"
									className="underline underline-offset-2 hover:text-foreground transition-colors"
									onClick={() =>
										ext.tabs.create({
											url: "https://keepl.ink/dashboard/api-keys",
										})
									}
								>
									keepl.ink dashboard
								</button>
								.
							</FieldDescription>
						</Field>

						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-fit gap-1.5"
							onClick={() =>
								ext.tabs.create({ url: "https://keepl.ink/login" })
							}
						>
							Login to keepl.ink
							<ExternalLinkIcon />
						</Button>
					</div>

					<div className="h-px bg-border" />

					{/* ── Custom backend toggle ── */}
					<SettingRow
						label="Custom backend"
						description="Bring your own self-hosted backend instead."
					>
						<Switch checked={isCustom} onCheckedChange={handleCustomToggle} />
					</SettingRow>

					{/* Custom backend fields */}
					{isCustom && (
						<div className="flex flex-col gap-3 pl-1">
							<Field>
								<FieldLabel htmlFor="server-url">Server URL</FieldLabel>
								<Input
									id="server-url"
									type="url"
									placeholder="https://your-server.com"
									value={serverUrl}
									onChange={(e) => setServerUrl(e.target.value)}
									autoComplete="off"
								/>
								<FieldDescription>
									Base URL without a trailing slash.
								</FieldDescription>
							</Field>

							<Field>
								<FieldLabel htmlFor="auth-token">Auth Token</FieldLabel>
								<div className="relative">
									<Input
										id="auth-token"
										type={showToken ? "text" : "password"}
										placeholder="••••••••••••••••"
										value={authToken}
										onChange={(e) => setAuthToken(e.target.value)}
										className="pr-9"
										autoComplete="off"
									/>
									<EyeToggle
										show={showToken}
										onToggle={() => setShowToken((v) => !v)}
									/>
								</div>
								<FieldDescription>
									Sent as{" "}
									<code className="font-mono text-[0.7rem]">
										Authorization: Bearer
									</code>
									. Never included in URLs.
								</FieldDescription>
							</Field>
						</div>
					)}
				</>
			)}

			<div className="h-px bg-border" />

			{/* ── Save row ── */}
			<div className="flex items-center gap-3">
				<Button
					size="sm"
					onClick={handleSave}
					disabled={status.state === "connecting"}
				>
					{status.state === "connecting" ? "Saving…" : "Save"}
				</Button>

				{status.state === "connected" && (
					<StatusBadge color="emerald">Connected</StatusBadge>
				)}
				{status.state === "error" && (
					<StatusBadge color="destructive">{status.message}</StatusBadge>
				)}
			</div>
		</div>
	);
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function SettingRow({
	label,
	description,
	children,
}: {
	label: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex flex-col gap-0.5 min-w-0">
				<span className="text-sm font-medium text-foreground">{label}</span>
				<span className="text-xs text-muted-foreground">{description}</span>
			</div>
			{children}
		</div>
	);
}

function StatusBadge({
	color,
	children,
}: {
	color: "emerald" | "destructive";
	children: React.ReactNode;
}) {
	return (
		<span
			className={cn(
				"flex items-center gap-1.5 text-xs font-medium",
				color === "emerald"
					? "text-emerald-600 dark:text-emerald-400"
					: "text-destructive",
			)}
		>
			<span
				className={cn(
					"size-1.5 rounded-full shrink-0",
					color === "emerald" ? "bg-emerald-500" : "bg-destructive",
				)}
			/>
			{children}
		</span>
	);
}

function EyeToggle({
	show,
	onToggle,
}: {
	show: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			aria-label={show ? "Hide" : "Show"}
			onClick={onToggle}
			className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
		>
			{show ? (
				<svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
					<path
						fillRule="evenodd"
						d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z"
						clipRule="evenodd"
					/>
					<path d="M10.748 13.93l2.523 2.523a10.003 10.003 0 0 1-9.607-2.452 10.004 10.004 0 0 1-1.998-2.636 1.651 1.651 0 0 1 0-1.185 10.004 10.004 0 0 1 3.26-4.14l2.523 2.524a4 4 0 0 0 3.3 3.869Z" />
				</svg>
			) : (
				<svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
					<path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
					<path
						fillRule="evenodd"
						d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
						clipRule="evenodd"
					/>
				</svg>
			)}
		</button>
	);
}

function ExternalLinkIcon() {
	return (
		<svg viewBox="0 0 16 16" fill="currentColor" className="size-3 opacity-60">
			<path
				fillRule="evenodd"
				d="M4.22 11.78a.75.75 0 0 1 0-1.06l6.5-6.5H7.75a.75.75 0 0 1 0-1.5h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V4.81l-6.5 6.5a.75.75 0 0 1-1.06 0Z"
				clipRule="evenodd"
			/>
		</svg>
	);
}
