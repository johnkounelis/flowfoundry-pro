# Runbooks

## Secret Rotation
- Rotate NEXTAUTH_SECRET, Stripe keys, and OAuth client secrets quarterly.
- Use Kubernetes `Secret` and Terraform to update and roll deployments.

## Failed Runs
- Inspect Run timeline in UI. Retry step or partial replay.
- Check Inngest function logs, Sentry, and OTEL traces.

## Scaling
- Horizontal autoscale web and worker Deployments.
- Postgres: create read replicas; use connection pooling.
- Redis: monitor memory; increase maxmemory and persist snapshots.

## Upgrades
- Renovate PRs gated by CI.
- Migrations tested in CI with rollback.
