package vk

import (
	"encoding/json"
	"fmt"
)

const (
	PermissionPhotos = 1 << 2  // 4
	PermissionVideo  = 1 << 4  // 16
	PermissionWall   = 1 << 13 // 8192
)

// AppPermissionsMask возвращает битовую маску прав пользовательского токена.
func (c *VKClient) AppPermissionsMask() (int, error) {
	raw, err := c.CallMethod("account.getAppPermissions", map[string]string{})
	if err != nil {
		return 0, err
	}
	var mask int
	if err := json.Unmarshal(raw, &mask); err != nil {
		return 0, fmt.Errorf("failed to parse account.getAppPermissions: %w", err)
	}
	return mask, nil
}
