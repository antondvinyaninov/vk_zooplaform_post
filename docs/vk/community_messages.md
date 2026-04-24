Title: Интеграция | Сообщества и пользователи | Сообщения сообществ | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/api/community-messages/getting-started

---

Сообщения сообществ — сервис для прямого диалога между пользователем и сообществом ВКонтакте.
- •
Вашим клиентам не придётся искать форму обратной связи, проходить регистрацию, отвечать через email — никаких лишних действий.

- •
Вместе с сообщением вы получаете все необходимые данные о его авторе, можете автоматически обрабатывать типовые заявки и мгновенно отвечать на сообщения с помощью бота.

Вашим клиентам не придётся искать форму обратной связи, проходить регистрацию, отвечать через email — никаких лишних действий.
Вместе с сообщением вы получаете все необходимые данные о его авторе, можете автоматически обрабатывать типовые заявки и мгновенно отвечать на сообщения с помощью бота.
Сообщения сообществ работают в полной и мобильной версиях ВКонтакте, а также во всех официальных приложениях: с вашей компанией можно связаться на любой платформе. Подробнее о сообщениях сообществ — в статье [Полезные настройки для сообщений в сообществе](https://vk.com/away.php?to=https%3A%2F%2Fvk.com%2F%40business-poleznye-nastroiki-dlya-soobschenii-v-soobschestve).

## https://dev.vk.com/ru/api/community-messages/getting-started#API%20%D0%B4%D0%BB%D1%8F%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D1%81%D1%82%D0%B2API для сообщений сообществ
В этом руководстве рассказывается о том, как использовать API для работы с сообщениями сообществ.

## https://dev.vk.com/ru/api/community-messages/getting-started#%D0%9A%D0%BB%D1%8E%D1%87%20%D0%B4%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%B0Ключ доступа
Для работы с API от имени сообщества необходимо получить специальный ключ доступа. Вы можете сделать это двумя способами — в интерфейсе управления сообществом или программно, с помощью специального запроса к нашему серверу.
Ключ доступа — это строка, включающая латинские буквы и цифры. Ее необходимо передавать в параметре access_token, обращаясь к методам API от имени сообщества.

```
access_token
```

## https://dev.vk.com/ru/api/community-messages/getting-started#%D0%9F%D0%BE%D0%BB%D1%83%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%BA%D0%BB%D1%8E%D1%87%D0%B0%20%D0%B4%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%B0%20%D0%B2%20%D0%BD%D0%B0%D1%81%D1%82%D1%80%D0%BE%D0%B9%D0%BA%D0%B0%D1%85%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D1%81%D1%82%D0%B2%D0%B0Получение ключа доступа в настройках сообщества
1. 1.
Откройте vk.com и перейдите в сообщество, в котором вы являетесь администратором.

2. 2.
В меню справа выберите Управление и затем Дополнительно → Работа с API.

3. 3.
Нажмите Создать ключ. Отметьте необходимые права доступа и подтвердите свой выбор.

Откройте vk.com и перейдите в сообщество, в котором вы являетесь администратором.
В меню справа выберите Управление и затем Дополнительно → Работа с API.
Нажмите Создать ключ. Отметьте необходимые права доступа и подтвердите свой выбор.
Вы можете создать несколько ключей с разными правами доступа. Ключи нельзя размещать публично — узнав его, третье лицо может обращаться к API ВКонтакте от имени вашего сообщества. Если ключ был скомпрометирован, необходимо удалить его из списка — после этого он станет недействителен.

## https://dev.vk.com/ru/api/community-messages/getting-started#%D0%9F%D0%BE%D0%BB%D1%83%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%BA%D0%BB%D1%8E%D1%87%D0%B0%20%D0%B4%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%B0%20%D0%BD%D0%B0%20oauth.vk.ruПолучение ключа доступа на oauth.vk.ru
Мы предлагаем два способа авторизации, основанных на протоколе OAuth 2.0. Используйте этот подход, если необходимо работать со многими сообществами пользователя, например, при разработке мобильного приложения.
Для работы с API с серверной стороны используйте [Authorization Code Flow](https://dev.vk.com/ru/api/access-token/authcode-flow-community).
Для работы с API со стороны клиента используйте [Implicit Flow](https://dev.vk.com/ru/api/access-token/implicit-flow-community).

В API сообщений сообществ используются те же методы, что и для работы с личными сообщениями пользователя. Если раньше вы уже имели дело с сообщениями в API ВКонтакте, схема работы будет вам знакома. Стоит, однако, учитывать некоторые особенности:
- •необходимо проставлять статус прочитанности сообщения при общении с клиентом;
- •если ответ получен пользователем, его необходимо помечать как прочитанный;
- •в беседах сообществ доступны специальные метки: Важные, Неотвеченные, Непрочитанные.
Чтобы вы могли отправлять пользователю сообщения от имени сообщества, пользователь должен разрешить их получение. Если пользователь написал сообщение сообществу первым, это приравнивается к согласию на получение ответных сообщений (без ограничений по времени, если пользователь не запретил сообщения вручную). Чтобы запросить у пользователя разрешение на отправку сообщений, используйте:
- •Событие [VKWebAppAllowMessagesFromGroup](https://dev.vk.com/ru/bridge/VKWebAppAllowMessagesFromGroup) библиотеки [VK Bridge](https://dev.vk.com/ru/bridge/overview).
- •Метод [messages.allowMessagesFromGroup](https://dev.vk.com/ru/method/messages.allowMessagesFromGroup) в Standalone-приложениях.
- •Виджет [Разрешить писать сообществу](https://dev.vk.com/ru/widgets/allow-messages-from-community) на внешнем сайте.
[VKWebAppAllowMessagesFromGroup](https://dev.vk.com/ru/bridge/VKWebAppAllowMessagesFromGroup)

```
VKWebAppAllowMessagesFromGroup
```

[VK Bridge](https://dev.vk.com/ru/bridge/overview)
[messages.allowMessagesFromGroup](https://dev.vk.com/ru/method/messages.allowMessagesFromGroup)

```
messages.allowMessagesFromGroup
```

[Разрешить писать сообществу](https://dev.vk.com/ru/widgets/allow-messages-from-community)
В [Callback API](https://dev.vk.com/ru/api/callback/getting-started) и [Bots Longpoll API](https://dev.vk.com/ru/api/bots-long-poll/getting-started) события message_allow и message_deny помогут отслеживать факт разрешения и запрета сообщений от сообщества.

```
message_allow
```


```
message_deny
```

Внимание! Через API нельзя получить список всех пользователей, разрешивших сообщения сообществу. Необходимо хранить и синхронизировать этот список на своей стороне.

- •[Long Poll сервер](https://dev.vk.com/ru/api/user-long-poll/getting-started) — синхронизация обновлений;
- •[Callback API](https://dev.vk.com/ru/api/callback/getting-started) — мгновенные оповещения о новых сообщениях и других действиях пользователей в сообществе.
- •[messages.getConversations](https://dev.vk.com/ru/method/messages.getConversations) — метод для получения списка бесед;
- •[messages.markAsRead](https://dev.vk.com/ru/method/messages.markAsRead) — метод для присвоения сообщению метки Прочитано;
- •[messages.markAsImportantConversation](https://dev.vk.com/ru/method/messages.markAsImportantConversation), [messages.markAsAnsweredConversation](https://dev.vk.com/ru/method/messages.markAsAnsweredConversation) — методы для присвоения меток беседам;
- •[messages.send](https://dev.vk.com/ru/method/messages.send) — метод для отправки нового сообщения;
- •[messages.delete](https://dev.vk.com/ru/method/messages.delete), [messages.deleteConversation](https://dev.vk.com/ru/method/messages.deleteConversation), [messages.restore](https://dev.vk.com/ru/method/messages.restore) — методы для удаления и восстановления сообщений и бесед;
- •[messages.search](https://dev.vk.com/ru/method/messages.search) — метод для поиска по сообщениям;
- •[messages.allowMessagesFromGroup](https://dev.vk.com/ru/method/messages.allowMessagesFromGroup), [messages.denyMessagesFromGroup](https://dev.vk.com/ru/method/messages.denyMessagesFromGroup) — методы для подписки на сообщения сообщества и запрета на получение сообщений;
- •[docs.getWallUploadServer](https://dev.vk.com/ru/method/docs.getWallUploadServer) — метод для загрузки документа на стену.
- •[groups.getCallbackConfirmationCode](https://dev.vk.com/ru/method/groups.getCallbackConfirmationCode), [groups.getCallbackServerSettings](https://dev.vk.com/ru/method/groups.getCallbackServerSettings), [groups.getCallbackSettings](https://dev.vk.com/ru/method/groups.getCallbackSettings), [groups.setCallbackSettings](https://dev.vk.com/ru/method/groups.setCallbackSettings) — методы для работы с настройками Callback API.
[Long Poll сервер](https://dev.vk.com/ru/api/user-long-poll/getting-started)
[Callback API](https://dev.vk.com/ru/api/callback/getting-started)
[messages.getConversations](https://dev.vk.com/ru/method/messages.getConversations)

```
messages.getConversations
```

[messages.markAsRead](https://dev.vk.com/ru/method/messages.markAsRead)

```
messages.markAsRead
```

[messages.markAsImportantConversation](https://dev.vk.com/ru/method/messages.markAsImportantConversation)

```
messages.markAsImportantConversation
```

[messages.markAsAnsweredConversation](https://dev.vk.com/ru/method/messages.markAsAnsweredConversation)

```
messages.markAsAnsweredConversation
```

[messages.send](https://dev.vk.com/ru/method/messages.send)

```
messages.send
```

[messages.delete](https://dev.vk.com/ru/method/messages.delete)

```
messages.delete
```

[messages.deleteConversation](https://dev.vk.com/ru/method/messages.deleteConversation)

```
messages.deleteConversation
```

[messages.restore](https://dev.vk.com/ru/method/messages.restore)

```
messages.restore
```

[messages.search](https://dev.vk.com/ru/method/messages.search)

```
messages.search
```

[messages.allowMessagesFromGroup](https://dev.vk.com/ru/method/messages.allowMessagesFromGroup)

```
messages.allowMessagesFromGroup
```

[messages.denyMessagesFromGroup](https://dev.vk.com/ru/method/messages.denyMessagesFromGroup)

```
messages.denyMessagesFromGroup
```

[docs.getWallUploadServer](https://dev.vk.com/ru/method/docs.getWallUploadServer)

```
docs.getWallUploadServer
```

[groups.getCallbackConfirmationCode](https://dev.vk.com/ru/method/groups.getCallbackConfirmationCode)

```
groups.getCallbackConfirmationCode
```

[groups.getCallbackServerSettings](https://dev.vk.com/ru/method/groups.getCallbackServerSettings)

```
groups.getCallbackServerSettings
```

[groups.getCallbackSettings](https://dev.vk.com/ru/method/groups.getCallbackSettings)

## https://dev.vk.com/ru/api/community-messages/getting-started#%D0%94%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%BD%D1%8B%D0%B5%20%D0%B8%D0%BD%D1%81%D1%82%D1%80%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D1%8B%20%D0%B8%20%D0%BC%D0%B5%D1%82%D0%BE%D0%B4%D1%8BДоступные инструменты и методы
```
groups.getCallbackSettings
```

[groups.setCallbackSettings](https://dev.vk.com/ru/method/groups.setCallbackSettings)

```
groups.setCallbackSettings
```

## https://dev.vk.com/ru/api/community-messages/getting-started#%D0%9F%D0%BE%D0%BB%D1%83%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%81%D0%BF%D0%B8%D1%81%D0%BA%D0%B0%20%D0%B1%D0%B5%D1%81%D0%B5%D0%B4Получение списка бесед
Метод [messages.getConversations](https://dev.vk.com/ru/method/messages.getConversations).

```
messages.getConversations
```

Параметр start_message_id используется для защиты от смещения из-за новых сообщений при подгрузке старых бесед. При первом вызове не передавайте start_message_id, запомните значение id у сообщения в первой беседе и используйте его в качестве start_message_id в последующих вызовах при подгрузке бесед.

```
start_message_id
```


```
start_message_id
```


```
id
```


```
start_message_id
```

## https://dev.vk.com/ru/api/community-messages/getting-started#%D0%9F%D0%BE%D0%BB%D1%83%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%BD%D0%BE%D0%B2%D1%8B%D1%85%20%D0%B1%D0%B5%D1%81%D0%B5%D0%B4Получение новых бесед
Метод [messages.getConversations](https://dev.vk.com/ru/method/messages.getConversations).

```
messages.getConversations
```

Передавайте значения параметров:
- •start_message_id — значение id сообщения в первой беседе.
- •count — максимальное количество новых бесед.
- •offset — отрицательное значение.

```
start_message_id
```


```
id
```


```
count
```


```
offset
```

## https://dev.vk.com/ru/api/community-messages/getting-started#%D0%9F%D0%BE%D0%BB%D1%83%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%B8%D1%81%D1%82%D0%BE%D1%80%D0%B8%D0%B8%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9%20%D0%B2%20%D0%B1%D0%B5%D1%81%D0%B5%D0%B4%D0%B5Получение истории сообщений в беседе
Метод [messages.getHistory](https://dev.vk.com/ru/method/messages.getHistory).

```
messages.getHistory
```

Чтобы получить историю конкретной беседы, используйте параметр peer_id. Параметр start_message_id используется для защиты от смещения из-за новых сообщений при подгрузке истории. При первом вызове не передавайте start_message_id, запомните значение id первого сообщения из ответа и используйте его в качестве start_message_id в последующих вызовах.

```
peer_id
```


```
start_message_id
```


```
start_message_id
```


```
id
```


```
start_message_id
```

## https://dev.vk.com/ru/api/community-messages/getting-started#%D0%9F%D0%BE%D0%BB%D1%83%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%BD%D0%BE%D0%B2%D1%8B%D1%85%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9%20%D1%81%20%D0%BF%D0%BE%D0%BC%D0%BE%D1%89%D1%8C%D1%8E%20Callback%20APIПолучение новых сообщений с помощью Callback API
[Callback API](https://dev.vk.com/ru/api/callback/getting-started) позволяет мгновенно получать информацию о новых сообщениях в адрес сообщества.
Для работы с Callback API вам потребуется серверный скрипт для обработки уведомлений. Настройте оповещения, следуя [документации](https://dev.vk.com/ru/api/callback/getting-started), среди типов событий выберите Получение нового сообщения (message_new).

```
message_new
```

ВКонтакте будет отправлять на ваш сервер оповещение о каждом новом сообщении с [объектом личного сообщения](https://dev.vk.com/ru/reference/objects/message) в формате:

```
{ "type": "message_new", "object": "..." }
```

В уведомлении содержится исчерпывающая информация о сообщении — вы можете сразу ответить на него, используя метод [messages.send](https://dev.vk.com/ru/method/messages.send).

```
messages.send
```

## https://dev.vk.com/ru/api/community-messages/getting-started#%D0%9F%D0%B5%D1%80%D0%B5%D0%B4%D0%B0%D1%87%D0%B0%20%D0%BF%D1%80%D0%BE%D0%B8%D0%B7%D0%B2%D0%BE%D0%BB%D1%8C%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%BF%D0%B0%D1%80%D0%B0%D0%BC%D0%B5%D1%82%D1%80%D0%B0%20%D1%81%20%D0%BF%D0%BE%D0%BC%D0%BE%D1%89%D1%8C%D1%8E%20%D1%81%D1%81%D1%8B%D0%BB%D0%BA%D0%B8%20vk.meПередача произвольного параметра с помощью ссылки vk.me
vk.me — это сервис коротких URL, который перенаправляет пользователей в указанную беседу. Ссылка имеет формат [http://vk.me/{group_name}](https://vk.com/away.php?to=http%3A%2F%2Fvk.me%2F%257Bgroup_name%257D), где group_name — идентификатор сообщества. К примеру, vk.me/apiclub.

```
group_name
```

Вы можете не только создать красивую ссылку на беседу с сообществом, но и передать в такой ссылке произвольные параметры ref и ref_source, которые вернутся в объекте сообщения в [событии](https://dev.vk.com/ru/api/community-events/json-schema) message_new [Callback API](https://dev.vk.com/ru/api/callback/getting-started) или [Bots Long Poll API](https://dev.vk.com/ru/api/bots-long-poll/getting-started), в случае если пользователь начнёт или продолжит беседу по ссылке вида vk.me.

```
ref
```


```
ref_source
```


```
message_new
```

Это полезно для отслеживания эффективности ссылок, размещенных в разных каналах, или привязки пользователя к сеансу или аккаунту во внешнем приложении. В зависимости от переданного параметра можно варьировать ответы бота в сообществе.
Ссылка vk.me с дополнительными параметрами выглядит следующим образом:

```
vk.me/{group_name}?ref={ref}&ref_source={ref_source}
```

Также сработает ссылка вида:

```
vk.com/write-{group_id}?ref={ref}&ref_source={ref_source}
```

Чтобы отправить изображение в сообщении, используйте параметр attachments в методе [messages.send](https://dev.vk.com/ru/method/messages.send). Вы можете использовать изображение, которое уже есть на сайте ВКонтакте, либо [загрузить новое](https://dev.vk.com/ru/api/upload/photo-in-message).

```
attachments
```


```
messages.send
```

Для загрузки фотографий и документов в сообщения сообщества используйте, соответственно, методы [photos.getMessagesUploadServer](https://dev.vk.com/ru/method/photos.getMessagesUploadServer) и [docs.getMessagesUploadServer](https://dev.vk.com/ru/method/docs.getMessagesUploadServer). Это позволит загружать вложения для неограниченного числа собеседников.

```
photos.getMessagesUploadServer
```


```
docs.getMessagesUploadServer
```

[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

