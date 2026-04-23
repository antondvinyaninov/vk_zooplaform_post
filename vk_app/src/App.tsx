import { useState, useEffect, ReactNode, lazy, Suspense } from 'react';
import bridgeModule, { UserInfo } from '@vkontakte/vk-bridge';
import {
  View,
  SplitLayout,
  SplitCol,
  ScreenSpinner,
  ModalRoot,
  Epic,
  Tabbar,
  TabbarItem,
} from '@vkontakte/vkui';
import {
  Icon28HomeOutline,
  Icon28ListOutline,
  Icon28AddOutline,
  Icon28UserOutline,
  Icon28CheckShieldOutline,
} from '@vkontakte/icons';

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
const CommunitySettings = lazy(() => import('./panels/CommunitySettings'));
const MyPosts = lazy(() => import('./panels/MyAds').then(m => ({ default: m.MyPosts })));
const CreatePost = lazy(() => import('./panels/CreateAd').then(m => ({ default: m.CreatePost })));
const AdDetail = lazy(() => import('./panels/AdDetail'));
const Moderation = lazy(() => import('./panels/Moderation'));
const ModerationModal = lazy(() => import('./panels/ModerationModal'));

const STORY_IDS = {
  HOME: 'home_story',
  MY_POSTS: 'my_posts_story',
  CREATE_POST: 'create_post_story',
  PROFILE: 'profile_story',
  COMMUNITY_SETTINGS: 'community_settings_story',
  MODERATION: 'moderation_story',
  ONBOARDING: 'onboarding_story',
  POST_DETAIL: 'post_detail_story',
  PERSIK: 'persik_story',
} as const;

const MAIN_PANEL_TO_ROUTE: Record<string, string> = {
  [DEFAULT_VIEW_PANELS.HOME]: '/home',
  [DEFAULT_VIEW_PANELS.MY_POSTS]: `/${DEFAULT_VIEW_PANELS.MY_POSTS}`,
  [DEFAULT_VIEW_PANELS.CREATE_POST]: `/${DEFAULT_VIEW_PANELS.CREATE_POST}`,
  [DEFAULT_VIEW_PANELS.PROFILE]: `/${DEFAULT_VIEW_PANELS.PROFILE}`,
  [DEFAULT_VIEW_PANELS.MODERATION]: `/${DEFAULT_VIEW_PANELS.MODERATION}`,
};

const getActiveStory = (panel: string): string => {
  switch (panel) {
    case DEFAULT_VIEW_PANELS.HOME:
      return STORY_IDS.HOME;
    case DEFAULT_VIEW_PANELS.MY_POSTS:
      return STORY_IDS.MY_POSTS;
    case DEFAULT_VIEW_PANELS.CREATE_POST:
      return STORY_IDS.CREATE_POST;
    case DEFAULT_VIEW_PANELS.PROFILE:
      return STORY_IDS.PROFILE;
    case DEFAULT_VIEW_PANELS.COMMUNITY_SETTINGS:
      return STORY_IDS.COMMUNITY_SETTINGS;
    case DEFAULT_VIEW_PANELS.MODERATION:
      return STORY_IDS.MODERATION;
    case DEFAULT_VIEW_PANELS.ONBOARDING:
      return STORY_IDS.ONBOARDING;
    case DEFAULT_VIEW_PANELS.POST_DETAIL:
      return STORY_IDS.POST_DETAIL;
    case DEFAULT_VIEW_PANELS.PERSIK:
      return STORY_IDS.PERSIK;
    default:
      return STORY_IDS.HOME;
  }
};

export const App = () => {
  const { panel: activePanel = DEFAULT_VIEW_PANELS.HOME, modal: activeModal } = useActiveVkuiLocation();
  const routeNavigator = useRouteNavigator();
  const [fetchedUser, setUser] = useState<UserInfo | undefined>();
  const [role, setRole] = useState<string | null>(null);
  const [popout, setPopout] = useState<ReactNode | null>(<ScreenSpinner />);

  useEffect(() => {
    // Проверка контекста запуска: вне сообщества редиректим на лендинг
    // Читаем параметры из query string и из hash части URL
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    
    const hasGroupId = searchParams.has('vk_group_id') || hashParams.has('vk_group_id');
    const vkRole = searchParams.get('vk_viewer_group_role') || hashParams.get('vk_viewer_group_role');
    
    console.log('VK Params check:', {
      search: window.location.search,
      hash: window.location.hash,
      hasGroupId,
      vkRole
    });
    
    if (vkRole) {
      setRole(vkRole);
    }
    
    // Если нет VK параметров, показываем onboarding
    if (!hasGroupId && activePanel !== DEFAULT_VIEW_PANELS.ONBOARDING) {
      console.log('No group ID found, redirecting to onboarding');
      routeNavigator.replace('/onboarding');
      return;
    }

    async function fetchData() {
      console.log('Starting fetchData...');
      console.log('Bridge available:', typeof bridge !== 'undefined');
      console.log('Bridge.send available:', bridge && typeof bridge.send === 'function');
      
      try {
        // Проверяем что VK Bridge доступен
        if (typeof bridge === 'undefined' || !bridge.send) {
          throw new Error('VK Bridge not available');
        }
        
        console.log('Attempting to get user info...');
        const user = await bridge.send('VKWebAppGetUserInfo');
        console.log('User info received:', user);
        setUser(user);
        
        // Синхронизация с бэкендом
        await syncUserWithBackend(user);
      } catch (e) {
        console.warn('VK Bridge not available or failed to fetch user data:', e);
        console.log('Setting fallback user data...');
        // Если не удалось получить данные пользователя (не в VK среде),
        // устанавливаем тестовые данные
        setUser({
          id: 1,
          first_name: 'Test',
          last_name: 'User',
          photo_200: '',
          photo_100: '',
          is_closed: false,
          can_access_closed: true,
          sex: 0,
          city: { id: 0, title: '' },
          country: { id: 0, title: '' },
          bdate_visibility: 0
        });
      } finally {
        console.log('Removing popout...');
        setPopout(null);
      }
    }
    
    // Небольшая задержка для инициализации VK Bridge
    setTimeout(fetchData, 100);
  }, [activePanel, routeNavigator]);

  const activeStory = getActiveStory(activePanel);
  const isAdmin = ['admin', 'editor', 'moder'].includes(role || '');
  const shouldShowTabbar =
    activePanel !== DEFAULT_VIEW_PANELS.ONBOARDING &&
    activePanel !== DEFAULT_VIEW_PANELS.POST_DETAIL &&
    activePanel !== DEFAULT_VIEW_PANELS.PERSIK &&
    activePanel !== DEFAULT_VIEW_PANELS.COMMUNITY_SETTINGS;

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => routeNavigator.hideModal()}>
      <Suspense fallback={<ScreenSpinner />}>
        <ModerationModal 
          id="approve_settings" 
          onConfirm={(postId, type, date) => {
            console.log(`Action confirmed for post ${postId}: ${type} at ${date?.toLocaleString() || 'NOW'}`);
            window.dispatchEvent(new CustomEvent('postModerated', { detail: { postId } }));
          }} 
        />
      </Suspense>
    </ModalRoot>
  );

  const openMainPanel = (panel: keyof typeof MAIN_PANEL_TO_ROUTE) => {
    const route = MAIN_PANEL_TO_ROUTE[panel];
    if (route) {
      routeNavigator.push(route);
    }
  };

  return (
    <>
      <SplitLayout modal={modal}>
        <SplitCol>
          <Suspense fallback={popout || <ScreenSpinner />}>
            <Epic
              activeStory={activeStory}
              tabbar={
                shouldShowTabbar ? (
                  <Tabbar>
                    <TabbarItem
                      selected={activePanel === DEFAULT_VIEW_PANELS.HOME}
                      onClick={() => openMainPanel(DEFAULT_VIEW_PANELS.HOME)}
                      aria-label="Главная"
                    >
                      <Icon28HomeOutline />
                    </TabbarItem>
                    <TabbarItem
                      selected={activePanel === DEFAULT_VIEW_PANELS.MY_POSTS}
                      onClick={() => openMainPanel(DEFAULT_VIEW_PANELS.MY_POSTS)}
                      aria-label="Мои посты"
                    >
                      <Icon28ListOutline />
                    </TabbarItem>
                    <TabbarItem
                      selected={activePanel === DEFAULT_VIEW_PANELS.CREATE_POST}
                      onClick={() => openMainPanel(DEFAULT_VIEW_PANELS.CREATE_POST)}
                      aria-label="Создать"
                    >
                      <Icon28AddOutline />
                    </TabbarItem>
                    <TabbarItem
                      selected={activePanel === DEFAULT_VIEW_PANELS.PROFILE}
                      onClick={() => openMainPanel(DEFAULT_VIEW_PANELS.PROFILE)}
                      aria-label="Профиль"
                    >
                      <Icon28UserOutline />
                    </TabbarItem>
                    {isAdmin && (
                      <TabbarItem
                        selected={activePanel === DEFAULT_VIEW_PANELS.MODERATION}
                        onClick={() => openMainPanel(DEFAULT_VIEW_PANELS.MODERATION)}
                        aria-label="Модерация"
                      >
                        <Icon28CheckShieldOutline />
                      </TabbarItem>
                    )}
                  </Tabbar>
                ) : undefined
              }
            >
              <View id={STORY_IDS.HOME} activePanel={activePanel}>
                <Home id="home" />
              </View>
              <View id={STORY_IDS.MY_POSTS} activePanel={activePanel}>
                <MyPosts id="my_posts" />
              </View>
              <View id={STORY_IDS.CREATE_POST} activePanel={activePanel}>
                <CreatePost id="create_post" />
              </View>
              <View id={STORY_IDS.PROFILE} activePanel={activePanel}>
                <Profile id="profile" fetchedUser={fetchedUser} role={role} />
              </View>
              <View id={STORY_IDS.COMMUNITY_SETTINGS} activePanel={activePanel}>
                <CommunitySettings id="community_settings" />
              </View>
              <View id={STORY_IDS.MODERATION} activePanel={activePanel}>
                <Moderation id="moderation" />
              </View>
              <View id={STORY_IDS.ONBOARDING} activePanel={activePanel}>
                <Onboarding id="onboarding" />
              </View>
              <View id={STORY_IDS.POST_DETAIL} activePanel={activePanel}>
                <AdDetail id="post_detail" />
              </View>
              <View id={STORY_IDS.PERSIK} activePanel={activePanel}>
                <Persik id="persik" />
              </View>
            </Epic>
          </Suspense>
        </SplitCol>
      </SplitLayout>
      {popout}
    </>
  );
};
