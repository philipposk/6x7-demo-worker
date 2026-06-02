// Runs demo-pipeline against a live URL (auto-scene mode) and returns the mp4.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { syncRepo, dir } from "../lib/repos.mjs";

const exec = promisify(execFile);

/**
 * @param {object} job  demo.jobs row (target_url, options{mode,format,voice,subtitles,preset})
 * @returns {Promise<{file:string, srt?:string}>}
 */
export async function renderVideo(job) {
  await syncRepo("pipeline");
  const repo = dir("pipeline");
  const o = job.options || {};
  const slug = `job-${job.id}`;

  const args = [
    "pipeline.mjs", slug,
    `--url=${job.target_url}`,
    `--mode=${o.mode || "zoom"}`,
    `--format=${o.format || "landscape"}`,
    `--tts=${o.voice || "edge"}`,
    `--subs=${o.subtitles || "burn"}`,
    `--preset=${o.preset || "full"}`,
    "--suffix=out",
  ];

  // Pass through keys the pipeline needs (TTS + LLM narration). The worker's env
  // carries them; demo-pipeline reads them via dotenv/process.env.
  await exec("node", args, {
    cwd: repo,
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
    timeout: 1000 * 60 * 10,
  });

  const file = path.join(repo, "output", `${slug}-demo-out.mp4`);
  return { file };
}
