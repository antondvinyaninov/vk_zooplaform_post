# Сборка VK Mini App
FROM node:20-alpine AS vk-app-builder

WORKDIR /app/vk_app
COPY vk_app/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --legacy-peer-deps
COPY vk_app/ ./
RUN npm run build

# Сборка Go бэкенда
FROM golang:1.25-alpine AS backend-builder

# Устанавливаем необходимые пакеты
RUN apk add --no-cache gcc musl-dev

WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY backend/ ./

# Отключаем CGO для ускорения сборки, так как Postgres не требует CGO
ENV CGO_ENABLED=0
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    go build -v -o main .

# Сборка Astro админки
FROM node:22-alpine AS admin-builder

WORKDIR /app/frontadmin
COPY frontadmin/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install
COPY frontadmin/ ./
RUN npm run build

# Финальный образ
FROM alpine:latest

# Устанавливаем необходимые пакеты
RUN apk add --no-cache ca-certificates

# Создаем необходимые директории
RUN mkdir -p /app /usr/share/nginx/html

# Копируем Go бэкенд
COPY --from=backend-builder /app/main /app/backend/main

# Копируем собранный фронтенд (админка)
COPY --from=admin-builder /app/frontadmin/dist /usr/share/nginx/html/

# Копируем собранный VK Mini App
COPY --from=vk-app-builder /app/vk_app/build /usr/share/nginx/html/vk_app/

# Создаем рабочую директорию для backend
WORKDIR /app

# Переменные окружения (Go backend на порту 80)
ENV PORT=80
ENV DATABASE_URL=
ENV VK_CLIENT_ID=54481712
ENV VK_CLIENT_SECRET=488uLwXVh0NbUFcrJIvA
ENV VK_SERVICE_KEY=a5b5b6aaa5b5b6aaa5b5b6aa3ca68ae59aaa5b5a5b5b6aacc52bb65014d8826cb301184
ENV VK_MINI_APP_ID=54560047
ENV VK_MINI_APP_SECRET=kI41QDPyyK87kIopZ2U9
ENV VK_MINI_APP_SERVICE_KEY=e59b585ae59b585ae59b585a67e6dbdd75ee59be59b585a8c7299470181bb987c8b3c03
ENV BUILD_VERSION=v5.0-hardcoded-port-80

# Открываем порт
EXPOSE 80

# Запускаем Go backend напрямую
CMD ["/app/backend/main"]
