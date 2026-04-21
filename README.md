# VK SMM Панель

Веб-приложение для управления постами в группах ВКонтакте. Создано для платформы помощи животным [Zooplatforma.ru](https://zooplatforma.ru).

## 🎯 Возможности

### Публикация постов
- 📝 Текстовые посты с форматированием
- 📷 Загрузка фото (до 10 шт)
- 🎥 Загрузка видео
- ⏰ Отложенная публикация
- 🎯 Публикация в несколько групп

### Управление группами
- 👥 Подключение групп пользователя
- ✅ Выбор групп для публикации
- 💾 Сохранение настроек

### Просмотр постов
- 📖 Просмотр постов из своих групп
- 🌐 Просмотр постов из любой публичной группы
- 🔄 Репост записей
- 📋 Копирование постов с вложениями
- 🔍 Фильтры: все, от группы, от пользователей, отложенные, предложенные

## 🏗️ Архитектура

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐      ┌─────────┐
│   Frontend  │─────▶│  Go Backend  │─────▶│  Python VK API  │─────▶│  VK API │
│  (Vanilla)  │      │   (port 80)  │      │   (port 5000)   │      │         │
└─────────────┘      └──────────────┘      └─────────────────┘      └─────────┘
```

### Backend (Go)
- HTTP сервер на порту 80
- Проксирование запросов к VK Service
- Обслуживание статических файлов фронтенда
- CORS middleware

### VK Service (Python)
- Flask API на порту 5000
- Работа с VK API через vk_api
- Загрузка медиа (фото, видео)
- Модульная структура:
  - `services/post_creator.py` - создание и публикация постов
  - `services/post_parser.py` - получение постов
  - `services/groups.py` - работа с группами
  - `utils/vk_session.py` - управление VK сессиями

### Frontend (Vanilla JS)
- Модульная структура
- `pages/` - HTML страницы
- `js/` - JavaScript модули
- `css/` - стили

## 📁 Структура проекта

```
.
├── backend/
│   ├── main.go                    # Go HTTP сервер
│   ├── vk_service/               # Python VK API сервис
│   │   ├── main.py               # Flask API
│   │   ├── services/             # Бизнес-логика
│   │   │   ├── post_creator.py  # Публикация постов
│   │   │   ├── post_parser.py   # Парсинг постов
│   │   │   └── groups.py         # Группы и пользователи
│   │   └── utils/
│   │       └── vk_session.py     # VK API сессии
│   └── .air.toml                 # Hot reload конфиг
├── frontend/
│   ├── index.html                # Главная страница
│   ├── pages/                    # HTML страницы
│   │   ├── auth.html            # Авторизация
│   │   ├── groups.html          # Управление группами
│   │   └── posts.html           # Просмотр постов
│   ├── js/                       # JavaScript
│   │   ├── utils.js             # Общие утилиты
│   │   ├── app.js               # Главная страница
│   │   ├── auth.js              # Авторизация
│   │   ├── groups.js            # Группы
│   │   └── posts.js             # Посты
│   └── css/
│       └── style.css            # Стили
├── Dockerfile                    # Multi-stage сборка
├── docker-compose.yml
└── run                          # Скрипт локального запуска
```

## 🚀 Локальный запуск

### Требования
- Go 1.21+
- Python 3.11+
- Air (для hot reload)

### Запуск через скрипт
```bash
./run
```

Приложение будет доступно на `http://localhost`

### Ручной запуск

**Backend:**
```bash
cd backend
air  # или go run main.go
```

**VK Service:**
```bash
cd backend/vk_service
python main.py
```

## 🐳 Docker

### Сборка и запуск
```bash
docker-compose up --build
```

### Только сборка
```bash
docker build -t vk-smm-panel .
```

### Запуск контейнера
```bash
docker run -p 80:80 \
  -e VK_APP_ID=54556179 \
  -e VK_SERVICE_KEY=your_service_key \
  vk-smm-panel
```

## ☁️ Деплой на Easypanel

Приложение развернуто на: https://my-projects-vk-zooplaform-post.crv1ic.easypanel.host/

### Настройка

1. Создайте новое приложение в Easypanel
2. Подключите GitHub репозиторий
3. Укажите `Dockerfile` для сборки
4. Добавьте переменные окружения:
   ```
   VK_APP_ID=54556179
   VK_CLIENT_SECRET=488uLwXVh0NbUFcrJIvA
   VK_SERVICE_KEY=a5b5b6aaa5b5b6aaa5b5b6aa3ca68ae59aaa5b5a5b5b6aacc52bb65014d8826cb301184
   PORT=80
   VK_SERVICE_PORT=5000
   ```
5. Настройте порт: `80`
6. Деплой!

## 🔑 Настройка VK приложения

### Текущее приложение
- **App ID**: `54556179`
- **Тип**: VK ID (новый тип)
- **Домены**: 
  - `zooplatforma.ru`
  - `my-projects-vk-zooplaform-post.crv1ic.easypanel.host`

### Авторизация
Используется VK Admin app (client_id=2685278) для получения токена с полными правами:
1. Пользователь нажимает "Авторизоваться"
2. Открывается окно VK OAuth
3. После авторизации копирует URL с токеном
4. Вставляет URL в форму
5. Токен сохраняется в localStorage

## 📖 Использование

1. Откройте приложение
2. Нажмите "Подключить аккаунт VK"
3. Авторизуйтесь и скопируйте URL
4. Вставьте URL в форму
5. Перейдите в "Управление группами"
6. Загрузите и выберите группы
7. Публикуйте посты!

## 📚 Документация

- [VK_POST_PARAMS.md](VK_POST_PARAMS.md) - Все параметры публикации постов
- [backend/README.md](backend/README.md) - Документация backend
- [frontend/README.md](frontend/README.md) - Документация frontend

## 🛠️ Технологии

- **Backend**: Go 1.21, Gorilla Mux
- **VK Service**: Python 3.11, Flask, vk_api
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **API**: VK API v5.131
- **Deploy**: Docker, Easypanel

## 📝 Лицензия

MIT
