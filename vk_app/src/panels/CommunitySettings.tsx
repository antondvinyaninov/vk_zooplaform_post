import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  FormItem,
  Input,
  Switch,
  Button,
  Div,
  NavIdProps,
  Spinner,
  FormStatus,
  ChipsSelect,
  Snackbar,
} from '@vkontakte/vkui';
import { Icon24CheckCircleOutline, Icon24ErrorCircleOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { getCommunitySettings, updateCommunitySettings, getCommunityManagers, type AppGroupSettings, type AppManager } from '../shared/api';

export const CommunitySettings: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [settings, setSettings] = useState<AppGroupSettings | null>(null);
  const [name, setName] = useState('');
  const [screenName, setScreenName] = useState('');
  const [photo200, setPhoto200] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notifyUserIds, setNotifyUserIds] = useState<number[]>([]);
  const [managers, setManagers] = useState<AppManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getCommunitySettings();
        setSettings(data);
        setName(data.name || '');
        setScreenName(data.screen_name || '');
        setPhoto200(data.photo_200 || '');
        setIsActive(data.is_active);
        setNotifyUserIds(data.notify_user_ids || []);

        try {
          const mgrs = await getCommunityManagers();
          setManagers(mgrs);
        } catch (e) {
          console.error('Failed to load managers', e);
        }
      } catch (e: any) {
        setError(e?.message || 'Не удалось загрузить настройки сообщества');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSnackbar(null);
    setSaving(true);
    try {
      const updated = await updateCommunitySettings({
        name: name.trim(),
        screen_name: screenName.trim(),
        photo_200: photo200.trim(),
        is_active: isActive,
        notify_user_ids: notifyUserIds,
      });
      setSettings(updated);
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          onClosed={() => setSnackbar(null)}
          before={<Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
        >
          Настройки успешно сохранены
        </Snackbar>
      );
    } catch (e: any) {
      setError(e?.message || 'Не удалось сохранить настройки');
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          onClosed={() => setSnackbar(null)}
          before={<Icon24ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />}
        >
          Ошибка сохранения настроек
        </Snackbar>
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader
        before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}
        style={{ textAlign: 'center' }}
      >
        Настройки сообщества
      </PanelHeader>

      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
          <Spinner size="l" />
        </Div>
      ) : (
        <>
          {error && (
            <FormStatus mode="error">
              Ошибка: {error}
            </FormStatus>
          )}

          <Group>
            <FormItem top="ID сообщества">
              <Input value={settings?.vk_group_id ? String(settings.vk_group_id) : ''} disabled />
            </FormItem>
            <FormItem top="Название сообщества">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormItem>
            <FormItem top="Короткое имя (screen_name)">
              <Input value={screenName} onChange={(e) => setScreenName(e.target.value)} />
            </FormItem>
            <FormItem top="URL аватара (photo_200)">
              <Input value={photo200} onChange={(e) => setPhoto200(e.target.value)} />
            </FormItem>
            <FormItem top="Статус сообщества">
              <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            </FormItem>
            <FormItem top="Токен сообщества">
              <Input value={settings?.has_token ? 'Подключен' : 'Не подключен'} disabled />
            </FormItem>
            <FormItem top="Получатели уведомлений">
              <ChipsSelect
                value={managers.filter(m => notifyUserIds.includes(m.id)).map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }))}
                onChange={(options) => setNotifyUserIds(options.map(o => Number(o.value)))}
                options={managers.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }))}
                placeholder="Выберите администраторов"
                emptyText="Администраторы не найдены"
              />
            </FormItem>
          </Group>

          <Div>
            <Button size="l" stretched loading={saving} onClick={handleSave}>
              Сохранить
            </Button>
          </Div>
        </>
      )}
      {snackbar}
    </Panel>
  );
};

export default CommunitySettings;
