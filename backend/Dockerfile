FROM node:20-alpine

WORKDIR /app

# Устанавливаем OpenSSL для Prisma
RUN apk add --no-cache openssl

# Копируем package.json
COPY package*.json ./

# Копируем Prisma схему из корня проекта
# (при сборке из корня с context: .)
COPY prisma ../prisma/

# Устанавливаем зависимости
RUN npm ci

# Генерируем Prisma Client (force rebuild on schema change)
# Schema version: 2024-12-22-v2
RUN npx prisma generate --schema=../prisma/schema.prisma

# Копируем исходный код backend
COPY . .

# Открываем порт
EXPOSE 3000

# Запускаем сервер
CMD ["node", "server.js"]
