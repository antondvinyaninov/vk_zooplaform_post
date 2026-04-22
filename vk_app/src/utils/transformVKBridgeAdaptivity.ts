import {
  type AdaptivityProps,
  getViewWidthByViewportWidth,
  getViewHeightByViewportHeight,
  ViewWidth,
  SizeType,
} from '@vkontakte/vkui';
import type { UseAdaptivity } from '@vkontakte/vk-bridge-react';

export const transformVKBridgeAdaptivity = ({
  type,
  viewportWidth,
  viewportHeight,
}: UseAdaptivity): AdaptivityProps => {
  switch (type) {
    case 'adaptive':
      return {
        viewWidth: getViewWidthByViewportWidth(viewportWidth),
        viewHeight: getViewHeightByViewportHeight(viewportHeight),
      };
    case 'force_mobile':
    case 'force_mobile_compact':
      return {
        viewWidth: ViewWidth.MOBILE,
        sizeX: SizeType.COMPACT,
        sizeY: type === 'force_mobile_compact' ? SizeType.COMPACT : SizeType.REGULAR,
      };
    default:
      // По умолчанию вычисляем на основе реального размера окна, чтобы не было прыжков при загрузке
      return {
        viewWidth: getViewWidthByViewportWidth(window.innerWidth),
        viewHeight: getViewHeightByViewportHeight(window.innerHeight),
        sizeX: window.innerWidth >= 768 ? SizeType.REGULAR : SizeType.COMPACT,
        sizeY: SizeType.REGULAR,
      };
  }
};
