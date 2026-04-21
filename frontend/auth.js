const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : `${window.location.origin}/api`;

// Проверяем код в URL при загрузке
window.addEventListener('DOMContentLoaded', () => {
    checkCodeInURL();
    initVKID();
});

// Проверка кода авторизации в URL
function checkCodeInURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const deviceId = urlParams.get('device_id');
    
    if (code) {
        exchangeCodeForToken(code, deviceId);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Обмен кода на токен
async function exchangeCodeForToken(code, deviceId) {
    const resultDiv = document.getElementById('authResult');
    resultDiv.className = 'result show';
    resultDiv.style.background = '#fff3cd';
    resultDiv.innerHTML = '<strong>⏳ Получение токена...</strong>';
    
    try {
        const response = await fetch(`${API_URL}/vk/exchange-code`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                code: code,
                redirect_uri: window.location.origin + '/auth.html',
                device_id: deviceId,
                code_verifier: sessionStorage.getItem('vk_code_verifier')
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            resultDiv.className = 'result show error';
            resultDiv.innerHTML = `<strong>✗ Ошибка!</strong><p>${data.error}</p>`;
            return;
        }
        
        // Сохраняем токен
        localStorage.setItem('vk_access_token', data.access_token);
        localStorage.setItem('vk_user_id', data.user_id);
        localStorage.setItem('vk_token_expires', Date.now() + (data.expires_in * 1000));
        
        resultDiv.className = 'result show success';
        resultDiv.innerHTML = `
            <strong>✓ Авторизация успешна!</strong>
            <p>User ID: ${data.user_id}</p>
            <br>
            <a href="index.html" class="btn" style="display: inline-block; text-decoration: none;">
                Перейти к панели управления
            </a>
        `;
    } catch (error) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = `<strong>✗ Ошибка!</strong><p>${error.message}</p>`;
    }
}

// Инициализация VK ID SDK
async function initVKID() {
    if (!window.VKIDSDK) {
        console.error('VK ID SDK not loaded');
        return;
    }
    
    try {
        // Генерируем PKCE параметры
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        sessionStorage.setItem('vk_code_verifier', codeVerifier);
        
        // Инициализируем SDK
        await window.VKIDSDK.Config.init({
            app: 54481712,
            redirectUrl: window.location.origin + '/auth.html',
            state: 'random_state',
            codeChallenge: codeChallenge,
            codeChallengeMethod: 'S256'
        });
        
        // Создаем кнопку
        const oneTap = new window.VKIDSDK.OneTap();
        oneTap.render({
            container: document.getElementById('vk-button-container'),
            scheme: window.VKIDSDK.Scheme.LIGHT,
            lang: window.VKIDSDK.Languages.RUS
        });
        
    } catch (error) {
        console.error('VK ID init error:', error);
    }
}

// PKCE функции
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
