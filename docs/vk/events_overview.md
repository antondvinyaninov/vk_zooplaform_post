Title: Интеграция | Сообщества и пользователи | События пользователей и сообществ | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/api/events/overview

---


# События в реальном времени
API ВКонтакте позволяет работать с событиями пользователя или сообщества в реальном времени. Это нужно для отображения нового сообщения, для моментальной реакции на комментарий в сообществе, для создания [чат-ботов](https://dev.vk.com/ru/api/bots/overview) или для анализа текстовых данных.

## https://dev.vk.com/ru/api/events/overview#%D0%94%D0%BB%D1%8F%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D1%81%D1%82%D0%B2Для сообществ
Для работы с событиями сообществ мы предлагаем два разных подхода:
- •[Callback API](https://dev.vk.com/ru/api/callback/getting-started) — в этом случае мы будем отправлять уведомление на ваш сервер о каждом новом событии.
- •[Bots Long Poll API](https://dev.vk.com/ru/api/bots-long-poll/getting-started) — очередь из событий хранится на стороне ВКонтакте, вы получаете их, используя Long Polling запросы.
[Callback API](https://dev.vk.com/ru/api/callback/getting-started)
[Bots Long Poll API](https://dev.vk.com/ru/api/bots-long-poll/getting-started)
Callback API и Bots Long Poll API поддерживают события, связанные с сообщениями сообщества, активностью пользователей на стене и в остальных разделах вашей группы или публичной страницы. Полный список событий в сообществах вы можете найти [на этой странице](https://dev.vk.com/ru/api/community-events/json-schema).

## https://dev.vk.com/ru/api/events/overview#%D0%94%D0%BB%D1%8F%20%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D0%B5%D0%B9Для пользователей
[User Long Poll API](https://dev.vk.com/ru/api/user-long-poll/getting-started) нужен для работы с событиями пользователя в вашем приложении. Очередь из событий хранится на стороне ВКонтакте, вы получаете их, используя Long Polling запросы.
User Long Poll API поддерживает все события, связанные с личными сообщениями (получение, редактирование, удаление), изменение статуса онлайн или счётчиков в меню.
[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

# Технические работы
Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

