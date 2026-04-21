#!/usr/bin/env python3
"""
VK Service - микросервис для работы с VK API
"""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import vk_api

app = Flask(__name__)
CORS(app)

# Кэш для VK API сессий
vk_sessions = {}

def get_vk_api(token):
    """Получение VK API сессии с кэшированием"""
    if token not in vk_sessions:
        print(f"[VK Service] Creating new VK API session")
        session = vk_api.VkApi(token=token)
        vk_sessions[token] = session.get_api()
    return vk_sessions[token]

@app.route('/health', methods=['GET'])
def health():
    """Проверка здоровья сервиса"""
    print("[VK Service] Health check called")
    return jsonify({'status': 'ok', 'service': 'vk-service'})

@app.route('/vk/wall/post', methods=['POST'])
def wall_post():
    """Публикация поста на стене"""
    try:
        data = request.json
        print(f"[VK Service] Received wall.post request: {data}")
        
        token = data.get('access_token')
        owner_id = data.get('owner_id')
        message = data.get('message')
        from_group = data.get('from_group', 1)
        
        if not token or not owner_id or not message:
            print(f"[VK Service] Missing parameters")
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Получаем VK API
        api = get_vk_api(token)
        print(f"[VK Service] Calling wall.post for owner_id: {owner_id}")
        
        # Публикуем пост
        result = api.wall.post(
            owner_id=owner_id,
            message=message,
            from_group=from_group
        )
        
        print(f"[VK Service] wall.post result: {result}")
        
        return jsonify({'post_id': result['post_id']})
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return jsonify({'error': f'VK API Error: {str(e)}'}), 400
    except Exception as e:
        print(f"[VK Service] Error in wall.post: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/vk/groups/get', methods=['POST'])
def groups_get():
    """Получение списка групп пользователя"""
    try:
        data = request.json
        print(f"[VK Service] Received groups.get request")
        
        token = data.get('access_token')
        
        if not token:
            print(f"[VK Service] Missing access_token")
            return jsonify({'error': 'Missing access_token'}), 400
        
        # Получаем VK API
        api = get_vk_api(token)
        print(f"[VK Service] Calling groups.get")
        
        # Получаем группы
        result = api.groups.get(
            extended=1,
            filter='admin,editor,moder',
            fields='description,members_count'
        )
        
        print(f"[VK Service] groups.get result: {result['count']} groups")
        
        return jsonify({
            'count': result['count'],
            'items': result['items']
        })
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return jsonify({'error': f'VK API Error: {str(e)}'}), 400
    except Exception as e:
        print(f"[VK Service] Error in groups.get: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/vk/users/get', methods=['POST'])
def users_get():
    """Получение информации о пользователе"""
    try:
        data = request.json
        print(f"[VK Service] Received users.get request: {data}")
        
        token = data.get('access_token')
        user_ids = data.get('user_ids')
        
        if not token or not user_ids:
            print(f"[VK Service] Missing parameters - token: {bool(token)}, user_ids: {bool(user_ids)}")
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Получаем VK API
        api = get_vk_api(token)
        print(f"[VK Service] Calling users.get for: {user_ids}")
        
        # Получаем информацию о пользователе
        result = api.users.get(
            user_ids=user_ids,
            fields='photo_200'
        )
        
        print(f"[VK Service] users.get result: {result}")
        
        return jsonify({'response': result})
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return jsonify({'error': f'VK API Error: {str(e)}'}), 400
    except Exception as e:
        print(f"[VK Service] Error in users.get: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"=== Starting VK Service on port {port} ===")
    print(f"Flask version: {Flask.__version__}")
    print(f"vk_api available: True")
    app.run(host='0.0.0.0', port=port, debug=False)
