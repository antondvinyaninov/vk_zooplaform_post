/**
 * Утилиты для работы с VK API
 */

// API URL
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost/api' 
    : `${window.location.origin}/api`;

/**
 * Получение токена из localStorage
 */
function getAccessToken() {
    return localStorage.getItem('vk_access_token');
}

/**
 * Получение ID пользователя
 */
function getUserId() {
    return localStorage.getItem('vk_user_id');
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
    localStorage.removeItem('vk_access_token');
    localStorage.removeItem('vk_user_id');
    localStorage.removeItem('vk_user_name');
    localStorage.removeItem('vk_user_photo');
    window.location.href = 'pages/auth.html';
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
