import { createRoot } from 'react-dom/client';
import { AppConfig } from './AppConfig.tsx';

console.log('main.tsx loaded');
console.log('React createRoot available:', typeof createRoot);

// VK Bridge уже инициализирован в index.html для ускорения загрузки
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

if (import.meta.env.MODE === 'development') {
  import('./eruda.ts');
}
