const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : `${window.location.origin}/api`;

// Автоматическая авторизация через сервисный ключ
document.getElementById('autoServiceKeyBtn')?.addEventListener('click', async () => {
    const resultDiv = document.getElementById('serviceKeyResult');
    
    resultDiv.className = 'result show';
    resultDiv.style.background = '#fff3cd';
    resultDiv.style.color = '#856404';
    resultDiv.innerHTML = '<strong>⏳ Получение токена...</strong>';
    
    try {
        // Получаем сервисный ключ с backend
        const response = await fetch(`${API_URL}/vk/service-key`);
        const data = await response.json();
        
        if (data.error) {
            resultDiv.className = 'result show error';
            resultDiv.innerHTML = `<strong>✗ Ошибка!</strong><p>${data.error}</p>`;
            return;
        }
        
        // Сохраняем токен
        const serviceKey = data.service_key;
        localStorage.setItem('vk_access_token', serviceKey);
        localStorage.setItem('vk_token_expires', Date.now() + (365 * 24 * 60 * 60 * 1000));
        
        resultDiv.className = 'result show success';
        resultDiv.innerHTML = `
            <strong>✓ Авторизация успешна!</strong>
            <p>Токен сохранен</p>
            <br>
            <a href="index.html" class="btn" style="display: inline-block; text-decoration: none; margin-top: 10px;">
                Перейти к панели управления
            </a>
        `;
    } catch (error) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = `<strong>✗ Ошибка!</strong><p>${error.message}</p>`;
    }
});

// Ручной ввод токена
document.getElementById('manualTokenBtn')?.addEventListener('click', () => {
    const input = document.getElementById('manualTokenInput');
    const resultDiv = document.getElementById('manualTokenResult');
    const token = input.value.trim();
    
    if (!token) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = '<strong>✗ Ошибка!</strong><p>Введите токен</p>';
        return;
    }
    
    // Сохраняем токен
    localStorage.setItem('vk_access_token', token);
    localStorage.setItem('vk_token_expires', Date.now() + (365 * 24 * 60 * 60 * 1000));
    
    resultDiv.className = 'result show success';
    resultDiv.innerHTML = `
        <strong>✓ Токен сохранен!</strong>
        <br>
        <a href="index.html" class="btn" style="display: inline-block; text-decoration: none; margin-top: 10px;">
            Перейти к панели управления
        </a>
    `;
});
