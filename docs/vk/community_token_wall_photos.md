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

## Логи прода (vk.zooplatforma.ru)

Снято 2026-09-20 с `GET /api/admin/logs?level=WARNING&limit=200` и `/api/admin/vk/connection`. Это **другая** ошибка, чем VK 27 у ключа сообщества.

Прод **уже ходит в VK одним user-токеном** Антона: `vk_accounts` / `/vk-connect` / Kate `2685278`, vk_user_id `81306887`, запись обновлена **2026-09-09**. UI `is_connected=true`, `has_token=true`, срок далеко в будущем — поэтому кажется, что «через мой ключ настроено работать». VK этот токен уже не принимает.

Ключи сообществ при этом живые: health «Токен: подключен» у тестовой `zooplatforma_test` (227624792) и у **Зоопомощь Ижевск** (208935410). Moderate на проде (ветка `main`) их **не использует**.

| Когда | Ошибка VK | Сколько в последних 200 WARNING | Смысл |
|---|---|---|---|
| 9–10 сен | **9 Flood control** | ~36 | один личный токен грузит фото/`wall.post` во все группы → антифлуд |
| 9 сен | **5 user is blocked** | 2+ | VK заблокировал эту user-авторизацию |
| 9 сен и рядом | **18 User was deleted or banned** | 2 | бан/удаление user-аккаунта с точки зрения API |
| 11 сен → 20 сен 13:17 UTC | **5 invalid access_token (4)** | ~145 | Kate-токен мёртв; и загрузка фото, и `wall.post` |

Сегодняшние примеры: посты **2801** и **2802**, группа **208935410** Ижевск: сначала `MEDIA_PARTIAL_UPLOAD` «0 из N» (`failed to get upload server` + error 5), сразу `PUBLISH_FAILED` с тем же 5. Картинок нет не из‑за 27, а потому что user-токен невалиден; текст тоже не уходит, потому что прод постит им же.

Цепочка: флуд (9) → блок (5 blocked / 18) → токен отозван (5 invalid). Это ровно то, чего нет у SMM, если они не молотят одним Kate-ключом все стены.

После этого PR `wall.post` идёт ключом группы (Ижевск его уже имеет). Fallback фото через тот же Kate **всё ещё упадёт в 5**, пока нет отдельного живого user-токена только на `photos.getWallUploadServer`.

## Как решать (варианты)

VK не даёт ключу сообщества `photos.getWallUploadServer` (это не баг приложения). Варианты:

| | Что делаем | Текст на стене | Картинка на стене | Риск флуда/бана | Когда выбирать |
|---|---|---|---|---|---|
| **A. Только ключи групп** | Влить PR, прод публикует `wall.post` из `groups.access_token` | Да | Нет (27, без user-upload) | Низкий: лимит на сообщество, не на Антона | Нужно снова публиковать объявления сейчас |
| **B. Как SMM (рекомендуется)** | A + отдельный **живой** user-токен админа **только** на `photos.getWallUploadServer`/`saveWallPhoto`. `wall.post` остаётся ключом группы | Да | Да | Ниже, чем сейчас: один токен не молотит все стены | Нужны фото, как у SMMBox |
| **C. Снова Kate как единственный постер** | Перелогинить `/vk-connect` и оставить `main` как есть | Пока токен жив | Пока токен жив | **Высокий**: уже было 9 → 5 blocked → 5 invalid | Не выбирать: это текущий сломанный путь |
| **D. Готовые вложения VK** | `publish-by-link` / `photo-{group}_{id}` без загрузки файла | Да (ключ группы) | Да, если фото уже в альбоме стены | Низкий | Репост/ссылка, не новый JPEG с модерации |

Для **B** не использовать Kate `2685278` как массовый `wall.post`. Нужен аккаунт-админ групп с правом `photos` (лучше не тот, который уже словил 5/18). Токен не коммитить. Пока этот токен не положили в `vk_accounts` (или отдельное поле «photos only»), после мержа PR картинки на проде всё ещё будут 5.

Не вариант: ждать, что ключ из «Работа с API» начнёт грузить wall-фото — в docs VK этого нет.

## Как получить личный ключ не через Kate

Kate `2685278` — это чужое приложение «VK Админ»: implicit-flow в `oauth.vk.com/blank.html`, чтобы обойти блокировки своего `client_id`. VK такие токены отзывает (`invalid access_token (4)`). Ключ сообщества из «Работа с API» **нельзя** превратить в user-токен.

Рабочие способы (все дают **user**-токен с `photos`, не группу):

1. **Своё Mini App (предпочтительно)** — `VKWebAppGetAuthToken` с `app_id` Zoo (уже есть для городов, сейчас `scope: ''`). Админ в приложении группы жмёт согласие на `photos` (для видео ещё `video`). Токен своего приложения, без Kate, без IP-капчи. Обычно **короткий** (`expires_in` часы, не `offline`) — его надо периодически обновлять и слать на бэкенд в `vk_accounts` **только как photos-upload**, не как `wall.post`.
2. **OAuth своего приложения** — `VK_CLIENT_ID` + `VK_CLIENT_SECRET`, callback уже есть: `/api/vk/oauth/callback`. Кнопка на `/vk-connect` сейчас открывает Kate, не этот flow. Implicit у новых приложений VK часто режет; code flow + `photos` надёжнее. `offline` Mini App могут не выдать.
3. **Другой админ групп** — если у 81306887 ещё `user is blocked` / 18, новый токен **того же** человека снова упрётся в бан. Нужен другой администратор (как у SMM: «тот, у кого есть права на постинг»).
4. **Вставка URL** на `/vk-connect` уже есть: любой `access_token=` из hash после OAuth. Это не новый метод, только ручная доставка.

Не путать: Bridge `VKWebAppGetCommunityToken` — снова ключ **группы**, wall-фото не грузит (27). Service key приложения — не user.

Практично: влить PR (текст ключом группы) + один раз выдать `photos` через Mini App своего app_id и сохранить на сервер. Не логиниться Kate «чтобы снова всё постилось с личного».

