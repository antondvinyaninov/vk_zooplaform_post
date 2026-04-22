import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  SimpleCell,
  NavIdProps,
  CardGrid,
  ContentCard,
  PanelSpinner,
  Header,
  Button,
} from '@vkontakte/vkui';
import { Icon28UserOutline, Icon28ListOutline, Icon28AddOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { getAllAds } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export interface HomeProps extends NavIdProps {}

export const Home: FC<HomeProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAds() {
      try {
        const data = await getAllAds();
        setAds(data);
      } catch (error) {
        console.error('Failed to fetch ads:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAds();
  }, []);

  return (
    <Panel id={id}>
      <PanelHeader 
        before={<PanelHeaderBack onClick={() => window.history.back()} />}
      >
        Главная
      </PanelHeader>

      <Group>
        <SimpleCell
          before={<Icon28UserOutline />}
          onClick={() => routeNavigator.push('/profile')}
        >
          Мой профиль
        </SimpleCell>
        <SimpleCell
          before={<Icon28ListOutline />}
          onClick={() => routeNavigator.push('/my_ads')}
        >
          Мои объявления
        </SimpleCell>
      </Group>

      <Group header={
        <Header 
          after={
            <Button 
              size="s" 
              mode="tertiary" 
              before={<Icon28AddOutline width={20} height={20} />}
              onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.CREATE_AD}`)}
            >
              Добавить
            </Button>
          }
        >
          Лента объявлений
        </Header>
      }>
        {loading ? (
          <PanelSpinner size="l" />
        ) : (
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
        )}
      </Group>
    </Panel>
  );
};
