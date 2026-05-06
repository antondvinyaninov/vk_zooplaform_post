package vkapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"backend/database"
	"backend/models"

	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

var testDBUrl string

func TestMain(m *testing.M) {
	os.Setenv("IS_TESTING", "true")
	ctx := context.Background()

	// Spin up PostgreSQL container
	pgContainer, err := postgres.Run(ctx,
		"postgres:15-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).WithStartupTimeout(10*time.Second)),
	)
	if err != nil {
		fmt.Printf("failed to start container: %s\n", err)
		os.Exit(1)
	}

	testDBUrl, err = pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		fmt.Printf("failed to get connection string: %s\n", err)
		os.Exit(1)
	}

	// Initialize database
	if err := database.Init(testDBUrl); err != nil {
		fmt.Printf("failed to init database: %s\n", err)
		os.Exit(1)
	}

	code := m.Run()

	// Teardown
	if err := pgContainer.Terminate(ctx); err != nil {
		fmt.Printf("failed to terminate container: %s\n", err)
	}

	os.Exit(code)
}

func clearDB(t *testing.T) {
	_, err := database.DB.Exec("TRUNCATE TABLE post_publications, posts, users, vk_accounts, groups CASCADE")
	require.NoError(t, err)
}

func setupMockUser(t *testing.T, vkUserID int) *models.User {
	user := &models.User{
		VKUserID:  vkUserID,
		FirstName: "Test",
		LastName:  "User",
		Photo200:  "https://example.com/photo.jpg",
	}
	err := database.DB.QueryRow(`
		INSERT INTO users (vk_user_id, first_name, last_name, photo_200, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING id
	`, user.VKUserID, user.FirstName, user.LastName, user.Photo200).Scan(&user.ID)
	require.NoError(t, err)

	// Insert mock vk account so getActiveVKToken() works
	_, err = database.DB.Exec(`
		INSERT INTO vk_accounts (vk_user_id, user_name, access_token, is_active, created_at, updated_at)
		VALUES ($1, 'Admin', 'mock_token_123', true, NOW(), NOW())
	`, vkUserID)
	require.NoError(t, err)

	return user
}

func TestCreatePostAndSuggest(t *testing.T) {
	clearDB(t)

	// Setup user
	vkUserID := 123456
	vkGroupID1 := 1001
	vkGroupID2 := 1002
	setupMockUser(t, vkUserID)

	// ==========================================
	// 1. Create a Post in Group 1
	// ==========================================
	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	writer.WriteField("message", "My test post")
	writer.WriteField("post_type_id", "cat_1")
	writer.WriteField("custom_fields", `[{"id":"age","value":"2"}]`)
	writer.Close()

	req := httptest.NewRequest("POST", "/api/app/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	// Mock VK signature
	req.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=member", vkUserID, vkGroupID1))

	w := httptest.NewRecorder()
	createPostHandler(w, req)

	res := w.Result()
	require.Equal(t, http.StatusOK, res.StatusCode, "Expected 200 OK for creating post")

	var createResp map[string]interface{}
	err := json.NewDecoder(res.Body).Decode(&createResp)
	require.NoError(t, err)

	postID := int(createResp["id"].(float64))
	require.NotZero(t, postID)

	// Check publication for Group 1
	var pubCount int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM post_publications WHERE post_id = $1 AND group_id = (SELECT id FROM groups WHERE vk_group_id = $2)", postID, vkGroupID1).Scan(&pubCount)
	require.NoError(t, err)
	require.Equal(t, 1, pubCount, "Publication should exist in group 1")

	// ==========================================
	// 2. Suggest Existing Post to Group 2
	// ==========================================
	suggestBody := new(bytes.Buffer)
	suggestWriter := multipart.NewWriter(suggestBody)
	suggestWriter.WriteField("post_type_id", "cat_2")
	suggestWriter.WriteField("custom_fields", `[{"id":"color","value":"black"}]`)
	suggestWriter.Close()

	reqSuggest := httptest.NewRequest("POST", fmt.Sprintf("/api/app/posts/%d/suggest", postID), suggestBody)
	reqSuggest.Header.Set("Content-Type", suggestWriter.FormDataContentType())
	reqSuggest.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=member", vkUserID, vkGroupID2))

	wSuggest := httptest.NewRecorder()
	suggestExistingPostHandler(wSuggest, reqSuggest, postID)

	resSuggest := wSuggest.Result()
	require.Equal(t, http.StatusOK, resSuggest.StatusCode, "Expected 200 OK for suggesting post")

	var suggestCount int
	var customFields string
	var status string
	err = database.DB.QueryRow("SELECT COUNT(*), MAX(custom_fields::text), MAX(status) FROM post_publications WHERE post_id = $1 AND group_id = (SELECT id FROM groups WHERE vk_group_id = $2)", postID, vkGroupID2).Scan(&suggestCount, &customFields, &status)
	require.NoError(t, err)
	require.Equal(t, 1, suggestCount, "Publication should exist in group 2")
	require.Contains(t, customFields, "color")
	require.Equal(t, "pending", status)

	// ==========================================
	// 3. Moderate Post in Group 2 (Approve)
	// ==========================================
	modBody := new(bytes.Buffer)
	modBody.WriteString(`{"status":"published"}`)
	reqMod := httptest.NewRequest("POST", fmt.Sprintf("/api/app/posts/%d/moderate", postID), modBody)
	reqMod.Header.Set("Content-Type", "application/json")
	// Must be admin of Group 2
	reqMod.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=admin", vkUserID, vkGroupID2))

	wMod := httptest.NewRecorder()
	moderatePostHandler(wMod, reqMod, postID)

	resMod := wMod.Result()
	require.Equal(t, http.StatusOK, resMod.StatusCode, "Expected 200 OK for moderation, got: %s", wMod.Body.String())

	// Wait for async goroutine to complete
	time.Sleep(100 * time.Millisecond)

	// Verify status is now published
	err = database.DB.QueryRow("SELECT status FROM post_publications WHERE post_id = $1 AND group_id = (SELECT id FROM groups WHERE vk_group_id = $2)", postID, vkGroupID2).Scan(&status)
	require.NoError(t, err)
	require.Equal(t, "published", status)
}

func TestSuggestExistingPostForbidden(t *testing.T) {
	clearDB(t)

	// User 1 creates post
	vkUserID1 := 101
	setupMockUser(t, vkUserID1)
	vkGroupID := 201

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	writer.WriteField("message", "Post by user 1")
	writer.Close()

	req := httptest.NewRequest("POST", "/api/app/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=member", vkUserID1, vkGroupID))

	w := httptest.NewRecorder()
	createPostHandler(w, req)
	var createResp map[string]interface{}
	json.NewDecoder(w.Result().Body).Decode(&createResp)
	postID := int(createResp["id"].(float64))

	// User 2 tries to suggest user 1's post
	vkUserID2 := 102
	setupMockUser(t, vkUserID2)

	suggestBody := new(bytes.Buffer)
	suggestWriter := multipart.NewWriter(suggestBody)
	suggestWriter.WriteField("post_type_id", "cat_1")
	suggestWriter.Close()

	reqSuggest := httptest.NewRequest("POST", fmt.Sprintf("/api/app/posts/%d/suggest", postID), suggestBody)
	reqSuggest.Header.Set("Content-Type", suggestWriter.FormDataContentType())
	reqSuggest.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=999&vk_viewer_group_role=member", vkUserID2))

	wSuggest := httptest.NewRecorder()
	suggestExistingPostHandler(wSuggest, reqSuggest, postID)

	require.Equal(t, http.StatusForbidden, wSuggest.Result().StatusCode, "User 2 should not be able to suggest User 1's post")
}
