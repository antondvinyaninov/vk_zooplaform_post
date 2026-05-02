import { FC, useState } from 'react';
import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderClose,
  PanelHeaderSubmit,
  Group,
  FormItem,
  Radio,
  Textarea,
  Div,
  Button,
} from '@vkontakte/vkui';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { deletePost } from '../shared/api';

interface DeletePostModalProps {
  id: string;
  onConfirm?: (postId: number) => void;
}

export const DeletePostModal: FC<DeletePostModalProps> = ({ id, onConfirm }) => {
  const params = useParams<'id'>();
  const routeNavigator = useRouteNavigator();
  const [reason, setReason] = useState<string>('Животное пристроено');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeModal = () => routeNavigator.hideModal();

  const handleConfirm = async () => {
    if (params?.id && !isSubmitting) {
      if (reason === 'Другое' && !comment.trim()) {
        alert('Пожалуйста, напишите комментарий, почему вы удаляете пост');
        return;
      }

      setIsSubmitting(true);
      const postId = Number(params.id);
      try {
        await deletePost(postId, reason, comment);
        
        if (onConfirm) {
          onConfirm(postId);
        }
        
        window.dispatchEvent(new CustomEvent('postDeleted', { detail: { postId } }));
        
        closeModal();
      } catch (error) {
        console.error('Failed to delete post:', error);
        alert('Ошибка при удалении поста');
        setIsSubmitting(false);
      }
    }
  };

  return (
    <ModalPage
      id={id}
      onClose={closeModal}
      header={
        <ModalPageHeader
          before={<PanelHeaderClose onClick={closeModal} />}
          after={<PanelHeaderSubmit onClick={handleConfirm} disabled={isSubmitting} />}
        >
          Удаление публикации
        </ModalPageHeader>
      }
    >
      <Group>
        <FormItem top="Выберите причину удаления">
          <Radio 
            name="deleteReason" 
            value="Животное пристроено" 
            checked={reason === 'Животное пристроено'}
            onChange={() => setReason('Животное пристроено')}
          >
            Животное пристроено
          </Radio>
          <Radio 
            name="deleteReason" 
            value="Вопрос решен"
            checked={reason === 'Вопрос решен'}
            onChange={() => setReason('Вопрос решен')}
          >
            Вопрос решен
          </Radio>
          <Radio 
            name="deleteReason" 
            value="Неактуально"
            checked={reason === 'Неактуально'}
            onChange={() => setReason('Неактуально')}
          >
            Неактуально
          </Radio>
          <Radio 
            name="deleteReason" 
            value="Другое"
            checked={reason === 'Другое'}
            onChange={() => setReason('Другое')}
          >
            Другое
          </Radio>
        </FormItem>

        <FormItem top="Комментарий (по желанию)">
          <Textarea
            placeholder="Напишите комментарий..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </FormItem>

        <Div>
          <Button 
            size="l" 
            mode="primary" 
            appearance="negative" 
            stretched 
            loading={isSubmitting}
            onClick={handleConfirm}
          >
            Удалить публикацию
          </Button>
        </Div>
      </Group>
    </ModalPage>
  );
};
