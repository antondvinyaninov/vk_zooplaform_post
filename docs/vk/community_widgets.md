Title: Интеграция | Сообщества и пользователи | Виджеты сообществ | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/api/community-apps-widgets/getting-started

---

Виджет — это блок с информацией из мини-приложения: например, список ресторанов или кинотеатров, результаты футбольного матча или киберспортивного поединка, перечень цен на услуги или объекты недвижимости. Блок с виджетом отображается в верхней части сообщества и доступен как в полной версии сайта, так и в мобильных клиентах.
Установка виджетов доступна из приложений, которые поддержали у себя эту возможность. Например: «Рассылки», «Тесты», «Пожертвования», «Заявки» и «Анкеты». Все они доступны в официальном каталоге приложений: [vk.com/community_apps](https://vk.com/away.php?to=https%3A%2F%2Fvk.com%2Fcommunity_apps).
Виджет «Cover List (обложки)»
В виджете можно отображать список матчей, таблицу, цитату и многое другое. Подробное описание всех доступных типов виджетов — в разделе [Виджеты приложений сообществ](https://dev.vk.com/ru/reference/objects/app-widget).

## https://dev.vk.com/ru/api/community-apps-widgets/getting-started#%D0%A3%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0%20%D0%B2%D0%B8%D0%B4%D0%B6%D0%B5%D1%82%D0%B0Установка виджета
1. 1.
Перед установкой виджета пользователь должен добавить приложение в сообщество. Чтобы добавить приложение, используйте событие VK Bridge [VKWebAppAddToCommunity](https://dev.vk.com/ru/bridge/VKWebAppAddToCommunity).

2. 2.
Чтобы установить виджет, используйте событие VK Bridge [VKWebAppShowCommunityWidgetPreviewBox](https://dev.vk.com/ru/bridge/VKWebAppShowCommunityWidgetPreviewBox).

Перед установкой виджета пользователь должен добавить приложение в сообщество. Чтобы добавить приложение, используйте событие VK Bridge [VKWebAppAddToCommunity](https://dev.vk.com/ru/bridge/VKWebAppAddToCommunity).

```
VKWebAppAddToCommunity
```

Чтобы установить виджет, используйте событие VK Bridge [VKWebAppShowCommunityWidgetPreviewBox](https://dev.vk.com/ru/bridge/VKWebAppShowCommunityWidgetPreviewBox).

```
VKWebAppShowCommunityWidgetPreviewBox
```

## https://dev.vk.com/ru/api/community-apps-widgets/getting-started#%D0%9E%D0%B1%D0%BD%D0%BE%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%B2%D0%B8%D0%B4%D0%B6%D0%B5%D1%82%D0%B0Обновление виджета
Если вы хотите, чтобы виджет приложения в сообществе обновлялся динамически:
1. 1.
Получите для приложения ключ доступа сообщества с правом доступа app_widget при помощи события VK Bridge [VKWebAppGetCommunityToken](https://dev.vk.com/ru/bridge/VKWebAppGetCommunityToken).

2. 2.
Чтобы обновить виджет, со стороны сервера вызовите метод API [appWidgets.update](https://dev.vk.com/ru/method/appWidgets.update). В качестве аргументов он принимает:

•type (string) — тип виджета. Может принимать значения text, list, table, tiles, compact_list, cover_list, match, matches, donation.
•code (string) — код виджета. Аналог параметраcode в методе [execute](https://dev.vk.com/ru/method/execute).


3. •type (string) — тип виджета. Может принимать значения text, list, table, tiles, compact_list, cover_list, match, matches, donation.
4. •code (string) — код виджета. Аналог параметраcode в методе [execute](https://dev.vk.com/ru/method/execute).
Получите для приложения ключ доступа сообщества с правом доступа app_widget при помощи события VK Bridge [VKWebAppGetCommunityToken](https://dev.vk.com/ru/bridge/VKWebAppGetCommunityToken).

```
app_widget
```


```
VKWebAppGetCommunityToken
```

Чтобы обновить виджет, со стороны сервера вызовите метод API [appWidgets.update](https://dev.vk.com/ru/method/appWidgets.update). В качестве аргументов он принимает:

```
appWidgets.update
```

- •type (string) — тип виджета. Может принимать значения text, list, table, tiles, compact_list, cover_list, match, matches, donation.
- •code (string) — код виджета. Аналог параметраcode в методе [execute](https://dev.vk.com/ru/method/execute).

```
type
```


```
string
```


```
text
```


```
list
```


```
table
```


```
tiles
```


```
compact_list
```


```
cover_list
```


```
match
```


```
matches
```


```
donation
```


```
code
```


```
string
```


```
code
```

[execute](https://dev.vk.com/ru/method/execute)

```
execute
```

Подробнее о синтаксисе методов API — в разделе [Формат запросов](https://dev.vk.com/ru/api/api-requests).
Обновлять данные виджета через приложение можно не чаще 1 раза в 30 секунд.

code должен возвращать JSON-объект, описывающий виджет. Элементы виджета могут содержать только внутренние ссылки на vk.com (кроме away.php) и vk.me.

```
code
```

В общем случае параметр code выглядит так:

```
code
```


```
return {     '''widget''' };
```

Структура объекта widget зависит от типа виджета. Подробное описание объекта — в разделе [Приложение](https://dev.vk.com/ru/widgets/app).

```
widget
```

Чтобы скрыть виджет у пользователя, передайте в code значение return false.

```
code
```


```
return false
```

Внутри code можно использовать ограниченный набор методов API, по умолчанию используется версия API 5.100.

```
code
```

- •[users.get](https://dev.vk.com/ru/method/users.get)
- •[users.getSubscriptions](https://dev.vk.com/ru/method/users.getSubscriptions)
- •[users.getFollowers](https://dev.vk.com/ru/method/users.getFollowers)
- •[wall.get](https://dev.vk.com/ru/method/wall.get)
- •[wall.search](https://dev.vk.com/ru/method/wall.search)
- •[photos.getAlbums](https://dev.vk.com/ru/method/photos.getAlbums)
- •[photos.get](https://dev.vk.com/ru/method/photos.get)
- •[photos.getById](https://dev.vk.com/ru/method/photos.getById)
- •[photos.search](https://dev.vk.com/ru/method/photos.search)
- •[friends.get](https://dev.vk.com/ru/method/friends.get)
- •[widgets.getComments](https://dev.vk.com/ru/method/widgets.getComments)
- •[widgets.getPages](https://dev.vk.com/ru/method/widgets.getPages)
- •[wall.getById](https://dev.vk.com/ru/method/wall.getById)
- •[wall.getReposts](https://dev.vk.com/ru/method/wall.getReposts)
- •[wall.getComments](https://dev.vk.com/ru/method/wall.getComments)
- •[groups.isMember](https://dev.vk.com/ru/method/groups.isMember)
- •[groups.getById](https://dev.vk.com/ru/method/groups.getById)
- •[groups.getMembers](https://dev.vk.com/ru/method/groups.getMembers)
- •[board.getTopics](https://dev.vk.com/ru/method/board.getTopics)
- •[board.getComments](https://dev.vk.com/ru/method/board.getComments)
- •[likes.getList](https://dev.vk.com/ru/method/likes.getList)
- •[apps.getCatalog](https://dev.vk.com/ru/method/apps.getCatalog)
- •[apps.get](https://dev.vk.com/ru/method/apps.get)
[users.get](https://dev.vk.com/ru/method/users.get)

```
users.get
```

[users.getSubscriptions](https://dev.vk.com/ru/method/users.getSubscriptions)

```
users.getSubscriptions
```

[users.getFollowers](https://dev.vk.com/ru/method/users.getFollowers)

```
users.getFollowers
```

[wall.get](https://dev.vk.com/ru/method/wall.get)

```
wall.get
```

[wall.search](https://dev.vk.com/ru/method/wall.search)

```
wall.search
```

[photos.getAlbums](https://dev.vk.com/ru/method/photos.getAlbums)

```
photos.getAlbums
```

[photos.get](https://dev.vk.com/ru/method/photos.get)

```
photos.get
```

[photos.getById](https://dev.vk.com/ru/method/photos.getById)

```
photos.getById
```

[photos.search](https://dev.vk.com/ru/method/photos.search)

```
photos.search
```

[friends.get](https://dev.vk.com/ru/method/friends.get)

```
friends.get
```

[widgets.getComments](https://dev.vk.com/ru/method/widgets.getComments)

```
widgets.getComments
```

[widgets.getPages](https://dev.vk.com/ru/method/widgets.getPages)

```
widgets.getPages
```

[wall.getById](https://dev.vk.com/ru/method/wall.getById)

```
wall.getById
```

[wall.getReposts](https://dev.vk.com/ru/method/wall.getReposts)

```
wall.getReposts
```

[wall.getComments](https://dev.vk.com/ru/method/wall.getComments)

```
wall.getComments
```

[groups.isMember](https://dev.vk.com/ru/method/groups.isMember)

```
groups.isMember
```

[groups.getById](https://dev.vk.com/ru/method/groups.getById)

```
groups.getById
```

[groups.getMembers](https://dev.vk.com/ru/method/groups.getMembers)

```
groups.getMembers
```

[board.getTopics](https://dev.vk.com/ru/method/board.getTopics)

```
board.getTopics
```

[board.getComments](https://dev.vk.com/ru/method/board.getComments)

```
board.getComments
```

[likes.getList](https://dev.vk.com/ru/method/likes.getList)

```
likes.getList
```

[apps.getCatalog](https://dev.vk.com/ru/method/apps.getCatalog)

```
apps.getCatalog
```

## https://dev.vk.com/ru/api/community-apps-widgets/getting-started#%D0%9A%D0%BE%D0%B4%20%D0%B2%D0%B8%D0%B4%D0%B6%D0%B5%D1%82%D0%B0Код виджета
[apps.get](https://dev.vk.com/ru/method/apps.get)

```
apps.get
```

## https://dev.vk.com/ru/api/community-apps-widgets/getting-started#%D0%91%D0%B0%D0%B7%D0%BE%D0%B2%D1%8B%D0%B5%20%D0%BF%D0%B5%D1%80%D0%B5%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B5Базовые переменные
Переменная Args содержит в себе данные, которые могут пригодиться для отрисовки виджета:

```
Args
```

- •Args.uid — идентификатор текущего пользователя.
- •Args.platform — тип платформы, с которой открыта группа:

•web
•mobile
•android
•iphone


- •web
- •mobile
- •android
- •iphone
- •Args.lang — идентификатор языка пользователя:

•0 — русский
•1 — украинский
•2 — белорусский
•3 — английский
•4 — испанский
•5 — финский
•6 — немецкий
•7 — итальянский


- •0 — русский
- •1 — украинский
- •2 — белорусский
- •3 — английский
- •4 — испанский
- •5 — финский
- •6 — немецкий
- •7 — итальянский

```
Args.uid
```


```
Args.platform
```

- •web
- •mobile
- •android
- •iphone

```
web
```


```
mobile
```


```
android
```


```
iphone
```


```
Args.lang
```

- •0 — русский
- •1 — украинский
- •2 — белорусский
- •3 — английский
- •4 — испанский
- •5 — финский
- •6 — немецкий
- •7 — итальянский

```
0
```


```
1
```


```
2
```


```
3
```


```
4
```


```
5
```


```
6
```


```
7
```

## https://dev.vk.com/ru/api/community-apps-widgets/getting-started#%D0%98%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%B2%20%D0%B2%D0%B8%D0%B4%D0%B6%D0%B5%D1%82%D0%B5Изображения в виджете
26 мая 2025 года мы обновили механизм загрузки изображений в виджеты. Изменения затронут только новые загрузки — существующие изображения продолжат отображаться в виджетах. Чтобы добавлять новые картинки, обновите код вашего приложения.
В виджет можно загрузить изображения из нескольких источников:
- •Коллекция приложения. Такие изображения можно использовать в разных сообществах.
- •Коллекция сообщества. Такие изображения можно использовать только в том сообществе, где установлено приложение.
Изображения должны быть загружены в утроенном размере: например, для картинки с конечным размером 160×160 px нужно загружать изображение размером 480×480 px.

1. 1.
Получите адрес сервера для загрузки с помощью одного из методов:

•[appWidgets.getAppImageUploadServer](https://dev.vk.com/ru/method/appWidgets.getAppImageUploadServer), чтобы получить адрес сервера для коллекции приложения.
•[appWidgets.getGroupImageUploadServer](https://dev.vk.com/ru/method/appWidgets.getGroupImageUploadServer), чтобы получить адрес сервера для коллекции сообщества.


2. •[appWidgets.getAppImageUploadServer](https://dev.vk.com/ru/method/appWidgets.getAppImageUploadServer), чтобы получить адрес сервера для коллекции приложения.
3. •[appWidgets.getGroupImageUploadServer](https://dev.vk.com/ru/method/appWidgets.getGroupImageUploadServer), чтобы получить адрес сервера для коллекции сообщества.
4. 2.
Загрузите изображение на сервер с помощью POST-запроса, например:
Командная строкаcurl -X POST --header "Content-Type: multipart/form-data" https://pu.vk.com/gu/photo/v2/upload?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9... -F "file=@C:/path/file-name.png"
Пример ответа:
JSON{
   "sha": "7ab...e9d9",
   "secret": "-123...59",
   "meta": {
      "height": "480",
      "kid": "8039ef17bf7feb673b91f90370302480",
      "width": "480"
   },
   "hash": "12ab3cde4ecc16e11cd26d992941ed3c",
   "server": "917608",
   "group_id": 123456789,
   "request_id": "ZSfNEUcvOpP7-KOiOtXsH2AJUQghnw",
   "app_id": 1234567
}

5. 3.
Полученный ответ преобразуйте в строку в кодировке Base64:
ewogICAgICAic2hhIjogIjdhYi4uLmU5ZDkiLAogICAgICAic2VjcmV0IjogIi0xMjMuLi41OSIsCiAgICAgICJtZXRhIjogewogICAgICAgICAiaGVpZ2h0IjogIjQ4MCIsCiAgICAgICAgICJraWQiOiAiODAzOWVmMTdiZjdmZWI2NzNiOTFmOTAzNzAzMDI0ODAiLAogICAgICAgICAid2lkdGgiOiAiNDgwIgogICAgICB9LAogICAgICAiaGFzaCI6ICIxMmFiM2NkZTRlY2MxNmUxMWNkMjZkOTkyOTQxZWQzYyIsCiAgICAgICJzZXJ2ZXIiOiAiOTE3NjA4IiwKICAgICAgImdyb3VwX2lkIjogMTIzNDU2Nzg5LAogICAgICAicmVxdWVzdF9pZCI6ICJaU2ZORVVjdk9wUDctS09pT3RYc0gyQUpVUWdobnciLAogICAgICAiYXBwX2lkIjogMTIzNDU2Nwp9

6. 4.
Сохраните изображение с помощью одного из методов:

•[appWidgets.saveAppImage](https://dev.vk.com/ru/method/appWidgets.saveAppImage), чтобы сохранить изображение в коллекцию приложения.
•[appWidgets.saveGroupImage](https://dev.vk.com/ru/method/appWidgets.saveGroupImage), чтобы сохранить изображение в коллекцию сообщества.

Пример запроса:
Командная строкаcurl 'https://api.vk.ru/method/appWidgets.saveGroupImage' \
-F 'access_token=vk1.a.HvAydakVSc7SavH6L...' \
-F 'image=ewogICAgICAic2hhIjogIjdhYi4uLmU5ZDkiLAogICAgICAic2VjcmV0IjogIi0xMjMuLi41OSIsCiAgICAgICJtZXRhIjogewogICAgICAgICAiaGVpZ2h0IjogIjQ4MCIsCiAgICAgICAgICJraWQiOiAiODAzOWVmMTdiZjdmZWI2NzNiOTFmOTAzNzAzMDI0ODAiLAogICAgICAgICAid2lkdGgiOiAiNDgwIgogICAgICB9LAogICAgICAiaGFzaCI6ICIxMmFiM2NkZTRlY2MxNmUxMWNkMjZkOTkyOTQxZWQzYyIsCiAgICAgICJzZXJ2ZXIiOiAiOTE3NjA4IiwKICAgICAgImdyb3VwX2lkIjogMTIzNDU2Nzg5LAogICAgICAicmVxdWVzdF9pZCI6ICJaU2ZORVVjdk9wUDctS09pT3RYc0gyQUpVUWdobnciLAogICAgICAiYXBwX2lkIjogMTIzNDU2Nwp9' \
-F 'v=5.199'
Пример ответа:
JSON{
   "response": {
      "id": "230800838_2928790",
      "type": "160x160",
      "images": [
            {
               "url": "https://sun9-57.userapi.com/impg/erBe1xJQnREHiMOldZKVcX4xx5dDcqnpPBLp2Q/VWgINQxx1JY.jpg?size=160x160&quality=90&sign=3cc317d49b6e977b56034db0d5ccf8bc&c_uniq_tag=WtnZKW2e7a0LSvYWObRe_myHaK2gnrGChY-QvKUS5Aw",
               "width": 160,
               "height": 160
            },
            {
               "url": "https://sun9-57.userapi.com/impg/erBe1xJQnREHiMOldZKVcX4xx5dDcqnpPBLp2Q/VWgINQxx1JY.jpg?size=320x320&quality=90&sign=e865d489181ceab1a3291e7e7957803c&c_uniq_tag=k5wB6LnFpyoxqT8TSJqQSeN2nYQcFfZMcvFjtROaG0M",
               "width": 320,
               "height": 320
            },
            {
               "url": "https://sun9-57.userapi.com/erBe1xJQnREHiMOldZKVcX4xx5dDcqnpPBLp2Q/VWgINQxx1JY.jpg",
               "width": 480,
               "height": 480
            }
      ]
   }
}

7. •[appWidgets.saveAppImage](https://dev.vk.com/ru/method/appWidgets.saveAppImage), чтобы сохранить изображение в коллекцию приложения.
8. •[appWidgets.saveGroupImage](https://dev.vk.com/ru/method/appWidgets.saveGroupImage), чтобы сохранить изображение в коллекцию сообщества.
Получите адрес сервера для загрузки с помощью одного из методов:
- •[appWidgets.getAppImageUploadServer](https://dev.vk.com/ru/method/appWidgets.getAppImageUploadServer), чтобы получить адрес сервера для коллекции приложения.
- •[appWidgets.getGroupImageUploadServer](https://dev.vk.com/ru/method/appWidgets.getGroupImageUploadServer), чтобы получить адрес сервера для коллекции сообщества.
[appWidgets.getAppImageUploadServer](https://dev.vk.com/ru/method/appWidgets.getAppImageUploadServer)

```
appWidgets.getAppImageUploadServer
```

[appWidgets.getGroupImageUploadServer](https://dev.vk.com/ru/method/appWidgets.getGroupImageUploadServer)

```
appWidgets.getGroupImageUploadServer
```

Загрузите изображение на сервер с помощью POST-запроса, например:

```
curl -X POST --header "Content-Type: multipart/form-data" https://pu.vk.com/gu/photo/v2/upload?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9... -F "file=@C:/path/file-name.png"
```

Пример ответа:

```
{ "sha": "7ab...e9d9", "secret": "-123...59", "meta": { "height": "480", "kid": "8039ef17bf7feb673b91f90370302480", "width": "480" }, "hash": "12ab3cde4ecc16e11cd26d992941ed3c", "server": "917608", "group_id": 123456789, "request_id": "ZSfNEUcvOpP7-KOiOtXsH2AJUQghnw", "app_id": 1234567 }
```

Полученный ответ преобразуйте в строку в кодировке Base64:

```
ewogICAgICAic2hhIjogIjdhYi4uLmU5ZDkiLAogICAgICAic2VjcmV0IjogIi0xMjMuLi41OSIsCiAgICAgICJtZXRhIjogewogICAgICAgICAiaGVpZ2h0IjogIjQ4MCIsCiAgICAgICAgICJraWQiOiAiODAzOWVmMTdiZjdmZWI2NzNiOTFmOTAzNzAzMDI0ODAiLAogICAgICAgICAid2lkdGgiOiAiNDgwIgogICAgICB9LAogICAgICAiaGFzaCI6ICIxMmFiM2NkZTRlY2MxNmUxMWNkMjZkOTkyOTQxZWQzYyIsCiAgICAgICJzZXJ2ZXIiOiAiOTE3NjA4IiwKICAgICAgImdyb3VwX2lkIjogMTIzNDU2Nzg5LAogICAgICAicmVxdWVzdF9pZCI6ICJaU2ZORVVjdk9wUDctS09pT3RYc0gyQUpVUWdobnciLAogICAgICAiYXBwX2lkIjogMTIzNDU2Nwp9
```

Сохраните изображение с помощью одного из методов:
- •[appWidgets.saveAppImage](https://dev.vk.com/ru/method/appWidgets.saveAppImage), чтобы сохранить изображение в коллекцию приложения.
- •[appWidgets.saveGroupImage](https://dev.vk.com/ru/method/appWidgets.saveGroupImage), чтобы сохранить изображение в коллекцию сообщества.
[appWidgets.saveAppImage](https://dev.vk.com/ru/method/appWidgets.saveAppImage)

```
appWidgets.saveAppImage
```

[appWidgets.saveGroupImage](https://dev.vk.com/ru/method/appWidgets.saveGroupImage)

```
appWidgets.saveGroupImage
```

Пример запроса:

```
curl 'https://api.vk.ru/method/appWidgets.saveGroupImage' \ -F 'access_token=vk1.a.HvAydakVSc7SavH6L...' \ -F 'image=ewogICAgICAic2hhIjogIjdhYi4uLmU5ZDkiLAogICAgICAic2VjcmV0IjogIi0xMjMuLi41OSIsCiAgICAgICJtZXRhIjogewogICAgICAgICAiaGVpZ2h0IjogIjQ4MCIsCiAgICAgICAgICJraWQiOiAiODAzOWVmMTdiZjdmZWI2NzNiOTFmOTAzNzAzMDI0ODAiLAogICAgICAgICAid2lkdGgiOiAiNDgwIgogICAgICB9LAogICAgICAiaGFzaCI6ICIxMmFiM2NkZTRlY2MxNmUxMWNkMjZkOTkyOTQxZWQzYyIsCiAgICAgICJzZXJ2ZXIiOiAiOTE3NjA4IiwKICAgICAgImdyb3VwX2lkIjogMTIzNDU2Nzg5LAogICAgICAicmVxdWVzdF9pZCI6ICJaU2ZORVVjdk9wUDctS09pT3RYc0gyQUpVUWdobnciLAogICAgICAiYXBwX2lkIjogMTIzNDU2Nwp9' \ -F 'v=5.199'
```

Пример ответа:

### https://dev.vk.com/ru/api/community-apps-widgets/getting-started#%D0%9A%D0%B0%D0%BA%20%D0%B7%D0%B0%D0%B3%D1%80%D1%83%D0%B7%D0%B8%D1%82%D1%8C%20%D0%B8%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5Как загрузить изображение
```
{ "response": { "id": "230800838_2928790", "type": "160x160", "images": [ { "url": "https://sun9-57.userapi.com/impg/erBe1xJQnREHiMOldZKVcX4xx5dDcqnpPBLp2Q/VWgINQxx1JY.jpg?size=160x160&quality=90&sign=3cc317d49b6e977b56034db0d5ccf8bc&c_uniq_tag=WtnZKW2e7a0LSvYWObRe_myHaK2gnrGChY-QvKUS5Aw", "width": 160, "height": 160 }, { "url": "https://sun9-57.userapi.com/impg/erBe1xJQnREHiMOldZKVcX4xx5dDcqnpPBLp2Q/VWgINQxx1JY.jpg?size=320x320&quality=90&sign=e865d489181ceab1a3291e7e7957803c&c_uniq_tag=k5wB6LnFpyoxqT8TSJqQSeN2nYQcFfZMcvFjtROaG0M", "width": 320, "height": 320 }, { "url": "https://sun9-57.userapi.com/erBe1xJQnREHiMOldZKVcX4xx5dDcqnpPBLp2Q/VWgINQxx1JY.jpg", "width": 480, "height": 480 } ] } }
```

### https://dev.vk.com/ru/api/community-apps-widgets/getting-started#%D0%98%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%B8%D0%B7%20%D1%84%D0%BE%D1%82%D0%BE%D0%B3%D1%80%D0%B0%D1%84%D0%B8%D0%B8%20%D0%BF%D1%80%D0%BE%D1%84%D0%B8%D0%BB%D1%8FИзображения из фотографии профиля
Вы также можете использовать внутри виджета квадратное изображение главной фотографии профиля пользователя, сообщества или других приложений. Чтобы использовать такое изображение, передайте в [поле icon_id](https://dev.vk.com/ru/reference/objects/app-widget) одно из значений:

```
icon_id
```

- •id<123456> — для фотографии профиля пользователя.
- •club<123456> — для фотографии сообщества.
- •app<123456> — для иконки приложения.

```
id<123456>
```


```
club<123456>
```


```
app<123456>
```

В этом случае во всех аналогичных полях виджета также должны использоваться главные фотографии пользователя, сообщества или приложения соответственно.
[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

