package vkapp

import (
	"bytes"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFormatPostByLinkSourceUsesMobileFriendlyVKLink(t *testing.T) {
	got := formatPostByLinkSource("708719851_33210", "Ярослав Кривоносов")
	want := "\n\nИсточник: [https://vk.com/wall708719851_33210|Ярослав Кривоносов]"

	if got != want {
		t.Fatalf("unexpected source text:\nwant: %q\n got: %q", want, got)
	}
}

func TestFormatPostByLinkSourceSanitizesLinkText(t *testing.T) {
	got := formatPostByLinkSource("-123_456", "Группа [тест]|новости")

	if strings.Contains(got, "[тест]") || strings.Contains(got, "|новости|") {
		t.Fatalf("link text was not sanitized: %q", got)
	}
}

func TestPublishPostByLinkRequiresGroupToken(t *testing.T) {
	clearDB(t)
	vkUserID := 880
	vkGroupID := 990
	setupMockUser(t, vkUserID)

	// ensureGroup via a dummy post
	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	writer.WriteField("message", "seed group row for publish-by-link")
	writer.Close()
	seed := httptest.NewRequest("POST", "/api/app/posts", body)
	seed.Header.Set("Content-Type", writer.FormDataContentType())
	seed.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=member", vkUserID, vkGroupID))
	seedW := httptest.NewRecorder()
	createPostHandler(seedW, seed)
	require.Equal(t, http.StatusOK, seedW.Result().StatusCode, seedW.Body.String())

	req := httptest.NewRequest("POST", "/api/app/vk/publish-post-by-link", strings.NewReader(`{"message":"from link","attachments":""}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-vk-sign", fmt.Sprintf("vk_user_id=%d&vk_group_id=%d&vk_viewer_group_role=admin", vkUserID, vkGroupID))
	w := httptest.NewRecorder()
	appPublishPostByLinkHandler(w, req)
	require.Equal(t, http.StatusBadRequest, w.Result().StatusCode, w.Body.String())
	require.NotContains(t, w.Body.String(), "admin token")
	require.Contains(t, w.Body.String(), "Стеной")
}
