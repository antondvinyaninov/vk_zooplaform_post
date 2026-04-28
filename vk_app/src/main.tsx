import vkBridge from '@vkontakte/vk-bridge';
import { createRoot } from 'react-dom/client';
import { AppConfig } from './AppConfig.tsx';

console.log('main.tsx loaded');
console.log('React createRoot available:', typeof createRoot);

// Добавляем Eruda консоль для отладки в мобильных приложениях VK
if (import.meta.env.MODE === 'development' || window.location.search.includes('vk_platform')) {
  import('./eruda.ts');
}

// Инициализация VK Bridge
const initVKBridge = async () => {
  try {
    console.log('Initializing VK Bridge from npm package...');
    
    // Инициализируем VK Bridge
    await vkBridge.send('VKWebAppInit');
    console.log('VK Bridge initialized successfully');
    
    // Получаем launch параметры
    const launchParams = await vkBridge.send('VKWebAppGetLaunchParams');
    console.log('Launch params:', launchParams);
    
    // Сохраняем параметры в глобальном объекте для доступа из приложения
    window.vkLaunchParams = launchParams;
  } catch (error) {
    console.error('VK Bridge initialization failed:', error);
    // Мок для разработки вне ВКонтакте
    console.warn('VK Bridge not available - running outside VK environment');
    window.vkLaunchParams = {
      vk_user_id: 1,
      vk_app_id: 54560047,
      vk_is_app_user: 1,
      vk_are_notifications_enabled: 1,
      vk_language: 'ru',
      vk_platform: 'desktop_web',
      vk_ref: 'group_menu'
    };
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
