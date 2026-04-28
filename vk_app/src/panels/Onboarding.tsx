import vkBridge from '@vkontakte/vk-bridge';
import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  Placeholder,
  Button,
  Group,
  Box,
  NavIdProps,
  Link,
} from '@vkontakte/vkui';
import { Icon56ServicesOutline, Icon56ErrorOutline } from '@vkontakte/icons';

export const Onboarding: FC<NavIdProps> = ({ id }) => {
  const [isOutsideVK, setIsOutsideVK] = useState(false);

  useEffect(() => {
    // Проверяем, запущено ли приложение вне VK
    const checkVKEnvironment = () => {
      const hasVKParams = window.vkLaunchParams && Object.keys(window.vkLaunchParams).length > 0;
      const hasVKBridge = vkBridge && typeof vkBridge.send === 'function';
      
      // Если нет VK параметров и VK Bridge недоступен, значит запущено вне VK
      if (!hasVKParams && !hasVKBridge) {
        setIsOutsideVK(true);
      }
    };

    // Проверяем через небольшую задержку, чтобы VK Bridge успел инициализироваться
    setTimeout(checkVKEnvironment, 1000);
  }, []);

  const installToCommunity = () => {
    if (vkBridge && vkBridge.send) {
      vkBridge.send('VKWebAppAddToCommunity').catch((error) => {
        console.error('Failed to add to community:', error);
      });
    } else {
      console.warn('VK Bridge not available');
    }
  };

  // Если приложение запущено вне VK, показываем соответствующее сообщение
  if (isOutsideVK) {
    return (
      <Panel id={id}>
        <PanelHeader style={{ textAlign: 'center' }}>VK ZooPlatforma</PanelHeader>
        <Group>
          <Placeholder
            icon={<Icon56ErrorOutline />}
          >
            <Placeholder.Title>Приложение работает только в ВКонтакте</Placeholder.Title>
            <Placeholder.Description>
              Это мини-приложение предназначено для работы внутри ВКонтакте. 
              Откройте его через сообщество или каталог приложений ВКонтакте.
            </Placeholder.Description>
          </Placeholder>
          <Box padding="m" style={{ textAlign: 'center' }}>
            <Link href="https://vk.com/apps" target="_blank">
              Перейти в каталог приложений ВКонтакте
            </Link>
          </Box>
        </Group>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader style={{ textAlign: 'center' }}>О приложении</PanelHeader>
      <Group>
        <Placeholder
          icon={<Icon56ServicesOutline />}
          action={
            <Button size="l" onClick={installToCommunity}>
              Установить в сообщество
            </Button>
          }
        >
          <Placeholder.Title>VK ZooPlatforma для публикаций сообщества</Placeholder.Title>
          <Placeholder.Description>
            Установите мини-приложение в сообщество, чтобы участники могли отправлять публикации, а администраторы проверять и выпускать их на стену.
          </Placeholder.Description>
        </Placeholder>
        <Box padding="m" style={{ color: 'var(--vkui--color_text_secondary)', textAlign: 'center' }}>
          После установки приложение будет работать в контексте сообщества и подключится к нашему backend для модерации и публикации постов.
        </Box>
      </Group>
    </Panel>
  );
};
