import { FC, useState } from 'react';
import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderClose,
  PanelHeaderSubmit,
  Group,
  FormItem,
  Radio,
  DateInput,
  Div,
  Button,
} from '@vkontakte/vkui';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { moderatePost } from '../shared/api';

interface ModerationModalProps {
  id: string;
  onConfirm?: (postId: number, pubType: string, date?: Date) => void;
}

export const ModerationModal: FC<ModerationModalProps> = ({ id, onConfirm }) => {
  const params = useParams<'id'>();
  const routeNavigator = useRouteNavigator();
  const [pubType, setPubType] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return d;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeModal = () => routeNavigator.hideModal();

  const handleConfirm = async () => {
    if (params?.id && !isSubmitting) {
      setIsSubmitting(true);
      const postId = Number(params.id);
      try {
        await moderatePost(postId, pubType === 'scheduled' ? 'scheduled' : 'published', pubType === 'scheduled' ? scheduledDate : undefined);
        
        if (onConfirm) {
          onConfirm(postId, pubType, pubType === 'scheduled' ? scheduledDate : undefined);
        }
        
        window.dispatchEvent(new CustomEvent('postModerated', { detail: { postId } }));
        
        closeModal();
      } catch (error) {
        console.error('Failed to moderate post:', error);
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
          after={<PanelHeaderSubmit onClick={handleConfirm} />}
        >
          Настройка публикации
        </ModalPageHeader>
      }
    >
      <Group>
        <FormItem top="Время публикации">
          <Radio 
            name="pubType" 
            value="now" 
            checked={pubType === 'now'}
            onChange={() => setPubType('now')}
          >
            Опубликовать сейчас
          </Radio>
          <Radio 
            name="pubType" 
            value="scheduled"
            checked={pubType === 'scheduled'}
            onChange={() => setPubType('scheduled')}
          >
            Запланировать на дату
          </Radio>
        </FormItem>

        {pubType === 'scheduled' && (
          <FormItem top="Выберите дату и время">
            <DateInput
              enableTime
              value={scheduledDate}
              onChange={(d) => d && setScheduledDate(d)}
              disablePast
              closeOnChange={false}
            />
          </FormItem>
        )}

        <Div>
          <Button size="l" stretched onClick={handleConfirm} disabled={isSubmitting} loading={isSubmitting}>
            {pubType === 'now' ? 'Опубликовать сейчас' : 'Подтвердить график'}
          </Button>
        </Div>
      </Group>
    </ModalPage>
  );
};

export default ModerationModal;
