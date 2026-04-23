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
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { createPost } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export const CreatePost: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async () => {
    if (!text || text.length < 10) {
      alert('Минимальная длина текста — 10 символов');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPost(text);
      routeNavigator.push(`/${DEFAULT_VIEW_PANELS.MY_POSTS}`);
    } catch (error: any) {
      alert(`Ошибка при сохранении: ${error.message}`);
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
            rows={10}
            disabled={isSubmitting}
          />
        </FormItem>

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
