import { FC, useState } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  FormItem,
  Textarea,
  Button,
  Div,
  NavIdProps,
  File as VKFile,
  HorizontalScroll,
  Image,
} from '@vkontakte/vkui';
import { Icon24Camera, Icon28CancelCircleFillRed, Icon28VideoOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import bridge from '@vkontakte/vk-bridge';
import { createPost, getS3PresignedUrl, uploadMediaToS3, compressImage } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export const CreatePost: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<{ file: File, thumbnail?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      
      video.onloadeddata = () => {
        video.currentTime = 1; // 1 second
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg'));
        } else {
          resolve('');
        }
      };
      
      video.onerror = () => {
        resolve('');
      };
    });
  };



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFilesList = Array.from(e.target.files);
    if (files.length + newFilesList.length > 10) {
      alert('Можно прикрепить не более 10 файлов');
      return;
    }

    const items = newFilesList.map(file => ({ file }));
    setFiles((prev) => [...prev, ...items]);

    // Async load thumbnails for videos
    items.forEach(async (item) => {
      const isVideo = item.file.type.startsWith('video/') || 
                     item.file.name.toLowerCase().endsWith('.mp4') || 
                     item.file.name.toLowerCase().endsWith('.mov') || 
                     item.file.name.toLowerCase().endsWith('.qt');
                     
      if (isVideo) {
        const thumb = await getVideoThumbnail(item.file);
        if (thumb) {
          setFiles(prev => prev.map(p => p.file === item.file ? { ...p, thumbnail: thumb } : p));
        }
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!text || text.length < 10) {
      alert('Минимальная длина текста — 10 символов');
      return;
    }

    setIsSubmitting(true);
    try {
      try {
        bridge.send('VKWebAppAllowMessagesFromGroup', {
          group_id: 165434330,
          key: 'post_status_updates'
        }).catch(() => {});
      } catch (e) {
        // Игнорируем ошибки
      }

      const s3MediaKeys: string[] = [];

      for (const item of files) {
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
        await uploadMediaToS3(fileToUpload, upload_url);
        s3MediaKeys.push(key);
      }

      await createPost(text, s3MediaKeys, []);
      routeNavigator.push(`/${DEFAULT_VIEW_PANELS.HOME}`);
    } catch (error: any) {
      alert(`Ошибка при сохранении: ${error?.message || String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader style={{ textAlign: 'center' }}>
        Создать публикацию
      </PanelHeader>

      <Group>
        <FormItem 
          top="Текст публикации" 
          status={text.length >= 10 ? 'valid' : 'default'}
          bottom={text.length >= 10 ? '' : 'Минимум 10 символов для публикации'}
        >
          <Textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="Напишите здесь всё, что считаете нужным..."
            rows={8}
            disabled={isSubmitting}
          />
        </FormItem>

        <FormItem>
          <VKFile 
            multiple 
            accept="image/*,video/*" 
            onChange={handleFileChange} 
            mode="secondary"
            before={<Icon24Camera />}
            size="m"
            disabled={files.length >= 10 || isSubmitting}
          >
            Прикрепить фото/видео ({files.length}/10)
          </VKFile>
        </FormItem>

        {files.length > 0 && (
          <FormItem>
            <HorizontalScroll showArrows getScrollToLeft={(i) => i - 120} getScrollToRight={(i) => i + 120}>
              <div style={{ display: 'flex', gap: 12, padding: '8px 16px' }}>
                {files.map((item, index) => (
                  <div key={index} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
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
                          display: 'flex', alignItems: 'center', justifyContent: 'center' 
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
                        <Icon28VideoOutline width={32} height={32} style={{ color: '#818c99' }} />
                        <span style={{ fontSize: 10, marginTop: 4, textAlign: 'center', width: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#818c99' }}>
                          {item.file.name}
                        </span>
                      </div>
                    )}
                    <div 
                      onClick={() => !isSubmitting && removeFile(index)}
                      style={{ 
                        position: 'absolute', top: -6, right: -6, 
                        width: 24, height: 24,
                        background: 'white', borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: isSubmitting ? 'default' : 'pointer',
                        zIndex: 2
                      }}
                    >
                      <Icon28CancelCircleFillRed width={28} height={28} />
                    </div>
                  </div>
                ))}
              </div>
            </HorizontalScroll>
          </FormItem>
        )}

        <Div>
          <Button 
            size="l" 
            stretched 
            disabled={text.length < 10 || isSubmitting}
            loading={isSubmitting}
            onClick={handlePublish}
          >
            Отправить на модерацию
          </Button>
        </Div>
      </Group>
    </Panel>
  );
};

export default CreatePost;
