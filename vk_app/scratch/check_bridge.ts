import vkBridge from '@vkontakte/vk-bridge';
console.log('vkBridge type:', typeof vkBridge);
console.log('vkBridge keys:', Object.keys(vkBridge || {}));
if (vkBridge && (vkBridge as any).default) {
  console.log('vkBridge.default keys:', Object.keys((vkBridge as any).default));
}
