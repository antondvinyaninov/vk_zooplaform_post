Title: Мини-приложения | Разработка | Параметры запуска | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/mini-apps/development/launch-params

---

При старте игры или мини-приложения ВКонтакте передаёт им дополнительные параметры, содержащие данные о пользователе и источнике запуска. Значения передаются как URL-параметры на адрес, указанный в настройках игры или мини-приложения.
- •[URL запуска игры](https://dev.vk.com/ru/games/settings/general/placement#URL)
- •[URL запуска мини-приложения](https://dev.vk.com/ru/mini-apps/settings/general/placement#URL)
[URL запуска игры](https://dev.vk.com/ru/games/settings/general/placement#URL)
[URL запуска мини-приложения](https://dev.vk.com/ru/mini-apps/settings/general/placement#URL)
Чтобы получить параметры запуска в коде игры на стороне пользователя, воспользуйтесь одним из способов:
- •Извлеките значение свойства href объекта window.location.
- •Вызовите событие [VKWebAppGetLaunchParams](https://dev.vk.com/ru/bridge/VKWebAppGetLaunchParams).

```
href
```


```
window.location
```

[VKWebAppGetLaunchParams](https://dev.vk.com/ru/bridge/VKWebAppGetLaunchParams)

```
VKWebAppGetLaunchParams
```

## https://dev.vk.com/ru/mini-apps/development/launch-params#%D0%9F%D0%BE%D0%B4%D0%BF%D0%B8%D1%81%D1%8C%20%D0%BF%D0%B0%D1%80%D0%B0%D0%BC%D0%B5%D1%82%D1%80%D0%BE%D0%B2Подпись параметров
Чтобы защититься от подмены значений возможной утечки данных, используйте подпись параметров. Подробности — в разделе [Подпись параметров запуска](https://dev.vk.com/ru/mini-apps/development/launch-params-sign).

## https://dev.vk.com/ru/mini-apps/development/launch-params#%D0%9F%D0%B0%D1%80%D0%B0%D0%BC%D0%B5%D1%82%D1%80%D1%8BПараметры
Некоторые параметры передаются только для игр или только для мини-приложений. Это указано в таблице.

```
sign
```


```
string
```

[Подпись параметров запуска](https://dev.vk.com/ru/mini-apps/development/launch-params-sign)

```
vk_access_token_settings
```


```
string
```


```
friends,stories,wall
```

[Права доступа](https://dev.vk.com/ru/reference/access-rights)

```
vk_app_id
```


```
integer
```

[Где найти ID игры](https://dev.vk.com/ru/games/settings/overview#%D0%93%D0%B4%D0%B5%20%D0%BD%D0%B0%D0%B9%D1%82%D0%B8%20ID%20%D0%B8%D0%B3%D1%80%D1%8B?)
[Где найти ID мини-приложения](https://dev.vk.com/ru/mini-apps/settings/overview#%D0%93%D0%B4%D0%B5%20%D0%BD%D0%B0%D0%B9%D1%82%D0%B8%20ID%20%D0%BC%D0%B8%D0%BD%D0%B8-%D0%BF%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F?)

```
vk_are_notifications_enabled
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
vk_chat_id
```


```
string
```


```
vk_group_id
```


```
integer
```


```
vk.com/app6909581_-166562603
```


```
vk_has_profile_button
```


```
integer
```


```
vk_is_app_user
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
vk_is_favorite
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
vk_is_play_machine
```


```
integer
```


```
1
```

[Play Machine](https://dev.vk.com/ru/games/faq#%D0%9F%D0%BE%D0%B4%D0%B4%D0%B5%D1%80%D0%B6%D0%B8%D0%B2%D0%B0%D1%8E%D1%82%D1%81%D1%8F%20%D0%BB%D0%B8%20Flash-%D0%B8%D0%B3%D1%80%D1%8B?)

```
0
```


```
vk_is_recommended
```


```
integer
```

[рекомендовал](https://dev.vk.com/ru/mini-apps/promotion/user-recommendation)

```
vk_user_id
```


```
0
```


```
1
```


```
vk_is_widescreen
```


```
integer
```


```
1
```

[широкоформатном режиме](https://dev.vk.com/ru/games/settings/general/display#%D0%A8%D0%B8%D1%80%D0%BE%D0%BA%D0%BE%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%82%D0%BD%D1%8B%D0%B9%20%D1%80%D0%B5%D0%B6%D0%B8%D0%BC)

```
0
```

[Web-игр](https://dev.vk.com/ru/games/getting-started#Direct%20Games%20%D0%B8%20Web-%D0%B8%D0%B3%D1%80%D1%8B)

```
vk_language
```


```
string
```


```
ru
```


```
uk
```


```
ua
```


```
en
```


```
be
```


```
kz
```


```
pt
```


```
es
```


```
vk_platform
```


```
string
```


```
desktop_web
```


```
mobile_android
```


```
mobile_ipad
```


```
mobile_iphone
```


```
mobile_web
```


```
desktop_app_messenger
```


```
desktop_web_messenger
```


```
mobile_android_messenger
```


```
mobile_iphone_messenger
```


```
android_external
```


```
iphone_external
```


```
ipad_external
```


```
mvk_external
```


```
web_external
```


```
vk_profile_id
```


```
integer
```


```
vk_ref
```


```
string
```

[Список значений для игр](https://dev.vk.com/ru/games/development/parameters/vk_ref)
[Список значений для мини-приложений](https://dev.vk.com/ru/mini-apps/development/launch-params/vk_ref)

```
vk_request_key
```


```
string
```

[запроса о помощи](https://dev.vk.com/ru/games/promotion/game-mechanics/requests)
[приглашения](https://dev.vk.com/ru/games/promotion/game-mechanics/invites)

```
requestKey
```

[VKWebAppShowRequestBox](https://dev.vk.com/ru/bridge/VKWebAppShowRequestBox)

```
VKWebAppShowRequestBox
```

[VKWebAppShowInviteBox](https://dev.vk.com/ru/bridge/VKWebAppShowInviteBox)

```
VKWebAppShowInviteBox
```

[VK Bridge](https://dev.vk.com/ru/bridge/overview)

```
vk_testing_group_id
```


```
integer
```


```
vk_ts
```


```
integer
```


```
sign
```


```
vk_user_id
```


```
integer
```


```
vk_viewer_group_role
```


```
string
```


```
admin
```


```
editor
```


```
member
```


```
moder
```


```
none
```


```
vk.com/app6909581_-166562603
```

## https://dev.vk.com/ru/mini-apps/development/launch-params#%D0%9F%D0%B5%D1%80%D0%B5%D0%B4%D0%B0%D1%87%D0%B0%20%D0%BF%D1%80%D0%BE%D0%B8%D0%B7%D0%B2%D0%BE%D0%BB%D1%8C%D0%BD%D1%8B%D1%85%20%D0%BF%D0%B0%D1%80%D0%B0%D0%BC%D0%B5%D1%82%D1%80%D0%BE%D0%B2Передача произвольных параметров
При необходимости вы можете передавать произвольные параметры в игру или мини-приложение.

#### https://dev.vk.com/ru/mini-apps/development/launch-params#%D0%97%D0%B0%D0%BF%D1%83%D1%81%D0%BA%20%D0%BF%D0%BE%20%D0%BF%D1%80%D1%8F%D0%BC%D0%BE%D0%B9%20%D1%81%D1%81%D1%8B%D0%BB%D0%BA%D0%B5Запуск по прямой ссылке
При запуске игры по прямой ссылке укажите параметры после символа # в адресной строке, например:

```
#
```


```
https://vk.com/app1234567#param1=12345
```

Символы после # будут переданы игре в URL-параметре hash. Этот параметр всегда идёт последним среди остальных передаваемых параметров. Все символы после него являются символами, которые были указаны после # в URL игры.

```
#
```


```
hash
```


```
#
```

Получить параметры можно и с помощью свойства hash объекта window.location. Для отслеживания изменений этого значения в игре используйте события [VKWebAppLocationChanged](https://dev.vk.com/ru/bridge/VKWebAppLocationChanged) и [VKWebAppChangeFragment](https://dev.vk.com/ru/bridge/VKWebAppChangeFragment) библиотеки [VK Bridge](https://dev.vk.com/ru/bridge/overview).

```
hash
```


```
window.location
```


```
VKWebAppLocationChanged
```


```
VKWebAppChangeFragment
```

Использование знака вопроса (?) для передачи параметров при запуске по прямой ссылке не работает.

```
?
```


#### https://dev.vk.com/ru/mini-apps/development/launch-params#%D0%9F%D0%B0%D1%80%D0%B0%D0%BC%D0%B5%D1%82%D1%80%D1%8B%20%D0%B7%D0%B0%D0%BF%D1%83%D1%81%D0%BA%D0%B0%20%D0%B2%20%D0%BD%D0%B0%D1%81%D1%82%D1%80%D0%BE%D0%B9%D0%BA%D0%B0%D1%85%20%D0%B8%D0%B3%D1%80%D1%8BПараметры запуска в настройках игры
Чтобы указать параметры запуска в настройках игры, добавьте в URL знак вопроса и параметры, например:

```
https://my-game.example.com/start-page?param1=12345
```

Получить эти параметры вы можете так же, как и обычные параметры веб-страниц, например с помощью свойства window.location.search или с помощью события [VKWebAppGetLaunchParams](https://dev.vk.com/ru/bridge/VKWebAppGetLaunchParams).

```
window.location.search
```


```
VKWebAppGetLaunchParams
```

Использовать символы # в URL-адресах, которые указываются в настройках игры, нельзя.

```
#
```

## https://dev.vk.com/ru/mini-apps/development/launch-params#%D0%9C%D0%B0%D1%82%D0%B5%D1%80%D0%B8%D0%B0%D0%BB%D1%8B%20%D0%BF%D0%BE%20%D1%82%D0%B5%D0%BC%D0%B5Материалы по теме
- •[Подпись параметров запуска](https://dev.vk.com/ru/mini-apps/development/launch-params-sign)
- •[VKWebAppGetLaunchParams](https://dev.vk.com/ru/bridge/VKWebAppGetLaunchParams)
[Подпись параметров запуска](https://dev.vk.com/ru/mini-apps/development/launch-params-sign)
[VKWebAppGetLaunchParams](https://dev.vk.com/ru/bridge/VKWebAppGetLaunchParams)

```
VKWebAppGetLaunchParams
```

[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

