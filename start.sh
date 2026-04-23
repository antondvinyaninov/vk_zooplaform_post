#!/bin/bash

echo "🚀 Starting VK ZooPlatforma..."

# Запускаем backend в фоне
echo "▶️  Starting Go backend..."
cd /app && ./backend/main &
BACKEND_PID=$!
echo "✅ Backend started with PID: $BACKEND_PID"

# Ждем немного, чтобы backend запустился
sleep 2

# Запускаем nginx в foreground
echo "▶️  Starting Nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!
echo "✅ Nginx started with PID: $NGINX_PID"

# Функция для graceful shutdown
cleanup() {
    echo "🛑 Received signal, shutting down..."
    echo "Stopping nginx (PID: $NGINX_PID)..."
    kill -TERM $NGINX_PID 2>/dev/null
    echo "Stopping backend (PID: $BACKEND_PID)..."
    kill -TERM $BACKEND_PID 2>/dev/null
    wait $NGINX_PID $BACKEND_PID
    echo "✅ All processes stopped"
    exit 0
}

# Обрабатываем сигналы
trap cleanup SIGTERM SIGINT

echo "🎯 All services started, waiting..."
echo "Backend PID: $BACKEND_PID"
echo "Nginx PID: $NGINX_PID"

# Ждем завершения процессов
wait $NGINX_PID $BACKEND_PID