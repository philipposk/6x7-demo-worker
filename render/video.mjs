// Runs demo-pipeline against a live URL (auto-scene mode) and returns the mp4.
// Streams the child's stdout and maps its [n/4] stage markers to progress text.

import { spawn } from "node:child_process";
import path from "node:path";
import { syncRepo, dir } from "../lib/repos.mjs";

/**
 * @param {object} job  demo.jobs row
 * @param {(stage:string)=>void} onProgress
 * @returns {Promise<{file:string}>}
 */
export async function renderVideo(job, onProgress = () => {}) {
  onProgress("Preparing render tools…");
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

  await new Promise((resolve, reject) => {
    const child = spawn("node", args, { cwd: repo, env: process.env });
    let buf = "";
    child.stdout.on("data", (d) => {
      const s = d.toString();
      buf += s;
      process.stdout.write(s);
      if (s.includes("Auto-discovering")) onProgress("Reading your site…");
      else if (s.includes("[1/4]")) onProgress("Writing the script & narration…");
      else if (s.includes("[2/4]")) onProgress("Recording your site in a browser…");
      else if (s.includes("[3/4]")) onProgress("Building the audio track…");
      else if (s.includes("[4/4]")) onProgress("Adding zoom, captions & encoding…");
    });
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`pipeline exited ${code}\n${buf.slice(-500)}`)),
    );
  });

  return { file: path.join(repo, "output", `${slug}-demo-out.mp4`) };
}
