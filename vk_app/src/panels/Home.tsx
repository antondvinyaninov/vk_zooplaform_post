import { FC, useEffect, useState } from 'react';
import { Alert,
  Panel,
  PanelHeader,
  Group,
  NavIdProps,
  PanelSpinner,
  Header,
  Button,
  Placeholder,
  Card,
  Div,
  Text,
} from '@vkontakte/vkui';
import { Icon28AddOutline, Icon56AddCircleOutline, Icon28VideoOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { getMyPosts, deletePost } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export interface HomeProps extends NavIdProps {}

export const Home: FC<HomeProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const data = await getMyPosts();
        setPosts(data);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  return (
    <Panel id={id}>
      <PanelHeader style={{ textAlign: 'center' }}>
        Главная
      </PanelHeader>

      <Group header={
        <Header 
          after={
            <Button 
              size="s" 
              mode="tertiary" 
              before={<Icon28AddOutline width={20} height={20} />}
              onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.CREATE_POST}`)}
            >
              Добавить
            </Button>
          }
        >
          Лента публикаций (v5.1)
        </Header>
      }>
        {loading ? (
          <PanelSpinner size="l" />
        ) : posts.length === 0 ? (
          <Placeholder
            stretched
            icon={<Icon56AddCircleOutline />}
            title="Вы еще не делали постов"
            action={
              <Button size="m" onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.CREATE_POST}`)}>
                Добавить первый
              </Button>
            }
          >
            Здесь будут отображаться публикации, созданные через приложение
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
                    
                    const proxyUrl = firstAtt.url.replace('https://s3.firstvds.ru', 'https://gw.zooplatforma.ru/s3');
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
                            src={proxyUrl} 
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
                      {post.status === 'published' ? '✅ Опубликовано' :
                       post.status === 'pending' ? '⏳ На модерации' :
                       post.status === 'rejected' ? '❌ Отклонено' :
                       post.status === 'draft' ? '📝 Черновик' :
                       post.status}
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
                    mode="secondary" 
                    stretched
                    onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.POST_DETAIL}/${post.id}`)}
                  >
                    Подробнее
                  </Button>
                  <Button 
                    size="s" 
                    mode="outline" 
                    appearance="negative"
                    stretched
                    loading={deletingId === post.id}
                    onClick={() => {
                      const closePopout = () => (window as any).setGlobalPopout(null);
                      (window as any).setGlobalPopout(
                        <Alert
                          actions={[
                            { title: 'Отмена', mode: 'cancel', autoCloseDisabled: true, action: () => { closePopout(); } },
                            { 
                              title: 'Удалить', 
                              mode: 'destructive',
                              autoCloseDisabled: true,
                              action: async () => {
                                closePopout();
                                try {
                                  setDeletingId(post.id);
                                  await deletePost(post.id);
                                  setPosts(prev => prev.filter(p => p.id !== post.id));
                                } catch (e: any) {
                                  console.error('Failed to delete post:', e);
                                  (window as any).setGlobalPopout(
                                    <Alert
                                      actions={[{ title: 'ОК', mode: 'cancel', action: closePopout }]}
                                      onClose={closePopout}
                          onClosed={() => {}}
                                      title="Ошибка"
                                      description={e.message || 'Не удалось удалить пост'}
                                    />
                                  );
                                } finally {
                                  setDeletingId(null);
                                }
                              }
                            }
                          ]}
                          actionsLayout="horizontal"
                          onClose={closePopout}
                          onClosed={() => {}}
                          title="Подтвердите действие"
                          description="Вы уверены, что хотите удалить эту публикацию?"
                        />
                      );
                    }}
                  >
                    Удалить
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
