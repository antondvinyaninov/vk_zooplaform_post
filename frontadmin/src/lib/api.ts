import axios from "axios";

// Используем переменную окружения, если она есть, иначе хардкод порта для локальной разработки
export const API_BASE_URL = import.meta.env.PUBLIC_API_URL || "http://localhost:80/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// SWR Fetcher
export const fetcher = (url: string) => api.get(url).then((res) => res.data);

// Types
export interface Group {
  id: number;
  vk_group_id: number;
  name: string;
  screen_name: string;
  photo_200: string;
  is_active: boolean;
  health_status: "ok" | "error" | "unknown";
  last_check_at?: string;
  health_error?: string;
  members_count: number;
}

export interface GroupsResponse {
  groups: Group[];
}
