Title: Интеграция | Сообщества и пользователи | User Long Poll API | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/api/user-long-poll/getting-started

---

Long Polling — это технология, которая позволяет получать данные о новых событиях с помощью «длинных запросов». Сервер получает запрос, но отправляет ответ на него не сразу, а лишь тогда, когда произойдет какое-либо событие (например, придёт новое сообщение), либо истечет заданное время ожидания.
Используя этот подход, вы можете мгновенно отображать в своем приложении важные события. С помощью User Long Poll API вы не сможете отправить сообщение, для этого используйте метод [messages.send](https://dev.vk.com/ru/method/messages.send).

```
messages.send
```

## https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%98%D0%B7%D0%BC%D0%B5%D0%BD%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%B2%20%D0%B2%D0%B5%D1%80%D1%81%D0%B8%D1%8F%D1%85Изменения в версиях
Документация соответствует версии 3.
Если вы используете более старую версию, обратите внимание на список изменений:
- •Новый флаг для сообщений, удалённых для получателей — 131072.
- •Вложения (geo, photo и т.д.) и дополнительные данные (title, from) приходят в отдельных объектах. См. [Вложения и дополнительные данные](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%92%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%B8%20%D0%B4%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D0%B5).

```
131072
```


```
geo
```


```
photo
```


```
title
```


```
from
```

[Вложения и дополнительные данные](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%92%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%B8%20%D0%B4%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D0%B5)

## https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%9F%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D0%B5Подключение
Перед подключением к Long Poll серверу необходимо получить данные сессии (server, key, ts) с помощью метода [messages.getLongPollServer](https://dev.vk.com/ru/method/messages.getLongPollServer). Мы рекомендуем передавать актуальный номер версии Long Poll в параметре lp_version.

```
server
```


```
key
```


```
ts
```


```
messages.getLongPollServer
```


```
lp_version
```

Затем составьте запрос такого вида:

```
{$server}?act=a_check&key={$key}&ts={$ts}&wait=25&mode=2&version=2
```

В нём используются следующие параметры:

```
key
```


```
server
```


```
https://
```


```
ts
```


```
wait
```


```
90
```


```
wait
```


```
25
```


```
mode
```


```
2
```


```
8
```


```
32
```


```
pts
```

[messages.getLongPollHistory](https://dev.vk.com/ru/method/messages.getLongPollHistory)

```
messages.getLongPollHistory
```


```
64
```


```
8
```


```
$extra
```

[Структура событий](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%A1%D1%82%D1%80%D1%83%D0%BA%D1%82%D1%83%D1%80%D0%B0%20%D1%81%D0%BE%D0%B1%D1%8B%D1%82%D0%B8%D0%B9)

```
128
```


```
random_id
```


```
random_id
```

[messages.send](https://dev.vk.com/ru/method/messages.send)

```
messages.send
```


```
version
```


```
group_id
```


```
1000000000
```

Для первого запроса в рамках сессии значения для параметров server, key и ts необходимо получить методом [messages.getLongPollServer](https://dev.vk.com/ru/method/messages.getLongPollServer). В последующих запросах используйте те же server и key и новое значение ts, которое придет вам в ответе от Long Poll сервера.

```
server
```


```
key
```


```
ts
```


```
messages.getLongPollServer
```


```
server
```


```
key
```


```
ts
```

Когда произойдет новое событие или истечет время ожидания, сервер вернет вам ответ в формате JSON:

```
{ "ts": 1820350874, "updates": [ [4, 1619489, 561, 123456, 1464958914, "hello", { "title": "... " }, { "attach1_type": "photo", "attach1": "123456_414233177", "attach2_type": "audio", "attach2": "123456_456239018" }] ] }
```

JSON-объект в ответе содержит два поля:

```
ts
```


```
integer
```


```
updates
```


```
array
```


```
updates
```


```
wait
```


```
updates
```

[Структура событий](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%A1%D1%82%D1%80%D1%83%D0%BA%D1%82%D1%83%D1%80%D0%B0%20%D1%81%D0%BE%D0%B1%D1%8B%D1%82%D0%B8%D0%B9)
После получения любого ответа для продолжения связи нужно отправить запрос с новым ts, полученным в последнем ответе.

```
ts
```

В ответ на запрос сервер может вернуть одну из ошибок:

```
{ "failed": 1, "ts": "{new_ts}" } { "failed": 2 } { "failed": 3 } { "failed": 4, "min_version": 0, "max_version": 1 }
```


```
"failed":1
```


```
ts
```


```
"failed":2
```


```
key
```

[messages.getLongPollServer](https://dev.vk.com/ru/method/messages.getLongPollServer)

```
messages.getLongPollServer
```


```
"failed":3
```


```
key
```


```
ts
```

[messages.getLongPollServer](https://dev.vk.com/ru/method/messages.getLongPollServer)

```
messages.getLongPollServer
```


```
"failed":4
```


```
version
```

Обратите внимание, объекты в сообщении об ошибке могут содержать поля, не описанные в документации. Их необходимо игнорировать и не пытаться обработать.

Каждый элемент массива updates — это массив, содержащий код события в первом элементе и некоторый набор полей с дополнительной информацией в зависимости от типа события.

```
updates
```

Обратите внимание — ответ может содержать события, коды которых не представлены в этой таблице. Их нужно игнорировать и не пытаться обработать.

```
1
```


```
$message_id
```


```
integer
```


```
$flags
```


```
integer
```

[extra_fields](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%94%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%BF%D0%BE%D0%BB%D1%8F%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9)

```
extra_fields
```

[флагов сообщения](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%A4%D0%BB%D0%B0%D0%B3%D0%B8%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9)

```
FLAGS:=$flags
```


```
2
```


```
$message_id
```


```
integer
```


```
$mask
```


```
integer
```

[extra_fields](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%94%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%BF%D0%BE%D0%BB%D1%8F%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9)

```
extra_fields
```

[флагов сообщения](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%A4%D0%BB%D0%B0%D0%B3%D0%B8%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9)

```
FLAGS=$mask
```


```
3
```


```
$message_id
```


```
integer
```


```
$mask
```


```
integer
```


```
extra_fields*
```

[флагов сообщения](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%A4%D0%BB%D0%B0%D0%B3%D0%B8%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9)

```
FLAGS&=~$mask
```


```
4
```


```
$message_id
```


```
integer
```


```
$flags
```


```
integer
```


```
$minor_id
```


```
integer
```

[extra_fields](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%94%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%BF%D0%BE%D0%BB%D1%8F%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9)

```
extra_fields
```


```
5
```


```
$message_id
```


```
integer
```


```
$mask
```


```
integer
```


```
$peer_id
```


```
integer
```


```
$timestamp
```


```
integer
```


```
$new_text
```


```
string
```


```
$attachments
```


```
array
```


```
0
```


```
6
```


```
$peer_id
```


```
integer
```


```
$local_id
```


```
integer
```


```
$peer_id
```


```
$local_id
```


```
7
```


```
$peer_id
```


```
integer
```


```
$local_id
```


```
integer
```


```
$peer_id
```


```
$local_id
```


```
8
```


```
-$user_id
```


```
integer
```


```
$extra
```


```
integer
```


```
$timestamp
```


```
integer
```


```
$user_id
```


```
$extra
```


```
0
```


```
mode
```


```
64
```


```
extra
```

[Платформы](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%9F%D0%BB%D0%B0%D1%82%D1%84%D0%BE%D1%80%D0%BC%D1%8B)

```
$timestamp
```


```
$user_id
```


```
9
```


```
-$user_id
```


```
integer
```


```
$flags
```


```
integer
```


```
$timestamp
```


```
integer
```


```
$user_id
```


```
$flags
```


```
0
```


```
1
```


```
$timestamp
```


```
$user_id
```


```
10
```


```
$peer_id
```


```
integer
```


```
$mask
```


```
integer
```

[флагов диалога](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%A4%D0%BB%D0%B0%D0%B3%D0%B8%20%D0%B4%D0%B8%D0%B0%D0%BB%D0%BE%D0%B3%D0%BE%D0%B2)

```
$peer_id
```


```
PEER_FLAGS &= ~$flags
```


```
11
```


```
$peer_id
```


```
integer
```


```
$flags
```


```
integer
```

[флагов диалога](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%A4%D0%BB%D0%B0%D0%B3%D0%B8%20%D0%B4%D0%B8%D0%B0%D0%BB%D0%BE%D0%B3%D0%BE%D0%B2)

```
$peer_id
```


```
PEER_FLAGS:= $flags
```


```
12
```


```
$peer_id
```


```
integer
```


```
$mask
```


```
integer
```

[флагов диалога](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%A4%D0%BB%D0%B0%D0%B3%D0%B8%20%D0%B4%D0%B8%D0%B0%D0%BB%D0%BE%D0%B3%D0%BE%D0%B2)

```
$peer_id
```


```
PEER_FLAGS= $flags
```


```
13
```


```
$peer_id
```


```
integer
```


```
$local_id
```

```
integer
```


```
$peer_id
```


```
$local_id
```


```
14
```


```
$peer_id
```


```
integer
```


```
$local_id
```


```
integer
```


```
$peer_id
```


```
$local_id
```


```
20
```


```
$peer_id
```


```
integer
```


```
$major_id
```


```
integer
```


```
$major_id
```


```
$peer_id
```


```
21
```


```
$peer_id
```


```
integer
```


```
$minor_id
```


```
integer
```


```
$minor_id
```


```
$peer_id
```


```
51
```


```
$chat_id
```


```
integer
```


```
$self
```


```
integer
```


```
$chat_id
```


```
$self
```


```
1
```


```
0
```


```
52
```


```
$type_id
```


```
integer
```


```
$peer_id
```


```
integer
```


```
$info
```


```
integer
```


```
$peer_id
```


```
$type_id
```


```
$info
```

[Дополнительные поля чатов](https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%94%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%BF%D0%BE%D0%BB%D1%8F%20%D1%87%D0%B0%D1%82%D0%BE%D0%B2)

```
61
```


```
$user_id
```


```
integer
```


```
$flags
```


```
integer
```


```
$user_id
```


```
$flags = 1
```


```
62
```


```
$user_id
```


```
integer
```


```
$chat_id
```


```
integer
```


```
$user_id
```


```
$chat_id
```


```
63
```


```
$user_ids
```


```
integer
```


```
$peer_id
```


```
integer
```


```
$total_count
```


```
integer
```


```
$ts
```


```
integer
```


```
$user_ids
```


```
$peer_id
```


```
$total_count
```


```
$ts
```


```
64
```


```
$user_ids
```


```
integer
```


```
$peer_id
```


```
integer
```


```
$total_count
```


```
integer
```


```
$ts
```


```
integer
```


```
$user_ids
```


```
$peer_id
```


```
70
```


```
$user_id
```


```
integer
```


```
$call_id
```


```
integer
```


```
$user_id
```


```
$call_id
```


```
80
```


```
$count
```


```
integer
```


```
0
```


```
$count
```


```
114
```


```
$peer_id
```


```
integer
```


```
$sound
```


```
integer
```


```
$disabled_until
```


```
integer
```


```
$peer_id
```


```
$sound
```


```
1
```


```
0
```


```
$disabled_until
```


```
-1
```


```
0
```

### https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%94%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%BF%D0%BE%D0%BB%D1%8F%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9Дополнительные поля сообщений
```
$peer_id
```


```
integer
```


```
2000000000
```


```
1000000000
```


```
version
```


```
0
```


```
$timestamp
```


```
integer
```


```
$text
```


```
string
```


```
[$attachments]
```


```
array
```


```
mode
```


```
2
```


```
[$random_id]
```


```
integer
```


```
random_id
```

[messages.send](https://dev.vk.com/ru/method/messages.send)

```
messages.send
```


```
0
```

Если сообщение по каким-то причинам недоступно, extra_fields могут не возвращаться либо может возвращаться только $peer_id. В событиях 1, 2 и 3 в большинстве случаев возвращается только $peer_id. В событии 4 в большинстве случаев возвращается полный набор полей. Если сообщение было восстановлено, в событиях 1 и 3 (снятие флага SPAM или DELETED) в большинстве случаев вернётся полный набор полей.

```
extra_fields
```


```
$peer_id
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
$peer_id
```


```
4
```


```
1
```


```
3
```


```
SPAM
```


```
DELETED
```

### https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%94%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%BF%D0%BE%D0%BB%D1%8F%20%D1%87%D0%B0%D1%82%D0%BE%D0%B2Дополнительные поля чатов
```
$type_id
```


```
integer
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


```
8
```


```
$info
```


```
integer
```


```
type_id
```


```
type_id
```


```
$info = "0"
```


```
type_id
```


```
$info = "admin_id"
```


```
type_id
```


```
$info = "conversation_message_id"
```


```
type_id
```


```
$info = "user_id"
```

## https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%A4%D0%BB%D0%B0%D0%B3%D0%B8%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9Флаги сообщений
Каждое сообщение имеет флаг — значение, полученное суммированием любых из следующих параметров.

```
+1
```


```
UNREAD
```


```
+2
```


```
OUTBOX
```


```
+4
```


```
REPLIED
```


```
+8
```


```
IMPORTANT
```


```
+16
```


```
CHAT
```


```
+32
```


```
FRIENDS
```


```
+64
```


```
SPAM
```


```
+128
```


```
DELЕTЕD
```


```
+256
```


```
FIXED
```


```
+512
```


```
MEDIA
```


```
+65536
```


```
HIDDEN
```


```
+64
```


```
DELETE_FOR_ALL
```


```
+64
```


```
NOT_DELIVERED
```

Значения, не представленные в таблице, следует игнорировать и не пытаться каким-либо образом обработать.

## https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%A4%D0%BB%D0%B0%D0%B3%D0%B8%20%D0%B4%D0%B8%D0%B0%D0%BB%D0%BE%D0%B3%D0%BE%D0%B2Флаги диалогов
Каждый диалог имеет флаги — значение, полученное суммированием любых из следующих параметров. Флаги назначаются только для диалогов сообщества.

```
+1
```


```
IMPORTANT
```


```
+2
```


```
UNANSWERED
```

Значения, не представленные в таблице, следует игнорировать и не пытаться каким-либо образом обработать.

## https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%92%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%B8%20%D0%B4%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5%20%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D0%B5Вложения и дополнительные данные
Если mode содержит флаг 2, то вместе с текстом и заголовком сообщения может быть передан JSON-объект, содержащий медиавложения. Ниже приведено описание полей этого объекта.

```
mode
```


```
2
```

Обратите внимание — в некоторых случаях ответ может содержать дополнительные вложения, названия которых не представлены в этой таблице. Их необходимо игнорировать и не пытаться каким-либо образом обработать.

```
attach{$i}_type
```


```
photo
```


```
video
```


```
audio
```


```
doc
```


```
wall
```


```
sticker
```


```
link
```


```
money
```


```
$i
```


```
attach{$i}
```


```
{$owner_id}_
```


```
{$item_id}
```


```
$i
```


```
fwd
```


```
{$user_id}_{$msg_id}{$user_id}_{$msg2_id}
```


```
geo
```


```
{$geo_id}
```


```
geo_provider
```


```
$geo_provider_id}
```


```
attach{$i}_
```


```
product_id
```


```
{product_id}
```


```
attach{$i}_photo
```


```
$owner_id}_
```


```
{$item_id}
```


```
attach{$i}_type
```


```
link
```


```
attach{$i}_title
```


```
{$title}
```


```
attach{$i}_type
```


```
link
```


```
attach{$i}_desc
```


```
{$description}
```


```
attach{$i}_type
```


```
link
```


```
attach{$i}_url
```


```
{$url}
```


```
attach{$i}_type
```


```
link
```


```
emoji
```


```
1
```


```
from_admin
```


```
{$user_id}
```


```
source_act
```


```
chat_create
```


```
chat_title_update
```


```
chat_photo_update
```


```
chat_invite_user
```


```
chat_kick_user
```


```
chat_create
```


```
chat_title_update
```


```
chat_photo_update
```


```
chat_invite_user
```


```
chat_kick_user
```


```
source_mid
```


```
{$user_id}
```


```
source_act
```


```
chat_invite_user
```


```
source_act
```


```
chat_kick_user
```

Дополнительные данные о сообщении приходят в виде отдельного объекта, который содержит поля:

```
title
```


```
{$subject}
```


```
from
```


```
{$user_id}
```

## https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%9F%D0%BB%D0%B0%D1%82%D1%84%D0%BE%D1%80%D0%BC%D1%8BПлатформы
Если в mode содержится флаг 64, то в событиях с кодом 8 (друг стал онлайн) в третьем поле будут возвращаться дополнительные данные $extra, из которых можно получить идентификатор платформы $platform_id = $extra & 0xFF ( = $extra % 256), с которой пользователь вышел в сеть. Этот идентификатор можно использовать, например, для отображения того, с мобильного ли устройства был обновлен статус онлайн (идентификаторы 1 - 5).

```
mode
```


```
64
```


```
8
```


```
$extra
```


```
$platform_id = $extra & 0xFF ( = $extra % 256)
```


```
1
```


```
5
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

## https://dev.vk.com/ru/api/user-long-poll/getting-started#%D0%9F%D1%80%D0%B8%D0%BC%D0%B5%D1%80%D1%8B%20%D1%81%D0%BE%D0%B1%D1%8B%D1%82%D0%B8%D0%B9Примеры событий
Было удалено сообщение с message_id=123456 в диалоге с пользователем user_id=54321:

```
message_id
```


```
123456
```


```
user_id
```


```
54321
```


```
[2,123456,128,54321]
```

Сообщение message_id=654321 в групповом чате peer_id=2000000202 (chat_id=202) стало прочитанным:

```
message_id
```


```
654321
```


```
peer_id
```


```
2000000202
```


```
chat_id
```


```
202
```


```
[3,654321,1,2000000202]
```

В 1464950873 по Unixtime пришло сообщение message_id=654321 с текстом "Hello" (без вложений) от пользователя 123456 в групповом чате peer_id=2000000202:

```
message_id
```


```
654321
```


```
peer_id
```


```
2000000202
```


```
[4,654321,8193,2000000202,1464950873,"Hello.",{"from":"123456 "}]
```

Новое сообщение от user_id=123456 с текстом "hello" и двумя вложениями (фото и аудио):

```
user_id
```


```
123456
```


```
[4,2105994,561,123456,1496404246,"hello",{"title":" ... "},{"attach1_type":"photo","attach1":"123456_417336473","attach2_type":"audio","attach2":"123456_456239018"}]
```

[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

