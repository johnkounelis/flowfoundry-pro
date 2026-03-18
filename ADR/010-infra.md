# ADR 010: Infrastructure

- Local: docker-compose for Postgres, Redis, Mailhog, Unleash, PostHog, OTEL collector.
- Prod: Kubernetes manifests with kustomize overlays; Terraform to provision managed services.
