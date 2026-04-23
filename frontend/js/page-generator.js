// Генератор страниц на основе шаблонов

class PageGenerator {
    constructor() {
        this.baseTemplate = '';
        this.sidebarTemplate = '';
        this.loadTemplates();
    }
    
    async loadTemplates() {
        try {
            // В реальном приложении здесь был бы fetch к шаблонам
            // Пока используем встроенные шаблоны
            this.baseTemplate = this.getBaseTemplate();
            this.sidebarTemplate = this.getSidebarTemplate();
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }
    
    generatePage(config) {
        const {
            title,
            activePage,
            mainContent,
            additionalStyles = '',
            additionalScripts = ''
        } = config;
        
        // Генерируем сайдбар с активным пунктом
        const sidebar = this.generateSidebar(activePage);
        
        // Заменяем плейсхолдеры в базовом шаблоне
        let html = this.baseTemplate
            .replace('{{TITLE}}', title)
            .replace('{{SIDEBAR}}', sidebar)
            .replace('{{MAIN_CONTENT}}', mainContent)
            .replace('{{ADDITIONAL_STYLES}}', additionalStyles)
            .replace('{{ADDITIONAL_SCRIPTS}}', additionalScripts);
        
        return html;
    }
    
    generateSidebar(activePage) {
        const activeClasses = {
            dashboard: activePage === 'dashboard' ? 'sidebar__item--active' : '',
            groups: activePage === 'groups' ? 'sidebar__item--active' : '',
            posts: activePage === 'posts' ? 'sidebar__item--active' : '',
            settings: activePage === 'settings' ? 'sidebar__item--active' : '',
            users: activePage === 'users' ? 'sidebar__item--active' : '',
            'vk-connect': activePage === 'vk-connect' ? 'sidebar__item--active' : ''
        };
        
        return this.sidebarTemplate
            .replace('{{DASHBOARD_ACTIVE}}', activeClasses.dashboard)
            .replace('{{GROUPS_ACTIVE}}', activeClasses.groups)
            .replace('{{POSTS_ACTIVE}}', activeClasses.posts)
            .replace('{{SETTINGS_ACTIVE}}', activeClasses.settings)
            .replace('{{USERS_ACTIVE}}', activeClasses.users)
            .replace('{{VK_CONNECT_ACTIVE}}', activeClasses['vk-connect']);
    }
    
    getBaseTemplate() {
        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} - VK ZooPlatforma</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📱</text></svg>">
    
    <!-- Общие стили VKUI -->
    <link rel="stylesheet" href="../css/vkui-base.css?v=20260422-2">
    
    <!-- Дополнительные стили страницы -->
    {{ADDITIONAL_STYLES}}
</head>
<body>
    <div class="layout">
        <!-- Sidebar -->
        {{SIDEBAR}}

        <!-- Content -->
        <div class="content panel">
            <!-- Header -->
            <header class="header">
                <div class="header__content">
                    <div class="header__left">
                        <button type="button" class="header__menu-btn" aria-label="Открыть меню" onclick="toggleMobileSidebar()">☰</button>
                    </div>
                    <div class="header__center">
                        <h1 class="header__title">{{TITLE}}</h1>
                    </div>
                    <div class="header__right">
                        <!-- Пустое место для будущих элементов -->
                    </div>
                </div>
            </header>

            <!-- Main content -->
            <main class="main">
                {{MAIN_CONTENT}}
            </main>
        </div>
    </div>

    <!-- Общие скрипты -->
    <script src="../js/utils.js"></script>
    <script src="../js/layout.js?v=20260422-1"></script>
    <script src="../js/sidebar.js?v=20260422-4"></script>
    
    <!-- Дополнительные скрипты страницы -->
    {{ADDITIONAL_SCRIPTS}}
</body>
</html>`;
    }
    
    getSidebarTemplate() {
        return `<aside class="sidebar">
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
                <a href="/dashboard" class="sidebar__item {{DASHBOARD_ACTIVE}}" data-page="dashboard">
                    <span>Панель управления</span>
                </a>
                <a href="/groups" class="sidebar__item {{GROUPS_ACTIVE}}" data-page="groups">
                    <span>Группы</span>
                    <span class="sidebar__item-counter" id="sidebarGroupsCount">0</span>
                </a>
                <a href="/posts" class="sidebar__item {{POSTS_ACTIVE}}" data-page="posts">
                    <span>Посты</span>
                    <span class="sidebar__item-counter" id="sidebarPostsCount">0</span>
                </a>
                <a href="/settings" class="sidebar__item {{SETTINGS_ACTIVE}}" data-page="settings">
                    <span>Настройки</span>
                </a>
                <a href="/users" class="sidebar__item {{USERS_ACTIVE}}" data-page="users">
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
                <a href="/vk-connect" class="sidebar__item {{VK_CONNECT_ACTIVE}}" data-page="vk-connect">
                    <span>Подключить ВК</span>
                </a>
            </div>
        </div>
    </nav>
</aside>`;
    }
}

// Экспортируем для использования
window.PageGenerator = PageGenerator;
