import { FC } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
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
  Icon28UsersOutline,
  Icon28StatisticsOutline,
  Icon28ListOutline,
  Icon28FavoriteOutline,
  Icon28HelpOutline,
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
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
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
            <SimpleCell before={<Icon28SettingsOutline />} onClick={() => console.log('Admin Settings')}>
              Настройки сообщества
            </SimpleCell>
            <SimpleCell before={<Icon28UsersOutline />} onClick={() => console.log('Admin Members')}>
              Управление участниками
            </SimpleCell>
            <SimpleCell before={<Icon28StatisticsOutline />} onClick={() => console.log('Admin Stats')}>
              Статистика приюта
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

      <Group header={<Header>Меню пользователя</Header>}>
        <List>
          <SimpleCell 
            before={<Icon28ListOutline />} 
            onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.MY_ADS}`)}
          >
            Мои объявления
          </SimpleCell>
          <SimpleCell before={<Icon28FavoriteOutline />} onClick={() => console.log('Favorites')}>
            Избранное
          </SimpleCell>
          <SimpleCell before={<Icon28HelpOutline />} onClick={() => console.log('Support')}>
            Помощь и поддержка
          </SimpleCell>
        </List>
      </Group>
    </Panel>
  );
};
