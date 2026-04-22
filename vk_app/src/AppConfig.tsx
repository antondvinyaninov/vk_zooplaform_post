import vkBridgeModule, { parseURLSearchParamsForGetLaunchParams } from '@vkontakte/vk-bridge';
import { useAdaptivity, useAppearance, useInsets } from '@vkontakte/vk-bridge-react';
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

const vkBridge = (vkBridgeModule && 'isWebView' in vkBridgeModule) 
  ? vkBridgeModule 
  : (vkBridgeModule as any).default;

import { transformVKBridgeAdaptivity } from './utils';
import { router } from './routes';
import { App } from './App';

export const AppConfig = () => {
  const vkBridgeAppearance = useAppearance() || undefined;
  const vkBridgeInsets = useInsets() || undefined;
  const bridgeAdaptivity = useAdaptivity();
  
  // Вычисляем адаптивность: приоритет у данных из Bridge, но на старте используем window
  const adaptivity = bridgeAdaptivity.type 
    ? transformVKBridgeAdaptivity(bridgeAdaptivity)
    : {
        viewWidth: getViewWidthByViewportWidth(window.innerWidth),
        viewHeight: getViewHeightByViewportHeight(window.innerHeight),
        sizeX: window.innerWidth >= 768 ? SizeType.REGULAR : SizeType.COMPACT,
        sizeY: SizeType.REGULAR,
      };
  const { vk_platform } = parseURLSearchParamsForGetLaunchParams(window.location.search);
  const platform = (vk_platform as string) === 'desktop_web' 
    ? 'vkcom' 
    : (vk_platform as string) === 'mobile_android' 
      ? 'android' 
      : (vk_platform as string) === 'mobile_ios' 
        ? 'ios' 
        : undefined;

  return (
    <ConfigProvider
      colorScheme={vkBridgeAppearance}
      platform={platform}
      isWebView={vkBridge.isWebView()}
      hasCustomPanelHeaderAfter={true}
    >
      <AdaptivityProvider {...adaptivity}>
        <AppRoot safeAreaInsets={vkBridgeInsets} disableSettingVKUIClassesInRuntime>
          <RouterProvider router={router}>
            <App />
          </RouterProvider>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
};
