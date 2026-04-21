const authBtn = document.getElementById('authBtn');
const tokenResult = document.getElementById('tokenResult');
const appIdInput = document.getElementById('appId');

// Проверяем, есть ли код в URL (после редиректа от VK)
function checkCodeInURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        // Обмениваем код на токен
        exchangeCodeForToken(code);
        
        // Очищаем URL от кода
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Обмен кода на токен через бэкенд
async function exchangeCodeForToken(code) {
    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000/api' 
        : `${window.location.origin}/api`;
    
    const redirectUri = window.location.origin + '/auth.html';
    
    tokenResult.className = 'result show';
    tokenResult.style.background = '#fff3cd';
    tokenResult.style.color = '#856404';
    tokenResult.innerHTML = '<strong>⏳ Получение токена...</strong>';
    
    try {
        const response = await fetch(`${API_URL}/vk/exchange-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: code,
                redirect_uri: redirectUri
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            tokenResult.className = 'result show error';
            tokenResult.innerHTML = `
                <strong>✗ Ошибка!</strong>
                <p>${data.error}</p>
            `;
            return;
        }
        
        // Сохраняем токен
        localStorage.setItem('vk_access_token', data.access_token);
        localStorage.setItem('vk_user_id', data.user_id);
        localStorage.setItem('vk_token_expires', Date.now() + (data.expires_in * 1000));
        
        tokenResult.className = 'result show success';
        tokenResult.innerHTML = `
            <strong>✓ Авторизация успешна!</strong>
            <p>Токен сохранён</p>
            <p>User ID: ${data.user_id}</p>
            <p>Действителен: ${Math.floor(data.expires_in / 3600)} часов</p>
            <br>
            <a href="index.html" class="btn" style="display: inline-block; text-decoration: none; margin-top: 10px;">
                Перейти к панели управления
            </a>
        `;
    } catch (error) {
        tokenResult.className = 'result show error';
        tokenResult.innerHTML = `
            <strong>✗ Ошибка!</strong>
            <p>${error.message}</p>
        `;
    }
}

// Авторизация через VK
function authorizeVK() {
    const appId = appIdInput.value.trim();
    
    if (!appId) {
        tokenResult.className = 'result show error';
        tokenResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Введите App ID</p>';
        return;
    }
    
    // Сохраняем App ID для будущего использования
    localStorage.setItem('vk_app_id', appId);
    
    // Параметры авторизации (Authorization Code Flow)
    const redirectUri = encodeURIComponent(window.location.origin + '/auth.html');
    const scope = 'wall,photos,video,groups'; // Права доступа
    const display = 'page';
    const responseType = 'code'; // Используем code вместо token
    const v = '5.131';
    
    // Формируем URL для авторизации
    const authUrl = `https://oauth.vk.com/authorize?client_id=${appId}&display=${display}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&v=${v}`;
    
    // Перенаправляем на страницу авторизации VK
    window.location.href = authUrl;
}

// Загружаем сохранённый App ID
window.addEventListener('DOMContentLoaded', () => {
    const savedAppId = localStorage.getItem('vk_app_id');
    if (savedAppId) {
        appIdInput.value = savedAppId;
    } else {
        // Устанавливаем App ID по умолчанию
        appIdInput.value = '54481712';
    }
    
    // Проверяем токен в URL
    checkTokenInURL();
});

authBtn.addEventListener('click', authorizeVK);
