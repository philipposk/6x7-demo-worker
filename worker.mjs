// demo.6x7.gr render worker.
//
// Loop: claim the oldest queued job → run the right tool against its URL →
// upload the result to Supabase storage → mark the job done (or error).
//
//   node worker.mjs           # long-running poll loop
//   node worker.mjs --once    # process one job then exit (cron-friendly)

import "dotenv/config";
import path from "node:path";
import { claimJob, completeJob, failJob, pool } from "./lib/db.mjs";
import { ensureBucket, upload } from "./lib/storage.mjs";
import { renderVideo } from "./render/video.mjs";
import { renderScreenshots } from "./render/screenshots.mjs";

const POLL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
const once = process.argv.includes("--once");

async function processJob(job) {
  console.log(`[job ${job.id}] ${job.service} · ${job.target_url}`);
  const { file } =
    job.service === "screenshots"
      ? await renderScreenshots(job)
      : await renderVideo(job);

  const key = `${job.id}/${path.basename(file)}`;
  const url = await upload(file, key);
  await completeJob(job.id, url);
  console.log(`[job ${job.id}] done → ${url}`);
}

async function tick() {
  const job = await claimJob();
  if (!job) return false;
  try {
    await processJob(job);
  } catch (err) {
    console.error(`[job ${job.id}] failed:`, err.message);
    await failJob(job.id, err.message);
  }
  return true;
}

async function main() {
  await ensureBucket();
  console.log(`worker up · poll ${POLL_MS}ms · once=${once}`);

  if (once) {
    await tick();
    await pool.end();
    return;
  }
  // Drain continuously; sleep only when the queue is empty.
  for (;;) {
    const had = await tick();
    if (!had) await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((err) => {
  console.error("worker fatal:", err);
  process.exit(1);
});
