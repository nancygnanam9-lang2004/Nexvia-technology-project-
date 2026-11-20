# Architecture Overview

## FS-01 Marketplace
Browser (React + TypeScript) -> Express REST API -> Prisma ORM -> PostgreSQL.
JWT authenticates users; role middleware protects vendor/admin routes. Vendor records are linked
one-to-one with users. Product records belong to vendors. Orders contain order items.

Planned integrations: Redis (cart/session cache), S3 (product images), Elasticsearch (search),
Razorpay/Stripe test mode (payments), PDF invoice generation.

## FS-04 SaaS Project Management
Browser (React + TypeScript) -> Express REST API -> Prisma ORM -> PostgreSQL.
Users join workspaces through Membership. Projects belong to a workspace; issues belong to projects.
The API verifies membership before workspace/project/issue access. AuditLog records key mutations.

Planned integrations: Celery/background worker if Django is mandated, webhooks, notification jobs,
Stripe Billing test mode, GitHub Actions and Docker deployment.

## Security principles
- Hash passwords; never store plaintext passwords.
- Keep JWT and provider secrets in environment variables.
- Never commit `.env` files.
- Validate request bodies and authorize every protected resource.
- Add rate limiting, secure headers, refresh-token strategy and automated authorization tests
  before production deployment.
