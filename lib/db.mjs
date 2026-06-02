// Direct Postgres access to demo.jobs. The worker bypasses PostgREST/RLS (the
// `demo` schema isn't exposed over REST) and connects straight to the DB with
// the service connection string, claiming jobs with FOR UPDATE SKIP LOCKED so
// multiple worker instances never grab the same job.

import pg from "pg";

const { Pool } = pg;
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 4,
});

/** Atomically claim the oldest queued job → status 'rendering'. Null if none. */
export async function claimJob() {
  const { rows } = await pool.query(`
    update demo.jobs
       set status = 'rendering', updated_at = now()
     where id = (
       select id from demo.jobs
        where status = 'queued'
        order by created_at
        for update skip locked
        limit 1
     )
    returning *;
  `);
  return rows[0] ?? null;
}

export async function completeJob(id, outputUrl) {
  await pool.query(
    `update demo.jobs set status='done', output_url=$2, updated_at=now() where id=$1`,
    [id, outputUrl],
  );
}

export async function failJob(id, message) {
  await pool.query(
    `update demo.jobs set status='error', error=$2, updated_at=now() where id=$1`,
    [id, String(message).slice(0, 1000)],
  );
}
