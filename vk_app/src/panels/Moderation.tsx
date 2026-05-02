import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Header,
  Group,
  Card,
  Text,
  PanelSpinner,
  Placeholder,
  Button,
  NavIdProps,
  Div,
} from '@vkontakte/vkui';
import {
  Icon56CheckShieldOutline,
  Icon24CheckCircleOutline, 
  Icon24CancelOutline,
  Icon28VideoOutline
} from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { getFeedPosts, moderatePost, AppPost } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export const Moderation: FC<NavIdProps> = ({ id }) => {
  const [posts, setPosts] = useState<AppPost[]>([]);
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px', paddingBottom: 24 }}>
            {posts.map((post) => (
              <Card key={post.id} mode="shadow">
                <Div style={{ display: 'flex', gap: 12 }}>
                  {/* Изображение */}
                  {post.attachment_urls?.[0]?.url && (() => {
                    const firstAtt = post.attachment_urls[0];
                    const isS3Video = firstAtt.type === 's3_video' || firstAtt.url.includes('.mp4') || firstAtt.url.includes('.mov');
                    const isVKVideo = firstAtt.type === 'vk_video' || firstAtt.type === 'video';
                    
                    return (
                    <div 
                      onClick={() => {
                        if (isVKVideo) {
                           window.open(`https://vk.com/${firstAtt.id}`, '_blank');
                        }
                      }}
                      style={{ 
                        width: 80, 
                        height: 80, 
                        flexShrink: 0, 
                        borderRadius: 8, 
                        overflow: 'hidden', 
                        backgroundColor: 'var(--vkui--color_background_secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        cursor: isVKVideo ? 'pointer' : 'default'
                      }}
                    >
                      {isS3Video ? (
                        <>
                          <video 
                            src={firstAtt.url} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            muted
                            playsInline
                          />
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon28VideoOutline width={32} height={32} style={{ color: 'white' }} />
                          </div>
                        </>
                      ) : isVKVideo ? (
                        <>
                          <img 
                            src={firstAtt.url} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            alt="VK Видео"
                          />
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon28VideoOutline width={32} height={32} style={{ color: 'white' }} />
                          </div>
                        </>
                      ) : (
                        <img 
                          src={firstAtt.url} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          alt="Медиа"
                        />
                      )}
                    </div>
                    );
                  })()}
                  
                  {/* Информация */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                    <Text weight="2" style={{ color: 'var(--vkui--color_text_subhead)', marginBottom: 4 }}>
                      {post.group?.name || 'Публикация сообщества'}
                    </Text>
                    <Text style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      display: '-webkit-box', 
                      WebkitLineClamp: 2, 
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                      color: 'var(--vkui--color_text_primary)'
                    }}>
                      {post.title || post.message}
                    </Text>
                  </div>
                </Div>

                <Div style={{ display: 'flex', gap: 8, paddingTop: 0 }}>
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
                </Div>
              </Card>
            ))}
          </div>
        )}
      </Group>
    </Panel>
  );
};

export default Moderation;
