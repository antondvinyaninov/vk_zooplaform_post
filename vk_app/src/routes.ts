import {
  createHashRouter,
  createPanel,
  createRoot,
  createView,
  createModal,
  RoutesConfig,
} from '@vkontakte/vk-mini-apps-router';

export const DEFAULT_ROOT = 'default_root';

export const DEFAULT_VIEW = 'default_view';

export const DEFAULT_VIEW_PANELS = {
  HOME: 'home',
  PERSIK: 'persik',
  ONBOARDING: 'onboarding',
  PROFILE: 'profile',
  COMMUNITY_SETTINGS: 'community_settings',
  MY_POSTS: 'my_posts',
  CREATE_POST: 'create_post',
  POST_DETAIL: 'post_detail',
  MODERATION: 'moderation',
} as const;

export const routes = RoutesConfig.create([
  createRoot(DEFAULT_ROOT, [
    createView(DEFAULT_VIEW, [
      createPanel(DEFAULT_VIEW_PANELS.HOME, '/home', []),
      createPanel(DEFAULT_VIEW_PANELS.PERSIK, `/${DEFAULT_VIEW_PANELS.PERSIK}`, []),
      createPanel(DEFAULT_VIEW_PANELS.ONBOARDING, `/${DEFAULT_VIEW_PANELS.ONBOARDING}`, []),
      createPanel(DEFAULT_VIEW_PANELS.PROFILE, `/${DEFAULT_VIEW_PANELS.PROFILE}`, []),
      createPanel(DEFAULT_VIEW_PANELS.COMMUNITY_SETTINGS, `/${DEFAULT_VIEW_PANELS.COMMUNITY_SETTINGS}`, []),
      createPanel(DEFAULT_VIEW_PANELS.MY_POSTS, `/${DEFAULT_VIEW_PANELS.MY_POSTS}`, []),
      createPanel(DEFAULT_VIEW_PANELS.CREATE_POST, `/${DEFAULT_VIEW_PANELS.CREATE_POST}`, []),
      createPanel(DEFAULT_VIEW_PANELS.POST_DETAIL, `/${DEFAULT_VIEW_PANELS.POST_DETAIL}/:id`, []),
      createPanel(DEFAULT_VIEW_PANELS.MODERATION, `/${DEFAULT_VIEW_PANELS.MODERATION}`, [
        createModal('approve_settings', `/${DEFAULT_VIEW_PANELS.MODERATION}/approve_settings/:id`),
      ]),
    ]),
  ]),
]);

export const router = createHashRouter(routes.getRoutes());
