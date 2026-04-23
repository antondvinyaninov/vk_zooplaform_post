// Общие функции для сайдбара

// Функция для сворачивания/разворачивания секций
function toggleSection(header) {
    const section = header.parentElement;
    section.classList.toggle('sidebar__section--collapsed');
}

function isMobileSidebarMode() {
    return window.matchMedia('(max-width: 1024px)').matches;
}

function openMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || !isMobileSidebarMode()) {
        return;
    }

    sidebar.classList.add('open');
    document.body.classList.add('sidebar-open');
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        return;
    }

    sidebar.classList.remove('open');
    document.body.classList.remove('sidebar-open');
}

function toggleMobileSidebar() {
    if (isMobileSidebarMode()) {
        if (document.body.classList.contains('sidebar-open')) {
            closeMobileSidebar();
            return;
        }

        openMobileSidebar();
        return;
    }

    document.body.classList.remove('sidebar-open');
    document.body.classList.toggle('sidebar-collapsed');
}

function initMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const headerLeft = document.querySelector('.header__left');
    const headerContent = document.querySelector('.header__content');

    if (!sidebar || (!headerLeft && !headerContent)) {
        return;
    }

    let menuButton = document.querySelector('.header__menu-btn');
    if (!menuButton) {
        menuButton = document.createElement('button');
        menuButton.type = 'button';
        menuButton.className = 'header__menu-btn';
        menuButton.setAttribute('aria-label', 'Открыть меню');
        menuButton.textContent = '☰';
        menuButton.addEventListener('click', toggleMobileSidebar);
        const target = headerLeft || headerContent;
        target.prepend(menuButton);
    }

    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', closeMobileSidebar);
        document.body.appendChild(overlay);
    }

    const sidebarLinks = sidebar.querySelectorAll('.sidebar__item');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (isMobileSidebarMode()) {
                closeMobileSidebar();
            }
        });
    });

    const sidebarLogo = sidebar.querySelector('.sidebar__logo');
    if (sidebarLogo) {
        sidebarLogo.addEventListener('click', () => {
            if (isMobileSidebarMode()) {
                closeMobileSidebar();
            }
        });
    }

    window.addEventListener('resize', () => {
        if (!isMobileSidebarMode()) {
            closeMobileSidebar();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeMobileSidebar();
        }
    });
}

function getUserInitials(name) {
    if (!name) {
        return 'U';
    }

    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join('');
}

function normalizeRole(roleValue) {
    if (roleValue === 'admin') {
        return 'Админ';
    }

    if (roleValue === 'moderator') {
        return 'Модератор';
    }

    return 'Пользователь';
}

function getCurrentAppRole() {
    const explicitRole = AppStorage.getItem('app_user_role');
    if (explicitRole) {
        return explicitRole;
    }

    const username = AppStorage.getItem('app_user');
    return username === 'admin' ? 'admin' : 'user';
}

function logoutAppUser() {
    const keysToRemove = [
        'app_user',
        'app_auth_time',
        'app_user_role',
        'app_user_display_name',
        'vk_access_token',
        'vk_token_expires',
        'vk_user_id',
        'vk_user_name',
        'vk_user_photo',
        'vk_groups'
    ];

    keysToRemove.forEach(key => AppStorage.removeItem(key));
    window.location.href = '/';
}

function initHeaderUserMenu() {
    const headerRight = document.querySelector('.header__right');
    if (!headerRight) {
        return;
    }

    if (headerRight.querySelector('.header-user')) {
        return;
    }

    const appUser = AppStorage.getItem('app_user') || 'user';
    const displayName = AppStorage.getItem('app_user_display_name') || appUser;
    const role = normalizeRole(AppStorage.getItem('app_user_role'));
    const vkName = AppStorage.getItem('vk_user_name');
    const vkPhoto = AppStorage.getItem('vk_user_photo');
    const userName = vkName || displayName;

    const userRoot = document.createElement('div');
    userRoot.className = 'header-user';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'header-user__trigger';
    trigger.setAttribute('aria-label', 'Меню пользователя');
    trigger.setAttribute('aria-expanded', 'false');

    const avatar = document.createElement('span');
    avatar.className = 'header-user__avatar';
    if (vkPhoto) {
        avatar.innerHTML = `<img src="${vkPhoto}" alt="${userName}">`;
    } else {
        avatar.textContent = getUserInitials(userName);
    }

    trigger.appendChild(avatar);

    const menu = document.createElement('div');
    menu.className = 'header-user__menu';
    menu.innerHTML = `
        <div class="header-user__menu-item">Роль: ${role}</div>
        <div class="header-user__menu-divider"></div>
        <a class="header-user__menu-item" href="/settings">Профиль и настройки</a>
        <button type="button" class="header-user__menu-item" id="headerRoleSoonBtn">Управление ролями (скоро)</button>
        <div class="header-user__menu-divider"></div>
        <button type="button" class="header-user__menu-item" id="headerLogoutBtn">Выйти</button>
    `;

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = menu.classList.toggle('open');
        trigger.setAttribute('aria-expanded', String(isOpen));
    });

    menu.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    const logoutBtn = menu.querySelector('#headerLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutAppUser);
    }

    const roleSoonBtn = menu.querySelector('#headerRoleSoonBtn');
    if (roleSoonBtn) {
        roleSoonBtn.addEventListener('click', () => {
            alert('Раздел ролей добавим следующим шагом.');
        });
    }

    document.addEventListener('click', () => {
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
    });

    userRoot.appendChild(trigger);
    userRoot.appendChild(menu);
    headerRight.appendChild(userRoot);
}

function applyRoleAccessRules() {
    const appRole = getCurrentAppRole();
    const isAdmin = appRole === 'admin';

    const vkConnectItems = document.querySelectorAll('.sidebar__item[data-page="vk-connect"]');
    vkConnectItems.forEach((item) => {
        item.style.display = isAdmin ? '' : 'none';
    });

    if (!isAdmin && window.location.pathname === '/vk-connect') {
        window.location.href = '/settings';
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

// Проверка авторизации (общая для всех страниц)
function checkSidebarAuth() {
    console.log('[Auth] Checking auth status...');
    
    // Список страниц, которые НЕ требуют авторизации в админке
    const publicPages = ['/', '/auth'];
    const currentPath = window.location.pathname;
    
    // Если это публичная страница, пропускаем проверку
    if (publicPages.includes(currentPath)) {
        console.log('[Auth] Public page, skipping auth check');
        return true;
    }
    
    const appUser = AppStorage.getItem('app_user');
    const authTime = AppStorage.getItem('app_auth_time');
    
    if (!appUser || !authTime || (Date.now() - parseInt(authTime)) > 24 * 60 * 60 * 1000) {
        console.log('[Auth] User is not authenticated, redirecting to auth');
        window.location.href = '/';
        return false;
    }
    
    return true;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем авторизацию
    if (!checkSidebarAuth()) {
        return;
    }
    
    // Обновляем счетчики
    updateSidebarCounters();
    
    // Устанавливаем активный пункт меню на основе текущего URL
    const currentPath = window.location.pathname;
    const menuItems = document.querySelectorAll('.sidebar__item[data-page]');
    
    menuItems.forEach(item => {
        const href = item.getAttribute('href');
        
        if (href === currentPath) {
            item.classList.add('sidebar__item--active');
        } else {
            item.classList.remove('sidebar__item--active');
        }
    });

    initMobileSidebar();
    initHeaderUserMenu();
    applyRoleAccessRules();
});

// Глобальные функции
window.toggleSection = toggleSection;
window.updateSidebarCounters = updateSidebarCounters;
window.checkSidebarAuth = checkSidebarAuth;
window.toggleMobileSidebar = toggleMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;
window.logoutAppUser = logoutAppUser;
