package service

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"sort"
	"strings"
	"testing"

	"github.com/joaoleau/floslo/internal/model"
)

func TestIsUsableFocus(t *testing.T) {
	paragraph := strings.Repeat("The mitochondria produce most of the energy that the cell needs to work. ", 6)

	tests := []struct {
		name    string
		content string
		want    bool
	}{
		{name: "regular paragraph", content: paragraph, want: true},
		{name: "text with accents", content: strings.Repeat("A respiração celular acontece nas mitocôndrias e produz energia. ", 6), want: true},
		{name: "too short", content: "Chapter 3. The cell", want: false},
		{name: "empty", content: "", want: false},
		{name: "only whitespace", content: strings.Repeat(" \n\t ", 100), want: false},
		{
			name:    "table of contents with dot leaders",
			content: strings.Repeat("Introduction ........ 3\nThe cell ........ 12\nEnergy ........ 27\n", 6),
			want:    false,
		},
		{name: "mostly numbers", content: strings.Repeat("12 34 56 78 90 11 22 33 44 55 66 77 ", 12), want: false},
		{name: "mostly symbols", content: strings.Repeat("----- ===== ***** ##### ", 30), want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isUsableFocus(tt.content); got != tt.want {
				t.Errorf("isUsableFocus() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestBuildGenerationSlots(t *testing.T) {
	available := map[string]RetrievedChunk{}
	for _, key := range []string{"vec_obj_a_1_0", "vec_obj_a_1_1", "vec_obj_a_1_2", "vec_obj_a_1_4", "vec_obj_a_1_5", "vec_obj_a_1_6"} {
		available[key] = RetrievedChunk{Key: key, Content: "content of " + key}
	}
	selected := []SelectedSlot{
		{ChallengerIndex: 0, Chunk: available["vec_obj_a_1_0"], Tag: "t0"},
		{ChallengerIndex: 0, Chunk: available["vec_obj_a_1_1"], Tag: "t1"},
		{ChallengerIndex: 1, Chunk: available["vec_obj_a_1_5"], Tag: "t5"},
	}

	slots := buildGenerationSlots(selected, available)

	if len(slots) != 3 {
		t.Fatalf("got %d slots, want 3", len(slots))
	}

	// vec_obj_a_1_1 é foco de outra vaga, então não pode servir de apoio para vec_obj_a_1_0.
	if slots[0].slot.Support != nil {
		t.Errorf("the first slot should have no support, got %q", slots[0].slot.Support.Key)
	}
	if support := slots[1].slot.Support; support == nil || support.Key != "vec_obj_a_1_2" {
		t.Errorf("the second slot should be supported by its next neighbor, got %+v", support)
	}
	if support := slots[2].slot.Support; support == nil || support.Key != "vec_obj_a_1_6" {
		t.Errorf("the third slot should be supported by its next neighbor, got %+v", support)
	}
	if slots[2].challengerIndex != 1 {
		t.Errorf("the third slot belongs to challenger %d, want 1", slots[2].challengerIndex)
	}
	for i, want := range []string{"t0", "t1", "t5"} {
		if slots[i].slot.Tag != want {
			t.Errorf("slot %d tag = %q, want %q (the tag that found its chunk)", i, slots[i].slot.Tag, want)
		}
	}
}

func TestAssignSlotsFillsEveryItemInChallengerOrder(t *testing.T) {
	challengers := []model.Challenger{
		{ChallengeType: model.ChallengeTypeMultipleChoice, MultipleChoice: &model.MultipleChoiceChallengeConfig{QuestionCount: 2}},
		{ChallengeType: model.ChallengeTypeDiscovery, Discovery: &model.DiscoveryChallengeConfig{DiscoveryCount: 1}},
	}
	chunks := foundChunks("c1", "c2", "c3", "c4")

	selected := assignSlots(challengers, chunks)

	var got []string
	for _, slot := range selected {
		got = append(got, fmt.Sprintf("%d:%s:%s", slot.ChallengerIndex, slot.Chunk.Key, slot.Tag))
	}
	if want := []string{"0:c1:tag-c1", "0:c2:tag-c2", "1:c3:tag-c3"}; !reflect.DeepEqual(got, want) {
		t.Errorf("slots = %v, want %v", got, want)
	}
}

func TestAssignSlotsRepeatsChunksWhenTheDocumentIsSmall(t *testing.T) {
	challengers := []model.Challenger{
		{ChallengeType: model.ChallengeTypeMultipleChoice, MultipleChoice: &model.MultipleChoiceChallengeConfig{QuestionCount: 3}},
		{ChallengeType: model.ChallengeTypeTrueFalse, TrueFalse: &model.TrueFalseChallengeConfig{QuestionCount: 2}},
	}
	chunks := foundChunks("c1", "c2")

	selected := assignSlots(challengers, chunks)

	var got []string
	for _, slot := range selected {
		got = append(got, fmt.Sprintf("%d:%s", slot.ChallengerIndex, slot.Chunk.Key))
	}
	if want := []string{"0:c1", "0:c2", "0:c1", "1:c2", "1:c1"}; !reflect.DeepEqual(got, want) {
		t.Errorf("slots = %v, want %v (each challenger keeps its item count)", got, want)
	}
}

func TestAssignSlotsWithoutChunksReturnsNothing(t *testing.T) {
	challengers := []model.Challenger{{ChallengeType: model.ChallengeTypeMultipleChoice, MultipleChoice: &model.MultipleChoiceChallengeConfig{QuestionCount: 3}}}

	if selected := assignSlots(challengers, nil); len(selected) != 0 {
		t.Errorf("got %d slots, want none", len(selected))
	}
}

func TestGroupGenerationSlotsKeepsOrderPerChallenger(t *testing.T) {
	slots := []challengerSlot{
		{challengerIndex: 1, slot: GenerationSlot{Main: RetrievedChunk{Key: "b1"}}},
		{challengerIndex: 0, slot: GenerationSlot{Main: RetrievedChunk{Key: "a1"}}},
		{challengerIndex: 1, slot: GenerationSlot{Main: RetrievedChunk{Key: "b2"}}},
	}

	grouped := groupGenerationSlots(slots)

	if len(grouped[0]) != 1 || grouped[0][0].Main.Key != "a1" {
		t.Errorf("challenger 0 slots = %+v", grouped[0])
	}
	if len(grouped[1]) != 2 || grouped[1][0].Main.Key != "b1" || grouped[1][1].Main.Key != "b2" {
		t.Errorf("challenger 1 slots = %+v", grouped[1])
	}
}

func activeObject(id string, tags ...string) *model.Object {
	return &model.Object{Id: id, Key: "key/" + id, Status: "active", Tags: tags}
}

// chunkOn cria um chunk com texto útil para o filtro de chunk foco, na página dada de "key/o1".
func chunkOn(page int, key string) RetrievedChunk {
	return chunkOfObject("key/o1", page, key)
}

func chunkOfObject(objectKey string, page int, key string) RetrievedChunk {
	return RetrievedChunk{
		Key:       key,
		ObjectKey: objectKey,
		Page:      page,
		Content:   strings.Repeat("The mitochondria produce most of the energy that the cell needs. ", 6),
	}
}

func chunkKeysOf(chunks []foundChunk) []string {
	keys := make([]string, len(chunks))
	for i, found := range chunks {
		keys[i] = found.chunk.Key
	}
	return keys
}

// foundChunks cria chunks foco com a tag "tag-<chave>", para conferir que a tag acompanha o chunk.
func foundChunks(keys ...string) []foundChunk {
	found := make([]foundChunk, len(keys))
	for i, key := range keys {
		found[i] = foundChunk{chunk: RetrievedChunk{Key: key}, tag: "tag-" + key}
	}
	return found
}

func sortedKeys(keys []string) []string {
	sorted := append([]string(nil), keys...)
	sort.Strings(sorted)
	return sorted
}

// searchByTag responde cada tag com os chunks combinados para ela, e registra as buscas.
func searchByTag(perTag map[string][]RetrievedChunk, searched *[]string) newChunkSearch {
	return func(_ context.Context, _ *model.Object, tag string) ([]RetrievedChunk, error) {
		*searched = append(*searched, tag)
		return perTag[tag], nil
	}
}

func countByPrefix(keys []string) map[string]int {
	counts := map[string]int{}
	for _, key := range keys {
		counts[key[:1]]++
	}
	return counts
}

func TestPlanTagSearchesPlansOneSearchPerTagWithoutRepeating(t *testing.T) {
	object := activeObject("o1", "a", "b", "c", "d", "e", "f", "g")

	searches := planTagSearches([]*model.Object{object}, 4)

	if len(searches) != 4 {
		t.Fatalf("planned %d searches, want 4", len(searches))
	}
	seen := map[string]bool{}
	for _, search := range searches {
		if seen[search.tag] {
			t.Errorf("tag %q is searched twice", search.tag)
		}
		seen[search.tag] = true
		if search.object != object {
			t.Errorf("search for %q points to another object", search.tag)
		}
	}
}

func TestPlanTagSearchesStopsWhenTheTagsRunOut(t *testing.T) {
	if searches := planTagSearches([]*model.Object{activeObject("o1", "a", "b")}, 4); len(searches) != 2 {
		t.Errorf("planned %d searches, want one per available tag", len(searches))
	}
}

func TestPlanTagSearchesDoesNotReorderTheObjectTags(t *testing.T) {
	object := activeObject("o1", "a", "b", "c", "d", "e", "f")

	planTagSearches([]*model.Object{object}, 4)

	if object.Tags[0] != "a" || object.Tags[5] != "f" {
		t.Errorf("object tags were reordered: %v", object.Tags)
	}
}

func TestPlanTagSearchesAlternatesBetweenObjects(t *testing.T) {
	many := activeObject("many", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9")
	few := activeObject("few", "b1", "b2")

	searches := planTagSearches([]*model.Object{many, few}, 4)

	fromFew := 0
	for _, search := range searches {
		if search.object == few {
			fromFew++
		}
	}
	if len(searches) != 4 || fromFew != 2 {
		t.Errorf("planned %d searches with %d from the smaller object, want 4 with 2", len(searches), fromFew)
	}
}

func TestPlanTagSearchesSkipsObjectsThatCannotBeSearched(t *testing.T) {
	objects := []*model.Object{
		{Id: "processing", Status: "processing", Tags: []string{"a", "b"}},
		{Id: "no-tags", Status: "active"},
	}

	if searches := planTagSearches(objects, 4); len(searches) != 0 {
		t.Errorf("planned %+v, want nothing", searches)
	}
}

func TestGatherNewChunksTakesOneChunkPerTagBeforeASecondFromTheSameTag(t *testing.T) {
	// O defeito que isso cobre: antes tudo era ordenado por distância no geral, então a tag com
	// os chunks mais próximos entregava todas as vagas e o firing virava um assunto só.
	perTag := map[string][]RetrievedChunk{
		"a1": {chunkOn(1, "A1"), chunkOn(2, "A2"), chunkOn(3, "A3")},
		"b1": {chunkOn(11, "B1"), chunkOn(12, "B2"), chunkOn(13, "B3")},
		"c1": {chunkOn(21, "C1"), chunkOn(22, "C2"), chunkOn(23, "C3")},
	}
	var searched []string
	objects := []*model.Object{activeObject("one", "a1"), activeObject("two", "b1"), activeObject("three", "c1")}

	chunks, tags, err := gatherNewChunks(context.Background(), objects, 3, searchByTag(perTag, &searched))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	counts := countByPrefix(chunkKeysOf(chunks))
	if len(chunks) != 3 || counts["A"] != 1 || counts["B"] != 1 || counts["C"] != 1 {
		t.Errorf("chunks = %v, want one from each tag", chunkKeysOf(chunks))
	}
	if len(tags) != 3 {
		t.Errorf("tags = %v, want the three tags searched", tags)
	}
}

func TestGatherNewChunksKeepsTheTagThatFoundEachChunk(t *testing.T) {
	perTag := map[string][]RetrievedChunk{
		"a1": {chunkOn(1, "A1")},
		"b1": {chunkOn(11, "B1")},
	}
	var searched []string
	objects := []*model.Object{activeObject("one", "a1"), activeObject("two", "b1")}

	chunks, _, err := gatherNewChunks(context.Background(), objects, 2, searchByTag(perTag, &searched))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, found := range chunks {
		want := map[string]string{"A1": "a1", "B1": "b1"}[found.chunk.Key]
		if found.tag != want {
			t.Errorf("chunk %s came with tag %q, want %q", found.chunk.Key, found.tag, want)
		}
	}
}

func TestGatherNewChunksSearchesWithThePlainTag(t *testing.T) {
	var queries []string
	search := func(_ context.Context, _ *model.Object, tag string) ([]RetrievedChunk, error) {
		queries = append(queries, tag)
		return nil, nil
	}

	if _, _, err := gatherNewChunks(context.Background(), []*model.Object{activeObject("o1", "mitocôndria")}, 1, search); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !reflect.DeepEqual(queries, []string{"mitocôndria"}) {
		t.Errorf("queries = %v, want the tag itself, without any prefix", queries)
	}
}

func TestGatherNewChunksDrawsTheMainChunkAmongTheTagResults(t *testing.T) {
	// Com uma vaga só e uma tag só, o sorteio deve variar entre os chunks da lista, e não
	// devolver sempre o primeiro.
	perTag := map[string][]RetrievedChunk{
		"a1": {chunkOn(1, "A1"), chunkOn(2, "A2"), chunkOn(3, "A3"), chunkOn(4, "A4"), chunkOn(5, "A5"), chunkOn(6, "A6")},
	}
	drawn := map[string]bool{}
	for i := 0; i < 200; i++ {
		var searched []string
		chunks, _, err := gatherNewChunks(context.Background(), []*model.Object{activeObject("o1", "a1")}, 1, searchByTag(perTag, &searched))
		if err != nil || len(chunks) != 1 {
			t.Fatalf("got %d chunks (err %v), want one", len(chunks), err)
		}
		drawn[chunks[0].chunk.Key] = true
	}

	if len(drawn) < 2 {
		t.Errorf("drew only %v in 200 firings, want the main chunk to vary", drawn)
	}
}

func TestGatherNewChunksGoesBackForASecondChunkOfEachTagWhenItNeedsMore(t *testing.T) {
	perTag := map[string][]RetrievedChunk{
		"a1": {chunkOn(1, "A1"), chunkOn(2, "A2")},
		"b1": {chunkOn(11, "B1"), chunkOn(12, "B2")},
	}
	var searched []string
	objects := []*model.Object{activeObject("one", "a1"), activeObject("two", "b1")}

	chunks, _, err := gatherNewChunks(context.Background(), objects, 4, searchByTag(perTag, &searched))

	counts := countByPrefix(chunkKeysOf(chunks))
	if err != nil || len(chunks) != 4 || counts["A"] != 2 || counts["B"] != 2 {
		t.Errorf("chunks = %v (err %v), want two from each tag", chunkKeysOf(chunks), err)
	}
}

func TestGatherNewChunksAvoidsTwoChunksFromTheSamePage(t *testing.T) {
	perTag := map[string][]RetrievedChunk{
		"a1": {chunkOn(5, "A1"), chunkOn(5, "A2")},
		"b1": {chunkOn(5, "B1"), chunkOn(9, "B2")},
	}
	objects := []*model.Object{activeObject("one", "a1"), activeObject("two", "b1")}

	for i := 0; i < 50; i++ {
		var searched []string
		chunks, _, err := gatherNewChunks(context.Background(), objects, 2, searchByTag(perTag, &searched))

		pages := map[int]int{}
		for _, found := range chunks {
			pages[found.chunk.Page]++
		}
		if err != nil || len(chunks) != 2 || pages[5] != 1 || pages[9] != 1 {
			t.Fatalf("chunks = %v (err %v), want one chunk of page 5 and B2 of page 9", chunkKeysOf(chunks), err)
		}
	}
}

func TestGatherNewChunksRepeatsAPageOnlyWhenThereIsNothingElse(t *testing.T) {
	perTag := map[string][]RetrievedChunk{"a1": {chunkOn(5, "A1"), chunkOn(5, "A2")}}
	var searched []string

	chunks, _, err := gatherNewChunks(context.Background(), []*model.Object{activeObject("o1", "a1")}, 2, searchByTag(perTag, &searched))

	if err != nil || !reflect.DeepEqual(sortedKeys(chunkKeysOf(chunks)), []string{"A1", "A2"}) {
		t.Errorf("chunks = %v (err %v), want both chunks of page 5 as a last resort", chunkKeysOf(chunks), err)
	}
}

func TestGatherNewChunksCountsPagesPerObject(t *testing.T) {
	// A página 3 de dois objetos diferentes é conteúdo diferente: as duas podem entrar.
	perTag := map[string][]RetrievedChunk{
		"a1": {chunkOfObject("key/one", 3, "one-3")},
		"b1": {chunkOfObject("key/two", 3, "two-3")},
	}
	var searched []string
	objects := []*model.Object{activeObject("one", "a1"), activeObject("two", "b1")}

	chunks, _, err := gatherNewChunks(context.Background(), objects, 2, searchByTag(perTag, &searched))

	if err != nil || len(chunks) != 2 {
		t.Errorf("got %d chunks (err %v), want the page 3 of each object", len(chunks), err)
	}
}

func TestGatherNewChunksDiscardsRepeatedAndUnusableChunks(t *testing.T) {
	repeated := chunkOn(2, "repeated")
	perTag := map[string][]RetrievedChunk{
		"a1": {chunkOn(1, "first"), repeated, {Key: "short", ObjectKey: "key/o1", Page: 3, Content: "too short"}},
		"b1": {repeated},
	}
	var searched []string
	objects := []*model.Object{activeObject("one", "a1"), activeObject("two", "b1")}

	chunks, _, err := gatherNewChunks(context.Background(), objects, 10, searchByTag(perTag, &searched))

	keys := sortedKeys(chunkKeysOf(chunks))
	if err != nil || !reflect.DeepEqual(keys, []string{"first", "repeated"}) {
		t.Errorf("chunks = %v (err %v), want each usable chunk once", keys, err)
	}
}

func TestGatherNewChunksSearchesOneTagPerNeededSlotUpToTheLimit(t *testing.T) {
	tags := make([]string, 40)
	for i := range tags {
		tags[i] = fmt.Sprintf("t%d", i)
	}

	for _, tt := range []struct {
		needed       int
		wantSearches int
	}{
		{needed: 1, wantSearches: 1},
		{needed: 3, wantSearches: 3},
		{needed: 10, wantSearches: maxSearchTags},
	} {
		searches := 0
		search := func(_ context.Context, _ *model.Object, _ string) ([]RetrievedChunk, error) {
			searches++
			return nil, nil
		}

		if _, _, err := gatherNewChunks(context.Background(), []*model.Object{activeObject("o1", tags...)}, tt.needed, search); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if searches != tt.wantSearches {
			t.Errorf("needed %d searched %d tags, want %d", tt.needed, searches, tt.wantSearches)
		}
	}
}

func TestGatherNewChunksIgnoresObjectsThatCannotBeSearched(t *testing.T) {
	calls := 0
	search := func(_ context.Context, _ *model.Object, _ string) ([]RetrievedChunk, error) {
		calls++
		return nil, nil
	}
	objects := []*model.Object{
		{Id: "processing", Status: "processing", Tags: []string{"a"}},
		{Id: "no-tags", Status: "active"},
	}

	chunks, tags, err := gatherNewChunks(context.Background(), objects, 3, search)

	if err != nil || len(chunks) != 0 || len(tags) != 0 || calls != 0 {
		t.Errorf("got %d chunks, %d tags, %d calls (err %v), want nothing", len(chunks), len(tags), calls, err)
	}
}

func TestGatherNewChunksOnlyFailsWhenNothingWasFoundAndEverySearchFailed(t *testing.T) {
	failing := func(_ context.Context, _ *model.Object, _ string) ([]RetrievedChunk, error) {
		return nil, errors.New("vector search is down")
	}
	if _, _, err := gatherNewChunks(context.Background(), []*model.Object{activeObject("o1", "a", "b", "c")}, 3, failing); err == nil {
		t.Error("expected an error when every search failed")
	}

	calls := 0
	partial := func(_ context.Context, _ *model.Object, _ string) ([]RetrievedChunk, error) {
		calls++
		if calls == 1 {
			return []RetrievedChunk{chunkOn(1, "k1")}, nil
		}
		return nil, errors.New("vector search is down")
	}
	chunks, _, err := gatherNewChunks(context.Background(), []*model.Object{activeObject("o1", "a", "b", "c", "d", "e", "f")}, 4, partial)
	if err != nil || len(chunks) != 1 {
		t.Errorf("got %d chunks (err %v), want the chunk found before the failures", len(chunks), err)
	}
}

func TestPickSpreadStopsAtTheNeededAmount(t *testing.T) {
	perTag := []tagResults{
		{tag: "a", chunks: []RetrievedChunk{chunkOn(1, "a1"), chunkOn(2, "a2")}},
		{tag: "b", chunks: []RetrievedChunk{chunkOn(11, "b1"), chunkOn(12, "b2")}},
	}

	if picked := pickSpread(perTag, 1); len(picked) != 1 {
		t.Errorf("picked %v, want a single chunk", chunkKeysOf(picked))
	}
	if picked := pickSpread(perTag, 99); len(picked) != 4 {
		t.Errorf("picked %v, want every chunk available", chunkKeysOf(picked))
	}
	if picked := pickSpread(nil, 3); len(picked) != 0 {
		t.Errorf("picked %v from nothing", chunkKeysOf(picked))
	}
}
