import { FC, useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  FormItem,
  Textarea,
  Button,
  Div,
  NavIdProps,
  File as VKFile,
  HorizontalScroll,
  Image,
  Input,
  Checkbox,
} from '@vkontakte/vkui';
import { Icon24Camera, Icon28CancelCircleFillRed, Icon28VideoOutline } from '@vkontakte/icons';
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

  useEffect(() => {
    getCommunitySettings().then(setSettings).catch(console.error);
  }, []);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFilesList = Array.from(e.target.files);
    if (files.length + newFilesList.length > 10) {
      alert('Можно прикрепить не более 10 файлов');
      return;
    }

    const items = newFilesList.map(file => ({ file }));
    setFiles((prev) => [...prev, ...items]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!text || text.length < 10) {
      alert('Минимальная длина текста — 10 символов');
      return;
    }

    let finalText = text;
    if (selectedPostTypeId && settings?.post_types) {
      const pt = settings.post_types.find((p: any) => p.id === selectedPostTypeId);
      if (pt) {
        let fieldsText = `[Категория: ${pt.label}]\n`;
        if (pt.fields) {
          for (const field of pt.fields) {
            const val = customFieldValues[field.id];
            if (field.required && !val) {
              alert(`Пожалуйста, заполните обязательное поле: ${field.label}`);
              return;
            }
            if (val) {
              if (field.type === 'checkbox') {
                fieldsText += `${field.label}: Да\n`;
              } else {
                fieldsText += `${field.label}: ${val}\n`;
              }
            }
          }
        }
        fieldsText += '\n';
        finalText = fieldsText + text;
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

      await createPost(finalText, s3MediaKeys, []);
      routeNavigator.push(`/${DEFAULT_VIEW_PANELS.HOME}`);
    } catch (error: any) {
      alert(`Ошибка при сохранении: ${error?.message || String(error)}`);
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
        {settings?.post_types && settings.post_types.length > 0 && (
          <FormItem top="Категория (тип объявления)">
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

        {selectedPostTypeId && (() => {
          const pt = settings.post_types.find((p: any) => p.id === selectedPostTypeId);
          if (!pt || !pt.fields || pt.fields.length === 0) return null;
          
          return pt.fields.map((field: any) => (
            <FormItem 
              key={field.id} 
              top={`${field.label} ${field.required ? '*' : ''}`}
            >
              {field.type === 'checkbox' ? (
                <Checkbox 
                  checked={!!customFieldValues[field.id]} 
                  onChange={(e) => setCustomFieldValues({...customFieldValues, [field.id]: e.target.checked})}
                >
                  Да / Нет
                </Checkbox>
              ) : (
                <Input 
                  type={field.type === 'phone' ? 'tel' : 'text'}
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
              )}
            </FormItem>
          ));
        })()}

        <FormItem 
          top="Текст публикации" 
          status={text.length >= 10 ? 'valid' : 'default'}
          bottom={text.length >= 10 ? '' : 'Минимум 10 символов для публикации'}
        >
          <Textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="Напишите здесь всё, что считаете нужным..."
            rows={8}
            disabled={isSubmitting}
          />
        </FormItem>

        <FormItem>
          <VKFile 
            multiple 
            accept="image/*,video/*" 
            onChange={handleFileChange} 
            mode="secondary"
            before={<Icon24Camera />}
            size="m"
            disabled={files.length >= 10 || isSubmitting}
          >
            Прикрепить фото/видео ({files.length}/10)
          </VKFile>
        </FormItem>

        {files.length > 0 && (
          <FormItem>
            <HorizontalScroll showArrows getScrollToLeft={(i) => i - 120} getScrollToRight={(i) => i + 120}>
              <div style={{ display: 'flex', gap: 12, padding: '8px 16px' }}>
                {files.map((item, index) => (
                  <div key={index} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                    {item.file.type.startsWith('image/') ? (
                      <Image 
                        src={URL.createObjectURL(item.file)} 
                        size={80} 
                        style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e1e3e6' }} 
                      />
                    ) : item.thumbnail ? (
                      <div style={{ position: 'relative', width: 80, height: 80 }}>
                        <Image 
                          src={item.thumbnail} 
                          size={80} 
                          style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e1e3e6' }} 
                        />
                        <div style={{ 
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                          backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                          <Icon28VideoOutline width={32} height={32} style={{ color: 'white' }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        width: 80, height: 80, backgroundColor: '#f0f0f0', 
                        borderRadius: 8, display: 'flex', flexDirection: 'column', 
                        alignItems: 'center', justifyContent: 'center', border: '1px solid #e1e3e6'
                      }}>
                        <Icon28VideoOutline width={32} height={32} style={{ color: '#818c99' }} />
                        <span style={{ fontSize: 10, marginTop: 4, textAlign: 'center', width: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#818c99' }}>
                          {item.file.name}
                        </span>
                      </div>
                    )}
                    <div 
                      onClick={() => !isSubmitting && removeFile(index)}
                      style={{ 
                        position: 'absolute', top: -6, right: -6, 
                        width: 24, height: 24,
                        background: 'white', borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: isSubmitting ? 'default' : 'pointer',
                        zIndex: 2
                      }}
                    >
                      <Icon28CancelCircleFillRed width={28} height={28} />
                    </div>
                  </div>
                ))}
              </div>
            </HorizontalScroll>
          </FormItem>
        )}

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
