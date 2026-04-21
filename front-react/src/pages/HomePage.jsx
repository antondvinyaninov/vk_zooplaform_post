import { useState, useEffect } from 'react';
import {
  Group,
  FormItem,
  CustomSelect,
  CustomSelectOption,
  Textarea,
  Input,
  File,
  Button,
  Avatar,
  Card,
  Box,
  Title,
  Text,
} from '@vkontakte/vkui';
import { Icon16Done, Icon16Cancel } from '@vkontakte/icons';
import { getGroups, publishPost, getAccessToken, logout, getUserInfo } from '../api/api';

function HomePage() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [message, setMessage] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState('');
  const [notification, setNotification] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadGroups();
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    const name = localStorage.getItem('vk_user_name');
    const photo = localStorage.getItem('vk_user_photo');
    
    if (name && photo) {
      setUserName(name);
      setUserPhoto(photo);
      return;
    }
    
    // Если данных нет в localStorage, загружаем через наш API
    const userId = localStorage.getItem('vk_user_id');
    const token = getAccessToken();
    
    if (userId && token) {
      try {
        const data = await getUserInfo(userId);
        
        if (data.response && data.response[0]) {
          const user = data.response[0];
          const fullName = `${user.first_name} ${user.last_name}`;
          setUserName(fullName);
          setUserPhoto(user.photo_200);
          
          // Сохраняем в localStorage
          localStorage.setItem('vk_user_name', fullName);
          localStorage.setItem('vk_user_photo', user.photo_200);
        } else if (data.error) {
          console.error('VK API error:', data.error);
          // Показываем хотя бы "Пользователь" если не удалось загрузить
          setUserName('Пользователь');
        }
      } catch (error) {
        console.error('Error loading user info:', error);
        setUserName('Пользователь');
      }
    } else {
      setUserName('Пользователь');
    }
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const loadGroups = async () => {
    // Сначала пытаемся загрузить выбранные группы из localStorage
    const savedGroupsData = localStorage.getItem('vk_selected_groups_data');
    
    if (savedGroupsData) {
      try {
        const selectedGroupsData = JSON.parse(savedGroupsData);
        if (selectedGroupsData && selectedGroupsData.length > 0) {
          setGroups(selectedGroupsData);
          return;
        }
      } catch (error) {
        console.error('Error parsing saved groups:', error);
      }
    }
    
    // Если выбранных групп нет, загружаем все группы через API
    try {
      const data = await getGroups();
      if (data.items && Array.isArray(data.items)) {
        setGroups(data.items);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
    }
  };

  const handlePublish = async () => {
    if (!selectedGroup) {
      setNotification({ text: 'Выберите группу', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (!message && photos.length === 0 && !video) {
      setNotification({ text: 'Добавьте текст, фото или видео', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('access_token', getAccessToken());
      formData.append('owner_id', selectedGroup);
      formData.append('message', message);
      formData.append('from_group', '1');

      if (publishDate) {
        const timestamp = Math.floor(new Date(publishDate).getTime() / 1000);
        formData.append('publish_date', timestamp);
      }

      photos.forEach((photo) => {
        formData.append('photos', photo);
      });

      if (video) {
        formData.append('video', video);
      }

      const result = await publishPost(formData);

      if (result.error) {
        setNotification({ text: result.error, type: 'error' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        const successText = publishDate ? 'Пост запланирован!' : 'Пост опубликован!';
        setNotification({ text: successText, type: 'success' });
        setTimeout(() => setNotification(null), 3000);
        
        // Очищаем форму после небольшой задержки
        setTimeout(() => {
          setMessage('');
          setPublishDate('');
          setPhotos([]);
          setVideo(null);
        }, 100);
      }
    } catch (error) {
      console.error('Error in handlePublish:', error);
      setNotification({ text: 'Ошибка публикации', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!message && photos.length === 0 && !video) {
      setNotification({ text: 'Добавьте текст, фото или видео для предпросмотра', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setShowPreview(!showPreview);
  };

  return (
    <Box>
      <Group>
        <Card mode="shadow">
          <Box style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
            {userPhoto && <Avatar size={48} src={userPhoto} />}
            <div style={{ flex: 1 }}>
              <Title level="3" weight="medium">
                {userName || 'Пользователь'}
              </Title>
              <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                Авторизован
              </Text>
            </div>
            <Button mode="tertiary" size="s" onClick={handleLogout}>
              Выйти
            </Button>
          </Box>
        </Card>
      </Group>

      <Group>
        <FormItem top="Выберите группу">
          <CustomSelect
            placeholder="Выберите группу"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            options={groups.map((group) => ({
              label: group.name,
              value: `-${group.id}`,
              avatar: group.photo_200,
              description: `@${group.screen_name}`,
            }))}
            renderOption={({ option, ...restProps }) => (
              <CustomSelectOption
                {...restProps}
                before={<Avatar size={32} src={option.avatar} />}
                description={option.description}
              />
            )}
          />
        </FormItem>

        <FormItem top="Текст поста">
          <Textarea
            placeholder="Введите текст поста..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />
        </FormItem>

        <FormItem top="Отложенная публикация (необязательно)">
          <Input
            type="datetime-local"
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
          />
        </FormItem>

        <FormItem top="Фотографии">
          <File
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(Array.from(e.target.files))}
          >
            Выбрать фото
          </File>
          {photos.length > 0 && (
            <div style={{ marginTop: 8, color: 'var(--vkui--color_text_secondary)' }}>
              Выбрано фото: {photos.length}
            </div>
          )}
        </FormItem>

        <FormItem top="Видео">
          <File
            accept="video/*"
            onChange={(e) => setVideo(e.target.files[0])}
          >
            Выбрать видео
          </File>
          {video && (
            <div style={{ marginTop: 8, color: 'var(--vkui--color_text_secondary)' }}>
              {video.name}
            </div>
          )}
        </FormItem>

        <FormItem>
          <Box style={{ display: 'flex', gap: 8 }}>
            <Button
              size="l"
              stretched
              mode="secondary"
              onClick={handlePreview}
            >
              Предпросмотр
            </Button>
            <Button
              size="l"
              stretched
              onClick={handlePublish}
              loading={loading}
              disabled={loading}
            >
              {publishDate ? 'Запланировать' : 'Опубликовать'}
            </Button>
          </Box>
          
          {notification && (
            <Box
              style={{
                marginTop: 12,
                padding: '12px 16px',
                borderRadius: 8,
                background: notification.type === 'success' 
                  ? 'var(--vkui--color_background_positive)' 
                  : 'var(--vkui--color_background_negative)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {notification.type === 'success' ? <Icon16Done /> : <Icon16Cancel />}
              <Text style={{ color: '#fff' }}>{notification.text}</Text>
            </Box>
          )}
        </FormItem>
      </Group>

      {showPreview && (
        <Group>
          <Card mode="outline" style={{ margin: 16 }}>
            <Box padding="m">
              <Box style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar size={48} src={groups.find(g => `-${g.id}` === selectedGroup)?.photo_200} />
                <Box style={{ flex: 1 }}>
                  <Title level="3" weight="medium" style={{ marginBottom: 2 }}>
                    {groups.find(g => `-${g.id}` === selectedGroup)?.name || 'Группа'}
                  </Title>
                  <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 13 }}>
                    {publishDate ? new Date(publishDate).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'только что'}
                  </Text>
                </Box>
              </Box>
              
              {message && (
                <Text style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: '20px', display: 'block', marginBottom: photos.length > 0 || video ? 12 : 0 }}>
                  {message}
                </Text>
              )}
            </Box>
            
            {photos.length > 0 && (
              <Box>
                {photos.length === 1 ? (
                  <img
                    src={URL.createObjectURL(photos[0])}
                    alt="Фото"
                    style={{
                      width: '100%',
                      maxHeight: '500px',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <Box style={{ 
                    display: 'grid', 
                    gridTemplateColumns: photos.length === 2 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
                    gap: 2,
                  }}>
                    {photos.slice(0, 4).map((photo, index) => (
                      <Box
                        key={index}
                        style={{
                          position: 'relative',
                          paddingBottom: photos.length === 2 ? '75%' : '100%',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Фото ${index + 1}`}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        {index === 3 && photos.length > 4 && (
                          <Box
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'rgba(0, 0, 0, 0.6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                              +{photos.length - 4}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
            
            {video && (
              <Box style={{ padding: 16, paddingTop: message || photos.length > 0 ? 8 : 16 }}>
                <Box style={{ 
                  background: 'var(--vkui--color_background_secondary)', 
                  padding: 12, 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <Text style={{ fontSize: 20 }}>🎥</Text>
                  <Text style={{ fontSize: 14 }}>{video.name}</Text>
                </Box>
              </Box>
            )}
          </Card>
        </Group>
      )}
    </Box>
  );
}

export default HomePage;
