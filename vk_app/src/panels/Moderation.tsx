import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  Header,
  Group,
  CardGrid,
  ContentCard,
  PanelSpinner,
  Placeholder,
  Button,
  NavIdProps,
  ButtonGroup,
  Div,
} from '@vkontakte/vkui';
import { 
  Icon56NewsfeedOutline,
  Icon56CheckShieldOutline,
  Icon24CheckCircleOutline, 
  Icon24CancelOutline 
} from '@vkontakte/icons';
import bridgeModule, { parseURLSearchParamsForGetLaunchParams } from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { getAllAds, moderateAd, saveGroupToken } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

const bridge = (bridgeModule && 'send' in bridgeModule) 
  ? bridgeModule 
  : (bridgeModule as any).default;

export const Moderation: FC<NavIdProps> = ({ id }) => {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGroupLinked, setIsGroupLinked] = useState(false);
  const routeNavigator = useRouteNavigator();

  const handleConnectGroup = async () => {
    try {
      const launchParams = parseURLSearchParamsForGetLaunchParams(window.location.search);
      const appId = launchParams.vk_app_id;
      const groupId = launchParams.vk_group_id;

      console.log('Attempting to connect community...', { appId, groupId });

      if (!groupId || !appId) {
        console.error('Приложение запущено не в сообществе или отсутствуют параметры запуска');
        return;
      }

      // Используем приведение к any для обхода конфликтов типов в разных версиях моста
      const data = await bridge.send('VKWebAppGetGroupToken' as any, {
        app_id: appId,
        group_id: groupId,
        scope: 'manage,wall,photos',
      }) as any;

      if (data && data.access_token) {
        await saveGroupToken(Number(groupId), data.access_token);
        setIsGroupLinked(true);
        console.log('Group successfully linked!');
      }
    } catch (error) {
      console.error('Failed to get group token:', error);
    }
  };

  useEffect(() => {
    async function fetchAdsForModeration() {
      try {
        const data = await getAllAds('PENDING');
        setAds(data);
      } catch (error) {
        console.error('Failed to fetch ads for moderation:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAdsForModeration();
  }, []);

  const handleApprove = (adId: number) => {
    routeNavigator.push(`/${DEFAULT_VIEW_PANELS.MODERATION}/approve_settings/${adId}`);
  };

  const handleReject = async (adId: number) => {
    try {
      await moderateAd(adId, 'REJECTED');
      setAds(prevAds => prevAds.filter(ad => ad.id !== adId));
    } catch (error) {
      console.error('Failed to reject ad:', error);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader>Модерация</PanelHeader>

      {!isGroupLinked && (
        <Group header={<Header>Настройка публикации</Header>}>
          <div style={{ padding: '0 16px 16px' }}>
            <Placeholder
              icon={<Icon56NewsfeedOutline />}
              title="Подключите сообщество"
              action={
                <Button size="m" onClick={handleConnectGroup}>
                  Подключить стену сообщества
                </Button>
              }
            >
              Чтобы приложение могло автоматически публиковать одобренные объявления на стене, нужно выдать разрешение.
            </Placeholder>
          </div>
        </Group>
      )}

      <Group header={<Header>Предложенные объявления</Header>}>
        {loading ? (
          <PanelSpinner size="l" />
        ) : ads.length === 0 ? (
          <Placeholder
            icon={<Icon56CheckShieldOutline />}
            title="Очередь пуста"
          >
            Все объявления проверены. Отличная работа!
          </Placeholder>
        ) : (
          <CardGrid size="l">
            {ads.map((ad) => (
              <ContentCard
                key={ad.id}
                caption={
                  ad.type === 'LOST' ? 'Пропал питомец' : 
                  ad.type === 'FOUND' ? 'Найден питомец' : 'Пристройство'
                }
                title={ad.title}
                description={
                  <>
                    <Div style={{ padding: 0, marginBottom: 8 }}>{ad.description}</Div>
                    <ButtonGroup mode="horizontal" gap="s" stretched>
                      <Button 
                        size="s" 
                        mode="primary" 
                        appearance="positive"
                        before={<Icon24CheckCircleOutline width={16} height={16} />}
                        onClick={() => handleApprove(ad.id)}
                        stretched
                      >
                        Одобрить
                      </Button>
                      <Button 
                        size="s" 
                        mode="secondary" 
                        appearance="negative"
                        before={<Icon24CancelOutline width={16} height={16} />}
                        onClick={() => handleReject(ad.id)}
                        stretched
                      >
                        Отклонить
                      </Button>
                    </ButtonGroup>
                  </>
                }
                maxHeight={300}
                src={ad.photoUrl || undefined}
              />
            ))}
          </CardGrid>
        )}
      </Group>
    </Panel>
  );
};

export default Moderation;
