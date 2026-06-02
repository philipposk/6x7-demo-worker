// Keeps the two tool repos checked out and on the latest `main` (per the
// "track main" decision). Cloned once, then `git pull` + `npm install` before
// each job so renders always use the newest version.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import path from "node:path";

const exec = promisify(execFile);
export const TOOLS_DIR = process.env.TOOLS_DIR || "/tools";

const REPOS = {
  pipeline: "https://github.com/philipposk/demo-pipeline.git",
  screenshots: "https://github.com/philipposk/screenshot-grid.git",
};

export const dir = (name) => path.join(TOOLS_DIR, name);

async function run(cmd, args, cwd) {
  return exec(cmd, args, { cwd, maxBuffer: 64 * 1024 * 1024 });
}

/** Clone if missing, else pull latest main; then install deps. */
export async function syncRepo(name) {
  const target = dir(name);
  if (!existsSync(target)) {
    await run("git", ["clone", "--depth", "1", REPOS[name], target]);
  } else {
    await run("git", ["fetch", "origin", "main"], target);
    await run("git", ["reset", "--hard", "origin/main"], target);
  }
  await run("npm", ["install", "--no-audit", "--no-fund"], target);
  // Ensure the Chromium build matching this repo's Playwright is present.
  await run("npx", ["playwright", "install", "chromium"], target);
  return target;
}
