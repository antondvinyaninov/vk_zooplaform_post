# Мультистейдж сборка
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
RUN apk --no-cache add ca-certificates

# Копируем бэкенд
COPY --from=backend-builder /app/main .

# Копируем фронтенд
COPY frontend/ ./frontend/

# Переменные окружения
ENV PORT=8000

# Открываем порты
EXPOSE 8000 3000

# Создаем скрипт запуска
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'cd /app/frontend && python3 -m http.server 3000 &' >> /app/start.sh && \
    echo 'cd /app && ./main' >> /app/start.sh && \
    chmod +x /app/start.sh

# Устанавливаем Python для фронтенда
RUN apk add --no-cache python3

CMD ["/app/start.sh"]
