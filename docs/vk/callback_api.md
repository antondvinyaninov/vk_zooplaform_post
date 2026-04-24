Title: Интеграция | Сообщества и пользователи | Callback API | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/api/callback/getting-started

---

Callback API — это инструмент для отслеживания активности пользователей в вашем сообществе ВКонтакте. С его помощью вы можете реализовать, например:
- •Бота для отправки мгновенных ответов на поступающие сообщения.
- •Систему автоматической модерации контента.
- •Сервис для сбора и обработки показателей вовлечённости аудитории.
Чтобы начать использовать Callback API, [подключите](https://dev.vk.com/ru/api/callback/getting-started#%D0%9F%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20Callback%20API) свой сервер в настройках сообщества и выберите типы событий, данные о которых требуется получать, например новые комментарии и новые фотографии.
Когда в сообществе произойдет событие выбранного типа, ВКонтакте отправит на ваш сервер запрос с данными в формате [JSON](https://vk.com/away.php?to=https%3A%2F%2Fru.wikipedia.org%2Fwiki%2FJSON) с основной информацией об объекте, вызвавшем событие (например, добавленный комментарий).
В ответ на каждое уведомление о событии ваш сервер должен отправить строку ok.

```
ok
```

Вам больше не нужно регулярно повторять запросы к API, чтобы отслеживать обновления — теперь вы будете получать их мгновенно.

### https://dev.vk.com/ru/api/callback/getting-started#%D0%9F%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20Callback%20APIПодключение Callback API
1. 1.
Откройте vk.com и перейдите в сообщество, в котором вы являетесь администратором.

2. 2.
В меню справа выберите Управление и затем Дополнительно → Работа с API.

3. 3.
Откройте вкладку Callback API.

Откройте vk.com и перейдите в сообщество, в котором вы являетесь администратором.
В меню справа выберите Управление и затем Дополнительно → Работа с API.
Откройте вкладку Callback API.
Далее необходимо указать и подтвердить конечный адрес сервера, куда будут направлены все запросы. Вы можете подключить до 10 серверов для Callback API, задать каждому из них отдельный набор событий и версию API.
После указания адреса сервера и нажатия на кнопку подтвердить на указанный вами адрес отправится запрос с уведомлением типа confirmation. Ваш сервер должен вернуть заданную строку.

```
confirmation
```

Обратите внимание: строка подтверждения меняется время от времени. Если вы добавляете новый сервер или редактируете настройки старого, то необходимо указать новую строку подтверждения. Получить строку подтверждения можно с помощью метода [groups.getCallbackConfirmationCode](https://dev.vk.com/ru/method/groups.getCallbackConfirmationCode). Также ее можно посмотреть в управлении сообществом.

```
groups.getCallbackConfirmationCode
```

Строку подтверждения, которую возвращает метод, можно использовать только для настройки сервера с помощью API. В настройках вашего сообщества на сайте ВКонтакте код будет отличаться.
После подтверждения адреса сервера вам станут доступны настройки уведомлений.
Во вкладке Запросы вы сможете видеть историю событий и содержимое запросов, отправленных на ваш сервер.
Обратите внимание: после получения уведомления ваш сервер должен возвращать строку ok и статус HTTP 200. Если сервер несколько раз подряд вернет ошибку, Callback API временно перестанет отправлять на него уведомления.

```
ok
```

Добавлять, удалять и редактировать сервера для Callback API вы также можете с помощью методов секции [groups](https://dev.vk.com/ru/method/groups).

```
groups
```

### https://dev.vk.com/ru/api/callback/getting-started#%D0%A3%D0%B4%D0%B0%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%81%D0%B5%D1%80%D0%B2%D0%B5%D1%80%D0%B0Удаление сервера
Для удаления сервера вы можете отправить строку remove в ответ на уведомление о любом событии.

```
remove
```

В зависимости от указанной версии объекты в событиях будут иметь разный формат. Ознакомиться с отличиями версий можно [на этой странице](https://dev.vk.com/ru/reference/versions).

### https://dev.vk.com/ru/api/callback/getting-started#%D0%A1%D0%B5%D0%BA%D1%80%D0%B5%D1%82%D0%BD%D1%8B%D0%B9%20%D0%BA%D0%BB%D1%8E%D1%87Секретный ключ
В поле Секретный ключ вы можете указать произвольную строку, которая будет передаваться в уведомлении на ваш сервер в поле secret.

```
secret
```

### https://dev.vk.com/ru/api/callback/getting-started#SSL-%D1%81%D0%B5%D1%80%D1%82%D0%B8%D1%84%D0%B8%D0%BA%D0%B0%D1%82SSL-сертификат
Чтобы гарантировать безопасность передачи данных, мы рекомендуем загрузить SSL-сертификат в настройках Callback API вашего сообщества.
Подробная информация о сертификате приведена ниже.

### https://dev.vk.com/ru/api/callback/getting-started#%D0%9D%D0%B0%D1%81%D1%82%D1%80%D0%BE%D0%B9%D0%BA%D0%B0%20%D1%87%D0%B5%D1%80%D0%B5%D0%B7%20APIНастройка через API
Вы можете управлять настройками Callback API в вашем сообществе не только в веб-интерфейсе, но и с помощью методов API:
- •[groups.addCallbackServer](https://dev.vk.com/ru/method/groups.addCallbackServer) — добавляет сервер Callback API в сообщество;
- •[groups.deleteCallbackServer](https://dev.vk.com/ru/method/groups.deleteCallbackServer) — удаляет сервер Callback API;
- •[groups.editCallbackServer](https://dev.vk.com/ru/method/groups.editCallbackServer) — редактирует данные сервера Callback API;
- •[groups.getCallbackConfirmationCode](https://dev.vk.com/ru/method/groups.getCallbackConfirmationCode) — получает код подтверждения для подключения сервера Callback API;
- •[groups.getCallbackServers](https://dev.vk.com/ru/method/groups.getCallbackServers) — получает список подключенных серверов в сообществе;
- •[groups.getCallbackSettings](https://dev.vk.com/ru/method/groups.getCallbackSettings) — получает настройки событий для сервера Callback API;
- •[groups.setCallbackSettings](https://dev.vk.com/ru/method/groups.setCallbackSettings) — устанавливает настройки событий для сервера Callback API.
[groups.addCallbackServer](https://dev.vk.com/ru/method/groups.addCallbackServer)

```
groups.addCallbackServer
```

[groups.deleteCallbackServer](https://dev.vk.com/ru/method/groups.deleteCallbackServer)

```
groups.deleteCallbackServer
```

[groups.editCallbackServer](https://dev.vk.com/ru/method/groups.editCallbackServer)

```
groups.editCallbackServer
```

[groups.getCallbackConfirmationCode](https://dev.vk.com/ru/method/groups.getCallbackConfirmationCode)

```
groups.getCallbackConfirmationCode
```

[groups.getCallbackServers](https://dev.vk.com/ru/method/groups.getCallbackServers)

```
groups.getCallbackServers
```

[groups.getCallbackSettings](https://dev.vk.com/ru/method/groups.getCallbackSettings)

```
groups.getCallbackSettings
```

[groups.setCallbackSettings](https://dev.vk.com/ru/method/groups.setCallbackSettings)

```
groups.setCallbackSettings
```

[Формат присылаемых данных](https://dev.vk.com/ru/api/callback/getting-started#%D0%A4%D0%BE%D1%80%D0%BC%D0%B0%D1%82%20%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D1%85) может меняться в зависимости от [версии API ВКонтакте](https://dev.vk.com/ru/reference/versions). Если формат отличается от ожидаемого, то при обработке входящего сообщения может произойти ошибка.
Чтобы избежать ошибки, укажите ожидаемую версию API ВКонтакте, которую платформа будет использовать для обмена данными с вашим сервером. Указать версию API можно через пользовательский интерфейс ВКонтакте или с помощью методов API.

#### https://dev.vk.com/ru/api/callback/getting-started#%D0%A7%D0%B5%D1%80%D0%B5%D0%B7%20%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%D0%B8%D0%B9%20%D0%B8%D0%BD%D1%82%D0%B5%D1%80%D1%84%D0%B5%D0%B9%D1%81Через пользовательский интерфейс
1. 1.
В вашем сообществе в меню справа выберите Управление, далее Дополнительно → Работа с API.

2. 2.
Перейдите на вкладку Callback API и в разделе Настройки сервера выберите версию API.
Выбор версии API ВКонтакте

В вашем сообществе в меню справа выберите Управление, далее Дополнительно → Работа с API.
Перейдите на вкладку Callback API и в разделе Настройки сервера выберите версию API.
Выбор версии API ВКонтакте

#### https://dev.vk.com/ru/api/callback/getting-started#%D0%A7%D0%B5%D1%80%D0%B5%D0%B7%20API%20%D0%92%D0%9A%D0%BE%D0%BD%D1%82%D0%B0%D0%BA%D1%82%D0%B5Через API ВКонтакте
Воспользуйтесь одним из следующих способов:
- •
Отправьте API-запрос [groups.setCallbackSettings](https://dev.vk.com/ru/method/groups.setCallbackSettings).
Укажите желаемую версию API в параметре api_version этого запроса. Номер версии указывайте так, как он отображается в пользовательском интерфейсе в выпадающем списке на вкладке Callback API.
— либо —

- •
Передайте желаемый номер версии API в ответ на любой запрос, который пришёл по каналу Сallback API. В ответе используйте строку вида:
version 5.131
Обратите внимание на пробел после слова version.
Номер версии указывайте так, как он отображается в пользовательском интерфейсе в выпадающем списке на вкладке Callback API.
Поддерживается версия 5.81 и более поздние.

Отправьте API-запрос [groups.setCallbackSettings](https://dev.vk.com/ru/method/groups.setCallbackSettings). Укажите желаемую версию API в параметре api_version этого запроса. Номер версии указывайте так, как он отображается в пользовательском интерфейсе в выпадающем списке на вкладке Callback API.

```
api_version
```

— либо —
Передайте желаемый номер версии API в ответ на любой запрос, который пришёл по каналу Сallback API. В ответе используйте строку вида:
version 5.131

```
version 5.131
```

Обратите внимание на пробел после слова version.

```
version
```

Номер версии указывайте так, как он отображается в пользовательском интерфейсе в выпадающем списке на вкладке Callback API.
Поддерживается версия 5.81 и более поздние.

```
5.81
```

#### https://dev.vk.com/ru/api/callback/getting-started#X-Retry-CounterX-Retry-Counter
Заголовок X-Retry-Counter возвращается, если предыдущая попытка отправки события потерпела неудачу (например, из-за того, что ваш сервер не отправил строку ok в ответ на уведомление о событии). Заголовок содержит информацию о количестве неудачных попыток. Промежутки времени, через которые событие будет отравлено повторно:

```
ok
```

- •первое — через 10 секунд,
- •второе — через 3 минуты,
- •третье — через 10 минут,
- •четвёртое — через 30 минут,
- •пятое — через 1 час.

#### https://dev.vk.com/ru/api/callback/getting-started#Retry-AfterRetry-After
Вы можете отправить заголовок Retry-After вместе с HTTP-кодами 410, 429 или 503 и интервалом времени, через который надо будет повторить запрос. Время укажите в секундах или в формате [HTTP-Date](https://vk.com/away.php?to=https%3A%2F%2Fdeveloper.mozilla.org%2Fru%2Fdocs%2FWeb%2FHTTP%2FHeaders%2FDate). Диапазон времени переотправки должен быть меньше 3 часов.

```
410
```


```
429
```


```
503
```

Обратите внимание! Фактическое время переотправки уведомления о событии может оказаться больше указанного.

Когда происходит событие, вы получаете данные в JSON, имеющем следующую структуру:

```
{ "type": <тип события>, "event_id": <идентификатор события>, "v": <версия API, для которой сформировано событие>, "object": <объект, инициировавший событие>, "group_id": <ID сообщества, в котором произошло событие> }
```

Например:

```
{ "type": "group_join", "event_id": 12345, "v": "5.131", "object": { "user_id": 1, "join_type": "approved" }, "group_id": 1 }
```

Структура объекта в поле object зависит от типа уведомления. Полный список событий вы найдёте [на этой странице](https://dev.vk.com/ru/api/community-events/json-schema).

```
object
```

## https://dev.vk.com/ru/api/callback/getting-started#%D0%9F%D1%80%D0%B8%D0%BC%D0%B5%D1%80%20%D0%B8%D1%81%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D1%8FПример использования
В нашем примере скрипт на PHP обрабатывает уведомления о новом сообщении и отправляет ответ его автору от имени сообщества.

```
<?php if (!isset($_REQUEST)) { return; } //Строка для подтверждения адреса сервера из настроек Callback API $confirmation_token = 'd8v2ve07'; //Ключ доступа сообщества $token = 'c0223f775444cf3d58a8a1442ec76a9571c8f58e3e24616d9440f73dc43022bbead9b2e576cb41d09c0a1'; //Получаем и декодируем уведомление $data = json_decode(file_get_contents('php://input')); //Проверяем, что находится в поле "type" switch ($data->type) { //Если это уведомление для подтверждения адреса... case 'confirmation': //...отправляем строку для подтверждения echo $confirmation_token; break; //Если это уведомление о новом сообщении... case 'message_new': //...получаем id его автора $user_id = $data->object->message->from_id; //затем с помощью users.get получаем данные об авторе $user_info = json_decode(file_get_contents("https://api.vk.ru/method/users.get?user_ids={$user_id}&access_token={$token}&v=5.103")); //и извлекаем из ответа его имя $user_name = $user_info->response[0]->first_name; //С помощью messages.send отправляем ответное сообщение $request_params = array( 'message' => "Hello, {$user_name}!", 'peer_id' => $user_id, 'access_token' => $token, 'v' => '5.103', 'random_id' => '0' ); $get_params = http_build_query($request_params); file_get_contents('https://api.vk.ru/method/messages.send?'. $get_params); //Возвращаем "ok" серверу Callback API echo('ok'); break; } ?>
```

## https://dev.vk.com/ru/api/callback/getting-started#%D0%9F%D0%BE%D0%B4%D0%B4%D0%B5%D1%80%D0%B6%D0%BA%D0%B0%20%D0%B2%20SDKПоддержка в SDK
Вы можете работать с Callback API средствами наших SDK:
- •[Java SDK](https://dev.vk.com/ru/sdk/java),
- •[PHP SDK](https://dev.vk.com/ru/sdk/php).
[Java SDK](https://dev.vk.com/ru/sdk/java)
[PHP SDK](https://dev.vk.com/ru/sdk/php)

SSL — это протокол, позволяющий защитить запросы, которые принимает ваш сервер, от подмены, перехвата и модификации третьей стороной. Для работы SSL на сервере, который получает запрос, и на клиенте, который его отправляет, должны присутствовать специальные цифровые сертификаты — их наличие (и соответствие друг другу) позволяет установить защищенное (HTTPS) соединение.

```
HTTPS
```

Загрузив файл клиентского сертификата (в формате PKCS#12, вместе с закрытым ключом) в интерфейсе [Callback API](https://dev.vk.com/ru/api/callback/getting-started) вашего сообщества и настроив свой сервер для работы с этим сертификатом, вы сможете быть уверены, что уведомление поступило именно от нашего сервиса — не имея ключа от сертификата, подделать такой запрос или перехватить его будет невозможно. Этот механизм называется аутентификацией по сертификату.

```
PKCS#12
```

Мы рекомендуем прочитать эти статьи перед началом работы, если ранее вы не имели дела с аутентификацией в web, и пока не знаете, что такое SSL-сертификат:
- •
[Различные подходы к аутентификации в web](https://vk.com/away.php?to=https%3A%2F%2Fhabrahabr.ru%2Fcompany%2Fdataart%2Fblog%2F262817%2F)

- •
[SSL сертификаты и их разновидности](https://vk.com/away.php?to=https%3A%2F%2Fhabrahabr.ru%2Fcompany%2Ftuthost%2Fblog%2F150433%2F)

[Различные подходы к аутентификации в web](https://vk.com/away.php?to=https%3A%2F%2Fhabrahabr.ru%2Fcompany%2Fdataart%2Fblog%2F262817%2F)
[SSL сертификаты и их разновидности](https://vk.com/away.php?to=https%3A%2F%2Fhabrahabr.ru%2Fcompany%2Ftuthost%2Fblog%2F150433%2F)
Серверный сертификат должен быть выдан авторизованным центром сертификации — его валидность будет проверяться на стороне ВКонтакте. Клиентский сертификат для Callback API может быть самозаверенным, инструкцию по его созданию мы разместили для вас на этой странице. Вы можете использовать клиентский сертификат с любым уровнем валидации, с нашей стороны нет специфических требований к условиям его выдачи. Необходимо лишь, чтобы ваш сервер поддерживал работу с сертификатом выбранного типа и мог проверить его наличие и соответствие вашим настройкам доступа.
Для создания сертификата вам потребуется использовать OpenSSL. Установить эту программу можно по одной из ссылок с [официального сайта](https://vk.com/away.php?to=https%3A%2F%2Fwiki.openssl.org%2Findex.php%2FBinaries). Мы настоятельно рекомендуем вам сгенерировать отдельный сертификат для Callback API и не использовать для этих целей сертификат, созданный для другого сервиса.

Для создания сертификата введите такую команду:

```
openssl req -newkey rsa:2048 -sha256 -nodes -keyout vkapi.key -x509 -days 365 -out vkapi.crt -subj "/C=RU/ST=Saint Petersburg/L=Saint Petersburg/O=VK API Club/CN=vkapi"
```

В нашем примере использованы следующие параметры: req — означает запрос на создание нового сертификата; -newkey rsa:2048 — будет создан новый закрытый RSA-ключ длиной 2048 бита. Длину ключа вы можете настроить по своему усмотрению. -sha256 — используемый [алгоритм хеширования](https://vk.com/away.php?to=https%3A%2F%2Fru.wikipedia.org%2Fwiki%2FSHA-2) (мы рекомендуем использовать именно это значение). -nodes — указывает, что закрытый ключ шифровать не нужно. -keyout vkapi.key — указывает, что закрытый ключ нужно сохранить в файле с именем vkapi.key. -x509 — указывает, что нужно создать самоподписанный сертификат. -days 365 — указывает период действия вашего сертификата (в данном случае — один год). -out vkapi.crt — указывает, что сертификат нужно сохранить в файле с именем vkapi.crt. -subj "/C=RU/ST=Saint Petersburg/L=Saint Petersburg/O=VK API Club/CN=vkapi" — данные вашего сертификата:

```
req
```


```
-newkey rsa:2048
```


```
-sha256
```


```
-nodes
```


```
-keyout vkapi.key
```


```
vkapi.key
```


```
-x509
```


```
-days 365
```


```
-out vkapi.crt
```


```
vkapi.crt
```


```
-subj "/C=RU/ST=Saint Petersburg/L=Saint Petersburg/O=VK API Club/CN=vkapi"
```

- •C — код страны (состоит из двух букв);
- •ST — регион;
- •L — город;
- •O — название организации;
- •CN — Common Name, имя сертификата (для клиентского сертификата может быть произвольным).

```
C
```


```
ST
```


```
L
```


```
O
```


```
CN
```

Вы можете использовать значения из subj для дополнительной идентификации сертификата, в этом параметре допустимы произвольные данные. Например, можно проверять на стороне сервера, что в CN передается именно та строка, что была задана вами (в нашем примере — vkapi).

```
subj
```


```
vkapi
```

После выполнения команды в каталоге OpenSSL появятся два файла — vkapi.key, содержащий закрытый ключ, и vkapi.crt, содержащий сертификат. Необходимо конвертировать их в формат .p12.

```
vkapi.key
```


```
vkapi.crt
```


```
.p12
```

### https://dev.vk.com/ru/api/callback/getting-started#%D0%AD%D0%BA%D1%81%D0%BF%D0%BE%D1%80%D1%82%20%D0%B2%20PKCS%2312Экспорт в PKCS#12
Чтобы конвертировать сертификат в PKCS#12, используйте следующую команду:

```
openssl pkcs12 -export -in vkapi.crt -name "Test" -descert -inkey vkapi.key -out vkapi.p12
```

Параметры из нашего примера: pkcs12 — означает работу с файлами в PKCS#12; -export — запрос на экспорт сертификата; -in vkapi.crt — указывает на входной файл; -name "Test" — имя пользователя; -descert — шифрование сертификата в 3DES; -inkey vkapi.key — указывает имя файла, содержащего закрытый ключ; -out vkapi.p12 — указывает, что результат нужно сохранить в файле с именем vkapi.p12.

```
pkcs12
```


```
-export
```


```
-in vkapi.crt
```


```
-name "Test"
```


```
-descert
```


```
-inkey vkapi.key
```


```
-out vkapi.p12
```


```
vkapi.p12
```

После выполнения команды в каталоге OpenSSL появится файл vkapi.p12. Именно его вам нужно загрузить ВКонтакте. Для этого откройте раздел Управление, далее Дополнительно → Работа с API, вкладка Callback API. Нажмите Выбрать файл и выберите файл на вашем компьютере.

```
vkapi.p12
```

### https://dev.vk.com/ru/api/callback/getting-started#%D0%9D%D0%B0%D1%81%D1%82%D1%80%D0%BE%D0%B9%D0%BA%D0%B0%20%D1%81%D0%B5%D1%80%D0%B2%D0%B5%D1%80%D0%B0Настройка сервера
Обратите внимание! На вашем сервере должен присутствовать корневой SSL сертификат, подписанный авторизованным центром сертификации. Самоподписанного корневого сертификата недостаточно для работы с Callback API. Получить сертификат можно, например, используя этот сайт: [https://letsencrypt.org](https://vk.com/away.php?to=https%3A%2F%2Fletsencrypt.org)
Также вам нужно дополнительно настроить свой сервер, чтобы он умел проводить аутентификацию с использованием клиентского сертификата, который вы создали ранее.
В Nginx вам достаточно добавить следующие директивы:

```
ssl_client_certificate /path/vkapi.crt; ssl_verify_client on; ssl_verify_depth 0;
```

здесь: ssl_client_certificate — путь к файлу клиентского сертификата на вашем сервере; ssl_verify_client — проверять клиентский сертификат; ssl_verify_depth — глубина проверки цепочки клиентского сертификата.

```
ssl_client_certificate
```


```
ssl_verify_client
```


```
ssl_verify_depth
```

Если ранее вам не доводилось иметь дела с настройкой клиентских сертификатов для своего сервера, мы рекомендуем к прочтению эти статьи:
- •[Nginx](https://vk.com/away.php?to=https%3A%2F%2Fhabrahabr.ru%2Fpost%2F213741%2F)
- •[Nginx ngx_http_ssl_module](https://vk.com/away.php?to=https%3A%2F%2Fnginx.org%2Fru%2Fdocs%2Fhttp%2Fngx_http_ssl_module.html)
- •[Apache](https://vk.com/away.php?to=https%3A%2F%2Fwww.ibm.com%2Fdeveloperworks%2Fru%2Flibrary%2Fl-cerfiticate_management_02%2F)
[Nginx](https://vk.com/away.php?to=https%3A%2F%2Fhabrahabr.ru%2Fpost%2F213741%2F)
[Nginx ngx_http_ssl_module](https://vk.com/away.php?to=https%3A%2F%2Fnginx.org%2Fru%2Fdocs%2Fhttp%2Fngx_http_ssl_module.html)
[Apache](https://vk.com/away.php?to=https%3A%2F%2Fwww.ibm.com%2Fdeveloperworks%2Fru%2Flibrary%2Fl-cerfiticate_management_02%2F)
[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

