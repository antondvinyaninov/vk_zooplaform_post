import { useState, useEffect } from 'react';
import {
  View,
  Panel,
  Group,
  Button,
  Textarea,
  FormItem,
  Title,
  Text,
  Box,
} from '@vkontakte/vkui';
import bridge from '@vkontakte/vk-bridge';
import { saveToken } from '../api/api';

const getUserInfo = async (userId, accessToken) => {
  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost/api' 
    : `${window.location.origin}/api`;
    
  const response = await fetch(`${API_URL}/vk/user-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      user_id: userId
    })
  });
  return response.json();
};

function AuthPage({ onAuth }) {
  const [showInput, setShowInput] = useState(false);
  const [tokenUrl, setTokenUrl] = useState('');

  useEffect(() => {
    // Инициализируем VK Bridge только если он доступен
    try {
      if (bridge && typeof bridge.send === 'function') {
        bridge.send('VKWebAppInit');
      }
    } catch (error) {
      console.log('VK Bridge not available:', error);
    }
    
    // Проверяем есть ли код в URL (новый OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      handleOAuthCode(code);
    }
  }, []);

  const handleAuth = () => {
    const authUrl = `https://oauth.vk.com/authorize?` +
      `client_id=2685278&` +
      `scope=1073737727&` +
      `redirect_uri=https://oauth.vk.com/blank.html&` +
      `display=page&` +
      `response_type=token&` +
      `revoke=1`;
    
    window.open(authUrl, 'vk_auth', 'width=800,height=600');
    setShowInput(true);
  };

  const handleOAuthDirect = () => {
    const clientId = '54555042'; // Твой App ID
    // Используем blank.html для всех окружений пока не настроим redirect_uri в VK
    const redirectUri = 'https://oauth.vk.com/blank.html';
    const scope = 'wall,photos,video,groups,offline';
    
    const authUrl = `https://oauth.vk.com/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `display=page&` +
      `scope=${scope}&` +
      `response_type=token&` +
      `v=5.199`;
    
    // Открываем в новом окне
    const authWindow = window.open(authUrl, 'vk_oauth', 'width=800,height=600');
    
    // Показываем поле для ввода URL
    setShowInput(true);
  };

  const handleOAuthCode = async (code) => {
    try {
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost/api' 
        : `${window.location.origin}/api`;
      
      const response = await fetch(`${API_URL}/vk/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      const data = await response.json();
      
      if (data.error) {
        alert(`Ошибка: ${data.error}`);
        return;
      }
      
      if (data.access_token) {
        saveToken(data.access_token, data.user_id.toString());
        
        // Получаем информацию о пользователе
        const userInfo = await getUserInfo(data.user_id.toString(), data.access_token);
        
        if (userInfo.response && userInfo.response[0]) {
          const user = userInfo.response[0];
          localStorage.setItem('vk_user_name', `${user.first_name} ${user.last_name}`);
          localStorage.setItem('vk_user_photo', user.photo_200);
        }
        
        onAuth();
      }
    } catch (error) {
      console.error('OAuth error:', error);
      alert('Ошибка авторизации');
    }
  };

  const handleVKBridgeAuth = async () => {
    try {
      if (!bridge || typeof bridge.send !== 'function') {
        alert('VK Bridge недоступен. Этот метод работает только внутри VK приложений.');
        return;
      }
      
      // Запрашиваем токен через VK Bridge
      const data = await bridge.send('VKWebAppGetAuthToken', {
        app_id: 54555042,
        scope: 'wall,photos,video,groups,offline'
      });
      
      if (data.access_token) {
        // Получаем информацию о пользователе через VK Bridge
        const userInfo = await bridge.send('VKWebAppGetUserInfo');
        
        saveToken(data.access_token, userInfo.id.toString());
        localStorage.setItem('vk_user_name', `${userInfo.first_name} ${userInfo.last_name}`);
        localStorage.setItem('vk_user_photo', userInfo.photo_200);
        
        onAuth();
      }
    } catch (error) {
      console.error('VK Bridge auth error:', error);
      alert('Ошибка авторизации через VK Bridge. Возможно, приложение не запущено в VK.');
    }
  };

  const handleSaveToken = async () => {
    const match = tokenUrl.match(/access_token=([^&]+)/);
    if (!match) {
      alert('Неверный формат URL');
      return;
    }

    const accessToken = match[1];
    const userIdMatch = tokenUrl.match(/user_id=([^&]+)/);
    const userId = userIdMatch ? userIdMatch[1] : '';

    saveToken(accessToken, userId);
    
    // Получаем информацию о пользователе через наш API
    try {
      const data = await getUserInfo(userId, accessToken);
      
      if (data.response && data.response[0]) {
        const user = data.response[0];
        localStorage.setItem('vk_user_name', `${user.first_name} ${user.last_name}`);
        localStorage.setItem('vk_user_photo', user.photo_200);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }

    onAuth();
  };

  return (
    <View activePanel="auth">
      <Panel id="auth">
        <Box
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            background: 'var(--vkui--color_background)',
            borderBottom: '1px solid var(--vkui--color_separator_primary)',
            padding: '12px 16px',
          }}
        >
          <Title level="2" weight="semibold">Авторизация</Title>
        </Box>
        <Group>
          <Box padding="m">
            <Title level="1" weight="bold" style={{ marginBottom: 16 }}>
              🔐 Авторизация VK
            </Title>
            <Text style={{ marginBottom: 24 }}>
              Получите доступ к вашим группам ВКонтакте
            </Text>
            
            <Box style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Button size="l" stretched onClick={handleAuth}>
                Авторизоваться (старый метод)
              </Button>
              
              <Button size="l" stretched mode="secondary" onClick={handleOAuthDirect}>
                Авторизоваться через OAuth (новый)
              </Button>
              
              <Button size="l" stretched mode="tertiary" onClick={handleVKBridgeAuth}>
                Авторизоваться через VK Bridge
              </Button>
            </Box>
          </Box>

          {showInput && (
            <Box padding="m">
              <FormItem top="Вставьте URL из адресной строки после авторизации">
                <Textarea
                  placeholder="https://oauth.vk.com/blank.html#access_token=..."
                  value={tokenUrl}
                  onChange={(e) => setTokenUrl(e.target.value)}
                  rows={3}
                />
              </FormItem>
              <Button size="l" stretched onClick={handleSaveToken}>
                Сохранить токен
              </Button>
            </Box>
          )}
        </Group>
      </Panel>
    </View>
  );
}

export default AuthPage;
