#!/usr/bin/env python3
"""
VK Service - микросервис для работы с VK API
"""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import vk_api
from vk_api import VkUpload

app = Flask(__name__)
CORS(app)

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

@app.route('/health', methods=['GET'])
def health():
    """Проверка здоровья сервиса"""
    print("[VK Service] Health check called")
    return jsonify({'status': 'ok', 'service': 'vk-service'})

@app.route('/vk/wall/post', methods=['POST'])
def wall_post():
    """Публикация поста на стене с поддержкой фото и видео"""
    try:
        # Получаем данные из формы
        token = request.form.get('access_token')
        owner_id = request.form.get('owner_id')
        message = request.form.get('message', '')
        from_group = request.form.get('from_group', '1')
        publish_date = request.form.get('publish_date')
        
        if not token or not owner_id:
            print(f"[VK Service] Missing parameters")
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Получаем VK API и Upload
        vk_session = get_vk_session(token)
        api = vk_session['api']
        upload = vk_session['upload']
        
        print(f"[VK Service] Calling wall.post for owner_id: {owner_id}")
        if publish_date:
            print(f"[VK Service] Scheduled for: {publish_date}")
        
        # Подготавливаем параметры поста
        post_params = {
            'owner_id': owner_id,
            'message': message,
            'from_group': int(from_group)
        }
        
        # Добавляем дату отложенной публикации
        if publish_date:
            post_params['publish_date'] = int(publish_date)
        
        attachments = []
        
        # Обрабатываем фотографии
        if 'photos' in request.files:
            photos = request.files.getlist('photos')
            print(f"[VK Service] Uploading {len(photos)} photos")
            
            for photo_file in photos:
                try:
                    # Сохраняем файл временно
                    import tempfile
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
                        photo_file.save(tmp.name)
                        tmp_path = tmp.name
                    
                    # Загружаем фото через VkUpload
                    photo = upload.photo_wall(tmp_path, group_id=owner_id.replace('-', ''))[0]
                    
                    attachments.append(f"photo{photo['owner_id']}_{photo['id']}")
                    print(f"[VK Service] Photo uploaded: photo{photo['owner_id']}_{photo['id']}")
                    
                    # Удаляем временный файл
                    os.unlink(tmp_path)
                except Exception as e:
                    print(f"[VK Service] Error uploading photo: {e}")
                    import traceback
                    traceback.print_exc()
        
        # Обрабатываем видео
        if 'video' in request.files:
            video_file = request.files['video']
            print(f"[VK Service] Uploading video: {video_file.filename}")
            
            try:
                # Сохраняем файл временно
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
                    video_file.save(tmp.name)
                    tmp_path = tmp.name
                
                # Загружаем видео через VkUpload
                video = upload.video(
                    video_file=tmp_path,
                    name=video_file.filename,
                    group_id=owner_id.replace('-', '')
                )
                
                attachments.append(f"video{video['owner_id']}_{video['video_id']}")
                print(f"[VK Service] Video uploaded: video{video['owner_id']}_{video['video_id']}")
                
                # Удаляем временный файл
                os.unlink(tmp_path)
            except Exception as e:
                print(f"[VK Service] Error uploading video: {e}")
                import traceback
                traceback.print_exc()
        
        # Добавляем attachments если есть
        if attachments:
            post_params['attachments'] = ','.join(attachments)
        
        # Публикуем пост
        result = api.wall.post(**post_params)
        
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
        vk_session = get_vk_session(token)
        api = vk_session['api']
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
        vk_session = get_vk_session(token)
        api = vk_session['api']
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

@app.route('/vk/wall/get', methods=['POST'])
def wall_get():
    """Получение постов со стены группы"""
    try:
        data = request.json
        print(f"[VK Service] Received wall.get request: {data}")
        
        token = data.get('access_token')
        owner_id = data.get('owner_id')
        count = data.get('count', 10)  # По умолчанию 10 постов
        offset = data.get('offset', 0)
        filter_type = data.get('filter', 'all')  # all, owner, others, postponed, suggests
        
        if not token or not owner_id:
            print(f"[VK Service] Missing parameters")
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Получаем VK API
        vk_session = get_vk_session(token)
        api = vk_session['api']
        print(f"[VK Service] Calling wall.get for owner_id: {owner_id}, count: {count}, offset: {offset}, filter: {filter_type}")
        
        # Получаем посты
        params = {
            'owner_id': owner_id,
            'count': count,
            'offset': offset
        }
        
        if filter_type and filter_type != 'all':
            params['filter'] = filter_type
        
        result = api.wall.get(**params)
        
        print(f"[VK Service] wall.get result: {result['count']} posts")
        
        return jsonify({
            'count': result['count'],
            'items': result['items']
        })
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return jsonify({'error': f'VK API Error: {str(e)}'}), 400
    except Exception as e:
        print(f"[VK Service] Error in wall.get: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/vk/wall/repost', methods=['POST'])
def wall_repost():
    """Репост записи в группу"""
    try:
        data = request.json
        print(f"[VK Service] Received wall.repost request: {data}")
        
        token = data.get('access_token')
        object_id = data.get('object')  # Формат: wall-123456_789
        group_id = data.get('group_id')
        
        if not token or not object_id or not group_id:
            print(f"[VK Service] Missing parameters")
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Получаем VK API
        vk_session = get_vk_session(token)
        api = vk_session['api']
        print(f"[VK Service] Calling wall.repost for object: {object_id}, group_id: {group_id}")
        
        # Делаем репост
        result = api.wall.repost(
            object=object_id,
            group_id=group_id
        )
        
        print(f"[VK Service] wall.repost result: {result}")
        
        return jsonify({
            'post_id': result['post_id'],
            'reposts_count': result.get('reposts_count', 0),
            'likes_count': result.get('likes_count', 0)
        })
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return jsonify({'error': f'VK API Error: {str(e)}'}), 400
    except Exception as e:
        print(f"[VK Service] Error in wall.repost: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/vk/wall/copy', methods=['POST'])
def wall_copy():
    """Копирование поста (публикация с теми же вложениями)"""
    try:
        data = request.json
        print(f"[VK Service] Received wall.copy request: {data}")
        
        token = data.get('access_token')
        owner_id = data.get('owner_id')
        message = data.get('message', '')
        attachments = data.get('attachments', '')
        from_group = data.get('from_group', 1)
        
        if not token or not owner_id:
            print(f"[VK Service] Missing parameters")
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Получаем VK API
        vk_session = get_vk_session(token)
        api = vk_session['api']
        print(f"[VK Service] Calling wall.post (copy) for owner_id: {owner_id}")
        
        # Публикуем пост с теми же вложениями
        post_params = {
            'owner_id': owner_id,
            'message': message,
            'from_group': int(from_group)
        }
        
        if attachments:
            post_params['attachments'] = attachments
        
        result = api.wall.post(**post_params)
        
        print(f"[VK Service] wall.post (copy) result: {result}")
        
        return jsonify({'post_id': result['post_id']})
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return jsonify({'error': f'VK API Error: {str(e)}'}), 400
    except Exception as e:
        print(f"[VK Service] Error in wall.copy: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('VK_SERVICE_PORT', 5000))
    print(f"=== Starting VK Service on port {port} ===")
    print(f"vk_api available: True")
    app.run(host='0.0.0.0', port=port, debug=False)
