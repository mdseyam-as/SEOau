# Dockerfile для Timeweb Cloud
# Собирает frontend + backend с Prisma

FROM node:20-alpine

WORKDIR /app

# Устанавливаем OpenSSL для Prisma
RUN apk add --no-cache openssl

# ==================== FRONTEND BUILD ====================
# Копируем package.json и lock файл
COPY package*.json ./

# Устанавливаем зависимости для frontend
RUN npm ci

# Копируем исходники frontend
COPY index.html vite.config.ts tsconfig.json ./
COPY index.tsx index.css types.ts App.tsx vite-env.d.ts ./
COPY components ./components/
COPY hooks ./hooks/
COPY services ./services/
COPY types ./types/

# Копируем Prisma схему
COPY prisma ./prisma/

# Собираем frontend
RUN npm run build

# ==================== BACKEND SETUP ====================
# Копируем backend
COPY backend ./backend/

# Устанавливаем зависимости backend
WORKDIR /app/backend
RUN npm ci

# Генерируем Prisma Client
RUN npx prisma generate --schema=../prisma/schema.prisma

# ==================== RUNTIME ====================
# Открываем порт
EXPOSE 3000

# Запускаем сервер
CMD ["node", "server.js"]
