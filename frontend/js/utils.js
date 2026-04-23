/**
 * Утилиты для работы с VK API
 */

const APP_STORAGE_PREFIX = 'vkzp_';

function appStorageCookieName(key) {
    return `${APP_STORAGE_PREFIX}${key}`;
}

function parseCookieMap() {
    const result = {};
    const raw = document.cookie ? document.cookie.split(';') : [];

    raw.forEach((item) => {
        const trimmed = item.trim();
        if (!trimmed) {
            return;
        }

        const separatorIndex = trimmed.indexOf('=');
        const encodedName = separatorIndex >= 0 ? trimmed.slice(0, separatorIndex) : trimmed;
        const encodedValue = separatorIndex >= 0 ? trimmed.slice(separatorIndex + 1) : '';
        const name = decodeURIComponent(encodedName);

        if (!name.startsWith(APP_STORAGE_PREFIX)) {
            return;
        }

        const key = name.slice(APP_STORAGE_PREFIX.length);
        result[key] = decodeURIComponent(encodedValue);
    });

    return result;
}

const AppStorage = {
    getItem(key) {
        const map = parseCookieMap();
        return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
    },
    setItem(key, value) {
        const safeValue = value == null ? '' : String(value);
        const encodedName = encodeURIComponent(appStorageCookieName(key));
        const encodedValue = encodeURIComponent(safeValue);
        document.cookie = `${encodedName}=${encodedValue}; path=/; max-age=31536000; SameSite=Lax`;
    },
    removeItem(key) {
        const encodedName = encodeURIComponent(appStorageCookieName(key));
        document.cookie = `${encodedName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    },
    key(index) {
        const keys = Object.keys(parseCookieMap());
        return keys[index] ?? null;
    },
    clear() {
        const keys = Object.keys(parseCookieMap());
        keys.forEach((key) => this.removeItem(key));
    },
    get length() {
        return Object.keys(parseCookieMap()).length;
    }
};

window.AppStorage = AppStorage;

// API URL
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : `${window.location.origin}/api`;

/**
 * Получение токена доступа
 */
function getAccessToken() {
    return AppStorage.getItem('vk_access_token');
}

/**
 * Получение ID пользователя
 */
function getUserId() {
    return AppStorage.getItem('vk_user_id');
}

/**
 * Проверка авторизации
 */
function isAuthorized() {
    return !!getAccessToken();
}

/**
 * Выход из аккаунта
 */
function logout() {
    // Очищаем данные авторизации в системе
    AppStorage.removeItem('app_user');
    AppStorage.removeItem('app_auth_time');
    
    // Очищаем данные ВК
    AppStorage.removeItem('vk_access_token');
    AppStorage.removeItem('vk_user_id');
    AppStorage.removeItem('vk_user_name');
    AppStorage.removeItem('vk_user_photo');
    AppStorage.removeItem('vk_selected_groups');
    AppStorage.removeItem('vk_selected_groups_data');
    AppStorage.removeItem('vk_group_tokens');
    
    // Переходим на главную
    window.location.href = '/';
}

/**
 * Показать сообщение об ошибке
 */
function showError(element, message) {
    element.className = 'result show error';
    element.innerHTML = `<strong>✗ Ошибка!</strong><p>${message}</p>`;
}

/**
 * Показать сообщение об успехе
 */
function showSuccess(element, message) {
    element.className = 'result show success';
    element.innerHTML = `<strong>✓ Успешно!</strong><p>${message}</p>`;
}

/**
 * Показать загрузку
 */
function showLoading(element, message = 'Загрузка...') {
    element.className = 'result show';
    element.style.background = '#fff3cd';
    element.style.color = '#856404';
    element.innerHTML = `<strong>⏳ ${message}</strong>`;
}

/**
 * Форматирование даты
 */
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Форматирование числа (1000 -> 1K)
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Парсинг ID группы из разных форматов
 */
function parseGroupId(input) {
    input = input.trim();
    
    // Если это число с минусом
    if (input.startsWith('-') && !isNaN(input.substring(1))) {
        return input;
    }
    
    // Если это просто число
    if (!isNaN(input)) {
        return '-' + input;
    }
    
    // Если это URL
    if (input.includes('vk.com/')) {
        const match = input.match(/vk\.com\/([^/?#]+)/);
        if (match) {
            return match[1];
        }
    }
    
    // Иначе это короткое имя
    return input;
}
