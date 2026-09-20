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

func TestUploadPhotoToWallDoesNotUseMessagesAlbum(t *testing.T) {
	var wallUploadHits, messagesHits int
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
	mux.HandleFunc("/photos.getMessagesUploadServer", func(w http.ResponseWriter, r *http.Request) {
		messagesHits++
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"response":{"upload_url":"http://example.invalid/upload"}}`)
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
	_, _, err := client.UploadPhotoToWall(tmp, "227624792")
	if err == nil {
		t.Fatal("expected VK 27 to fail, not silently attach a messages photo")
	}
	if !IsUnavailableWithGroupAuth(err) {
		t.Fatalf("want group-auth 27, got %v", err)
	}
	if messagesHits != 0 {
		t.Fatalf("must not call messages upload, hits=%d", messagesHits)
	}
	if wallUploadHits != 1 {
		t.Fatalf("wall upload hits=%d", wallUploadHits)
	}

	_, _, err = UploadPhotoForGroupWall(client, "", tmp, "227624792")
	if err == nil || !strings.Contains(err.Error(), "не видны") {
		t.Fatalf("expected visible-photo error, got %v", err)
	}
}

func TestUploadPhotoForGroupWallFallsBackToUserToken(t *testing.T) {
	mux := http.NewServeMux()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mux.ServeHTTP(w, r)
	}))
	t.Cleanup(srv.Close)

	mux.HandleFunc("/photos.getWallUploadServer", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		token := r.FormValue("access_token")
		w.Header().Set("Content-Type", "application/json")
		if token == "group-community-key" {
			io.WriteString(w, `{"error":{"error_code":27,"error_msg":"Group authorization failed: method is unavailable with group auth."}}`)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{
			"response": map[string]any{"upload_url": srv.URL + "/upload"},
		})
	})
	mux.HandleFunc("/upload", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"server":1,"photo":"[photo]","hash":"h"}`)
	})
	mux.HandleFunc("/photos.saveWallPhoto", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		if r.FormValue("access_token") == "group-community-key" {
			w.Header().Set("Content-Type", "application/json")
			io.WriteString(w, `{"error":{"error_code":27,"error_msg":"Group authorization failed: method is unavailable with group auth."}}`)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"response":[{"id":99,"owner_id":-227624792,"access_key":"ak","sizes":[{"url":"https://example.com/w.jpg","type":"x"}]}]}`)
	})

	prev := VKAPIURL
	VKAPIURL = srv.URL
	t.Cleanup(func() { VKAPIURL = prev })

	tmp := filepath.Join(t.TempDir(), "t.jpg")
	if err := os.WriteFile(tmp, []byte("jpeg-bytes"), 0o644); err != nil {
		t.Fatal(err)
	}

	groupClient := NewVKClient("group-community-key")
	groupClient.HTTPClient = srv.Client()
	att, url, err := UploadPhotoForGroupWall(groupClient, "user-photos-token", tmp, "227624792")
	if err != nil {
		t.Fatalf("fallback upload: %v", err)
	}
	if att != "photo-227624792_99_ak" {
		t.Fatalf("attachment %q", att)
	}
	if url != "https://example.com/w.jpg" {
		t.Fatalf("url %q", url)
	}
}
