package internal

import (
	"backend/database"
	"backend/models"
	"backend/vk"
	"database/sql"
	"time"
)

// GroupService сервис для работы с группами
type GroupService struct{}

// NewGroupService создает новый сервис групп
func NewGroupService() *GroupService {
	return &GroupService{}
}

// Create создает новую группу в БД
func (s *GroupService) Create(group *models.Group) error {
	query := `
		INSERT INTO groups (vk_group_id, name, screen_name, photo_200, access_token, is_active)
		VALUES (?, ?, ?, ?, ?, ?)
	`
	if err := database.QueryRow(query+` RETURNING id`,
		group.VKGroupID,
		group.Name,
		group.ScreenName,
		group.Photo200,
		group.AccessToken,
		group.IsActive,
	).Scan(&group.ID); err != nil {
		return err
	}
	group.CreatedAt = time.Now()
	group.UpdatedAt = time.Now()

	go vk.EnsureCallbackServer(group)

	return nil
}

// GetByID получает группу по ID
func (s *GroupService) GetByID(id int) (*models.Group, error) {
	query := `
		SELECT id, vk_group_id, name, screen_name, photo_200, access_token, is_active, created_at, updated_at
		FROM groups
		WHERE id = ?
	`

	group := &models.Group{}
	err := database.QueryRow(query, id).Scan(
		&group.ID,
		&group.VKGroupID,
		&group.Name,
		&group.ScreenName,
		&group.Photo200,
		&group.AccessToken,
		&group.IsActive,
		&group.CreatedAt,
		&group.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return group, nil
}

// GetByVKGroupID получает группу по VK ID
func (s *GroupService) GetByVKGroupID(vkGroupID int) (*models.Group, error) {
	query := `
		SELECT id, vk_group_id, name, screen_name, photo_200, access_token, is_active, created_at, updated_at
		FROM groups
		WHERE vk_group_id = ?
	`

	group := &models.Group{}
	err := database.QueryRow(query, vkGroupID).Scan(
		&group.ID,
		&group.VKGroupID,
		&group.Name,
		&group.ScreenName,
		&group.Photo200,
		&group.AccessToken,
		&group.IsActive,
		&group.CreatedAt,
		&group.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return group, nil
}

// GetAll получает все активные группы
func (s *GroupService) GetAll() ([]*models.Group, error) {
	query := `
		SELECT id, vk_group_id, name, screen_name, photo_200, access_token, is_active, created_at, updated_at
		FROM groups
		WHERE is_active = ?
		ORDER BY created_at DESC
	`

	rows, err := database.Query(query, true)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []*models.Group
	for rows.Next() {
		group := &models.Group{}
		err := rows.Scan(
			&group.ID,
			&group.VKGroupID,
			&group.Name,
			&group.ScreenName,
			&group.Photo200,
			&group.AccessToken,
			&group.IsActive,
			&group.CreatedAt,
			&group.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}

	return groups, nil
}

// Update обновляет группу
func (s *GroupService) Update(group *models.Group) error {
	query := `
		UPDATE groups
		SET name = ?, screen_name = ?, photo_200 = ?, access_token = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`
	_, err := database.Exec(query,
		group.Name,
		group.ScreenName,
		group.Photo200,
		group.AccessToken,
		group.IsActive,
		group.ID,
	)
	if err == nil {
		go vk.EnsureCallbackServer(group)
	}
	return err
}

// Delete удаляет группу (мягкое удаление)
func (s *GroupService) Delete(id int) error {
	query := `UPDATE groups SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := database.Exec(query, false, id)
	return err
}
