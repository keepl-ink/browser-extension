import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const artifactsDir = path.join(rootDir, "artifacts");
const packageJson = JSON.parse(
	readFileSync(path.join(rootDir, "package.json"), "utf8"),
);

function sanitizeName(value) {
	return String(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function run(command, args, cwd = rootDir) {
	execFileSync(command, args, {
		cwd,
		stdio: "inherit",
	});
}

run("pnpm", ["run", "build"]);

if (!existsSync(distDir)) {
	throw new Error("Build succeeded but dist/ was not created.");
}

mkdirSync(artifactsDir, { recursive: true });

const archiveName = `${sanitizeName(packageJson.name)}-chrome-${packageJson.version}.zip`;
const archivePath = path.join(artifactsDir, archiveName);

rmSync(archivePath, { force: true });

if (process.platform === "darwin") {
	run("ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", "dist", archivePath]);
} else {
	run("zip", ["-r", archivePath, "."], distDir);
}

console.log(`Chrome package written to ${archivePath}`);
