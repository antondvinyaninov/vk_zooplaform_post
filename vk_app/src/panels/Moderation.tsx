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
import { parseURLSearchParamsForGetLaunchParams } from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { getFeedPosts, moderatePost, saveGroupToken } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export const Moderation: FC<NavIdProps> = ({ id }) => {
  const [posts, setPosts] = useState<any[]>([]);
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

      // Используем window.vkBridge для получения токена группы
      if (!window.vkBridge) {
        throw new Error('VK Bridge not available');
      }
      
      const data = await window.vkBridge.send('VKWebAppGetGroupToken', {
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
    async function fetchPostsForModeration() {
      try {
        const data = await getFeedPosts('pending');
        setPosts(data);
      } catch (error) {
        console.error('Failed to fetch posts for moderation:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPostsForModeration();
  }, []);

  useEffect(() => {
    const handlePostModerated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const postId = customEvent.detail?.postId;
      if (postId) {
        setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      }
    };
    
    window.addEventListener('postModerated', handlePostModerated);
    return () => {
      window.removeEventListener('postModerated', handlePostModerated);
    };
  }, []);

  const handleApprove = (postId: number) => {
    routeNavigator.push(`/${DEFAULT_VIEW_PANELS.MODERATION}/approve_settings/${postId}`);
  };

  const handleReject = async (postId: number) => {
    try {
      await moderatePost(postId, 'rejected');
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Failed to reject post:', error);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader style={{ textAlign: 'center' }}>Модерация</PanelHeader>

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

      <Group header={<Header>Публикации на модерации</Header>}>
        {loading ? (
          <PanelSpinner size="l" />
        ) : posts.length === 0 ? (
          <Placeholder
            icon={<Icon56CheckShieldOutline />}
            title="Очередь пуста"
          >
            Все публикации проверены. Отличная работа!
          </Placeholder>
        ) : (
          <CardGrid size="l">
            {posts.map((post) => (
              <ContentCard
                key={post.id}
                caption={post.group?.name || 'Публикация сообщества'}
                title={post.title}
                description={
                  <>
                    <Div style={{ padding: 0, marginBottom: 8 }}>{post.message}</Div>
                    <ButtonGroup mode="horizontal" gap="s" stretched>
                      <Button 
                        size="s" 
                        mode="primary" 
                        appearance="positive"
                        before={<Icon24CheckCircleOutline width={16} height={16} />}
                        onClick={() => handleApprove(post.id)}
                        stretched
                      >
                        Одобрить
                      </Button>
                      <Button 
                        size="s" 
                        mode="secondary" 
                        appearance="negative"
                        before={<Icon24CancelOutline width={16} height={16} />}
                        onClick={() => handleReject(post.id)}
                        stretched
                      >
                        Отклонить
                      </Button>
                    </ButtonGroup>
                  </>
                }
                maxHeight={300}
              />
            ))}
          </CardGrid>
        )}
      </Group>
    </Panel>
  );
};

export default Moderation;
