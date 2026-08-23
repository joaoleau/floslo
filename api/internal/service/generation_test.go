package service

import "testing"

func TestParseWrappedArray(t *testing.T) {
	tests := []struct {
		name      string
		raw       string
		wantCount int
		wantErr   bool
	}{
		{
			name:      "wrapped object (requested shape)",
			raw:       `{"flashcards":[{"content":"a","tag":"t"},{"content":"b","tag":"t"}]}`,
			wantCount: 2,
		},
		{
			// Regression test: Bedrock has been observed dropping the {"flashcards": [...]}
			// envelope and returning the bare array directly, which used to hard-fail with
			// "cannot unmarshal array into Go value of type struct{...}" (a real 500 seen in
			// production). parseWrappedArray must tolerate this shape too.
			name:      "bare array (observed model drift)",
			raw:       `[{"content":"a","tag":"t"},{"content":"b","tag":"t"}]`,
			wantCount: 2,
		},
		{
			name:    "garbage",
			raw:     `not json at all`,
			wantErr: true,
		},
		{
			name:    "wrapped object missing the key and not an array either",
			raw:     `{"something_else": 1}`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			items, err := parseWrappedArray[rawFlashcard](tt.raw, "flashcards")
			if (err != nil) != tt.wantErr {
				t.Fatalf("parseWrappedArray() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err == nil && len(items) != tt.wantCount {
				t.Fatalf("expected %d items, got %d", tt.wantCount, len(items))
			}
		})
	}
}

func TestRawFlashcardResolveContent(t *testing.T) {
	tests := []struct {
		name string
		card rawFlashcard
		want string
	}{
		{
			name: "content present",
			card: rawFlashcard{Content: "did you know..."},
			want: "did you know...",
		},
		{
			// Regression test: the model has been observed drifting back to a front/back,
			// question-style shape despite the prompt explicitly asking for "content" --
			// resolveContent must degrade gracefully instead of shipping a blank card.
			name: "front+back fallback (observed model drift)",
			card: rawFlashcard{Front: "What is X?", Back: "X is Y."},
			want: "What is X? X is Y.",
		},
		{
			name: "text fallback",
			card: rawFlashcard{Text: "some fact"},
			want: "some fact",
		},
		{
			name: "fact fallback",
			card: rawFlashcard{Fact: "some other fact"},
			want: "some other fact",
		},
		{
			name: "title-only last resort",
			card: rawFlashcard{Title: "just a hook, no body"},
			want: "just a hook, no body",
		},
		{
			name: "nothing usable",
			card: rawFlashcard{Tag: "t"},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.card.resolveContent(); got != tt.want {
				t.Fatalf("resolveContent() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestRawFlashcardResolveTitle(t *testing.T) {
	tests := []struct {
		name string
		card rawFlashcard
		want string
	}{
		{
			name: "title present",
			card: rawFlashcard{Title: "A short hook"},
			want: "A short hook",
		},
		{
			name: "no title falls back to empty (content-only card)",
			card: rawFlashcard{Content: "a fact with no separate hook"},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.card.resolveTitle(); got != tt.want {
				t.Fatalf("resolveTitle() = %q, want %q", got, tt.want)
			}
		})
	}
}
