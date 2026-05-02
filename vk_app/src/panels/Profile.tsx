import { FC } from 'react';
import {
  Panel,
  PanelHeader,
  Header,
  Group,
  SimpleCell,
  Avatar,
  NavIdProps,
  List,
  CustomSelect,
  FormItem,
  Snackbar,
} from '@vkontakte/vkui';
import {
  Icon28SettingsOutline,
  Icon28CheckShieldOutline,
  Icon28ErrorCircleOutline,
  Icon28CheckCircleOutline,
} from '@vkontakte/icons';
import { UserInfo } from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { DEFAULT_VIEW_PANELS } from '../routes';
import { AppUser, searchCities, updateUserProfile } from '../shared/api';
import { useState, useRef } from 'react';

export interface ProfileProps extends NavIdProps {
  fetchedUser?: UserInfo;
  appUser?: AppUser;
  role?: string | null;
  onAppUserUpdate?: (user: AppUser) => void;
}

export const Profile: FC<ProfileProps> = ({ id, fetchedUser, appUser, role, onAppUserUpdate }) => {
  const { photo_200, first_name, last_name } = { ...fetchedUser };
  const routeNavigator = useRouteNavigator();
  
  const [cityOptions, setCityOptions] = useState<{label: string, value: number}[]>(
    appUser?.city_id && appUser?.city_title 
      ? [{ label: appUser.city_title, value: appUser.city_id }] 
      : []
  );
  const [isCityLoading, setIsCityLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const isAdmin = ['admin', 'editor', 'moder'].includes(role || '');

  return (
    <Panel id={id}>
      <PanelHeader style={{ textAlign: 'center' }}>
        Профиль
      </PanelHeader>

      <Group>
        <SimpleCell
          before={photo_200 ? <Avatar size={72} src={photo_200} /> : <Avatar size={72} />}
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

      <Group header={<Header>Личные настройки</Header>}>
        <FormItem top="Ваш город">
          <CustomSelect
            placeholder="Выберите город"
            searchable
            options={cityOptions}
            value={appUser?.city_id}
            fetching={isCityLoading}
            allowClearButton
            onInputChange={(e) => {
              const q = e.target.value;
              if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
              if (!q) return;
              
              setIsCityLoading(true);
              searchTimeoutRef.current = setTimeout(async () => {
                try {
                  const cities = await searchCities(q);
                  setCityOptions(cities.map(c => ({ 
                    label: c.region ? `${c.title} (${c.region})` : c.title, 
                    value: c.id 
                  })));
                } catch (err) {
                  console.error("City search error", err);
                } finally {
                  setIsCityLoading(false);
                }
              }, 500);
            }}
            onChange={async (e) => {
              const newCityId = Number(e.target.value);
              const newCityTitle = cityOptions.find(o => o.value === newCityId)?.label;
              
              if (appUser && onAppUserUpdate) {
                const oldAppUser = { ...appUser };
                try {
                  // Optistic update
                  onAppUserUpdate({ ...appUser, city_id: newCityId || undefined, city_title: newCityTitle });
                  
                  await updateUserProfile({
                    city_id: newCityId || undefined,
                    city_title: newCityTitle || undefined
                  });
                  setSnackbar(
                    <Snackbar
                      onClose={() => setSnackbar(null)}
                      onClosed={() => setSnackbar(null)}
                      before={<Icon28CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
                    >
                      Настройки профиля сохранены
                    </Snackbar>
                  );
                } catch (err) {
                  onAppUserUpdate(oldAppUser); // Revert
                  setSnackbar(
                    <Snackbar
                      onClose={() => setSnackbar(null)}
                      onClosed={() => setSnackbar(null)}
                      before={<Icon28ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />}
                    >
                      Ошибка при сохранении города
                    </Snackbar>
                  );
                }
              }
            }}
          />
        </FormItem>
      </Group>

      {snackbar}
    </Panel>
  );
};
