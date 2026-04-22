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
  Icon28PlaceOutline,
  Icon56ErrorOutline
} from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { getAdById } from '../shared/api';

export const AdDetail: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams();
  const [ad, setAd] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      if (params?.id) {
        setLoading(true);
        const data = await getAdById(params.id);
        setAd(data);
        setLoading(false);
      }
    }
    fetchDetail();
  }, [params?.id]);

  if (loading) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
          Загрузка...
        </PanelHeader>
        <PanelSpinner size="l" />
      </Panel>
    );
  }

  if (!ad) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
          Ошибка
        </PanelHeader>
        <Placeholder
          icon={<Icon56ErrorOutline />}
          title="Объявление не найдено"
          action={<Button size="m" onClick={() => routeNavigator.back()}>Вернуться назад</Button>}
        >
          Возможно, оно было удалено автором или ссылка неверна.
        </Placeholder>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Объявление
      </PanelHeader>

      {ad.photoUrl && (
        <Group>
          <img 
            src={ad.photoUrl} 
            alt={ad.title} 
            style={{ 
              width: '100%', 
              display: 'block',
              maxHeight: 400,
              objectFit: 'cover'
            }} 
          />
        </Group>
      )}

      <Group>
        <Div>
          <Title level="1" weight="2" style={{ marginBottom: 8 }}>
            {ad.title}
          </Title>
          <Text weight="3" style={{ color: ad.type === 'LOST' ? 'var(--vkui--color_text_negative)' : 'var(--vkui--color_text_accent)' }}>
            {ad.type === 'LOST' ? '🔴 ПРОПАЛ ПИТОМЕЦ' : ad.type === 'FOUND' ? '🟢 НАЙДЕН ПИТОМЕЦ' : '🔵 ПРИСТРОЙСТВО'}
          </Text>
        </Div>

        <Div>
          <Text style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
            {ad.description}
          </Text>
        </Div>
      </Group>

      <Group header={<Header>Информация</Header>}>
        <SimpleCell before={<Icon28CalendarOutline />}>
          <InfoRow header="Дата публикации">
            {new Date(ad.createdAt).toLocaleDateString('ru-RU', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </InfoRow>
        </SimpleCell>
        {ad.cityTitle && (
          <SimpleCell before={<Icon28PlaceOutline />}>
            <InfoRow header="Местоположение">
              {ad.cityTitle}
            </InfoRow>
          </SimpleCell>
        )}
      </Group>

      {ad.users && (
        <Group header={<Header>Автор объявления</Header>}>
          <SimpleCell
            before={<Avatar src={ad.users.avatar} size={48} />}
            subtitle="Написать автору"
            after={
              <Button 
                mode="tertiary" 
                onClick={() => window.open(`https://vk.com/id${ad.users.vk_id}`, '_blank')}
              >
                Профиль
              </Button>
            }
          >
            {ad.users.name} {ad.users.lastName}
          </SimpleCell>
        </Group>
      )}
    </Panel>
  );
};

export default AdDetail;
