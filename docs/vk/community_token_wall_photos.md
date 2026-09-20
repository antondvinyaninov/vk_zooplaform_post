# Фото на стену группы: ключ сообщества vs SMM-сервисы

Проверено живым ключом `zooplatforma_test` и сверкой с docs VK / публичными баг-репортами (2026).

## Как это делают SMMBox, SMMplanner, Amplifr

Они **не** публикуют ключом из «Работа с API».

- [SmmBox](https://smmbox.com/documentation/): регистрация/подключение через **аккаунт ВКонтакте**, «нужен тот, у кого есть права на постинг в группу», затем «Добавить группу» из списка админок этого пользователя.
- [SMMplanner](https://faq.smmplanner.com/ru/articles/2113142-%D0%BA%D0%B0%D0%BA-%D0%BF%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B8%D1%82%D1%8C-%D0%B3%D1%80%D1%83%D0%BF%D0%BF%D1%8B-%D0%B2%D0%BA-%D0%B4%D0%BB%D1%8F-%D0%BF%D1%83%D0%B1%D0%BB%D0%B8%D0%BA%D0%B0%D1%86%D0%B8%D0%B9): «при подключении **личной страницы** все администрируемые группы подтягиваются автоматически».

Это OAuth **user-токена администратора** (`wall` + `photos` + обычно `offline`). Группа выбирается как цель (`owner_id=-id`, `from_group=1`), токен всё равно пользовательский. Поэтому у них картинки на стене есть.

## Что говорит документация VK

| Метод | Кто может вызывать (docs) |
|---|---|
| [photos.getWallUploadServer](https://dev.vk.ru/ru/method/photos.getWallUploadServer) | **только ключ пользователя** |
| [photos.saveWallPhoto](https://dev.vk.ru/ru/method/photos.saveWallPhoto) | **только ключ пользователя** |
| [photos.getMessagesUploadServer](https://dev.vk.ru/ru/method/photos.getMessagesUploadServer) | пользователь **или** сообщество (`photos`) |
| [wall.post](https://dev.vk.ru/ru/method/wall.post) | в тексте docs — user; на практике ключ сообщества со «Стеной» постит **текст** |

Право `photos` у ключа сообщества — это фото **сообщества** (сообщения, иногда обложка). Это не тот же набор методов, что загрузка на **стену**.

## Что получается на реальном ключе сообщества

Даже если `groups.getTokenPermissions` показывает `wall` + `photos`:

- `wall.post` текстом — ок
- `photos.getWallUploadServer` / `saveWallPhoto` / альбомы / `photos.copy` — **VK 27** (`method is unavailable with group auth`)
- `photos.getMessagesUploadServer` + `saveMessagesPhoto` + `wall.post` — API ок, фото в альбоме **-64** (сообщения). На стене **не видно** (иконка стопки)

Та же таблица у других: [vk-api-schema#242](https://github.com/VKCOM/vk-api-schema/issues/242), [vk-php-sdk#130](https://github.com/vkcom/vk-php-sdk/issues/130), [Postiz #1408](https://github.com/gitroomhq/postiz-app/issues/1408), [StackOverflow group token photos](https://stackoverflow.com/questions/79894056/vk-api-error-15-100-when-posting-photos-to-community-wall-via-wordpress-acce). Ответа VK «делайте только ключом группы» нет; поддержка в обсуждениях указывает на **user**-upload.

## Рабочая схема (как у SMM, без Kate как единственного `wall.post`)

1. Файл: user-токен админа группы, `photos.getWallUploadServer?group_id=` → upload → `photos.saveWallPhoto?group_id=` → `photo-{group}_{id}` (альбом стены, не -64).
2. Публикация: ключ сообщества, `wall.post` + `attachments`.

В коде: `vk.UploadPhotoForGroupWall` (сначала ключ группы, при 27 — user `photos` только на upload).
