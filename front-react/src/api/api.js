// API URL
const API_URL = import.meta.env.DEV 
    ? 'http://localhost/api' 
    : `${window.location.origin}/api`;

// JSONP для обхода CORS при прямых запросах к VK API
const vkApiJsonp = (method, params) => {
    return new Promise((resolve, reject) => {
        const callbackName = 'vkCallback' + Date.now() + Math.random().toString(36).substr(2, 9);
        
        // Создаем глобальный callback
        window[callbackName] = (data) => {
            // Удаляем script и callback
            document.head.removeChild(script);
            delete window[callbackName];
            resolve(data);
        };
        
        // Формируем URL с callback
        const queryParams = new URLSearchParams({
            ...params,
            callback: callbackName
        });
        
        const script = document.createElement('script');
        script.src = `https://api.vk.com/method/${method}?${queryParams}`;
        script.onerror = () => {
            document.head.removeChild(script);
            delete window[callbackName];
            reject(new Error('JSONP request failed'));
        };
        
        // Таймаут на случай если VK не ответит
        setTimeout(() => {
            if (window[callbackName]) {
                document.head.removeChild(script);
                delete window[callbackName];
                reject(new Error('JSONP request timeout'));
            }
        }, 10000);
        
        document.head.appendChild(script);
    });
};

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

// Получение групп напрямую из VK API (обход проблемы с IP)
export const getGroups = async () => {
    const token = getAccessToken();
    if (!token) {
        return { error: 'Нет токена авторизации' };
    }

    try {
        // Пробуем JSONP для обхода CORS
        const data = await vkApiJsonp('groups.get', {
            access_token: token,
            extended: 1,
            filter: 'admin,editor,moder',
            v: '5.131'
        });
        
        if (data.response) {
            return data.response;
        } else if (data.error) {
            console.log('JSONP VK API failed, trying through backend...');
            return await getGroupsThroughBackend();
        }
        
        return data;
    } catch (error) {
        console.error('Error in JSONP VK API call:', error);
        // Fallback на backend
        return await getGroupsThroughBackend();
    }
};

// Запрос через наш backend (старый метод)
const getGroupsThroughBackend = async () => {
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

// Получение информации о пользователе напрямую из VK API
export const getUserInfo = async (userId) => {
    console.log('getUserInfo called with:', userId);
    const token = getAccessToken();
    console.log('Access token:', token?.substring(0, 20) + '...');
    
    try {
        // Пробуем JSONP для обхода CORS
        const data = await vkApiJsonp('users.get', {
            user_ids: userId,
            fields: 'photo_200',
            access_token: token,
            v: '5.131'
        });
        
        console.log('JSONP VK API response:', data);
        
        if (data.response) {
            return data;
        } else if (data.error) {
            console.log('JSONP VK API failed, trying through backend...');
            return await getUserInfoThroughBackend(userId);
        }
        
        return data;
    } catch (error) {
        console.error('Error in JSONP VK API call:', error);
        return await getUserInfoThroughBackend(userId);
    }
};

// Запрос через наш backend с fallback на service key
const getUserInfoThroughBackend = async (userId) => {
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
