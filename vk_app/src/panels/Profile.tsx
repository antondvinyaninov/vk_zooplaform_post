import { FC } from 'react';
import {
  Panel,
  PanelHeader,
  Header,
  Group,
  SimpleCell,
  Avatar,
  InfoRow,
  NavIdProps,
  List,
} from '@vkontakte/vkui';
import {
  Icon28SettingsOutline,
  Icon28CheckShieldOutline,
} from '@vkontakte/icons';
import { UserInfo } from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { DEFAULT_VIEW_PANELS } from '../routes';

export interface ProfileProps extends NavIdProps {
  fetchedUser?: UserInfo;
  role?: string | null;
}

export const Profile: FC<ProfileProps> = ({ id, fetchedUser, role }) => {
  const { photo_200, first_name, last_name } = { ...fetchedUser };
  const routeNavigator = useRouteNavigator();

  const isAdmin = ['admin', 'editor', 'moder'].includes(role || '');

  return (
    <Panel id={id}>
      <PanelHeader style={{ textAlign: 'center' }}>
        Профиль
      </PanelHeader>

      <Group>
        <SimpleCell
          before={photo_200 ? <Avatar size={72} src={photo_200} /> : <Avatar size={72} />}
          subtitle={
            <InfoRow header="Твоя роль (для тестов)">
              <span style={{ color: isAdmin ? 'var(--vkui--color_text_accent)' : 'var(--vkui--color_text_secondary)', fontWeight: 'bold' }}>
                {role ? role.toUpperCase() : 'НЕТ РОЛИ / ГОСТЬ'}
              </span>
            </InfoRow>
          }
        >
          {first_name} {last_name}
        </SimpleCell>
      </Group>

      {isAdmin && (
        <Group header={<Header>Меню администратора</Header>}>
          <List>
            <SimpleCell before={<Icon28SettingsOutline />} onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.COMMUNITY_SETTINGS}`)}>
              Настройки сообщества
            </SimpleCell>

            <SimpleCell 
              before={<Icon28CheckShieldOutline />} 
              onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.MODERATION}`)}
            >
              Модерация объявлений
            </SimpleCell>
          </List>
        </Group>
      )}


    </Panel>
  );
};
