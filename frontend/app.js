const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : `${window.location.origin}/api`;

console.log('[App] Initializing VK SMM Panel');
console.log('[App] API URL:', API_URL);

const connectAccountBtn = document.getElementById('connectAccountBtn');
const accountStatus = document.getElementById('accountStatus');
const mainContent = document.getElementById('mainContent');
const postBtn = document.getElementById('postBtn');
const postResult = document.getElementById('postResult');
const targetGroupSelect = document.getElementById('targetGroup');
const connectedGroupsDiv = document.getElementById('connectedGroups');

// Проверка авторизации
function checkAuth() {
    console.log('[App] Checking auth status...');
    
    const accessToken = localStorage.getItem('vk_access_token');
    const tokenExpires = localStorage.getItem('vk_token_expires');
    const userId = localStorage.getItem('vk_user_id');
    const userName = localStorage.getItem('vk_user_name');
    const userPhoto = localStorage.getItem('vk_user_photo');
    
    console.log('[App] Auth data:', {
        hasToken: !!accessToken,
        userId,
        userName,
        hasPhoto: !!userPhoto,
        tokenExpires: tokenExpires ? new Date(parseInt(tokenExpires)).toLocaleString() : 'none'
    });
    
    if (accessToken && tokenExpires && Date.now() < parseInt(tokenExpires)) {
        console.log('[App] User is authenticated');
        // Аккаунт подключен
        let userInfoHTML = '';
        
        if (userPhoto && userName) {
            userInfoHTML = `
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <img src="${userPhoto}" alt="${userName}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #667eea;">
                    <div>
                        <h3 style="margin: 0 0 5px 0; color: #333;">${userName}</h3>
                        <p style="margin: 0; color: #666;">User ID: ${userId}</p>
                    </div>
                </div>
            `;
        }
        
        accountStatus.innerHTML = `
            <div class="result show success">
                ${userInfoHTML}
                <strong>✓ Аккаунт подключен</strong>
                <p>Токен действителен до: ${new Date(parseInt(tokenExpires)).toLocaleString('ru-RU')}</p>
            </div>
        `;
        connectAccountBtn.textContent = 'Переподключить аккаунт';
        mainContent.style.display = 'block';
        
        loadConnectedGroups();
    } else {
        console.log('[App] User is not authenticated');
        // Аккаунт не подключен
        accountStatus.innerHTML = `
            <div class="result show error">
                <strong>⚠ Аккаунт не подключен</strong>
                <p>Подключите ваш аккаунт VK для начала работы</p>
            </div>
        `;
        connectAccountBtn.textContent = 'Подключить аккаунт VK';
        mainContent.style.display = 'none';
    }
}

// Загрузка подключенных групп
function loadConnectedGroups() {
    console.log('[App] Loading connected groups...');
    
    const groupsData = localStorage.getItem('vk_selected_groups_data');
    
    if (!groupsData) {
        console.log('[App] No groups data found');
        connectedGroupsDiv.innerHTML = `
            <div class="result show error">
                <strong>⚠ Группы не подключены</strong>
                <p>Перейдите в управление группами и выберите группы для постинга</p>
            </div>
        `;
        targetGroupSelect.innerHTML = '<option value="">Сначала подключите группы</option>';
        return;
    }
    
    const groups = JSON.parse(groupsData);
    
    if (groups.length === 0) {
        connectedGroupsDiv.innerHTML = `
            <div class="result show error">
                <strong>⚠ Группы не подключены</strong>
                <p>Перейдите в управление группами и выберите группы для постинга</p>
            </div>
        `;
        targetGroupSelect.innerHTML = '<option value="">Сначала подключите группы</option>';
        return;
    }
    
    // Показываем список групп с аватарками
    let groupsHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 10px;">';
    groups.forEach(group => {
        groupsHTML += `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <img src="${group.photo_200}" alt="${group.name}" style="width: 40px; height: 40px; border-radius: 50%;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${group.name}</div>
                    <div style="font-size: 12px; color: #666;">${group.members_count.toLocaleString()} подписчиков</div>
                </div>
            </div>
        `;
    });
    groupsHTML += '</div>';
    
    connectedGroupsDiv.innerHTML = `
        <div class="result show success">
            <strong>✓ Подключено групп: ${groups.length}</strong>
            ${groupsHTML}
        </div>
    `;
    
    // Заполняем селект группами
    targetGroupSelect.innerHTML = '<option value="">Выберите группу</option>';
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = `-${group.id}`;
        option.textContent = `${group.name} (@${group.screen_name})`;
        targetGroupSelect.appendChild(option);
    });
}

// Подключение аккаунта
function connectAccount() {
    window.location.href = 'auth.html';
}

// Публикация поста
async function publishPost() {
    const accessToken = localStorage.getItem('vk_access_token');
    const ownerId = targetGroupSelect.value;
    const message = document.getElementById('postMessage').value.trim();

    // Валидация
    if (!ownerId) {
        postResult.className = 'result show error';
        postResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Выберите группу</p>';
        return;
    }
    
    if (!message) {
        postResult.className = 'result show error';
        postResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Введите текст поста</p>';
        return;
    }

    try {
        postBtn.disabled = true;
        postBtn.textContent = 'Публикация...';
        
        const response = await fetch(`${API_URL}/vk/post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                owner_id: ownerId,
                message: message,
                access_token: accessToken,
                from_group: 1
            })
        });

        const data = await response.json();

        if (data.error) {
            postResult.className = 'result show error';
            postResult.innerHTML = `
                <strong>✗ Ошибка!</strong>
                <p>${data.error}</p>
            `;
        } else {
            postResult.className = 'result show success';
            const groupName = targetGroupSelect.options[targetGroupSelect.selectedIndex].text;
            postResult.innerHTML = `
                <strong>✓ Пост опубликован!</strong>
                <p>Группа: ${groupName}</p>
                <p>ID поста: ${data.post_id}</p>
            `;
            // Очищаем поле с текстом поста
            document.getElementById('postMessage').value = '';
        }
    } catch (error) {
        postResult.className = 'result show error';
        postResult.innerHTML = `
            <strong>✗ Ошибка!</strong>
            <p>${error.message}</p>
        `;
    } finally {
        postBtn.disabled = false;
        postBtn.textContent = 'Опубликовать';
    }
}

// Инициализация
window.addEventListener('DOMContentLoaded', checkAuth);

connectAccountBtn.addEventListener('click', connectAccount);
postBtn.addEventListener('click', publishPost);


// Автоматическое обновление токена
async function refreshTokenIfNeeded() {
    const tokenExpires = localStorage.getItem('vk_token_expires');
    const refreshToken = localStorage.getItem('vk_refresh_token');
    
    if (!tokenExpires || !refreshToken) {
        return false;
    }
    
    // Если токен истекает через 1 час или уже истёк
    if (Date.now() >= parseInt(tokenExpires) - 3600000) {
        try {
            const API_URL = window.location.hostname === 'localhost' 
                ? 'http://localhost:8000/api' 
                : `${window.location.origin}/api`;
            
            const response = await fetch(`${API_URL}/vk/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                console.error('Token refresh failed:', data.error);
                return false;
            }
            
            // Обновляем токены
            localStorage.setItem('vk_access_token', data.access_token);
            localStorage.setItem('vk_refresh_token', data.refresh_token);
            localStorage.setItem('vk_token_expires', Date.now() + (data.expires_in * 1000));
            
            console.log('Token refreshed successfully');
            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }
    
    return true;
}

// Проверяем токен при загрузке и каждые 30 минут
window.addEventListener('DOMContentLoaded', () => {
    refreshTokenIfNeeded();
    setInterval(refreshTokenIfNeeded, 30 * 60 * 1000); // Каждые 30 минут
});
