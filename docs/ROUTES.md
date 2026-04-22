# Маршруты и пути проекта

## 🌐 API Endpoints (Go Backend - порт 80)

### Health Check
- `GET /api/health` - проверка работы сервера

### VK API Proxy
- `POST /api/vk/post` - публикация поста (с фото/видео)
- `POST /api/vk/posts` - получение постов со стены
- `POST /api/vk/repost` - репост записи
- `POST /api/vk/copy-post` - копирование поста
- `POST /api/vk/groups` - получение групп пользователя
- `POST /api/vk/user-info` - информация о пользователе

### VK OAuth (не используется, но есть в коде)
- `POST /api/vk/exchange-code` - обмен кода на токен
- `POST /api/vk/refresh-token` - обновление токена
- `GET /api/vk/service-key` - получение сервисного ключа

### Статические файлы
- `GET /` - раздача файлов из `./frontend/`

### Редиректы (обратная совместимость)
- `GET /auth.html` → `/pages/auth.html` (301)
- `GET /groups.html` → `/pages/groups.html` (301)
- `GET /posts.html` → `/pages/posts.html` (301)

## 🐍 VK Service API (Python Flask - порт 5000)

### Health Check
- `GET /health` - проверка работы сервиса

### Wall (Стена)
- `POST /vk/wall/post` - публикация поста
- `POST /vk/wall/get` - получение постов
- `POST /vk/wall/repost` - репост записи
- `POST /vk/wall/copy` - копирование поста

### Groups (Группы)
- `POST /vk/groups/get` - получение групп пользователя

### Users (Пользователи)
- `POST /vk/users/get` - получение информации о пользователе

## 📁 Структура файлов Frontend

```
frontend/
├── index.html                    # Главная страница (/)
├── pages/                        # HTML страницы
│   ├── auth.html                # Авторизация (/pages/auth.html)
│   ├── groups.html              # Управление группами (/pages/groups.html)
│   └── posts.html               # Просмотр постов (/pages/posts.html)
├── js/                          # JavaScript модули
│   ├── utils.js                 # Общие утилиты (/js/utils.js)
│   ├── app.js                   # Главная страница (/js/app.js)
│   ├── auth.js                  # Авторизация (/js/auth.js)
│   ├── groups.js                # Группы (/js/groups.js)
│   └── posts.js                 # Посты (/js/posts.js)
└── css/                         # Стили
    └── style.css                # Основные стили (/css/style.css)
```

## 🔗 Навигация между страницами

### Из index.html
- `pages/auth.html` - авторизация
- `pages/groups.html` - управление группами
- `pages/posts.html` - просмотр постов

### Из pages/*.html
- `../index.html` - главная страница
- `groups.html` - управление группами (относительный путь)
- `posts.html` - просмотр постов (относительный путь)
- `auth.html` - авторизация (относительный путь)

## 📦 Пути в Docker контейнере

```
/app/
├── backend/
│   └── main                     # Go бинарник
├── vk-service/                  # Python VK Service
│   ├── main.py
│   ├── services/
│   └── utils/
└── frontend/                    # Статические файлы
    ├── index.html
    ├── pages/
    ├── js/
    └── css/
```

## 🔧 API URL в JavaScript

### Локальная разработка
```javascript
const API_URL = 'http://localhost/api';
```

### Production
```javascript
const API_URL = `${window.location.origin}/api`;
```

## 🚀 Порты

- **80** - Go Backend (HTTP сервер + статические файлы)
- **5000** - Python VK Service (внутренний, не доступен извне)

## 📝 Примеры запросов

### Публикация поста
```javascript
const formData = new FormData();
formData.append('access_token', token);
formData.append('owner_id', '-227624792');
formData.append('message', 'Привет!');
formData.append('from_group', '1');

fetch('http://localhost/api/vk/post', {
    method: 'POST',
    body: formData
});
```

### Получение групп
```javascript
fetch('http://localhost/api/vk/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        access_token: token
    })
});
```

### Получение постов
```javascript
fetch('http://localhost/api/vk/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        access_token: token,
        owner_id: '-227624792',
        count: 10,
        offset: 0,
        filter: 'all'
    })
});
```

## ✅ Проверка путей

Все пути проверены и корректны:
- ✅ HTML файлы правильно ссылаются на CSS и JS
- ✅ JavaScript файлы используют правильный API URL (порт 80)
- ✅ Навигация между страницами работает
- ✅ Go backend правильно проксирует запросы в VK Service
- ✅ Dockerfile правильно копирует все файлы
