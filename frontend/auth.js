// Проверяем токен в URL при загрузке
window.addEventListener('DOMContentLoaded', () => {
    checkTokenInURL();
    
    // Обработчик кнопки авторизации
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.addEventListener('click', startAuth);
    }
    
    // Обработчик кнопки сохранения токена
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    if (saveTokenBtn) {
        saveTokenBtn.addEventListener('click', saveManualToken);
    }
});

// Начало авторизации - получаем user token для доступа к списку групп
function startAuth() {
    // Используем VK Admin app с redirect на blank.html
    const authUrl = `https://oauth.vk.com/authorize?` +
        `client_id=2685278&` +
        `scope=1073737727&` +
        `redirect_uri=https://oauth.vk.com/blank.html&` +
        `display=page&` +
        `response_type=token&` +
        `revoke=1`;
    
    // Открываем в новом окне
    const authWindow = window.open(authUrl, 'vk_auth', 'width=800,height=600');
    
    // Показываем инструкцию
    showResult('Скопируйте URL из адресной строки после авторизации и вставьте ниже', false);
    document.getElementById('manualTokenInput').style.display = 'block';
}

// Сохранение токена вручную
function saveManualToken() {
    const input = document.getElementById('tokenUrlInput');
    const url = input.value.trim();
    
    if (!url) {
        showResult('Вставьте URL', false);
        return;
    }
    
    // Извлекаем токен из URL
    const match = url.match(/access_token=([^&]+)/);
    if (!match) {
        showResult('Неверный формат URL', false);
        return;
    }
    
    const accessToken = match[1];
    
    // Извлекаем user_id
    const userIdMatch = url.match(/user_id=([^&]+)/);
    const userId = userIdMatch ? userIdMatch[1] : '';
    
    // Сохраняем
    localStorage.setItem('vk_access_token', accessToken);
    localStorage.setItem('vk_user_id', userId);
    localStorage.setItem('vk_token_expires', Date.now() + (365 * 24 * 60 * 60 * 1000));
    
    showResult('Токен сохранен!', true);
    
    // Переход на страницу выбора групп
    setTimeout(() => {
        window.location.href = 'groups.html';
    }, 1000);
}

function showResult(message, success) {
    const resultDiv = document.getElementById('authResult');
    resultDiv.className = 'result show ' + (success ? 'success' : 'error');
    resultDiv.innerHTML = success ? `<strong>✓ ${message}</strong>` : `<strong>✗ ${message}</strong>`;
}

// Проверка токена в URL (после редиректа)
function checkTokenInURL() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const userId = params.get('user_id');
    const expiresIn = params.get('expires_in');
    
    if (accessToken) {
        // Сохраняем user token для получения списка групп
        localStorage.setItem('vk_access_token', accessToken);
        localStorage.setItem('vk_user_id', userId || '');
        
        if (expiresIn === '0') {
            localStorage.setItem('vk_token_expires', Date.now() + (365 * 24 * 60 * 60 * 1000));
        } else {
            localStorage.setItem('vk_token_expires', Date.now() + (parseInt(expiresIn) * 1000));
        }
        
        // Очищаем URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Показываем успех
        showResult('Авторизация успешна!', true);
        
        // Переход на страницу выбора групп
        setTimeout(() => {
            window.location.href = 'groups.html';
        }, 1000);
    }
}
