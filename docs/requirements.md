# LinkVault requirements

LinkVault is a learning project: a pretend startup used to practice AWS solutions architecture.

## Functional

- Save a link (URL); the app downloads it in the background
- List saved items with their status (pending, processing, done, failed)
- Later: file uploads, user login, AI summaries, smart search

## Non-functional targets

| Target | Value | Means |
| --- | --- | --- |
| Availability (SLO) | 99.9% | About 43 minutes of downtime allowed per month |
| API latency | p95 under 300 ms | 95% of requests answer within 300 ms |
| RPO (Recovery Point Objective) | 15 minutes | Lose at most 15 minutes of data |
| RTO (Recovery Time Objective) | 1 hour | Back online within 1 hour after a disaster |
| Security | Encrypted at rest and in transit | KMS for storage, TLS (HTTPS) for traffic |
| Cost | Stay inside $200 AWS credits | Clean up after every session |

## Constraints

- AWS Free plan, region `us-east-1`, ends around April 2027
- One engineer (me), part-time
