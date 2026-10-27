package admin

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"backend/config"
	"backend/models"
	"backend/vk"
)

const (
	vkOAuthStateCookie = "vk_oauth_state"
	vkOAuthScope       = "photos,video,wall,offline,groups"
)

func vkOAuthStartHandler(w http.ResponseWriter, r *http.Request) {
	state, err := newOAuthState()
	if err != nil {
		http.Error(w, "failed to create oauth state", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     vkOAuthStateCookie,
		Value:    state,
		Path:     "/",
		HttpOnly: true,
		Secure:   isSecureRequest(r),
		SameSite: http.SameSiteLaxMode,
		MaxAge:   600,
	})

	cfg := config.Load()
	params := url.Values{}
	params.Set("client_id", cfg.VKClientID)
	params.Set("redirect_uri", oauthRedirectURI(r, cfg))
	params.Set("display", "page")
	params.Set("scope", vkOAuthScope)
	params.Set("response_type", "code")
	params.Set("v", "5.199")
	params.Set("state", state)

	http.Redirect(w, r, "https://oauth.vk.com/authorize?"+params.Encode(), http.StatusTemporaryRedirect)
}

func vkOAuthCallbackHandler(w http.ResponseWriter, r *http.Request) {
	state := strings.TrimSpace(r.URL.Query().Get("state"))
	cookie, err := r.Cookie(vkOAuthStateCookie)
	if err != nil || cookie.Value == "" || state == "" || cookie.Value != state {
		redirectOAuthError(w, r, "state_mismatch")
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     vkOAuthStateCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   isSecureRequest(r),
		SameSite: http.SameSiteLaxMode,
	})

	if vkErr := strings.TrimSpace(r.URL.Query().Get("error")); vkErr != "" {
		redirectOAuthError(w, r, vkErr)
		return
	}

	code := strings.TrimSpace(r.URL.Query().Get("code"))
	if code == "" {
		redirectOAuthError(w, r, "no_code")
		return
	}

	cfg := config.Load()
	redirectURI := oauthRedirectURI(r, cfg)
	tokenURL := "https://oauth.vk.com/access_token?" + url.Values{
		"client_id":     {cfg.VKClientID},
		"client_secret": {cfg.VKClientSecret},
		"redirect_uri":  {redirectURI},
		"code":          {code},
		"v":             {"5.199"},
	}.Encode()

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Get(tokenURL)
	if err != nil {
		log.Printf("[VK OAuth] exchange failed: %v", err)
		redirectOAuthError(w, r, "exchange_failed")
		return
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken      string `json:"access_token"`
		ExpiresIn        int    `json:"expires_in"`
		UserID           int    `json:"user_id"`
		Scope            string `json:"scope"`
		Error            string `json:"error"`
		ErrorDescription string `json:"error_description"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		log.Printf("[VK OAuth] decode failed: %v", err)
		redirectOAuthError(w, r, "decode_failed")
		return
	}
	if tokenResp.Error != "" || tokenResp.AccessToken == "" {
		log.Printf("[VK OAuth] VK error: %s (%s)", tokenResp.Error, tokenResp.ErrorDescription)
		redirectOAuthError(w, r, "vk_"+firstNonEmpty(tokenResp.Error, "no_token"))
		return
	}

	api := vk.NewVKClient(tokenResp.AccessToken)
	mask, err := api.AppPermissionsMask()
	if err != nil {
		log.Printf("[VK OAuth] permissions check failed: %v", err)
		redirectOAuthError(w, r, "permissions_failed")
		return
	}
	missing := missingPermissions(mask, vk.PermissionPhotos, vk.PermissionVideo)
	if len(missing) > 0 {
		redirectOAuthMissingScope(w, r, missing, mask)
		return
	}

	userName, userPhoto := "", ""
	if user, userErr := api.GetUserByID(tokenResp.UserID, []string{"photo_200"}); userErr == nil && user != nil {
		userName = strings.TrimSpace(user.FirstName + " " + user.LastName)
		userPhoto = user.Photo200
	}
	if userName == "" {
		userName = fmt.Sprintf("VK %d", tokenResp.UserID)
	}

	var tokenExpires int64
	if tokenResp.ExpiresIn > 0 {
		tokenExpires = time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second).UnixMilli()
	}
	if err := upsertVKAccount(tokenResp.AccessToken, tokenResp.UserID, userName, userPhoto, tokenExpires); err != nil {
		log.Printf("[VK OAuth] save account failed: %v", err)
		redirectOAuthError(w, r, "save_failed")
		return
	}

	models.LogInfo(
		"VK_OAUTH_CONNECTED",
		"Подключён VK-аккаунт для загрузки медиа",
		nil,
		fmt.Sprintf("VK ID: %d, scope: %s, permissions mask: %d", tokenResp.UserID, tokenResp.Scope, mask),
	)

	http.Redirect(w, r, "/vk-connect?connected=1", http.StatusTemporaryRedirect)
}

// vkOAuthTokenHandler оставлен для обратной совместимости старого маршрута.
func vkOAuthTokenHandler(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func newOAuthState() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func oauthRedirectURI(r *http.Request, cfg *config.Config) string {
	base := strings.TrimRight(strings.TrimSpace(cfg.PublicBaseURL), "/")
	if base == "" {
		scheme := "https"
		if r.TLS == nil && !strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
			scheme = "http"
		}
		base = scheme + "://" + r.Host
	}
	return base + "/api/vk/oauth/callback"
}

func isSecureRequest(r *http.Request) bool {
	return r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

func missingPermissions(mask int, required ...int) []string {
	var missing []string
	if mask&vk.PermissionPhotos == 0 {
		missing = append(missing, "photos")
	}
	if mask&vk.PermissionVideo == 0 {
		missing = append(missing, "video")
	}
	for _, bit := range required {
		switch bit {
		case vk.PermissionPhotos:
			if mask&vk.PermissionPhotos == 0 && !contains(missing, "photos") {
				missing = append(missing, "photos")
			}
		case vk.PermissionVideo:
			if mask&vk.PermissionVideo == 0 && !contains(missing, "video") {
				missing = append(missing, "video")
			}
		case vk.PermissionWall:
			if mask&vk.PermissionWall == 0 && !contains(missing, "wall") {
				missing = append(missing, "wall")
			}
		}
	}
	return missing
}

func contains(items []string, value string) bool {
	for _, item := range items {
		if item == value {
			return true
		}
	}
	return false
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func redirectOAuthError(w http.ResponseWriter, r *http.Request, code string) {
	http.Redirect(w, r, "/vk-connect?error="+url.QueryEscape(code), http.StatusTemporaryRedirect)
}

func redirectOAuthMissingScope(w http.ResponseWriter, r *http.Request, missing []string, mask int) {
	params := url.Values{}
	params.Set("error", "missing_scope")
	params.Set("need", strings.Join(missing, ","))
	params.Set("mask", fmt.Sprintf("%d", mask))
	http.Redirect(w, r, "/vk-connect?"+params.Encode(), http.StatusTemporaryRedirect)
}
