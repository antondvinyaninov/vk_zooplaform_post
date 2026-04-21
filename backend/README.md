# Backend

Простой Go бэкенд с hot reload через Air.

## Установка Air

```bash
go install github.com/cosmtrek/air@latest
```

## Запуск

С hot reload:
```bash
air
```

Обычный запуск:
```bash
go run main.go
```

## Эндпоинты

- `GET /health` - проверка статуса сервера
