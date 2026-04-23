// API_URL определен в utils.js

console.log('[Dashboard] Initializing VK ZooPlatforma Dashboard');
console.log('[Dashboard] API URL:', API_URL);

const connectAccountBtn2 = document.getElementById('connectAccountBtn2');
const postBtn = document.getElementById('postBtn');
const postResult = document.getElementById('postResult');
const targetGroupSelect = document.getElementById('targetGroup');
const postPhotosInput = document.getElementById('postPhotos');
const photoPreview = document.getElementById('photoPreview');

// Превью фотографий
if (postPhotosInput) {
    postPhotosInput.addEventListener('change', (e) => {
        photoPreview.innerHTML = '';
        const files = Array.from(e.target.files);
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 2px solid #e0e0e0;';
                photoPreview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });
}

// Обновление информации о пользователе в сайдбаре
function updateSidebarUserInfo() {
    const appUser = AppStorage.getItem('app_user');
    const userName = AppStorage.getItem('vk_user_name');
    const userPhoto = AppStorage.getItem('vk_user_photo');
    
    // В новом дизайне нет сайдбара с пользователем, но оставляем функцию для совместимости
    console.log('[Dashboard] User info updated:', { appUser, userName, hasPhoto: !!userPhoto });
}

// Обновление счетчиков в сайдбаре
function updateSidebarCounters() {
    const sidebarPostsCount = document.getElementById('sidebarPostsCount');

    if (sidebarPostsCount) {
        const publishedPosts = AppStorage.getItem('published_posts_count') || '0';
        sidebarPostsCount.textContent = publishedPosts;
        sidebarPostsCount.style.display = publishedPosts > 0 ? 'inline' : 'none';
    }
}

// Проверка авторизации
function checkAuth() {
    console.log('[Dashboard] Checking auth status...');
    
    // Сначала проверяем авторизацию в нашей системе
    const appUser = AppStorage.getItem('app_user');
    const authTime = AppStorage.getItem('app_auth_time');
    
    if (!appUser || !authTime || (Date.now() - parseInt(authTime)) > 24 * 60 * 60 * 1000) {
        console.log('[Dashboard] User is not authenticated in our system, redirecting to auth');
        // Пользователь не авторизован в нашей системе - перенаправляем на авторизацию
        window.location.href = '/';
        return;
    }
    
    // Проверяем подключение к ВК
    const accessToken = AppStorage.getItem('vk_access_token');
    const tokenExpires = AppStorage.getItem('vk_token_expires');
    const userId = AppStorage.getItem('vk_user_id');
    const userName = AppStorage.getItem('vk_user_name');
    const userPhoto = AppStorage.getItem('vk_user_photo');
    
    console.log('[Dashboard] Auth data:', {
        appUser,
        hasVKToken: !!accessToken,
        userId,
        userName,
        hasPhoto: !!userPhoto,
        tokenExpires: tokenExpires ? new Date(parseInt(tokenExpires)).toLocaleString() : 'none'
    });
    
    if (accessToken && tokenExpires && Date.now() < parseInt(tokenExpires)) {
        console.log('[Dashboard] VK connected');
        if (connectAccountBtn2) {
            connectAccountBtn2.textContent = 'Переподключить ВКонтакте';
            connectAccountBtn2.style.display = 'inline-flex';
        }
    } else {
        console.log('[Dashboard] VK not connected');
        if (connectAccountBtn2) {
            connectAccountBtn2.textContent = 'Подключить ВКонтакте';
            connectAccountBtn2.style.display = 'inline-flex';
        }
    }

    loadConnectedGroups();
}

function updateGroupsCounterUI(count) {
    const groupsCount = document.getElementById('groupsCount');
    if (groupsCount) {
        groupsCount.textContent = String(count);
    }

    const sidebarGroupsCount = document.getElementById('sidebarGroupsCount');
    if (sidebarGroupsCount) {
        sidebarGroupsCount.textContent = String(count);
        sidebarGroupsCount.style.display = count > 0 ? 'inline' : 'none';
    }
}

// Загрузка групп с установленным приложением (из backend/SQLite)
async function loadConnectedGroups() {
    console.log('[Dashboard] Loading connected groups...');

    try {
        const response = await fetch(`${API_URL}/admin/groups/installed`);
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.error || 'Не удалось загрузить список групп');
        }

        const groups = payload.groups || [];
        if (groups.length === 0) {
            updateGroupsCounterUI(0);
            document.getElementById('connectedGroups').innerHTML = `
                <div class="placeholder">
                    <div class="placeholder__icon">👥</div>
                    <div class="placeholder__title">Группы не найдены</div>
                    <div class="placeholder__text">Пока ни одно сообщество не установило приложение. Откройте VK Mini App в нужном сообществе, чтобы оно появилось здесь.</div>
                </div>
            `;
            document.getElementById('targetGroup').innerHTML = '<option value="">Нет доступных сообществ</option>';
            return;
        }

        updateGroupsCounterUI(groups.length);

        let groupsHTML = '';
        groups.forEach(group => {
            const tokenBadge = group.has_token
                ? '<span class="status-badge status-badge--success">✓ Токен подключен</span>'
                : '<span class="status-badge status-badge--warning">⚠ Токен не подключен</span>';

            groupsHTML += `
                <div class="cell">
                    <div class="cell__before">
                        <img src="${group.photo_200 || ''}" alt="${group.name}" class="avatar">
                    </div>
                    <div class="cell__main">
                        <div class="cell__title">${group.name}</div>
                        <div class="cell__subtitle">@${group.screen_name || ('club' + group.vk_group_id)} · ID ${group.vk_group_id}</div>
                    </div>
                    <div class="cell__after">
                        ${tokenBadge}
                    </div>
                </div>
            `;
        });
        document.getElementById('connectedGroups').innerHTML = groupsHTML;

        const targetGroupSelect = document.getElementById('targetGroup');
        targetGroupSelect.innerHTML = '<option value="">Выберите группу</option>';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = `-${group.vk_group_id}`;
            option.textContent = `${group.name} (@${group.screen_name || ('club' + group.vk_group_id)})`;
            targetGroupSelect.appendChild(option);
        });
    } catch (error) {
        console.error('[Dashboard] Failed to load installed groups:', error);
        updateGroupsCounterUI(0);
        document.getElementById('connectedGroups').innerHTML = `
            <div class="placeholder">
                <div class="placeholder__icon">⚠️</div>
                <div class="placeholder__title">Ошибка загрузки групп</div>
                <div class="placeholder__text">${error.message || 'Не удалось загрузить список групп'}</div>
            </div>
        `;
        document.getElementById('targetGroup').innerHTML = '<option value="">Недоступно</option>';
    }
}

// Подключение аккаунта ВК
function connectAccount() {
    window.location.href = '/vk-connect';
}

// Публикация поста
async function publishPost() {
    const accessToken = AppStorage.getItem('vk_access_token');
    const ownerId = targetGroupSelect.value;
    const message = document.getElementById('postMessage').value.trim();
    const photos = postPhotosInput.files;
    const publishDateInput = document.getElementById('publishDate').value;

    // Валидация
    if (!ownerId) {
        postResult.className = 'result show result--error';
        postResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Выберите группу</p>';
        return;
    }
    
    if (!message && photos.length === 0) {
        postResult.className = 'result show result--error';
        postResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Добавьте текст или фото</p>';
        return;
    }

    try {
        postBtn.disabled = true;
        postBtn.innerHTML = '⏳ Публикация...';
        
        // Формируем данные для отправки
        const formData = new FormData();
        formData.append('owner_id', ownerId);
        formData.append('message', message);
        formData.append('access_token', accessToken);
        formData.append('from_group', '1');
        
        // Добавляем дату отложенной публикации
        if (publishDateInput) {
            const publishDate = new Date(publishDateInput);
            const now = new Date();
            
            if (publishDate <= now) {
                postResult.className = 'result show result--error';
                postResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Дата публикации должна быть в будущем</p>';
                postBtn.disabled = false;
                postBtn.innerHTML = '📤 Опубликовать';
                return;
            }
            
            const unixTimestamp = Math.floor(publishDate.getTime() / 1000);
            formData.append('publish_date', unixTimestamp);
        }
        
        // Добавляем фотографии
        if (photos.length > 0) {
            for (let i = 0; i < photos.length; i++) {
                formData.append('photos', photos[i]);
            }
        }

        const response = await fetch(`${API_URL}/vk/post`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.error) {
            postResult.className = 'result show result--error';
            postResult.innerHTML = `
                <strong>✗ Ошибка!</strong>
                <p>${data.error}</p>
            `;
        } else {
            postResult.className = 'result show result--success';
            const groupName = targetGroupSelect.options[targetGroupSelect.selectedIndex].text;
            const isScheduled = publishDateInput ? true : false;
            
            postResult.innerHTML = `
                <strong>✓ ${isScheduled ? 'Пост запланирован!' : 'Пост опубликован!'}</strong>
                <p>Группа: ${groupName}</p>
                <p>ID поста: ${data.post_id}</p>
                ${isScheduled ? `<p>Дата публикации: ${new Date(publishDateInput).toLocaleString('ru-RU')}</p>` : ''}
            `;
            
            // Очищаем форму
            document.getElementById('postMessage').value = '';
            document.getElementById('publishDate').value = '';
            postPhotosInput.value = '';
            photoPreview.innerHTML = '';
            
            // Обновляем статистику
            updateStats();
        }
    } catch (error) {
        postResult.className = 'result show result--error';
        postResult.innerHTML = `
            <strong>✗ Ошибка!</strong>
            <p>${error.message}</p>
        `;
    } finally {
        postBtn.disabled = false;
        postBtn.innerHTML = '📤 Опубликовать';
    }
}

// Обновление статистики
function updateStats() {
    // Пока заглушки, в будущем можно подключить к API
    const publishedPosts = AppStorage.getItem('published_posts_count') || '0';
    const scheduledPosts = AppStorage.getItem('scheduled_posts_count') || '0';
    
    document.getElementById('postsCount').textContent = publishedPosts;
    document.getElementById('scheduledCount').textContent = scheduledPosts;
    
    // Обновляем счетчики в сайдбаре
    updateSidebarCounters();
}

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateStats();
    updateSidebarUserInfo();
    updateSidebarCounters();
});

// Обработчики событий
if (connectAccountBtn2) {
    connectAccountBtn2.addEventListener('click', connectAccount);
}
if (postBtn) {
    postBtn.addEventListener('click', publishPost);
}

// Глобальные функции для HTML
// Автоматическое обновление токена
async function refreshTokenIfNeeded() {
    const tokenExpires = AppStorage.getItem('vk_token_expires');
    const refreshToken = AppStorage.getItem('vk_refresh_token');
    
    if (!tokenExpires || !refreshToken) {
        return false;
    }
    
    // Если токен истекает через 1 час или уже истёк
    if (Date.now() >= parseInt(tokenExpires) - 3600000) {
        try {
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
            AppStorage.setItem('vk_access_token', data.access_token);
            AppStorage.setItem('vk_refresh_token', data.refresh_token);
            AppStorage.setItem('vk_token_expires', Date.now() + (data.expires_in * 1000));
            
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

console.log('[Dashboard] Dashboard initialized');
