package vk

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestUploadPhotoToWallFallsBackToMessagesForGroupToken(t *testing.T) {
	var wallUploadHits, messagesHits, saveMessagesHits, saveWallHits int
	mux := http.NewServeMux()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mux.ServeHTTP(w, r)
	}))
	t.Cleanup(srv.Close)

	mux.HandleFunc("/photos.getWallUploadServer", func(w http.ResponseWriter, r *http.Request) {
		wallUploadHits++
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"error":{"error_code":27,"error_msg":"Group authorization failed: method is unavailable with group auth."}}`)
	})
	mux.HandleFunc("/photos.saveWallPhoto", func(w http.ResponseWriter, r *http.Request) {
		saveWallHits++
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"error":{"error_code":27,"error_msg":"Group authorization failed: method is unavailable with group auth."}}`)
	})
	mux.HandleFunc("/photos.getMessagesUploadServer", func(w http.ResponseWriter, r *http.Request) {
		messagesHits++
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"response": map[string]any{"upload_url": srv.URL + "/upload"},
		})
	})
	mux.HandleFunc("/upload", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"server":1,"photo":"[photo]","hash":"h"}`)
	})
	mux.HandleFunc("/photos.saveMessagesPhoto", func(w http.ResponseWriter, r *http.Request) {
		saveMessagesHits++
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"response":[{"id":456239034,"owner_id":-227624792,"sizes":[{"url":"https://example.com/p.jpg","type":"x"}]}]}`)
	})

	prev := VKAPIURL
	VKAPIURL = srv.URL
	t.Cleanup(func() { VKAPIURL = prev })

	tmp := filepath.Join(t.TempDir(), "t.jpg")
	if err := os.WriteFile(tmp, []byte("jpeg-bytes"), 0o644); err != nil {
		t.Fatal(err)
	}

	client := NewVKClient("group-community-key")
	client.HTTPClient = srv.Client()
	att, url, err := client.UploadPhotoToWall(tmp, "227624792")
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	if att != "photo-227624792_456239034" {
		t.Fatalf("attachment %q", att)
	}
	if url != "https://example.com/p.jpg" {
		t.Fatalf("url %q", url)
	}
	if wallUploadHits != 1 {
		t.Fatalf("expected wall upload probe, hits=%d", wallUploadHits)
	}
	if messagesHits != 1 || saveMessagesHits != 1 {
		t.Fatalf("messages path hits upload=%d save=%d", messagesHits, saveMessagesHits)
	}
	if saveWallHits != 0 {
		t.Fatalf("should not call saveWallPhoto after 27, hits=%d", saveWallHits)
	}
	if strings.Contains(att, "group-community-key") {
		t.Fatal("token leaked into attachment")
	}
}
