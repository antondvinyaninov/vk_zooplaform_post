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
  Gallery,
  Textarea,
} from '@vkontakte/vkui';
import { 
  Icon28CalendarOutline,
  Icon28NewsfeedOutline,
  Icon56ErrorOutline,
  Icon24CheckCircleOutline,
  Icon24CancelOutline,
  Icon24WriteOutline
} from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { getPostById, moderatePost, editPost } from '../shared/api';

export const AdDetail: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            Статус: {(() => {
              if (post.status === 'published') return '✅ Опубликовано';
              if (post.status === 'pending') return '⏳ На модерации';
              if (post.status === 'rejected') return '❌ Отклонено';
              if (post.status === 'draft') return '📝 Черновик';
              if (post.status === 'scheduled') {
                if (post.publish_date && new Date(post.publish_date).getTime() <= Date.now()) {
                  return '✅ Опубликовано (отложенный)';
                }
                const dateStr = post.publish_date 
                  ? new Date(post.publish_date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : '';
                return `📅 Отложено на ${dateStr}`;
              }
              return post.status;
            })()}
          </Text>

          {post.status === 'rejected' && post.reject_reason && (
            <div style={{ marginBottom: 16, padding: '12px', backgroundColor: 'var(--vkui--color_background_negative_tint)', color: 'var(--vkui--color_text_negative)', borderRadius: 8 }}>
              <Text weight="3" style={{ marginBottom: 4 }}>Причина отклонения:</Text>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{post.reject_reason}</Text>
            </div>
          )}

          {post.vk_post_id && post.group?.vk_group_id && (
            <div style={{ marginBottom: 12 }}>
              <Button 
                size="s" 
                mode="secondary" 
                onClick={() => window.open(`https://vk.com/wall-${post.group.vk_group_id}_${post.vk_post_id}`, '_blank')}
              >
                Открыть ВКонтакте
              </Button>
            </div>
          )}
          {(() => {
            const launchParams = (window as any).vkLaunchParams || {};
            const role = launchParams.vk_viewer_group_role;
            const isModerator = ['admin', 'editor', 'moder'].includes(role || '');
            const isAuthor = post.author && launchParams.vk_user_id && post.author.vk_user_id === Number(launchParams.vk_user_id);
            const canEdit = (isModerator || isAuthor) && (post.status === 'pending' || post.status === 'draft' || post.status === 'rejected');

            if (isEditing) {
              return (
                <div style={{ marginTop: 12, marginBottom: 12 }}>
                  <Textarea 
                    getRef={(textarea) => {
                      if (textarea) {
                        textarea.style.height = 'auto';
                        textarea.style.height = `${textarea.scrollHeight}px`;
                      }
                    }}
                    value={editMessage} 
                    onChange={(e) => setEditMessage(e.target.value)} 
                    style={{ minHeight: 100 }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Button 
                      size="s" 
                      loading={isSaving}
                      onClick={async () => {
                        try {
                          setIsSaving(true);
                          await editPost(post.id, editMessage);
                          const updatedState = { ...post, message: editMessage };
                          if (post.status === 'rejected') {
                            updatedState.status = 'pending';
                            updatedState.reject_reason = '';
                          }
                          setPost(updatedState);
                          setIsEditing(false);
                        } catch (error) {
                          console.error('Failed to edit post:', error);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                    >
                      Сохранить
                    </Button>
                    <Button 
                      size="s" 
                      mode="secondary" 
                      disabled={isSaving}
                      onClick={() => setIsEditing(false)}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div style={{ position: 'relative' }}>
                <Text style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {post.message}
                </Text>
                {canEdit && (
                  <Button
                    size="s"
                    mode="tertiary"
                    before={<Icon24WriteOutline width={16} height={16} />}
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      setEditMessage(post.message);
                      setIsEditing(true);
                    }}
                  >
                    Редактировать текст
                  </Button>
                )}
              </div>
            );
          })()}
          
          {post.attachment_urls && post.attachment_urls.length > 0 && (
            <div style={{ marginTop: 16 }}>
              {post.attachment_urls.length === 1 ? (
                // Если одно вложение - выводим как раньше
                <div style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }}>
                  {(() => {
                    const attachment = post.attachment_urls[0];
                    const isS3Video = attachment.type === 's3_video' || attachment.url.includes('.mp4') || attachment.url.includes('.mov');
                    const isVKVideo = attachment.type === 'vk_video' || attachment.type === 'video';
                    
                    if (isS3Video) {
                      return (
                        <video 
                          src={attachment.url} 
                          controls 
                          playsInline
                          style={{ width: '100%', display: 'block', objectFit: 'cover' }} 
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
                          src={iframeSrc} 
                          width="100%" 
                          height="250" 
                          frameBorder="0" 
                          allowFullScreen 
                          style={{ display: 'block' }}
                        ></iframe>
                      );
                    } else {
                      return (
                        <img 
                          src={attachment.url} 
                          alt="Фото"
                          style={{ width: '100%', display: 'block', objectFit: 'cover' }} 
                        />
                      );
                    }
                  })()}
                </div>
              ) : (
                // Если вложений несколько - используем галерею
                <Gallery
                  slideWidth="100%"
                  bullets="dark"
                  showArrows
                  style={{ height: 350, borderRadius: 8, overflow: 'hidden', backgroundColor: 'var(--vkui--color_background_secondary)' }}
                >
                  {post.attachment_urls.map((attachment: any, index: number) => {
                    const isS3Video = attachment.type === 's3_video' || attachment.url.includes('.mp4') || attachment.url.includes('.mov');
                    const isVKVideo = attachment.type === 'vk_video' || attachment.type === 'video';

                    return (
                      <div key={index} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isS3Video ? (
                          <video 
                            src={attachment.url} 
                            controls 
                            playsInline
                            style={{ width: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                          />
                        ) : isVKVideo ? (
                          <iframe 
                            src={(() => {
                              if (attachment.url.startsWith('video')) {
                                const parts = attachment.url.replace('video', '').split('_');
                                return `https://vk.com/video_ext.php?oid=${parts[0]}&id=${parts[1]}${parts[2] ? `&hash=${parts[2]}` : ''}&hd=2`;
                              }
                              return '';
                            })()} 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            allowFullScreen 
                            style={{ border: 'none' }}
                          ></iframe>
                        ) : (
                          <img 
                            src={attachment.url} 
                            alt={`Медиа ${index + 1}`}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                          />
                        )}
                      </div>
                    );
                  })}
                </Gallery>
              )}
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

      {post.status === 'pending' && (() => {
        const launchParams = (window as any).vkLaunchParams || {};
        const role = launchParams.vk_viewer_group_role;
        const isModerator = ['admin', 'editor', 'moder'].includes(role || '');
        if (!isModerator) return null;

        return (
          <Group>
            <Div>
              {isRejecting ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Textarea 
                    placeholder="Укажите причину отклонения (необязательно)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button 
                      size="l" 
                      mode="primary" 
                      appearance="negative"
                      loading={isSubmitting}
                      onClick={async () => {
                        try {
                          setIsSubmitting(true);
                          await moderatePost(post.id, 'rejected', undefined, rejectReason);
                          setPost({ ...post, status: 'rejected', reject_reason: rejectReason });
                          window.dispatchEvent(new CustomEvent('postModerated', { detail: { postId: post.id } }));
                        } catch (e) {
                          console.error('Failed to reject:', e);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      stretched
                    >
                      Подтвердить отклонение
                    </Button>
                    <Button 
                      size="l" 
                      mode="secondary" 
                      disabled={isSubmitting}
                      onClick={() => setIsRejecting(false)}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button 
                    size="l" 
                    mode="primary" 
                    appearance="positive"
                    before={<Icon24CheckCircleOutline />}
                    onClick={() => routeNavigator.push(`/moderation/approve_settings/${post.id}`)}
                    stretched
                  >
                    Одобрить
                  </Button>
                  <Button 
                    size="l" 
                    mode="secondary" 
                    appearance="negative"
                    before={<Icon24CancelOutline />}
                    onClick={() => setIsRejecting(true)}
                    stretched
                  >
                    Отклонить
                  </Button>
                </div>
              )}
            </Div>
          </Group>
        );
      })()}

    </Panel>
  );
};

export default AdDetail;
