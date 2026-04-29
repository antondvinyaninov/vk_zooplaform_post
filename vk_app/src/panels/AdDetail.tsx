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
          <Text weight="3" style={{ color: 'var(--vkui--color_text_accent)', marginBottom: 12 }}>
            Статус: {
              post.status === 'published' ? '✅ Опубликовано' :
              post.status === 'pending' ? '⏳ На модерации' :
              post.status === 'rejected' ? '❌ Отклонено' :
              post.status === 'draft' ? '📝 Черновик' :
              post.status
            }
          </Text>
          <Text style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
            {post.message}
          </Text>
          
          {post.attachment_urls && post.attachment_urls.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {post.attachment_urls.map((attachment: any, index: number) => {
                const isS3Video = attachment.type === 's3_video' || attachment.url.includes('.mp4') || attachment.url.includes('.mov');
                const isVKVideo = attachment.type === 'vk_video' || attachment.type === 'video';

                if (isS3Video) {
                  return (
                    <video 
                      key={index} 
                      src={attachment.url} 
                      controls 
                      playsInline
                      style={{ width: '100%', borderRadius: 8, objectFit: 'cover', border: '1px solid #e1e3e6' }} 
                    />
                  );
                } else if (isVKVideo) {
                  let iframeSrc = '';
                  if (attachment.url.startsWith('video')) {
                    const parts = attachment.url.replace('video', '').split('_');
                    const oid = parts[0];
                    const vid = parts[1];
                    const hash = parts[2] ? `&hash=${parts[2]}` : '';
                    iframeSrc = `https://vk.com/video_ext.php?oid=${oid}&id=${vid}${hash}&hd=2`;
                  }
                  
                  return (
                    <iframe 
                      key={index} 
                      src={iframeSrc} 
                      width="100%" 
                      height="250" 
                      frameBorder="0" 
                      allowFullScreen 
                      style={{borderRadius: 8, border: '1px solid #e1e3e6', display: 'block'}}
                    ></iframe>
                  );
                } else {
                  return (
                    <img 
                      key={index} 
                      src={attachment.url} 
                      alt={`Фото ${index + 1}`}
                      style={{ width: '100%', borderRadius: 8, objectFit: 'cover', border: '1px solid #e1e3e6' }} 
                    />
                  );
                }
              })}
            </div>
          )}
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
