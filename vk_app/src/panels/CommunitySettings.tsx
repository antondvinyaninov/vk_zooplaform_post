import vkBridgeModule from '@vkontakte/vk-bridge';
const vkBridge = (vkBridgeModule as any).send ? vkBridgeModule : (vkBridgeModule as any).default;
import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  FormItem,
  Button,
  Div,
  NavIdProps,
  Spinner,
  FormStatus,
  ChipsSelect,
  Snackbar,
  CustomSelect,
} from '@vkontakte/vkui';
import { Icon24CheckCircleOutline, Icon24ErrorCircleOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { getCommunitySettings, updateCommunitySettings, getCommunityManagers, searchCities, saveGroupToken, type AppGroupSettings, type AppManager } from '../shared/api';

export const CommunitySettings: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [settings, setSettings] = useState<AppGroupSettings | null>(null);
  const [notifyUserIds, setNotifyUserIds] = useState<number[]>([]);
  const [cityId, setCityId] = useState<number | undefined>(undefined);
  const [cityTitle, setCityTitle] = useState<string>('');
  const [cityOptions, setCityOptions] = useState<{value: number, label: string}[]>([]);
  const [cityQuery, setCityQuery] = useState('');
  const [citySearchLoading, setCitySearchLoading] = useState(false);
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
        setNotifyUserIds(data.notify_user_ids || []);
        if (data.city_id && data.city_title) {
          setCityId(data.city_id);
          setCityTitle(data.city_title);
          setCityOptions([{ value: data.city_id, label: data.city_title }]);
        }

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

  useEffect(() => {
    if (!cityQuery) return;
    const timer = setTimeout(async () => {
      setCitySearchLoading(true);
      try {
        const cities = await searchCities(cityQuery);
        const options = cities.map(c => ({
          value: c.id,
          label: c.region ? `${c.title} (${c.region})` : c.title
        }));
        
        // Preserve current selected city if it's not in the new results
        if (cityId && cityTitle && !options.find(o => o.value === cityId)) {
          options.unshift({ value: cityId, label: cityTitle });
        }
        
        setCityOptions(options);
      } catch (e) {
        console.error('Failed to search cities', e);
      } finally {
        setCitySearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [cityQuery, cityId, cityTitle]);

  const handleSave = async () => {
    setError(null);
    setSnackbar(null);
    setSaving(true);
    try {
      const updated = await updateCommunitySettings({
        name: settings?.name || '',
        screen_name: settings?.screen_name || '',
        photo_200: settings?.photo_200 || '',
        city_id: cityId,
        city_title: cityTitle,
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
        before={<PanelHeaderBack onClick={() => {
          if (window.history.length <= 2) {
            routeNavigator.replace('/');
          } else {
            routeNavigator.back();
          }
        }} />}
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
            {!settings?.has_token && (
              <FormItem top="Подключение Callback API (обязательно для работы бота)">
                <Button 
                  size="l" 
                  stretched 
                  mode="secondary"
                  before={<Icon24CheckCircleOutline />}
                  onClick={async () => {
                    try {
                      // @ts-ignore
                      const launchParams = window.vkLaunchParams || {};
                      const appId = Number(launchParams.vk_app_id);
                      const groupId = Number(launchParams.vk_group_id);
                      
                      if (!appId || !groupId) {
                        throw new Error("Не удалось определить ID приложения или группы");
                      }
                      
                      // @ts-ignore
                      const result = await vkBridge.send('VKWebAppGetCommunityToken', {
                        app_id: appId,
                        group_id: groupId,
                        scope: 'messages,manage,photos,docs'
                      });
                      
                      if (result.access_token) {
                        setSaving(true);
                        // @ts-ignore
                        await saveGroupToken(groupId, result.access_token);
                        setSettings(prev => prev ? { ...prev, has_token: true } : null);
                        setSnackbar(
                          <Snackbar
                            onClose={() => setSnackbar(null)}
                            onClosed={() => setSnackbar(null)}
                            before={<Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
                          >
                            Сообщество успешно подключено к API
                          </Snackbar>
                        );
                      }
                    } catch (e: any) {
                      setError(e?.error_data?.error_reason || e?.message || "Ошибка подключения");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Предоставить доступ
                </Button>
              </FormItem>
            )}
            
            <FormItem top="Город (где работает группа)">
              <CustomSelect
                value={cityId}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCityId(val);
                  const selected = cityOptions.find(o => o.value === val);
                  if (selected) {
                    setCityTitle(selected.label);
                  }
                }}
                onInputChange={(e) => setCityQuery(e.target.value)}
                options={cityOptions}
                searchable
                allowClearButton
                placeholder="Введите название населенного пункта"
                emptyText="Ничего не найдено"
                fetching={citySearchLoading}
              />
            </FormItem>
            <FormItem 
              top="Получатели уведомлений" 
              bottom="⚠️ Важно: чтобы получать уведомления, администратор должен хотя бы раз написать любое сообщение в официальную группу ЗооПлатформы (или нажать «Разрешить сообщения»). Без этого ВКонтакте заблокирует отправку."
            >
              <ChipsSelect
                value={managers.filter(m => notifyUserIds.includes(m.id)).map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }))}
                onChange={(options) => setNotifyUserIds(options.map(o => Number(o.value)))}
                options={managers.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }))}
                placeholder="Выберите администраторов"
                emptyText="Администраторы не найдены"
              />
              <Div style={{ padding: '12px 0 0 0' }}>
                <Button 
                  mode="secondary" 
                  size="m" 
                  onClick={() => {
                    try {
                      // @ts-ignore
                      vkBridge.send('VKWebAppAllowMessagesFromGroup', {
                        group_id: 165434330,
                        key: 'admin_notifications'
                      }).then(() => {
                        setSnackbar(
                          <Snackbar
                            onClose={() => setSnackbar(null)}
                            onClosed={() => setSnackbar(null)}
                            before={<Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
                          >
                            Уведомления успешно разрешены
                          </Snackbar>
                        );
                      }).catch((e: any) => {
                        console.error(e);
                        setSnackbar(
                          <Snackbar
                            onClose={() => setSnackbar(null)}
                            onClosed={() => setSnackbar(null)}
                            before={<Icon24ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />}
                          >
                            Ошибка ВК: {JSON.stringify(e)}
                          </Snackbar>
                        );
                      });
                    } catch (e) {
                      console.error(e);
                      setSnackbar(
                        <Snackbar
                          onClose={() => setSnackbar(null)}
                          onClosed={() => setSnackbar(null)}
                          before={<Icon24ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />}
                        >
                          Системная ошибка: {String(e)}
                        </Snackbar>
                      );
                    }
                  }}
                >
                  Разрешить сообщения от ЗооПлатформы
                </Button>
                <Button 
                  mode="tertiary" 
                  size="m" 
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_URL}/api/app/notifications/test${window.location.search}`, {
                        method: 'POST'
                      });
                      const data = await response.json();
                      if (response.ok && data.status === 'ok') {
                        setSnackbar(
                          <Snackbar
                            onClose={() => setSnackbar(null)}
                            onClosed={() => setSnackbar(null)}
                            before={<Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
                          >
                            Тестовое сообщение успешно отправлено!
                          </Snackbar>
                        );
                      } else {
                        throw new Error(data.error || 'Неизвестная ошибка');
                      }
                    } catch (e: any) {
                      setSnackbar(
                        <Snackbar
                          onClose={() => setSnackbar(null)}
                          onClosed={() => setSnackbar(null)}
                          before={<Icon24ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />}
                        >
                          Ошибка отправки: {e.message}
                        </Snackbar>
                      );
                    }
                  }}
                  style={{ marginTop: 8 }}
                >
                  Отправить тестовое сообщение
                </Button>
              </Div>
            </FormItem>
          </Group>

          <Div>
            <Button size="l" stretched loading={saving} onClick={handleSave}>
              Сохранить настройки
            </Button>
          </Div>
        </>
      )}
      {snackbar}
    </Panel>
  );
};

export default CommunitySettings;
