# VK API Авторизация

## Методы авторизации

### 1. OAuth (Implicit Flow)

Для получения токена пользователя через браузер.

#### Шаг 1: Перенаправление на VK

```javascript
const clientId = '54555042';
const redirectUri = 'https://oauth.vk.com/blank.html';
const scope = 'wall,photos,video,groups';

const authUrl = `https://oauth.vk.com/authorize?` +
  `client_id=${clientId}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `display=page&` +
  `scope=${scope}&` +
  `response_type=token&` +
  `v=5.131`;

window.location.href = authUrl;
```

#### Шаг 2: Получение токена из URL

После авторизации VK перенаправит на `redirect_uri` с токеном в hash:

```
https://oauth.vk.com/blank.html#access_token=vk1.a...&expires_in=86400&user_id=12345
```

Извлечение токена:

```javascript
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
const accessToken = params.get('access_token');
const userId = params.get('user_id');
const expiresIn = params.get('expires_in');
```

### 2. OAuth (Authorization Code Flow)

Для серверных приложений с обменом кода на токен.

#### Шаг 1: Получение кода

```javascript
const authUrl = `https://oauth.vk.com/authorize?` +
  `client_id=${clientId}&` +
  `redirect_uri=${redirectUri}&` +
  `response_type=code&` +
  `scope=${scope}&` +
  `v=5.131`;
```

#### Шаг 2: Обмен кода на токен

```javascript
const tokenUrl = 'https://oauth.vk.com/access_token';
const params = new URLSearchParams({
  client_id: clientId,
  client_secret: clientSecret,
  redirect_uri: redirectUri,
  code: code
});

const response = await fetch(`${tokenUrl}?${params}`);
const data = await response.json();
// { access_token, expires_in, user_id }
```

### 3. VK Bridge (для Mini Apps)

Для VK Mini Apps используется VK Bridge.

```typescript
import bridge from '@vkontakte/vk-bridge';

// Инициализация
await bridge.send('VKWebAppInit');

// Получение токена
const { access_token, scope } = await bridge.send('VKWebAppGetAuthToken', {
  app_id: 54555042,
  scope: 'wall,photos,video,groups'
});

// Получение информации о пользователе
const userInfo = await bridge.send('VKWebAppGetUserInfo');
```

### 4. Service Key

Для серверных запросов без пользовательского контекста.

Получить в настройках приложения: [vk.com/apps?act=manage](https://vk.com/apps?act=manage)

```javascript
const serviceKey = 'a5b5b6aa...';

// Использование
const response = await fetch(
  `https://api.vk.com/method/users.get?` +
  `user_ids=12345&` +
  `access_token=${serviceKey}&` +
  `v=5.131`
);
```

## Scope (права доступа)

### Основные права

| Scope | Описание |
|-------|----------|
| `wall` | Публикация на стене |
| `photos` | Загрузка фотографий |
| `video` | Загрузка видео |
| `groups` | Управление группами |
| `friends` | Доступ к друзьям |
| `stats` | Статистика |

### Комбинирование прав

```javascript
const scope = 'wall,photos,video,groups';
```

### ⚠️ Важно

- `offline` НЕ работает для Standalone приложений
- Запрашивайте только необходимые права
- Пользователь может отклонить некоторые права

## Хранение токенов

### В браузере

```javascript
// Сохранение
AppStorage.setItem('vk_access_token', accessToken);
AppStorage.setItem('vk_user_id', userId);
AppStorage.setItem('vk_token_expires', Date.now() + expiresIn * 1000);

// Получение
const token = AppStorage.getItem('vk_access_token');

// Проверка срока действия
const expires = AppStorage.getItem('vk_token_expires');
if (Date.now() > expires) {
  // Токен истек, нужна повторная авторизация
}
```

### На сервере (Go)

```go
// В базе данных
type User struct {
    ID          int
    VKUserID    int
    AccessToken string
    TokenExpires time.Time
}

// Проверка срока действия
if time.Now().After(user.TokenExpires) {
    // Токен истек
}
```

## Обработка ошибок

### Ошибки авторизации

```javascript
// Проверка URL на ошибки
const error = params.get('error');
const errorDescription = params.get('error_description');

if (error) {
  switch (error) {
    case 'access_denied':
      // Пользователь отклонил авторизацию
      break;
    case 'invalid_request':
      // Неверные параметры запроса
      break;
    case 'invalid_client':
      // Неверный client_id
      break;
  }
}
```

### Ошибки API

```javascript
const response = await fetch(apiUrl);
const data = await response.json();

if (data.error) {
  switch (data.error.error_code) {
    case 5:
      // Токен недействителен - нужна повторная авторизация
      break;
    case 6:
      // Слишком много запросов - rate limit
      break;
    case 15:
      // Доступ запрещен - недостаточно прав
      break;
  }
}
```

## Безопасность

### ✅ Правильно

```javascript
// Использовать HTTPS
const redirectUri = 'https://example.com/callback';

// Хранить client_secret на сервере
// НИКОГДА не отправлять в браузер

// Проверять state параметр (CSRF защита)
const state = generateRandomString();
AppStorage.setItem('oauth_state', state);
// Добавить в URL: &state=${state}
```

### ❌ Неправильно

```javascript
// НЕ хранить токены в коде
const token = 'vk1.a.hardcoded_token'; // ❌

// НЕ отправлять client_secret в браузер
const clientSecret = 'secret123'; // ❌

// НЕ использовать HTTP
const redirectUri = 'http://example.com'; // ❌
```

## Примеры

### Полный пример OAuth

```javascript
// auth.js
class VKAuth {
  constructor(clientId, redirectUri) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;
  }

  // Начать авторизацию
  authorize(scope = 'wall,photos,video,groups') {
    const authUrl = `https://oauth.vk.com/authorize?` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `display=page&` +
      `scope=${scope}&` +
      `response_type=token&` +
      `v=5.131`;
    
    window.location.href = authUrl;
  }

  // Получить токен из URL
  getTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get('access_token');
    const userId = params.get('user_id');
    const expiresIn = params.get('expires_in');
    
    if (accessToken) {
      this.saveToken(accessToken, userId, expiresIn);
      return { accessToken, userId, expiresIn };
    }
    
    return null;
  }

  // Сохранить токен
  saveToken(accessToken, userId, expiresIn) {
    AppStorage.setItem('vk_access_token', accessToken);
    AppStorage.setItem('vk_user_id', userId);
    AppStorage.setItem('vk_token_expires', Date.now() + expiresIn * 1000);
  }

  // Получить сохраненный токен
  getToken() {
    const token = AppStorage.getItem('vk_access_token');
    const expires = AppStorage.getItem('vk_token_expires');
    
    if (token && Date.now() < expires) {
      return token;
    }
    
    return null;
  }

  // Проверить авторизацию
  isAuthorized() {
    return !!this.getToken();
  }

  // Выйти
  logout() {
    AppStorage.removeItem('vk_access_token');
    AppStorage.removeItem('vk_user_id');
    AppStorage.removeItem('vk_token_expires');
  }
}

// Использование
const auth = new VKAuth('54555042', 'https://oauth.vk.com/blank.html');

// Авторизация
if (!auth.isAuthorized()) {
  auth.authorize();
}

// После редиректа
const tokenData = auth.getTokenFromUrl();
if (tokenData) {
  console.log('Авторизован:', tokenData.userId);
}
```

## Дополнительные ресурсы

- [VK OAuth Documentation](https://dev.vk.com/ru/api/access-token/getting-started)
- [VK Bridge Documentation](https://dev.vk.com/ru/bridge/overview)
- [VK API Console](https://dev.vk.com/ru/api-console) - для тестирования
