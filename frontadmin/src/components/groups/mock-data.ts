export type HealthStatus = "ok" | "error" | "unknown";

export interface Group {
  id: number;
  vk_group_id: number;
  name: string;
  screen_name: string;
  photo_200: string;
  has_token: boolean;
  health_status: HealthStatus;
  last_check_at: string;
  health_error: string | null;
  members_count: number;
}

export const mockGroups: Group[] = [
  {
    id: 1,
    vk_group_id: 12345678,
    name: "IT-Специалисты ВКонтакте",
    screen_name: "vk_it_pro",
    photo_200: "https://api.dicebear.com/7.x/identicon/svg?seed=vk_it_pro&backgroundColor=0a58ca",
    has_token: true,
    health_status: "ok",
    last_check_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    health_error: null,
    members_count: 145000,
  },
  {
    id: 2,
    vk_group_id: 87654321,
    name: "Городские новости",
    screen_name: "city_news",
    photo_200: "https://api.dicebear.com/7.x/identicon/svg?seed=city_news&backgroundColor=198754",
    has_token: true,
    health_status: "error",
    last_check_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    health_error: "Неверный токен доступа сообщества. Требуется переавторизация.",
    members_count: 52400,
  },
  {
    id: 3,
    vk_group_id: 55544433,
    name: "Барахолка Москва",
    screen_name: "msk_sale",
    photo_200: "https://api.dicebear.com/7.x/identicon/svg?seed=msk_sale&backgroundColor=dc3545",
    has_token: false,
    health_status: "unknown",
    last_check_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    health_error: null,
    members_count: 320100,
  },
  {
    id: 4,
    vk_group_id: 99988877,
    name: "Приют домашних животных",
    screen_name: "animal_help",
    photo_200: "https://api.dicebear.com/7.x/identicon/svg?seed=animal_help&backgroundColor=ffc107",
    has_token: true,
    health_status: "ok",
    last_check_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    health_error: null,
    members_count: 12400,
  },
  {
    id: 5,
    vk_group_id: 11122233,
    name: "Студенческий совет МГУ",
    screen_name: "msu_council",
    photo_200: "https://api.dicebear.com/7.x/identicon/svg?seed=msu_council&backgroundColor=6f42c1",
    has_token: true,
    health_status: "ok",
    last_check_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    health_error: null,
    members_count: 8500,
  }
];

// Mock data for the interactive chart
export const mockChartData = [
  { date: "2024-04-01", subscribers: 222, reach: 150 },
  { date: "2024-04-02", subscribers: 97, reach: 180 },
  { date: "2024-04-03", subscribers: 167, reach: 120 },
  { date: "2024-04-04", subscribers: 242, reach: 260 },
  { date: "2024-04-05", subscribers: 373, reach: 290 },
  { date: "2024-04-06", subscribers: 301, reach: 340 },
  { date: "2024-04-07", subscribers: 245, reach: 180 },
  { date: "2024-04-08", subscribers: 409, reach: 320 },
  { date: "2024-04-09", subscribers: 59, reach: 110 },
  { date: "2024-04-10", subscribers: 261, reach: 190 },
  { date: "2024-04-11", subscribers: 327, reach: 350 },
  { date: "2024-04-12", subscribers: 292, reach: 210 },
  { date: "2024-04-13", subscribers: 342, reach: 380 },
  { date: "2024-04-14", subscribers: 137, reach: 220 },
  { date: "2024-04-15", subscribers: 120, reach: 170 },
  { date: "2024-04-16", subscribers: 138, reach: 160 },
  { date: "2024-04-17", subscribers: 446, reach: 360 },
  { date: "2024-04-18", subscribers: 364, reach: 410 },
  { date: "2024-04-19", subscribers: 243, reach: 180 },
  { date: "2024-04-20", subscribers: 89, reach: 150 },
  { date: "2024-04-21", subscribers: 137, reach: 200 },
  { date: "2024-04-22", subscribers: 224, reach: 170 },
  { date: "2024-04-23", subscribers: 138, reach: 230 },
  { date: "2024-04-24", subscribers: 387, reach: 290 },
  { date: "2024-04-25", subscribers: 215, reach: 250 },
  { date: "2024-04-26", subscribers: 252, reach: 280 },
  { date: "2024-04-27", subscribers: 294, reach: 340 },
  { date: "2024-04-28", subscribers: 202, reach: 260 },
  { date: "2024-04-29", subscribers: 137, reach: 180 },
  { date: "2024-04-30", subscribers: 141, reach: 190 },
];
