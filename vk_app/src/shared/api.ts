import { UserInfo } from '@vkontakte/vk-bridge';

const API_URL = '/api/app';

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
}

export interface AppPost {
  id: number;
  title: string;
  message: string;
  status: 'pending' | 'scheduled' | 'published' | 'rejected' | 'failed' | 'draft';
  vk_post_id?: number;
  publish_date?: string;
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

export const createPost = async (message: string) => {
  return fetchJSON<AppPost>(`${API_URL}/posts`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
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

export const updateCommunitySettings = async (payload: Partial<Pick<AppGroupSettings, 'name' | 'screen_name' | 'photo_200' | 'is_active' | 'notify_user_ids'>>) => {
  return fetchJSON<AppGroupSettings>(`${API_URL}/groups/me`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};
