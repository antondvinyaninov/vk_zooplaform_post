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
  File as VKFile,
  HorizontalScroll,
  Image,
} from '@vkontakte/vkui';
import { 
  Icon28CalendarOutline,
  Icon28NewsfeedOutline,
  Icon56ErrorOutline,
  Icon24CheckCircleOutline,
  Icon24CancelOutline,
  Icon24Camera,
  Icon28VideoOutline,
  Icon24Dismiss,
  Icon24WriteOutline
} from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { getPostById, moderatePost, editPost, compressImage, getS3PresignedUrl, uploadMediaToS3, suggestExistingPost } from '../shared/api';

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
  const [editFiles, setEditFiles] = useState<Array<{file: File, thumbnail?: string}>>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    
    if (editFiles.length + existingAttachments.length + newFiles.length > 10) {
      alert('Можно прикрепить не более 10 медиафайлов');
      return;
    }

    const processedFiles = newFiles.map((file) => {
      return { file, thumbnail: undefined };
    });

    setEditFiles(prev => [...prev, ...processedFiles]);
  };

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

  const launchParams = (window as any).vkLaunchParams || {};
  const currentVkGroupId = Number(launchParams.vk_group_id);
  const isAuthor = post.author && launchParams.vk_user_id && post.author.vk_user_id === Number(launchParams.vk_user_id);
  const currentPub = post.publications?.find((p: any) => p.group?.vk_group_id === currentVkGroupId);
  const role = launchParams.vk_viewer_group_role;
  const isModerator = ['admin', 'editor', 'moder'].includes(role || '');
  const canEdit = (isModerator || isAuthor) && currentPub && (currentPub.status === 'pending' || currentPub.status === 'draft' || currentPub.status === 'rejected');

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />} style={{ textAlign: 'center' }}>
        Публикация
      </PanelHeader>

      <Group>
        <Div>
          {(() => {
            return (
              <>
                <Text weight="3" style={{ color: 'var(--vkui--color_text_accent)', marginBottom: 12 }}>
                  Статус: {(() => {
                    if (!currentPub) return 'Не предложено в эту группу';
                    if (currentPub.status === 'published') return '✅ Опубликовано';
                    if (currentPub.status === 'pending') return '⏳ На модерации';
                    if (currentPub.status === 'rejected') return '❌ Отклонено';
                    if (currentPub.status === 'draft') return '📝 Черновик';
                    if (currentPub.status === 'scheduled') {
                      if (currentPub.publish_date && new Date(currentPub.publish_date).getTime() <= Date.now()) {
                        return '✅ Опубликовано (отложенный)';
                      }
                      const dateStr = currentPub.publish_date 
                        ? new Date(currentPub.publish_date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '';
                      return `📅 Отложено на ${dateStr}`;
                    }
                    return currentPub.status;
                  })()}
                </Text>

                {!currentPub && isAuthor && currentVkGroupId > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <Button 
                      size="m" 
                      onClick={async () => {
                        try {
                          setIsSubmitting(true);
                          await suggestExistingPost(post.id);
                          const data = await getPostById(params!.id!);
                          setPost(data);
                        } catch(e: any) {
                          alert("Ошибка: " + e.message);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      loading={isSubmitting}
                      stretched
                    >
                      Предложить в текущую группу
                    </Button>
                  </div>
                )}

                {currentPub?.status === 'rejected' && currentPub.reject_reason && (
                  <div style={{ marginBottom: 16, padding: '12px', backgroundColor: 'var(--vkui--color_background_negative_tint)', color: 'var(--vkui--color_text_negative)', borderRadius: 8 }}>
                    <Text weight="3" style={{ marginBottom: 4 }}>Причина отклонения:</Text>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{currentPub.reject_reason}</Text>
                  </div>
                )}

                {currentPub?.vk_post_id && currentPub.group?.vk_group_id && (
                  <div style={{ marginBottom: 12 }}>
                    <Button 
                      size="s" 
                      mode="secondary" 
                      onClick={() => window.open(`https://vk.com/wall-${currentPub.group.vk_group_id}_${currentPub.vk_post_id}`, '_blank')}
                    >
                      Открыть ВКонтакте
                    </Button>
                  </div>
                )}

                {post.publications && post.publications.length > 0 && (
                  <div style={{ marginBottom: 16, padding: '12px', backgroundColor: 'var(--vkui--color_background_secondary)', borderRadius: 8 }}>
                    <Text weight="3" style={{ marginBottom: 8 }}>Где опубликовано/предложено:</Text>
                    {post.publications.map((pub: any) => (
                      <div 
                        key={pub.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          marginBottom: 6,
                          cursor: pub.vk_post_id ? 'pointer' : 'default',
                          padding: '4px',
                          borderRadius: '6px',
                          transition: 'background-color 0.2s',
                        }}
                        onClick={() => {
                          if (pub.vk_post_id && pub.group?.vk_group_id) {
                            window.open(`https://vk.com/wall-${pub.group.vk_group_id}_${pub.vk_post_id}`, '_blank');
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (pub.vk_post_id) e.currentTarget.style.backgroundColor = 'var(--vkui--color_background_hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (pub.vk_post_id) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Avatar size={24} src={pub.group?.photo_200} style={{ marginRight: 8 }} />
                        <Text style={{ flex: 1, fontSize: 13, color: pub.vk_post_id ? 'var(--vkui--color_text_link)' : 'inherit' }}>
                          {pub.group?.name || 'Группа ' + pub.group_id}
                        </Text>
                        <Text style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>
                          {pub.status === 'published' ? '✅ Опубликовано' : pub.status === 'pending' ? '⏳ Модерация' : pub.status === 'rejected' ? '❌ Отклонено' : pub.status}
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
          {(() => {
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
                  
                  <div style={{ marginTop: 12 }}>
                    <VKFile 
                      multiple 
                      accept="image/*,video/*" 
                      onChange={handleFileChange} 
                      mode="secondary"
                      before={<Icon24Camera />}
                      size="s"
                      disabled={editFiles.length + existingAttachments.length >= 10 || isSaving}
                    >
                      Прикрепить фото/видео ({editFiles.length + existingAttachments.length}/10)
                    </VKFile>
                  </div>

                  {(existingAttachments.length > 0 || editFiles.length > 0) && (
                    <div style={{ marginTop: 12 }}>
                      <HorizontalScroll showArrows getScrollToLeft={(i) => i - 120} getScrollToRight={(i) => i + 120}>
                        <div style={{ display: 'flex', gap: 12, padding: '8px 4px' }}>
                          
                          {existingAttachments.map((att, index) => (
                            <div key={`exist_${index}`} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                              <Image 
                                src={att.url} 
                                size={80} 
                                style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e1e3e6' }} 
                              />
                              {(att.type === 'vk_video' || att.type === 'video' || att.type === 's3_video') && (
                                <div style={{ 
                                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                                  backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, 
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                                }}>
                                  <Icon28VideoOutline width={32} height={32} style={{ color: 'white' }} />
                                </div>
                              )}
                              <div 
                                onClick={() => setExistingAttachments(prev => prev.filter((_, i) => i !== index))}
                                style={{
                                  position: 'absolute', top: -8, right: -8, width: 24, height: 24, 
                                  backgroundColor: 'white', borderRadius: '50%', display: 'flex', 
                                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                              >
                                <Icon24Dismiss width={16} height={16} style={{ color: 'var(--vkui--color_icon_negative)' }} />
                              </div>
                            </div>
                          ))}

                          {editFiles.map((item, index) => (
                            <div key={`new_${index}`} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                              {item.file.type.startsWith('image/') ? (
                                <Image 
                                  src={URL.createObjectURL(item.file)} 
                                  size={80} 
                                  style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e1e3e6' }} 
                                />
                              ) : item.thumbnail ? (
                                <div style={{ position: 'relative', width: 80, height: 80 }}>
                                  <Image 
                                    src={item.thumbnail} 
                                    size={80} 
                                    style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e1e3e6' }} 
                                  />
                                  <div style={{ 
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                                    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
                                  }}>
                                    <Icon28VideoOutline width={32} height={32} style={{ color: 'white' }} />
                                  </div>
                                </div>
                              ) : (
                                <div style={{ 
                                  width: 80, height: 80, backgroundColor: '#f0f0f0', 
                                  borderRadius: 8, display: 'flex', flexDirection: 'column', 
                                  alignItems: 'center', justifyContent: 'center', border: '1px solid #e1e3e6'
                                }}>
                                  <Icon28VideoOutline style={{ color: '#99a2ad' }} />
                                  <Text style={{ fontSize: 10, color: '#99a2ad', marginTop: 4 }}>Видео</Text>
                                </div>
                              )}
                              <div 
                                onClick={() => setEditFiles(prev => prev.filter((_, i) => i !== index))}
                                style={{
                                  position: 'absolute', top: -8, right: -8, width: 24, height: 24, 
                                  backgroundColor: 'white', borderRadius: '50%', display: 'flex', 
                                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                              >
                                <Icon24Dismiss width={16} height={16} style={{ color: 'var(--vkui--color_icon_negative)' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </HorizontalScroll>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Button 
                      size="s" 
                      loading={isSaving}
                      onClick={async () => {
                        try {
                          setIsSaving(true);
                          
                          const newS3MediaKeys: string[] = [];
                          for (const item of editFiles) {
                            const isVideo = item.file.type.startsWith('video/') || 
                                          item.file.name.toLowerCase().endsWith('.mp4') || 
                                          item.file.name.toLowerCase().endsWith('.mov') || 
                                          item.file.name.toLowerCase().endsWith('.qt');
                                          
                            let fileToUpload = item.file;
                            let fileType = item.file.type;
                            
                            if (!isVideo) {
                              fileToUpload = await compressImage(item.file);
                              fileType = fileToUpload.type || 'image/jpeg';
                            }
                            
                            const { upload_url, key } = await getS3PresignedUrl(fileToUpload.name, fileType);
                            await uploadMediaToS3(fileToUpload, upload_url, fileType);
                            newS3MediaKeys.push(key);
                          }

                          const existingS3Keys = existingAttachments.filter(a => a.id.startsWith('s3:')).map(a => a.id.replace('s3:', ''));
                          const existingVKAttachments = existingAttachments.filter(a => !a.id.startsWith('s3:')).map(a => a.id).join(',');
                          const allS3Keys = [...existingS3Keys, ...newS3MediaKeys];

                          await editPost(post.id, editMessage, allS3Keys, existingVKAttachments);
                          
                          const data = await getPostById(post.id);
                          setPost(data);
                          setIsEditing(false);
                          
                        } catch (error) {
                          console.error('Failed to edit post:', error);
                          alert('Ошибка при сохранении: ' + String(error));
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
                      setExistingAttachments(post.attachment_urls || []);
                      setEditFiles([]);
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

      {currentPub?.status === 'pending' && (() => {
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
                          const data = await getPostById(params!.id!);
                          setPost(data);
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
