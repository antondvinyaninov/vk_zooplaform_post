const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : `${window.location.origin}/api`;

const loadGroupsBtn = document.getElementById('loadGroupsBtn');
const saveBtn = document.getElementById('saveBtn');
const getGroupTokensBtn = document.getElementById('getGroupTokensBtn');
const groupsContainer = document.getElementById('groupsContainer');
const loadResult = document.getElementById('loadResult');
const selectedCountDiv = document.getElementById('selectedCount');

let allGroups = [];
let selectedGroups = new Set();

// Загружаем сохранённые группы
function loadSavedGroups() {
    const saved = localStorage.getItem('vk_selected_groups');
    if (saved) {
        selectedGroups = new Set(JSON.parse(saved));
    }
}

// Обновляем счётчик выбранных групп
function updateSelectedCount() {
    const count = selectedGroups.size;
    selectedCountDiv.querySelector('strong').textContent = count;
    selectedCountDiv.style.display = count > 0 ? 'block' : 'none';
    saveBtn.style.display = count > 0 ? 'block' : 'none';
    getGroupTokensBtn.style.display = count > 0 ? 'block' : 'none';
}

// Отрисовка групп
function renderGroups(groups) {
    groupsContainer.innerHTML = '';
    
    if (groups.length === 0) {
        groupsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">Группы не найдены</p>';
        return;
    }
    
    groups.forEach(group => {
        const isSelected = selectedGroups.has(group.id);
        
        const card = document.createElement('div');
        card.className = `group-card ${isSelected ? 'selected' : ''}`;
        card.dataset.groupId = group.id;
        
        card.innerHTML = `
            <img src="${group.photo_200}" alt="${group.name}" class="group-photo">
            <div class="group-name">${group.name}</div>
            <div class="group-info">
                @${group.screen_name}<br>
                ${group.members_count.toLocaleString()} подписчиков
            </div>
        `;
        
        card.addEventListener('click', () => toggleGroup(group, card));
        groupsContainer.appendChild(card);
    });
}

// Переключение выбора группы
function toggleGroup(group, card) {
    if (selectedGroups.has(group.id)) {
        selectedGroups.delete(group.id);
        card.classList.remove('selected');
    } else {
        selectedGroups.add(group.id);
        card.classList.add('selected');
    }
    
    updateSelectedCount();
}

// Загрузка групп из VK
async function loadGroups() {
    const accessToken = localStorage.getItem('vk_access_token');
    
    if (!accessToken) {
        loadResult.className = 'result show error';
        loadResult.innerHTML = `
            <strong>✗ Ошибка!</strong>
            <p>Токен доступа не найден</p>
            <a href="auth.html" class="btn" style="display: inline-block; text-decoration: none; margin-top: 10px;">
                Авторизоваться
            </a>
        `;
        return;
    }
    
    try {
        loadGroupsBtn.disabled = true;
        loadGroupsBtn.textContent = 'Загрузка...';
        loadResult.className = '';
        loadResult.innerHTML = '';
        
        const response = await fetch(`${API_URL}/vk/groups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                access_token: accessToken
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            loadResult.className = 'result show error';
            loadResult.innerHTML = `
                <strong>✗ Ошибка!</strong>
                <p>${data.error}</p>
            `;
            return;
        }
        
        allGroups = data.items || [];
        
        if (allGroups.length === 0) {
            loadResult.className = 'result show error';
            loadResult.innerHTML = `
                <strong>⚠ Внимание!</strong>
                <p>У вас нет групп с правами администратора</p>
            `;
            return;
        }
        
        loadResult.className = 'result show success';
        loadResult.innerHTML = `
            <strong>✓ Загружено групп: ${allGroups.length}</strong>
        `;
        
        renderGroups(allGroups);
        updateSelectedCount();
        
    } catch (error) {
        loadResult.className = 'result show error';
        loadResult.innerHTML = `
            <strong>✗ Ошибка!</strong>
            <p>${error.message}</p>
        `;
    } finally {
        loadGroupsBtn.disabled = false;
        loadGroupsBtn.textContent = 'Загрузить мои группы';
    }
}

// Сохранение выбранных групп
function saveSelectedGroups() {
    const selectedGroupsData = allGroups.filter(g => selectedGroups.has(g.id));
    
    localStorage.setItem('vk_selected_groups', JSON.stringify(Array.from(selectedGroups)));
    localStorage.setItem('vk_selected_groups_data', JSON.stringify(selectedGroupsData));
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = `✓ Сохранено групп: ${selectedGroups.size}`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

// Получение токенов для выбранных групп через Implicit Flow
function getGroupTokens() {
    if (selectedGroups.size === 0) {
        alert('Выберите хотя бы одну группу');
        return;
    }
    
    // Формируем список ID групп
    const groupIds = Array.from(selectedGroups).join(',');
    
    const currentUrl = window.location.origin + window.location.pathname;
    const clientId = '54556179';
    
    // Implicit Flow для получения токенов сообществ
    const authUrl = `https://oauth.vk.com/authorize?` +
        `client_id=${clientId}&` +
        `group_ids=${groupIds}&` +
        `display=page&` +
        `redirect_uri=${encodeURIComponent(currentUrl)}&` +
        `scope=manage,messages,photos,docs&` +
        `response_type=token&` +
        `v=5.199`;
    
    window.location.href = authUrl;
}

// Проверка токенов групп в URL (после редиректа от VK)
function checkGroupTokensInURL() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    
    const params = new URLSearchParams(hash);
    
    // Получаем все токены групп (access_token_GROUPID)
    const groupTokens = {};
    let hasTokens = false;
    
    for (const [key, value] of params.entries()) {
        if (key.startsWith('access_token_')) {
            const groupId = key.replace('access_token_', '');
            groupTokens[groupId] = value;
            hasTokens = true;
        }
    }
    
    if (hasTokens) {
        // Сохраняем токены групп
        const existingTokens = JSON.parse(localStorage.getItem('vk_group_tokens') || '{}');
        Object.assign(existingTokens, groupTokens);
        localStorage.setItem('vk_group_tokens', JSON.stringify(existingTokens));
        
        // Очищаем URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        const groupCount = Object.keys(groupTokens).length;
        
        loadResult.className = 'result show success';
        loadResult.innerHTML = `
            <strong>✓ Получены токены для ${groupCount} групп!</strong>
            <p>Теперь вы можете публиковать посты в выбранные группы</p>
            <a href="index.html" class="btn" style="display: inline-block; text-decoration: none; margin-top: 10px;">
                Перейти к публикации
            </a>
        `;
    }
}

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    loadSavedGroups();
    updateSelectedCount();
    checkGroupTokensInURL(); // Проверяем токены групп после редиректа
});

loadGroupsBtn.addEventListener('click', loadGroups);
saveBtn.addEventListener('click', saveSelectedGroups);
getGroupTokensBtn.addEventListener('click', getGroupTokens);
