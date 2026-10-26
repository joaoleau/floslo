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
			tags: []string{strings.Repeat("a", DefaultTagLimits.MaxLength+5)},
			want: []string{strings.Repeat("a", DefaultTagLimits.MaxLength)},
		},
		{
			// O limite conta caracteres, não bytes: "ç" tem 2 bytes em UTF-8.
			name: "counts characters, not bytes, for accented tags",
			tags: []string{strings.Repeat("ç", DefaultTagLimits.MaxLength)},
			want: []string{strings.Repeat("ç", DefaultTagLimits.MaxLength)},
		},
		{
			name: "truncates an accented tag on a character boundary",
			tags: []string{strings.Repeat("ç", DefaultTagLimits.MaxLength+3)},
			want: []string{strings.Repeat("ç", DefaultTagLimits.MaxLength)},
		},
		{
			name: "accepts a tag exactly at the max length",
			tags: []string{strings.Repeat("a", DefaultTagLimits.MaxLength)},
			want: []string{strings.Repeat("a", DefaultTagLimits.MaxLength)},
		},
		{
			name: "dedupes tags that collide only after truncation",
			tags: []string{strings.Repeat("a", DefaultTagLimits.MaxLength) + "1", strings.Repeat("a", DefaultTagLimits.MaxLength) + "2"},
			want: []string{strings.Repeat("a", DefaultTagLimits.MaxLength)},
		},
		{
			name: "allows exactly DefaultTagLimits.MaxPerObject distinct tags",
			tags: distinctTags(DefaultTagLimits.MaxPerObject),
			want: distinctTags(DefaultTagLimits.MaxPerObject),
		},
		{
			name: "caps at DefaultTagLimits.MaxPerObject, keeping the first ones (assumed most relevant first)",
			tags: distinctTags(DefaultTagLimits.MaxPerObject + 10),
			want: distinctTags(DefaultTagLimits.MaxPerObject),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sanitizeTags(tt.tags, DefaultTagLimits)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("sanitizeTags(%v) = %v, want %v", tt.tags, got, tt.want)
			}
		})
	}
}

func TestSanitizeTagsUsesTheConfiguredLimits(t *testing.T) {
	limits := TagLimits{MaxLength: 5, MaxPerObject: 2}

	got := sanitizeTags([]string{"abcdefgh", "xyz", "outra"}, limits)

	want := []string{"abcde", "xyz"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("sanitizeTags with %+v = %v, want %v", limits, got, want)
	}
}

func TestTagLimitsWithDefaultsFillsOnlyTheUnsetLimits(t *testing.T) {
	if got := (TagLimits{}).withDefaults(); got != DefaultTagLimits {
		t.Errorf("zero limits = %+v, want %+v", got, DefaultTagLimits)
	}

	got := TagLimits{MaxLength: 10}.withDefaults()
	want := TagLimits{MaxLength: 10, MaxPerObject: DefaultMaxTagsPerObject}
	if got != want {
		t.Errorf("partial limits = %+v, want %+v", got, want)
	}
}

func TestDefaultTagLimitsMatchTheProcessor(t *testing.T) {
	// TAG_MAX_LENGTH vale 32 também no processor (api/processor/handlers/processor.py) e no app.
	if DefaultTagLimits.MaxLength != 32 {
		t.Errorf("default max tag length = %d, want 32", DefaultTagLimits.MaxLength)
	}
	// O processor devolve até TAG_REFINER_MAX_TAGS (200) tags: o backend não pode cortar abaixo disso.
	if DefaultTagLimits.MaxPerObject < 200 {
		t.Errorf("default max tags per object = %d, want at least the 200 the processor returns", DefaultTagLimits.MaxPerObject)
	}
}
