// API URL
const API_URL = import.meta.env.DEV 
    ? 'http://localhost/api' 
    : `${window.location.origin}/api`;

// Получение токена
export const getAccessToken = () => localStorage.getItem('vk_access_token');

// Получение ID пользователя
export const getUserId = () => localStorage.getItem('vk_user_id');

// Проверка авторизации
export const isAuthorized = () => !!getAccessToken();

// Публикация поста
export const publishPost = async (formData) => {
    const response = await fetch(`${API_URL}/vk/post`, {
        method: 'POST',
        body: formData
    });
    return response.json();
};

// Получение групп
export const getGroups = async () => {
    const response = await fetch(`${API_URL}/vk/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: getAccessToken()
        })
    });
    return response.json();
};

// Получение постов
export const getPosts = async (ownerId, count = 10, offset = 0, filter = 'all') => {
    const response = await fetch(`${API_URL}/vk/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: getAccessToken(),
            owner_id: ownerId,
            count,
            offset,
            filter: filter !== 'all' ? filter : undefined
        })
    });
    return response.json();
};

// Репост
export const repostPost = async (object, groupId) => {
    const response = await fetch(`${API_URL}/vk/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: getAccessToken(),
            object,
            group_id: groupId
        })
    });
    return response.json();
};

// Копирование поста
export const copyPost = async (ownerId, message, attachments) => {
    const response = await fetch(`${API_URL}/vk/copy-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: getAccessToken(),
            owner_id: ownerId,
            message,
            attachments,
            from_group: 1
        })
    });
    return response.json();
};

// Получение информации о пользователе
export const getUserInfo = async (userId) => {
    console.log('getUserInfo called with:', userId);
    console.log('Access token:', getAccessToken()?.substring(0, 20) + '...');
    
    // Пробуем получить через service key если user token не работает
    try {
        const response = await fetch(`${API_URL}/vk/user-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: getAccessToken(),
                user_ids: String(userId)
            })
        });
        
        console.log('Response status:', response.status);
        
        const text = await response.text();
        console.log('Response text:', text);
        
        if (!text) {
            throw new Error('Empty response from server');
        }
        
        const data = JSON.parse(text);
        
        // Если ошибка IP - пробуем через service key
        if (data.error && data.error.includes('ip address')) {
            console.log('Trying with service key...');
            
            const serviceKeyResponse = await fetch(`${API_URL}/vk/service-key`);
            const serviceKeyData = await serviceKeyResponse.json();
            
            if (serviceKeyData.service_key) {
                const retryResponse = await fetch(`${API_URL}/vk/user-info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: serviceKeyData.service_key,
                        user_ids: String(userId)
                    })
                });
                
                const retryText = await retryResponse.text();
                return JSON.parse(retryText);
            }
        }
        
        return data;
    } catch (e) {
        console.error('Failed to get user info:', e);
        throw e;
    }
};

// Сохранение токена
export const saveToken = (token, userId) => {
    localStorage.setItem('vk_access_token', token);
    localStorage.setItem('vk_user_id', userId);
    localStorage.setItem('vk_token_expires', Date.now() + (365 * 24 * 60 * 60 * 1000));
};

// Выход
export const logout = () => {
    localStorage.removeItem('vk_access_token');
    localStorage.removeItem('vk_user_id');
    localStorage.removeItem('vk_user_name');
    localStorage.removeItem('vk_user_photo');
};
