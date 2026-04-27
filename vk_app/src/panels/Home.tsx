import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  NavIdProps,
  CardGrid,
  ContentCard,
  PanelSpinner,
  Header,
  Button,
  Placeholder,
} from '@vkontakte/vkui';
import { Icon28AddOutline, Icon56AddCircleOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { getMyPosts } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export interface HomeProps extends NavIdProps {}

export const Home: FC<HomeProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          <CardGrid size="l">
            {posts.map((post) => (
              <ContentCard
                key={post.id}
                onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.POST_DETAIL}/${post.id}`)}
                caption={
                  post.status === 'published' ? '✅ Опубликовано' :
                  post.status === 'pending' ? '⏳ На модерации' :
                  post.status === 'rejected' ? '❌ Отклонено' :
                  post.status === 'draft' ? '📝 Черновик' :
                  post.status
                }
                title={post.title}
                description={post.message}
                maxHeight={250}
              />
            ))}
          </CardGrid>
        )}
      </Group>
    </Panel>
  );
};
