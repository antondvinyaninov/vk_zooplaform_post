export type PublicationStatus =
  | 'pending'
  | 'scheduled'
  | 'published'
  | 'rejected'
  | 'failed'
  | 'draft'
  | 'processing'
  | 'deleted'
  | string;

export const formatPostStatus = (status?: PublicationStatus, publishDate?: string | null) => {
  if (status === 'published') return '✅ Опубликовано';
  if (status === 'pending') return '⏳ На модерации';
  if (status === 'processing') return '✅ Готово';
  if (status === 'rejected') return '❌ Отклонено';
  if (status === 'failed') return '⚠️ Ошибка публикации';
  if (status === 'draft') return '📝 Черновик';
  if (status === 'deleted') return 'Удалено';

  if (status === 'scheduled') {
    if (publishDate && new Date(publishDate).getTime() <= Date.now()) {
      return '✅ Опубликовано (отложенный)';
    }

    const dateStr = publishDate
      ? new Date(publishDate).toLocaleString('ru-RU', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return `📅 Отложено на ${dateStr}`;
  }

  return status || 'Статус неизвестен';
};

export const getPostStatusColor = (status?: PublicationStatus, publishDate?: string | null) => {
  if (status === 'published' || status === 'processing') {
    return 'var(--vkui--color_text_positive)';
  }

  if (status === 'pending') {
    return 'var(--vkui--color_text_accent)';
  }

  if (status === 'rejected' || status === 'failed') {
    return 'var(--vkui--color_text_negative)';
  }

  if (status === 'scheduled' && publishDate && new Date(publishDate).getTime() <= Date.now()) {
    return 'var(--vkui--color_text_positive)';
  }

  if (status === 'scheduled') {
    return 'var(--vkui--color_text_accent_themed)';
  }

  return 'var(--vkui--color_text_secondary)';
};
