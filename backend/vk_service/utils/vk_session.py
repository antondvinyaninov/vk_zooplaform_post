"""
Управление VK API сессиями
"""
import vk_api
from vk_api import VkUpload

# Кэш для VK API сессий
vk_sessions = {}

def get_vk_session(token):
    """Получение VK API сессии с кэшированием"""
    if token not in vk_sessions:
        print(f"[VK Service] Creating new VK API session")
        session = vk_api.VkApi(token=token)
        vk_sessions[token] = {
            'api': session.get_api(),
            'upload': VkUpload(session)
        }
    return vk_sessions[token]
