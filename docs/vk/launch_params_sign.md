Title: Мини-приложения | Разработка | Подпись параметров запуска | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/mini-apps/development/launch-params-sign

---

Игры и мини-приложения ВКонтакте используют подпись [параметров](https://dev.vk.com/ru/mini-apps/development/launch-params), чтобы защититься от подмены значений и возможной утечки данных.
1. 1.
При запуске приложения ВКонтакте вычисляет подпись с помощью [защищённого ключа доступа](https://dev.vk.com/ru/mini-apps/settings/development/keys#%D0%97%D0%B0%D1%89%D0%B8%D1%89%D1%91%D0%BD%D0%BD%D1%8B%D0%B9%20%D0%BA%D0%BB%D1%8E%D1%87) из настроек. Этот ключ известен авторам игры или мини-приложения, но неизвестен третьим лицам.
Полученное значение передаётся приложению в [параметре запуска](https://dev.vk.com/ru/mini-apps/development/launch-params)sign.

2. 2.
Приложение при старте может вычислить подпись по такому же алгоритму и сравнить это значение с переданным sign.
Разница будет означать подмену.

При запуске приложения ВКонтакте вычисляет подпись с помощью [защищённого ключа доступа](https://dev.vk.com/ru/mini-apps/settings/development/keys#%D0%97%D0%B0%D1%89%D0%B8%D1%89%D1%91%D0%BD%D0%BD%D1%8B%D0%B9%20%D0%BA%D0%BB%D1%8E%D1%87) из настроек. Этот ключ известен авторам игры или мини-приложения, но неизвестен третьим лицам.
Полученное значение передаётся приложению в [параметре запуска](https://dev.vk.com/ru/mini-apps/development/launch-params)sign.

```
sign
```

Приложение при старте может вычислить подпись по такому же алгоритму и сравнить это значение с переданным sign.

```
sign
```

Разница будет означать подмену.

1. 1.
Отсортируйте полученные параметры с префиксом vk_ по имени ключа и объедините пары параметр=значение в одну строку. Используйте амперсанд (&) в качестве разделителя.

Обратите внимание, что строковые значения должны быть в URL-кодировке. Например, запятые должны быть представлены как %2C, пробелы — как %20.


2. 2.
Для получившейся строки вычислите хеш-код, используя алгоритм SHA256 с методом HMAС. При расчётах используйте защищённый ключ из настроек вашего мини-приложения (раздел [Разработка → Ключи доступа](https://dev.vk.com/ru/mini-apps/settings/development/keys), поле Защищённый ключ).

3. 3.
Результирующее значение закодируйте в base64-строку.

Отсортируйте полученные параметры с префиксом vk_ по имени ключа и объедините пары параметр=значение в одну строку. Используйте амперсанд (&) в качестве разделителя.

```
vk_
```


```
параметр=значение
```


```
&
```

Обратите внимание, что строковые значения должны быть в URL-кодировке. Например, запятые должны быть представлены как %2C, пробелы — как %20.

```
%2C
```


```
%20
```

Для получившейся строки вычислите хеш-код, используя алгоритм SHA256 с методом HMAС. При расчётах используйте защищённый ключ из настроек вашего мини-приложения (раздел [Разработка → Ключи доступа](https://dev.vk.com/ru/mini-apps/settings/development/keys), поле Защищённый ключ).
Результирующее значение закодируйте в base64-строку.
Получившаяся строка должна совпадать с переданной в параметре sign.

```
sign
```

Обратите внимание, что список возвращаемых параметров может меняться.

### https://dev.vk.com/ru/mini-apps/development/launch-params-sign#PHPPHP
```
$url = 'https://example.com/?vk_user_id=494075&vk_app_id=6736218&vk_is_app_user=1&vk_are_notifications_enabled=1&vk_language=ru&vk_access_token_settings=&vk_platform=android&sign=exTIBPYTrAKDTHLLm2AwJkmcVcvFCzQUNyoa6wAjvW6k'; $client_secret = 'wvl68m4dR1UpLrVRli'; //Защищённый ключ из настроек вашего приложения $query_params = []; parse_str(parse_url($url, PHP_URL_QUERY), $query_params); // Получаем query-параметры из URL $sign_params = []; foreach ($query_params as $name => $value) { if (strpos($name, 'vk_') !== 0) { // Получаем только vk параметры из query continue; } $sign_params[$name] = $value; } ksort($sign_params); // Сортируем массив по ключам $sign_params_query = http_build_query($sign_params); // Формируем строку вида "param_name1=value&param_name2=value" $sign = rtrim(strtr(base64_encode(hash_hmac('sha256', $sign_params_query, $client_secret, true)), '+/', '-_'), '='); // Получаем хеш-код от строки, используя защищеный ключ приложения. Генерация на основе метода HMAC. $status = $sign === $query_params['sign']; // Сравниваем полученную подпись со значением параметра 'sign' echo ($status ? 'ok' : 'fail')."\n";
```

### https://dev.vk.com/ru/mini-apps/development/launch-params-sign#JavaJava
```
import javax.crypto.Mac; import javax.crypto.spec.SecretKeySpec; import java.io.UnsupportedEncodingException; import java.net.URL; import java.net.URLDecoder; import java.net.URLEncoder; import java.util.Base64; import java.util.LinkedHashMap; import java.util.Map; import java.util.stream.Collectors; class Application { private static final String ENCODING = "UTF-8"; public static void main(String[] args) throws java.lang.Exception { String url = "https://example.com/?vk_user_id=494075&vk_app_id=6736218&vk_is_app_user=1&vk_are_notifications_enabled=1&vk_language=ru&vk_access_token_settings=&vk_platform=android&sign=exTIBPYTrAKDTHLLm2AwJkmcVcvFCzQUNyoa6wAjvW6"; String clientSecret = "wvl68m4dR1UpLrVRli"; Map<String, String> queryParams = getQueryParams(new URL(url)); String checkString = queryParams.entrySet().stream() .filter(entry -> entry.getKey().startsWith("vk_")) .sorted(Map.Entry.comparingByKey()) .map(entry -> encode(entry.getKey()) + "=" + (entry.getValue() == null ? "" : encode(entry.getValue()))) .collect(Collectors.joining("&")); String sign = getHashCode(checkString, clientSecret); System.out.println(sign.equals(queryParams.getOrDefault("sign", "")) ? "ok" : "fail"); } private static Map<String, String> getQueryParams(URL url) { final Map<String, String> result = new LinkedHashMap<>(); final String[] pairs = url.getQuery().split("&"); for (String pair : pairs) { int idx = pair.indexOf("="); String key = idx > 0 ? decode(pair.substring(0, idx)) : pair; String value = idx > 0 && pair.length() > idx + 1 ? decode(pair.substring(idx + 1)) : null; result.put(key, value); } return result; } private static String getHashCode(String data, String key) throws Exception { SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(ENCODING), "HmacSHA256"); Mac mac = Mac.getInstance("HmacSHA256"); mac.init(secretKey); byte[] hmacData = mac.doFinal(data.getBytes(ENCODING)); return new String(Base64.getUrlEncoder().withoutPadding().encode(hmacData)); } private static String decode(String value) { try { return URLDecoder.decode(value, ENCODING); } catch (UnsupportedEncodingException e) { e.printStackTrace(); } return value; } private static String encode(String value) { try { return URLEncoder.encode(value, ENCODING); } catch (UnsupportedEncodingException e) { e.printStackTrace(); } return value; } }
```

```
from base64 import b64encode from collections import OrderedDict from hashlib import sha256 from hmac import HMAC from urllib.parse import urlparse, parse_qsl, urlencode def is_valid(*, query: dict, secret: str) -> bool: """Check VK Apps signature""" vk_subset = OrderedDict(sorted(x for x in query.items() if x[0][:3] == "vk_")) hash_code = b64encode(HMAC(secret.encode(), urlencode(vk_subset, doseq=True).encode(), sha256).digest()) decoded_hash_code = hash_code.decode('utf-8')[:-1].replace('+', '-').replace('/', '_') return query["sign"] == decoded_hash_code url = "https://example.com/?vk_user_id=494075&vk_app_id=6736218&vk_is_app_user=1&vk_are_notifications_enabled=1&vk_language=ru&vk_access_token_settings=&vk_platform=android&sign=exTIBPYTrAKDTHLLm2AwJkmcVcvFCzQUNyoa6wAjvW6k" client_secret = "wvl68m4dR1UpLrVRli" # Защищённый ключ из настроек вашего приложения # Если без Flask или Django query_params = dict(parse_qsl(urlparse(url).query, keep_blank_values=True)) status = is_valid(query=query_params, secret=client_secret) print("ok" if status else "fail")
```

### https://dev.vk.com/ru/mini-apps/development/launch-params-sign#JavaScript%20(Node.js)JavaScript (Node.js)
```
const crypto = require('crypto'); /** * Верифицирует параметры запуска. * @param searchOrParsedUrlQuery * @param {string} secretKey * @returns {boolean} */ function verifyLaunchParams(searchOrParsedUrlQuery, secretKey) { let sign; const queryParams = []; /** * Функция, которая обрабатывает входящий query-параметр. В случае передачи * параметра, отвечающего за подпись, подменяет "sign". В случае встречи * корректного в контексте подписи параметра добавляет его в массив * известных параметров. * @param key * @param value */ const processQueryParam = (key, value) => { if (typeof value === 'string') { if (key === 'sign') { sign = value; } else if (key.startsWith('vk_')) { queryParams.push({key, value}); } } }; if (typeof searchOrParsedUrlQuery === 'string') { // Если строка начинается с вопроса (когда передан window.location.search), // его необходимо удалить. const formattedSearch = searchOrParsedUrlQuery.startsWith('?') ? searchOrParsedUrlQuery.slice(1) : searchOrParsedUrlQuery; // Пытаемся разобрать строку как query-параметр. for (const param of formattedSearch.split('&')) { const [key, value] = param.split('='); processQueryParam(key, value); } } else { for (const key of Object.keys(searchOrParsedUrlQuery)) { const value = searchOrParsedUrlQuery[key]; processQueryParam(key, value); } } // Обрабатываем исключительный случай, когда не найдена ни подпись в параметрах, // ни один параметр, начинающийся с "vk_", чтобы избежать // излишней нагрузки, образующейся в процессе работы дальнейшего кода. if (!sign || queryParams.length === 0) { return false; } // Снова создаём запрос в виде строки из уже отфильтрованных параметров. const queryString = queryParams // Сортируем ключи в порядке возрастания. .sort((a, b) => a.key.localeCompare(b.key)) // Воссоздаём новый запрос в виде строки. .reduce((acc, {key, value}, idx) => { return acc + (idx === 0 ? '' : '&') + `${key}=${encodeURIComponent(value)}`; }, ''); // Создаём хеш получившейся строки на основе секретного ключа. const paramsHash = crypto .createHmac('sha256', secretKey) .update(queryString) .digest() .toString('base64') .replace(/\+/g, '-') .replace(/\//g, '_') .replace(/=$/, ''); return paramsHash === sign; } const url = 'https://example.com/?vk_user_id=494075&vk_app_id=6736218&vk_is_app_user=1&vk_are_notifications_enabled=1&vk_language=ru&vk_access_token_settings=&vk_platform=android&sign=htQFduJpLxz7ribXRZpDFUH-XEUhC9rBPTJkjUFEkRA'; const clientSecret = 'wvl68m4dR1UpLrVRli'; // Защищённый ключ из настроек вашего приложения // Берём только параметры запуска. const launchParams = decodeURIComponent(url.slice(url.indexOf('?') + 1)); // Проверяем, валидны ли параметры запуска. const areLaunchParamsValid = verifyLaunchParams(launchParams, clientSecret); console.log(areLaunchParamsValid ? 'ok' : 'fail');
```

### https://dev.vk.com/ru/mini-apps/development/launch-params-sign#%D0%94%D1%80%D1%83%D0%B3%D0%B8%D0%B5%20%D0%BF%D1%80%D0%B8%D0%BC%D0%B5%D1%80%D1%8BДругие примеры
Больше примеров — на GitHub: [https://github.com/VKCOM/vk-apps-launch-params](https://vk.com/away.php?to=https%3A%2F%2Fgithub.com%2FVKCOM%2Fvk-apps-launch-params)

```
https://github.com/VKCOM/vk-apps-launch-params
```

[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

