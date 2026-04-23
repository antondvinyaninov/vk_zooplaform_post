package internal

import (
	"backend/database"
	"backend/models"
	"database/sql"
	"time"
)

// UserService сервис для работы с пользователями
type UserService struct{}

// NewUserService создает новый сервис пользователей
func NewUserService() *UserService {
	return &UserService{}
}

// Create создает нового пользователя в БД
func (s *UserService) Create(user *models.User) error {
	query := `
		INSERT INTO users (vk_user_id, first_name, last_name, photo_200, role)
		VALUES (?, ?, ?, ?, ?)
	`
	if err := database.QueryRow(query+` RETURNING id`,
		user.VKUserID,
		user.FirstName,
		user.LastName,
		user.Photo200,
		user.Role,
	).Scan(&user.ID); err != nil {
		return err
	}
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	return nil
}

// GetByID получает пользователя по ID
func (s *UserService) GetByID(id int) (*models.User, error) {
	query := `
		SELECT id, vk_user_id, first_name, last_name, photo_200, role, created_at, updated_at
		FROM users
		WHERE id = ?
	`

	user := &models.User{}
	err := database.QueryRow(query, id).Scan(
		&user.ID,
		&user.VKUserID,
		&user.FirstName,
		&user.LastName,
		&user.Photo200,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

// GetByVKUserID получает пользователя по VK ID
func (s *UserService) GetByVKUserID(vkUserID int) (*models.User, error) {
	query := `
		SELECT id, vk_user_id, first_name, last_name, photo_200, role, created_at, updated_at
		FROM users
		WHERE vk_user_id = ?
	`

	user := &models.User{}
	err := database.QueryRow(query, vkUserID).Scan(
		&user.ID,
		&user.VKUserID,
		&user.FirstName,
		&user.LastName,
		&user.Photo200,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

// GetOrCreate получает или создает пользователя
func (s *UserService) GetOrCreate(vkUserID int, firstName, lastName, photo200 string) (*models.User, error) {
	// Пытаемся найти существующего
	user, err := s.GetByVKUserID(vkUserID)
	if err != nil {
		return nil, err
	}

	// Если нашли - возвращаем
	if user != nil {
		return user, nil
	}

	// Если не нашли - создаем
	user = &models.User{
		VKUserID:  vkUserID,
		FirstName: firstName,
		LastName:  lastName,
		Photo200:  photo200,
		Role:      "user",
	}

	err = s.Create(user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// Update обновляет пользователя
func (s *UserService) Update(user *models.User) error {
	query := `
		UPDATE users
		SET first_name = ?, last_name = ?, photo_200 = ?, role = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`
	_, err := database.Exec(query,
		user.FirstName,
		user.LastName,
		user.Photo200,
		user.Role,
		user.ID,
	)
	return err
}
