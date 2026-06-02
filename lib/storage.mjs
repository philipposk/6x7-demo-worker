// Uploads a finished render to the public `demo-output` Supabase storage bucket
// and returns its public URL. Uses the service role key.

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const BUCKET = "demo-output";

/** Create the public bucket once (idempotent). */
export async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

const CONTENT_TYPE = { ".mp4": "video/mp4", ".zip": "application/zip", ".srt": "text/plain" };

/**
 * @param {string} localPath  file to upload
 * @param {string} key        destination key, e.g. `<jobId>/demo.mp4`
 * @returns {Promise<string>} public URL
 */
export async function upload(localPath, key) {
  const body = await readFile(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const { error } = await supabase.storage.from(BUCKET).upload(key, body, {
    contentType: CONTENT_TYPE[ext] || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(`upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}
