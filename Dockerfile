# Мультистейдж сборка Go бэкенда
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app
COPY backend/go.mod backend/go.sum* ./
RUN go mod download || true
COPY backend/ ./
RUN go build -o main .

# Сборка React фронтенда
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY front-react/package*.json ./
RUN npm install
COPY front-react/ ./
RUN npm run build && ls -la dist/

# Python VK Service
FROM python:3.11-slim AS vk-service

WORKDIR /app/vk-service
COPY backend/vk_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/vk_service/ .

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

# Копируем собранный React фронтенд (из dist в frontend)
COPY --from=frontend-builder /app/dist ./frontend/

# Проверяем что файлы скопировались
RUN ls -la ./frontend/ && echo "Frontend files copied successfully"

# Переменные окружения
ENV PORT=80
ENV VK_SERVICE_PORT=5001
ENV VK_SERVICE_URL=http://localhost:5001
ENV VK_SERVICE_KEY=a5b5b6aaa5b5b6aaa5b5b6aa3ca68ae59aaa5b5a5b5b6aacc52bb65014d8826cb301184

# Открываем порты
EXPOSE 80 5001

# Создаем скрипт запуска обоих сервисов
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "=== Starting VK Service ==="' >> /app/start.sh && \
    echo 'cd /app/vk-service' >> /app/start.sh && \
    echo 'python -u main.py 2>&1 | tee /tmp/vk-service.log &' >> /app/start.sh && \
    echo 'VK_PID=$!' >> /app/start.sh && \
    echo 'echo "VK Service started with PID: $VK_PID"' >> /app/start.sh && \
    echo 'sleep 3' >> /app/start.sh && \
    echo 'if ! kill -0 $VK_PID 2>/dev/null; then' >> /app/start.sh && \
    echo '  echo "ERROR: VK Service failed to start!"' >> /app/start.sh && \
    echo '  echo "=== VK Service logs ==="' >> /app/start.sh && \
    echo '  cat /tmp/vk-service.log' >> /app/start.sh && \
    echo '  exit 1' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'echo "VK Service is running"' >> /app/start.sh && \
    echo 'echo "=== Starting Go Backend ==="' >> /app/start.sh && \
    echo 'cd /app' >> /app/start.sh && \
    echo 'exec ./backend/main' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
