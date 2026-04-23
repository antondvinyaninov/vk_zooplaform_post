function buildSidebarTemplate() {
    return `
        <aside class="sidebar">
            <div class="sidebar__header">
                <a href="/dashboard" class="sidebar__logo">
                    <div class="sidebar__logo-icon">UI</div>
                    <span class="sidebar__logo-text">ZooPlatforma</span>
                </a>
            </div>

            <nav class="sidebar__nav">
                <div class="sidebar__section">
                    <div class="sidebar__section-header" onclick="toggleSection(this)">
                        <span class="sidebar__section-title">Управление</span>
                        <span class="sidebar__section-toggle">▼</span>
                    </div>
                    <div class="sidebar__section-content">
                        <a href="/dashboard" class="sidebar__item" data-page="dashboard">
                            <span>Панель управления</span>
                        </a>
                        <a href="/groups" class="sidebar__item" data-page="groups">
                            <span>Группы</span>
                            <span class="sidebar__item-counter" id="sidebarGroupsCount">0</span>
                        </a>
                        <a href="/posts" class="sidebar__item" data-page="posts">
                            <span>Посты</span>
                            <span class="sidebar__item-counter" id="sidebarPostsCount">0</span>
                        </a>
                        <a href="/settings" class="sidebar__item" data-page="settings">
                            <span>Настройки</span>
                        </a>
                        <a href="/users" class="sidebar__item" data-page="users">
                            <span>Пользователи</span>
                        </a>
                    </div>
                </div>

                <div class="sidebar__section">
                    <div class="sidebar__section-header" onclick="toggleSection(this)">
                        <span class="sidebar__section-title">Настройки</span>
                        <span class="sidebar__section-toggle">▼</span>
                    </div>
                    <div class="sidebar__section-content">
                        <a href="/vk-connect" class="sidebar__item" data-page="vk-connect">
                            <span>Подключить ВК</span>
                        </a>
                    </div>
                </div>
            </nav>
        </aside>
    `;
}

function renderSharedSidebar() {
    const placeholders = document.querySelectorAll('[data-sidebar-root]');
    if (!placeholders.length) {
        return;
    }

    const template = buildSidebarTemplate();
    placeholders.forEach((root) => {
        root.outerHTML = template;
    });
}

document.addEventListener('DOMContentLoaded', renderSharedSidebar);
