Title: Экран запуска приложения | VK для разработчиков

Description: Мощная платформа для ваших проектов. Разрабатывайте приложения и используйте все возможности ВКонтакте в вашем бизнесе

Source: https://dev.vk.com/ru/mini-apps/development/lottie

---

Пока мини-приложение не проинициализировало соединение с платформой с помощью события [VKWebAppInit](https://dev.vk.com/ru/bridge/VKWebAppInit), пользователь будет видеть экран запуска. По умолчанию это [квадратная иконка для каталога](https://dev.vk.com/ru/mini-apps/settings/general/design#%D0%98%D0%BA%D0%BE%D0%BD%D0%BA%D0%B0%20%D0%B4%D0%BB%D1%8F%20%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3%D0%B0%20%D0%B8%20%D1%81%D0%BD%D0%B8%D0%BF%D0%BF%D0%B5%D1%82%D0%BE%D0%B2) на белом фоне. Вместо статичной картинки вы можете добавить анимацию.

```
VKWebAppInit
```

Экран запуска

Подготовьте векторное изображение в формате [Lottie](https://vk.com/away.php?to=https%3A%2F%2Flottiefiles.com%2Fwhat-is-lottie). Если у вас есть готовые SVG-файлы, воспользуйтесь [онлайн-конвертером SVG в Lottie](https://vk.com/away.php?to=https%3A%2F%2Flottiefiles.com%2Fsvg-to-lottie).

- •
Максимальный размер файла: 24 Кбайта.

- •
Размер изображения: 96×96 px.

Максимальный размер файла: 24 Кбайта.
Размер изображения: 96×96 px.

Работа Lottie-анимаций отличается на разных платформах. Мы рекомендуем сверяться с [таблицей поддерживаемых функций](https://vk.com/away.php?to=https%3A%2F%2Fairbnb.io%2Flottie%2F%23%2Fsupported-features) и тестировать экраны загрузки на разных платформах.

### https://dev.vk.com/ru/mini-apps/development/lottie#%D0%9F%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%B4%D0%BB%D1%8F%20AndroidПриложение для Android
Внимание! Android не поддерживает 3D-анимацию на Lottie-экранах.
Для Android используется библиотека lottie-android от [Airbnb](https://vk.com/away.php?to=https%3A%2F%2Fgithub.com%2Fairbnb%2Flottie-android). Анимации можно проверять с помощью предварительного просмотра на сайте [LottieFiles](https://vk.com/away.php?to=https%3A%2F%2Flottiefiles.com%2Fpreview).

```
lottie-android
```

### https://dev.vk.com/ru/mini-apps/development/lottie#%D0%9F%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%B4%D0%BB%D1%8F%20iOSПриложение для iOS
Для iOS используется библиотека [rlottie](https://vk.com/away.php?to=https%3A%2F%2Frlottie.com) от [Samsung](https://vk.com/away.php?to=https%3A%2F%2Fgithub.com%2FSamsung%2Frlottie). Анимации можно проверять с помощью предварительного просмотра на сайте rlottie. На всех платформах RLottie воспроизводится одинаково.

```
rlottie
```


#### https://dev.vk.com/ru/mini-apps/development/lottie#%D0%95%D1%81%D0%BB%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BD%D0%B5%20%D0%B2%D0%BE%D1%81%D0%BF%D1%80%D0%BE%D0%B8%D0%B7%D0%B2%D0%BE%D0%B4%D0%B8%D1%82%D1%81%D1%8FЕсли анимация не воспроизводится
Если на сайте [rlottie](https://vk.com/away.php?to=https%3A%2F%2Frlottie.com) анимация не работает, добавьте "ddd": 0 в каждый объект в массиве layers.

```
"ddd": 0
```


```
layers
```

### https://dev.vk.com/ru/mini-apps/development/lottie#%D0%9C%D0%BE%D0%B1%D0%B8%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F%20%D0%B8%20%D0%B4%D0%B5%D1%81%D0%BA%D1%82%D0%BE%D0%BF%D0%BD%D0%B0%D1%8F%20%D0%B2%D0%B5%D1%80%D1%81%D0%B8%D0%B8%20%D1%81%D0%B0%D0%B9%D1%82%D0%B0Мобильная и десктопная версии сайта
В десктопной версии сайта ВКонтакте используется библиотека lottie-web от [Airbnb](https://vk.com/away.php?to=https%3A%2F%2Fgithub.com%2Fairbnb%2Flottie-web). [Таблица поддерживаемых функций](https://vk.com/away.php?to=https%3A%2F%2Fairbnb.io%2Flottie%2F%23%2Fsupported-features).

```
lottie-web
```

1. 1.Откройте [список приложений](https://vk.com/away.php?to=https%3A%2F%2Fdev.vk.com%2Fru%2Fadmin%2Fapps-list) и нажмите Настройки. В разделе [Оформление](https://dev.vk.com/ru/mini-apps/settings/general/design) перейдите на вкладку Экран запуска.
2. 2.Укажите HEX-код фонового цвета. Пример: #54C45D.
3. 3.Загрузите изображение — файл в формате Lottie.
4. 4.Поставьте флажок Анимация, если изображение анимированное.
5. 5.Нажмите Сохранить изменения.
[список приложений](https://vk.com/away.php?to=https%3A%2F%2Fdev.vk.com%2Fru%2Fadmin%2Fapps-list)
[Оформление](https://dev.vk.com/ru/mini-apps/settings/general/design)
Настройка экрана загрузки мини-приложения
[Документация](https://dev.vk.com/guide)
[API](https://dev.vk.com/reference)
[Сообщество](https://dev.vk.com/community)
[Мои приложения](https://vk.com/away.php?to=https://vk.com/apps?act=manage)

Вносим кое-какие изменения в код. Постараемся возобновить работу как можно скорее.

