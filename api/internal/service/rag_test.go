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

func TestPromptTopics(t *testing.T) {
	objects := []*model.Object{
		{Tags: []string{"a", "b", "c", "d", "e", "f"}},
		{Tags: []string{"g", "h", "i", "j", "k", "l", "a"}},
	}

	topics := promptTopics([]string{"b", "z"}, objects)

	if len(topics) != maxPromptTopics {
		t.Fatalf("got %d topics, want %d", len(topics), maxPromptTopics)
	}
	if topics[0] != "b" || topics[1] != "z" {
		t.Errorf("the searched tags should come first, got %v", topics)
	}
	seen := map[string]bool{}
	for _, topic := range topics {
		if seen[topic] {
			t.Errorf("topic %q is repeated in %v", topic, topics)
		}
		seen[topic] = true
	}
}

func TestPromptTopicsWithFewTagsReturnsAllOfThem(t *testing.T) {
	topics := promptTopics(nil, []*model.Object{{Tags: []string{"only", "two"}}})

	if len(topics) != 2 {
		t.Errorf("got %v, want the two available tags", topics)
	}
}

func TestBuildGenerationSlots(t *testing.T) {
	available := map[string]RetrievedChunk{}
	for _, key := range []string{"vec_obj_a_1_0", "vec_obj_a_1_1", "vec_obj_a_1_2", "vec_obj_a_1_4", "vec_obj_a_1_5", "vec_obj_a_1_6"} {
		available[key] = RetrievedChunk{Key: key, Content: "content of " + key}
	}
	selected := []SelectedSlot{
		{ChallengerIndex: 0, Chunk: available["vec_obj_a_1_0"]},
		{ChallengerIndex: 0, Chunk: available["vec_obj_a_1_1"]},
		{ChallengerIndex: 1, Chunk: available["vec_obj_a_1_5"]},
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
}

func TestAssignSlotsFillsEveryItemInChallengerOrder(t *testing.T) {
	challengers := []model.Challenger{
		{ChallengeType: model.ChallengeTypeMultipleChoice, MultipleChoice: &model.MultipleChoiceChallengeConfig{QuestionCount: 2}},
		{ChallengeType: model.ChallengeTypeDiscovery, Discovery: &model.DiscoveryChallengeConfig{DiscoveryCount: 1}},
	}
	chunks := []RetrievedChunk{{Key: "c1"}, {Key: "c2"}, {Key: "c3"}, {Key: "c4"}}

	selected := assignSlots(challengers, chunks)

	var got []string
	for _, slot := range selected {
		got = append(got, fmt.Sprintf("%d:%s", slot.ChallengerIndex, slot.Chunk.Key))
	}
	if want := []string{"0:c1", "0:c2", "1:c3"}; !reflect.DeepEqual(got, want) {
		t.Errorf("slots = %v, want %v", got, want)
	}
}

func TestAssignSlotsRepeatsChunksWhenTheDocumentIsSmall(t *testing.T) {
	challengers := []model.Challenger{
		{ChallengeType: model.ChallengeTypeMultipleChoice, MultipleChoice: &model.MultipleChoiceChallengeConfig{QuestionCount: 3}},
		{ChallengeType: model.ChallengeTypeTrueFalse, TrueFalse: &model.TrueFalseChallengeConfig{QuestionCount: 2}},
	}
	chunks := []RetrievedChunk{{Key: "c1"}, {Key: "c2"}}

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

func chunkKeysOf(chunks []RetrievedChunk) []string {
	keys := make([]string, len(chunks))
	for i, chunk := range chunks {
		keys[i] = chunk.Key
	}
	return keys
}

func sortedKeys(keys []string) []string {
	sorted := append([]string(nil), keys...)
	sort.Strings(sorted)
	return sorted
}

// searchByTag responde cada tag do grupo com os chunks combinados para ela, e registra as buscas.
func searchByTag(perTag map[string][]RetrievedChunk, searched *[]string) newChunkSearch {
	return func(_ context.Context, _ *model.Object, tags []string) ([][]RetrievedChunk, error) {
		var results [][]RetrievedChunk
		for _, tag := range tags {
			*searched = append(*searched, tag)
			results = append(results, perTag[tag])
		}
		return results, nil
	}
}

func countByPrefix(keys []string) map[string]int {
	counts := map[string]int{}
	for _, key := range keys {
		counts[key[:1]]++
	}
	return counts
}

func TestFuseByConsensusPutsTheChunkMostTagsAgreeOnFirst(t *testing.T) {
	// "ruido" é o primeiro da sua tag, mas só uma tag o encontrou; "acordo" é o segundo de duas.
	perTag := [][]RetrievedChunk{
		{chunkOn(1, "ruido"), chunkOn(2, "acordo")},
		{chunkOn(3, "outro"), chunkOn(2, "acordo")},
	}

	fused := fuseByConsensus(perTag)

	if len(fused) == 0 || fused[0].Key != "acordo" {
		t.Errorf("fused = %v, want acordo first (two tags point at it)", chunkKeysOf(fused))
	}
}

func TestFuseByConsensusKeepsTheRankWhenNoChunkIsShared(t *testing.T) {
	perTag := [][]RetrievedChunk{
		{chunkOn(1, "a1"), chunkOn(2, "a2")},
		{chunkOn(11, "b1")},
	}

	fused := chunkKeysOf(fuseByConsensus(perTag))

	// a1 e b1 são os primeiros das suas tags (mesma pontuação): fica a ordem de chegada. a2 é
	// segundo, então vem depois dos dois.
	if !reflect.DeepEqual(fused, []string{"a1", "b1", "a2"}) {
		t.Errorf("fused = %v, want the first of each tag before the second of any", fused)
	}
}

func TestFuseByConsensusHandlesEmptyInput(t *testing.T) {
	if fused := fuseByConsensus(nil); len(fused) != 0 {
		t.Errorf("fused = %v, want nothing", chunkKeysOf(fused))
	}
}

func TestPlanTagGroupsSplitsTheTagsIntoGroups(t *testing.T) {
	object := activeObject("o1", "a", "b", "c", "d", "e", "f", "g")

	groups := planTagGroups([]*model.Object{object}, 2)

	if len(groups) != 2 {
		t.Fatalf("planned %d groups, want 2", len(groups))
	}
	seen := map[string]bool{}
	for _, group := range groups {
		if len(group.tags) != tagsPerGroup {
			t.Errorf("group %v has %d tags, want %d", group.tags, len(group.tags), tagsPerGroup)
		}
		for _, tag := range group.tags {
			if seen[tag] {
				t.Errorf("tag %q is in more than one group", tag)
			}
			seen[tag] = true
		}
		if group.object != object {
			t.Errorf("group %v points to another object", group.tags)
		}
	}
}

func TestPlanTagGroupsGivesTheLastGroupWhatIsLeft(t *testing.T) {
	groups := planTagGroups([]*model.Object{activeObject("o1", "a", "b", "c", "d")}, 4)

	if len(groups) != 2 || len(groups[0].tags) != 3 || len(groups[1].tags) != 1 {
		t.Errorf("groups = %v, want one full group and one with the leftover tag", groups)
	}
}

func TestPlanTagGroupsDoesNotReorderTheObjectTags(t *testing.T) {
	object := activeObject("o1", "a", "b", "c", "d", "e", "f")

	planTagGroups([]*model.Object{object}, 2)

	if object.Tags[0] != "a" || object.Tags[5] != "f" {
		t.Errorf("object tags were reordered: %v", object.Tags)
	}
}

func TestPlanTagGroupsAlternatesBetweenObjects(t *testing.T) {
	many := activeObject("many", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9")
	few := activeObject("few", "b1", "b2")

	groups := planTagGroups([]*model.Object{many, few}, 4)

	fromFew := 0
	for _, group := range groups {
		if group.object == few {
			fromFew++
		}
	}
	if len(groups) != 4 || fromFew != 1 {
		t.Errorf("planned %d groups with %d from the smaller object, want 4 with 1", len(groups), fromFew)
	}
}

func TestPlanTagGroupsSkipsObjectsThatCannotBeSearched(t *testing.T) {
	objects := []*model.Object{
		{Id: "processing", Status: "processing", Tags: []string{"a", "b"}},
		{Id: "no-tags", Status: "active"},
	}

	if groups := planTagGroups(objects, 4); len(groups) != 0 {
		t.Errorf("planned %+v, want nothing", groups)
	}
}

func TestGatherNewChunksTakesOneChunkPerGroupBeforeASecondFromTheSameGroup(t *testing.T) {
	// O defeito que isso cobre: antes tudo era ordenado por distância no geral, então o grupo com
	// os chunks mais próximos entregava todas as vagas e o firing virava um assunto só.
	perTag := map[string][]RetrievedChunk{
		"a1": {chunkOn(1, "A1"), chunkOn(2, "A2"), chunkOn(3, "A3")},
		"b1": {chunkOn(11, "B1"), chunkOn(12, "B2"), chunkOn(13, "B3")},
		"c1": {chunkOn(21, "C1"), chunkOn(22, "C2"), chunkOn(23, "C3")},
	}
	var searched []string
	// Uma tag por grupo: três grupos, um por objeto, para o teste não depender do sorteio.
	objects := []*model.Object{activeObject("one", "a1"), activeObject("two", "b1"), activeObject("three", "c1")}

	chunks, tags, err := gatherNewChunks(context.Background(), objects, 3, searchByTag(perTag, &searched))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	counts := countByPrefix(chunkKeysOf(chunks))
	if len(chunks) != 3 || counts["A"] != 1 || counts["B"] != 1 || counts["C"] != 1 {
		t.Errorf("chunks = %v, want one from each group", chunkKeysOf(chunks))
	}
	if len(tags) != 3 {
		t.Errorf("tags = %v, want the three tags searched", tags)
	}
}

func TestGatherNewChunksLetsTheGroupConsensusChooseInsteadOfOneTag(t *testing.T) {
	// "ruido" é o primeiro da sua tag, mas só ela o aponta; "acordo" é apontado por duas tags do
	// mesmo grupo. Com uma vaga só, o consenso decide.
	perTag := map[string][]RetrievedChunk{
		"ruim":  {chunkOn(1, "ruido"), chunkOn(2, "acordo")},
		"boa":   {chunkOn(3, "outro"), chunkOn(2, "acordo")},
		"outra": {chunkOn(2, "acordo")},
	}
	var searched []string

	chunks, _, err := gatherNewChunks(context.Background(), []*model.Object{activeObject("o1", "ruim", "boa", "outra")}, 1, searchByTag(perTag, &searched))

	if err != nil || !reflect.DeepEqual(chunkKeysOf(chunks), []string{"acordo"}) {
		t.Errorf("chunks = %v (err %v), want the chunk the group agrees on", chunkKeysOf(chunks), err)
	}
	if len(searched) != 3 {
		t.Errorf("searched %v, want the three tags of the group", searched)
	}
}

func TestGatherNewChunksGoesBackForASecondChunkOfEachGroupWhenItNeedsMore(t *testing.T) {
	perTag := map[string][]RetrievedChunk{
		"a1": {chunkOn(1, "A1"), chunkOn(2, "A2")},
		"b1": {chunkOn(11, "B1"), chunkOn(12, "B2")},
	}
	var searched []string
	objects := []*model.Object{activeObject("one", "a1"), activeObject("two", "b1")}

	chunks, _, err := gatherNewChunks(context.Background(), objects, 4, searchByTag(perTag, &searched))

	counts := countByPrefix(chunkKeysOf(chunks))
	if err != nil || len(chunks) != 4 || counts["A"] != 2 || counts["B"] != 2 {
		t.Errorf("chunks = %v (err %v), want two from each group", chunkKeysOf(chunks), err)
	}
}

func TestGatherNewChunksAvoidsTwoChunksFromTheSamePage(t *testing.T) {
	perTag := map[string][]RetrievedChunk{
		"a1": {chunkOn(5, "A1"), chunkOn(5, "A2")},
		"b1": {chunkOn(9, "B1")},
	}
	var searched []string
	objects := []*model.Object{activeObject("one", "a1"), activeObject("two", "b1")}

	chunks, _, err := gatherNewChunks(context.Background(), objects, 2, searchByTag(perTag, &searched))

	if err != nil || !reflect.DeepEqual(sortedKeys(chunkKeysOf(chunks)), []string{"A1", "B1"}) {
		t.Errorf("chunks = %v (err %v), want A1 and B1, never two chunks of page 5", chunkKeysOf(chunks), err)
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

	keys := chunkKeysOf(chunks)
	sort.Strings(keys)
	if err != nil || !reflect.DeepEqual(keys, []string{"first", "repeated"}) {
		t.Errorf("chunks = %v (err %v), want each usable chunk once", keys, err)
	}
}

func TestGatherNewChunksSearchesOneGroupPerNeededSlotUpToTheLimit(t *testing.T) {
	tags := make([]string, 40)
	for i := range tags {
		tags[i] = fmt.Sprintf("t%d", i)
	}

	for _, tt := range []struct {
		needed     int
		wantGroups int
	}{
		{needed: 1, wantGroups: 1},
		{needed: 3, wantGroups: 3},
		{needed: 100, wantGroups: maxTagGroups},
	} {
		groups := 0
		search := func(_ context.Context, _ *model.Object, searchTags []string) ([][]RetrievedChunk, error) {
			groups++
			if len(searchTags) != tagsPerGroup {
				t.Errorf("group with %d tags, want %d", len(searchTags), tagsPerGroup)
			}
			return nil, nil
		}

		if _, _, err := gatherNewChunks(context.Background(), []*model.Object{activeObject("o1", tags...)}, tt.needed, search); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if groups != tt.wantGroups {
			t.Errorf("needed %d searched %d groups, want %d", tt.needed, groups, tt.wantGroups)
		}
	}
}

func TestGatherNewChunksIgnoresObjectsThatCannotBeSearched(t *testing.T) {
	calls := 0
	search := func(_ context.Context, _ *model.Object, _ []string) ([][]RetrievedChunk, error) {
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
	failing := func(_ context.Context, _ *model.Object, _ []string) ([][]RetrievedChunk, error) {
		return nil, errors.New("vector search is down")
	}
	if _, _, err := gatherNewChunks(context.Background(), []*model.Object{activeObject("o1", "a", "b", "c")}, 3, failing); err == nil {
		t.Error("expected an error when every search failed")
	}

	calls := 0
	partial := func(_ context.Context, _ *model.Object, _ []string) ([][]RetrievedChunk, error) {
		calls++
		if calls == 1 {
			return [][]RetrievedChunk{{chunkOn(1, "k1")}}, nil
		}
		return nil, errors.New("vector search is down")
	}
	chunks, _, err := gatherNewChunks(context.Background(), []*model.Object{activeObject("o1", "a", "b", "c", "d", "e", "f")}, 4, partial)
	if err != nil || len(chunks) != 1 {
		t.Errorf("got %d chunks (err %v), want the chunk found before the failures", len(chunks), err)
	}
}

func TestPickSpreadStopsAtTheNeededAmount(t *testing.T) {
	perGroup := [][]RetrievedChunk{
		{chunkOn(1, "a1"), chunkOn(2, "a2")},
		{chunkOn(11, "b1"), chunkOn(12, "b2")},
	}

	if picked := pickSpread(perGroup, 1); len(picked) != 1 {
		t.Errorf("picked %v, want a single chunk", chunkKeysOf(picked))
	}
	if picked := pickSpread(perGroup, 99); len(picked) != 4 {
		t.Errorf("picked %v, want every chunk available", chunkKeysOf(picked))
	}
	if picked := pickSpread(nil, 3); len(picked) != 0 {
		t.Errorf("picked %v from nothing", chunkKeysOf(picked))
	}
}
