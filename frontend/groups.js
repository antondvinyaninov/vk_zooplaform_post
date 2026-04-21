const API_URL = 'http://localhost:8000';

const loadGroupsBtn = document.getElementById('loadGroupsBtn');
const saveBtn = document.getElementById('saveBtn');
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

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    loadSavedGroups();
    updateSelectedCount();
});

loadGroupsBtn.addEventListener('click', loadGroups);
saveBtn.addEventListener('click', saveSelectedGroups);
