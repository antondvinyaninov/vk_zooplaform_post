const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : `${window.location.origin}/api`;

const groupSelect = document.getElementById('groupSelect');
const customGroupIdInput = document.getElementById('customGroupId');
const filterSelect = document.getElementById('filterSelect');
const loadPostsBtn = document.getElementById('loadPostsBtn');
const loadResult = document.getElementById('loadResult');
const postsContainer = document.getElementById('postsContainer');
const postsList = document.getElementById('postsList');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreContainer = document.getElementById('loadMoreContainer');

let currentOffset = 0;
let currentGroupId = null;
let currentFilter = 'all';
let hasMorePosts = true;

// Загружаем список групп
function loadGroupsList() {
    const groupsData = localStorage.getItem('vk_selected_groups_data');
    
    if (!groupsData) {
        groupSelect.innerHTML = '<option value="">Сначала подключите группы</option>';
        loadPostsBtn.disabled = true;
        return;
    }
    
    const groups = JSON.parse(groupsData);
    
    if (groups.length === 0) {
        groupSelect.innerHTML = '<option value="">Сначала подключите группы</option>';
        loadPostsBtn.disabled = true;
        return;
    }
    
    groupSelect.innerHTML = '<option value="">Выберите группу</option>';
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = `-${group.id}`;
        option.textContent = `${group.name} (@${group.screen_name})`;
        option.dataset.groupName = group.name;
        groupSelect.appendChild(option);
    });
}

// Форматирование даты
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Форматирование текста поста
function formatPostText(text) {
    if (!text) return '<em style="color: #999;">Текст отсутствует</em>';
    
    // Заменяем переносы строк на <br>
    text = text.replace(/\n/g, '<br>');
    
    // Делаем ссылки кликабельными
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #667eea;">$1</a>');
    
    return text;
}

// Отрисовка постов
function renderPosts(posts, append = false) {
    if (!append) {
        postsList.innerHTML = '';
    }
    
    if (posts.length === 0 && !append) {
        postsList.innerHTML = '<p style="text-align: center; color: #666;">Посты не найдены</p>';
        return;
    }
    
    posts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        
        // Формируем информацию о вложениях
        let attachmentsHTML = '';
        if (post.attachments && post.attachments.length > 0) {
            attachmentsHTML = '<div class="post-attachments">';
            post.attachments.forEach(att => {
                if (att.type === 'photo') {
                    const photo = att.photo.sizes[att.photo.sizes.length - 1]; // Берём самое большое фото
                    attachmentsHTML += `<img src="${photo.url}" alt="Фото" style="max-width: 100%; border-radius: 8px; margin-top: 10px;">`;
                } else if (att.type === 'video') {
                    attachmentsHTML += `<div style="padding: 10px; background: #f5f5f5; border-radius: 8px; margin-top: 10px;">📹 Видео</div>`;
                } else if (att.type === 'link') {
                    attachmentsHTML += `<div style="padding: 10px; background: #f5f5f5; border-radius: 8px; margin-top: 10px;">🔗 Ссылка: ${att.link.title || att.link.url}</div>`;
                } else {
                    attachmentsHTML += `<div style="padding: 10px; background: #f5f5f5; border-radius: 8px; margin-top: 10px;">📎 ${att.type}</div>`;
                }
            });
            attachmentsHTML += '</div>';
        }
        
        // Формируем статистику
        const stats = `
            <div class="post-stats">
                <span>👁 ${post.views ? post.views.count.toLocaleString() : 0}</span>
                <span>❤️ ${post.likes ? post.likes.count : 0}</span>
                <span>💬 ${post.comments ? post.comments.count : 0}</span>
                <span>🔄 ${post.reposts ? post.reposts.count : 0}</span>
            </div>
        `;
        
        postCard.innerHTML = `
            <div class="post-header">
                <div class="post-date">${formatDate(post.date)}</div>
                <a href="https://vk.com/wall${post.owner_id}_${post.id}" target="_blank" class="post-link">Открыть в VK →</a>
            </div>
            <div class="post-text">${formatPostText(post.text)}</div>
            ${attachmentsHTML}
            ${stats}
        `;
        
        postsList.appendChild(postCard);
    });
}

// Парсинг ID группы из разных форматов
function parseGroupId(input) {
    if (!input) return null;
    
    input = input.trim();
    
    // Если это ссылка VK
    if (input.includes('vk.com/')) {
        // Извлекаем короткое имя или ID из ссылки
        const match = input.match(/vk\.com\/([^/?#]+)/);
        if (match) {
            input = match[1];
        }
    }
    
    // Убираем префиксы club, public, event
    input = input.replace(/^(club|public|event)/, '');
    
    // Если это число - добавляем минус
    if (/^\d+$/.test(input)) {
        return `-${input}`;
    }
    
    // Если это короткое имя - возвращаем как есть
    return input;
}

// Загрузка постов
async function loadPosts(append = false) {
    const accessToken = localStorage.getItem('vk_access_token');
    let ownerId = groupSelect.value;
    const customId = customGroupIdInput.value.trim();
    const filter = filterSelect.value;
    
    // Если введен custom ID - используем его
    if (customId) {
        ownerId = parseGroupId(customId);
    }
    
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
    
    if (!ownerId) {
        loadResult.className = 'result show error';
        loadResult.innerHTML = `
            <strong>✗ Ошибка!</strong>
            <p>Выберите группу или введите ссылку</p>
        `;
        return;
    }
    
    try {
        if (!append) {
            loadPostsBtn.disabled = true;
            loadPostsBtn.textContent = 'Загрузка...';
            currentOffset = 0;
            currentGroupId = ownerId;
            currentFilter = filter;
            hasMorePosts = true;
        } else {
            loadMoreBtn.disabled = true;
            loadMoreBtn.textContent = 'Загрузка...';
        }
        
        loadResult.className = '';
        loadResult.innerHTML = '';
        
        const response = await fetch(`${API_URL}/vk/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                access_token: accessToken,
                owner_id: ownerId,
                count: 10,
                offset: currentOffset,
                filter: filter
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
        
        const posts = data.items || [];
        
        if (posts.length === 0 && !append) {
            const filterNames = {
                'all': 'постов',
                'owner': 'постов от группы',
                'others': 'постов от пользователей',
                'postponed': 'отложенных постов',
                'suggests': 'предложенных постов'
            };
            loadResult.className = 'result show error';
            loadResult.innerHTML = `
                <strong>⚠ Внимание!</strong>
                <p>В этой группе нет ${filterNames[filter]}</p>
            `;
            postsContainer.style.display = 'none';
            return;
        }
        
        if (!append) {
            const groupName = customGroupIdInput.value.trim() 
                ? `Группа: ${ownerId}` 
                : groupSelect.options[groupSelect.selectedIndex].dataset.groupName;
            loadResult.className = 'result show success';
            loadResult.innerHTML = `
                <strong>✓ Загружено постов: ${posts.length}</strong>
                <p>Всего постов: ${data.count}</p>
            `;
            postsContainer.style.display = 'block';
        }
        
        renderPosts(posts, append);
        
        currentOffset += posts.length;
        
        // Проверяем, есть ли ещё посты
        if (currentOffset >= data.count || posts.length < 10) {
            hasMorePosts = false;
            loadMoreContainer.style.display = 'none';
        } else {
            loadMoreContainer.style.display = 'block';
        }
        
    } catch (error) {
        loadResult.className = 'result show error';
        loadResult.innerHTML = `
            <strong>✗ Ошибка!</strong>
            <p>${error.message}</p>
        `;
    } finally {
        loadPostsBtn.disabled = false;
        loadPostsBtn.textContent = 'Загрузить посты';
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Загрузить ещё';
    }
}

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    loadGroupsList();
});

loadPostsBtn.addEventListener('click', () => loadPosts(false));
loadMoreBtn.addEventListener('click', () => loadPosts(true));

// Сброс при смене группы или фильтра
groupSelect.addEventListener('change', () => {
    if (groupSelect.value) {
        customGroupIdInput.value = '';
    }
    postsContainer.style.display = 'none';
    loadResult.className = '';
    loadResult.innerHTML = '';
});

customGroupIdInput.addEventListener('input', () => {
    if (customGroupIdInput.value.trim()) {
        groupSelect.value = '';
    }
    postsContainer.style.display = 'none';
    loadResult.className = '';
    loadResult.innerHTML = '';
});

filterSelect.addEventListener('change', () => {
    postsContainer.style.display = 'none';
    loadResult.className = '';
    loadResult.innerHTML = '';
});
