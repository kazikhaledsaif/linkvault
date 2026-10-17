# LinkVault

> A learning project: a pretend startup used to practice AWS solutions architecture,
> from one EC2 server to a production-grade platform. Not a real product.

Users save links; a background worker downloads them and records metadata.
The infrastructure evolves stage by stage, each driven by a business problem.
Architecture decisions are recorded in [`docs/adr`](docs/adr).

## Run locally

Requirements: Node.js 22+, Docker.

```bash
cp .env.example .env
npm install
npm run db:up          # PostgreSQL in Docker, schema loaded automatically
npm run dev:api        # terminal 1: API on http://localhost:3000
npm run dev:worker     # terminal 2: background worker
```

Try it:

```bash
curl localhost:3000/health
curl localhost:3000/ready
curl -X POST localhost:3000/items -H 'content-type: application/json' -d '{"url":"https://example.com"}'
curl localhost:3000/items
```

Open `apps/web/index.html` with a static server on port 5500 (for example VS Code Live Server) for a simple UI.

## Layout

```
apps/      api, worker, web
db/        schema.sql
infra/     terraform (from Step 8)
deploy/    helm, gitops (Stage 6)
docs/      requirements, adr, postmortems, runbooks, diagrams
```
