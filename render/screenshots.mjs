// Runs screenshot-grid against a live URL and returns a zip of the shots + the
// generated README grid.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { syncRepo, dir } from "../lib/repos.mjs";

const exec = promisify(execFile);

/**
 * @param {object} job  demo.jobs row (target_url)
 * @returns {Promise<{file:string}>}
 */
export async function renderScreenshots(job) {
  await syncRepo("screenshots");
  const repo = dir("screenshots");
  const name = new URL(job.target_url).hostname.replace(/^www\./, "");

  // screenshot-grid reads apps.json → one entry per app/url.
  await writeFile(
    path.join(repo, "apps.json"),
    JSON.stringify({ apps: [{ name, url: job.target_url }] }, null, 2),
  );

  // `npm run build` = capture all + generate README grid (per its README).
  await exec("npm", ["run", "build"], {
    cwd: repo,
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
    timeout: 1000 * 60 * 8,
  });

  // Zip the shots + the generated README into one downloadable file.
  const zip = path.join(repo, `job-${job.id}.zip`);
  await exec("zip", ["-r", zip, "shots", "README.md"], { cwd: repo, maxBuffer: 64 * 1024 * 1024 });
  return { file: zip };
}
