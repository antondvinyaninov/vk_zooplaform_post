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
  Button,
  Div,
  FormStatus,
} from '@vkontakte/vkui';
import {
  Icon28SettingsOutline,
  Icon28CheckShieldOutline,
  Icon28ErrorCircleOutline,
  Icon28CheckCircleOutline,
  Icon28LinkOutline,
  Icon28CameraOutline,
} from '@vkontakte/icons';
import { UserInfo } from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { DEFAULT_VIEW_PANELS } from '../routes';
import { AppUser, searchCities, updateUserProfile, grantMiniAppPhotosToken } from '../shared/api';
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
  const [photosGranting, setPhotosGranting] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const launchRole = String((window as any).vkLaunchParams?.vk_viewer_group_role || '');
  const isAdmin = ['admin', 'editor', 'moder'].includes(role || launchRole);

  const handleGrantPhotos = async () => {
    setPhotosGranting(true);
    try {
      await grantMiniAppPhotosToken();
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          onClosed={() => setSnackbar(null)}
          before={<Icon28CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
        >
          Загрузка фото на стену разрешена
        </Snackbar>
      );
    } catch (e: any) {
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          onClosed={() => setSnackbar(null)}
          before={<Icon28ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />}
        >
          {e?.error_data?.error_reason || e?.message || 'Не удалось получить токен фото'}
        </Snackbar>
      );
    } finally {
      setPhotosGranting(false);
    }
  };

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
          <Div>
            <Button
              size="l"
              stretched
              mode="primary"
              before={<Icon28CameraOutline />}
              loading={photosGranting}
              onClick={handleGrantPhotos}
            >
              Разрешить загрузку фото на стену
            </Button>
          </Div>
          <List>
            <SimpleCell
              before={<Icon28SettingsOutline />}
              subtitle="Ключ API группы, город, типы постов"
              onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.COMMUNITY_SETTINGS}`)}
            >
              Настройки сообщества
            </SimpleCell>

            <SimpleCell 
              before={<Icon28CheckShieldOutline />} 
              onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.MODERATION}`)}
            >
              Модерация объявлений
            </SimpleCell>

            <SimpleCell 
              before={<Icon28LinkOutline />} 
              onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.POST_BY_LINK}`)}
            >
              Пост по ссылке
            </SimpleCell>
          </List>
        </Group>
      )}

      {!isAdmin && (
        <Group>
          <FormStatus mode="default">
            Кнопка «Разрешить загрузку фото» и «Настройки сообщества» видны только администратору, и только если Mini App открыт из сообщества (не с личной страницы и не из управления VK).
          </FormStatus>
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
