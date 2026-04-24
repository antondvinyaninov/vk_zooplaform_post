# Документация VK API

Документация по работе с VK API и VK Mini Apps.

## 📚 Содержание

### VK API
- [VK Post Parameters](VK_POST_PARAMS.md) - Параметры постов VK
- [VK API Methods](VK_API_METHODS.md) - Методы VK API
- [VK API Authentication](VK_AUTH.md) - Авторизация VK
- [VK API Errors](VK_ERRORS.md) - Обработка ошибок VK API

### VK Mini Apps
- [VK Bridge](VK_BRIDGE.md) - Работа с VK Bridge
- [VK Mini Apps Setup](VK_MINI_APPS_SETUP.md) - Настройка Mini App
- [VK Mini Apps Deploy](VK_MINI_APPS_DEPLOY.md) - Деплой Mini App
- [VKUI Components](VKUI.md) - Использование VKUI

### Интеграция
- [VK Groups](VK_GROUPS.md) - Работа с группами
- [VK Wall Posts](VK_WALL.md) - Публикация на стене
- [VK Media Upload](VK_MEDIA.md) - Загрузка медиа
- [VK Users](VK_USERS.md) - Работа с пользователями

### События и Callback API
- [Callback API](callback_api.md) - Работа с Callback API
- [События в сообществах](community_events_schema.md) - Структура событий (JSON)
- [Обзор событий](events_overview.md) - Полный список событий
- [User Long Poll](user_long_poll.md) - Подключение к Long Poll

### Сообщества и Виджеты
- [Сообщения сообществ](community_messages.md) - Интеграция с сообщениями сообществ
- [Виджеты сообществ](community_widgets.md) - Добавление виджетов в группу

### Дополнительно
- [Open API](open_api.md) - Использование Open API
- [Deprecated API](deprecated_api.md) - Устаревшие методы API

## 🔑 Основные концепции

### Access Token
Токен доступа для работы с VK API. Получается через:
- OAuth авторизацию
- VK Bridge (для Mini Apps)
- Service Key (для серверных запросов)

### VK API Version
Текущая версия API: **5.131**

### Rate Limits
- 3 запроса в секунду для пользовательских токенов
- 20 запросов в секунду для service key

## 🚀 Быстрый старт

### 1. Создание приложения VK

1. Перейдите на [vk.com/apps?act=manage](https://vk.com/apps?act=manage)
2. Нажмите "Создать приложение"
3. Выберите тип "Standalone приложение"
4. Получите `client_id` и `client_secret`

### 2. Получение токена

```javascript
// OAuth URL
const authUrl = `https://oauth.vk.com/authorize?` +
  `client_id=${clientId}&` +
  `redirect_uri=${redirectUri}&` +
  `display=page&` +
  `scope=wall,photos,video,groups&` +
  `response_type=token&` +
  `v=5.131`;
```

### 3. Вызов API метода

```javascript
const response = await fetch(
  `https://api.vk.com/method/wall.post?` +
  `access_token=${token}&` +
  `owner_id=${ownerId}&` +
  `message=${message}&` +
  `v=5.131`
);
```

## 📖 Полезные ссылки

### Официальная документация
- [VK API Reference](https://dev.vk.com/ru/reference)
- [VK Bridge Documentation](https://dev.vk.com/ru/bridge/overview)
- [VKUI Documentation](https://vkui.io/)
- [VK Mini Apps](https://dev.vk.com/ru/mini-apps/overview)

### Инструменты
- [VK API Console](https://dev.vk.com/ru/api-console)
- [VK Apps Management](https://vk.com/apps?act=manage)
- [VK Tunnel](https://dev.vk.com/ru/mini-apps/development/tunnel) - для локальной разработки

### Сообщество
- [VK Developers](https://vk.com/apiclub)
- [VK Platform Updates](https://vk.com/vkplatform)

## 🔧 Настройка проекта

### Backend (Go)

```go
import "backend/vk"

// Создание клиента
client := vk.NewVKClient(accessToken)

// Публикация поста
postID, err := client.WallPost(ownerID, message, attachments, true, 0)
```

### Frontend (VK Mini App)

```typescript
import bridge from '@vkontakte/vk-bridge';

// Инициализация
bridge.send('VKWebAppInit');

// Получение токена
const { access_token } = await bridge.send('VKWebAppGetAuthToken', {
  app_id: 54555042,
  scope: 'wall,photos,video,groups'
});
```

## ⚠️ Важные замечания

### Безопасность
- Никогда не храните токены в коде
- Используйте переменные окружения
- Обновляйте токены регулярно

### IP адреса
- Токены привязаны к IP адресу
- Используйте прямые запросы из браузера для обхода
- Service Key не имеет ограничений по IP

### Scope (права доступа)
- `wall` - публикация на стене
- `photos` - загрузка фото
- `video` - загрузка видео
- `groups` - управление группами
- `offline` - НЕ работает для Standalone приложений

## 📝 Примеры

См. примеры в соответствующих разделах документации.
