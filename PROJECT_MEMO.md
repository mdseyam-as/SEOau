# Project Memo (SEOau)

## Overview
- Product: SEO Generator Telegram WebApp (frontend + backend)
- Frontend: Vite + React 19, TS, Tailwind (cdn in index.html), main entry `index.tsx`
- Backend: Express 5, Prisma, PostgreSQL, Telegram WebApp auth

## Layout
- Frontend app (root): `App.tsx`, `index.tsx`, `components/`, `services/`, `hooks/`, `types.ts`, `index.css`, `index.html`, `vite.config.ts`
- Backend app: `backend/server.js`, `backend/routes/`, `backend/middleware/`, `backend/utils/`, `backend/services/`, `backend/config/`
- Prisma schema: `backend/prisma/schema.prisma`
- Seed script: `prisma/seed.js`
- Extra SMTP server: `server.js` (port 3001, separate from backend)
- Docs: `docs/`, `plans/`

## Frontend notes
- Auth UI: `components/AuthScreen.tsx` (Telegram WebApp + dev login)
- API wrapper: `services/apiService.ts` adds `X-Telegram-Init-Data`, optional `X-Dev-Telegram-Id`
- User/plan state: `hooks/useAuth.ts`
- Result render: `components/ResultView.tsx` (Mermaid code-only, SVG injected via `dangerouslySetInnerHTML`)
- Export: `services/exportService.ts` (PDF/DOCX)

## Backend notes
- Main server: `backend/server.js` (CORS, CSRF, rate limits, Telegram auth, Swagger, static dist)
- Telegram auth: `backend/middleware/auth.js` + `backend/utils/telegramAuth.js`
- Rate limits config: `backend/config/app.js` + `backend/middleware/rateLimit.js`
- API key encryption: `backend/utils/encryption.js`
- Settings: `backend/routes/settings.js` stores OpenRouter key encrypted
- Generation: `backend/routes/generate.js` (SEO/AIO, spam, optimize, audit, rewrite, social pack)
- Outline: `backend/routes/outline.js`
- Knowledge base: `backend/routes/knowledge-base.js`, `backend/services/knowledgeBaseService.js`

## Data model (Prisma)
- User, Plan, Project, History, SystemSetting, Payment, KnowledgeBase, InternalLinks, BackgroundTask, ProcessLock
- DB: PostgreSQL (Supabase typical), `backend/lib/prisma.js` has retry + singleton

## Queues/background
- DB queue: `backend/services/taskQueueService.js` uses BackgroundTask + processLock
- BullMQ config: `backend/config/queue.js`, worker in `backend/workers/generationWorker.js`
- Queue routes: `backend/routes/queue.js`

## Env vars
- Root `.env.example` contains frontend + backend vars
- Backend `.env.example` contains backend vars
- Key: `DATABASE_URL`, `BOT_TOKEN`, `ADMIN_TELEGRAM_IDS`, `OPENROUTER_API_KEY`, `YUKASSA_*`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `WEBAPP_URL`, `REDIS_URL`

## Tests
- Frontend tests: `frontend/tests/**`
- Backend tests: `backend/tests/**`
- Root `vite.config.ts` includes both; backend `package.json` uses `node --test`

## Known pitfalls (current)
- `backend/utils/processLock.js` uses `uuid` (missing in backend deps)
- `backend/workers/generationWorker.js` expects Prisma models/fields not in schema
- Some OpenRouter reads need `decrypt` when key stored in DB
- SSRF risk: SEO audit/rewrite fetch arbitrary URLs without allowlist
- `/api/queue` and `/api/streaming` bypass plan limits
- CDN importmap + Tailwind CDN in `index.html` can conflict with Vite build

## Typical flow
- Telegram WebApp -> frontend -> `apiService` -> backend -> Prisma
- Generation in `/api/generate` -> OpenRouter -> response stored in History
