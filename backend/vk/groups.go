package vk

import (
	"encoding/json"
	"fmt"
	"strconv"
)

// GroupsGetResponse ответ на получение групп
type GroupsGetResponse struct {
	Count int     `json:"count"`
	Items []Group `json:"items"`
}

// Group группа
type Group struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	ScreenName   string `json:"screen_name"`
	Photo50      string `json:"photo_50"`
	Photo100     string `json:"photo_100"`
	Photo200     string `json:"photo_200"`
	MembersCount int    `json:"members_count"`
}

// GroupsGet получает список групп пользователя
func (c *VKClient) GroupsGet(extended bool, filter string) (*GroupsGetResponse, error) {
	params := map[string]string{}

	if extended {
		params["extended"] = "1"
	}

	if filter != "" {
		params["filter"] = filter
	}

	resp, err := c.CallMethod("groups.get", params)
	if err != nil {
		return nil, err
	}

	var groupsResp GroupsGetResponse
	if err := json.Unmarshal(resp, &groupsResp); err != nil {
		return nil, fmt.Errorf("failed to parse groups.get response: %w", err)
	}

	return &groupsResp, nil
}

// User пользователь
type User struct {
	ID        int    `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Photo50   string `json:"photo_50"`
	Photo100  string `json:"photo_100"`
	Photo200  string `json:"photo_200"`
}

// UsersGet получает информацию о пользователях
func (c *VKClient) UsersGet(userIDs []string, fields []string) ([]User, error) {
	params := map[string]string{}

	if len(userIDs) > 0 {
		params["user_ids"] = joinStrings(userIDs, ",")
	}

	if len(fields) > 0 {
		params["fields"] = joinStrings(fields, ",")
	}

	resp, err := c.CallMethod("users.get", params)
	if err != nil {
		return nil, err
	}

	var users []User
	if err := json.Unmarshal(resp, &users); err != nil {
		return nil, fmt.Errorf("failed to parse users.get response: %w", err)
	}

	return users, nil
}

// joinStrings объединяет строки
func joinStrings(strs []string, sep string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}

// GetUserByID получает информацию о пользователе по ID
func (c *VKClient) GetUserByID(userID int, fields []string) (*User, error) {
	users, err := c.UsersGet([]string{strconv.Itoa(userID)}, fields)
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return nil, fmt.Errorf("user not found")
	}

	return &users[0], nil
}
