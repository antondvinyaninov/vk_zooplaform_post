import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
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
  Icon56CheckShieldOutline,
  Icon24CheckCircleOutline, 
  Icon24CancelOutline,
  Icon28VideoOutline,
  Icon24Camera
} from '@vkontakte/icons';
import { Link } from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { getFeedPosts, moderatePost } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export const Moderation: FC<NavIdProps> = ({ id }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const routeNavigator = useRouteNavigator();

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
        Модерация
      </PanelHeader>



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
                    {post.attachments && (
                      <Div style={{ padding: 0, marginBottom: 12 }}>
                        <div style={{ fontSize: 13, color: '#818c99', marginBottom: 6 }}>Прикрепленные медиа ({post.attachments.split(',').length}):</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {post.attachments.split(',').map((att: string, i: number) => {
                            const isVideo = att.startsWith('video');
                            const url = `https://vk.com/${att}`;
                            return (
                              <Link key={i} href={url} target="_blank" style={{ display: 'flex', alignItems: 'center', background: '#f0f0f0', padding: '6px 10px', borderRadius: 8, textDecoration: 'none' }}>
                                {isVideo ? <Icon28VideoOutline width={16} height={16} style={{ marginRight: 6 }} /> : <Icon24Camera width={16} height={16} style={{ marginRight: 6 }} />}
                                <span style={{ fontSize: 13, fontWeight: 500 }}>{isVideo ? 'Видео' : 'Фото'} {i + 1}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </Div>
                    )}
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
