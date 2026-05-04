import vkBridgeModule from '@vkontakte/vk-bridge';
const vkBridge = (vkBridgeModule as unknown as { send?: unknown, default?: unknown }).send ? vkBridgeModule : (vkBridgeModule as unknown as { default: unknown }).default;
import { FC, useEffect, useState } from 'react';
import {
  Panel,
  Button,
  NavIdProps,
  Link,
  Title,
  Text,
  Div,
} from '@vkontakte/vkui';

export const Onboarding: FC<NavIdProps> = ({ id }) => {
  const [isOutsideVK, setIsOutsideVK] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Анимация плавного появления в стиле Apple
    requestAnimationFrame(() => {
      setTimeout(() => setIsVisible(true), 100);
    });

    const checkVKEnvironment = () => {
      const hasVKParams = window.vkLaunchParams && Object.keys(window.vkLaunchParams).length > 0;
      const hasVKBridge = vkBridge && typeof (vkBridge as { send?: unknown }).send === 'function';
      
      if (!hasVKParams && !hasVKBridge) {
        setIsOutsideVK(true);
      }
    };

    setTimeout(checkVKEnvironment, 1000);
  }, []);

  const installToCommunity = () => {
    const bridge = vkBridge as { send?: (method: string) => Promise<unknown> };
    if (bridge && bridge.send) {
      bridge.send('VKWebAppAddToCommunity').catch((error: unknown) => {
        console.error('Failed to add to community:', error);
      });
    } else {
      console.warn('VK Bridge not available');
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at center, var(--vkui--color_background_content) 0%, var(--vkui--color_background_page) 100%)',
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
    padding: '0 24px',
    textAlign: 'center' as const,
  };

  if (isOutsideVK) {
    return (
      <Panel id={id}>
        <div style={containerStyle}>
          <div style={{ marginBottom: 32 }}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 26C9.383 28 4 22.617 4 16S9.383 4 16 4s12 5.383 12 12-5.383 12-12 12zm-1-18h2v10h-2zm0 12h2v2h-2z" fill="var(--vkui--color_icon_negative)"/>
            </svg>
          </div>
          <Title level="1" weight="1" style={{ fontSize: 28, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Доступно только в VK
          </Title>
          <Text style={{ fontSize: 16, color: 'var(--vkui--color_text_secondary)', lineHeight: 1.5, marginBottom: 32, maxWidth: 320 }}>
            Это мини-приложение создано для безупречной работы внутри экосистемы ВКонтакте.
          </Text>
          <Link href="https://vk.com/apps" target="_blank">
            <Button size="l" mode="secondary" stretched={false}>
              Открыть каталог приложений
            </Button>
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <div style={containerStyle}>
        
        {/* Glow-эффект под логотипом */}
        <div style={{
          position: 'relative',
          marginBottom: 40,
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 120,
            height: 120,
            background: 'var(--vkui--color_background_accent_themed)',
            filter: 'blur(40px)',
            opacity: 0.2,
            borderRadius: '50%',
            zIndex: 0
          }} />
          
          <img 
            src="/logo.svg" 
            alt="ZooPlatforma Logo" 
            style={{ 
              width: 86, 
              height: 86, 
              position: 'relative', 
              zIndex: 1,
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))'
            }} 
          />
        </div>

        <Title level="1" weight="1" style={{ 
          fontSize: 40, 
          lineHeight: 1.1,
          letterSpacing: '-0.04em', 
          marginBottom: 16,
          background: 'linear-gradient(135deg, var(--vkui--color_text_primary) 0%, var(--vkui--color_text_secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'var(--vkui--color_text_primary)' // fallback
        }}>
          ЗооПлатформа.
        </Title>
        <Title level="2" weight="3" style={{ fontSize: 24, letterSpacing: '-0.02em', color: 'var(--vkui--color_text_primary)', marginBottom: 24 }}>
          Это меняет всё.
        </Title>

        <Div style={{ maxWidth: 380, padding: 0, marginBottom: 48 }}>
          <Text style={{ 
            fontSize: 17, 
            color: 'var(--vkui--color_text_secondary)', 
            lineHeight: 1.5,
            letterSpacing: '-0.01em'
          }}>
            Установите мини-приложение в своё сообщество. Безупречная модерация, умная очередь и абсолютный контроль над контентом. Всё просто работает.
          </Text>
        </Div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 16,
          width: '100%',
          maxWidth: 320
        }}>
          <Button 
            size="l" 
            stretched 
            onClick={installToCommunity}
            style={{
              padding: '16px 32px',
              borderRadius: 14,
              fontSize: 17,
              fontWeight: 500,
              letterSpacing: '-0.01em',
              background: 'var(--vkui--color_background_accent_themed)',
              boxShadow: '0 4px 14px 0 rgba(0, 119, 255, 0.2)'
            }}
          >
            Установить в сообщество
          </Button>
          
          <Text style={{ fontSize: 13, color: 'var(--vkui--color_text_subhead)', marginTop: 8 }}>
            Требуются права администратора
          </Text>
        </div>

      </div>
    </Panel>
  );
};
