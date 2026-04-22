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

# Проверяем что файлы скопировались
RUN ls -la ./frontend/ && echo "Frontend files copied successfully"

# Переменные окружения
ENV PORT=80
ENV VK_SERVICE_KEY=a5b5b6aaa5b5b6aaa5b5b6aa3ca68ae59aaa5b5a5b5b6aacc52bb65014d8826cb301184

# Открываем порт
EXPOSE 80

# Запускаем Go backend
CMD ["./backend/main"]
