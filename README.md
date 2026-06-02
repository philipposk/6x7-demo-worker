# 6×7 demo worker

Render worker for [`demo.6x7.gr`](https://github.com/philipposk/6x7-demo-platform).
Polls `demo.jobs`, runs the right tool against the target URL, uploads the result
to Supabase storage, and marks the job done.

```
claim queued job → render → upload to demo-output bucket → status=done
```

## Tools (tracked on `main`)
- **video** → [demo-pipeline](https://github.com/philipposk/demo-pipeline) `--url=<target>` (auto-scene mode)
- **screenshots** → [screenshot-grid](https://github.com/philipposk/screenshot-grid)

Both are cloned into `$TOOLS_DIR` and `git reset --hard origin/main` + `npm install`
before each job, so renders always use the latest version (the "track main" choice).

## Why a separate service
Vercel can't run headless Chromium + ffmpeg. This runs on a Fly.io VM with both.
It connects **directly to Postgres** (not PostgREST) because the `demo` schema
isn't exposed over REST, and claims jobs with `FOR UPDATE SKIP LOCKED` so it can
scale to multiple instances safely.

## Run locally
```bash
npm install
cp .env.example .env   # fill DATABASE_URL + SUPABASE_SERVICE_ROLE_KEY
node worker.mjs --once # process one queued job and exit
```

## Deploy (S5)
```bash
fly launch --no-deploy        # uses fly.toml
fly secrets set DATABASE_URL=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
                OPENROUTER_API_KEY=... OPENAI_API_KEY=... ELEVENLABS_API_KEY=...
fly deploy
```

## Files
```
worker.mjs            poll loop · claim → render → upload → complete/fail
lib/db.mjs            Postgres claim/complete/fail (FOR UPDATE SKIP LOCKED)
lib/storage.mjs       upload to public demo-output bucket → public URL
lib/repos.mjs         clone/pull demo-pipeline + screenshot-grid (track main)
render/video.mjs      demo-pipeline --url → mp4
render/screenshots.mjs screenshot-grid → zip
Dockerfile            playwright base + ffmpeg + git + zip
fly.toml              Fly.io worker process
```

## Status
Code complete; **not yet deployed or run against the live queue** — that's S5
(needs `DATABASE_URL` + service role + the storage bucket, which deploy provisions).
