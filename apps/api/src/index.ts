import Fastify from "fastify";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });
// Structured JSON logs: CloudWatch can search these fields later (Step 27).
const app = Fastify({ logger: true });

// Liveness: is the process alive? Never touch the database here,
// or a DB outage would make the load balancer kill healthy servers.
app.get("/health", async () => ({ status: "ok" }));

// Readiness: can this server do useful work right now?
app.get("/ready", async (_req, reply) => {
  try {
    await pool.query("SELECT 1");
    return { status: "ready" };
  } catch (err) {
    app.log.error({ err }, "readiness check failed");
    return reply.code(503).send({ status: "not ready" });
  }
});

// Save a link. The API only records it; the worker does the slow download.
app.post<{ Body: { url?: string } }>("/items", async (req, reply) => {
  const url = req.body?.url;
  if (!url || !/^https?:\/\//.test(url)) {
    return reply.code(400).send({ error: "body must be {\"url\": \"https://...\"}" });
  }
  const { rows } = await pool.query(
    "INSERT INTO items (url) VALUES ($1) RETURNING id, url, status, created_at",
    [url],
  );
  // 202 Accepted: "got it, processing in the background".
  return reply.code(202).send(rows[0]);
});

app.get("/items", async () => {
  const { rows } = await pool.query(
    "SELECT id, url, status, title, size_bytes, error, created_at FROM items ORDER BY id DESC LIMIT 50",
  );
  return rows;
});

app.get<{ Params: { id: string } }>("/items/:id", async (req, reply) => {
  const { rows } = await pool.query("SELECT * FROM items WHERE id = $1", [req.params.id]);
  if (rows.length === 0) return reply.code(404).send({ error: "not found" });
  return rows[0];
});

// Graceful shutdown: finish in-flight requests when the server is stopped
// (matters for rolling deploys and Auto Scaling scale-in later).
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    await pool.end();
    process.exit(0);
  });
}

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
