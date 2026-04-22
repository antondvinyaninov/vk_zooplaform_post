# API Structure

## External API (`external/`)

Работа с внешними API (VK, Telegram и т.д.)

### VK API (`external/vk.go`)
- Обертка над VK API клиентом
- Методы для работы с группами, постами, пользователями
- Загрузка медиа файлов

**Пример использования:**
```go
client := external.NewVKAPIClient(accessToken)
groups, err := client.GetGroups(true, "admin,editor,moder")
```

---

## Internal API (`internal/`)

Работа с внутренней базой данных и бизнес-логикой

### Group Service (`internal/groups.go`)
- CRUD операции для групп
- Хранение токенов доступа
- Управление активными группами

**Методы:**
- `Create(group)` - создать группу
- `GetByID(id)` - получить по ID
- `GetByVKGroupID(vkGroupID)` - получить по VK ID
- `GetAll()` - получить все активные
- `Update(group)` - обновить
- `Delete(id)` - удалить (мягкое)

### Post Service (`internal/posts.go`)
- CRUD операции для постов
- Управление статусами (draft, scheduled, published, failed)
- Отложенная публикация

**Методы:**
- `Create(post)` - создать пост
- `GetByID(id)` - получить по ID
- `GetByGroupID(groupID, limit, offset)` - посты группы
- `GetByStatus(status, limit, offset)` - посты по статусу
- `Update(post)` - обновить
- `UpdateStatus(id, status)` - обновить статус
- `Delete(id)` - удалить

### User Service (`internal/users.go`)
- CRUD операции для пользователей
- Роли (admin, user)
- Автоматическое создание при первом входе

**Методы:**
- `Create(user)` - создать пользователя
- `GetByID(id)` - получить по ID
- `GetByVKUserID(vkUserID)` - получить по VK ID
- `GetOrCreate(vkUserID, ...)` - получить или создать
- `Update(user)` - обновить

---

## Использование

### В handlers:

```go
import (
    "backend/api/external"
    "backend/api/internal"
)

// Внешний API
vkClient := external.NewVKAPIClient(token)
groups, err := vkClient.GetGroups(true, "admin")

// Внутренний API
groupService := internal.NewGroupService()
dbGroups, err := groupService.GetAll()
```

### Типичный flow:

1. **Получение данных из VK** → `external/vk.go`
2. **Сохранение в БД** → `internal/groups.go`, `internal/posts.go`
3. **Публикация в VK** → `external/vk.go`
4. **Обновление статуса** → `internal/posts.go`
