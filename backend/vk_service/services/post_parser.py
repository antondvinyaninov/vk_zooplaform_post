"""
Парсинг и получение постов из VK
"""
import vk_api
from utils.vk_session import get_vk_session


def get_posts(data):
    """
    Получение постов со стены группы
    
    Args:
        data: dict с параметрами (access_token, owner_id, count, offset, filter)
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        token = data.get('access_token')
        owner_id = data.get('owner_id')
        count = data.get('count', 10)
        offset = data.get('offset', 0)
        filter_type = data.get('filter', 'all')
        
        if not token or not owner_id:
            print(f"[VK Service] Missing parameters")
            return {'error': 'Missing required parameters'}, 400
        
        vk_session = get_vk_session(token)
        api = vk_session['api']
        print(f"[VK Service] Calling wall.get for owner_id: {owner_id}, count: {count}, offset: {offset}, filter: {filter_type}")
        
        params = {
            'owner_id': owner_id,
            'count': count,
            'offset': offset
        }
        
        if filter_type and filter_type != 'all':
            params['filter'] = filter_type
        
        result = api.wall.get(**params)
        
        print(f"[VK Service] wall.get result: {result['count']} posts")
        
        return {
            'count': result['count'],
            'items': result['items']
        }, 200
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return {'error': f'VK API Error: {str(e)}'}, 400
    except Exception as e:
        print(f"[VK Service] Error in wall.get: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}, 500
