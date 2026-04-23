# VK ZooPlatforma

Платформа для управления публикациями в группах ВКонтакте с VK Mini App интерфейсом.

## 🌐 Продакшен

- **Сайт**: https://vk.zooplatforma.ru/
- **Админка**: https://vk.zooplatforma.ru/dashboard
- **VK Mini App**: https://vk.zooplatforma.ru/vk_app/
- **API**: https://vk.zooplatforma.ru/api/health

## �️ Архитектура проекта

```
smm/
├── backend/              # Go backend
│   ├── admin/           # Админка API (управление группами, постами)
│   ├── vk-app/          # VK Mini App API (публикация из приложения)
│   ├── site/            # Основной сайт API
│   ├── api/             # API слой
│   │   ├── external/    # Внешние API (VK, Telegram)
│   │   └── internal/    # Внутренние API (БД, бизнес-логика)
│   ├── vk/              # VK API клиент
│   ├── database/        # SQLite подключение и схема
│   ├── models/          # Модели данных (Group, Post, User)
│   ├── middleware/      # Middleware (CORS, Logger)
│   ├── config/          # Конфигурация
│   ├── services/        # Бизнес-логика
│   ├── utils/           # Вспомогательные функции
│   └── main.go          # Главный файл
├── vk_app/              # VK Mini App (React + VKUI + VK Bridge)
├── frontend/            # Админка (HTML + JS)
└── Old/                 # Архив старого кода
```

## 🎯 Компоненты системы

### 1. VK Mini App (`vk_app/`)
- **Назначение**: Пользовательский интерфейс для создания постов
- **Технологии**: React, VKUI, VK Bridge, TypeScript
- **Функционал**:
  - Авторизация через VK Bridge
  - Создание и редактирование постов
  - Загрузка фото и видео
  - Предпросмотр постов

### 2. Админка (`frontend/`)
- **Назначение**: Управление группами и настройками
- **Технологии**: HTML, JavaScript, CSS
- **Функционал**:
  - Подключение групп ВКонтакте
  - Управление токенами доступа
  - Настройки постинга
  - Статистика публикаций

### 3. Backend (`backend/`)
- **Назначение**: Единый API сервер
- **Технологии**: Go, SQLite
- **Функционал**:
  - REST API для всех компонентов
  - Работа с VK API
  - Хранение данных в SQLite
  - Управление публикациями

## 🚀 Запуск проекта

### Локальная разработка

#### Backend
```bash
cd backend
go run main.go
```

#### VK Mini App
```bash
cd vk_app
npm install
npm start
```

### Docker
```bash
docker build -t vk-post-platform .
docker run -p 80:80 vk-post-platform
```

## 📊 База данных (SQLite)

### Таблицы:

#### `groups` - Подключенные группы
- `id` - ID записи
- `vk_group_id` - ID группы в VK
- `name` - Название группы
- `screen_name` - Короткое имя
- `photo_200` - Аватар
- `access_token` - Токен доступа
- `is_active` - Активна ли группа
- `created_at`, `updated_at` - Временные метки

#### `posts` - Посты
- `id` - ID записи
- `vk_post_id` - ID поста в VK
- `group_id` - ID группы
- `message` - Текст поста
- `attachments` - Вложения
- `status` - Статус (draft, scheduled, published, failed)
- `publish_date` - Дата публикации
- `created_at`, `updated_at` - Временные метки

#### `users` - Пользователи
- `id` - ID записи
- `vk_user_id` - ID пользователя в VK
- `first_name`, `last_name` - Имя
- `photo_200` - Аватар
- `role` - Роль (admin, user)
- `created_at`, `updated_at` - Временные метки

## 🔑 API Endpoints

### Админка (`/api/vk/`)
- `POST /api/vk/post` - Публикация поста
- `POST /api/vk/posts` - Получение постов
- `POST /api/vk/groups` - Получение групп
- `POST /api/vk/user-info` - Информация о пользователе
- `GET /api/vk/service-key` - Service key

### VK Mini App (`/api/app/`)
- `GET /api/app/health` - Health check
- TODO: Добавить endpoints для работы с постами

### Основной сайт (`/api/site/`)
- `GET /api/site/health` - Health check
- TODO: Добавить endpoints для сайта

## 🔧 Конфигурация

### Переменные окружения:

```bash
PORT=80                          # Порт сервера
VK_SERVICE_KEY=...              # Service key VK

# VK Standalone App (для постинга через API)
VK_CLIENT_ID=54555042           # ID приложения VK для постинга
VK_CLIENT_SECRET=...            # Secret приложения VK для постинга

# VK Mini App (для мини-приложения в сообществе)  
VK_MINI_APP_ID=54490430         # ID VK Mini App
VK_MINI_APP_SECRET=...          # Secret VK Mini App

DATABASE_PATH=./data/app.db     # Путь к БД SQLite
```

## 📝 Workflow

### Публикация поста:

1. **Пользователь** создает пост в VK Mini App
2. **VK Mini App** отправляет запрос на `/api/app/posts/create`
3. **Backend** сохраняет пост в БД со статусом `draft`
4. **Backend** публикует пост в выбранные группы через VK API
5. **Backend** обновляет статус поста на `published`
6. **Админка** показывает статистику публикаций

### Подключение группы:

1. **Админ** авторизуется в админке
2. **Админка** получает список групп через VK API
3. **Админ** выбирает группы для подключения
4. **Backend** сохраняет группы и токены в БД
5. **VK Mini App** может публиковать в эти группы

## �️ Технологии

### Backend:
- **Go 1.21** - основной язык
- **SQLite** - база данных
- **VK API** - интеграция с ВКонтакте

### Frontend:
- **React 18** - UI библиотека
- **VKUI 8** - компоненты VK
- **VK Bridge** - интеграция с VK Mini Apps
- **TypeScript** - типизация
- **Vite** - сборщик

## 📚 Документация

- [Архитектура проекта](docs/ARCHITECTURE.md) - Подробная архитектура системы
- [Руководство по разработке](docs/DEVELOPMENT.md) - Как начать разработку
- [API Routes](docs/ROUTES.md) - Описание маршрутов
- [VK Post Parameters](docs/VK_POST_PARAMS.md) - Параметры постов VK
- [Полная документация](docs/README.md) - Все документы проекта

## � Безопасность

- Токены доступа хранятся в БД
- CORS настроен для всех endpoints
- Service key используется для fallback запросов
- SQLite БД с правильными индексами

## 📈 Планы развития

- [ ] Отложенная публикация постов
- [ ] Статистика по постам (просмотры, лайки, репосты)
- [ ] Шаблоны постов
- [ ] Массовая публикация
- [ ] Интеграция с Telegram
- [ ] Миграция на PostgreSQL

## 👥 Команда

Разработка: Anton Dvinyaninov

## � Лицензия

Proprietary
