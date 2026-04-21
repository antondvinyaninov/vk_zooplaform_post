import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  ConfigProvider,
  AdaptivityProvider,
  AppRoot,
  SplitLayout,
  SplitCol,
  View,
  Panel,
  Group,
  Tabbar,
  TabbarItem,
  Box,
  Title,
  Alert,
} from '@vkontakte/vkui';
import { Icon28NewsfeedOutline, Icon28UsersOutline, Icon28WriteOutline } from '@vkontakte/icons';
import '@vkontakte/vkui/dist/vkui.css';

import HomePage from './pages/HomePage';
import GroupsPage from './pages/GroupsPage';
import PostsPage from './pages/PostsPage';
import AuthPage from './pages/AuthPage';
import { isAuthorized } from './api/api';

function App() {
  const [activeStory, setActiveStory] = useState('home');
  const [isAuth, setIsAuth] = useState(false);
  const [popout, setPopout] = useState(null);

  useEffect(() => {
    setIsAuth(isAuthorized());
  }, []);

  const showAlert = useCallback((text, type) => {
    setPopout(
      <Alert
        onClosed={() => setPopout(null)}
        title={type === 'success' ? 'Успешно' : 'Ошибка'}
        description={text}
        actions={[
          {
            title: 'OK',
            mode: 'default',
          },
        ]}
      />
    );
  }, []);

  if (!isAuth) {
    return (
      <ConfigProvider>
        <AdaptivityProvider>
          <AppRoot>
            <AuthPage onAuth={() => setIsAuth(true)} />
          </AppRoot>
        </AdaptivityProvider>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider>
      <AdaptivityProvider>
        <AppRoot>
          <View activePanel="main">
            <Panel id="main">
              <Box
                style={{
                  background: 'var(--vkui--color_background)',
                  borderBottom: '1px solid var(--vkui--color_separator_primary)',
                  padding: '12px 16px',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}
              >
                <Title level="2" weight="semibold">VK SMM Панель</Title>
              </Box>
              <Box style={{ 
                height: 'calc(100vh - 110px)', 
                overflowY: 'auto',
                paddingBottom: 20,
              }}>
                {activeStory === 'home' && <HomePage />}
                {activeStory === 'groups' && <GroupsPage />}
                {activeStory === 'posts' && <PostsPage />}
              </Box>
            </Panel>
          </View>
          <Tabbar style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}>
            <TabbarItem
              selected={activeStory === 'home'}
              onClick={() => setActiveStory('home')}
              text="Главная"
              aria-label="Главная страница"
            >
              <Icon28WriteOutline />
            </TabbarItem>
            <TabbarItem
              selected={activeStory === 'groups'}
              onClick={() => setActiveStory('groups')}
              text="Группы"
              aria-label="Управление группами"
            >
              <Icon28UsersOutline />
            </TabbarItem>
            <TabbarItem
              selected={activeStory === 'posts'}
              onClick={() => setActiveStory('posts')}
              text="Посты"
              aria-label="Просмотр постов"
            >
              <Icon28NewsfeedOutline />
            </TabbarItem>
          </Tabbar>
          {popout}
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}

export default App;
