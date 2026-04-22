import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Placeholder,
  Button,
  Group,
  PanelSpinner,
  NavIdProps,
  CardGrid,
  ContentCard,
} from '@vkontakte/vkui';
import { Icon56ArticleOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { DEFAULT_VIEW_PANELS } from '../routes';

const API_URL = '/api';

export const MyAds: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyAds() {
      try {
        const search = window.location.search;
        const response = await fetch(`${API_URL}/ads/my`, {
          headers: {
            'x-vk-sign': search.slice(1),
          },
        });
        if (response.ok) {
          const data = await response.json();
          setAds(data);
        }
      } catch (error) {
        console.error('Failed to fetch my ads:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMyAds();
  }, []);

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Мои объявления
      </PanelHeader>

      {loading ? (
        <PanelSpinner size="l" />
      ) : ads.length === 0 ? (
        <Placeholder
          icon={<Icon56ArticleOutline />}
          title="У вас пока нет объявлений"
          action={
            <Button size="m" onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.CREATE_AD}`)}>
              Добавить объявление
            </Button>
          }
        >
          Здесь будут отображаться ваши объявления о поиске или пристройстве животных. 
          Начните помогать прямо сейчас!
        </Placeholder>
      ) : (
        <Group>
          <CardGrid size="l">
            {ads.map((ad) => (
              <ContentCard
                key={ad.id}
                onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.AD_DETAIL}/${ad.id}`)}
                caption={
                  ad.type === 'LOST' ? 'Пропал питомец' : 
                  ad.type === 'FOUND' ? 'Найден питомец' : 'Пристройство'
                }
                title={ad.title}
                description={ad.description}
                maxHeight={250}
                src={ad.photoUrl || undefined}
              />
            ))}
          </CardGrid>
        </Group>
      )}
    </Panel>
  );
};
