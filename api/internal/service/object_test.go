package service

import (
	"fmt"
	"reflect"
	"strings"
	"testing"
)

func distinctTags(n int) []string {
	tags := make([]string, n)
	for i := range tags {
		tags[i] = fmt.Sprintf("tag%d", i)
	}
	return tags
}

func TestSanitizeTags(t *testing.T) {
	tests := []struct {
		name string
		tags []string
		want []string
	}{
		{name: "trims whitespace", tags: []string{"  gramatica  "}, want: []string{"gramatica"}},
		{name: "drops empty/whitespace-only tags", tags: []string{"", "  ", "verbos"}, want: []string{"verbos"}},
		{name: "dedupes exact repeats after trimming", tags: []string{"ingles", " ingles "}, want: []string{"ingles"}},
		{
			// Legado do processor (keywords de até 4 palavras via YAKE) pode gerar tags
			// acima do limite -- isso nunca deve bloquear o save inteiro, só encurtar.
			name: "truncates a tag longer than the max length instead of rejecting it",
			tags: []string{strings.Repeat("a", MaxTagLength+5)},
			want: []string{strings.Repeat("a", MaxTagLength)},
		},
		{
			name: "accepts a tag exactly at the max length",
			tags: []string{strings.Repeat("a", MaxTagLength)},
			want: []string{strings.Repeat("a", MaxTagLength)},
		},
		{
			name: "dedupes tags that collide only after truncation",
			tags: []string{strings.Repeat("a", MaxTagLength) + "1", strings.Repeat("a", MaxTagLength) + "2"},
			want: []string{strings.Repeat("a", MaxTagLength)},
		},
		{
			name: "allows exactly MaxTagsPerObject distinct tags",
			tags: distinctTags(MaxTagsPerObject),
			want: distinctTags(MaxTagsPerObject),
		},
		{
			name: "caps at MaxTagsPerObject, keeping the first ones (assumed most relevant first)",
			tags: distinctTags(MaxTagsPerObject + 10),
			want: distinctTags(MaxTagsPerObject),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sanitizeTags(tt.tags)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("sanitizeTags(%v) = %v, want %v", tt.tags, got, tt.want)
			}
		})
	}
}
