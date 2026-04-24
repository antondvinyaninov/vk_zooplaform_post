Title: Интеграция | Сообщества и пользователи | События в сообществах | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/api/community-events/json-schema

---

Событие представляет собой JSON, имеющий следующую структуру:

```
{ "type": "<тип события>", "object": "<объект, инициировавший событие>", "group_id": "<идентификатор сообщества, в котором произошло событие>" }
```

Например:

```
{ "type": "group_join", "object": { "user_id": 1, "join_type": "approved" }, "group_id": 1 }
```

Структура объекта в поле object зависит от типа уведомления. Ниже перечислены все типы уведомлений и соответствующие им объекты, которые поддерживаются в [Callback API](https://dev.vk.com/ru/api/callback/getting-started) и [Bots Long Poll API](https://dev.vk.com/ru/api/bots-long-poll/getting-started).

```
object
```

### https://dev.vk.com/ru/api/community-events/json-schema#message_newmessage_new
```
message_new
```

Входящее сообщение.
Формат поля object:

```
object
```

- •Для версий API ниже 5.103: [личное сообщение](https://dev.vk.com/ru/reference/objects/message).
- •Для версий API 5.103 и выше: объект, содержащий следующие поля:
[личное сообщение](https://dev.vk.com/ru/reference/objects/message)

```
message
```

[Message](https://dev.vk.com/ru/reference/objects/message)

```
client_info
```

[ClientInfo](https://dev.vk.com/ru/api/bots/getting-started#%D0%98%D0%BD%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BE%20%D0%B4%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%BD%D1%8B%D1%85%20%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8E%20%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D1%8F%D1%85)

### https://dev.vk.com/ru/api/community-events/json-schema#message_replymessage_reply
```
message_reply
```

Новое исходящее сообщение.
Формат поля object: [личное сообщение](https://dev.vk.com/ru/reference/objects/message).

```
object
```

### https://dev.vk.com/ru/api/community-events/json-schema#message_editmessage_edit
```
message_edit
```

Редактирование сообщения.
Формат поля object: [личное сообщение](https://dev.vk.com/ru/reference/objects/message).

```
object
```

Событие о редактировании отправляется только для сообщений бота.

### https://dev.vk.com/ru/api/community-events/json-schema#message_allowmessage_allow
```
message_allow
```

Подписка на сообщения от сообщества. Пользователь нажал кнопку Разрешить сообщения или написал первое сообщение сообществу.
Формат поля object:

```
object
```


```
user_id
```


```
integer
```


```
key
```


```
string
```

[messages.allowMessagesFromGroup](https://dev.vk.com/ru/method/messages.allowMessagesFromGroup)

```
messages.allowMessagesFromGroup
```

### https://dev.vk.com/ru/api/community-events/json-schema#message_denymessage_deny
```
message_deny
```

Новый запрет сообщений от сообщества. Пользователь нажал на кнопку Запретить сообщения.
Формат поля object:

```
object
```


```
user_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#message_typing_statemessage_typing_state
```
message_typing_state
```

Статус набора текста. Пользователь печатает сообщение в диалоге или загружает аудиосообщение.
Формат поля object:

```
object
```


```
state
```


```
string
```


```
from_id
```


```
integer
```


```
to_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#message_readmessage_read
```
message_read
```

Информация о том, что сообщение прочитано.
Формат поля object:

```
object
```


```
from_id
```


```
integer
```


```
peer_id
```


```
integer
```


```
read_message_id
```


```
integer
```


```
conversation_message_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#message_eventmessage_event
```
message_event
```

Действие с сообщением. Пользователь нажал на [Callback-кнопку](https://dev.vk.com/ru/api/bots/development/keyboard#Callback-%D0%BA%D0%BD%D0%BE%D0%BF%D0%BA%D0%B8)
Формат поля object:

```
object
```


```
user_id
```


```
integer
```


```
peer_id
```


```
integer
```


```
event_id
```


```
string
```


```
payload
```


```
any
```


```
conversation_message_id
```


```
integer?
```

### https://dev.vk.com/ru/api/community-events/json-schema#photo_newphoto_new
```
photo_new
```

Добавление фотографии.
Формат поля object: [объект фотографии](https://dev.vk.com/ru/reference/objects/photo).

```
object
```

### https://dev.vk.com/ru/api/community-events/json-schema#photo_comment_newphoto_comment_new
```
photo_comment_new
```

Добавление комментария к фотографии.
Формат поля object: [объект комментария на стене](https://dev.vk.com/ru/reference/objects/comment) с дополнительными полями:

```
object
```


```
photo_id
```


```
integer
```


```
photo_owner_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#photo_comment_editphoto_comment_edit
```
photo_comment_edit
```

Редактирование комментария к фотографии.
Формат поля object: [объект комментария на стене](https://dev.vk.com/ru/reference/objects/comment) с дополнительными полями:

```
object
```


```
photo_id
```


```
integer
```


```
photo_owner_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#photo_comment_restorephoto_comment_restore
```
photo_comment_restore
```

Восстановление комментария к фотографии.
Формат поля object: [объект комментария на стене](https://dev.vk.com/ru/reference/objects/comment) с дополнительными полями:

```
object
```


```
photo_id
```


```
integer
```


```
photo_owner_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#photo_comment_deletephoto_comment_delete
```
photo_comment_delete
```

Удаление комментария к фотографии.
Формат поля object: [объект комментария на стене](https://dev.vk.com/ru/reference/objects/comment) с дополнительными полями:

```
object
```


```
photo_id
```


```
integer
```


```
photo_owner_id
```


```
integer
```

```
audio_new
```

Добавление аудио.
Формат поля object: [объект аудиозаписи](https://dev.vk.com/ru/reference/objects/audio).

```
object
```

### https://dev.vk.com/ru/api/community-events/json-schema#video_newvideo_new
```
video_new
```

Добавление видео.
Формат поля object: [объект видеозаписи](https://dev.vk.com/ru/reference/objects/video).

```
object
```

### https://dev.vk.com/ru/api/community-events/json-schema#video_comment_newvideo_comment_new
```
video_comment_new
```

Комментарий к видео.

### https://dev.vk.com/ru/api/community-events/json-schema#video_comment_editvideo_comment_edit
```
video_comment_edit
```

Редактирование комментария к видео.

### https://dev.vk.com/ru/api/community-events/json-schema#video_comment_restorevideo_comment_restore
```
video_comment_restore
```

Восстановление комментария к видео.
Формат поля object: [объект комментария на стене](https://dev.vk.com/ru/reference/objects/comment) с дополнительными полями:

```
object
```


```
video_id
```


```
integer
```


```
video_owner_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#video_comment_deletevideo_comment_delete
```
video_comment_delete
```

Удаление комментария к видео
Формат поля object:

```
object
```


```
owner_id
```


```
integer
```


```
id
```


```
integer
```


```
user_id
```


```
integer
```


```
deleter_id
```


```
integer
```


```
video_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#wall_post_newwall_post_new
```
wall_post_new
```

Запись на стене.

### https://dev.vk.com/ru/api/community-events/json-schema#wall_repostwall_repost
```
wall_repost
```

Репост записи из сообщества.
Формат поля object: [объект записи на стене](https://dev.vk.com/ru/reference/objects/post) с дополнительными полями:

```
object
```


```
postponed_id
```


```
integer
```

Для записей, размещённых от имени пользователя, from_id > 0.

```
from_id > 0
```

### https://dev.vk.com/ru/api/community-events/json-schema#wall_schedule_post_newwall_schedule_post_new
```
wall_schedule_post_new
```

Добавление отложенной записи.
Формат поля object:

```
object
```


```
schedule_time
```


```
integer
```

[Unix Timestamp](https://vk.com/away.php?to=https%3A%2F%2Fwww.unixtimestamp.com)

```
id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#wall_schedule_post_deletewall_schedule_post_delete
```
wall_schedule_post_delete
```

Удаление отложенной записи.
Формат поля object:

```
object
```


```
schedule_time
```


```
integer
```

[Unix Timestamp](https://vk.com/away.php?to=https%3A%2F%2Fwww.unixtimestamp.com)

```
id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#wall_reply_newwall_reply_new
```
wall_reply_new
```

Добавление комментария на стене.

### https://dev.vk.com/ru/api/community-events/json-schema#wall_reply_editwall_reply_edit
```
wall_reply_edit
```

Редактирование комментария на стене.

### https://dev.vk.com/ru/api/community-events/json-schema#wall_reply_restorewall_reply_restore
```
wall_reply_restore
```

Восстановление комментария на стене.
Формат поля object: [объект комментария на стене](https://dev.vk.com/ru/reference/objects/comment) с дополнительными полями:

```
object
```


```
post_id
```


```
integer
```


```
post_owner_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#wall_reply_deletewall_reply_delete
```
wall_reply_delete
```

Удаление комментария на стене.
Формат поля object:

```
object
```


```
owner_id
```


```
integer
```


```
id
```


```
integer
```


```
deleter_id
```


```
integer
```


```
post_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#like_addlike_add
```
like_add
```

Событие о новой отметке Мне нравится.
Формат поля object:

```
object
```


```
liker_id
```


```
integer
```


```
object_type
```


```
string
```


```
object_owner_id
```


```
integer
```


```
object_id
```


```
integer
```


```
thread_reply_id
```


```
integer
```


```
post_id
```


```
integer
```


#### https://dev.vk.com/ru/api/community-events/json-schema#%D0%92%D0%BE%D0%B7%D0%BC%D0%BE%D0%B6%D0%BD%D1%8B%D0%B5%20%D0%B7%D0%BD%D0%B0%D1%87%D0%B5%D0%BD%D0%B8%D1%8F%20object_type:Возможные значения object_type:

```
object_type
```

- •post — запись на стене.
- •video — видеозапись.
- •photo — фотография.
- •comment — комментарий.
- •topic_comment — комментарий в обсуждении.
- •photo_comment — комментарий к фотографии.
- •video_comment — комментарий к видеозаписи.
- •market — товар.
- •market_comment — комментарий к товару.

```
post
```


```
video
```


```
photo
```


```
comment
```


```
topic_comment
```


```
photo_comment
```


```
video_comment
```


```
market
```


```
market_comment
```

### https://dev.vk.com/ru/api/community-events/json-schema#like_removelike_remove
```
like_remove
```

Событие о снятии отметки Мне нравится.
Формат поля object:

```
object
```


```
liker_id
```


```
integer
```


```
object_type
```


```
string
```


```
object_owner_id
```


```
integer
```


```
object_id
```


```
integer
```


```
thread_reply_id
```


```
integer
```


```
post_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#board_post_newboard_post_new
```
board_post_new
```

Создание комментария в обсуждении.

### https://dev.vk.com/ru/api/community-events/json-schema#board_post_editboard_post_edit
```
board_post_edit
```

Редактирование комментария.

### https://dev.vk.com/ru/api/community-events/json-schema#board_post_restoreboard_post_restore
```
board_post_restore
```

Восстановление комментария.
Формат поля object: [объект комментария в обсуждении](https://dev.vk.com/ru/reference/objects/comment-topic) с дополнительными полями:

```
object
```


```
topic_id
```


```
integer
```


```
topic_owner_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#board_post_deleteboard_post_delete
```
board_post_delete
```

Удаление комментария в обсуждении.
Формат поля object:

```
object
```


```
topic_id
```


```
integer
```


```
topic_owner_id
```


```
integer
```


```
id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#market_comment_newmarket_comment_new
```
market_comment_new
```

Новый комментарий к товару.

### https://dev.vk.com/ru/api/community-events/json-schema#market_comment_editmarket_comment_edit
```
market_comment_edit
```

Редактирование комментария к товару.

### https://dev.vk.com/ru/api/community-events/json-schema#market_comment_restoremarket_comment_restore
```
market_comment_restore
```

Восстановление комментария к товару.
Формат поля object: [объект комментария на стене](https://dev.vk.com/ru/reference/objects/comment) с дополнительными полями:

```
object
```


```
market_owner_id
```


```
integer
```


```
item_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#market_comment_deletemarket_comment_delete
```
market_comment_delete
```

Удаление комментария к товару.
Формат поля object:

```
object
```


```
owner_id
```


```
integer
```


```
id
```


```
integer
```


```
user_id
```


```
integer
```


```
deleter_id
```


```
integer
```


```
item_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#market_order_newmarket_order_new
```
market_order_new
```

Новый заказ. Чтобы включить событие, в настройках сообщества необходимо включить расширенные товары.
Формат поля object: [заказ](https://dev.vk.com/ru/reference/objects/market-order).

```
object
```

### https://dev.vk.com/ru/api/community-events/json-schema#market_order_editmarket_order_edit
```
market_order_edit
```

Редактирование заказа. Чтобы включить событие, в настройках сообщества необходимо включить расширенные товары.
Формат поля object: [заказ](https://dev.vk.com/ru/reference/objects/market-order).

```
object
```

### https://dev.vk.com/ru/api/community-events/json-schema#group_leavegroup_leave
```
group_leave
```

Удаление участника из сообщества.
Формат поля object:

```
object
```


```
user_id
```


```
integer
```


```
self
```


```
0
```


```
1
```

### https://dev.vk.com/ru/api/community-events/json-schema#group_joingroup_join
```
group_join
```

Добавление участника или заявки на вступление в сообщество.
Формат поля object

```
object
```


```
user_id
```


```
integer
```


```
join_type
```


```
string
```


#### https://dev.vk.com/ru/api/community-events/json-schema#%D0%92%D0%BE%D0%B7%D0%BC%D0%BE%D0%B6%D0%BD%D1%8B%D0%B5%20%D0%B7%D0%BD%D0%B0%D1%87%D0%B5%D0%BD%D0%B8%D1%8F%20join_type:Возможные значения join_type:

```
join_type
```

- •join — пользователь вступил в группу или мероприятие (подписался на публичную страницу).
- •unsure — для мероприятий: пользователь выбрал вариант «Возможно, пойду».
- •accepted — пользователь принял приглашение в группу или на мероприятие.
- •approved — заявка на вступление в группу/мероприятие была одобрена руководителем сообщества.
- •request — пользователь подал заявку на вступление в сообщество.

```
join
```


```
unsure
```


```
accepted
```


```
approved
```


```
request
```

### https://dev.vk.com/ru/api/community-events/json-schema#user_blockuser_block
```
user_block
```

Добавление пользователя в чёрный список.
Формат поля object

```
object
```


```
admin_id
```


```
integer
```


```
user_id
```


```
integer
```


```
unblock_date
```


```
integer
```


```
reason
```


```
integer
```


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
comment
```


```
string
```

### https://dev.vk.com/ru/api/community-events/json-schema#user_unblockuser_unblock
```
user_unblock
```

Удаление пользователя из чёрного списка.
Формат поля object

```
object
```


```
admin_id
```


```
integer
```


```
user_id
```


```
integer
```


```
by_end_date
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#poll_vote_newpoll_vote_new
```
poll_vote_new
```

Добавление голоса в публичном опросе.
Формат поля object

```
object
```


```
owner_id
```


```
integer
```


```
poll_id
```


```
integer
```


```
option_id
```


```
integer
```


```
user_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#group_officers_editgroup_officers_edit
```
group_officers_edit
```

Редактирование списка руководителей.
Формат поля object:

```
object
```


```
admin_id
```


```
integer
```


```
user_id
```


```
integer
```


```
level_old
```


```
integer
```


```
level_new
```


```
integer
```

Поля level_old и level_new могут принимать значения:

```
level_old
```


```
level_new
```

- •0 — нет полномочий.
- •1 — модератор.
- •2 — редактор.
- •3 — администратор.

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
group_change_settings
```

Изменение настроек сообщества.
Формат поля object:

```
object
```

- •user_id — идентификатор пользователя, который внёс изменения.
- •changes — описание внесённых изменений. Объект, который содержит следующие поля:

•{FIELD} — название секции или раздела, который был изменён. {FIELD} может принимать значения:

•title — название.
•description — описание.
•access — тип группы.
•screen_name — короткий адрес.
•public_category — категория публичной страницы.
•public_subcategory — подкатегория публичной страницы.
•age_limits — возрастные ограничения.
•website — веб-сайт.
•enable_{SECTION} — изменение настроек доступа к разделу. {SECTION} может принимать значения: status_default, audio, photo, video, market.


•old_value — старое значение.
•new_value — новое значение.


- •{FIELD} — название секции или раздела, который был изменён. {FIELD} может принимать значения:

•title — название.
•description — описание.
•access — тип группы.
•screen_name — короткий адрес.
•public_category — категория публичной страницы.
•public_subcategory — подкатегория публичной страницы.
•age_limits — возрастные ограничения.
•website — веб-сайт.
•enable_{SECTION} — изменение настроек доступа к разделу. {SECTION} может принимать значения: status_default, audio, photo, video, market.


- •title — название.
- •description — описание.
- •access — тип группы.
- •screen_name — короткий адрес.
- •public_category — категория публичной страницы.
- •public_subcategory — подкатегория публичной страницы.
- •age_limits — возрастные ограничения.
- •website — веб-сайт.
- •enable_{SECTION} — изменение настроек доступа к разделу. {SECTION} может принимать значения: status_default, audio, photo, video, market.
- •old_value — старое значение.
- •new_value — новое значение.

```
user_id
```


```
changes
```

- •{FIELD} — название секции или раздела, который был изменён. {FIELD} может принимать значения:

•title — название.
•description — описание.
•access — тип группы.
•screen_name — короткий адрес.
•public_category — категория публичной страницы.
•public_subcategory — подкатегория публичной страницы.
•age_limits — возрастные ограничения.
•website — веб-сайт.
•enable_{SECTION} — изменение настроек доступа к разделу. {SECTION} может принимать значения: status_default, audio, photo, video, market.


- •title — название.
- •description — описание.
- •access — тип группы.
- •screen_name — короткий адрес.
- •public_category — категория публичной страницы.
- •public_subcategory — подкатегория публичной страницы.
- •age_limits — возрастные ограничения.
- •website — веб-сайт.
- •enable_{SECTION} — изменение настроек доступа к разделу. {SECTION} может принимать значения: status_default, audio, photo, video, market.
- •old_value — старое значение.
- •new_value — новое значение.

```
{FIELD}
```


```
{FIELD}
```

- •title — название.
- •description — описание.
- •access — тип группы.

### https://dev.vk.com/ru/api/community-events/json-schema#group_change_settingsgroup_change_settings
- •screen_name — короткий адрес.
- •public_category — категория публичной страницы.
- •public_subcategory — подкатегория публичной страницы.
- •age_limits — возрастные ограничения.
- •website — веб-сайт.
- •enable_{SECTION} — изменение настроек доступа к разделу. {SECTION} может принимать значения: status_default, audio, photo, video, market.

```
title
```


```
description
```


```
access
```


```
screen_name
```


```
public_category
```


```
public_subcategory
```


```
age_limits
```


```
website
```


```
enable_{SECTION}
```


```
{SECTION}
```


```
status_default
```


```
audio
```


```
photo
```


```
video
```


```
market
```


```
old_value
```


```
new_value
```

### https://dev.vk.com/ru/api/community-events/json-schema#group_change_photogroup_change_photo
```
group_change_photo
```

Изменение главного фото.
Формат поля object:

```
object
```

- •user_id — идентификатор пользователя, который внёс изменения.
- •photo — объект, описывающий [фотографию](https://dev.vk.com/ru/reference/objects/photo).

```
user_id
```


```
photo
```

[фотографию](https://dev.vk.com/ru/reference/objects/photo)

### https://dev.vk.com/ru/api/community-events/json-schema#vkpay_transactionvkpay_transaction
```
vkpay_transaction
```

Платёж через VK Pay.
Формат поля object

```
object
```

- •from_id — идентификатор пользователя-отправителя перевода.
- •amount — сумма перевода в тысячных рубля.
- •description — комментарий к переводу.
- •date — время отправки перевода в Unixtime.

```
from_id
```


```
amount
```


```
description
```


```
date
```


```
Unixtime
```

### https://dev.vk.com/ru/api/community-events/json-schema#app_payloadapp_payload
```
app_payload
```

Событие из VK Mini Apps добавленного в сообщество.
Формат поля object:
- •user_id — идентификатор пользователя, по действию которого в приложении отправлено событие.
- •app_id — идентификатор приложения, из которого было отправлено событие.
- •payload — переданные полезные данные.
- •group_id — идентификатор сообщества, в которое отправлено уведомление.

```
user_id
```


```
app_id
```


```
payload
```


```
group_id
```

### https://dev.vk.com/ru/api/community-events/json-schema#donut_subscription_createdonut_subscription_create
```
donut_subscription_create
```

Создание подписки [VK Донат](https://dev.vk.com/ru/api/donut/getting-started).
Формат поля object:

```
object
```

- •amount (integer) — сумма в рублях.
- •amount_without_fee (float) — сумма без комиссии (в рублях).
- •user_id (integer) — идентификатор пользователя.

```
amount
```


```
integer
```


```
amount_without_fee
```


```
float
```


```
user_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#donut_subscription_prolongeddonut_subscription_prolonged
```
donut_subscription_prolonged
```

Продление подписки.
Формат поля object:

```
object
```

- •amount (integer) — сумма в рублях.
- •amount_without_fee (float) — сумма без комиссии (в рублях).
- •user_id (integer) — идентификатор пользователя.

```
amount
```


```
integer
```


```
amount_without_fee
```


```
float
```


```
user_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#donut_subscription_expireddonut_subscription_expired
```
donut_subscription_expired
```

Подписка истекла.
Формат поля object: user_id (integer) — идентификатор пользователя.

```
object
```


```
user_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#donut_subscription_cancelleddonut_subscription_cancelled
```
donut_subscription_cancelled
```

Отмена подписки.
Формат поля object: user_id (integer) — идентификатор пользователя.

```
object
```


```
user_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#donut_subscription_price_changeddonut_subscription_price_changed
```
donut_subscription_price_changed
```

Изменение стоимости подписки.
Формат поля object:

```
object
```

- •amount_old (integer) — старая цена в рублях.
- •amount_new (integer) — новая цена в рублях.
- •amount_diff (float) — сумма доплаты в рублях.
- •amount_diff_without_fee (float) — сумма доплаты без комиссии (в рублях).
- •user_id (integer) — идентификатор пользователя.

```
amount_old
```


```
integer
```


```
amount_new
```


```
integer
```


```
amount_diff
```


```
float
```


```
amount_diff_without_fee
```


```
float
```


```
user_id
```


```
integer
```

### https://dev.vk.com/ru/api/community-events/json-schema#donut_money_withdrawdonut_money_withdraw
```
donut_money_withdraw
```

Вывод денег.
Формат поля object:

```
object
```

- •amount (float) — сумма в рублях.
- •amount_without_fee (float) — сумма без комиссии (в рублях).

```
amount
```


```
float
```


```
amount_without_fee
```


```
float
```

### https://dev.vk.com/ru/api/community-events/json-schema#donut_money_withdraw_errordonut_money_withdraw_error
```
donut_money_withdraw_error
```

Ошибка вывода денег.
Формат поля object: reason (string) — причина ошибки.

```
object
```


```
reason
```


```
string
```

[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

