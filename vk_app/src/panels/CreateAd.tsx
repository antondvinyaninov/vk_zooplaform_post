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
  IconButton,
} from '@vkontakte/vkui';
import { Icon24Camera, Icon28CancelCircleFillRed, Icon28VideoOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import bridge from '@vkontakte/vk-bridge';
import { createPost } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export const CreatePost: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    if (files.length + newFiles.length > 10) {
      alert('Можно прикрепить не более 10 файлов');
      return;
    }
    setFiles((prev) => [...prev, ...newFiles]);
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

      await createPost(text, files);
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
                {files.map((file, index) => (
                  <div key={index} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                    {file.type.startsWith('image/') ? (
                      <Image 
                        src={URL.createObjectURL(file)} 
                        size={80} 
                        style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e1e3e6' }} 
                      />
                    ) : (
                      <div style={{ 
                        width: 80, height: 80, backgroundColor: '#f0f0f0', 
                        borderRadius: 8, display: 'flex', flexDirection: 'column', 
                        alignItems: 'center', justifyContent: 'center', border: '1px solid #e1e3e6'
                      }}>
                        <Icon28VideoOutline width={32} height={32} style={{ color: '#818c99' }} />
                        <span style={{ fontSize: 10, marginTop: 4, textAlign: 'center', width: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#818c99' }}>
                          {file.name}
                        </span>
                      </div>
                    )}
                    <IconButton 
                      onClick={() => removeFile(index)}
                      style={{ 
                        position: 'absolute', top: -12, right: -12, 
                        background: 'white', borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      disabled={isSubmitting}
                    >
                      <Icon28CancelCircleFillRed />
                    </IconButton>
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
