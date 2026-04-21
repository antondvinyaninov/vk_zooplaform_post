const authBtn = document.getElementById('authBtn');
const tokenResult = document.getElementById('tokenResult');
const appIdInput = document.getElementById('appId');

// Проверяем, есть ли токен в URL (после редиректа от VK)
function checkTokenInURL() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    const userId = params.get('user_id');
    
    if (accessToken) {
        // Сохраняем токен в localStorage
        localStorage.setItem('vk_access_token', accessToken);
        localStorage.setItem('vk_user_id', userId);
        localStorage.setItem('vk_token_expires', Date.now() + (expiresIn * 1000));
        
        tokenResult.className = 'result show success';
        tokenResult.innerHTML = `
            <strong>✓ Авторизация успешна!</strong>
            <p>Токен сохранён</p>
            <p>User ID: ${userId}</p>
            <p>Действителен: ${Math.floor(expiresIn / 3600)} часов</p>
            <br>
            <a href="index.html" class="btn" style="display: inline-block; text-decoration: none; margin-top: 10px;">
                Перейти к панели управления
            </a>
        `;
        
        // Очищаем URL от токена
        window.history.replaceState({}, document.title, window.location.pathname);
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
    
    // Параметры авторизации
    // Используем blank.html - официальный redirect URI, работает всегда
    const redirectUri = encodeURIComponent('https://oauth.vk.com/blank.html');
    const scope = 'wall,photos,video,groups'; // Права доступа
    const display = 'page';
    const responseType = 'token';
    const v = '5.131';
    
    // Формируем URL для авторизации
    const authUrl = `https://oauth.vk.com/authorize?client_id=${appId}&display=${display}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&v=${v}`;
    
    // Открываем в новом окне
    const width = 600;
    const height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    const authWindow = window.open(
        authUrl,
        'vk_auth',
        `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Показываем инструкцию
    tokenResult.className = 'result show';
    tokenResult.style.background = '#fff3cd';
    tokenResult.style.color = '#856404';
    tokenResult.style.border = '1px solid #ffeaa7';
    tokenResult.innerHTML = `
        <strong>📋 Инструкция:</strong>
        <ol style="text-align: left; margin: 10px 0; padding-left: 20px;">
            <li>Разрешите доступ приложению в открывшемся окне</li>
            <li>После авторизации скопируйте URL из адресной строки</li>
            <li>Вставьте URL в поле ниже</li>
        </ol>
        <div class="form-group" style="margin-top: 15px;">
            <input type="text" id="tokenUrl" placeholder="Вставьте URL с токеном" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
        </div>
        <button id="extractTokenBtn" class="btn" style="margin-top: 10px;">Извлечь токен</button>
    `;
    
    // Добавляем обработчик для кнопки извлечения токена
    setTimeout(() => {
        const extractBtn = document.getElementById('extractTokenBtn');
        if (extractBtn) {
            extractBtn.addEventListener('click', extractTokenFromUrl);
        }
    }, 100);
}

// Извлечение токена из URL
function extractTokenFromUrl() {
    const tokenUrlInput = document.getElementById('tokenUrl');
    const url = tokenUrlInput.value.trim();
    
    if (!url) {
        tokenResult.className = 'result show error';
        tokenResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Вставьте URL</p>';
        return;
    }
    
    try {
        // Извлекаем параметры из hash
        const hashPart = url.includes('#') ? url.split('#')[1] : '';
        const params = new URLSearchParams(hashPart);
        
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        const userId = params.get('user_id');
        
        if (!accessToken) {
            tokenResult.className = 'result show error';
            tokenResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Токен не найден в URL. Убедитесь, что скопировали правильный URL</p>';
            return;
        }
        
        // Сохраняем токен
        localStorage.setItem('vk_access_token', accessToken);
        localStorage.setItem('vk_user_id', userId);
        localStorage.setItem('vk_token_expires', Date.now() + (expiresIn * 1000));
        
        tokenResult.className = 'result show success';
        tokenResult.innerHTML = `
            <strong>✓ Авторизация успешна!</strong>
            <p>Токен сохранён</p>
            <p>User ID: ${userId}</p>
            <p>Действителен: ${Math.floor(expiresIn / 3600)} часов</p>
            <br>
            <a href="index.html" class="btn" style="display: inline-block; text-decoration: none; margin-top: 10px;">
                Перейти к панели управления
            </a>
        `;
    } catch (error) {
        tokenResult.className = 'result show error';
        tokenResult.innerHTML = `<strong>✗ Ошибка!</strong><p>${error.message}</p>`;
    }
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
