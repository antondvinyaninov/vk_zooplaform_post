import { FC } from 'react';
import {
  Panel,
  PanelHeader,
  Placeholder,
  Button,
  Group,
  Box,
  NavIdProps,
} from '@vkontakte/vkui';
import { Icon56ServicesOutline } from '@vkontakte/icons';
import bridge from '@vkontakte/vk-bridge';

export const Onboarding: FC<NavIdProps> = ({ id }) => {
  const installToCommunity = () => {
    bridge.send('VKWebAppAddToCommunity').catch((error) => {
      console.error('Failed to add to community:', error);
    });
  };

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
