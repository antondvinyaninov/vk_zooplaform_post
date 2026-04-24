Title: Интеграция | Сообщества и пользователи | Сообщение "Deprecated version" | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/api/deprecated-version-message

---


# Сообщение "Deprecated version"
1 декабря 2024 года мы отключили использование старых версий API, поэтому рекомендуем перейти на актуальную версию [5.199](https://dev.vk.com/ru/reference/version/5.199). Если этого не сделать, приложения и чат-боты, добавленные в сообщество, могут начать работать неправильно.
ВКонтакте отправляет это сообщение в ответе вашему серверу, когда обнаруживает, что сервер ожидает устаревшую версию API.

```
{ "group_id": 12345, "type": "wall_post_new", "event_id": "bcac94ca00d2f069fb6badb4cf0441dac637dcfc", "v": "5.80", "object": { "warning": "You are using a deprecated API version. It will be disabled soon. Read more here: https://dev.vk.com/api/deprecated-version-message" } }
```

Обратите внимание! Начиная с версии [5.101](https://vk.com/away.php?to=https%3A%2F%2Fdev.vk.com%2Fru%2Freference%2Fversion%2F5.103), у события message_new меняется формат: вместо { object: message } будет приходить { object: { message, client_info } }. Учтите это при переходе на актуальную версию.

```
message_new
```


```
{ object: message }
```


```
{ object: { message, client_info } }
```


## https://dev.vk.com/ru/api/deprecated-version-message#Callback%20APICallback API
О том, как изменить версию API, читайте в [инструкции](https://dev.vk.com/ru/api/callback/getting-started#%D0%A7%D0%B5%D1%80%D0%B5%D0%B7%20API%20%D0%92%D0%9A%D0%BE%D0%BD%D1%82%D0%B0%D0%BA%D1%82%D0%B5).
Если у вас нет доступа к сообществу, вы можете изменить версию API, отправив в ответ на уведомление о любом событии сообщение version 5.199. Вместо 5.199 можно указать другую актуальную версию.

```
version 5.199
```


## https://dev.vk.com/ru/api/deprecated-version-message#LongPoll%20APILongPoll API
Чтобы изменить версию API, используйте метод [groups.setLongPollSettings](https://dev.vk.com/ru/method/groups.setLongPollSettings). Укажите нужную версию API в параметре api_version.

```
groups.setLongPollSettings
```


```
api_version
```


## https://dev.vk.com/ru/api/deprecated-version-message#%D0%9C%D0%B0%D1%82%D0%B5%D1%80%D0%B8%D0%B0%D0%BB%D1%8B%20%D0%BF%D0%BE%20%D1%82%D0%B5%D0%BC%D0%B5Материалы по теме
- •
[Версии API ВКонтакте](https://dev.vk.com/ru/reference/versions)

- •
[Callback API](https://dev.vk.com/ru/api/callback/getting-started)

- •
[Bots Long Poll API](https://dev.vk.com/ru/api/bots-long-poll/getting-started)

[Версии API ВКонтакте](https://dev.vk.com/ru/reference/versions)
[Callback API](https://dev.vk.com/ru/api/callback/getting-started)
[Bots Long Poll API](https://dev.vk.com/ru/api/bots-long-poll/getting-started)
[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

# Технические работы
Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

