import { useState, useEffect } from 'react';
import {
  Group,
  Button,
  Card,
  CardGrid,
  Avatar,
  Title,
  Text,
  Box,
} from '@vkontakte/vkui';
import { Icon16Done, Icon16Cancel } from '@vkontakte/icons';
import { getGroups } from '../api/api';

function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('vk_selected_groups');
    if (saved) {
      setSelectedGroups(new Set(JSON.parse(saved)));
    }
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await getGroups();
      
      if (data.items && Array.isArray(data.items)) {
        setGroups(data.items);
        setNotification({ 
          text: `Загружено групп: ${data.items.length}`, 
          type: 'success' 
        });
        setTimeout(() => setNotification(null), 3000);
      } else if (data.error) {
        setNotification({ text: data.error, type: 'error' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      setNotification({ text: 'Ошибка загрузки групп', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId) => {
    setSelectedGroups((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(groupId)) {
        newSelected.delete(groupId);
      } else {
        newSelected.add(groupId);
      }
      
      localStorage.setItem('vk_selected_groups', JSON.stringify(Array.from(newSelected)));
      
      const selectedGroupsData = groups.filter(g => newSelected.has(g.id));
      localStorage.setItem('vk_selected_groups_data', JSON.stringify(selectedGroupsData));
      
      return newSelected;
    });
  };

  return (
    <Box>
      <Group>
        <Box style={{ padding: 16 }}>
          <Title level="2" weight="semibold" style={{ marginBottom: 8 }}>
            Управление группами
          </Title>
          <Text style={{ marginBottom: 16, color: 'var(--vkui--color_text_secondary)' }}>
            Выберите группы, в которые хотите публиковать контент
          </Text>
          <Button 
            size="l" 
            stretched 
            onClick={loadGroups} 
            loading={loading} 
            disabled={loading}
          >
            Загрузить мои группы
          </Button>
          
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
        </Box>

        {selectedGroups.size > 0 && (
          <Box style={{ padding: '0 16px 16px' }}>
            <Text weight="medium" style={{ color: 'var(--vkui--color_text_accent)' }}>
              Выбрано групп: {selectedGroups.size}
            </Text>
          </Box>
        )}

        {groups.length > 0 && (
          <Box style={{ padding: '0 16px 16px' }}>
            <CardGrid size="l">
              {groups.map((group) => {
                const isSelected = selectedGroups.has(group.id);
                return (
                  <Card
                    key={group.id}
                    mode={isSelected ? 'shadow' : 'outline'}
                    onClick={() => toggleGroup(group.id)}
                    style={{
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--vkui--color_background_accent)' : undefined,
                    }}
                  >
                    <Box style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar size={64} src={group.photo_200} />
                      <div style={{ flex: 1 }}>
                        <Title level="3" weight="medium" style={{ marginBottom: 4 }}>
                          {group.name}
                        </Title>
                        <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 14 }}>
                          @{group.screen_name}
                        </Text>
                        <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 14 }}>
                          {group.members_count?.toLocaleString()} подписчиков
                        </Text>
                      </div>
                      {isSelected && (
                        <Icon16Done fill="var(--vkui--color_icon_accent)" width={24} height={24} />
                      )}
                    </Box>
                  </Card>
                );
              })}
            </CardGrid>
          </Box>
        )}
      </Group>
    </Box>
  );
}

export default GroupsPage;
