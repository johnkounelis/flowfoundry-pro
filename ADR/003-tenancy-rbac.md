# ADR 003: Multi-Tenancy and RBAC

- Tenancy keyed by Organization; Membership has roles: Owner/Admin/Builder/Viewer.
- Row-level filters in Prisma by orgId; indexes for hot queries.
