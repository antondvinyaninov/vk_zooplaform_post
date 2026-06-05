import vkBridgeModule, { parseURLSearchParamsForGetLaunchParams } from '@vkontakte/vk-bridge';
const vkBridge = (vkBridgeModule as any).send ? vkBridgeModule : (vkBridgeModule as any).default;
import { createRoot } from 'react-dom/client';
import { AppConfig } from './AppConfig.tsx';

console.log('main.tsx loaded');
console.log('React createRoot available:', typeof createRoot);

// Добавляем Eruda консоль для отладки только в dev режиме или если передан параметр eruda=1
if (import.meta.env.MODE === 'development' || window.location.search.includes('eruda=1')) {
  import('./eruda.ts');
}

const BRIDGE_TIMEOUT_MS = 3500;

type AppLaunchParams = Window['vkLaunchParams'];

const fallbackLaunchParams: AppLaunchParams = {
  vk_user_id: 1,
  vk_app_id: 54560047,
  vk_is_app_user: 1,
  vk_are_notifications_enabled: 1,
  vk_language: 'ru',
  vk_platform: 'desktop_web',
  vk_ref: 'group_menu',
};

const hasLaunchParams = (params: unknown): params is AppLaunchParams =>
  !!params &&
  typeof params === 'object' &&
  Object.keys(params as Record<string, unknown>).some((key) => key.startsWith('vk_'));

const getURLLaunchParams = (): AppLaunchParams => {
  try {
    const params = parseURLSearchParamsForGetLaunchParams(window.location.search);
    if (hasLaunchParams(params)) {
      return params;
    }
  } catch (error) {
    console.warn('Failed to parse VK launch params via vk-bridge:', error);
  }

  const params: AppLaunchParams = {};
  new URLSearchParams(window.location.search).forEach((value, key) => {
    if (!key.startsWith('vk_')) {
      return;
    }
    params[key] = /^\d+$/.test(value) ? Number(value) : value;
  });

  return params;
};

const withTimeout = async <T,>(promise: Promise<T>, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), BRIDGE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

// Инициализация VK Bridge
const initVKBridge = async () => {
  const urlLaunchParams = getURLLaunchParams();
  if (hasLaunchParams(urlLaunchParams)) {
    window.vkLaunchParams = urlLaunchParams;
  }

  try {
    console.log('Initializing VK Bridge from npm package...');
    
    // Инициализируем VK Bridge
    await withTimeout(vkBridge.send('VKWebAppInit'), 'VKWebAppInit');
    console.log('VK Bridge initialized successfully');
    
    // Получаем launch параметры
    const launchParams = await withTimeout(vkBridge.send('VKWebAppGetLaunchParams'), 'VKWebAppGetLaunchParams');
    console.log('Launch params:', launchParams);
    
    // Сохраняем параметры в глобальном объекте для доступа из приложения
    window.vkLaunchParams = hasLaunchParams(launchParams) ? launchParams : urlLaunchParams;
  } catch (error) {
    console.error('VK Bridge initialization failed:', error);
    console.warn('VK Bridge not available or timed out - using URL launch params');
    window.vkLaunchParams = hasLaunchParams(urlLaunchParams) ? urlLaunchParams : fallbackLaunchParams;
  }
};

// Рендерим приложение после инициализации VK Bridge
const renderApp = async () => {
  await initVKBridge();
  
  try {
    const rootElement = document.getElementById('root');
    console.log('Root element found:', !!rootElement);
    
    if (rootElement) {
      console.log('Creating React root...');
      const root = createRoot(rootElement);
      console.log('Rendering AppConfig...');
      root.render(<AppConfig />);
      console.log('AppConfig rendered successfully');
    } else {
      console.error('Root element not found!');
    }
  } catch (error) {
    console.error('Error rendering React app:', error);
  }
};

renderApp();
