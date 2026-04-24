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
import { getCommunitySettings, updateCommunitySettings, getCommunityManagers, searchCities, type AppGroupSettings, type AppManager } from '../shared/api';

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
