# FS-01 — Multi-Vendor E-Commerce Marketplace

An Amazon-style marketplace foundation with customer/vendor/admin roles.

## Current implementation
- Express + TypeScript API
- PostgreSQL + Prisma schema
- Registration and login with hashed passwords and JWT
- Role-protected vendor product creation and admin vendor approval
- Public product search endpoint
- React + TypeScript storefront starter
- Docker Compose PostgreSQL service

## Run locally
1. Install Node.js 20+ and Docker.
2. In this folder, start PostgreSQL: `docker compose up -d`.
3. Backend: `cd backend`, copy `.env.example` to `.env`, then run:
   `npm install`
   `npx prisma generate`
   `npx prisma db push`
   `npm run dev`
4. Frontend in a second terminal: `cd frontend`, run:
   `npm install`
   `npm run dev`
5. Open `http://localhost:5173`; API health check: `http://localhost:4001/health`.

## API starter
- `POST /api/auth/register` — create customer or vendor
- `POST /api/auth/login` — receive JWT
- `GET /api/products?search=` — search active products
- `POST /api/products` — vendor creates product (JWT; vendor must be approved)
- `PATCH /api/products/:id` — owner vendor or admin updates product
- `GET /api/admin/vendors` — admin lists vendors
- `PATCH /api/admin/vendors/:id/approve` — admin approves vendor
- `GET /health`

## Before final internship submission
Implement and test: cart persistence with Redis, order lifecycle, Razorpay/Stripe test integration,
commission settlement logic, S3 image uploads, Elasticsearch, reviews, coupons, PDF invoices,
admin analytics, automated tests, deployment, API docs, and architecture diagram.
Never store real card data. Keep secrets in environment variables.
