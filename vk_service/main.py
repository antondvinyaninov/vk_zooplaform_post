#!/usr/bin/env python3
"""
VK Service - микросервис для работы с VK API через MCP
"""
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

# Добавляем путь к VK MCP
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'vk_mcp'))

from vk_provider import get_vk_api
import configparser

app = Flask(__name__)
CORS(app)

# Глобальная переменная для VK API
vk_api = None
current_token = None

def init_vk_api(token):
    """Инициализация VK API с токеном"""
    global vk_api, current_token
    
    if token == current_token and vk_api:
        return vk_api
    
    # Создаем временный config
    config = configparser.ConfigParser()
    config['vk'] = {'token': token}
    
    # Инициализируем VK API
    import vk_api as vk_module
    session = vk_module.VkApi(token=token)
    vk_api = session.get_api()
    current_token = token
    
    return vk_api

@app.route('/health', methods=['GET'])
def health():
    """Проверка здоровья сервиса"""
    return jsonify({'status': 'ok'})

@app.route('/vk/wall/post', methods=['POST'])
def wall_post():
    """Публикация поста на стене"""
    try:
        data = request.json
        token = data.get('access_token')
        owner_id = data.get('owner_id')
        message = data.get('message')
        from_group = data.get('from_group', 1)
        
        if not token or not owner_id or not message:
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Инициализируем VK API
        api = init_vk_api(token)
        
        # Публикуем пост
        result = api.wall.post(
            owner_id=owner_id,
            message=message,
            from_group=from_group
        )
        
        return jsonify({'post_id': result['post_id']})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/vk/groups/get', methods=['POST'])
def groups_get():
    """Получение списка групп пользователя"""
    try:
        data = request.json
        token = data.get('access_token')
        
        if not token:
            return jsonify({'error': 'Missing access_token'}), 400
        
        # Инициализируем VK API
        api = init_vk_api(token)
        
        # Получаем группы
        result = api.groups.get(
            extended=1,
            filter='admin,editor,moder',
            fields='description,members_count'
        )
        
        return jsonify({
            'count': result['count'],
            'items': result['items']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/vk/users/get', methods=['POST'])
def users_get():
    """Получение информации о пользователе"""
    try:
        data = request.json
        token = data.get('access_token')
        user_ids = data.get('user_ids')
        
        if not token or not user_ids:
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Инициализируем VK API
        api = init_vk_api(token)
        
        # Получаем информацию о пользователе
        result = api.users.get(
            user_ids=user_ids,
            fields='photo_200'
        )
        
        return jsonify({'response': result})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
