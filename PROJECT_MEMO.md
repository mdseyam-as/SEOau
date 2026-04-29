# Project Memo (SEOau)

## Overview
- Product: SEO Generator Telegram WebApp (frontend + backend)
- Repository: npm workspaces monorepo
- Frontend: `apps/frontend` (Vite + React 19, TS, Tailwind CDN in `index.html`)
- Backend: `apps/backend` (Express 5, Prisma, PostgreSQL, Telegram WebApp auth)
- Shared packages: `packages/shared` and `packages/db`

## Layout
- Workspace root: `package.json`, `package-lock.json`, shared scripts
- Frontend app: `apps/frontend/App.tsx`, `apps/frontend/index.tsx`, `apps/frontend/components/`, `apps/frontend/services/`, `apps/frontend/hooks/`, `apps/frontend/types/`
- Backend app: `apps/backend/server.js`, `apps/backend/routes/`, `apps/backend/middleware/`, `apps/backend/utils/`, `apps/backend/services/`, `apps/backend/config/`
- Shared types/Zod schemas: `packages/shared/src/types.ts`, `packages/shared/src/schemas.js`, `packages/shared/src/aioContentSchema.js`
- Prisma package: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/`, `packages/db/prisma/seed.js`, `packages/db/src/index.js`
- Extra SMTP server: `server.js` (port 3001, separate from backend)
- Docs: `docs/`, `plans/`

## Frontend notes
- Auth UI: `apps/frontend/components/AuthScreen.tsx` (Telegram WebApp + dev login)
- API wrapper: `apps/frontend/services/apiService.ts` adds `X-Telegram-Init-Data`, optional `X-Dev-Telegram-Id`
- User/plan state: `apps/frontend/hooks/useAuth.ts`
- Result render: `apps/frontend/components/ResultView.tsx` (Mermaid code-only, SVG injected via `dangerouslySetInnerHTML`)
- Export: `apps/frontend/services/exportService.ts` (PDF/DOCX)
- Local user/backend state is not persisted to browser `localStorage`; legacy keys are cleared in `apps/frontend/services/authService.ts`.

## Backend notes
- Main server: `apps/backend/server.js` (CORS, CSRF, rate limits, Telegram auth, Swagger, static frontend dist)
- Telegram auth: `apps/backend/middleware/auth.js` + `apps/backend/utils/telegramAuth.js`
- Rate limits config: `apps/backend/config/app.js` + `apps/backend/middleware/rateLimit.js`
- API key encryption: `apps/backend/utils/encryption.js`
- Settings: `apps/backend/routes/settings.js` stores OpenRouter key encrypted
- Generation: `apps/backend/routes/generate.js` (SEO/AIO, spam, optimize, audit, rewrite, social pack)
- Outline: `apps/backend/routes/outline.js`
- Knowledge base: `apps/backend/routes/knowledge-base.js`, `apps/backend/services/knowledgeBaseService.js`

## Data model (Prisma)
- User, Plan, Project, History, SystemSetting, Payment, KnowledgeBase, KnowledgeBaseChunk, InternalLinks, BackgroundTask, ProcessLock
- DB: PostgreSQL (Supabase typical)
- Prisma client singleton lives in `packages/db/src/index.js`; backend re-exports it from `apps/backend/lib/prisma.js`.

## Queues/background
- DB queue: `apps/backend/services/taskQueueService.js` uses BackgroundTask + processLock
- BullMQ config: `apps/backend/config/queue.js`, worker in `apps/backend/workers/generationWorker.js`
- Queue routes: `apps/backend/routes/queue.js`

## Env vars
- Root `.env.example` contains frontend + backend vars
- Backend `.env.example` lives at `apps/backend/.env.example`
- Key: `DATABASE_URL`, `BOT_TOKEN`, `ADMIN_TELEGRAM_IDS`, `OPENROUTER_API_KEY`, `YUKASSA_*`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `WEBAPP_URL`, `REDIS_URL`
- RAG embeddings: `OPENAI_API_KEY`, `RAG_EMBEDDING_MODEL`, `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`, `RAG_MAX_CHUNKS_PER_FILE`, `RAG_SIMILARITY_THRESHOLD`

## Tests
- Frontend tests: `apps/frontend/tests/**`
- Backend tests: `apps/backend/tests/**`
- Root scripts: `npm run test`, `npm run test:backend`

## Known pitfalls (current)
- `apps/backend/utils/processLock.js` uses `uuid` (missing in backend deps)
- `apps/backend/workers/generationWorker.js` expects Prisma models/fields not in schema
- Some OpenRouter reads need `decrypt` when key stored in DB
- SSRF risk: SEO audit/rewrite fetch arbitrary URLs without allowlist
- `/api/queue` and `/api/streaming` bypass plan limits
- CDN importmap + Tailwind CDN in `index.html` can conflict with Vite build

## Typical flow
- Telegram WebApp -> frontend -> `apiService` -> backend -> Prisma
- Generation in `/api/generate` -> OpenRouter -> response stored in History
- Knowledge Base documents -> chunks + optional OpenAI embeddings -> prompt context during generation

## Updates 2026-04-29
- Converted the project to an npm workspaces monorepo: `apps/frontend`, `apps/backend`, `packages/shared`, `packages/db`.
- Moved frontend files from the repository root into `apps/frontend` and kept a compatibility re-export in `apps/frontend/types/index.ts`.
- Moved backend files from `backend` into `apps/backend`.
- Moved Prisma schema, migrations, and seed into `packages/db/prisma`; added `@seoau/db` Prisma singleton package.
- Added `@seoau/shared` for common frontend/backend types and shared Zod schemas.
- Updated root scripts for one-install workflow: `npm install`, `npm run dev`, `npm run dev:backend`, `npm run db:*`, `npm run build`.
- Updated Docker/Amvera build flow to install and build from the workspace root.
- Finished chunk-level Knowledge Base RAG with `KnowledgeBaseChunk`, embeddings, keyword fallback, reindex support, and generation prompt injection.
- Added RAG documentation in `docs/RAG.md` and RAG env vars to `.env.example` files.
- Fixed frontend auth persistence so apps/backend/user state is not stored in browser `localStorage`.
