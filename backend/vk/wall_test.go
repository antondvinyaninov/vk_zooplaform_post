package vk

import "testing"

func TestCleanWallAttachmentsDropsEmptyNullAndUndefined(t *testing.T) {
	got := cleanWallAttachments([]string{"", " null ", "undefined", "photo1_2", "video3_4_key"})
	want := []string{"photo1_2", "video3_4_key"}

	if len(got) != len(want) {
		t.Fatalf("unexpected attachment count: want %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("unexpected attachment at %d: want %q, got %q", i, want[i], got[i])
		}
	}
}
