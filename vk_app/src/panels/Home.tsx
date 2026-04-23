import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
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
import { getFeedPosts } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export interface HomeProps extends NavIdProps {}

export const Home: FC<HomeProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const data = await getFeedPosts();
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

      <Group>
        <SimpleCell
          before={<Icon28UserOutline />}
          onClick={() => routeNavigator.push('/profile')}
        >
          Мой профиль
        </SimpleCell>
        <SimpleCell
          before={<Icon28ListOutline />}
          onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.MY_POSTS}`)}
        >
          Мои публикации
        </SimpleCell>
      </Group>

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
        ) : (
          <CardGrid size="l">
            {posts.map((post) => (
              <ContentCard
                key={post.id}
                onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.POST_DETAIL}/${post.id}`)}
                caption={post.group?.name || 'Публикация сообщества'}
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
