// Проверяем токен в URL при загрузке
window.addEventListener('DOMContentLoaded', () => {
    checkTokenInURL();
});

// Проверка токена в URL (после редиректа)
function checkTokenInURL() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const userId = params.get('user_id');
    const expiresIn = params.get('expires_in');
    
    if (accessToken) {
        // Сохраняем токен
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
        const resultDiv = document.getElementById('authResult');
        resultDiv.className = 'result show success';
        resultDiv.innerHTML = `
            <strong>✓ Авторизация успешна!</strong>
            <p>User ID: ${userId}</p>
            <br>
            <a href="index.html" class="btn" style="display: inline-block; text-decoration: none;">
                Перейти к панели управления
            </a>
        `;
    }
}

// Кнопка авторизации
document.getElementById('vkAuthBtn')?.addEventListener('click', () => {
    // Используем ваше приложение с вашим доменом
    const clientId = 54481712;
    const redirectUri = window.location.origin + '/auth.html';
    const scope = 'wall,groups,photos,video,offline';
    
    const authUrl = `https://oauth.vk.com/authorize?` +
        `client_id=${clientId}` +
        `&display=page` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${scope}` +
        `&response_type=token` +
        `&v=5.131` +
        `&revoke=1`;
    
    window.location.href = authUrl;
});
