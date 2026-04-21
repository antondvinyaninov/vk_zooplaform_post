# VK SMM Panel

Панель для автоматизации постинга в группы ВКонтакте.

## Возможности

- 🔐 Авторизация через VK OAuth
- 📝 Публикация постов в группы
- 🎯 Управление несколькими группами
- 💾 Сохранение настроек

## Технологии

- **Backend**: Go
- **Frontend**: Vanilla JS, HTML, CSS
- **API**: VK API

## Локальный запуск

### Требования
- Go 1.21+
- Python 3 (для фронтенда)

### Запуск
```bash
./run
```

Приложение будет доступно:
- Фронтенд: http://localhost:3000
- Бэкенд: http://localhost:8000

## Docker

### Сборка
```bash
docker build -t vk-smm-panel .
```

### Запуск
```bash
docker run -p 8000:8000 -p 3000:3000 \
  -e VK_APP_ID=54481712 \
  -e VK_SERVICE_KEY=your_key \
  vk-smm-panel
```

### Docker Compose
```bash
docker-compose up -d
```

## Деплой на Easypanel

1. Создайте новое приложение
2. Подключите GitHub репозиторий
3. Укажите Dockerfile
4. Добавьте переменные окружения:
   - `VK_APP_ID`
   - `VK_SERVICE_KEY`
5. Настройте порты: 8000, 3000
6. Деплой!

## Настройка VK приложения

1. Создайте Standalone-приложение: https://vk.com/apps?act=manage
2. App ID: `54481712`
3. В настройках добавьте Redirect URI: `https://your-domain.com/auth.html`

## Использование

1. Откройте приложение
2. Подключите аккаунт VK
3. Выберите группы для постинга
4. Публикуйте посты!

## Лицензия

MIT
