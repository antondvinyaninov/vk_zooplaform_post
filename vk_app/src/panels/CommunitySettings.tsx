import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  FormItem,
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
        name: settings?.name || '',
        screen_name: settings?.screen_name || '',
        photo_200: settings?.photo_200 || '',
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
            <FormItem top="Активировать приложение в сообществе">
              <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
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
