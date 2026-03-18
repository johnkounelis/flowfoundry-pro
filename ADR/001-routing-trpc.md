# ADR 001: API Routing with tRPC

- Status: Accepted
- Context: Need end-to-end type safety, minimal boilerplate, SSR-friendly integration with Next.js.
- Decision: Use tRPC for app API. Webhook endpoints (Stripe, Inngest receiver) remain plain routes.
- Consequences: Shared zod schemas; contract tests target tRPC procedures.
