import { UserInfo } from '@vkontakte/vk-bridge';

const isVKCDN = window.location.hostname.includes('vk-apps.com');
const API_URL = isVKCDN ? 'https://d5dm8lfd2hhhn5plloht.p8361f8z.apigw.yandexcloud.net/api/app' : '/api/app';

export interface AppUser {
  id: number;
  vk_user_id: number;
  first_name: string;
  last_name: string;
  photo_200: string;
  role: string;
}

export interface AppGroup {
  id: number;
  vk_group_id: number;
  name: string;
  screen_name: string;
  photo_200: string;
}

export interface AppGroupSettings extends AppGroup {
  is_active: boolean;
  has_token: boolean;
  notify_user_ids: number[];
  city_id?: number;
  city_title?: string;
}

export interface AppAttachmentURL {
  id: string;
  type: string;
  url: string;
}

export interface AppPost {
  id: number;
  title: string;
  message: string;
  status: 'pending' | 'scheduled' | 'published' | 'rejected' | 'failed' | 'draft';
  vk_post_id?: number;
  publish_date?: string;
  attachments?: string;
  attachment_urls?: AppAttachmentURL[];
  created_at: string;
  updated_at: string;
  group?: AppGroup;
  author?: AppUser;
}

const getVKLaunchSignature = () => {
  // Используем launch параметры из VK Bridge
  const launchParams = window.vkLaunchParams || {};
  const params = new URLSearchParams();
  
  Object.entries(launchParams).forEach(([key, value]) => {
    if (key.startsWith('vk_') && value !== undefined) {
      params.set(key, String(value));
    }
  });
  
  return params.toString();
};

const fetchJSON = async <T>(input: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-vk-sign': getVKLaunchSignature(),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch {
      // ignore JSON parse failure and keep default message
    }
    throw new Error(message);
  }

  return response.json();
};

export const syncUserWithBackend = async (user: UserInfo, vkSignature?: string) => {
  const params = new URLSearchParams();
  params.append('firstName', user?.first_name || '');
  params.append('lastName', user?.last_name || '');
  params.append('photo200', user?.photo_200 || '');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (vkSignature) {
    headers['x-vk-sign'] = vkSignature;
  } else {
    headers['x-vk-sign'] = getVKLaunchSignature();
  }

  const response = await fetch(`${API_URL}/users/me?${params.toString()}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch {
      // ignore JSON parse failure and keep default message
    }
    throw new Error(message);
  }

  return response.json() as Promise<{ user: AppUser; viewerRole: string; groupId: number }>;
};

export const createPost = async (message: string, files: File[] = []) => {
  const formData = new FormData();
  formData.append('message', message);
  files.forEach((file) => {
    formData.append('media', file);
  });

  const response = await fetch(`${API_URL}/posts`, {
    method: 'POST',
    headers: {
      'X-VK-Sign': getVKLaunchSignature(),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Request failed');
  }

  return response.json() as Promise<AppPost>;
};

export const getFeedPosts = async (status = 'published') => {
  return fetchJSON<AppPost[]>(`${API_URL}/posts?status=${encodeURIComponent(status)}`);
};

export const getMyPosts = async () => {
  return fetchJSON<AppPost[]>(`${API_URL}/posts/my`);
};

export const getPostById = async (id: string | number) => {
  return fetchJSON<AppPost>(`${API_URL}/posts/${id}`);
};

export const moderatePost = async (
  id: number,
  status: 'published' | 'scheduled' | 'rejected',
  publishDate?: Date,
) => {
  return fetchJSON<AppPost>(`${API_URL}/posts/${id}/moderate`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      publish_date: publishDate?.toISOString(),
    }),
  });
};

export const saveGroupToken = async (groupId: number, token: string) => {
  return fetchJSON<{ group: AppGroup }>(`${API_URL}/groups/token`, {
    method: 'POST',
    body: JSON.stringify({
      vk_group_id: groupId,
      access_token: token,
    }),
  });
};

export const getCommunitySettings = async () => {
  return fetchJSON<AppGroupSettings>(`${API_URL}/groups/me`, { method: 'GET' });
};

export interface AppManager {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
}

export const getCommunityManagers = async () => {
  return fetchJSON<AppManager[]>(`${API_URL}/groups/me/managers`, { method: 'GET' });
};

let cachedCityToken = '';

export const searchCities = async (query: string): Promise<{id: number, title: string, region?: string}[]> => {
  if (!query) return [];
  
  try {
    if (!cachedCityToken) {
      // @ts-ignore
      const launchParams = window.vkLaunchParams || {};
      const appId = Number(launchParams.vk_app_id);
      if (appId) {
        try {
          // @ts-ignore
          const tokenData = await window.vkBridge.send('VKWebAppGetAuthToken', { 
            app_id: appId, 
            scope: '' 
          });
          cachedCityToken = tokenData.access_token;
        } catch (e) {
          console.error("Failed to get auth token for cities", e);
        }
      }
    }

    if (!cachedCityToken) {
      console.warn("No access token available for database.getCities");
      return [];
    }

    // @ts-ignore
    const data = await window.vkBridge.send('VKWebAppCallAPIMethod', {
      method: 'database.getCities',
      request_id: 'search_cities_' + Date.now(),
      params: {
        country_id: 1,
        q: query,
        v: '5.131',
        need_all: 1,
        count: 20,
        access_token: cachedCityToken
      }
    });
    
    // @ts-ignore
    if (data.response && data.response.items) {
      // @ts-ignore
      return data.response.items;
    }
    return [];
  } catch (error) {
    console.error("VKWebAppCallAPIMethod database.getCities error:", error);
    return [];
  }
};

export const updateCommunitySettings = async (payload: Partial<Pick<AppGroupSettings, 'name' | 'screen_name' | 'photo_200' | 'is_active' | 'notify_user_ids' | 'city_id' | 'city_title'>>) => {
  return fetchJSON<AppGroupSettings>(`${API_URL}/groups/me`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};
