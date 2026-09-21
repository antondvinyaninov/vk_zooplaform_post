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

func TestProbeWallPhotoUploadAcceptsUserToken(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if !strings.Contains(r.URL.Path, "photos.getWallUploadServer") {
			http.NotFound(w, r)
			return
		}
		_ = r.ParseForm()
		if r.FormValue("access_token") == "mini-app-user" {
			json.NewEncoder(w).Encode(map[string]any{
				"response": map[string]any{"upload_url": "https://pu.vk.com/upload"},
			})
			return
		}
		io.WriteString(w, `{"error":{"error_code":27,"error_msg":"Group authorization failed: method is unavailable with group auth."}}`)
	}))
	t.Cleanup(srv.Close)
	prev := VKAPIURL
	VKAPIURL = srv.URL
	t.Cleanup(func() { VKAPIURL = prev })

	ok := NewVKClient("mini-app-user")
	ok.HTTPClient = srv.Client()
	if err := ok.ProbeWallPhotoUpload("227624792"); err != nil {
		t.Fatalf("user token should probe ok: %v", err)
	}
	bad := NewVKClient("group-key")
	bad.HTTPClient = srv.Client()
	if err := bad.ProbeWallPhotoUpload("227624792"); !IsUnavailableWithGroupAuth(err) {
		t.Fatalf("group key should be 27, got %v", err)
	}
}

func TestIsAllowedVKUploadURL(t *testing.T) {
	if !IsAllowedVKUploadURL("https://pu.vk.com/c123/upload.php?act=add") {
		t.Fatal("pu.vk.com must be allowed")
	}
	if !IsAllowedVKUploadURL("https://pu.vk.ru/upload") {
		t.Fatal("vk.ru must be allowed")
	}
	if IsAllowedVKUploadURL("https://evil.example/upload") {
		t.Fatal("foreign host must be rejected")
	}
	if IsAllowedVKUploadURL("not-a-url") {
		t.Fatal("garbage must be rejected")
	}
}

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
	if err == nil {
		t.Fatal("without user token, VK 27 must fail rather than attach a messages photo")
	}
	if messagesHits != 0 {
		t.Fatalf("must not call messages upload after 27, hits=%d", messagesHits)
	}
}

func TestUploadPhotoForGroupWallFallsBackToUserToken(t *testing.T) {
	mux := http.NewServeMux()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mux.ServeHTTP(w, r)
	}))
	t.Cleanup(srv.Close)

	mux.HandleFunc("/photos.getMessagesUploadServer", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"error":{"error_code":27,"error_msg":"Group authorization failed: method is unavailable with group auth."}}`)
	})
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

func TestUploadPhotoForGroupWallUsesGroupAlbumAfter27(t *testing.T) {
	var messagesHits, saveHits int
	mux := http.NewServeMux()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mux.ServeHTTP(w, r)
	}))
	t.Cleanup(srv.Close)

	mux.HandleFunc("/photos.getWallUploadServer", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"error":{"error_code":27,"error_msg":"Group authorization failed: method is unavailable with group auth."}}`)
	})
	mux.HandleFunc("/photos.getMessagesUploadServer", func(w http.ResponseWriter, r *http.Request) {
		messagesHits++
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"response": map[string]any{"upload_url": srv.URL + "/mupload"}})
	})
	mux.HandleFunc("/photos.getAlbums", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"response": map[string]any{
				"count": 1,
				"items": []map[string]any{{"id": 555, "title": "ЗооПлатформа"}},
			},
		})
	})
	mux.HandleFunc("/photos.getUploadServer", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		if r.FormValue("album_id") != "555" || r.FormValue("group_id") != "168099183" {
			t.Errorf("getUploadServer album=%s group=%s", r.FormValue("album_id"), r.FormValue("group_id"))
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"response": map[string]any{"upload_url": srv.URL + "/aupload", "album_id": 555},
		})
	})
	mux.HandleFunc("/aupload", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"server":7,"photos_list":"[album-photo]","hash":"ah"}`)
	})
	mux.HandleFunc("/photos.save", func(w http.ResponseWriter, r *http.Request) {
		saveHits++
		_ = r.ParseForm()
		if r.FormValue("photos_list") != "[album-photo]" && r.FormValue("photos") != "[album-photo]" {
			t.Errorf("photos.save payload missing, form=%v", r.PostForm)
		}
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"response":[{"id":88,"owner_id":-168099183,"access_key":"gk","sizes":[{"url":"https://example.com/g.jpg","type":"x"}]}]}`)
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
	att, gotURL, err := UploadPhotoForGroupWall(client, "", tmp, "168099183")
	if err != nil {
		t.Fatalf("album upload: %v", err)
	}
	if att != "photo-168099183_88_gk" {
		t.Fatalf("attachment %q", att)
	}
	if gotURL != "https://example.com/g.jpg" {
		t.Fatalf("url %q", gotURL)
	}
	if messagesHits != 0 {
		t.Fatalf("messages album must not be used, hits=%d", messagesHits)
	}
	if saveHits == 0 {
		t.Fatal("photos.save was not called")
	}
}

func TestUploadPhotoForGroupWallSkipsMessagesAlbum(t *testing.T) {
	messagesHits := 0
	mux := http.NewServeMux()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mux.ServeHTTP(w, r)
	}))
	t.Cleanup(srv.Close)

	mux.HandleFunc("/photos.getWallUploadServer", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"error":{"error_code":27,"error_msg":"Group authorization failed: method is unavailable with group auth."}}`)
	})
	mux.HandleFunc("/photos.getMessagesUploadServer", func(w http.ResponseWriter, r *http.Request) {
		messagesHits++
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"response": map[string]any{"upload_url": srv.URL + "/mupload"}})
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
	if _, _, err := UploadPhotoForGroupWall(client, "", tmp, "227624792"); err == nil {
		t.Fatal("expected error without user token")
	}
	if messagesHits != 0 {
		t.Fatalf("messages album must not be used, hits=%d", messagesHits)
	}
}
