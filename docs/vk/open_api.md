Title: Интеграция | Сообщества и пользователи | Open API | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/api/open-api/getting-started

---

Open API — система, которая предоставляет возможность легко авторизовывать пользователей ВКонтакте на вашем сайте. Кроме этого, с согласия пользователей, вы сможете получить доступ к информации об их друзьях, фотографиях, видеороликах и других данных ВКонтакте для более глубокой интеграции с вашим проектом.
В рамках подключения к Open API создается приложение, которое позволяет использовать на вашем сайте все текущие методы ВКонтакте API. Помимо этого, Open API упрощает регистрацию новых пользователей на вашем сайте, если у них уже есть учетная запись ВКонтакте.

## https://dev.vk.com/ru/api/open-api/getting-started#%D0%9F%D0%BE%D0%B4%D0%B3%D0%BE%D1%82%D0%BE%D0%B2%D0%BA%D0%B0%20%D0%BA%20%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%B5Подготовка к работе
Перед началом работы с Open API вам необходимо [создать](https://vk.com/away.php?to=https%3A%2F%2Fvk.com%2Feditapp%3Fact%3Dcreate) новое приложение с типом «Веб-сайт» или «Standalone» (или использовать уже имеющееся у вас приложение).
В настройках приложения должны быть указаны следующие данные:
- •Адрес сайта — адрес сайта, к которому вы подключите Open API, например http://mysite.com
- •Базовый домен — базовый домен вашего сайта (например, mysite.com). Вы можете указать несколько доменных имен, если есть необходимость использовать один APP_ID на разных доменах.

```
Адрес сайта
```


```
http://mysite.com
```


```
Базовый домен
```


```
mysite.com
```


```
APP_ID
```

Обратите внимание, что вызовы методов Open API можно осуществлять только на странице с URL в рамках домена, указанного в поле «Базовый домен».
В дальнейшей работе вам потребуется идентификатор приложения из поля «ID приложения», в документации он может обозначаться как app_id, api_id, client_id.

```
app_id
```


```
api_id
```


```
client_id
```

## https://dev.vk.com/ru/api/open-api/getting-started#%D0%98%D0%BD%D0%B8%D1%86%D0%B8%D0%B0%D0%BB%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20Open%20APIИнициализация Open API
Для инициализации Open API используется метод VK.init. Метод принимает следующие параметры:

```
VK.init
```

- •apiId (integer), обязательный параметр — идентификатор приложения.
- •status (boolean) — true:  автоматически обновить при инициализации данные сессии и статуса с помощью метода [VK.Auth.getLoginStatus](https://dev.vk.com/ru/api/open-api/getting-started#VK.Auth.getLoginStatus).
- •onlyWidgets (boolean) — true: инициализировать Open API только для подключения [виджетов](https://dev.vk.com/ru/api/open-api/getting-started#%D0%92%D0%B8%D0%B4%D0%B6%D0%B5%D1%82%D1%8B).

```
apiId
```


```
integer
```


```
status
```


```
boolean
```


```
true
```

[VK.Auth.getLoginStatus](https://dev.vk.com/ru/api/open-api/getting-started#VK.Auth.getLoginStatus)

```
VK.Auth.getLoginStatus
```


```
onlyWidgets
```


```
boolean
```


```
true
```

[виджетов](https://dev.vk.com/ru/api/open-api/getting-started#%D0%92%D0%B8%D0%B4%D0%B6%D0%B5%D1%82%D1%8B)
Инициализация Open API может происходить двумя способами: обычным (синхронным) и асинхронным.

### https://dev.vk.com/ru/api/open-api/getting-started#%D0%9E%D0%B1%D1%8B%D1%87%D0%BD%D0%B0%D1%8F%20%D0%B8%D0%BD%D0%B8%D1%86%D0%B8%D0%B0%D0%BB%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8FОбычная инициализация
Для использования обычной инициализации необходимо добавить следующий блок кода внутри тега head:

```
head
```


```
<script src="https://vk.com/js/api/openapi.js?169" type="text/javascript"></script>
```

А код ниже перед закрывающим тегом body

```
body
```


```
<script type="text/javascript"> VK.init({ apiId: ВАШ_APP_ID }); </script>
```

### https://dev.vk.com/ru/api/open-api/getting-started#%D0%90%D1%81%D0%B8%D0%BD%D1%85%D1%80%D0%BE%D0%BD%D0%BD%D0%B0%D1%8F%20%D0%B8%D0%BD%D0%B8%D1%86%D0%B8%D0%B0%D0%BB%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8FАсинхронная инициализация
В отличие от обычной, асинхронная инициализация Open API позволяет производить инициализацию платформы параллельно инициализации вашего JavaScript-кода. Для использования асинхронной инициализации, добавьте следующий HTML и JavaScript код сразу же после открытия тега body:

```
body
```


```
<div id="vk_api_transport"></div> <script type="text/javascript"> window.vkAsyncInit = function() { VK.init({ apiId: ВАШ_APP_ID }); }; setTimeout(function() { var el = document.createElement("script"); el.type = "text/javascript"; el.src = "https://vk.com/js/api/openapi.js?169"; el.async = true; document.getElementById("vk_api_transport").appendChild(el); }, 0); </script>
```

При использовании асинхронной инициализации наличие контейнера vk_api_transport является обязательным условием успешной инициализации. При обычной инициализации контейнер будет создан автоматически в случае его отсутствия.

```
vk_api_transport
```

Для работы с авторизацией пользователя в Open API используются методы объекта VK.Auth.

```
VK.Auth
```

```
VK.Auth.login
```

Параметры: callback (function), settings (integer)

```
callback
```


```
function
```


```
settings
```


```
integer
```

Открывает popup-окно для авторизации пользователя с его учетной записью ВКонтакте. Если пользователь уже авторизован ВКонтакте, но не установил приложение, то запрашивает разрешение на доступ к личным данным. Если пользователь авторизован ВКонтакте и установил приложение к себе на страницу, то popup-окно сразу же закрывается и возвращаются сессионные данные пользователя в callback-вызове. Если задан параметр settings, то пользовательские настройки приложения сравниваются со значением, переданным в settings, и в случае необходимости запрашиваются те, которых не хватает. Со списком битовых масок настроек можно ознакомиться на странице [с правами доступа](https://dev.vk.com/ru/reference/access-rights).

```
settings
```


```
settings
```

Так как метод вызывает popup-окно, для предотвращения его блокировки браузером он должен вызываться в обработчике пользовательского события (например, нажатия на кнопку мыши по объекту). Этот метод генерирует событие [auth.login](https://dev.vk.com/ru/api/open-api/getting-started#%D0%9F%D0%BE%D0%B4%D0%B4%D0%B5%D1%80%D0%B6%D0%B8%D0%B2%D0%B0%D0%B5%D0%BC%D1%8B%D0%B5%20%D1%81%D0%BE%D0%B1%D1%8B%D1%82%D0%B8%D1%8F).

```
auth.login
```


#### https://dev.vk.com/ru/api/open-api/getting-started#%D0%A4%D0%BE%D1%80%D0%BC%D0%B0%D1%82%20%D0%BE%D1%82%D0%B2%D0%B5%D1%82%D0%B0Формат ответа
Данные сессии (session (object)). Объект, который содержит следующие поля:

```
session
```


```
object
```

- •expire (integer) — время в формате Unixtime, когда сессия устареет.
- •mid (integer) — идентификатор пользователя.
- •secret (string) — служебный параметр для проверки авторизации на удаленной стороне.
- •sid (string) — служебный параметр для проверки авторизации на удаленной стороне.
- •sig (string) — служебный параметр для проверки авторизации на удаленной стороне.
- •user (object) — информация о пользователе. Объект, который содержит следующие поля:
- •domain (string) — короткий адрес страницы.
- •first_name (string) — имя.
- •href (string) — ссылка на страницу в формате https://vk.com/domain.
- •id (string) — идентификатор пользователя.
- •last_name (string) — фамилия.
- •nickname (string) — отчество или никнейм (если указано).

```
expire
```


```
integer
```


```
Unixtime
```


```
mid
```


```
integer
```


```
secret
```


```
string
```


```
sid
```


```
string
```


```
sig
```


```
string
```


```
user
```


```
object
```


```
domain
```


```
string
```


```
first_name
```


```
string
```


```
href
```


```
string
```


```
https://vk.com/domain
```


```
id
```


```
string
```


```
last_name
```


```
string
```


```
nickname
```


```
string
```

Cтатус текущего пользователя (status (string)). Возможные значения:

```
status
```


```
string
```

- •connected — пользователь авторизован ВКонтакте и разрешил доступ приложению.
- •not_authorized — пользователь авторизован ВКонтакте, но не разрешил доступ приложению.

### https://dev.vk.com/ru/api/open-api/getting-started#VK.Auth.loginVK.Auth.login
- •unknown — пользователь не авторизован ВКонтакте.

```
connected
```


```
not_authorized
```


```
unknown
```

### https://dev.vk.com/ru/api/open-api/getting-started#VK.Auth.logoutVK.Auth.logout
```
VK.Auth.logout
```

Параметры: callback (function)

```
callback
```


```
function
```

В случае успеха завершает сессию пользователя внутри платформы Open API. Генерирует событие [auth.logout](https://dev.vk.com/ru/api/open-api/getting-started#%D0%9F%D0%BE%D0%B4%D0%B4%D0%B5%D1%80%D0%B6%D0%B8%D0%B2%D0%B0%D0%B5%D0%BC%D1%8B%D0%B5%20%D1%81%D0%BE%D0%B1%D1%8B%D1%82%D0%B8%D1%8F).

```
auth.logout
```

Метод возвращает объект следующего вида:

```
{session: null, status: "unknown", settings: undefined}
```

### https://dev.vk.com/ru/api/open-api/getting-started#VK.Auth.revokeGrantsVK.Auth.revokeGrants
```
VK.Auth.revokeGrants
```

Параметры: callback (function)

```
callback
```


```
function
```

В случае успеха лишает приложение прав на доступ к данным пользователя. Генерирует событие [auth.statusChange](https://dev.vk.com/ru/api/open-api/getting-started#%D0%9F%D0%BE%D0%B4%D0%B4%D0%B5%D1%80%D0%B6%D0%B8%D0%B2%D0%B0%D0%B5%D0%BC%D1%8B%D0%B5%20%D1%81%D0%BE%D0%B1%D1%8B%D1%82%D0%B8%D1%8F).

```
auth.statusChange
```

Метод возвращает объект следующего вида:

```
{session: null, status: "unknown", settings: undefined}
```

```
VK.Auth.getLoginStatus
```

Параметры: callback (function)

```
callback
```


```
function
```

Узнает текущий статус, а также получает данные сессии, если пользователь авторизован ВКонтакте и установил приложение. Метод получает эти данные от ВКонтакте и возвращает ответ в вызове указанной callback-функции.

#### https://dev.vk.com/ru/api/open-api/getting-started#%D0%A4%D0%BE%D1%80%D0%BC%D0%B0%D1%82%20%D0%BE%D1%82%D0%B2%D0%B5%D1%82%D0%B0Формат ответа
Данные сессии (session (object)). Объект, который содержит следующие поля:

```
session
```


```
object
```

- •expire (integer) — время в формате Unixtime, когда сессия устареет.
- •mid (integer) — идентификатор пользователя.
- •secret (string) — служебный параметр для проверки авторизации на удаленной стороне.
- •sid (string) — служебный параметр для проверки авторизации на удаленной стороне.
- •sig (string) — служебный параметр для проверки авторизации на удаленной стороне.
- •user (object) — информация о пользователе. Объект, который содержит следующие поля:
- •domain (string) — короткий адрес страницы.
- •first_name (string) — имя.
- •href (string) — ссылка на страницу в формате https://vk.com/domain.
- •id (string) — идентификатор пользователя.
- •last_name (string) — фамилия.
- •nickname (string) — отчество или никнейм (если указано).

```
expire
```


```
integer
```


```
Unixtime
```


```
mid
```


```
integer
```


```
secret
```


```
string
```


```
sid
```


```
string
```


```
sig
```


```
string
```


```
user
```


```
object
```


```
domain
```


```
string
```


```
first_name
```


```
string
```


```
href
```


```
string
```


```
https://vk.com/domain
```


```
id
```


```
string
```


```
last_name
```


```
string
```


```
nickname
```


```
string
```

Cтатус текущего пользователя (status (string)). Возможные значения:

```
status
```


```
string
```

- •connected — пользователь авторизован ВКонтакте и разрешил доступ приложению.
- •not_authorized — пользователь авторизован ВКонтакте, но не разрешил доступ приложению.
- •unknown — пользователь не авторизован ВКонтакте.

```
connected
```


```
not_authorized
```


```
unknown
```

```
VK.Auth.getSession
```

Параметры: callback (function)

```
callback
```


```
function
```

Возвращает сессионные данные пользователя. Этот метод нужно использовать для получения данных сессии, когда вы точно знаете, что пользователь авторизован ВКонтакте и в приложении, чтобы избежать задержек при асинхронном вызове [VK.Auth.getLoginStatus](https://dev.vk.com/ru/api/open-api/getting-started#VK.Auth.getLoginStatus).

```
VK.Auth.getLoginStatus
```


#### https://dev.vk.com/ru/api/open-api/getting-started#%D0%A4%D0%BE%D1%80%D0%BC%D0%B0%D1%82%20%D0%BE%D1%82%D0%B2%D0%B5%D1%82%D0%B0Формат ответа
- •expire (integer) — время в формате Unixtime, когда сессия устареет.
- •mid (integer) — идентификатор пользователя.
- •secret (string) — служебный параметр для [проверки авторизации на удаленной стороне](https://dev.vk.com/ru/api/open-api/getting-started#%D0%90%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BD%D0%B0%20%D1%83%D0%B4%D0%B0%D0%BB%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9%20%D1%81%D1%82%D0%BE%D1%80%D0%BE%D0%BD%D0%B5).
- •sid (string) — служебный параметр для [проверки авторизации на удаленной стороне](https://dev.vk.com/ru/api/open-api/getting-started#%D0%90%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BD%D0%B0%20%D1%83%D0%B4%D0%B0%D0%BB%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9%20%D1%81%D1%82%D0%BE%D1%80%D0%BE%D0%BD%D0%B5).
- •sig (string) — служебный параметр для [проверки авторизации на удаленной стороне](https://dev.vk.com/ru/api/open-api/getting-started#%D0%90%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BD%D0%B0%20%D1%83%D0%B4%D0%B0%D0%BB%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9%20%D1%81%D1%82%D0%BE%D1%80%D0%BE%D0%BD%D0%B5).
- •user (object) — информация о пользователе. Объект, который содержит следующие поля:
- •domain (string) — короткий адрес страницы.
- •first_name (string) — имя.
- •href (string) — ссылка на страницу в формате https://vk.com/domain.
- •id (string) — идентификатор пользователя.
- •last_name (string) — фамилия.
- •nickname (string) — отчество или никнейм (если указано).

```
expire
```


```
integer
```


```
Unixtime
```


```
mid
```


```
integer
```


```
secret
```


```
string
```

[проверки авторизации на удаленной стороне](https://dev.vk.com/ru/api/open-api/getting-started#%D0%90%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BD%D0%B0%20%D1%83%D0%B4%D0%B0%D0%BB%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9%20%D1%81%D1%82%D0%BE%D1%80%D0%BE%D0%BD%D0%B5)

```
sid
```


```
string
```

[проверки авторизации на удаленной стороне](https://dev.vk.com/ru/api/open-api/getting-started#%D0%90%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BD%D0%B0%20%D1%83%D0%B4%D0%B0%D0%BB%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9%20%D1%81%D1%82%D0%BE%D1%80%D0%BE%D0%BD%D0%B5)

```
sig
```


```
string
```

[проверки авторизации на удаленной стороне](https://dev.vk.com/ru/api/open-api/getting-started#%D0%90%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BD%D0%B0%20%D1%83%D0%B4%D0%B0%D0%BB%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9%20%D1%81%D1%82%D0%BE%D1%80%D0%BE%D0%BD%D0%B5)

```
user
```


```
object
```


```
domain
```


```
string
```


```
first_name
```


```
string
```


```
href
```


```
string
```


```
https://vk.com/domain
```


```
id
```


```
string
```


```
last_name
```


```
string
```


```
nickname
```


```
string
```

Для создания стилизованной кнопки Войти ВКонтакте используйте метод VK.UI.button. В качестве единственного параметра он принимает id контейнера.

```
VK.UI.button
```

Примеры использования этих методов:

### https://dev.vk.com/ru/api/open-api/getting-started#VK.Auth.getSessionVK.Auth.getSession
```
VK.Auth.login(function(response) { if (response.session) { /* Пользователь успешно авторизовался */ if (response.settings) { /* Выбранные настройки доступа пользователя, если они были запрошены */ } } else { /* Пользователь нажал кнопку Отмена в окне авторизации */ } });
```

### https://dev.vk.com/ru/api/open-api/getting-started#%D0%90%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BD%D0%B0%20%D1%83%D0%B4%D0%B0%D0%BB%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9%20%D1%81%D1%82%D0%BE%D1%80%D0%BE%D0%BD%D0%B5Авторизация на удаленной стороне
Для того, чтобы вы могли проверить, что пользователь действительно авторизовался через платформу Open API, в сессионных данных передается параметр sig. Он служит цифровой подписью данных. После авторизации сессионные данные записываются в cookie с именем vk_app_<APP_ID>, где <APP_ID> - это идентификатор вашего приложения. Данные записаны в виде пар parameter_name = parameter_value, соединенных разделительным символом &:

```
sig
```


```
vk_app_<APP_ID>
```


```
<APP_ID>
```


```
parameter_name
```


```
parameter_value
```


```
&
```


```
expire=1271238742&mid=100172&secret=97c1e8933e&sid=549b550f608e4a4d247734941debb5e68df50a66c58dc6ee2a4f60a2&sig=372df9795fe8dd29684a2f996872457c
```

Параметр sig равен md5 от конкатенации следующих строк:

```
sig
```

- •данных сессии expire, mid, secret, sid в виде пар parameter_name = parameter_value, расположенных в порядке возрастания имени параметра (по алфавиту).
- •защищенного ключа вашего приложения.

```
expire
```


```
mid
```


```
secret
```


```
sid
```


```
parameter_name
```


```
parameter_value
```

В данном случае значение sig будет вычислено как md5-хеш от следующей строки:

```
sig
```


```
md5
```


```
expire=1271238742mid=100172secret=97c1e8933esid=549b550f608e4a4d247734941debb5e68df50a66c58dc6ee2a4f60a26FF1PUlZfEyutJxctvtd
```

Ниже представлен пример кода на языке PHP, который может быть использован для авторизации пользователя Open API на удаленной стороне:

```
function authOpenAPIMember() { $session = array(); $member = FALSE; $valid_keys = array('expire', 'mid', 'secret', 'sid', 'sig'); $app_cookie = $_COOKIE['vk_app_'.APP_ID]; if ($app_cookie) { $session_data = explode ('&', $app_cookie, 10); foreach ($session_data as $pair) { list($key, $value) = explode('=', $pair, 2); if (empty($key) || empty($value) || !in_array($key, $valid_keys)) { continue; } $session[$key] = $value; } foreach ($valid_keys as $key) { if (!isset($session[$key])) return $member; } ksort($session); $sign = ''; foreach ($session as $key => $value) { if ($key != 'sig') { $sign .= ($key.'='.$value); } } $sign .= APP_SHARED_SECRET; $sign = md5($sign); if ($session['sig'] == $sign && $session['expire'] > time()) { $member = array( 'id' => intval($session['mid']), 'secret' => $session['secret'], 'sid' => $session['sid'] ); } } return $member; } $member = authOpenAPIMember(); if($member !== FALSE) { /* Пользователь авторизован в Open API */ } else { /* Пользователь не авторизован в Open API */ }
```

В этом примере константы имеют следующие значения:
- •APP_ID — ID Open API приложения.
- •APP_SHARED_SECRET — защищенный ключ Open API приложения.

```
APP_ID
```


```
APP_SHARED_SECRET
```

## https://dev.vk.com/ru/api/open-api/getting-started#%D0%92%D1%8B%D0%B7%D0%BE%D0%B2%20%D0%BC%D0%B5%D1%82%D0%BE%D0%B4%D0%BE%D0%B2%20API%20%D0%92%D0%9A%D0%BE%D0%BD%D1%82%D0%B0%D0%BA%D1%82%D0%B5Вызов методов API ВКонтакте
Для взаимодействия с API ВКонтакте используйте метод VK.Api.call. Этот метод принимает следующие параметры:

```
VK.Api.call
```

- •method (string) — название [метода API](https://dev.vk.com/ru/method);
- •params  (object) — параметры метода (параметр версии API v обязателен);
- •callback  (function) — функция обратного вызова.

```
method
```


```
string
```

[метода API](https://dev.vk.com/ru/method)

```
params
```


```
object
```


```
v
```


```
callback
```


```
function
```

Вызов метода [users.get](https://dev.vk.com/ru/users.get) через Open API:

```
users.get
```


```
VK.Api.call('users.get', {user_ids: 6492, v:"5.73"}, function(r) { if(r.response) { alert('Привет, ' + r.response[0].first_name); } });
```

## https://dev.vk.com/ru/api/open-api/getting-started#%D0%92%D0%B8%D0%B4%D0%B6%D0%B5%D1%82%D1%8BВиджеты
С помощью Open API вы можете встроить на свой сайт виджеты ВКонтакте — например, для отображения данных о вашем сообществе или для комментирования материалов.
Для встраивания виджетов используются функции объекта VK.Widgets. Нажмите на название виджета, чтобы перейти к его подробному описанию и конструктору кода.
- •VK.Widgets.ContactUs — [виджет «Напишите нам»](https://dev.vk.com/ru/widgets/contact-us).
- •VK.Widgets.Comments — [виджет комментариев](https://dev.vk.com/ru/widgets/comments).
- •VK.Widgets.Post — [виджет «Запись на стене»](https://dev.vk.com/ru/widgets/post).
- •VK.Widgets.Group — [виджет сообщества](https://dev.vk.com/ru/widgets/group).
- •VK.Widgets.Like — [виджет «Мне нравится»](https://dev.vk.com/ru/widgets/like).
- •VK.Widgets.Recommended — [виджет рекомендаций](https://dev.vk.com/ru/widgets/recommended).
- •VK.Widgets.Poll — [виджет опроса](https://dev.vk.com/ru/widgets/poll).
- •VK.Widgets.Subscribe — [виджет «Подписаться на автора»](https://dev.vk.com/ru/widgets/subscribe).

```
VK.Widgets.ContactUs
```

[виджет «Напишите нам»](https://dev.vk.com/ru/widgets/contact-us)

```
VK.Widgets.Comments
```

[виджет комментариев](https://dev.vk.com/ru/widgets/comments)

```
VK.Widgets.Post
```

[виджет «Запись на стене»](https://dev.vk.com/ru/widgets/post)

```
VK.Widgets.Group
```

[виджет сообщества](https://dev.vk.com/ru/widgets/group)

```
VK.Widgets.Like
```

[виджет «Мне нравится»](https://dev.vk.com/ru/widgets/like)

```
VK.Widgets.Recommended
```

[виджет рекомендаций](https://dev.vk.com/ru/widgets/recommended)

```
VK.Widgets.Poll
```

[виджет опроса](https://dev.vk.com/ru/widgets/poll)

```
VK.Widgets.Subscribe
```

[виджет «Подписаться на автора»](https://dev.vk.com/ru/widgets/subscribe)

## https://dev.vk.com/ru/api/open-api/getting-started#%D0%9E%D0%B1%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B0%20%D1%81%D0%BE%D0%B1%D1%8B%D1%82%D0%B8%D0%B9Обработка событий
Для обработки событий в Open API используйте методы VK.Observer.subscribe и VK.Observer.unsubscribe.

```
VK.Observer.subscribe
```


```
VK.Observer.unsubscribe
```

### https://dev.vk.com/ru/api/open-api/getting-started#VK.Observer.subscribeVK.Observer.subscribe
```
VK.Observer.subscribe
```

Параметры: event (string), handler (function).

```
event
```


```
string
```


```
handler
```


```
function
```

Метод добавляет функцию, переданную в параметре handler, в список получателей события, которое указано в параметре event.

```
handler
```


```
event
```

### https://dev.vk.com/ru/api/open-api/getting-started#VK.Observer.unsubscribeVK.Observer.unsubscribe
```
VK.Observer.unsubscribe
```

Параметры: event (string), handler (function).

```
event
```


```
string
```


```
handler
```


```
function
```

Метод удаляет функцию, переданную в параметре handler, из списка получателей события, которое указано в параметре event. Если параметр handler не задан, то удаляются все обработчики события, указанного в параметре event.

```
handler
```


```
event
```


```
handler
```


```
event
```

### https://dev.vk.com/ru/api/open-api/getting-started#%D0%9F%D0%BE%D0%B4%D0%B4%D0%B5%D1%80%D0%B6%D0%B8%D0%B2%D0%B0%D0%B5%D0%BC%D1%8B%D0%B5%20%D1%81%D0%BE%D0%B1%D1%8B%D1%82%D0%B8%D1%8FПоддерживаемые события
```
auth.login
```

[VK.Auth.login](https://dev.vk.com/ru/api/open-api/getting-started#%D0%90%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F)

```
VK.Auth.login
```


```
auth.logout
```

[VK.Auth.logout](https://dev.vk.com/ru/api/open-api/getting-started#%D0%90%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F)

```
VK.Auth.logout
```


```
auth.statusChange
```


```
auth.sessionChange
```


```
widgets.comments.new_comment
```

[виджете комментариев](https://dev.vk.com/ru/widgets/comments)

```
widgets.comments.delete_comment
```


```
widgets.groups.joined
```

[виджете сообщества](https://dev.vk.com/ru/widgets/group)

```
widgets.groups.leaved
```


```
widgets.like.liked
```

[виджете](https://dev.vk.com/ru/widgets/like)

```
widgets.like.unliked
```


```
widgets.like.shared
```


```
widgets.like.unshared
```


```
widgets.subscribed
```

[виджете](https://dev.vk.com/ru/widgets/subscribe)

```
widgets.unsubscribed
```

Пример использования VK.Observer с [виджетом «Мне нравится»](https://dev.vk.com/ru/widgets/like):

```
VK.Observer
```


```
<script type="text/javascript" src="//vk.com/js/api/openapi.js?122"></script> <script type="text/javascript"> VK.init({apiId: 123456}); </script> <div id="vk_like"></div> <script type="text/javascript"> VK.Widgets.Like("vk_like", {type: "button"}); VK.Observer.subscribe("widgets.like.liked", function f() { alert ("Thank you for your like."); }); </script>
```

Значение 123456 необходимо заменить на API_ID вашего приложения.

```
123456
```


```
API_ID
```

Ретаргетинг — это инструмент, позволяющий показывать рекламные материалы пользователям, которые уже знакомы с продуктом или услугой, посетив сайт или воспользовавшись ими ранее. Вы можете обработать событие или пополнить аудиторию ретаргетинга с помощью Open API.

### https://dev.vk.com/ru/api/open-api/getting-started#VK.Retargeting.InitVK.Retargeting.Init
```
VK.Retargeting.Init
```

Параметры: code (string)

```
code
```


```
string
```

Используйте метод VK.Retargeting.Init, чтобы инициализировать пиксель. В качестве единственного параметра метод принимает код пикселя, который вы можете получить в настройках рекламного кабинета или методом [ads.createTargetPixel](https://dev.vk.com/ru/ads.createTargetPixel).

```
VK.Retargeting.Init
```


```
ads.createTargetPixel
```


```
VK.Retargeting.Init('VK-RTRG-96471-KZ24cpR');
```

### https://dev.vk.com/ru/api/open-api/getting-started#VK.Retargeting.HitVK.Retargeting.Hit
```
VK.Retargeting.Hit
```

Параметры: —
Метод генерирует событие посещения страницы.

### https://dev.vk.com/ru/api/open-api/getting-started#VK.Retargeting.EventVK.Retargeting.Event
```
VK.Retargeting.Event
```

Параметры: eventName (string)

```
eventName
```


```
string
```

Метод генерирует событие eventName.

```
eventName
```

Например:

```
var formFillStarted = false; $('form').on('change', function () { if (!formFillStarted) { formFillStarted = true; VK.Retargeting.Event('form-fill-started'); } });
```

### https://dev.vk.com/ru/api/open-api/getting-started#VK.Retargeting.AddVK.Retargeting.Add
```
VK.Retargeting.Add
```

Параметры: audienceID (integer)

```
audienceID
```


```
integer
```

Метод добавляет пользователя в аудиторию audienceID.

```
audienceID
```

Например:

```
$('.add-to-basket').on('click', function () { VK.Retargeting.Add(8839163); });
```

```
VK.UI
```

Объект VK.UI содержит в себе различные методы, связанные с интерфейсом.

```
button
```


```
string
```


```
box_id
```


```
box_id
```

[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

