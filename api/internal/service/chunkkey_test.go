package service

import (
	"reflect"
	"testing"
)

func TestBuildChunkKeyMatchesTheProcessorFormat(t *testing.T) {
	// O mesmo exemplo do teste do processor (api/processor/tests/test_vector_ids.py).
	if got, want := buildChunkKey("obj_abc", 14, 0), "vec_obj_abc_14_0"; got != want {
		t.Errorf("buildChunkKey() = %q, want %q", got, want)
	}
}

func TestParseChunkKey(t *testing.T) {
	tests := []struct {
		name   string
		key    string
		want   chunkPosition
		wantOk bool
	}{
		{name: "simple", key: "vec_obj_abc_14_0", want: chunkPosition{ObjectId: "obj_abc", Page: 14, ChunkIndex: 0}, wantOk: true},
		{
			name:   "object id with a uuid",
			key:    "vec_obj_3f2a9c1e-7b44-4d1a-9e0f-1a2b3c4d5e6f_2_17",
			want:   chunkPosition{ObjectId: "obj_3f2a9c1e-7b44-4d1a-9e0f-1a2b3c4d5e6f", Page: 2, ChunkIndex: 17},
			wantOk: true,
		},
		{name: "old random id", key: "vec_3f2a9c1e-7b44-4d1a-9e0f-1a2b3c4d5e6f"},
		{name: "wrong prefix", key: "chunk_obj_abc_1_0"},
		{name: "missing index", key: "vec_obj_abc_1"},
		{name: "non numeric index", key: "vec_obj_abc_1_x"},
		{name: "non numeric page", key: "vec_obj_abc_p_0"},
		{name: "page zero", key: "vec_obj_abc_0_0"},
		{name: "negative index", key: "vec_obj_abc_1_-1"},
		{name: "empty object id", key: "vec__1_0"},
		{name: "empty", key: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := parseChunkKey(tt.key)
			if ok != tt.wantOk || (ok && got != tt.want) {
				t.Errorf("parseChunkKey(%q) = (%+v, %v), want (%+v, %v)", tt.key, got, ok, tt.want, tt.wantOk)
			}
		})
	}
}

func TestChunkKeyRoundTrip(t *testing.T) {
	for _, objectId := range []string{"obj_abc", "obj_3f2a9c1e-7b44-4d1a-9e0f-1a2b3c4d5e6f", "obj_with_many_underscores"} {
		key := buildChunkKey(objectId, 7, 12)
		got, ok := parseChunkKey(key)
		if !ok || got != (chunkPosition{ObjectId: objectId, Page: 7, ChunkIndex: 12}) {
			t.Errorf("round trip of %q gave (%+v, %v)", key, got, ok)
		}
	}
}

func TestNeighborKeys(t *testing.T) {
	if got, want := neighborKeys("vec_obj_abc_3_0"), []string{"vec_obj_abc_3_1"}; !reflect.DeepEqual(got, want) {
		t.Errorf("first chunk of a page: got %v, want %v", got, want)
	}
	if got, want := neighborKeys("vec_obj_abc_3_5"), []string{"vec_obj_abc_3_6", "vec_obj_abc_3_4"}; !reflect.DeepEqual(got, want) {
		t.Errorf("middle chunk: got %v, want %v", got, want)
	}
	if got := neighborKeys("not a chunk key"); got != nil {
		t.Errorf("unparseable key: got %v, want nil", got)
	}
}

func TestSupportFor(t *testing.T) {
	next := RetrievedChunk{Key: "vec_obj_abc_3_6", Content: "next"}
	previous := RetrievedChunk{Key: "vec_obj_abc_3_4", Content: "previous"}

	t.Run("prefers the next chunk", func(t *testing.T) {
		got, ok := supportFor("vec_obj_abc_3_5", map[string]RetrievedChunk{next.Key: next, previous.Key: previous})
		if !ok || got.Content != "next" {
			t.Errorf("got (%+v, %v), want the next chunk", got, ok)
		}
	})

	t.Run("falls back to the previous chunk at the end of a page", func(t *testing.T) {
		got, ok := supportFor("vec_obj_abc_3_5", map[string]RetrievedChunk{previous.Key: previous})
		if !ok || got.Content != "previous" {
			t.Errorf("got (%+v, %v), want the previous chunk", got, ok)
		}
	})

	t.Run("no neighbor available", func(t *testing.T) {
		if _, ok := supportFor("vec_obj_abc_3_5", map[string]RetrievedChunk{}); ok {
			t.Error("expected no support chunk")
		}
	})
}
