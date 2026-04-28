import vkBridge from '@vkontakte/vk-bridge';
import { useState, useEffect, ReactNode, lazy, Suspense } from 'react';
import { UserInfo } from '@vkontakte/vk-bridge';
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
  Icon28AddOutline,
  Icon28UserOutline,
} from '@vkontakte/icons';

import { DEFAULT_VIEW_PANELS } from './routes';
import { useActiveVkuiLocation, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { syncUserWithBackend } from './shared/api';

const Home = lazy(() => import('./panels/Home').then(m => ({ default: m.Home })));
const Onboarding = lazy(() => import('./panels/Onboarding').then(m => ({ default: m.Onboarding })));
const Profile = lazy(() => import('./panels/Profile').then(m => ({ default: m.Profile })));
const CommunitySettings = lazy(() => import('./panels/CommunitySettings'));

const CreatePost = lazy(() => import('./panels/CreateAd').then(m => ({ default: m.CreatePost })));
const AdDetail = lazy(() => import('./panels/AdDetail'));
const Moderation = lazy(() => import('./panels/Moderation'));
const ModerationModal = lazy(() => import('./panels/ModerationModal'));

const STORY_IDS = {
  HOME: 'home_story',

  CREATE_POST: 'create_post_story',
  PROFILE: 'profile_story',
  COMMUNITY_SETTINGS: 'community_settings_story',
  MODERATION: 'moderation_story',
  ONBOARDING: 'onboarding_story',
  POST_DETAIL: 'post_detail_story',
} as const;

const MAIN_PANEL_TO_ROUTE: Record<string, string> = {
  [DEFAULT_VIEW_PANELS.HOME]: '/home',

  [DEFAULT_VIEW_PANELS.CREATE_POST]: `/${DEFAULT_VIEW_PANELS.CREATE_POST}`,
  [DEFAULT_VIEW_PANELS.PROFILE]: `/${DEFAULT_VIEW_PANELS.PROFILE}`,
  [DEFAULT_VIEW_PANELS.MODERATION]: `/${DEFAULT_VIEW_PANELS.MODERATION}`,
};

const getActiveStory = (panel: string): string => {
  switch (panel) {
    case DEFAULT_VIEW_PANELS.HOME:
      return STORY_IDS.HOME;

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
    // Получаем VK параметры из launch params
    const launchParams = window.vkLaunchParams || {};
    
    const hasGroupId = launchParams.vk_group_id;
    const vkRole = launchParams.vk_viewer_group_role;
    const vkUserId = launchParams.vk_user_id;
    
    console.log('VK Launch Params:', launchParams);
    console.log('VK Params check:', {
      hasGroupId,
      vkRole,
      vkUserId
    });
    
    if (vkRole) {
      setRole(vkRole);
    }
    
    // Если нет VK параметров группы, показываем onboarding
    if (!hasGroupId && activePanel !== DEFAULT_VIEW_PANELS.ONBOARDING) {
      console.log('No group ID found, redirecting to onboarding');
      routeNavigator.replace('/onboarding');
      return;
    }

    async function fetchData() {
      console.log('Starting fetchData...');
      
      try {
        // Проверяем что VK Bridge доступен
        if (typeof vkBridge === 'undefined' || !vkBridge.send) {
          throw new Error('VK Bridge not available');
        }
        
        console.log('Attempting to get user info...');
        const user = await vkBridge.send('VKWebAppGetUserInfo');
        console.log('User info received:', user);
        
        // СНАЧАЛА устанавливаем данные пользователя
        setUser(user);
        
        // ПОТОМ пытаемся синхронизироваться с backend (не критично если упадет)
        try {
          const vkSignParams = new URLSearchParams();
          Object.entries(launchParams).forEach(([key, value]) => {
            if (key.startsWith('vk_') && value !== undefined) {
              vkSignParams.set(key, String(value));
            }
          });
          
          console.log('Syncing with backend, VK params:', vkSignParams.toString());
          await syncUserWithBackend(user, vkSignParams.toString());
          console.log('Backend sync successful');
        } catch (backendError) {
          console.warn('Backend sync failed, but user data is available:', backendError);
          // Не падаем, если backend недоступен, но пользователь есть
        }
        
      } catch (e) {
        console.warn('VK Bridge failed to get user data:', e);
        
        // Проверяем, есть ли хотя бы launch параметры с пользователем
        if (launchParams.vk_user_id) {
          console.log('Using launch params for user data');
          setUser({
            id: launchParams.vk_user_id,
            first_name: 'VK User',
            last_name: `#${launchParams.vk_user_id}`,
            photo_200: '',
            photo_100: '',
            is_closed: false,
            can_access_closed: true,
            sex: 0,
            city: { id: 0, title: '' },
            country: { id: 0, title: '' },
            bdate_visibility: 0
          });
        } else {
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
        }
      } finally {
        console.log('Removing popout...');
        setPopout(null);
      }
    }
    
    // Ждем готовности VK Bridge
    if (window.vkLaunchParams) {
      fetchData();
    } else {
      // Если параметры еще не готовы, ждем
      const checkParams = () => {
        if (window.vkLaunchParams) {
          fetchData();
        } else {
          setTimeout(checkParams, 100);
        }
      };
      checkParams();
    }
  }, [activePanel, routeNavigator]);

  const activeStory = getActiveStory(activePanel);
  const shouldShowTabbar =
    activePanel !== DEFAULT_VIEW_PANELS.ONBOARDING &&
    activePanel !== DEFAULT_VIEW_PANELS.POST_DETAIL &&
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
                  </Tabbar>
                ) : undefined
              }
            >
              <View id={STORY_IDS.HOME} activePanel={activePanel}>
                <Home id="home" />
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
            </Epic>
          </Suspense>
        </SplitCol>
      </SplitLayout>
      {popout}
    </>
  );
};
