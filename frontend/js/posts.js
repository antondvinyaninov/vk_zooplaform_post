const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost/api' 
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
    
    // Сохраняем посты в глобальную переменную для доступа при копировании
    window.currentPosts = window.currentPosts || {};
    
    posts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        postCard.dataset.postId = post.id;
        postCard.dataset.ownerId = post.owner_id;
        
        // Сохраняем полные данные поста
        const postKey = `${post.owner_id}_${post.id}`;
        window.currentPosts[postKey] = post;
        
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
        
        // Кнопка репоста
        const repostBtn = `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; display: flex; gap: 10px;">
                <button class="repost-btn" data-post-id="${post.id}" data-owner-id="${post.owner_id}" style="flex: 1; background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    🔄 Репостнуть
                </button>
                <button class="copy-post-btn" data-post-id="${post.id}" data-owner-id="${post.owner_id}" style="flex: 1; background: #764ba2; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    📋 Скопировать пост
                </button>
                <div class="repost-result" style="margin-top: 10px; width: 100%;"></div>
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
            ${repostBtn}
        `;
        
        postsList.appendChild(postCard);
    });
    
    // Добавляем обработчики для кнопок репоста
    document.querySelectorAll('.repost-btn').forEach(btn => {
        btn.addEventListener('click', handleRepost);
    });
    
    // Добавляем обработчики для кнопок копирования
    document.querySelectorAll('.copy-post-btn').forEach(btn => {
        btn.addEventListener('click', handleCopyPost);
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

// Обработчик репоста
async function handleRepost(e) {
    const btn = e.target;
    const postId = btn.dataset.postId;
    const ownerId = btn.dataset.ownerId;
    const resultDiv = btn.nextElementSibling;
    
    // Получаем список своих групп
    const groupsData = localStorage.getItem('vk_selected_groups_data');
    if (!groupsData) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = '<small>Сначала подключите свои группы</small>';
        return;
    }
    
    const groups = JSON.parse(groupsData);
    if (groups.length === 0) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = '<small>Сначала подключите свои группы</small>';
        return;
    }
    
    // Показываем модальное окно выбора группы
    const groupOptions = groups.map(g => 
        `<option value="-${g.id}">${g.name}</option>`
    ).join('');
    
    resultDiv.innerHTML = `
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 10px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Выберите группу:</label>
            <select id="repostGroupSelect-${postId}" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 6px; margin-bottom: 10px;">
                ${groupOptions}
            </select>
            <div style="display: flex; gap: 10px;">
                <button class="confirm-repost-btn" data-post-id="${postId}" data-owner-id="${ownerId}" style="flex: 1; background: #667eea; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer;">
                    Репостнуть
                </button>
                <button class="cancel-repost-btn" style="flex: 1; background: #ccc; color: #333; border: none; padding: 8px; border-radius: 6px; cursor: pointer;">
                    Отмена
                </button>
            </div>
            <div class="repost-status" style="margin-top: 10px;"></div>
        </div>
    `;
    
    // Обработчик подтверждения
    resultDiv.querySelector('.confirm-repost-btn').addEventListener('click', async (e) => {
        const confirmBtn = e.target;
        const targetGroupId = document.getElementById(`repostGroupSelect-${postId}`).value;
        const statusDiv = resultDiv.querySelector('.repost-status');
        
        if (!statusDiv) {
            console.error('Status div not found');
            return;
        }
        
        try {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Репостим...';
            
            const accessToken = localStorage.getItem('vk_access_token');
            
            console.log('Repost request:', {
                object: `wall${ownerId}_${postId}`,
                group_id: targetGroupId.replace('-', '')
            });
            
            const response = await fetch(`${API_URL}/vk/repost`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    access_token: accessToken,
                    object: `wall${ownerId}_${postId}`,
                    group_id: targetGroupId.replace('-', '')
                })
            });
            
            console.log('Repost response status:', response.status);
            
            const contentType = response.headers.get('content-type');
            console.log('Content-Type:', contentType);
            
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new Error('Сервер вернул некорректный ответ');
            }
            
            console.log('Repost response data:', data);
            
            if (data.error) {
                statusDiv.className = 'result show error';
                statusDiv.innerHTML = `<small>Ошибка: ${data.error}</small>`;
            } else {
                statusDiv.className = 'result show success';
                statusDiv.innerHTML = `<small>✓ Репост успешно создан! ID: ${data.post_id}</small>`;
                
                // Скрываем форму через 2 секунды
                setTimeout(() => {
                    if (resultDiv) {
                        resultDiv.innerHTML = '';
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Repost error:', error);
            if (statusDiv) {
                statusDiv.className = 'result show error';
                statusDiv.innerHTML = `<small>Ошибка: ${error.message}</small>`;
            }
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Репостнуть';
            }
        }
    });
    
    // Обработчик отмены
    resultDiv.querySelector('.cancel-repost-btn').addEventListener('click', () => {
        resultDiv.innerHTML = '';
    });
}

// Обработчик копирования поста
async function handleCopyPost(e) {
    const btn = e.target;
    const postId = btn.dataset.postId;
    const ownerId = btn.dataset.ownerId;
    const resultDiv = btn.parentElement.querySelector('.repost-result');
    
    // Получаем данные поста
    const postKey = `${ownerId}_${postId}`;
    const post = window.currentPosts[postKey];
    
    if (!post) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = '<small>Данные поста не найдены</small>';
        return;
    }
    
    // Получаем список своих групп
    const groupsData = localStorage.getItem('vk_selected_groups_data');
    if (!groupsData) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = '<small>Сначала подключите свои группы</small>';
        return;
    }
    
    const groups = JSON.parse(groupsData);
    if (groups.length === 0) {
        resultDiv.className = 'result show error';
        resultDiv.innerHTML = '<small>Сначала подключите свои группы</small>';
        return;
    }
    
    // Показываем форму выбора группы
    const groupOptions = groups.map(g => 
        `<option value="-${g.id}">${g.name}</option>`
    ).join('');
    
    resultDiv.innerHTML = `
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 10px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Выберите группу:</label>
            <select id="copyGroupSelect-${postId}" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 6px; margin-bottom: 10px;">
                ${groupOptions}
            </select>
            <div style="display: flex; gap: 10px;">
                <button class="confirm-copy-btn" data-post-id="${postId}" data-owner-id="${ownerId}" style="flex: 1; background: #764ba2; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer;">
                    Скопировать
                </button>
                <button class="cancel-copy-btn" style="flex: 1; background: #ccc; color: #333; border: none; padding: 8px; border-radius: 6px; cursor: pointer;">
                    Отмена
                </button>
            </div>
            <div class="copy-status" style="margin-top: 10px;"></div>
        </div>
    `;
    
    // Обработчик подтверждения
    resultDiv.querySelector('.confirm-copy-btn').addEventListener('click', async (e) => {
        const confirmBtn = e.target;
        const targetGroupId = document.getElementById(`copyGroupSelect-${postId}`).value;
        const statusDiv = resultDiv.querySelector('.copy-status');
        
        if (!statusDiv) {
            console.error('Status div not found');
            return;
        }
        
        try {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Копируем...';
            
            const accessToken = localStorage.getItem('vk_access_token');
            
            // Формируем attachments из поста
            let attachments = [];
            if (post.attachments) {
                post.attachments.forEach(att => {
                    if (att.type === 'photo') {
                        attachments.push(`photo${att.photo.owner_id}_${att.photo.id}`);
                    } else if (att.type === 'video') {
                        attachments.push(`video${att.video.owner_id}_${att.video.id}`);
                    } else if (att.type === 'audio') {
                        attachments.push(`audio${att.audio.owner_id}_${att.audio.id}`);
                    } else if (att.type === 'doc') {
                        attachments.push(`doc${att.doc.owner_id}_${att.doc.id}`);
                    }
                });
            }
            
            console.log('Copy post request:', {
                owner_id: targetGroupId,
                message: post.text,
                attachments: attachments.join(',')
            });
            
            const response = await fetch(`${API_URL}/vk/copy-post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    access_token: accessToken,
                    owner_id: targetGroupId,
                    message: post.text || '',
                    attachments: attachments.join(','),
                    from_group: 1
                })
            });
            
            console.log('Copy response status:', response.status);
            
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new Error('Сервер вернул некорректный ответ');
            }
            
            console.log('Copy response data:', data);
            
            if (data.error) {
                statusDiv.className = 'result show error';
                statusDiv.innerHTML = `<small>Ошибка: ${data.error}</small>`;
            } else {
                statusDiv.className = 'result show success';
                statusDiv.innerHTML = `<small>✓ Пост скопирован! ID: ${data.post_id}</small>`;
                
                // Скрываем форму через 2 секунды
                setTimeout(() => {
                    if (resultDiv) {
                        resultDiv.innerHTML = '';
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Copy error:', error);
            if (statusDiv) {
                statusDiv.className = 'result show error';
                statusDiv.innerHTML = `<small>Ошибка: ${error.message}</small>`;
            }
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Скопировать';
            }
        }
    });
    
    // Обработчик отмены
    resultDiv.querySelector('.cancel-copy-btn').addEventListener('click', () => {
        resultDiv.innerHTML = '';
    });
}
