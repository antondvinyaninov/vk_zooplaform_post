import { FC, useEffect, useState } from 'react';
import {
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
import { Icon28AddOutline, Icon56AddCircleOutline, Icon28PictureOutline } from '@vkontakte/icons';
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
          Лента публикаций
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
                  <div style={{ 
                    width: 80, 
                    height: 80, 
                    flexShrink: 0, 
                    borderRadius: 8, 
                    overflow: 'hidden', 
                    backgroundColor: 'var(--vkui--color_background_secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {post.attachment_urls?.[0]?.url ? (
                      <img 
                        src={post.attachment_urls[0].url} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        alt="Медиа"
                      />
                    ) : (
                      <Icon28PictureOutline style={{ color: 'var(--vkui--color_icon_secondary)' }} />
                    )}
                  </div>
                  
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
                      window.dispatchEvent(new CustomEvent('vkui-alert', {
                        detail: {
                          title: 'Подтвердите действие',
                          text: 'Вы уверены, что хотите удалить эту публикацию?',
                          confirmText: 'Удалить',
                          onConfirm: async () => {
                            try {
                              setDeletingId(post.id);
                              await deletePost(post.id);
                              setPosts(prev => prev.filter(p => p.id !== post.id));
                            } catch (e: any) {
                              console.error('Failed to delete post:', e);
                              window.dispatchEvent(new CustomEvent('vkui-alert', {
                                detail: {
                                  title: 'Ошибка',
                                  text: e.message || 'Не удалось удалить пост',
                                  confirmText: 'ОК'
                                }
                              }));
                            } finally {
                              setDeletingId(null);
                            }
                          }
                        }
                      }));
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
