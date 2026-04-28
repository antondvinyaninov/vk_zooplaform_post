# 🚀 Руководство по деплою

## Архитектура деплоя

```
Easypanel (git push trigger)
    └─ Docker build
        ├─ golang:1.24-alpine → компилирует backend (~20 сек)
        ├─ COPY frontadmin/dist/  ← предсобранный артефакт из git
        └─ COPY vk_app/build/    ← предсобранный артефакт из git
```

**Ключевое правило:** фронтенды собираются **локально** и коммитятся в git.  
Docker собирает только Go-бэкенд. Это делает деплой ~1 минута вместо 7+.

---

## Workflow: что делать при изменениях

### Изменил только backend (Go)
```bash
git add -A
git commit -m "..."
git push
```
Easypanel сам пересобирает Go. Деплой ~1 мин.

---

### Изменил vk_app (React/VKUI)
```bash
cd vk_app
npm run build        # собирает в vk_app/build/
cd ..

git add vk_app/build/ vk_app/src/   # и всё остальное что менял
git commit -m "..."
git push
```

---

### Изменил frontadmin (Astro/shadcn)
```bash
cd frontadmin
npm run build        # собирает в frontadmin/dist/
cd ..

git add frontadmin/dist/ frontadmin/src/
git commit -m "..."
git push
```

---

### Изменил и backend, и фронтенд
```bash
cd vk_app && npm run build && cd ..
# и/или
cd frontadmin && npm run build && cd ..

git add -A
git commit -m "..."
git push
```

---

## Структура собранных артефактов

| Папка | Что внутри | Куда попадает в Docker |
|-------|-----------|----------------------|
| `vk_app/build/` | VK Mini App (React, Vite) | `/usr/share/nginx/html/vk_app/` |
| `frontadmin/dist/` | Admin Panel (Astro) | `/usr/share/nginx/html/` |

---

## Почему так, а не иначе

Easypanel **не сохраняет Docker layer cache** между деплоями.  
Из-за этого `npm install` выполнялся заново каждый раз (~3–5 мин только npm).  
Решение: собирать фронтенды один раз локально, хранить артефакты в git.

### До оптимизации
```
docker build:
  npm install (vk_app)    → ~2 мин  ❌ качает 300+ пакетов
  npm install (frontadmin) → ~2 мин  ❌ качает 200+ пакетов
  go build                 → ~30 сек
  ───────────────────────────────────
  Итого: 7+ минут
```

### После оптимизации
```
docker build:
  go mod download          → кешируется (если go.mod не менялся)
  go build                 → ~20-30 сек
  COPY build/dist/         → мгновенно (из git)
  ───────────────────────────────────
  Итого: ~1 минута
```

---

## Локальный запуск для разработки

```bash
# Backend
cd backend && go run main.go

# VK Mini App (dev-сервер)
cd vk_app && npm run start

# Admin Panel (dev-сервер)  
cd frontadmin && npm run dev
```

> **Не забывай:** при `git push` на продакшен — сначала собери фронтенд!
