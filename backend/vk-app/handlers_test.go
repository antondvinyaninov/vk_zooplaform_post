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
	"strings"
	"testing"
	"time"

	"backend/database"
	"backend/models"
	"backend/vk"

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

	// Insert mock vk account so parser/video fallback still has a user token
	_, err = database.DB.Exec(`
		INSERT INTO vk_accounts (vk_user_id, user_name, access_token, is_active, created_at, updated_at)
		VALUES ($1, 'Admin', 'mock_user_token', true, NOW(), NOW())
	`, vkUserID)
	require.NoError(t, err)

	return user
}

func setGroupWallToken(t *testing.T, vkGroupID int, token string) {
	t.Helper()
	_, err := database.DB.Exec(`UPDATE groups SET access_token = $1 WHERE vk_group_id = $2`, token, vkGroupID)
	require.NoError(t, err)
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

	setGroupWallToken(t, vkGroupID2, "mock_group_wall_token")

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

func TestCreatePostWithMedia(t *testing.T) {
	clearDB(t)

	vkUserID := 201
	vkGroupID := 301
	setupMockUser(t, vkUserID)

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	writer.WriteField("message", "Post with media")
	writer.WriteField("post_type_id", "cat_media")
	writer.WriteField("custom_fields", `[{"id":"field1","value":"test"}]`)
	
	// Simulate S3 media keys
	writer.WriteField("s3_media_keys", "test-video-123.mp4,test-image-123.jpg")
	
	writer.Close()

	req := httptest.NewRequest("POST", "/api/app/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=member", vkUserID, vkGroupID))

	w := httptest.NewRecorder()
	createPostHandler(w, req)

	res := w.Result()
	require.Equal(t, http.StatusOK, res.StatusCode, "Expected 200 OK, got: %s", w.Body.String())

	var createResp map[string]interface{}
	json.NewDecoder(res.Body).Decode(&createResp)
	postID := int(createResp["id"].(float64))

	// Verify DB state
	var s3Keys string
	err := database.DB.QueryRow("SELECT s3_video_key FROM posts WHERE id = $1", postID).Scan(&s3Keys)
	require.NoError(t, err)

	var customFields string
	err = database.DB.QueryRow("SELECT custom_fields::text FROM post_publications WHERE post_id = $1", postID).Scan(&customFields)
	require.NoError(t, err)

	require.Equal(t, "test-video-123.mp4,test-image-123.jpg", s3Keys)
	require.Contains(t, customFields, "field1")
}

func TestModerateRequiresGroupWallTokenNotVKConnect(t *testing.T) {
	clearDB(t)

	vkUserID := 555
	vkGroupID := 777
	setupMockUser(t, vkUserID)

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	writer.WriteField("message", "Need a group key to publish")
	writer.Close()

	req := httptest.NewRequest("POST", "/api/app/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=member", vkUserID, vkGroupID))
	w := httptest.NewRecorder()
	createPostHandler(w, req)
	require.Equal(t, http.StatusOK, w.Result().StatusCode, w.Body.String())

	var createResp map[string]interface{}
	require.NoError(t, json.NewDecoder(w.Result().Body).Decode(&createResp))
	postID := int(createResp["id"].(float64))

	modBody := bytes.NewBufferString(`{"status":"published"}`)
	reqMod := httptest.NewRequest("POST", fmt.Sprintf("/api/app/posts/%d/moderate", postID), modBody)
	reqMod.Header.Set("Content-Type", "application/json")
	reqMod.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=admin", vkUserID, vkGroupID))
	wMod := httptest.NewRecorder()
	moderatePostHandler(wMod, reqMod, postID)

	require.Equal(t, http.StatusBadRequest, wMod.Result().StatusCode, wMod.Body.String())
	require.NotContains(t, wMod.Body.String(), "please login at /vk-connect")
	require.Contains(t, wMod.Body.String(), "Стеной")
}

func TestModerateUsesGroupTokenWhenVKAccountExists(t *testing.T) {
	clearDB(t)

	vkUserID := 556
	vkGroupID := 778
	setupMockUser(t, vkUserID)

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	writer.WriteField("message", "Publish with group wall token")
	writer.Close()

	req := httptest.NewRequest("POST", "/api/app/posts", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=member", vkUserID, vkGroupID))
	w := httptest.NewRecorder()
	createPostHandler(w, req)
	require.Equal(t, http.StatusOK, w.Result().StatusCode, w.Body.String())

	var createResp map[string]interface{}
	require.NoError(t, json.NewDecoder(w.Result().Body).Decode(&createResp))
	postID := int(createResp["id"].(float64))

	setGroupWallToken(t, vkGroupID, "mock_group_wall_token")

	modBody := bytes.NewBufferString(`{"status":"published"}`)
	reqMod := httptest.NewRequest("POST", fmt.Sprintf("/api/app/posts/%d/moderate", postID), modBody)
	reqMod.Header.Set("Content-Type", "application/json")
	reqMod.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=admin", vkUserID, vkGroupID))
	wMod := httptest.NewRecorder()
	moderatePostHandler(wMod, reqMod, postID)
	require.Equal(t, http.StatusOK, wMod.Result().StatusCode, wMod.Body.String())

	time.Sleep(100 * time.Millisecond)
	var status string
	err := database.DB.QueryRow("SELECT status FROM post_publications WHERE post_id = $1", postID).Scan(&status)
	require.NoError(t, err)
	require.Equal(t, "published", status)
}

func TestSavePhotosUserTokenProbesWallUpload(t *testing.T) {
	clearDB(t)
	vkUserID := 81306887
	vkGroupID := 227624792
	setupMockUser(t, vkUserID)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if !strings.Contains(r.URL.Path, "photos.getWallUploadServer") {
			http.NotFound(w, r)
			return
		}
		_ = r.ParseForm()
		if r.FormValue("access_token") != "mini-app-photos" {
			fmt.Fprint(w, `{"error":{"error_code":27,"error_msg":"Group authorization failed: method is unavailable with group auth."}}`)
			return
		}
		fmt.Fprint(w, `{"response":{"upload_url":"https://pu.vk.com/u"}}`)
	}))
	t.Cleanup(srv.Close)

	prev := vk.VKAPIURL
	vk.VKAPIURL = srv.URL
	t.Cleanup(func() { vk.VKAPIURL = prev })

	body, _ := json.Marshal(map[string]string{"access_token": "mini-app-photos", "user_name": "Admin"})
	req := httptest.NewRequest("POST", "/api/app/photos-token", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=admin", vkUserID, vkGroupID))
	w := httptest.NewRecorder()
	savePhotosUserTokenHandler(w, req)
	require.Equal(t, http.StatusOK, w.Result().StatusCode, w.Body.String())

	var token string
	err := database.DB.QueryRow(`SELECT access_token FROM vk_accounts WHERE vk_user_id = $1 AND is_active = true`, vkUserID).Scan(&token)
	require.NoError(t, err)
	require.Equal(t, "mini-app-photos", token)
}

