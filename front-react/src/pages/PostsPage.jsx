import { useState, useEffect } from 'react';
import {
  Group,
  FormItem,
  CustomSelect,
  CustomSelectOption,
  Input,
  Button,
  Card,
  CardGrid,
  Div,
  Title,
  Text,
  Link,
  Snackbar,
  Avatar,
  Spinner,
  Box,
} from '@vkontakte/vkui';
import { Icon16Done, Icon16Cancel } from '@vkontakte/icons';
import { getGroups, getPosts, repostPost, copyPost } from '../api/api';

function PostsPage() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [customGroupId, setCustomGroupId] = useState('');
  const [filter, setFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
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

  const loadPosts = async () => {
    const ownerId = customGroupId || selectedGroup;
    if (!ownerId) {
      showSnackbar('Выберите группу или введите ID', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await getPosts(ownerId, 10, 0, filter);
      if (data.items) {
        setPosts(data.items);
        showSnackbar(`Загружено постов: ${data.items.length}`, 'success');
      } else if (data.error) {
        showSnackbar(data.error, 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка загрузки постов', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRepost = async (post) => {
    if (!selectedGroup) {
      showSnackbar('Выберите группу для репоста', 'error');
      return;
    }

    try {
      const object = `wall${post.owner_id}_${post.id}`;
      const groupId = selectedGroup.replace('-', '');
      const result = await repostPost(object, groupId);

      if (result.error) {
        showSnackbar(result.error, 'error');
      } else {
        showSnackbar('Пост репостнут!', 'success');
      }
    } catch (error) {
      showSnackbar('Ошибка репоста', 'error');
    }
  };

  const handleCopy = async (post) => {
    if (!selectedGroup) {
      showSnackbar('Выберите группу для копирования', 'error');
      return;
    }

    try {
      const attachments = extractAttachments(post);
      const result = await copyPost(selectedGroup, post.text, attachments);

      if (result.error) {
        showSnackbar(result.error, 'error');
      } else {
        showSnackbar('Пост скопирован!', 'success');
      }
    } catch (error) {
      showSnackbar('Ошибка копирования', 'error');
    }
  };

  const extractAttachments = (post) => {
    if (!post.attachments) return '';
    
    return post.attachments
      .map((att) => {
        if (att.type === 'photo') {
          return `photo${att.photo.owner_id}_${att.photo.id}`;
        } else if (att.type === 'video') {
          return `video${att.video.owner_id}_${att.video.id}`;
        }
        return null;
      })
      .filter(Boolean)
      .join(',');
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString('ru-RU');
  };

  const showSnackbar = (text, type) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={
          type === 'success' ? (
            <Avatar size={24} style={{ background: 'var(--vkui--color_background_positive)' }}>
              <Icon16Done fill="#fff" />
            </Avatar>
          ) : (
            <Avatar size={24} style={{ background: 'var(--vkui--color_background_negative)' }}>
              <Icon16Cancel fill="#fff" />
            </Avatar>
          )
        }
      >
        {text}
      </Snackbar>
    );
  };

  return (
    <Box>
      <Group>
        <FormItem top="Ваши группы">
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

        <Box style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)', padding: '8px 0' }}>
          или
        </Box>

        <FormItem top="Ссылка или ID любой группы">
          <Input
            placeholder="https://vk.com/apiclub или apiclub"
            value={customGroupId}
            onChange={(e) => setCustomGroupId(e.target.value)}
          />
        </FormItem>

        <FormItem top="Тип постов">
          <CustomSelect 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { label: 'Все посты', value: 'all' },
              { label: 'Только от группы', value: 'owner' },
              { label: 'Только от пользователей', value: 'others' },
              { label: 'Отложенные посты', value: 'postponed' },
              { label: 'Предложенные посты', value: 'suggests' },
            ]}
          />
        </FormItem>

        <FormItem>
          <Button size="l" stretched onClick={loadPosts} loading={loading}>
            Загрузить посты
          </Button>
        </FormItem>
      </Group>

      {loading && (
        <Div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner size="large" />
        </Div>
      )}

      {posts.length > 0 && (
        <Group>
          <CardGrid size="l">
            {posts.map((post) => (
              <Card key={post.id} mode="shadow">
                <Div>
                  <Text style={{ marginBottom: 8, color: 'var(--vkui--color_text_secondary)' }}>
                    {formatDate(post.date)}
                  </Text>
                  <Text style={{ marginBottom: 12 }}>{post.text}</Text>
                  
                  {post.attachments && post.attachments.length > 0 && (
                    <Text style={{ marginBottom: 8, color: 'var(--vkui--color_text_secondary)' }}>
                      📎 Вложений: {post.attachments.length}
                    </Text>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 14 }}>
                      ❤️ {post.likes?.count || 0}
                    </Text>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 14 }}>
                      💬 {post.comments?.count || 0}
                    </Text>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 14 }}>
                      🔄 {post.reposts?.count || 0}
                    </Text>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 14 }}>
                      👁 {post.views?.count || 0}
                    </Text>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Button size="s" mode="secondary" onClick={() => handleRepost(post)}>
                      🔄 Репостнуть
                    </Button>
                    <Button size="s" mode="secondary" onClick={() => handleCopy(post)}>
                      📋 Скопировать
                    </Button>
                    <Link
                      href={`https://vk.com/wall${post.owner_id}_${post.id}`}
                      target="_blank"
                    >
                      <Button size="s" mode="tertiary">
                        Открыть в VK
                      </Button>
                    </Link>
                  </div>
                </Div>
              </Card>
            ))}
          </CardGrid>
        </Group>
      )}
      {snackbar}
    </Box>
  );
}

export default PostsPage;
