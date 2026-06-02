package vkapp

import "testing"

func TestMissingAttachmentIDsIgnoresNullAttachments(t *testing.T) {
	missing := missingAttachmentIDs(
		[]string{"null", "", "photo81306887_457320642"},
		[]string{"photo81306887_457320642"},
	)

	if len(missing) != 0 {
		t.Fatalf("expected no missing attachments, got %v", missing)
	}
}

func TestMissingAttachmentIDsAllowsVKPhotoIDRewrite(t *testing.T) {
	missing := missingAttachmentIDs(
		[]string{"photo81306887_457320642", "photo81306887_457320643"},
		[]string{"photo-35069181_457487658", "photo-35069181_457487659"},
	)

	if len(missing) != 0 {
		t.Fatalf("expected rewritten VK photo ids to pass by photo count, got %v", missing)
	}
}

func TestMissingAttachmentIDsKeepsExactVideoCheck(t *testing.T) {
	missing := missingAttachmentIDs(
		[]string{"video81306887_12345_accesskey"},
		[]string{"video81306887_99999"},
	)

	if len(missing) != 1 || missing[0] != "video81306887_12345_accesskey" {
		t.Fatalf("expected video to stay missing without exact id match, got %v", missing)
	}
}
