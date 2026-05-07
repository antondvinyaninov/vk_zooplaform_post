import { FC, useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  FormItem,
  Input,
  Button,
  Textarea,
  Group,
  Header,
  Div,
  NavIdProps,
  Snackbar,
} from '@vkontakte/vkui';
import { Icon28CheckCircleOutline, Icon28ErrorCircleOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { loadPostByLink, publishPostByLink } from '../shared/api';

export const PostByLink: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [link, setLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [editedText, setEditedText] = useState('');
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);

  const handleLoad = async () => {
    if (!link.trim()) return;
    setIsLoading(true);
    try {
      const data = await loadPostByLink(link);
      setPreview(data.post);
      setEditedText(data.post.text);
    } catch (e: any) {
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          onClosed={() => setSnackbar(null)}
          before={<Icon28ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />}
        >
          {e.message || 'Ошибка загрузки поста'}
        </Snackbar>
      );
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!preview) return;
    setIsPublishing(true);
    try {
      await publishPostByLink(editedText, preview.attachments);
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          onClosed={() => setSnackbar(null)}
          before={<Icon28CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
        >
          Успешно опубликовано!
        </Snackbar>
      );
      setLink('');
      setPreview(null);
      setEditedText('');
    } catch (e: any) {
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          onClosed={() => setSnackbar(null)}
          before={<Icon28ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />}
        >
          {e.message || 'Ошибка публикации'}
        </Snackbar>
      );
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader
        before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}
      >
        Пост по ссылке
      </PanelHeader>

      <Group>
        <FormItem top="Ссылка на пост ВКонтакте">
          <Input 
            type="text" 
            placeholder="https://vk.com/wall-123_456" 
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </FormItem>
        <Div>
          <Button 
            size="l" 
            stretched 
            onClick={handleLoad} 
            loading={isLoading} 
            disabled={!link.trim()}
          >
            Загрузить пост
          </Button>
        </Div>
      </Group>

      {preview && (
        <Group header={<Header>Предпросмотр поста</Header>}>
          <FormItem top="Текст (можно редактировать)">
            <Textarea 
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              getRef={(textarea) => {
                if (textarea) {
                  textarea.style.height = 'auto';
                  textarea.style.height = `${textarea.scrollHeight}px`;
                }
              }}
            />
          </FormItem>

          {preview.preview && preview.preview.length > 0 && (
            <FormItem top={`Вложения (${preview.preview.length})`}>
              <Div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 0 }}>
                {preview.preview.map((att: any, idx: number) => (
                  <div key={idx} style={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: 8, 
                    overflow: 'hidden', 
                    backgroundColor: 'var(--vkui--color_background_secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {att.type === 'photo' && (
                      <img src={att.url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {att.type === 'video' && (
                      <div style={{ color: 'var(--vkui--color_text_subhead)', fontSize: 12 }}>Видео</div>
                    )}
                  </div>
                ))}
              </Div>
            </FormItem>
          )}

          <Div>
            <Button 
              size="l" 
              stretched 
              mode="primary"
              onClick={handlePublish}
              loading={isPublishing}
            >
              Опубликовать от имени группы
            </Button>
          </Div>
        </Group>
      )}

      {snackbar}
    </Panel>
  );
};
