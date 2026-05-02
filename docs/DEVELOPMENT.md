# Руководство по разработке

## Требования

### Обязательно
- **Go 1.24+** - для backend
- **Node.js 20+** - для VK Mini App
- **Node.js 22.12+** - для админки `frontadmin`
- **Git** - для контроля версий

### Опционально
- **Docker** - для контейнеризации
- **Make** - для автоматизации задач

## Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/antondvinyaninov/vk_zooplaform_post.git
cd vk_zooplaform_post
```

### 2. Настройка Backend

```bash
cd backend

# Установка зависимостей
go mod download

# Создание .env файла
cp .env.example .env

# Редактирование .env
nano .env
```

### 3. Настройка VK Mini App

```bash
cd vk_app

# Установка зависимостей
npm install

# Запуск dev сервера
npm start
```

### 4. Настройка Админки

```bash
cd frontadmin

# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev
```

## Запуск проекта

### Development режим

#### Backend
```bash
cd backend
go run main.go
```

Backend будет доступен на `http://localhost:80`

#### VK Mini App
```bash
cd vk_app
npm start
```

Mini App будет доступен на `http://localhost:5173`

### Production режим

#### Docker
```bash
docker build -t vk-post-platform .
docker run -p 80:80 vk-post-platform
```

## Структура проекта

```
smm/
├── backend/              # Go backend
│   ├── admin/           # Админка API
│   ├── vk-app/          # VK Mini App API
│   ├── site/            # Основной сайт API
│   ├── api/             # API слой
│   ├── vk/              # VK API клиент
│   ├── database/        # PostgreSQL
│   ├── models/          # Модели
│   ├── middleware/      # Middleware
│   ├── config/          # Конфигурация
│   ├── services/        # Бизнес-логика
│   ├── utils/           # Утилиты
│   └── main.go          # Точка входа
├── vk_app/              # VK Mini App
│   ├── src/
│   │   ├── panels/      # Страницы
│   │   ├── shared/      # Общие компоненты
│   │   └── utils/       # Утилиты
│   └── package.json
├── frontadmin/          # Админка
│   ├── src/
│   ├── public/
│   └── package.json
└── docs/                # Документация
```

## Работа с базой данных

### PostgreSQL

Backend подключается к PostgreSQL по `DATABASE_URL` или `DB_URL`.
Таблицы и недостающие колонки создаются автоматически при запуске.

```bash
# Пример строки подключения
DATABASE_URL=postgres://user:password@host:5432/database?sslmode=disable
```

### Миграции

Миграции выполняются автоматически при запуске backend.

Схема находится в `backend/database/database.go`

## Работа с VK API

### Получение токенов

1. Создайте приложение на [vk.com/apps?act=manage](https://vk.com/apps?act=manage)
2. Получите `client_id` и `client_secret`
3. Добавьте в `.env`:
```bash
VK_CLIENT_ID=your_client_id
VK_CLIENT_SECRET=your_client_secret
```

### Service Key

Service Key используется для fallback запросов.

Получить можно в настройках приложения VK.

## Тестирование

### Backend

```bash
cd backend
go test ./...
```

### VK Mini App

```bash
cd vk_app
npm test
```

## Линтинг

### Backend

```bash
cd backend
go fmt ./...
go vet ./...
```

### VK Mini App

```bash
cd vk_app
npm run lint
```

## Сборка

### Backend

```bash
cd backend
go build -o main .
```

### VK Mini App

```bash
cd vk_app
npm run build
```

Результат в `vk_app/dist/`

## Отладка

### Backend

Используйте `log.Printf()` для логирования:

```go
log.Printf("Debug: %v", data)
```

### VK Mini App

Используйте `console.log()`:

```typescript
console.log('Debug:', data);
```

## Работа с Git

### Ветки

- `main` - продакшн
- `develop` - разработка
- `feature/*` - новые фичи
- `fix/*` - исправления

### Коммиты

Используйте понятные сообщения:

```bash
git commit -m "Add user authentication"
git commit -m "Fix post publishing bug"
git commit -m "Update VK API client"
```

## Полезные команды

### Backend

```bash
# Обновить зависимости
go get -u ./...

# Очистить кэш
go clean -cache

# Проверить на race conditions
go run -race main.go
```

### VK Mini App

```bash
# Обновить зависимости
npm update

# Очистить кэш
npm cache clean --force

# Проверить устаревшие пакеты
npm outdated
```

## Troubleshooting

### Backend не запускается

1. Проверьте Go версию: `go version`
2. Проверьте зависимости: `go mod tidy`
3. Проверьте порт 80 (может быть занят)

### VK Mini App не запускается

1. Проверьте Node.js версию: `node --version`
2. Удалите `node_modules` и переустановите: `rm -rf node_modules && npm install`
3. Проверьте порт 5173

### База данных не создается

1. Проверьте `DATABASE_URL` или `DB_URL`
2. Убедитесь, что PostgreSQL доступен по сети
3. Проверьте права пользователя БД на создание таблиц и изменение схемы

## Дополнительные ресурсы

- [Go Documentation](https://go.dev/doc/)
- [React Documentation](https://react.dev/)
- [VKUI Documentation](https://vkui.io/)
- [VK API Documentation](https://dev.vk.com/ru/reference)
