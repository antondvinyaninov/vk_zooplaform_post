import vkBridgeModule from '@vkontakte/vk-bridge';
const vkBridge = (vkBridgeModule as any).send ? vkBridgeModule : (vkBridgeModule as any).default;
import { UserInfo } from '@vkontakte/vk-bridge';

const isVKCDN = window.location.hostname.includes('vk-apps.com');
const API_URL = isVKCDN ? 'https://d5dm8lfd2hhhn5plloht.p8361f8z.apigw.yandexcloud.net/api/app' : '/api/app';

export interface AppUser {
  id: number;
  vk_user_id: number;
  first_name: string;
  last_name: string;
  photo_200: string;
  city_id?: number;
  city_title?: string;
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

export interface AppPostPublication {
  id: number;
  group_id: number;
  group?: AppGroup;
  status: 'pending' | 'scheduled' | 'published' | 'rejected' | 'failed' | 'draft';
  vk_post_id?: number;
  reject_reason?: string;
  publish_date?: string;
  created_at: string;
  updated_at: string;
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
  publications?: AppPostPublication[];
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
  const vkSignature = getVKLaunchSignature();
  const separator = input.includes('?') ? '&' : '?';
  const urlWithSignature = `${input}${separator}x-vk-sign=${encodeURIComponent(vkSignature)}`;

  const response = await fetch(urlWithSignature, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-vk-sign': vkSignature,
      'Authorization': `Bearer ${vkSignature}`,
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
  
  if (user?.city) {
    params.append('cityId', String(user.city.id));
    params.append('cityTitle', user.city.title);
  }


  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const finalSignature = vkSignature || getVKLaunchSignature();
  if (finalSignature) {
    headers['x-vk-sign'] = finalSignature;
    headers['Authorization'] = `Bearer ${finalSignature}`;
    params.append('x-vk-sign', finalSignature);
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

export const updateUserProfile = async (payload: { city_id?: number; city_title?: string }) => {
  return fetchJSON<AppUser>(`${API_URL}/users/me`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const getS3PresignedUrl = async (fileName: string, fileType: string) => {
  return fetchJSON<{ upload_url: string; key: string }>(
    `${API_URL}/upload/presign?filename=${encodeURIComponent(fileName)}&type=${encodeURIComponent(fileType || 'application/octet-stream')}`
  );
};

export const uploadMediaToS3 = async (file: File, uploadUrl: string, explicitType?: string) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    
    // Ensure the Content-Type header matches exactly what the URL was presigned with
    const contentType = explicitType || file.type || 'application/octet-stream';
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(true);
      } else {
        reject(new Error(`S3 Media upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = (e) => {
      console.error('XHR Error:', e);
      reject(new Error(`S3 Media upload failed due to network error. URL: ${uploadUrl.substring(0, 50)}... Type: ${file.type}, Size: ${file.size}`));
    };

    xhr.send(file);
  });
};

export const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 1600;
      
      if (width > height && width > MAX_SIZE) {
        height *= MAX_SIZE / width;
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width *= MAX_SIZE / height;
        height = MAX_SIZE;
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
        } else {
          resolve(file);
        }
      }, 'image/jpeg', 0.80);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
};

export const createPost = async (message: string, s3MediaKeys: string[] = [], videoIds: string[] = []) => {
  const formData = new FormData();
  formData.append('message', message);
  if (videoIds.length > 0) {
    formData.append('attachments', videoIds.join(','));
  }
  if (s3MediaKeys.length > 0) {
    formData.append('s3_media_keys', s3MediaKeys.join(',')); // Поддерживаем несколько медиа-файлов на S3
  }

  const vkSignature = getVKLaunchSignature();
  const response = await fetch(`${API_URL}/posts?x-vk-sign=${encodeURIComponent(vkSignature)}`, {
    method: 'POST',
    headers: {
      'X-VK-Sign': vkSignature,
      'Authorization': `Bearer ${vkSignature}`,
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


export const deletePost = async (id: string | number, reason: string, comment: string = '') => {
  return fetchJSON<void>(`${API_URL}/posts/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, comment }),
  });
};

export const getPostById = async (id: string | number) => {
  return fetchJSON<AppPost>(`${API_URL}/posts/${id}`);
};

export const editPost = async (id: string | number, message: string, s3MediaKeys: string[] = [], attachments: string = '') => {
  return fetchJSON<AppPost>(`${API_URL}/posts/${id}`, {
    method: 'POST',
    body: JSON.stringify({ 
      message, 
      s3_video_keys: s3MediaKeys,
      attachments
    }),
  });
};

export const moderatePost = async (
  id: number,
  status: 'published' | 'scheduled' | 'rejected',
  publishDate?: Date,
  rejectReason?: string,
) => {
  return fetchJSON<AppPost>(`${API_URL}/posts/${id}/moderate`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      publish_date: publishDate?.toISOString(),
      reject_reason: rejectReason,
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
          const tokenData = await vkBridge.send('VKWebAppGetAuthToken', { 
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
    const data = await vkBridge.send('VKWebAppCallAPIMethod', {
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

export const suggestExistingPost = async (id: number | string) => {
  return fetchJSON<AppPost>(`${API_URL}/posts/${id}/suggest`, {
    method: 'POST',
  });
};
