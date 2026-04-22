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
      <PanelHeader>О приложении</PanelHeader>
      <Group>
        <Placeholder
          icon={<Icon56ServicesOutline />}
          action={
            <Button size="l" onClick={installToCommunity}>
              Установить в сообщество
            </Button>
          }
        >
          <Placeholder.Title>PetPlatform — твой помощник в волонтерстве</Placeholder.Title>
          <Placeholder.Description>
            Управляйте базой животных, находите дом питомцам и делайте добрые дела вместе с нами прямо внутри ВКонтакте. 
            Наш плагин специально разработан для волонтерских групп и приютов.
          </Placeholder.Description>
        </Placeholder>
        <Box padding="m" style={{ color: 'var(--vkui--color_text_secondary)', textAlign: 'center' }}>
          После установки вы сможете вести каталог животных, публиковать объявления и управлять SOS-радаром своего сообщества.
        </Box>
      </Group>
    </Panel>
  );
};
