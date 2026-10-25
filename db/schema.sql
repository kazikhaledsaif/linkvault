-- LinkVault schema (Stage 0). Users and auth arrive with Cognito in Step 15.
CREATE TABLE IF NOT EXISTS items (
  id          BIGSERIAL PRIMARY KEY,
  url         TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  title       TEXT,
  size_bytes  BIGINT,
  error       TEXT,
  attempts    INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS items_status_idx ON items (status, created_at);
