FROM node:20-alpine

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости с verbose логами
RUN npm ci --only=production --loglevel verbose

# Копируем исходный код
COPY . .

# Открываем порт
EXPOSE 3000

# Запускаем сервер
CMD ["node", "server.js"]
