# FlowFoundry Pro

An AI-powered workflow automation platform built with **Next.js 14**, **TypeScript**, **tRPC**, **Prisma**, **Inngest**, and **Stripe**. Build visual flows that connect apps (Gmail, Slack, Notion, Sheets, Webhooks), add AI steps (summarize, classify, extract), collaborate with your team, and monitor cost/tokens/runs in real time.

![Dashboard](screenshots/dashboard.png)

## Features

- **Visual Flow Builder** — Drag-and-drop workflow editor with live node connections
- **AI Steps** — Classify, summarize, and extract data using GPT-4o-mini
- **100+ Integrations** — Slack, Gmail, Notion, Google Sheets, HTTP, Webhooks
- **Execution Engine** — Inngest-powered async runner with retry and step logging
- **Real-time Monitoring** — Track runs, tokens, costs, and success rates
- **Team Collaboration** — Role-based access (Owner, Admin, Builder, Viewer)
- **Billing & Plans** — Stripe subscriptions with usage metering (Free / Pro / Business)
- **Templates** — Pre-built workflow templates for common use cases
- **Enterprise Security** — OWASP ASVS L2, encrypted secrets, CodeQL, Trivy, gitleaks

## Screenshots

<table>
  <tr>
    <td><img src="screenshots/flow-builder.png" alt="Flow Builder" /><br/><b>Visual Flow Builder</b></td>
    <td><img src="screenshots/templates.png" alt="Templates" /><br/><b>Workflow Templates</b></td>
  </tr>
  <tr>
    <td><img src="screenshots/runs.png" alt="Runs" /><br/><b>Execution Monitoring</b></td>
    <td><img src="screenshots/connectors.png" alt="Connectors" /><br/><b>Connectors & Integrations</b></td>
  </tr>
  <tr>
    <td><img src="screenshots/billing.png" alt="Billing" /><br/><b>Billing & Plans</b></td>
    <td><img src="screenshots/dashboard.png" alt="Dashboard" /><br/><b>Dashboard Overview</b></td>
  </tr>
</table>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Radix UI |
| API | tRPC, Zod validation |
| Database | PostgreSQL, Prisma ORM |
| Auth | NextAuth.js v5 (Credentials, Google, GitHub) |
| Queue | Inngest (async flow execution) |
| Payments | Stripe (subscriptions + usage metering) |
| Observability | OpenTelemetry, Sentry |
| Testing | Vitest, Playwright, axe-core, k6 |
| Infra | Docker, Kubernetes, Terraform |
| Security | CodeQL, Trivy, gitleaks, npm audit |

## Quickstart

> **Requirements:** Node 20+, pnpm 9+, Docker, Docker Compose

```bash
git clone https://github.com/johnkounelis/flowfoundry-pro.git
cd flowfoundry-pro
cp .env.example .env
pnpm i
docker compose -f infra/docker-compose.yml up -d
pnpm dev:bootstrap
pnpm dev
```

Open **http://localhost:3000**

**Demo credentials:** `demo@flowfoundry.local` / `password`

### What `dev:bootstrap` does

- Runs Prisma migrations
- Seeds demo org, user, connectors, templates, flows, and run history
- Enables Stripe mock mode (`STRIPE_MOCK=1`)

## Project Structure

```
flowfoundry-pro/
├── apps/
│   ├── web/              # Next.js frontend + API (tRPC, NextAuth, Stripe)
│   └── worker/           # Inngest worker process
├── packages/
│   ├── config/           # Shared env schema, plan limits, feature flags
│   ├── connector-sdk/    # Connector types + built-in connectors (Slack, Gmail, HTTP...)
│   ├── db/               # Prisma schema, migrations, seed
│   ├── otel/             # OpenTelemetry instrumentation
│   └── ui/               # Shared UI components (Button, Card, Badge)
├── infra/
│   ├── docker-compose.yml
│   ├── k8s/              # Kubernetes manifests (base + overlays)
│   └── terraform/        # Cloud infrastructure
├── database/             # Seed entry point
├── docs/                 # MDX documentation
├── k6/                   # Load tests
├── scripts/              # Dev and CI scripts
└── ADR/                  # Architecture Decision Records
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run web + worker in watch mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Unit + component tests (Vitest) |
| `pnpm e2e` | Playwright E2E tests |
| `pnpm a11y` | Accessibility checks (axe-core) |
| `pnpm k6` | Load test (k6) |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:reset` | Reset database |
| `pnpm sbom` | Generate CycloneDX SBOM |
| `pnpm scan:secrets` | Run gitleaks |
| `pnpm scan:trivy` | Scan container images |
| `pnpm scan:codeql` | Run CodeQL analysis |

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://postgres:postgres@localhost:5432/flowfoundry` |
| `NEXTAUTH_SECRET` | Auth.js secret | `changeme-nextauth` |
| `NEXTAUTH_URL` | Auth.js URL | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth (optional) | |
| `GITHUB_ID/SECRET` | GitHub OAuth (optional) | |
| `STRIPE_*` | Stripe keys & prices | Mock mode with `STRIPE_MOCK=1` |
| `OPENAI_API_KEY` | OpenAI for AI steps (optional) | Falls back to extractive summary |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint | `http://localhost:4318` |

## Architecture

- **Monorepo** managed by Turborepo with pnpm workspaces
- **tRPC** for type-safe API with Zod validation on every endpoint
- **Inngest** for durable async flow execution with retries
- **Multi-tenant** with org-based isolation and RBAC
- **Stripe** integration with checkout, billing portal, and usage metering
- **Credential encryption** with sealed box (libsodium) at rest
- **CI/CD** via GitHub Actions with CodeQL, Trivy, and automated deploys

## API Reference

All API endpoints are served via tRPC at `/api/trpc`. The following routers are available:

| Router | Endpoints | Description |
|--------|-----------|-------------|
| `flows` | `list`, `get`, `create`, `saveVersion`, `trigger`, `duplicate`, `archive`, `delete`, `update` | CRUD and execution for workflow definitions |
| `runs` | `list`, `getMetrics`, `getById` | Execution history and analytics |
| `org` | `get`, `update`, `invite`, `removeMember` | Organization management |
| `billing` | `getUsage`, `createCheckout`, `portalLink` | Stripe billing and subscription |

### Health Check

```
GET /api/health
```

Returns `200` when all dependencies (database, Redis) are reachable, `503` when degraded. Used as the Kubernetes readiness probe.

### Rate Limiting

API requests are rate-limited per user with a sliding-window algorithm backed by Redis:

| Plan | Requests / minute |
|------|-------------------|
| Free | 60 |
| Pro | 300 |
| Business | 1,000 |

Rate limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`) are included on every response.

## Troubleshooting

- **Auth not working?** Ensure Postgres is running and `pnpm dev:bootstrap` completed
- **Migrations fail?** Run `docker ps` to check Postgres, then `pnpm db:reset`
- **Stripe errors?** Set `STRIPE_MOCK=1` in `.env` for local development
- **Worker not processing?** Check Inngest dev key and `apps/worker` logs

## License

MIT License - Copyright (c) 2026 John Kounelis. See [LICENSE](LICENSE) for details.
