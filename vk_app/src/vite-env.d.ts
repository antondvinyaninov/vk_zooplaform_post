/// <reference types="vite/client" />

// VK Bridge типы
declare global {
  interface Window {
    vkBridge: {
      send: (method: string, params?: any) => Promise<any>;
      subscribe: (callback: (event: any) => void) => void;
    };
    vkLaunchParams: {
      vk_user_id?: number;
      vk_app_id?: number;
      vk_group_id?: number;
      vk_viewer_group_role?: string;
      vk_is_app_user?: number;
      vk_are_notifications_enabled?: number;
      vk_language?: string;
      vk_platform?: string;
      vk_ref?: string;
      [key: string]: any;
    };
  }
}

export {};
