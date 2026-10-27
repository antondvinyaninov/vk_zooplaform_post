package admin

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
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
	vkOAuthStateCookie    = "vk_oauth_state"
	vkOAuthVerifierCookie = "vk_oauth_verifier"
	vkOAuthScope          = "photos video wall groups"
)

type vkIDTokenResponse struct {
	AccessToken      string `json:"access_token"`
	RefreshToken     string `json:"refresh_token"`
	ExpiresIn        int    `json:"expires_in"`
	UserID           int    `json:"user_id"`
	Scope            string `json:"scope"`
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

func vkOAuthStartHandler(w http.ResponseWriter, r *http.Request) {
	state, err := randomHex(32)
	if err != nil {
		http.Error(w, "failed to create oauth state", http.StatusInternalServerError)
		return
	}
	verifier, err := randomURLSafe(48)
	if err != nil {
		http.Error(w, "failed to create code verifier", http.StatusInternalServerError)
		return
	}

	secure := isSecureRequest(r)
	setOAuthCookie(w, vkOAuthStateCookie, state, 600, secure)
	setOAuthCookie(w, vkOAuthVerifierCookie, verifier, 600, secure)

	cfg := config.Load()
	params := url.Values{}
	params.Set("response_type", "code")
	params.Set("client_id", cfg.VKClientID)
	params.Set("redirect_uri", oauthRedirectURI(r, cfg))
	params.Set("state", state)
	params.Set("code_challenge", pkceChallenge(verifier))
	params.Set("code_challenge_method", "S256")
	params.Set("scope", vkOAuthScope)
	params.Set("prompt", "consent")

	http.Redirect(w, r, "https://id.vk.ru/authorize?"+params.Encode(), http.StatusTemporaryRedirect)
}

func vkOAuthCallbackHandler(w http.ResponseWriter, r *http.Request) {
	state := strings.TrimSpace(r.URL.Query().Get("state"))
	stateCookie, stateErr := r.Cookie(vkOAuthStateCookie)
	verifierCookie, verifierErr := r.Cookie(vkOAuthVerifierCookie)
	if stateErr != nil || verifierErr != nil || stateCookie.Value == "" || verifierCookie.Value == "" || stateCookie.Value != state {
		redirectOAuthError(w, r, "state_mismatch")
		return
	}

	secure := isSecureRequest(r)
	setOAuthCookie(w, vkOAuthStateCookie, "", -1, secure)
	setOAuthCookie(w, vkOAuthVerifierCookie, "", -1, secure)

	if vkErr := strings.TrimSpace(r.URL.Query().Get("error")); vkErr != "" {
		redirectOAuthError(w, r, vkErr)
		return
	}

	code := strings.TrimSpace(r.URL.Query().Get("code"))
	deviceID := strings.TrimSpace(r.URL.Query().Get("device_id"))
	if code == "" || deviceID == "" {
		redirectOAuthError(w, r, "no_code")
		return
	}

	cfg := config.Load()
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("code_verifier", verifierCookie.Value)
	form.Set("redirect_uri", oauthRedirectURI(r, cfg))
	form.Set("client_id", cfg.VKClientID)
	form.Set("device_id", deviceID)
	form.Set("state", state)
	if strings.TrimSpace(cfg.VKServiceKey) != "" {
		form.Set("service_token", cfg.VKServiceKey)
	}

	token, err := exchangeVKIDToken(r.Context(), form)
	if err != nil {
		log.Printf("[VK OAuth] token exchange failed: %v", err)
		redirectOAuthError(w, r, "exchange_failed")
		return
	}

	api := vk.NewVKClient(token.AccessToken)
	mask := 0
	if !scopeHas(token.Scope, "photos") || !scopeHas(token.Scope, "video") {
		if value, maskErr := api.AppPermissionsMask(); maskErr == nil {
			mask = value
		}
	}
	missing := missingScopes(token.Scope, mask)
	if len(missing) > 0 {
		redirectOAuthMissingScope(w, r, missing, mask)
		return
	}

	userName, userPhoto := "", ""
	if user, userErr := api.GetUserByID(token.UserID, []string{"photo_200"}); userErr == nil && user != nil {
		userName = strings.TrimSpace(user.FirstName + " " + user.LastName)
		userPhoto = user.Photo200
	}
	if userName == "" {
		userName = fmt.Sprintf("VK %d", token.UserID)
	}

	expiresAt := int64(0)
	if token.ExpiresIn > 0 {
		expiresAt = time.Now().Add(time.Duration(token.ExpiresIn) * time.Second).UnixMilli()
	}
	if err := upsertVKAccountFull(
		token.AccessToken,
		token.RefreshToken,
		deviceID,
		token.Scope,
		token.UserID,
		userName,
		userPhoto,
		expiresAt,
	); err != nil {
		log.Printf("[VK OAuth] save account failed: %v", err)
		redirectOAuthError(w, r, "save_failed")
		return
	}

	models.LogInfo(
		"VK_OAUTH_CONNECTED",
		"Подключён VK ID аккаунт для загрузки медиа",
		nil,
		fmt.Sprintf("VK ID: %d, scope: %s, permissions mask: %d", token.UserID, token.Scope, mask),
	)

	http.Redirect(w, r, "/vk-connect?connected=1", http.StatusTemporaryRedirect)
}

func exchangeVKIDToken(ctx context.Context, form url.Values) (*vkIDTokenResponse, error) {
	token, err := postVKIDToken(ctx, form)
	if err != nil && form.Get("service_token") != "" {
		form.Del("service_token")
		token, err = postVKIDToken(ctx, form)
	}
	return token, err
}

func postVKIDToken(ctx context.Context, form url.Values) (*vkIDTokenResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://id.vk.ru/oauth2/auth", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var token vkIDTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		return nil, fmt.Errorf("VK ID response: %w", err)
	}
	if token.Error != "" || token.AccessToken == "" {
		return &token, fmt.Errorf("VK ID: %s (%s)", token.Error, token.ErrorDescription)
	}
	return &token, nil
}

func setOAuthCookie(w http.ResponseWriter, name, value string, maxAge int, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func randomHex(bytesCount int) (string, error) {
	buf := make([]byte, bytesCount)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func randomURLSafe(bytesCount int) (string, error) {
	buf := make([]byte, bytesCount)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func pkceChallenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func oauthRedirectURI(r *http.Request, cfg *config.Config) string {
	base := strings.TrimRight(strings.TrimSpace(cfg.PublicBaseURL), "/")
	if base == "" {
		scheme := "https"
		if !isSecureRequest(r) {
			scheme = "http"
		}
		base = scheme + "://" + r.Host
	}
	return base + "/api/vk/oauth/callback"
}

func isSecureRequest(r *http.Request) bool {
	return r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

func scopeHas(scope string, required string) bool {
	for _, item := range strings.FieldsFunc(scope, func(r rune) bool {
		return r == ' ' || r == ',' || r == '+'
	}) {
		if strings.EqualFold(item, required) {
			return true
		}
	}
	return false
}

func missingScopes(scope string, mask int) []string {
	var missing []string
	if !scopeHas(scope, "photos") && mask&vk.PermissionPhotos == 0 {
		missing = append(missing, "photos")
	}
	if !scopeHas(scope, "video") && mask&vk.PermissionVideo == 0 {
		missing = append(missing, "video")
	}
	return missing
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

// vkOAuthTokenHandler оставлен для обратной совместимости старого маршрута.
func vkOAuthTokenHandler(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
