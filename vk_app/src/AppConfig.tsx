import { parseURLSearchParamsForGetLaunchParams } from '@vkontakte/vk-bridge';
import { useAdaptivity, useAppearance, useInsets } from '@vkontakte/vk-bridge-react';
import { Component, ReactNode } from 'react';
import { 
  AdaptivityProvider, 
  ConfigProvider, 
  AppRoot,
  getViewWidthByViewportWidth,
  getViewHeightByViewportHeight,
  SizeType
} from '@vkontakte/vkui';
import { RouterProvider } from '@vkontakte/vk-mini-apps-router';
import '@vkontakte/vkui/dist/cssm/styles/themes.css';

import { transformVKBridgeAdaptivity } from './utils';
import { router } from './routes';
import { App } from './App';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error: error?.message || 'Unknown render error' };
  }

  componentDidCatch(error: Error) {
    console.error('App render error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
          <h3>Runtime error</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export const AppConfig = () => {
  console.log('AppConfig component started');
  
  const vkBridgeAppearance = useAppearance() || undefined;
  const vkBridgeInsets = useInsets() || undefined;
  const bridgeAdaptivity = useAdaptivity();
  
  console.log('VK Bridge hooks loaded:', {
    appearance: vkBridgeAppearance,
    insets: vkBridgeInsets,
    adaptivity: bridgeAdaptivity
  });
  
  // Вычисляем адаптивность: приоритет у данных из Bridge, но на старте используем window
  const adaptivity = bridgeAdaptivity.type 
    ? transformVKBridgeAdaptivity(bridgeAdaptivity)
    : {
        viewWidth: getViewWidthByViewportWidth(window.innerWidth),
        viewHeight: getViewHeightByViewportHeight(window.innerHeight),
        sizeX: window.innerWidth >= 768 ? SizeType.REGULAR : SizeType.COMPACT,
        sizeY: SizeType.REGULAR,
      };
  let vkPlatform: string | undefined;
  try {
    const { vk_platform } = parseURLSearchParamsForGetLaunchParams(window.location.search);
    vkPlatform = vk_platform as string | undefined;
  } catch {
    // В локальной отладке мы часто запускаем приложение с урезанными launch params.
    vkPlatform = new URLSearchParams(window.location.search).get('vk_platform') || undefined;
  }

  const platform = vkPlatform === 'desktop_web'
    ? 'vkcom'
    : vkPlatform === 'mobile_android'
      ? 'android'
      : vkPlatform === 'mobile_ios'
        ? 'ios'
        : 'ios';

  // Определяем isWebView из launch параметров или платформы
  const isWebView = vkPlatform === 'mobile_web' || vkPlatform === 'desktop_web';

  console.log('AppConfig rendering with:', {
    platform,
    colorScheme: vkBridgeAppearance,
    isWebView,
    adaptivity
  });

  console.log('Router:', router);
  console.log('Current URL hash:', window.location.hash);
  console.log('Current URL pathname:', window.location.pathname);

  return (
    <ConfigProvider
      colorScheme={vkBridgeAppearance}
      platform={platform}
      isWebView={isWebView}
      hasCustomPanelHeaderAfter={true}
    >
      <AdaptivityProvider {...adaptivity}>
        <AppRoot safeAreaInsets={vkBridgeInsets} disableSettingVKUIClassesInRuntime>
          <AppErrorBoundary>
            <RouterProvider router={router}>
              <App />
            </RouterProvider>
          </AppErrorBoundary>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
};
