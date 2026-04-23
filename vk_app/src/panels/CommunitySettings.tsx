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
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { getCommunitySettings, updateCommunitySettings, type AppGroupSettings } from '../shared/api';

export const CommunitySettings: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [settings, setSettings] = useState<AppGroupSettings | null>(null);
  const [name, setName] = useState('');
  const [screenName, setScreenName] = useState('');
  const [photo200, setPhoto200] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await updateCommunitySettings({
        name: name.trim(),
        screen_name: screenName.trim(),
        photo_200: photo200.trim(),
        is_active: isActive,
      });
      setSettings(updated);
      setSuccess('Настройки сообщества сохранены');
    } catch (e: any) {
      setError(e?.message || 'Не удалось сохранить настройки');
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
          {success && (
            <FormStatus mode="default">
              {success}
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
          </Group>

          <Div>
            <Button size="l" stretched loading={saving} onClick={handleSave}>
              Сохранить
            </Button>
          </Div>
        </>
      )}
    </Panel>
  );
};

export default CommunitySettings;
