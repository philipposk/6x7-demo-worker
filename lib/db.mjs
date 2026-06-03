// Job state access via Supabase RPCs, called with the secret key (service_role).
// No Postgres connection string needed — the demo schema isn't exposed over
// REST, so SECURITY DEFINER functions in public do the work.

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

/** Claim the oldest queued job (poll model). Null if none. */
export async function claimJob() {
  const { data, error } = await sb.rpc("demo_worker_claim_next");
  if (error) throw new Error(error.message);
  return data ?? null;
}

/** Claim a specific job by id (trigger / GitHub-Actions model). */
export async function claimJobById(id) {
  const { data, error } = await sb.rpc("demo_worker_claim", { p_id: id });
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function setProgress(id, stage) {
  try { await sb.rpc("demo_worker_progress", { p_id: id, p_stage: stage }); } catch {}
}

export async function completeJob(id, outputUrl) {
  const { error } = await sb.rpc("demo_worker_complete", { p_id: id, p_url: outputUrl });
  if (error) throw new Error(error.message);
}

export async function failJob(id, message) {
  await sb.rpc("demo_worker_fail", { p_id: id, p_msg: String(message) });
}

// Kept for API compatibility with the old pg pool (worker.mjs calls pool.end()).
export const pool = { end: async () => {} };
