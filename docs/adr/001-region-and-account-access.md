# ADR-001: Region and account access

Date: 2026-10-17   Status: accepted

## Context

LinkVault runs on a single AWS Free plan account with about $200 in credits. The team is one engineer in Tokyo. Latency to users does not matter yet; cost and safety do.

## Options considered

1. **Region:** `ap-northeast-1` (Tokyo, closest) vs `us-east-1` (N. Virginia, cheapest, every new service lands there first)
2. **Daily access:** root user vs IAM user with MFA vs IAM Identity Center (SSO)
3. **CLI access:** long-lived access keys vs `aws login` (short-lived credentials) vs SSO profiles

## Decision

- Region `us-east-1`: lower prices stretch the credits, and CloudFront certificates must live there anyway.
- Root user locked with MFA and never used day to day.
- Daily work as an IAM user with MFA, or IAM Identity Center if the Free plan allows AWS Organizations.
- CLI uses `aws login` or an SSO profile: no long-lived access keys anywhere.

## Consequences

- Around 150 ms extra latency from Tokyo; acceptable for a learning project.
- A real company would use AWS Organizations with separate accounts and Identity Center (revisit in Step 33).
