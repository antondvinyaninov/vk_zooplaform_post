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
	Description  string `json:"description"`
	City         *struct {
		ID    int    `json:"id"`
		Title string `json:"title"`
	} `json:"city"`
	Contacts []struct {
		UserID int    `json:"user_id"`
		Desc   string `json:"desc"`
		Phone  string `json:"phone"`
		Email  string `json:"email"`
	} `json:"contacts"`
	Links []struct {
		URL  string `json:"url"`
		Name string `json:"name"`
		Desc string `json:"desc"`
	} `json:"links"`
}

// GroupsGetByID получает информацию о группе по ID.
func (c *VKClient) GroupsGetByID(groupID int) (*Group, error) {
	params := map[string]string{
		"group_ids": strconv.Itoa(groupID),
		"fields":    "screen_name,photo_200,members_count",
	}

	resp, err := c.CallMethod("groups.getById", params)
	if err != nil {
		return nil, err
	}

	var groups []Group
	if err := json.Unmarshal(resp, &groups); err != nil {
		return nil, fmt.Errorf("failed to parse groups.getById response: %w", err)
	}

	if len(groups) == 0 {
		return nil, fmt.Errorf("group not found")
	}

	return &groups[0], nil
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

// GroupsSearchResponse ответ на поиск групп
type GroupsSearchResponse struct {
	Count int     `json:"count"`
	Items []Group `json:"items"`
}

// GroupsSearch ищет группы по строке запроса
func (c *VKClient) GroupsSearch(query string, cityID int, offset int, count int) (*GroupsSearchResponse, error) {
	params := map[string]string{
		"q":      query,
		"offset": strconv.Itoa(offset),
		"count":  strconv.Itoa(count),
	}

	if cityID > 0 {
		params["city_id"] = strconv.Itoa(cityID)
	}

	resp, err := c.CallMethod("groups.search", params)
	if err != nil {
		return nil, err
	}

	var searchResp GroupsSearchResponse
	if err := json.Unmarshal(resp, &searchResp); err != nil {
		return nil, fmt.Errorf("failed to parse groups.search response: %w", err)
	}

	return &searchResp, nil
}

// GroupsGetByIds получает расширенную информацию о группах по списку ID
func (c *VKClient) GroupsGetByIds(groupIds []string, fields string) ([]Group, error) {
	params := map[string]string{
		"group_ids": joinStrings(groupIds, ","),
	}
	if fields != "" {
		params["fields"] = fields
	}

	resp, err := c.CallMethod("groups.getById", params)
	if err != nil {
		return nil, err
	}

	var groups []Group
	if err := json.Unmarshal(resp, &groups); err != nil {
		return nil, fmt.Errorf("failed to parse groups.getById response: %w", err)
	}

	return groups, nil
}

// DatabaseGetCitiesByIdResponse response for getCitiesById
type DatabaseGetCitiesByIdResponse struct {
	ID    int    `json:"id"`
	Title string `json:"title"`
}

// DatabaseGetCitiesById gets cities by IDs
func (c *VKClient) DatabaseGetCitiesById(cityIds []int) ([]DatabaseGetCitiesByIdResponse, error) {
	if len(cityIds) == 0 {
		return nil, nil
	}

	var strIds []string
	for _, id := range cityIds {
		strIds = append(strIds, strconv.Itoa(id))
	}

	params := map[string]string{
		"city_ids": joinStrings(strIds, ","),
	}

	resp, err := c.CallMethod("database.getCitiesById", params)
	if err != nil {
		return nil, err
	}

	var cities []DatabaseGetCitiesByIdResponse
	if err := json.Unmarshal(resp, &cities); err != nil {
		return nil, fmt.Errorf("failed to parse database.getCitiesById response: %w", err)
	}

	return cities, nil
}

// DatabaseGetCitiesResponse response for getCities
type DatabaseGetCitiesResponse struct {
	Count int `json:"count"`
	Items []struct {
		ID     int    `json:"id"`
		Title  string `json:"title"`
		Region string `json:"region"`
	} `json:"items"`
}

// DatabaseGetCities searches cities by query
func (c *VKClient) DatabaseGetCities(query string) (*DatabaseGetCitiesResponse, error) {
	params := map[string]string{
		"q":          query,
		"country_id": "1", // Russia
		"need_all":   "1",
		"count":      "20",
	}

	resp, err := c.CallMethod("database.getCities", params)
	if err != nil {
		return nil, err
	}

	var cities DatabaseGetCitiesResponse
	if err := json.Unmarshal(resp, &cities); err != nil {
		return nil, fmt.Errorf("failed to parse database.getCities response: %w", err)
	}

	return &cities, nil
}
