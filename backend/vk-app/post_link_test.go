package vkapp

import (
	"strings"
	"testing"
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
