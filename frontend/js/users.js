const ADMIN_API_URL = `${API_URL}/admin`;
const ROLE_OPTIONS = [
    { value: 'user', label: 'Пользователь' },
    { value: 'moderator', label: 'Модератор' },
    { value: 'admin', label: 'Администратор' }
];

function roleLabel(role) {
    const option = ROLE_OPTIONS.find((item) => item.value === role);
    return option ? option.label : 'Пользователь';
}

function renderRoleCustomSelect(userId, role) {
    const currentRole = role || 'user';
    const optionsHTML = ROLE_OPTIONS.map((option) => `
        <button
            type="button"
            class="vkui-custom-select__option ${option.value === currentRole ? 'active' : ''}"
            data-role-option="${option.value}"
        >
            ${option.label}
        </button>
    `).join('');

    return `
        <div class="vkui-custom-select" data-role-select="${userId}">
            <input type="hidden" class="users-role-value" data-user-id="${userId}" value="${currentRole}">
            <button type="button" class="vkui-custom-select__trigger" data-role-trigger="${userId}">
                ${roleLabel(currentRole)}
            </button>
            <div class="vkui-custom-select__menu">
                ${optionsHTML}
            </div>
        </div>
    `;
}

async function fetchUsers() {
    const response = await fetch(`${ADMIN_API_URL}/users`);
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'Не удалось загрузить пользователей');
    }

    return payload.users || [];
}

async function updateRole(userId, role) {
    const response = await fetch(`${ADMIN_API_URL}/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
    });

    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'Не удалось обновить роль');
    }

    return payload.user;
}

function syncSessionUser(user) {
    const sessionUsername = AppStorage.getItem('app_user');
    if (!sessionUsername || sessionUsername !== user.username) {
        return;
    }

    AppStorage.setItem('app_user_role', user.role || 'user');
    AppStorage.setItem('app_user_display_name', user.display_name || user.username);
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) {
        return;
    }

    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="5">Пользователей пока нет</td></tr>';
        return;
    }

    tbody.innerHTML = users
        .map((user) => {
            const statusClass = user.status === 'active' ? 'users-status users-status--active' : 'users-status users-status--invited';
            const statusText = user.status === 'active' ? 'Активен' : 'Приглашен';

            return `
                <tr>
                    <td>${user.display_name}</td>
                    <td>${user.username}</td>
                    <td>${renderRoleCustomSelect(user.id, user.role)}</td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="users-actions">
                            <button type="button" class="btn" data-save-user="${user.id}">Сохранить</button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join('');
}

function renderUsersMobileList(users) {
    const container = document.getElementById('usersMobileList');
    if (!container) {
        return;
    }

    if (!users.length) {
        container.innerHTML = '<div class="placeholder">Пользователей пока нет</div>';
        return;
    }

    container.innerHTML = users
        .map((user) => {
            const statusClass = user.status === 'active' ? 'users-status users-status--active' : 'users-status users-status--invited';
            const statusText = user.status === 'active' ? 'Активен' : 'Приглашен';

            return `
                <div class="users-mobile-card" data-user-card="${user.id}">
                    <div class="users-mobile-top">
                        <div>
                            <div class="users-mobile-name">${user.display_name}</div>
                            <div class="users-mobile-login">@${user.username}</div>
                        </div>
                        <span class="${statusClass}">${statusText}</span>
                    </div>
                    <div class="users-mobile-row">
                        <div class="users-mobile-label">Роль</div>
                        ${renderRoleCustomSelect(user.id, user.role)}
                    </div>
                    <div class="users-mobile-row">
                        <div class="users-mobile-label"></div>
                        <div class="users-actions">
                            <button type="button" class="btn" data-save-user="${user.id}">Сохранить</button>
                        </div>
                    </div>
                </div>
            `;
        })
        .join('');
}

function showUsersError(message) {
    const tbody = document.getElementById('usersTableBody');
    const mobile = document.getElementById('usersMobileList');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5">${message}</td></tr>`;
    }
    if (mobile) {
        mobile.innerHTML = `<div class="placeholder">${message}</div>`;
    }
}

async function refreshUsers() {
    const users = await fetchUsers();
    renderUsersTable(users);
    renderUsersMobileList(users);
}

function closeAllRoleSelects() {
    const opened = document.querySelectorAll('.vkui-custom-select.open');
    opened.forEach((item) => item.classList.remove('open'));
}

function initRoleCustomSelects() {
    document.addEventListener('click', (event) => {
        const option = event.target.closest('[data-role-option]');
        if (option) {
            const select = option.closest('.vkui-custom-select');
            if (!select) {
                return;
            }

            const role = option.getAttribute('data-role-option');
            const input = select.querySelector('.users-role-value');
            const trigger = select.querySelector('.vkui-custom-select__trigger');
            if (input) {
                input.value = role;
            }
            if (trigger) {
                trigger.textContent = roleLabel(role);
            }

            select.querySelectorAll('.vkui-custom-select__option').forEach((el) => {
                el.classList.toggle('active', el === option);
            });

            select.classList.remove('open');
            return;
        }

        const trigger = event.target.closest('[data-role-trigger]');
        if (trigger) {
            const select = trigger.closest('.vkui-custom-select');
            if (!select) {
                return;
            }

            const isOpen = select.classList.contains('open');
            closeAllRoleSelects();
            if (!isOpen) {
                select.classList.add('open');
            }
            return;
        }

        closeAllRoleSelects();
    });
}

function initUsersActions() {
    document.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-save-user]');
        if (!button) {
            return;
        }

        const userId = button.getAttribute('data-save-user');
        const scope = button.closest('tr, .users-mobile-card') || document;
        const roleInput = scope.querySelector(`input.users-role-value[data-user-id="${userId}"]`) || document.querySelector(`input.users-role-value[data-user-id="${userId}"]`);
        if (!roleInput) {
            return;
        }

        button.disabled = true;
        button.textContent = 'Сохранение...';

        try {
            const updatedUser = await updateRole(userId, roleInput.value);
            syncSessionUser(updatedUser);
            await refreshUsers();
        } catch (error) {
            alert(error.message || 'Не удалось сохранить роль');
        } finally {
            button.disabled = false;
            button.textContent = 'Сохранить';
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    initRoleCustomSelects();
    initUsersActions();
    try {
        await refreshUsers();
    } catch (error) {
        showUsersError(error.message || 'Не удалось загрузить пользователей');
    }
});
