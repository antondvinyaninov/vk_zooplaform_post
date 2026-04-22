import { createRoot } from 'react-dom/client';
import { AppConfig } from './AppConfig.tsx';

// VK Bridge уже инициализирован в index.html для ускорения загрузки
createRoot(document.getElementById('root')!).render(<AppConfig />);

if (import.meta.env.MODE === 'development') {
  import('./eruda.ts');
}
