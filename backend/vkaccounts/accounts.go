package vkaccounts

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"backend/config"
	"backend/database"
)

var (
	ErrNoToken      = errors.New("no active VK token")
	ErrTokenExpired = errors.New("active VK token expired")
)

type Account struct {
	ID           int
	VKUserID     int
	AccessToken  string
	RefreshToken string
	DeviceID     string
	Scope        string
	ExpiresAt    int64
}

type tokenResponse struct {
	AccessToken      string `json:"access_token"`
	RefreshToken     string `json:"refresh_token"`
	ExpiresIn        int    `json:"expires_in"`
	UserID           int    `json:"user_id"`
	Scope            string `json:"scope"`
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

func ActiveToken(ctx context.Context, cfg *config.Config) (string, error) {
	account, err := ActiveAccount(ctx, cfg)
	if err != nil {
		return "", err
	}
	if account == nil || account.AccessToken == "" {
		return "", ErrNoToken
	}
	return account.AccessToken, nil
}

func ActiveAccount(ctx context.Context, cfg *config.Config) (*Account, error) {
	var account Account
	err := database.QueryRow(`
		SELECT id, COALESCE(vk_user_id, 0), COALESCE(access_token, ''),
		       COALESCE(refresh_token, ''), COALESCE(device_id, ''),
		       COALESCE(scope, ''), COALESCE(token_expires, 0)
		FROM vk_accounts
		WHERE is_active = ?
		ORDER BY updated_at DESC
		LIMIT 1
	`, true).Scan(
		&account.ID,
		&account.VKUserID,
		&account.AccessToken,
		&account.RefreshToken,
		&account.DeviceID,
		&account.Scope,
		&account.ExpiresAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrNoToken
	}
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(account.AccessToken) == "" {
		return nil, ErrNoToken
	}
	if account.ExpiresAt == 0 || account.ExpiresAt > time.Now().Add(2*time.Minute).UnixMilli() {
		return &account, nil
	}
	if strings.TrimSpace(account.RefreshToken) == "" {
		return nil, ErrTokenExpired
	}
	return refresh(ctx, cfg, &account)
}

func refresh(ctx context.Context, cfg *config.Config, account *Account) (*Account, error) {
	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("refresh_token", account.RefreshToken)
	form.Set("client_id", cfg.VKClientID)
	form.Set("device_id", account.DeviceID)
	form.Set("state", randomState())
	if strings.TrimSpace(cfg.VKServiceKey) != "" {
		form.Set("service_token", cfg.VKServiceKey)
	}

	resp, err := postToken(ctx, form)
	if err != nil && form.Get("service_token") != "" {
		form.Del("service_token")
		resp, err = postToken(ctx, form)
	}
	if err != nil {
		return nil, err
	}

	refreshToken := strings.TrimSpace(resp.RefreshToken)
	if refreshToken == "" {
		refreshToken = account.RefreshToken
	}
	expiresAt := int64(0)
	if resp.ExpiresIn > 0 {
		expiresAt = time.Now().Add(time.Duration(resp.ExpiresIn) * time.Second).UnixMilli()
	}

	_, err = database.Exec(`
		UPDATE vk_accounts
		SET access_token = ?, refresh_token = ?, token_expires = ?, scope = ?,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, resp.AccessToken, refreshToken, expiresAt, resp.Scope, account.ID)
	if err != nil {
		return nil, err
	}

	account.AccessToken = resp.AccessToken
	account.RefreshToken = refreshToken
	account.Scope = resp.Scope
	account.ExpiresAt = expiresAt
	return account, nil
}

func postToken(ctx context.Context, form url.Values) (*tokenResponse, error) {
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

	var token tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		return nil, fmt.Errorf("VK ID token response: %w", err)
	}
	if token.Error != "" || token.AccessToken == "" {
		return &token, fmt.Errorf("VK ID: %s (%s)", token.Error, token.ErrorDescription)
	}
	return &token, nil
}

func randomState() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}
