# Сборка VK Mini App
FROM node:20-alpine AS vk-app-builder

WORKDIR /app/vk_app
COPY vk_app/package*.json ./
RUN npm install --legacy-peer-deps
COPY vk_app/ ./
RUN npm run build

# Сборка Go бэкенда
FROM golang:1.21-alpine AS backend-builder

# Устанавливаем необходимые пакеты для CGO и SQLite
RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app
COPY backend/go.mod backend/go.sum* ./
RUN go mod download || true
COPY backend/ ./

# Включаем CGO для работы с SQLite
ENV CGO_ENABLED=1
RUN go build -o main .

# Финальный образ с Nginx
FROM nginx:alpine

# Устанавливаем необходимые пакеты
RUN apk add --no-cache ca-certificates sqlite supervisor

# Создаем необходимые директории
RUN mkdir -p /var/log/supervisor /app

# Копируем Go бэкенд
COPY --from=backend-builder /app/main /app/backend/main

# Копируем фронтенд (админка)
COPY frontend /usr/share/nginx/html/

# Копируем собранный VK Mini App
COPY --from=vk-app-builder /app/vk_app/build /usr/share/nginx/html/vk_app/

# Копируем конфигурацию Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Копируем конфигурацию Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Создаем рабочую директорию для backend
WORKDIR /app

# Переменные окружения
ENV PORT=8000
ENV DATABASE_PATH=./data/app.db
ENV VK_CLIENT_ID=54481712
ENV VK_CLIENT_SECRET=488uLwXVh0NbUFcrJIvA
ENV VK_SERVICE_KEY=a5b5b6aaa5b5b6aaa5b5b6aa3ca68ae59aaa5b5a5b5b6aacc52bb65014d8826cb301184
ENV VK_MINI_APP_ID=54560047
ENV VK_MINI_APP_SECRET=kI41QDPyyK87kIopZ2U9
ENV VK_MINI_APP_SERVICE_KEY=e59b585ae59b585ae59b585a67e6dbdd75ee59be59b585a8c7299470181bb987c8b3c03

# Открываем порт
EXPOSE 80

# Запускаем Supervisor (управляет Nginx + Go backend)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
