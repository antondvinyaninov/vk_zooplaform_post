package vk

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"backend/models"
)

// Error implements the error interface for VK API errors.
func (e *VKError) Error() string {
	if e == nil {
		return "VK API Error"
	}
	return fmt.Sprintf("VK API Error [%d]: %s", e.ErrorCode, e.ErrorMsg)
}

func AsVKError(err error) *VKError {
	var vkErr *VKError
	if errors.As(err, &vkErr) {
		return vkErr
	}
	return nil
}

func IsUnavailableWithGroupAuth(err error) bool {
	if err == nil {
		return false
	}
	if e := AsVKError(err); e != nil {
		if e.ErrorCode == 27 {
			return true
		}
		return strings.Contains(strings.ToLower(e.ErrorMsg), "unavailable with group auth")
	}
	return strings.Contains(strings.ToLower(err.Error()), "unavailable with group auth")
}

func IsUserAuthorizationFailed(err error) bool {
	if e := AsVKError(err); e != nil {
		return e.ErrorCode == 5
	}
	return err != nil && strings.Contains(err.Error(), "User authorization failed")
}

const GroupWallTokenMissing = "У сообщества нет ключа API со Стеной (Настройки группы → Работа с API). Публикация идёт этим ключом, а не через /vk-connect."

const GroupCannotUploadWallPhoto = "Ключ сообщества не загружает фото на стену: photos.getWallUploadServer даёт VK 27. Фото из альбома сообщений на стене не видны. Нужен user-токен с правом photos только для загрузки файла; публикация (wall.post) остаётся ключом группы."

const PhotosUserTokenRejected = "Сервер не принял токен Mini App (VK ошибка 5). Это ожидаемо: такой токен часто работает только внутри приложения. Нажмите «Разрешить загрузку фото» ещё раз и дождитесь окна прав photos — после проверки из Mini App токен сохранится."

func ExplainPhotosUserTokenError(err error) string {
	if err == nil {
		return ""
	}
	if e := AsVKError(err); e != nil {
		switch e.ErrorCode {
		case 5:
			return PhotosUserTokenRejected + " Ответ VK: " + e.ErrorMsg
		case 15:
			return "VK не дал photos.getWallUploadServer (ошибка 15). Нужно право photos у Mini App и чтобы вы были админом этой группы."
		case 27:
			return "Передан ключ сообщества, а для загрузки фото на стену нужен личный токен. Нажмите «Разрешить загрузку фото»."
		default:
			return fmt.Sprintf("Не удалось проверить загрузку фото (VK %d): %s", e.ErrorCode, e.ErrorMsg)
		}
	}
	return "Не удалось проверить загрузку фото: " + err.Error()
}

func WallToken(group *models.Group) string {
	if group == nil {
		return ""
	}
	return strings.TrimSpace(group.AccessToken)
}

func RequireWallToken(group *models.Group) (string, error) {
	token := WallToken(group)
	if token == "" {
		return "", errors.New(GroupWallTokenMissing)
	}
	return token, nil
}

func NewWallClient(group *models.Group) (*VKClient, error) {
	token, err := RequireWallToken(group)
	if err != nil {
		return nil, err
	}
	return NewVKClient(token), nil
}

func ExplainWallError(err error) string {
	if err == nil {
		return ""
	}
	if e := AsVKError(err); e != nil {
		switch e.ErrorCode {
		case 5:
			low := strings.ToLower(e.ErrorMsg)
			if strings.Contains(low, "blocked") {
				return "VK заблокировал user-авторизацию (ошибка 5: user is blocked). Это Kate-токен из /vk-connect после флуда, не ключ из Настройки группы → Работа с API."
			}
			if strings.Contains(low, "invalid access_token") {
				return "VK отклонил токен (ошибка 5: invalid access_token). На проде это обычно протухший user-токен из /vk-connect. wall.post должен идти ключом сообщества; мёртвый Kate-токен публикации не спасёт."
			}
			return "Ключ сообщества отклонён VK (ошибка 5). Проверьте ключ в Настройки группы → Работа с API — это не логин на /vk-connect."
		case 9:
			return "VK ограничил частоту запросов (ошибка 9 Flood control). Один user-токен на все группы быстро ловит флуд и потом бан. Публикация wall.post — ключом сообщества."
		case 18:
			return "VK: пользователь удалён или забанен (ошибка 18). Это аккаунт user-токена, не ключ сообщества."
		case 15, 214:
			return "VK отказал в публикации на стену (ошибка " + strconv.Itoa(e.ErrorCode) + "). Ключ сохранён, но без права «Стена», либо это токен Mini App Bridge. Нужен ключ из Работа с API с галкой Стена."
		case 27:
			return "Метод недоступен ключу сообщества: " + e.ErrorMsg
		}
	}
	msg := err.Error()
	if strings.Contains(msg, GroupCannotUploadWallPhoto) {
		return GroupCannotUploadWallPhoto
	}
	if strings.Contains(msg, GroupWallTokenMissing) {
		return GroupWallTokenMissing
	}
	return "Не удалось опубликовать на стену группы: " + msg
}
