# Мультистейдж сборка Go бэкенда
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app
COPY backend/go.mod backend/go.sum* ./
RUN go mod download || true
COPY backend/ ./
RUN go build -o main .

# Python VK Service
FROM python:3.11-slim AS vk-service

WORKDIR /app/vk-service
COPY vk_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY vk_service/ .

# Финальный образ
FROM python:3.11-slim

WORKDIR /app

# Устанавливаем необходимые пакеты
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Копируем Go бэкенд
COPY --from=backend-builder /app/main ./backend/main

# Копируем Python VK Service
COPY --from=vk-service /app/vk-service ./vk-service
COPY --from=vk-service /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Копируем фронтенд
COPY frontend/ ./frontend/

# Переменные окружения
ENV PORT=8000
ENV VK_SERVICE_URL=http://localhost:5000

# Открываем порты
EXPOSE 8000 5000

# Создаем скрипт запуска обоих сервисов
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'cd /app/vk-service && python main.py &' >> /app/start.sh && \
    echo 'cd /app && ./backend/main' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
