import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Header,
  InfoRow,
  SimpleCell,
  PanelSpinner,
  Placeholder,
  Button,
  NavIdProps,
  Div,
  Text,
  Title,
  Avatar,
} from '@vkontakte/vkui';
import { 
  Icon28CalendarOutline,
  Icon28NewsfeedOutline,
  Icon56ErrorOutline
} from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { getPostById } from '../shared/api';

export const AdDetail: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      if (params?.id) {
        setLoading(true);
        const data = await getPostById(params.id);
        setPost(data);
        setLoading(false);
      }
    }
    fetchDetail();
  }, [params?.id]);

  if (loading) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />} style={{ textAlign: 'center' }}>
          Загрузка...
        </PanelHeader>
        <PanelSpinner size="l" />
      </Panel>
    );
  }

  if (!post) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />} style={{ textAlign: 'center' }}>
          Ошибка
        </PanelHeader>
        <Placeholder
          icon={<Icon56ErrorOutline />}
          title="Публикация не найдена"
          action={<Button size="m" onClick={() => routeNavigator.back()}>Вернуться назад</Button>}
        >
          Возможно, запись была удалена или ссылка неверна.
        </Placeholder>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />} style={{ textAlign: 'center' }}>
        Публикация
      </PanelHeader>

      <Group>
        <Div>
          <Title level="1" weight="2" style={{ marginBottom: 8 }}>
            {post.title}
          </Title>
          <Text weight="3" style={{ color: 'var(--vkui--color_text_accent)' }}>
            Статус: {post.status}
          </Text>
        </Div>

        <Div>
          <Text style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
            {post.message}
          </Text>
        </Div>
      </Group>

      <Group header={<Header>Информация</Header>}>
        <SimpleCell before={<Icon28CalendarOutline />}>
          <InfoRow header="Создано">
            {new Date(post.created_at).toLocaleDateString('ru-RU', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </InfoRow>
        </SimpleCell>
        {post.group && (
          <SimpleCell before={<Icon28NewsfeedOutline />}>
            <InfoRow header="Сообщество">
              {post.group.name}
            </InfoRow>
          </SimpleCell>
        )}
      </Group>

      {post.author && (
        <Group header={<Header>Автор публикации</Header>}>
          <SimpleCell
            before={<Avatar src={post.author.photo_200} size={48} />}
            subtitle="Написать автору"
            after={
              <Button 
                mode="tertiary" 
                onClick={() => window.open(`https://vk.com/id${post.author.vk_user_id}`, '_blank')}
              >
                Профиль
              </Button>
            }
          >
            {post.author.first_name} {post.author.last_name}
          </SimpleCell>
        </Group>
      )}
    </Panel>
  );
};

export default AdDetail;
