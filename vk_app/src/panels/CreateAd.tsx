import { CSSProperties, ChangeEvent, FC, useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderButton,
  Group,
  FormItem,
  Textarea,
  Button,
  Div,
  NavIdProps,
  HorizontalScroll,
  Input,
  Checkbox,
  Text,
} from '@vkontakte/vkui';
import {
  Icon24ChevronDown,
  Icon24InfoCircleOutline,
  Icon24PicturePlusOutline,
  Icon24SmileOutline,
  Icon28Cancel,
  Icon28CancelCircleFillRed,
  Icon28UploadOutline,
  Icon28VideoOutline,
} from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import bridge from '@vkontakte/vk-bridge';
import { createPost, getS3PresignedUrl, uploadMediaToS3, compressImage, getCommunitySettings } from '../shared/api';
import { DEFAULT_VIEW_PANELS } from '../routes';

export const CreatePost: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [settings, setSettings] = useState<any>(null);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<{ file: File, thumbnail?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPostTypeId, setSelectedPostTypeId] = useState<string | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean>>({});
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const mediaInputId = `media-upload-${id}`;

  useEffect(() => {
    getCommunitySettings().then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const selectedPostType = settings?.post_types?.find((pt: any) => pt.id === selectedPostTypeId);

  const getTextPlaceholder = () => {
    const label = String(selectedPostType?.label || '').toLowerCase();

    if (label.includes('потер')) {
      return 'Кто потерялся? Где и когда? Опишите приметы, кличку и как с вами связаться.';
    }

    if (label.includes('наш')) {
      return 'Где и когда нашли? Как выглядит животное? Укажите район и контакт для связи.';
    }

    if (label.includes('дом')) {
      return 'Расскажите о животном: возраст, характер, здоровье, город и контакт для связи.';
    }

    if (label.includes('сбор')) {
      return 'На что нужна помощь? Укажите сумму, реквизиты или ссылку, историю и контакт.';
    }

    return 'Напишите что-нибудь...';
  };

  const getContrastYIQ = (hexcolor: string) => {
    if (!hexcolor) return 'rgba(0,0,0,0.8)';
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(c => c + c).join('');
    const r = parseInt(hexcolor.substr(0,2),16);
    const g = parseInt(hexcolor.substr(2,2),16);
    const b = parseInt(hexcolor.substr(4,2),16);
    const yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? 'rgba(0,0,0,0.8)' : '#ffffff';
  };

  const applyPhoneMask = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) return '';
    let res = '+7';
    let raw = digits;
    if (raw.startsWith('7') || raw.startsWith('8')) raw = raw.slice(1);
    
    if (raw.length > 0) res += ` (${raw.slice(0,3)}`;
    if (raw.length >= 3) res += `) ${raw.slice(3,6)}`;
    if (raw.length >= 6) res += `-${raw.slice(6,8)}`;
    if (raw.length >= 8) res += `-${raw.slice(8,10)}`;
    
    return res;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFilesList = Array.from(e.target.files);
    if (files.length + newFilesList.length > 10) {
      alert('Можно прикрепить не более 10 файлов');
      return;
    }

    for (const file of newFilesList) {
      if (file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) {
        alert(`Фото "${file.name}" слишком большое. Максимальный размер фото: 10 МБ.`);
        return;
      }
      if (file.type.startsWith('video/') && file.size > 100 * 1024 * 1024) {
        alert(`Видео "${file.name}" слишком большое. Максимальный размер видео: 100 МБ.`);
        return;
      }
    }

    const items = newFilesList.map(file => ({ file }));
    setFiles((prev) => [...prev, ...items]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!text || text.length < 10) {
      alert('Минимальная длина текста — 10 символов');
      return;
    }

    let finalPostTypeId: string | undefined;
    let finalCustomFields: any[] | undefined;

    if (settings?.enable_post_types && selectedPostTypeId && settings?.post_types) {
      const pt = settings.post_types.find((p: any) => p.id === selectedPostTypeId);
      if (pt) {
        if (pt.fields) {
          finalCustomFields = [];
          for (const field of pt.fields) {
            const val = customFieldValues[field.id];
            if (field.required && !val) {
              alert(`Пожалуйста, заполните обязательное поле: ${field.label}`);
              return;
            }
            if (val) {
               finalCustomFields.push({
                 id: field.id,
                 label: field.label,
                 var_name: field.var_name || field.id,
                 value: val
               });
            }
          }
        }
        finalPostTypeId = pt.id;
      }
    }

    setIsSubmitting(true);
    try {
      try {
        await bridge.send('VKWebAppAllowMessagesFromGroup', {
          group_id: 165434330,
          key: 'post_status_updates'
        });
      } catch (e) {
        // Игнорируем отказ от сообщений
      }
      try {
        await bridge.send('VKWebAppAllowNotifications');
      } catch (e) {
        // Игнорируем отказ от уведомлений
      }

      const s3MediaKeys: string[] = [];

      for (const item of files) {
        const isVideo = item.file.type.startsWith('video/') || 
                       item.file.name.toLowerCase().endsWith('.mp4') || 
                       item.file.name.toLowerCase().endsWith('.mov') || 
                       item.file.name.toLowerCase().endsWith('.qt');
                       
        let fileToUpload = item.file;
        let fileType = item.file.type;
        
        if (!isVideo) {
          fileToUpload = await compressImage(item.file);
          fileType = fileToUpload.type || 'image/jpeg';
        }
        
        const { upload_url, key } = await getS3PresignedUrl(fileToUpload.name, fileType);
        await uploadMediaToS3(fileToUpload, upload_url, fileType);
        s3MediaKeys.push(key);
      }

      await createPost(text, s3MediaKeys, [], finalPostTypeId, finalCustomFields);
      routeNavigator.push(`/${DEFAULT_VIEW_PANELS.HOME}`);
    } catch (error: any) {
      alert(`Ошибка при сохранении: ${error?.message || String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = text.trim().length >= 10 && !isSubmitting;

  const renderTextEditor = () => (
    <Div style={{ paddingTop: isCompact ? 12 : 12, paddingBottom: 0 }}>
      <div style={{ position: 'relative' }}>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={getTextPlaceholder()}
          rows={isCompact ? 10 : 5}
          disabled={isSubmitting}
          style={{
            '--vkui--size_field_height--regular': 'auto',
            minHeight: isCompact ? (files.length > 0 ? 150 : 360) : 150,
            fontSize: isCompact ? 20 : 18,
            background: 'transparent',
          } as CSSProperties}
        />
        <Icon24SmileOutline
          width={28}
          height={28}
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: 'var(--vkui--color_icon_secondary)',
            pointerEvents: 'none',
          }}
        />
      </div>
      {text.length > 0 && text.length < 10 && (
        <Text style={{ color: 'var(--vkui--color_text_secondary)', marginTop: 8 }}>
          Минимум 10 символов для отправки.
        </Text>
      )}
    </Div>
  );

  const renderEmptyMediaPicker = () => (
    <Div
      style={{
        paddingTop: isCompact ? 14 : 18,
        paddingBottom: isCompact ? 14 : 0,
        borderTop: isCompact ? '1px solid var(--vkui--color_separator_primary)' : undefined,
      }}
    >
      <input
        id={mediaInputId}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileChange}
        disabled={isSubmitting}
        style={{ display: 'none' }}
      />
      {isCompact ? (
        <label
          htmlFor={isSubmitting ? undefined : mediaInputId}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: 14,
            background: 'var(--vkui--color_background_secondary)',
            color: 'var(--vkui--color_text_accent)',
            padding: '10px 14px',
            fontWeight: 600,
            fontSize: 16,
            cursor: isSubmitting ? 'default' : 'pointer',
          }}
        >
          <Icon24PicturePlusOutline width={24} height={24} />
          <span>Фото/Видео</span>
        </label>
      ) : (
      <label
        htmlFor={isSubmitting ? undefined : mediaInputId}
        style={{
          minHeight: isCompact ? 170 : 320,
          border: '1.5px dashed var(--vkui--color_icon_secondary)',
          borderRadius: isCompact ? 14 : 18,
          background: 'var(--vkui--color_background_content)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isCompact ? 10 : 14,
          padding: isCompact ? 18 : 24,
          cursor: isSubmitting ? 'default' : 'pointer',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: isCompact ? 64 : 72,
            height: isCompact ? 64 : 72,
            borderRadius: isCompact ? 20 : 22,
            border: '3px dashed var(--vkui--color_text_primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--vkui--color_text_primary)',
          }}
        >
          <Icon28UploadOutline width={isCompact ? 38 : 44} height={isCompact ? 38 : 44} />
        </div>
        <Text weight="2" style={{ fontSize: isCompact ? 20 : 24, lineHeight: 1.2 }}>
          Добавьте фото или видео
        </Text>
        <div
          style={{
            background: 'var(--vkui--color_background_accent)',
            color: 'var(--vkui--color_text_contrast)',
            borderRadius: 10,
            padding: '10px 18px',
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          Загрузить с устройства
        </div>
      </label>
      )}
    </Div>
  );

  const renderMediaPreview = () => (
    <>
      <Div style={{ paddingTop: isCompact ? 10 : 18, paddingBottom: 0 }}>
        <HorizontalScroll showArrows getScrollToLeft={(i) => i - 260} getScrollToRight={(i) => i + 260}>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
            {files.map((item, index) => {
              const isVideo = item.file.type.startsWith('video/');
              const mediaUrl = URL.createObjectURL(item.file);

              return (
                <div
                  key={`${item.file.name}-${index}`}
                  style={{
                    position: 'relative',
                    width: files.length === 1 ? 'calc(100vw - 64px)' : isCompact ? '72vw' : 'min(76vw, 560px)',
                    maxWidth: '100%',
                    height: isCompact ? 260 : 420,
                    flexShrink: 0,
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: 'var(--vkui--color_background_secondary)',
                  }}
                >
                  {isVideo ? (
                    <video
                      src={mediaUrl}
                      playsInline
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                  {isVideo && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.18)',
                        pointerEvents: 'none',
                      }}
                    >
                      <Icon28VideoOutline width={44} height={44} style={{ color: 'white' }} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => !isSubmitting && removeFile(index)}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 40,
                      height: 40,
                      border: 0,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.38)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isSubmitting ? 'default' : 'pointer',
                      padding: 0,
                    }}
                    aria-label="Удалить медиа"
                  >
                    <Icon28CancelCircleFillRed width={36} height={36} />
                  </button>
                </div>
              );
            })}
          </div>
        </HorizontalScroll>
      </Div>

      <Div
        style={{
          paddingTop: 12,
          paddingBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCompact ? 'flex-start' : 'space-between',
          gap: 12,
          borderBottom: isCompact ? undefined : '1px solid var(--vkui--color_separator_primary)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--vkui--color_text_primary)',
            fontWeight: 600,
            fontSize: isCompact ? 16 : 18,
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>][</span>
          <span>Карусель</span>
          <Icon24ChevronDown width={20} height={20} />
        </div>

        {!isCompact && (
          <>
            <input
              id={mediaInputId}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              disabled={files.length >= 10 || isSubmitting}
              style={{ display: 'none' }}
            />
            <label
              htmlFor={files.length >= 10 || isSubmitting ? undefined : mediaInputId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--vkui--color_text_accent)',
                fontWeight: 600,
                fontSize: 18,
                cursor: files.length >= 10 || isSubmitting ? 'default' : 'pointer',
                opacity: files.length >= 10 ? 0.55 : 1,
              }}
            >
              <Icon24PicturePlusOutline width={24} height={24} />
              <span>Фото/Видео</span>
              <Icon24ChevronDown width={20} height={20} />
            </label>
          </>
        )}
      </Div>
    </>
  );

  const renderCompactMediaToolbar = () => (
    <Div
      style={{
        borderTop: '1px solid var(--vkui--color_separator_primary)',
        marginTop: 18,
        paddingTop: 14,
        paddingBottom: 14,
      }}
    >
      <input
        id={mediaInputId}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileChange}
        disabled={files.length >= 10 || isSubmitting}
        style={{ display: 'none' }}
      />
      <label
        htmlFor={files.length >= 10 || isSubmitting ? undefined : mediaInputId}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 12,
          background: 'var(--vkui--color_background_secondary)',
          color: 'var(--vkui--color_text_accent)',
          padding: '10px 14px',
          fontWeight: 600,
          fontSize: 16,
          cursor: files.length >= 10 || isSubmitting ? 'default' : 'pointer',
          opacity: files.length >= 10 ? 0.55 : 1,
        }}
      >
        <Icon24PicturePlusOutline width={24} height={24} />
        <span>Фото/Видео</span>
      </label>
    </Div>
  );

  const renderCompactSubmitButton = () => (
    <Div style={{ paddingTop: 0, paddingBottom: 18 }}>
      <Button
        size="l"
        stretched
        disabled={!canSubmit}
        loading={isSubmitting}
        onClick={handlePublish}
      >
        Отправить
      </Button>
    </Div>
  );

  return (
    <Panel id={id}>
      <PanelHeader
        before={
          isCompact ? (
            <PanelHeaderButton
              aria-label="Закрыть"
              onClick={() => routeNavigator.push(`/${DEFAULT_VIEW_PANELS.HOME}`)}
            >
              <Icon28Cancel />
            </PanelHeaderButton>
          ) : undefined
        }
        style={{ textAlign: 'center' }}
      >
        Новый пост
      </PanelHeader>

      <Group style={{ marginTop: 0 }}>
        {settings?.enable_post_types && settings?.post_types && settings.post_types.length > 0 && (
          <FormItem top="Тип объявления">
            <HorizontalScroll showArrows getScrollToLeft={(i) => i - 120} getScrollToRight={(i) => i + 120}>
              <div style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
                {settings.post_types.map((pt: any) => {
                  const isSelected = selectedPostTypeId === pt.id;
                  return (
                    <div 
                      key={pt.id}
                      onClick={() => {
                        setSelectedPostTypeId(isSelected ? null : pt.id);
                        setCustomFieldValues({});
                      }}
                      style={{ 
                        padding: '6px 16px', 
                        backgroundColor: isSelected ? pt.color : 'transparent', 
                        borderRadius: 16, 
                        fontSize: 14, 
                        fontWeight: 500,
                        color: isSelected ? getContrastYIQ(pt.color) : 'var(--vkui--color_text_primary)',
                        border: isSelected ? `1px solid ${pt.color}` : '1px solid var(--vkui--color_image_border_alpha)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                      }}>
                      {pt.label}
                    </div>
                  );
                })}
              </div>
            </HorizontalScroll>
          </FormItem>
        )}

        {settings?.enable_post_types && selectedPostTypeId && (() => {
          const pt = settings.post_types.find((p: any) => p.id === selectedPostTypeId);
          if (!pt || !pt.fields || pt.fields.length === 0) return null;
          
          return pt.fields.map((field: any) => {
            // Для типа boolean - чекбокс
            if (field.type === 'boolean') {
              return (
                <FormItem key={field.id}>
                  <Checkbox
                    checked={!!customFieldValues[field.id]}
                    onChange={(e) => {
                      setCustomFieldValues({...customFieldValues, [field.id]: e.target.checked});
                    }}
                  >
                    {field.label} {field.required ? '*' : ''}
                  </Checkbox>
                </FormItem>
              );
            }
            
            // Для типа select - выпадающий список
            if (field.type === 'select') {
              return (
                <FormItem 
                  key={field.id} 
                  top={`${field.label} ${field.required ? '*' : ''}`}
                >
                  <select
                    value={(customFieldValues[field.id] as string) || ''}
                    onChange={(e) => {
                      setCustomFieldValues({...customFieldValues, [field.id]: e.target.value});
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--vkui--color_field_border_alpha)',
                      background: 'var(--vkui--color_background_content)',
                      color: 'var(--vkui--color_text_primary)',
                      fontSize: '16px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Выберите вариант</option>
                    {(field.options || []).map((opt: string, idx: number) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                  </select>
                </FormItem>
              );
            }
            
            // Для остальных типов - обычный input
            return (
              <FormItem 
                key={field.id} 
                top={`${field.label} ${field.required ? '*' : ''}`}
              >
                <Input 
                  type={field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
                  value={(customFieldValues[field.id] as string) || ''}
                  placeholder={field.type === 'link' ? 'https://...' : ''}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (field.type === 'phone') {
                      val = applyPhoneMask(val);
                    }
                    setCustomFieldValues({...customFieldValues, [field.id]: val});
                  }}
                />
              </FormItem>
            );
          });
        })()}

        {isCompact && files.length === 0 && renderTextEditor()}
        {files.length === 0 ? renderEmptyMediaPicker() : renderMediaPreview()}
        {isCompact && files.length > 0 && renderTextEditor()}
        {isCompact && files.length > 0 && renderCompactMediaToolbar()}
        {isCompact && renderCompactSubmitButton()}
        {!isCompact && renderTextEditor()}

        {!isCompact && (
          <Div
            style={{
              borderTop: '1px solid var(--vkui--color_separator_primary)',
              marginTop: 24,
              paddingTop: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--vkui--color_text_accent)',
                fontWeight: 600,
                minWidth: 0,
              }}
            >
              <Icon24InfoCircleOutline width={24} height={24} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Советы по публикации
              </span>
            </div>
            <Button
              size="l"
              disabled={!canSubmit}
              loading={isSubmitting}
              onClick={handlePublish}
              style={{ minWidth: 116 }}
            >
              Отправить
            </Button>
          </Div>
        )}
      </Group>
    </Panel>
  );
};

export default CreatePost;
