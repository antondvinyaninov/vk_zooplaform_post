// API_URL определен в utils.js

const loadGroupsBtn = document.getElementById('loadGroupsBtn');
const checkAllGroupsBtn = document.getElementById('checkAllGroupsBtn');
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
        groupsContainer.innerHTML = '<p style="padding: 16px; text-align: center; color: #666;">Пока нет групп, установивших приложение</p>';
        return;
    }

    const rows = groups.map((group) => {
        const tokenInfo = group.has_token ? 'подключен' : 'не подключен';
        const status = normalizeHealthStatus(group.health_status);
        const statusLabel = status === 'ok'
            ? 'Работает'
            : status === 'error'
                ? 'Ошибка'
                : 'Не проверено';
        const checkedAt = group.last_check_at
            ? new Date(group.last_check_at).toLocaleString('ru-RU')
            : '—';
        const errorText = group.health_error ? escapeHtml(group.health_error) : '—';

        return `
            <tr>
                <td>
                    <div class="group-main">
                        <img src="${group.photo_200 || ''}" alt="${escapeHtml(group.name)}" class="group-photo">
                        <div class="group-meta">
                            <span class="group-name">${escapeHtml(group.name)}</span>
                            <span class="group-screen">@${escapeHtml(group.screen_name || ('club' + group.vk_group_id))}</span>
                        </div>
                    </div>
                </td>
                <td>${group.vk_group_id}</td>
                <td><span class="status-chip status-chip--${status}">${statusLabel}</span></td>
                <td>${checkedAt}</td>
                <td>${errorText}</td>
                <td><button class="btn btn--secondary js-check-group" data-group-id="${group.id}">Проверить</button></td>
            </tr>
        `;
    }).join('');

    groupsContainer.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Группа</th>
                    <th>ID</th>
                    <th>Статус</th>
                    <th>Последняя проверка</th>
                    <th>Ошибка</th>
                    <th>Действие</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    groupsContainer.querySelectorAll('.js-check-group').forEach((button) => {
        button.addEventListener('click', async () => {
            const groupId = Number(button.dataset.groupId);
            await refreshHealth(groupId, button);
        });
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

function normalizeHealthStatus(status) {
    if (status === 'ok' || status === 'error') {
        return status;
    }
    return 'unknown';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function refreshHealth(groupId, triggerButton) {
    const isSingle = Number.isFinite(groupId) && groupId > 0;
    const originalText = triggerButton ? triggerButton.textContent : '';
    try {
        if (triggerButton) {
            triggerButton.disabled = true;
            triggerButton.textContent = 'Проверка...';
        }
        checkAllGroupsBtn.disabled = true;
        loadResult.className = 'result show';
        loadResult.innerHTML = `<strong>⏳ Проверка...</strong><p>${isSingle ? 'Проверяем группу' : 'Проверяем все группы'}</p>`;

        const payload = isSingle ? { group_id: groupId } : {};
        const response = await fetch(`${API_URL}/admin/groups/health/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Не удалось выполнить проверку');
        }

        loadResult.className = 'result show success';
        loadResult.innerHTML = `<strong>✓ Проверка завершена</strong><p>Проверено групп: ${data.updated ?? 0}</p>`;
        await loadGroups();
    } catch (error) {
        loadResult.className = 'result show error';
        loadResult.innerHTML = `<strong>✗ Ошибка!</strong><p>${error.message}</p>`;
    } finally {
        if (triggerButton) {
            triggerButton.disabled = false;
            triggerButton.textContent = originalText || 'Проверить';
        }
        checkAllGroupsBtn.disabled = false;
    }
}

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    updateSelectedCount(0);
    loadGroups();
});

loadGroupsBtn.addEventListener('click', loadGroups);
checkAllGroupsBtn.addEventListener('click', () => refreshHealth(0, null));
