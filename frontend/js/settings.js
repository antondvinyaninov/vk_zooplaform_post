// API_URL определен в utils.js

console.log('[Settings] Initializing VK ZooPlatforma Settings');
console.log('[Settings] API URL:', API_URL);

const settingsResult = document.getElementById('settingsResult');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const vkAuthStatusInfo = document.getElementById('vkAuthStatusInfo');
const vkAuthAdminActions = document.getElementById('vkAuthAdminActions');
const vkAuthReadonlyInfo = document.getElementById('vkAuthReadonlyInfo');
const disconnectVkBtn = document.getElementById('disconnectVkBtn');

// Настройки по умолчанию
const defaultSettings = {
    autoUpdate: true,
    notifications: true,
    updateInterval: 10,
    fromGroup: true,
    compressImages: true,
    maxImageSize: 1024,
    autoLogout: true,
    logoutTimeout: 24
};

// Загрузка настроек
function loadSettings() {
    console.log('[Settings] Loading settings...');
    
    const savedSettings = AppStorage.getItem('app_settings');
    const settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
    
    // Применяем настройки к элементам формы
    document.getElementById('autoUpdate').checked = settings.autoUpdate;
    document.getElementById('notifications').checked = settings.notifications;
    document.getElementById('updateInterval').value = settings.updateInterval;
    document.getElementById('fromGroup').checked = settings.fromGroup;
    document.getElementById('compressImages').checked = settings.compressImages;
    document.getElementById('maxImageSize').value = settings.maxImageSize;
    document.getElementById('autoLogout').checked = settings.autoLogout;
    document.getElementById('logoutTimeout').value = settings.logoutTimeout;
    
    console.log('[Settings] Settings loaded:', settings);
}

function loadCentralVkAuthSettings() {
    const accessToken = AppStorage.getItem('vk_access_token');
    const tokenExpires = AppStorage.getItem('vk_token_expires');
    const userName = AppStorage.getItem('vk_user_name');
    const appUser = AppStorage.getItem('app_user');
    const appRole = AppStorage.getItem('app_user_role') || (appUser === 'admin' ? 'admin' : 'user');
    const isAdmin = appRole === 'admin';

    const isConnected = !!(accessToken && tokenExpires && Date.now() < parseInt(tokenExpires));

    if (isConnected) {
        vkAuthStatusInfo.className = 'result show result--success';
        vkAuthStatusInfo.style.display = 'block';
        vkAuthStatusInfo.innerHTML = `<strong>✓ ВКонтакте подключен</strong><p>Общая учетная запись активна${userName ? `: ${userName}` : ''}</p>`;
    } else {
        vkAuthStatusInfo.className = 'result show result--error';
        vkAuthStatusInfo.style.display = 'block';
        vkAuthStatusInfo.innerHTML = '<strong>⚠ ВКонтакте не подключен</strong><p>Администратору нужно выполнить первичную авторизацию.</p>';
    }

    vkAuthAdminActions.style.display = isAdmin ? 'flex' : 'none';
    vkAuthReadonlyInfo.style.display = isAdmin ? 'none' : 'block';
}

function disconnectCentralVk() {
    const appUser = AppStorage.getItem('app_user');
    const appRole = AppStorage.getItem('app_user_role') || (appUser === 'admin' ? 'admin' : 'user');
    if (appRole !== 'admin') {
        return;
    }

    if (!confirm('Отключить общую авторизацию ВКонтакте для всей команды?')) {
        return;
    }

    AppStorage.removeItem('vk_access_token');
    AppStorage.removeItem('vk_refresh_token');
    AppStorage.removeItem('vk_token_expires');
    AppStorage.removeItem('vk_user_id');
    AppStorage.removeItem('vk_user_name');
    AppStorage.removeItem('vk_user_photo');
    AppStorage.removeItem('vk_selected_groups');
    AppStorage.removeItem('vk_selected_groups_data');
    AppStorage.removeItem('vk_group_tokens');

    loadCentralVkAuthSettings();

    settingsResult.className = 'result show result--success';
    settingsResult.innerHTML = '<strong>✓ Подключение ВК отключено</strong><p>Общая учетная запись удалена из настроек.</p>';
    setTimeout(() => {
        settingsResult.className = 'result';
    }, 3000);
}

// Сохранение настроек
function saveSettings() {
    console.log('[Settings] Saving settings...');
    
    try {
        const settings = {
            autoUpdate: document.getElementById('autoUpdate').checked,
            notifications: document.getElementById('notifications').checked,
            updateInterval: parseInt(document.getElementById('updateInterval').value),
            fromGroup: document.getElementById('fromGroup').checked,
            compressImages: document.getElementById('compressImages').checked,
            maxImageSize: parseInt(document.getElementById('maxImageSize').value),
            autoLogout: document.getElementById('autoLogout').checked,
            logoutTimeout: parseInt(document.getElementById('logoutTimeout').value)
        };
        
        AppStorage.setItem('app_settings', JSON.stringify(settings));
        
        // Показываем успешное сообщение
        settingsResult.className = 'result show result--success';
        settingsResult.innerHTML = '<strong>✓ Настройки сохранены!</strong><p>Все изменения применены успешно</p>';
        
        // Скрываем сообщение через 3 секунды
        setTimeout(() => {
            settingsResult.className = 'result';
        }, 3000);
        
        console.log('[Settings] Settings saved:', settings);
        
    } catch (error) {
        console.error('[Settings] Error saving settings:', error);
        
        settingsResult.className = 'result show result--error';
        settingsResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Не удалось сохранить настройки</p>';
        
        setTimeout(() => {
            settingsResult.className = 'result';
        }, 5000);
    }
}

// Смена пароля
function showChangePassword() {
    const newPassword = prompt('Введите новый пароль:');
    
    if (!newPassword) {
        return;
    }
    
    if (newPassword.length < 6) {
        alert('Пароль должен содержать минимум 6 символов');
        return;
    }
    
    // В реальном приложении здесь был бы запрос к API
    // Пока просто показываем сообщение
    settingsResult.className = 'result show result--success';
    settingsResult.innerHTML = '<strong>✓ Пароль изменен!</strong><p>Новый пароль будет действовать при следующем входе</p>';
    
    setTimeout(() => {
        settingsResult.className = 'result';
    }, 3000);
    
    console.log('[Settings] Password change requested');
}

// Экспорт данных
function exportData() {
    console.log('[Settings] Exporting data...');
    
    try {
        // Собираем все данные из AppStorage
        const exportData = {
            timestamp: new Date().toISOString(),
            settings: JSON.parse(AppStorage.getItem('app_settings') || '{}'),
            groups: JSON.parse(AppStorage.getItem('vk_selected_groups_data') || '[]'),
            user: {
                app_user: AppStorage.getItem('app_user'),
                vk_user_name: AppStorage.getItem('vk_user_name'),
                vk_user_id: AppStorage.getItem('vk_user_id')
            },
            stats: {
                published_posts_count: AppStorage.getItem('published_posts_count') || '0',
                scheduled_posts_count: AppStorage.getItem('scheduled_posts_count') || '0'
            }
        };
        
        // Создаем и скачиваем файл
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `vk-zooplatforma-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        settingsResult.className = 'result show result--success';
        settingsResult.innerHTML = '<strong>✓ Данные экспортированы!</strong><p>Файл с данными загружен на ваш компьютер</p>';
        
        setTimeout(() => {
            settingsResult.className = 'result';
        }, 3000);
        
        console.log('[Settings] Data exported successfully');
        
    } catch (error) {
        console.error('[Settings] Export error:', error);
        
        settingsResult.className = 'result show result--error';
        settingsResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Не удалось экспортировать данные</p>';
        
        setTimeout(() => {
            settingsResult.className = 'result';
        }, 5000);
    }
}

// Очистка кэша
function clearCache() {
    if (!confirm('Вы уверены, что хотите очистить кэш? Это действие нельзя отменить.')) {
        return;
    }
    
    console.log('[Settings] Clearing cache...');
    
    try {
        // Удаляем временные данные, но сохраняем важные настройки
        const keysToKeep = [
            'app_user',
            'app_auth_time',
            'app_settings',
            'vk_access_token',
            'vk_refresh_token',
            'vk_token_expires',
            'vk_user_id',
            'vk_user_name',
            'vk_user_photo',
            'vk_selected_groups_data'
        ];
        
        const keysToRemove = [];
        for (let i = 0; i < AppStorage.length; i++) {
            const key = AppStorage.key(i);
            if (key && !keysToKeep.includes(key)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => AppStorage.removeItem(key));
        
        settingsResult.className = 'result show result--success';
        settingsResult.innerHTML = '<strong>✓ Кэш очищен!</strong><p>Временные файлы и данные удалены</p>';
        
        setTimeout(() => {
            settingsResult.className = 'result';
        }, 3000);
        
        console.log('[Settings] Cache cleared, removed keys:', keysToRemove);
        
    } catch (error) {
        console.error('[Settings] Cache clear error:', error);
        
        settingsResult.className = 'result show result--error';
        settingsResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Не удалось очистить кэш</p>';
        
        setTimeout(() => {
            settingsResult.className = 'result';
        }, 5000);
    }
}

// Сброс настроек
function resetSettings() {
    if (!confirm('Вы уверены, что хотите сбросить все настройки? Это действие нельзя отменить.')) {
        return;
    }
    
    console.log('[Settings] Resetting settings...');
    
    try {
        // Сбрасываем настройки к значениям по умолчанию
        AppStorage.setItem('app_settings', JSON.stringify(defaultSettings));
        
        // Перезагружаем настройки на странице
        loadSettings();
        
        settingsResult.className = 'result show result--success';
        settingsResult.innerHTML = '<strong>✓ Настройки сброшены!</strong><p>Все настройки возвращены к значениям по умолчанию</p>';
        
        setTimeout(() => {
            settingsResult.className = 'result';
        }, 3000);
        
        console.log('[Settings] Settings reset to defaults');
        
    } catch (error) {
        console.error('[Settings] Reset error:', error);
        
        settingsResult.className = 'result show result--error';
        settingsResult.innerHTML = '<strong>✗ Ошибка!</strong><p>Не удалось сбросить настройки</p>';
        
        setTimeout(() => {
            settingsResult.className = 'result';
        }, 5000);
    }
}

// Обновление информации о пользователе в сайдбаре
function updateSidebarUserInfo() {
    const appUser = AppStorage.getItem('app_user');
    const userName = AppStorage.getItem('vk_user_name');
    const userPhoto = AppStorage.getItem('vk_user_photo');
    
    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserStatus = document.getElementById('sidebarUserStatus');
    
    if (sidebarUserAvatar && sidebarUserName && sidebarUserStatus) {
        if (userPhoto && userName) {
            sidebarUserAvatar.innerHTML = `<img src="${userPhoto}" alt="${userName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            sidebarUserName.textContent = userName;
            sidebarUserStatus.textContent = 'ВК подключен';
        } else {
            sidebarUserAvatar.textContent = appUser ? appUser.charAt(0).toUpperCase() : 'U';
            sidebarUserName.textContent = appUser || 'Пользователь';
            sidebarUserStatus.textContent = 'Администратор';
        }
    }
}

// Обновление счетчиков в сайдбаре
function updateSidebarCounters() {
    const groupsData = AppStorage.getItem('vk_selected_groups_data');
    const groups = groupsData ? JSON.parse(groupsData) : [];
    
    const sidebarGroupsCount = document.getElementById('sidebarGroupsCount');
    const sidebarPostsCount = document.getElementById('sidebarPostsCount');
    
    if (sidebarGroupsCount) {
        sidebarGroupsCount.textContent = groups.length;
        sidebarGroupsCount.style.display = groups.length > 0 ? 'inline' : 'none';
    }
    
    if (sidebarPostsCount) {
        const publishedPosts = AppStorage.getItem('published_posts_count') || '0';
        sidebarPostsCount.textContent = publishedPosts;
        sidebarPostsCount.style.display = publishedPosts > 0 ? 'inline' : 'none';
    }
}

// Проверка авторизации
function checkAuth() {
    console.log('[Settings] Checking auth status...');
    
    const appUser = AppStorage.getItem('app_user');
    const authTime = AppStorage.getItem('app_auth_time');
    
    if (!appUser || !authTime || (Date.now() - parseInt(authTime)) > 24 * 60 * 60 * 1000) {
        console.log('[Settings] User is not authenticated, redirecting to auth');
        window.location.href = '/';
        return;
    }
}

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadSettings();
    loadCentralVkAuthSettings();
    updateSidebarUserInfo();
    updateSidebarCounters();
});

// Обработчики событий
saveSettingsBtn.addEventListener('click', saveSettings);
if (disconnectVkBtn) {
    disconnectVkBtn.addEventListener('click', disconnectCentralVk);
}

// Глобальные функции для HTML
window.showChangePassword = showChangePassword;
window.exportData = exportData;
window.clearCache = clearCache;
window.resetSettings = resetSettings;

// Обновление сниппета
async function updateSnippet() {
    const title = document.getElementById('snippetTitle').value.trim();
    const description = document.getElementById('snippetDescription').value.trim();
    const button = document.getElementById('snippetButton').value;
    const imageUrl = document.getElementById('snippetImage').value.trim();
    const resultSpan = document.getElementById('snippetResult');

    if (!title || !imageUrl) {
        resultSpan.style.color = '#e64646';
        resultSpan.textContent = 'Заголовок и ссылка на изображение обязательны';
        return;
    }

    resultSpan.style.color = '#818c99';
    resultSpan.textContent = 'Сохранение...';

    try {
        const response = await fetch(`${API_URL}/settings/snippet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                description: description,
                button: button,
                image_url: imageUrl
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Ошибка сервера');
        }

        resultSpan.style.color = '#4bb34b';
        resultSpan.textContent = '✓ Сниппет успешно обновлен!';
        setTimeout(() => {
            resultSpan.textContent = '';
        }, 5000);
    } catch (error) {
        console.error('[Settings] Update snippet error:', error);
        resultSpan.style.color = '#e64646';
        resultSpan.textContent = `Ошибка: ${error.message}`;
    }
}
window.updateSnippet = updateSnippet;

// Автосохранение при изменении настроек
document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') {
        // Автоматически сохраняем настройки при изменении
        setTimeout(saveSettings, 100);
    }
});

console.log('[Settings] Settings page initialized');
