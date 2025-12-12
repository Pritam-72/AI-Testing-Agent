# AI Testing Agent

A platform to automate end-to-end testing using AI.

## Architecture
- **Frontend**: Next.js (App Router), Tailwind CSS
- **Backend**: Fastify, Prisma, Postgres
- **Worker**: BullMQ, Playwright, OpenAI
- **Infra**: Docker Compose (Postgres, Redis, MinIO)

## Quick Start

1. Start Services:
   ```bash
   docker compose up -d
   ```

2. Backend:
   ```bash
   cd backend
   cp .env.example .env # (Already created)
   npx prisma db push
   npm run dev
   ```

3. Worker:
   ```bash
   cd worker
   npm run dev
   ```

4. Frontend:
   ```bash
   cd frontend
   npm run dev
   ```

## Configuration
Edit `.env` files in `backend/` and `worker/` to set your OpenAI API Key.
By default, the worker runs in "MOCK" mode if the key is `mock-key`.
