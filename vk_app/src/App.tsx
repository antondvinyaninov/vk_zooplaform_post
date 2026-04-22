import { useState, useEffect, ReactNode, lazy, Suspense } from 'react';
import bridgeModule, { UserInfo } from '@vkontakte/vk-bridge';
import { View, SplitLayout, SplitCol, ScreenSpinner, ModalRoot } from '@vkontakte/vkui';

const bridge = (bridgeModule && 'send' in bridgeModule) 
  ? bridgeModule 
  : (bridgeModule as any).default;
import { DEFAULT_VIEW_PANELS } from './routes';
import { useActiveVkuiLocation, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { syncUserWithBackend } from './shared/api';

const Home = lazy(() => import('./panels/Home').then(m => ({ default: m.Home })));
const Persik = lazy(() => import('./panels/Persik').then(m => ({ default: m.Persik })));
const Onboarding = lazy(() => import('./panels/Onboarding').then(m => ({ default: m.Onboarding })));
const Profile = lazy(() => import('./panels/Profile').then(m => ({ default: m.Profile })));
const MyAds = lazy(() => import('./panels/MyAds').then(m => ({ default: m.MyAds })));
const CreateAd = lazy(() => import('./panels/CreateAd').then(m => ({ default: m.CreateAd })));
const AdDetail = lazy(() => import('./panels/AdDetail'));
const Moderation = lazy(() => import('./panels/Moderation'));
const ModerationModal = lazy(() => import('./panels/ModerationModal'));

export const App = () => {
  const { panel: activePanel = DEFAULT_VIEW_PANELS.HOME, modal: activeModal } = useActiveVkuiLocation();
  const routeNavigator = useRouteNavigator();
  const [fetchedUser, setUser] = useState<UserInfo | undefined>();
  const [role, setRole] = useState<string | null>(null);
  const [popout, setPopout] = useState<ReactNode | null>(null);

  useEffect(() => {
    // Проверка контекста запуска: вне сообщества редиректим на лендинг
    const params = new URLSearchParams(window.location.search);
    const hasGroupId = params.has('vk_group_id');
    const vkRole = params.get('vk_viewer_group_role');
    
    if (vkRole) {
      setRole(vkRole);
    }
    
    if (!hasGroupId && activePanel !== DEFAULT_VIEW_PANELS.ONBOARDING) {
      routeNavigator.replace('/onboarding');
    }

    async function fetchData() {
      try {
        const user = await bridge.send('VKWebAppGetUserInfo');
        setUser(user);
        
        // Синхронизация с бэкендом
        await syncUserWithBackend(user);
      } catch (e) {
        console.error('Failed to fetch user', e);
      } finally {
        setPopout(null);
      }
    }
    fetchData();
  }, [activePanel, routeNavigator]);

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => routeNavigator.hideModal()}>
      <Suspense fallback={<ScreenSpinner />}>
        <ModerationModal 
          id="approve_settings" 
          onConfirm={(adId, type, date) => {
            console.log(`Action confirmed for ad ${adId}: ${type} at ${date?.toLocaleString() || 'NOW'}`);
            // Отправляем глобальное событие для уведомления панелей об обновлении
            window.dispatchEvent(new CustomEvent('adModerated', { detail: { adId } }));
          }} 
        />
      </Suspense>
    </ModalRoot>
  );

  return (
    <>
      <SplitLayout modal={modal}>
        <SplitCol>
          <Suspense fallback={popout || <ScreenSpinner />}>
            <View activePanel={activePanel}>
              <Onboarding id="onboarding" />
              <Home id="home" />
              <Persik id="persik" />
              <Profile id="profile" fetchedUser={fetchedUser} role={role} />
              <MyAds id="my_ads" />
              <CreateAd id="create_ad" />
              <AdDetail id="ad_detail" />
              <Moderation id="moderation" />
            </View>
          </Suspense>
        </SplitCol>
      </SplitLayout>
      {popout}
    </>
  );
};
