"""
Работа с группами VK
"""
import vk_api
from utils.vk_session import get_vk_session


def get_groups(data):
    """
    Получение списка групп пользователя
    
    Args:
        data: dict с параметрами (access_token)
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        token = data.get('access_token')
        
        if not token:
            print(f"[VK Service] Missing access_token")
            return {'error': 'Missing access_token'}, 400
        
        vk_session = get_vk_session(token)
        api = vk_session['api']
        print(f"[VK Service] Calling groups.get")
        
        result = api.groups.get(
            extended=1,
            filter='admin,editor,moder',
            fields='description,members_count'
        )
        
        print(f"[VK Service] groups.get result: {result['count']} groups")
        
        return {
            'count': result['count'],
            'items': result['items']
        }, 200
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return {'error': f'VK API Error: {str(e)}'}, 400
    except Exception as e:
        print(f"[VK Service] Error in groups.get: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}, 500


def get_users(data):
    """
    Получение информации о пользователе
    
    Args:
        data: dict с параметрами (access_token, user_ids)
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        token = data.get('access_token')
        user_ids = data.get('user_ids')
        
        if not token or not user_ids:
            print(f"[VK Service] Missing parameters - token: {bool(token)}, user_ids: {bool(user_ids)}")
            return {'error': 'Missing required parameters'}, 400
        
        vk_session = get_vk_session(token)
        api = vk_session['api']
        print(f"[VK Service] Calling users.get for: {user_ids}")
        
        result = api.users.get(
            user_ids=user_ids,
            fields='photo_200'
        )
        
        print(f"[VK Service] users.get result: {result}")
        
        return {'response': result}, 200
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return {'error': f'VK API Error: {str(e)}'}, 400
    except Exception as e:
        print(f"[VK Service] Error in users.get: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}, 500
