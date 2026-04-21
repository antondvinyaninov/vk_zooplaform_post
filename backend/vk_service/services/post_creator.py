"""
Создание и публикация постов в VK
"""
import os
import tempfile
import vk_api
from flask import jsonify
from utils.vk_session import get_vk_session


def create_post(data, request_files):
    """
    Публикация поста на стене с поддержкой фото и видео
    
    Args:
        data: dict с параметрами (access_token, owner_id, message, from_group, publish_date)
        request_files: файлы из request.files
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        token = data.get('access_token')
        owner_id = data.get('owner_id')
        message = data.get('message', '')
        from_group = data.get('from_group', '1')
        publish_date = data.get('publish_date')
        
        if not token or not owner_id:
            print(f"[VK Service] Missing parameters")
            return {'error': 'Missing required parameters'}, 400
        
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
        if 'photos' in request_files:
            photos = request_files.getlist('photos')
            print(f"[VK Service] Uploading {len(photos)} photos")
            
            for photo_file in photos:
                try:
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
                        photo_file.save(tmp.name)
                        tmp_path = tmp.name
                    
                    photo = upload.photo_wall(tmp_path, group_id=owner_id.replace('-', ''))[0]
                    attachments.append(f"photo{photo['owner_id']}_{photo['id']}")
                    print(f"[VK Service] Photo uploaded: photo{photo['owner_id']}_{photo['id']}")
                    
                    os.unlink(tmp_path)
                except Exception as e:
                    print(f"[VK Service] Error uploading photo: {e}")
                    import traceback
                    traceback.print_exc()
        
        # Обрабатываем видео
        if 'video' in request_files:
            video_file = request_files['video']
            print(f"[VK Service] Uploading video: {video_file.filename}")
            
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
                    video_file.save(tmp.name)
                    tmp_path = tmp.name
                
                video = upload.video(
                    video_file=tmp_path,
                    name=video_file.filename,
                    group_id=owner_id.replace('-', '')
                )
                
                attachments.append(f"video{video['owner_id']}_{video['video_id']}")
                print(f"[VK Service] Video uploaded: video{video['owner_id']}_{video['video_id']}")
                
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
        
        return {'post_id': result['post_id']}, 200
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return {'error': f'VK API Error: {str(e)}'}, 400
    except Exception as e:
        print(f"[VK Service] Error in wall.post: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}, 500


def repost_post(data):
    """
    Репост записи в группу
    
    Args:
        data: dict с параметрами (access_token, object, group_id)
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        token = data.get('access_token')
        object_id = data.get('object')
        group_id = data.get('group_id')
        
        if not token or not object_id or not group_id:
            print(f"[VK Service] Missing parameters")
            return {'error': 'Missing required parameters'}, 400
        
        vk_session = get_vk_session(token)
        api = vk_session['api']
        print(f"[VK Service] Calling wall.repost for object: {object_id}, group_id: {group_id}")
        
        result = api.wall.repost(
            object=object_id,
            group_id=group_id
        )
        
        print(f"[VK Service] wall.repost result: {result}")
        
        return {
            'post_id': result['post_id'],
            'reposts_count': result.get('reposts_count', 0),
            'likes_count': result.get('likes_count', 0)
        }, 200
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return {'error': f'VK API Error: {str(e)}'}, 400
    except Exception as e:
        print(f"[VK Service] Error in wall.repost: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}, 500


def copy_post(data):
    """
    Копирование поста (публикация с теми же вложениями)
    
    Args:
        data: dict с параметрами (access_token, owner_id, message, attachments, from_group)
    
    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        token = data.get('access_token')
        owner_id = data.get('owner_id')
        message = data.get('message', '')
        attachments = data.get('attachments', '')
        from_group = data.get('from_group', 1)
        
        if not token or not owner_id:
            print(f"[VK Service] Missing parameters")
            return {'error': 'Missing required parameters'}, 400
        
        vk_session = get_vk_session(token)
        api = vk_session['api']
        print(f"[VK Service] Calling wall.post (copy) for owner_id: {owner_id}")
        
        post_params = {
            'owner_id': owner_id,
            'message': message,
            'from_group': int(from_group)
        }
        
        if attachments:
            post_params['attachments'] = attachments
        
        result = api.wall.post(**post_params)
        
        print(f"[VK Service] wall.post (copy) result: {result}")
        
        return {'post_id': result['post_id']}, 200
        
    except vk_api.exceptions.ApiError as e:
        print(f"[VK Service] VK API Error: {e}")
        return {'error': f'VK API Error: {str(e)}'}, 400
    except Exception as e:
        print(f"[VK Service] Error in wall.copy: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}, 500
