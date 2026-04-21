#!/usr/bin/env python3
"""
VK Service - микросервис для работы с VK API
"""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

# Импортируем наши сервисы
from services.post_creator import create_post, repost_post, copy_post
from services.post_parser import get_posts
from services.groups import get_groups, get_users

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    """Проверка здоровья сервиса"""
    print("[VK Service] Health check called")
    return jsonify({'status': 'ok', 'service': 'vk-service'})

@app.route('/vk/wall/post', methods=['POST'])
def wall_post():
    """Публикация поста на стене с поддержкой фото и видео"""
    result, status_code = create_post(request.form.to_dict(), request.files)
    return jsonify(result), status_code

@app.route('/vk/wall/get', methods=['POST'])
def wall_get():
    """Получение постов со стены группы"""
    result, status_code = get_posts(request.json)
    return jsonify(result), status_code

@app.route('/vk/wall/repost', methods=['POST'])
def wall_repost():
    """Репост записи в группу"""
    result, status_code = repost_post(request.json)
    return jsonify(result), status_code

@app.route('/vk/wall/copy', methods=['POST'])
def wall_copy():
    """Копирование поста (публикация с теми же вложениями)"""
    result, status_code = copy_post(request.json)
    return jsonify(result), status_code

@app.route('/vk/groups/get', methods=['POST'])
def groups_get():
    """Получение списка групп пользователя"""
    result, status_code = get_groups(request.json)
    return jsonify(result), status_code

@app.route('/vk/users/get', methods=['POST'])
def users_get():
    """Получение информации о пользователе"""
    result, status_code = get_users(request.json)
    return jsonify(result), status_code

if __name__ == '__main__':
    port = int(os.environ.get('VK_SERVICE_PORT', 5000))
    print(f"=== Starting VK Service on port {port} ===")
    print(f"vk_api available: True")
    app.run(host='0.0.0.0', port=port, debug=False)
