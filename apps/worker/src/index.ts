import pg from "pg";

// Stage 0-2 worker: the database itself is the "queue".
// In Step 21 this is replaced by SQS, and you will see why that is better.

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 2000);
const MAX_ATTEMPTS = 3;
let running = true;

const log = (level: string, msg: string, extra: object = {}) =>
  console.log(JSON.stringify({ level, msg, time: new Date().toISOString(), ...extra }));

// Claim one job. FOR UPDATE SKIP LOCKED lets several workers run safely:
// each one skips rows another worker already holds.
async function claimJob() {
  const { rows } = await pool.query(`
    UPDATE items SET status = 'processing', attempts = attempts + 1, updated_at = now()
    WHERE id = (
      SELECT id FROM items
      WHERE status = 'pending' AND attempts < ${MAX_ATTEMPTS}
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, url, attempts`);
  return rows[0] as { id: string; url: string; attempts: number } | undefined;
}

async function processJob(job: { id: string; url: string; attempts: number }) {
  log("info", "processing", { id: job.id, url: job.url, attempt: job.attempts });
  try {
    const res = await fetch(job.url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    const title = body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim().slice(0, 300) ?? null;
    // Later (Step 23) the file itself is stored in S3; for now we keep metadata only.
    await pool.query(
      "UPDATE items SET status = 'done', title = $2, size_bytes = $3, error = NULL, updated_at = now() WHERE id = $1",
      [job.id, title, Buffer.byteLength(body)],
    );
    log("info", "done", { id: job.id, title });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Retry until MAX_ATTEMPTS, then give up (an SQS dead-letter queue does this for you later).
    const next = job.attempts >= MAX_ATTEMPTS ? "failed" : "pending";
    await pool.query(
      "UPDATE items SET status = $2, error = $3, updated_at = now() WHERE id = $1",
      [job.id, next, message],
    );
    log("warn", "job error", { id: job.id, error: message, next });
  }
}

async function loop() {
  log("info", "worker started", { pollMs: POLL_MS });
  while (running) {
    try {
      const job = await claimJob();
      if (job) await processJob(job);
      else await new Promise((r) => setTimeout(r, POLL_MS));
    } catch (err) {
      log("error", "loop error", { error: String(err) });
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
  await pool.end();
  log("info", "worker stopped");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    log("info", "stopping after current job", { signal });
    running = false;
  });
}

await loop();
