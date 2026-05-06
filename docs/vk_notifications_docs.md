Title: Мини-приложения | Продвижение | Социальные механики | Уведомления | Разовые уведомления | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/single#%D0%A0%D0%B0%D0%B7%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%83%D0%B2%D0%B5%D0%B4%D0%BE%D0%BC%D0%BB%D0%B5%D0%BD%D0%B8%D0%B9

---

Мини-приложение может отправлять разовые уведомления пользователю при возникновении какого-либо события, например акции, конкурса среди игроков, выдачи бонусов или достижения цели. Такие уведомления ещё называют ситуативными.
Для отправки разовых уведомлений используется API ВКонтакте.

## https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/single#%D0%9E%D0%B3%D1%80%D0%B0%D0%BD%D0%B8%D1%87%D0%B5%D0%BD%D0%B8%D1%8FОграничения
- •Пользователю можно отправить 1 уведомление в час и не более 3 уведомлений в день.
- •Одному пользователю нельзя отправить подряд 2 уведомления с одинаковым текстом.
- •Отправлять уведомления может мини-приложение, которое прошло [модерацию](https://dev.vk.com/ru/mini-apps/settings/moderation). При этом размещение в каталоге необязательно.
- •Пользователь может получать уведомления только после [выдачи разрешения](https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/single#%D0%A0%D0%B0%D0%B7%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%83%D0%B2%D0%B5%D0%B4%D0%BE%D0%BC%D0%BB%D0%B5%D0%BD%D0%B8%D0%B9).
[модерацию](https://dev.vk.com/ru/mini-apps/settings/moderation)
[выдачи разрешения](https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/single#%D0%A0%D0%B0%D0%B7%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%83%D0%B2%D0%B5%D0%B4%D0%BE%D0%BC%D0%BB%D0%B5%D0%BD%D0%B8%D0%B9)

## https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/single#%D0%A0%D0%B0%D0%B7%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%83%D0%B2%D0%B5%D0%B4%D0%BE%D0%BC%D0%BB%D0%B5%D0%BD%D0%B8%D0%B9Разрешение уведомлений
Отправлять уведомления пользователям из мини-приложения можно только после получения разрешения от пользователя.

### https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/single#%D0%97%D0%B0%D0%BF%D1%80%D0%BE%D1%81%20%D1%80%D0%B0%D0%B7%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D1%8FЗапрос разрешения
Чтобы запросить разрешение пользователя на отправку уведомлений от мини-приложения, вызовите событие [VKWebAppAllowNotifications](https://dev.vk.com/ru/bridge/VKWebAppAllowNotifications).

```
VKWebAppAllowNotifications
```

Информация о статусе подключения уведомлений также передаётся при запуске приложения в [параметре запуска](https://dev.vk.com/ru/mini-apps/development/launch-params) vk_are_notifications_enabled. Используйте этот параметр, чтобы определить, нужно ли запрашивать разрешение у пользователя.

```
vk_are_notifications_enabled
```

У пользователя должны быть включены уведомления от игр и приложений в настройках ВКонтакте. В противном случае пользователь не получит уведомления, даже если выдал разрешение в вашем приложении.

### https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/single#%D0%9F%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B0%20%D1%80%D0%B0%D0%B7%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D1%8FПроверка разрешения
Пользователь может управлять уведомлениями из настроек ВКонтакте, поэтому важно проверять возможность отправки, даже если он не отключал или не включал уведомления напрямую из вашего мини-приложения. Для этого используйте метод [apps.isNotificationsAllowed](https://dev.vk.com/ru/method/apps.isNotificationsAllowed) с [сервисным ключом доступа](https://dev.vk.com/ru/mini-apps/settings/development/keys#%D0%A1%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D0%BD%D1%8B%D0%B9%20%D0%BA%D0%BB%D1%8E%D1%87) мини-приложения.

```
apps.isNotificationsAllowed
```

Важно! Метод с [сервисным ключом доступа](https://dev.vk.com/ru/mini-apps/settings/development/keys#%D0%A1%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D0%BD%D1%8B%D0%B9%20%D0%BA%D0%BB%D1%8E%D1%87) можно вызывать только на сервере.
Пример вызова метода [apps.isNotificationsAllowed](https://dev.vk.com/ru/method/apps.isNotificationsAllowed) с помощью POST-запроса.

```
apps.isNotificationsAllowed
```


```
POST https://api.vk.ru/method/apps.isNotificationsAllowed?user_id=ИДЕНТИФИКАТОР_ПОЛЬЗОВАТЕЛЯ&apps_id=ИДЕНТИФИКАТОР_МИНИ_ПРИЛОЖЕНИЯ&access_token=КЛЮЧ_ДОСТУПА&v=ВЕРСИЯ_API HTTP/1.1
```

## https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/single#%D0%9A%D0%B0%D0%BA%20%D0%BE%D1%82%D0%BF%D1%80%D0%B0%D0%B2%D0%B8%D1%82%D1%8C%20%D1%83%D0%B2%D0%B5%D0%B4%D0%BE%D0%BC%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5Как отправить уведомление
Используйте метод [notifications.sendMessage](https://dev.vk.com/ru/method/notifications.sendMessage) с [сервисным ключом доступа](https://dev.vk.com/ru/mini-apps/settings/development/keys#%D0%A1%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D0%BD%D1%8B%D0%B9%20%D0%BA%D0%BB%D1%8E%D1%87) мини-приложения.

```
notifications.sendMessage
```

Если в вашем мини-приложении реализована навигация по хешу, вы можете перенаправлять пользователя прямо из уведомления при помощи параметра fragment. Он вернётся вместе с параметрами запуска после символа #.

```
fragment
```


```
#
```

Важно! Метод с [сервисным ключом доступа](https://dev.vk.com/ru/mini-apps/settings/development/keys#%D0%A1%D0%B5%D1%80%D0%B2%D0%B8%D1%81%D0%BD%D1%8B%D0%B9%20%D0%BA%D0%BB%D1%8E%D1%87) можно вызывать только на сервере.
Пример вызова метода [notifications.sendMessage](https://dev.vk.com/ru/method/notifications.sendMessage) с помощью POST-запроса.

```
notifications.sendMessage
```


```
POST https://api.vk.ru/method/notifications.sendMessage?user_ids=ИДЕНТИФИКАТОРЫ_ПОЛЬЗОВАТЕЛЕЙ&message=ТЕКСТ_УВЕДОМЛЕНИЯ&fragment=СОДЕРЖИМОЕ_ХЕША&access_token=КЛЮЧ_ДОСТУПА&v=ВЕРСИЯ_API HTTP/1.1
```

## https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/single#%D0%9E%D1%82%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%83%D0%B2%D0%B5%D0%B4%D0%BE%D0%BC%D0%BB%D0%B5%D0%BD%D0%B8%D0%B9Отключение уведомлений
Чтобы отключить отправку уведомлений от мини-приложения пользователю, вызовите событие [VKWebAppDenyNotifications](https://dev.vk.com/ru/bridge/VKWebAppDenyNotifications).

```
VKWebAppDenyNotifications
```

## https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/single#%D0%9C%D0%B0%D1%82%D0%B5%D1%80%D0%B8%D0%B0%D0%BB%D1%8B%20%D0%BF%D0%BE%20%D1%82%D0%B5%D0%BC%D0%B5Материалы по теме
- •[Уведомления неактивным пользователям](https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/automatic)
- •[Уведомления всем пользователям](https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/mass)
- •[Мини-приложения — Панель управления | Уведомления](https://dev.vk.com/ru/mini-apps/settings/social-mechanics/notifications)
- •[Событие VKWebAppAllowNotifications](https://dev.vk.com/ru/bridge/VKWebAppAllowNotifications)
- •[Метод notifications.sendMessage](https://dev.vk.com/ru/method/notifications.sendMessage)
[Уведомления неактивным пользователям](https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/automatic)
[Уведомления всем пользователям](https://dev.vk.com/ru/mini-apps/promotion/social-mechanics/notifications/mass)
[Мини-приложения — Панель управления | Уведомления](https://dev.vk.com/ru/mini-apps/settings/social-mechanics/notifications)
[Событие VKWebAppAllowNotifications](https://dev.vk.com/ru/bridge/VKWebAppAllowNotifications)
[Метод notifications.sendMessage](https://dev.vk.com/ru/method/notifications.sendMessage)
[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

