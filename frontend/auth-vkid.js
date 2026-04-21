const tokenResult = document.getElementById('tokenResult');

// Инициализация VK ID SDK
async function initVKID() {
    try {
        // Конфигурация VK ID
        await window.VKIDSDK.Config.init({
            app: 54481712, // App ID
            redirectUrl: window.location.origin + '/auth.html',
            state: 'random_state_string',
            scope: 'email phone'
        });

        // Создаем кнопку авторизации
        const oneTap = new window.VKIDSDK.OneTap();
        
        const container = document.getElementById('vk-auth-button');
        
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

        // Обработка успешной авторизации
        oneTap.on(window.VKIDSDK.OneTapInternalEvents.LOGIN_SUCCESS, handleVKIDAuth);
        
        // Обработка ошибок
        oneTap.on(window.VKIDSDK.OneTapInternalEvents.SHOW_LOGIN_OPTIONS, () => {
            console.log('Show login options');
        });

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

// Обработка авторизации через VK ID
async function handleVKIDAuth(response) {
    console.log('VK ID Auth response:', response);
    
    tokenResult.className = 'result show';
    tokenResult.style.background = '#fff3cd';
    tokenResult.style.color = '#856404';
    tokenResult.innerHTML = '<strong>⏳ Получение токена...</strong>';
    
    try {
        // Получаем код авторизации
        const code = response.code || response.payload?.code;
        const deviceId = response.device_id || response.payload?.device_id;
        
        if (!code) {
            throw new Error('Код авторизации не получен');
        }

        // Обмениваем код на токен через наш бэкенд
        const API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:8000/api' 
            : `${window.location.origin}/api`;
        
        const redirectUri = window.location.origin + '/auth.html';
        
        const apiResponse = await fetch(`${API_URL}/vk/exchange-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: code,
                redirect_uri: redirectUri,
                device_id: deviceId
            })
        });
        
        const data = await apiResponse.json();
        
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
        console.error('Token exchange error:', error);
        tokenResult.className = 'result show error';
        tokenResult.innerHTML = `
            <strong>✗ Ошибка!</strong>
            <p>${error.message}</p>
        `;
    }
}

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', initVKID);
