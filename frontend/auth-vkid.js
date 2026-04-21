const tokenResult = document.getElementById('tokenResult');

// Проверяем, есть ли код в URL (после редиректа от VK ID)
function checkCodeInURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const deviceId = urlParams.get('device_id');
    
    if (code) {
        // Обмениваем код на токен
        exchangeCodeForToken(code, deviceId);
        
        // Очищаем URL от параметров
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Обмен кода на токен через бэкенд
async function exchangeCodeForToken(code, deviceId) {
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
                redirect_uri: redirectUri,
                device_id: deviceId,
                code_verifier: sessionStorage.getItem('vk_code_verifier')
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
        localStorage.setItem('vk_refresh_token', data.refresh_token);
        localStorage.setItem('vk_user_id', data.user_id);
        localStorage.setItem('vk_token_expires', Date.now() + (data.expires_in * 1000));
        
        // Получаем информацию о пользователе
        await getUserInfo(data.access_token, data.user_id);
        
    } catch (error) {
        console.error('Token exchange error:', error);
        tokenResult.className = 'result show error';
        tokenResult.innerHTML = `
            <strong>✗ Ошибка!</strong>
            <p>${error.message}</p>
        `;
    }
}

// Получение информации о пользователе
async function getUserInfo(accessToken, userId) {
    try {
        const API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:8000/api' 
            : `${window.location.origin}/api`;
        
        console.log('Fetching user info for user:', userId);
        
        const response = await fetch(`${API_URL}/vk/user-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                access_token: accessToken,
                user_id: userId
            })
        });
        
        console.log('User info response status:', response.status);
        
        const data = await response.json();
        console.log('User info data:', data);
        
        if (data.error) {
            console.error('User info API error:', data.error);
            throw new Error(data.error);
        }
        
        const user = data.response?.[0];
        
        if (user) {
            // Сохраняем информацию о пользователе
            localStorage.setItem('vk_user_name', `${user.first_name} ${user.last_name}`);
            localStorage.setItem('vk_user_photo', user.photo_200);
            
            console.log('User info saved:', user.first_name, user.last_name);
            
            tokenResult.className = 'result show success';
            tokenResult.innerHTML = `
                <div style="text-align: center;">
                    <img src="${user.photo_200}" alt="${user.first_name}" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 15px;">
                    <h3 style="margin: 10px 0;">${user.first_name} ${user.last_name}</h3>
                    <strong>✓ Авторизация успешна!</strong>
                    <p>User ID: ${userId}</p>
                    <br>
                    <a href="index.html" class="btn" style="display: inline-block; text-decoration: none; margin-top: 10px;">
                        Перейти к панели управления
                    </a>
                </div>
            `;
        } else {
            console.warn('No user data in response');
            throw new Error('Не удалось получить данные пользователя');
        }
    } catch (error) {
        console.error('User info error:', error);
        // Показываем успех даже если не удалось получить инфо
        tokenResult.className = 'result show success';
        tokenResult.innerHTML = `
            <strong>✓ Авторизация успешна!</strong>
            <p>User ID: ${userId}</p>
            <p style="color: #856404; font-size: 12px;">⚠ Не удалось загрузить данные профиля</p>
            <br>
            <a href="index.html" class="btn" style="display: inline-block; text-decoration: none; margin-top: 10px;">
                Перейти к панели управления
            </a>
        `;
    }
}

// Генерация code_verifier и code_challenge для PKCE
function generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
}

function base64URLEncode(buffer) {
    const base64 = btoa(String.fromCharCode.apply(null, buffer));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(new Uint8Array(hash));
}

// Инициализация VK ID SDK
async function initVKID() {
    try {
        // Генерируем PKCE параметры
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        
        // Сохраняем verifier для последующего использования
        sessionStorage.setItem('vk_code_verifier', codeVerifier);
        
        // Конфигурация VK ID
        await window.VKIDSDK.Config.init({
            app: 54481712, // App ID
            redirectUrl: window.location.origin + '/auth.html',
            state: 'random_state_string',
            scope: 'email phone',
            codeChallenge: codeChallenge,
            codeChallengeMethod: 'S256'
        });

        // Создаем кнопку авторизации
        const oneTap = new window.VKIDSDK.OneTap();
        
        const container = document.getElementById('vk-auth-button');
        
        if (!container) {
            console.error('Container not found');
            return;
        }
        
        // Рендерим кнопку
        oneTap.render({
            container: container,
            scheme: window.VKIDSDK.Scheme.LIGHT,
            lang: window.VKIDSDK.Languages.RUS,
            styles: {
                width: 100,
                height: 48
            }
        });

        console.log('VK ID SDK initialized successfully');

    } catch (error) {
        console.error('VK ID initialization error:', error);
        tokenResult.className = 'result show error';
        tokenResult.innerHTML = `
            <strong>✗ Ошибка инициализации!</strong>
            <p>${error.message}</p>
            <p>Попробуйте обновить страницу</p>
        `;
    }
}

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    // Сначала проверяем код в URL
    checkCodeInURL();
    
    // Затем инициализируем VK ID SDK
    if (window.VKIDSDK) {
        initVKID();
    } else {
        console.error('VK ID SDK not loaded');
    }
});
