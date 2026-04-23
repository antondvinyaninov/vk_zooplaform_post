# Сборка VK Mini App
FROM node:18-alpine AS vk-app-builder

WORKDIR /app/vk_app
COPY vk_app/package*.json ./
RUN npm ci --only=production
COPY vk_app/ ./
RUN npm run build

# Сборка Go бэкенда
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app
COPY backend/go.mod backend/go.sum* ./
RUN go mod download || true
COPY backend/ ./
RUN go build -o main .

# Финальный образ
FROM alpine:latest

WORKDIR /app

# Устанавливаем необходимые пакеты
RUN apk add --no-cache ca-certificates

# Копируем Go бэкенд
COPY --from=backend-builder /app/main ./backend/main

# Копируем фронтенд (админка)
COPY frontend ./frontend/

# Копируем собранный VK Mini App
COPY --from=vk-app-builder /app/vk_app/build ./vk_app/build/

# Проверяем что файлы скопировались
RUN ls -la ./frontend/ && echo "Frontend files copied successfully"
RUN ls -la ./vk_app/build/ && echo "VK Mini App files copied successfully"

# Переменные окружения
ENV PORT=80
ENV VK_SERVICE_KEY=a5b5b6aaa5b5b6aaa5b5b6aa3ca68ae59aaa5b5a5b5b6aacc52bb65014d8826cb301184

# Открываем порт
EXPOSE 80

# Запускаем Go backend
CMD ["./backend/main"]
