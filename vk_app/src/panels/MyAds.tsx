import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
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
import { getMyPosts } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export const MyPosts: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const data = await getMyPosts();
        setPosts(data);
      } catch (error) {
        console.error('Failed to fetch my posts:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  return (
    <Panel id={id}>
      <PanelHeader style={{ textAlign: 'center' }}>
        Мои публикации
      </PanelHeader>

      {loading ? (
        <PanelSpinner size="l" />
      ) : posts.length === 0 ? (
        <Placeholder
          icon={<Icon56ArticleOutline />}
          title="У вас пока нет публикаций"
          action={
            <Button size="m" onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.CREATE_POST}`)}>
              Создать публикацию
            </Button>
          }
        >
          Здесь будут отображаться ваши публикации для сообщества.
        </Placeholder>
      ) : (
        <Group>
          <CardGrid size="l">
            {posts.map((post) => (
              <ContentCard
                key={post.id}
                onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.POST_DETAIL}/${post.id}`)}
                caption={post.status}
                title={post.title}
                description={post.message}
                maxHeight={250}
              />
            ))}
          </CardGrid>
        </Group>
      )}
    </Panel>
  );
};

export default MyPosts;
