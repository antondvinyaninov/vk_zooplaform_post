// API_URL определен в utils.js

const loadGroupsBtn = document.getElementById('loadGroupsBtn');
const groupsContainer = document.getElementById('groupsContainer');
const loadResult = document.getElementById('loadResult');
const selectedCountDiv = document.getElementById('selectedCount');

let allGroups = [];

// Обновляем счётчик групп
function updateSelectedCount(count) {
    selectedCountDiv.querySelector('strong').textContent = count;
    selectedCountDiv.style.display = 'block';
}

// Отрисовка групп
function renderGroups(groups) {
    groupsContainer.innerHTML = '';
    
    if (groups.length === 0) {
        groupsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">Пока нет групп, установивших приложение</p>';
        return;
    }
    
    groups.forEach(group => {
        const card = document.createElement('div');
        card.className = 'group-card';
        card.dataset.groupId = group.id;

        const tokenInfo = group.has_token
            ? 'Токен подключен'
            : 'Токен не подключен';

        card.innerHTML = `
            <img src="${group.photo_200 || ''}" alt="${group.name}" class="group-photo">
            <div class="group-name">${group.name}</div>
            <div class="group-info">
                @${group.screen_name || ('club' + group.vk_group_id)}<br>
                ID ${group.vk_group_id}<br>
                ${tokenInfo}
            </div>
        `;

        groupsContainer.appendChild(card);
    });
}

// Загрузка групп, установивших приложение
async function loadGroups() {
    try {
        loadGroupsBtn.disabled = true;
        loadGroupsBtn.textContent = 'Загрузка...';
        loadResult.className = '';
        loadResult.innerHTML = '';

        const response = await fetch(`${API_URL}/admin/groups/installed`);
        const data = await response.json();

        if (!response.ok || data.error) {
            loadResult.className = 'result show error';
            loadResult.innerHTML = `
                <strong>✗ Ошибка!</strong>
                <p>${data.error || 'Не удалось загрузить список групп'}</p>
            `;
            return;
        }

        allGroups = data.groups || [];

        if (allGroups.length === 0) {
            loadResult.className = 'result show success';
            loadResult.innerHTML = `
                <strong>ℹ Список пуст</strong>
                <p>Пока ни одна группа не установила приложение</p>
            `;
            renderGroups([]);
            updateSelectedCount(0);
            return;
        }

        loadResult.className = 'result show success';
        loadResult.innerHTML = `
            <strong>✓ Найдено групп: ${allGroups.length}</strong>
        `;

        renderGroups(allGroups);
        updateSelectedCount(allGroups.length);

    } catch (error) {
        loadResult.className = 'result show error';
        loadResult.innerHTML = `
            <strong>✗ Ошибка!</strong>
            <p>${error.message}</p>
        `;
    } finally {
        loadGroupsBtn.disabled = false;
        loadGroupsBtn.textContent = 'Обновить список';
    }
}

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    updateSelectedCount(0);
    loadGroups();
});

loadGroupsBtn.addEventListener('click', loadGroups);
