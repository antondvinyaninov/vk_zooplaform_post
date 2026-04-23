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

function redirectAfterVKConnect() {
    const appUser = AppStorage.getItem('app_user');
    const authTime = AppStorage.getItem('app_auth_time');
    const isAppSessionValid =
        !!appUser &&
        !!authTime &&
        (Date.now() - parseInt(authTime, 10)) < 24 * 60 * 60 * 1000;

    window.location.href = isAppSessionValid ? '/vk-connect' : '/';
}

async function saveVKConnectionToBackend(payload) {
    const response = await fetch(`${API_URL}/admin/vk/connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить подключение ВКонтакте');
    }

    return data;
}

function applyActiveVKAccountToSession(connectionPayload) {
    const active = connectionPayload?.active_account;
    if (!active || !active.access_token) {
        return;
    }

    AppStorage.setItem('vk_access_token', active.access_token);
    if (active.vk_user_id) {
        AppStorage.setItem('vk_user_id', String(active.vk_user_id));
    }
    if (active.token_expires) {
        AppStorage.setItem('vk_token_expires', String(active.token_expires));
    }
    if (active.user_name) {
        AppStorage.setItem('vk_user_name', active.user_name);
    }
    if (active.user_photo) {
        AppStorage.setItem('vk_user_photo', active.user_photo);
    }
}

// Начало авторизации - получаем user token для доступа к списку групп
function startAuth() {
    // Используем VK Admin app для получения токена с полными правами (как в старой версии)
    const authUrl = `https://oauth.vk.com/authorize?` +
        `client_id=2685278&` +
        `scope=wall,photos,video,groups&` +
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
async function saveManualToken() {
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
    AppStorage.setItem('vk_access_token', accessToken);
    AppStorage.setItem('vk_user_id', userId);
    const tokenExpires = Date.now() + (365 * 24 * 60 * 60 * 1000);
    AppStorage.setItem('vk_token_expires', tokenExpires);
    
    showResult('Токен сохранен! Получаем информацию о пользователе...', true);
    
    // Получаем информацию о пользователе
    if (userId) {
        await getUserInfo(accessToken, userId, tokenExpires);
    } else {
        try {
            const payload = await saveVKConnectionToBackend({
                access_token: accessToken,
                token_expires: tokenExpires,
            });
            applyActiveVKAccountToSession(payload);
        } catch (error) {
            showResult(error.message, false);
            return;
        }

        // Переход в панель управления (или на вход, если сессия истекла)
        setTimeout(() => {
            redirectAfterVKConnect();
        }, 1000);
    }
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
        AppStorage.setItem('vk_access_token', accessToken);
        AppStorage.setItem('vk_user_id', userId || '');
        let tokenExpires = 0;

        if (expiresIn === '0') {
            tokenExpires = Date.now() + (365 * 24 * 60 * 60 * 1000);
        } else {
            tokenExpires = Date.now() + (parseInt(expiresIn, 10) * 1000);
        }
        AppStorage.setItem('vk_token_expires', tokenExpires);
        
        // Получаем информацию о пользователе
        getUserInfo(accessToken, userId, tokenExpires);
        
        // Очищаем URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Показываем успех
        showResult('Авторизация успешна! Получаем информацию о пользователе...', true);
    }
}

// Получение информации о пользователе
async function getUserInfo(accessToken, userId, tokenExpires) {
    try {
        const response = await fetch(`${API_URL}/vk/user-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: accessToken,
                user_id: userId ? parseInt(userId, 10) : 0,
                user_id_raw: userId || '',
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Не удалось получить профиль ВКонтакте');
        }
        let fullName = '';
        let photo200 = '';

        if (data.user) {
            const user = data.user;
            fullName = `${user.first_name} ${user.last_name}`;
            photo200 = user.photo_200 || '';
            
            // Сохраняем информацию о пользователе
            AppStorage.setItem('vk_user_name', fullName);
            AppStorage.setItem('vk_user_photo', photo200);
            
            showResult(`Добро пожаловать, ${fullName}!`, true);
        }

        const payload = await saveVKConnectionToBackend({
            access_token: accessToken,
            vk_user_id: userId ? parseInt(userId, 10) : 0,
            user_name: fullName,
            user_photo: photo200,
            token_expires: tokenExpires || 0,
        });
        applyActiveVKAccountToSession(payload);
        
        // Переход в панель управления (или на вход, если сессия истекла)
        setTimeout(() => {
            redirectAfterVKConnect();
        }, 1500);
        
    } catch (error) {
        console.error('Error getting user info:', error);
        showResult(error.message || 'Ошибка сохранения подключения', false);
        return;
    }
}
