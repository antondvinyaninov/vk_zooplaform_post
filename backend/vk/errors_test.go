package vk

import (
	"errors"
	"strings"
	"testing"

	"backend/models"
)

func TestRequireWallToken(t *testing.T) {
	if _, err := RequireWallToken(nil); err == nil || err.Error() != GroupWallTokenMissing {
		t.Fatalf("nil group: %v", err)
	}
	if _, err := RequireWallToken(&models.Group{}); err == nil {
		t.Fatal("expected missing token")
	}
	got, err := RequireWallToken(&models.Group{AccessToken: "  group-key  "})
	if err != nil || got != "group-key" {
		t.Fatalf("got %q err %v", got, err)
	}
}

func TestIsUnavailableWithGroupAuth(t *testing.T) {
	err := &VKError{ErrorCode: 27, ErrorMsg: "Group authorization failed: method is unavailable with group auth."}
	if !IsUnavailableWithGroupAuth(err) {
		t.Fatal("expected 27 to match")
	}
	wrapped := errors.Join(errors.New("failed to get upload server"), err)
	if !IsUnavailableWithGroupAuth(wrapped) {
		t.Fatal("wrapped 27 should match")
	}
	if IsUnavailableWithGroupAuth(&VKError{ErrorCode: 15, ErrorMsg: "Access denied"}) {
		t.Fatal("15 is not group-auth-unavailable")
	}
}

func TestExplainWallErrorDoesNotSendUserToVKConnect(t *testing.T) {
	msg := ExplainWallError(&VKError{ErrorCode: 15, ErrorMsg: "Access denied"})
	if strings.Contains(msg, "please login") || strings.Contains(msg, "login at /vk-connect") {
		t.Fatalf("misleading error: %q", msg)
	}
	if !strings.Contains(msg, "Стена") {
		t.Fatalf("expected wall-key hint, got %q", msg)
	}
	photoMsg := ExplainWallError(errors.New(GroupCannotUploadWallPhoto))
	if !strings.Contains(photoMsg, "не видны") {
		t.Fatalf("photo error should explain invisible messages photos, got %q", photoMsg)
	}
}
