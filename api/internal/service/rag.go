package service

import (
	"context"
	"fmt"
	"math/rand"
	"sort"
	"strings"
	"unicode"

	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
	"github.com/joaoleau/floslo/internal/repository"
)

type GeneratedChallengeResult struct {
	ChallengeType   string                     `json:"challenge_type"`
	Language        string                     `json:"language"`
	MultipleChoices []*GeneratedMultipleChoice `json:"multiple_choices,omitempty"`
	TrueFalses      []*GeneratedTrueFalse      `json:"true_falses,omitempty"`
	Discoveries     []*GeneratedDiscovery      `json:"discoveries,omitempty"`
}

// CurrentStreak é a sequência de dias de estudo depois de registrar o dia do disparo; fica
// nil quando o dia não pôde ser registrado (sem data local ou falha ao gravar).
type RetrieveAndGenerateResponse struct {
	Scheduler     *model.Scheduler            `json:"scheduler"`
	Challenges    []*GeneratedChallengeResult `json:"challenges"`
	CurrentStreak *int                        `json:"current_streak,omitempty"`
}

type RAGService struct {
	VectorService       *VectorService
	GenerationService   *GenerationService
	SchedulerRepository *repository.SchedulerRepository
	ObjectRepository    *repository.ObjectRepository
	StreakService       *StreakService
}

func NewRAGService(
	vectorService *VectorService,
	generationService *GenerationService,
	schedulerRepository *repository.SchedulerRepository,
	objectRepository *repository.ObjectRepository,
	streakService *StreakService,
) *RAGService {
	return &RAGService{
		VectorService:       vectorService,
		GenerationService:   generationService,
		SchedulerRepository: schedulerRepository,
		ObjectRepository:    objectRepository,
		StreakService:       streakService,
	}
}

const (
	// perTagTopK é quantos chunks cada tag traz, antes do consenso dentro do grupo.
	perTagTopK = 6
	// maxPromptTopics limita a lista de tópicos do prompt; os objetos podem ter até 200 tags.
	maxPromptTopics = 8
	// Cada busca usa um grupo de tags, não uma só: o trecho escolhido é o que mais tags do grupo
	// apontam (ver fuseByConsensus), então uma tag ruim ("novatec editora") não decide a vaga
	// sozinha. Entre os grupos o firing alterna, o que mantém assuntos diferentes no mesmo
	// disparo. Grupos x tags é o número de buscas, e cada busca custa um embedding e uma consulta.
	tagsPerGroup = 3
	maxTagGroups = 4
	// consensusRankBias amortece a diferença entre as primeiras posições de uma mesma tag, para
	// pesar mais o fato de várias tags apontarem o mesmo trecho do que ele ser o primeiro de uma.
	consensusRankBias = 5
)

// RetrieveAndGenerate monta um firing: escolhe uma vez os chunks foco de todos os desafios
// do agendador pela busca por tags, busca um chunk de apoio para cada um (o vizinho), e gera
// os itens de cada desafio em uma chamada ao modelo, com o item i ligado ao slot i. Depois
// de uma geração bem-sucedida, registra localDate como dia de estudo.
func (s *RAGService) RetrieveAndGenerate(ctx context.Context, userId string, schedulerId string, localDate string) (*RetrieveAndGenerateResponse, error) {
	scheduler, err := s.SchedulerRepository.GetSchedulerById(ctx, userId, schedulerId)
	if err != nil {
		return nil, err
	}
	if len(scheduler.ObjectIds) == 0 {
		// Objeto excluído depois do agendador ter sido criado: ObjectService.DeleteObject já
		// desabilita o agendador quando isso o deixa sem nenhum objeto, mas o alarme que o
		// aparelho já tinha agendado dispara mesmo assim até o próximo sync do app. Devolve
		// sem desafios em vez de erro, pra a tela de firing mostrar um aviso, não uma falha.
		logger.Log.Info("scheduler has no objects, returning without challenges: ", logger.String("scheduler_id", scheduler.Id))
		return &RetrieveAndGenerateResponse{Scheduler: scheduler, Challenges: nil}, nil
	}
	if len(scheduler.Challengers) == 0 {
		return nil, fmt.Errorf("scheduler has no challengers")
	}

	objects := make([]*model.Object, 0, len(scheduler.ObjectIds))
	for _, objectId := range scheduler.ObjectIds {
		object, err := s.ObjectRepository.GetObjectById(ctx, userId, objectId)
		if err != nil {
			return nil, err
		}
		objects = append(objects, object)
	}

	needed := 0
	for _, challenger := range scheduler.Challengers {
		needed += challenger.ItemCount()
	}

	candidates, searchedTags, err := s.findNewChunks(ctx, userId, objects, needed)
	selected := assignSlots(scheduler.Challengers, candidates)
	if len(selected) == 0 {
		if err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("no chunks available for this scheduler")
	}

	available := make(map[string]RetrievedChunk, len(candidates))
	for _, chunk := range candidates {
		available[chunk.Key] = chunk
	}
	s.loadSupportChunks(ctx, selected, available)

	slotsByChallenger := groupGenerationSlots(buildGenerationSlots(selected, available))
	topics := promptTopics(searchedTags, objects)
	language := string(scheduler.Language)

	logger.Log.Info(
		"selected chunks for the firing",
		logger.String("scheduler_id", scheduler.Id),
		logger.Any("slots", len(selected)),
		logger.Any("distinct_chunks", len(candidates)),
		logger.Any("tags", topics),
	)

	results := make([]*GeneratedChallengeResult, 0, len(scheduler.Challengers))
	for index, challenger := range scheduler.Challengers {
		slots := slotsByChallenger[index]
		if len(slots) == 0 {
			continue
		}

		result := &GeneratedChallengeResult{
			ChallengeType: string(challenger.ChallengeType),
			Language:      language,
		}

		switch challenger.ChallengeType {
		case model.ChallengeTypeMultipleChoice:
			result.MultipleChoices, err = s.GenerationService.GenerateMultipleChoices(ctx, slots, topics, language)
		case model.ChallengeTypeTrueFalse:
			result.TrueFalses, err = s.GenerationService.GenerateTrueFalse(ctx, slots, topics, language)
		case model.ChallengeTypeDiscovery:
			result.Discoveries, err = s.GenerationService.GenerateDiscoveries(ctx, slots, topics, language)
		default:
			err = fmt.Errorf("unsupported challenge type: %s", challenger.ChallengeType)
		}
		if err != nil {
			return nil, err
		}

		results = append(results, result)
	}

	return &RetrieveAndGenerateResponse{
		Scheduler:     scheduler,
		Challenges:    results,
		CurrentStreak: s.recordStudyDay(ctx, userId, localDate),
	}, nil
}

// recordStudyDay registra o dia de estudo do disparo e devolve a sequência atualizada, que vai
// na própria resposta para o app não precisar consultar a floslo-api. Uma falha só vai para o
// log: o estudante já tem os desafios, e a sequência não deve derrubar o disparo.
func (s *RAGService) recordStudyDay(ctx context.Context, userId string, localDate string) *int {
	if s.StreakService == nil || localDate == "" {
		return nil
	}
	streak, err := s.StreakService.Record(ctx, userId, localDate)
	if err != nil {
		logger.Log.Error("failed to record the study day, keeping the firing: ", logger.Any("error", err))
		return nil
	}
	return &streak
}

// findNewChunks busca conteúdo novo: cada busca usa um grupo de tags (o consenso entre elas
// escolhe o trecho) e o firing alterna entre os grupos. Devolve os candidatos e as tags usadas.
func (s *RAGService) findNewChunks(ctx context.Context, userId string, objects []*model.Object, needed int) ([]RetrievedChunk, []string, error) {
	search := func(ctx context.Context, object *model.Object, tags []string) ([][]RetrievedChunk, error) {
		var perTag [][]RetrievedChunk
		var lastErr error

		for _, tag := range tags {
			chunks, err := s.VectorService.RetrieveRelevantChunks(ctx, userId, object.Key, s.generateQuery(tag), perTagTopK)
			if err != nil {
				lastErr = err
				logger.Log.Error("failed retrieving chunks for one tag of the group, skipping it", logger.String("tag", tag), logger.Any("error", err))
				continue
			}
			perTag = append(perTag, chunks)
		}

		if len(perTag) == 0 && lastErr != nil {
			return nil, lastErr
		}
		return perTag, nil
	}

	chunks, tags, err := gatherNewChunks(ctx, objects, needed, search)

	logger.Log.Info(
		"searched new chunks",
		logger.Any("needed", needed),
		logger.Any("found", len(chunks)),
		logger.Any("tags", tags),
	)
	return chunks, tags, err
}

// newChunkSearch busca, para cada tag do grupo, os chunks mais parecidos dentro do objeto.
// Devolve uma lista por tag; tags cuja busca falhou ficam de fora, e só há erro se nenhuma das
// tags do grupo funcionou.
type newChunkSearch func(ctx context.Context, object *model.Object, tags []string) ([][]RetrievedChunk, error)

// tagGroup é uma busca planejada: o objeto e o grupo de tags consultado nele.
type tagGroup struct {
	object *model.Object
	tags   []string
}

// planTagGroups monta os grupos de tags de um firing: as tags de cada objeto ativo em ordem
// sorteada, alternando entre os objetos (um grupo do primeiro, um do segundo...) para um objeto
// com muitas tags não ocupar todas as buscas.
func planTagGroups(objects []*model.Object, groupCount int) []tagGroup {
	type objectTags struct {
		object *model.Object
		tags   []string
		used   int
	}

	var pools []*objectTags
	for _, object := range objects {
		if object.Status != "active" || len(object.Tags) == 0 {
			continue
		}

		tags := append([]string(nil), object.Tags...)
		rand.Shuffle(len(tags), func(i, j int) { tags[i], tags[j] = tags[j], tags[i] })
		pools = append(pools, &objectTags{object: object, tags: tags})
	}
	rand.Shuffle(len(pools), func(i, j int) { pools[i], pools[j] = pools[j], pools[i] })

	var groups []tagGroup
	for len(groups) < groupCount {
		progressed := false

		for _, pool := range pools {
			if len(groups) >= groupCount {
				break
			}
			if pool.used >= len(pool.tags) {
				continue
			}

			end := min(pool.used+tagsPerGroup, len(pool.tags))
			groups = append(groups, tagGroup{object: pool.object, tags: pool.tags[pool.used:end]})
			pool.used = end
			progressed = true
		}

		if !progressed {
			break
		}
	}
	return groups
}

// gatherNewChunks junta os chunks foco do firing. Faz uma busca por grupo de tags, deixa
// o consenso do grupo ordenar os candidatos e depois escolhe alternando entre os grupos: assim um
// firing cobre assuntos diferentes (um por grupo) sem que uma tag ruim sozinha escolha um trecho.
// Chunks repetidos ou sem texto útil são descartados. Só devolve erro se nada foi encontrado e
// toda busca falhou.
func gatherNewChunks(ctx context.Context, objects []*model.Object, needed int, search newChunkSearch) ([]RetrievedChunk, []string, error) {
	groups := planTagGroups(objects, min(needed, maxTagGroups))
	if len(groups) == 0 {
		return nil, nil, nil
	}

	var perGroup [][]RetrievedChunk
	var usedTags []string
	var lastErr error
	seen := make(map[string]bool)

	for _, group := range groups {
		perTag, err := search(ctx, group.object, group.tags)
		if err != nil {
			lastErr = err
			continue
		}
		usedTags = append(usedTags, group.tags...)

		var usable []RetrievedChunk
		for _, chunk := range fuseByConsensus(perTag) {
			if seen[chunk.Key] || !isUsableFocus(chunk.Content) {
				continue
			}
			seen[chunk.Key] = true
			usable = append(usable, chunk)
		}
		if len(usable) > 0 {
			perGroup = append(perGroup, usable)
		}
	}

	found := pickSpread(perGroup, needed)
	if len(found) == 0 && lastErr != nil {
		return nil, usedTags, lastErr
	}
	return found, usedTags, nil
}

// fuseByConsensus ordena os chunks de um grupo pelo acordo entre as suas tags: um trecho que
// várias tags trouxeram, e bem colocado em cada uma, fica à frente de um que só uma tag achou.
// É o que impede uma tag ruim de decidir a vaga sozinha -- o trecho que só ela encontrou soma
// pouco e cai para o fim da lista do grupo.
//
// A soma de 1/(consensusRankBias + posição) é a fusão recíproca de rankings: a distância entre a
// primeira e a segunda posição de uma tag pesa menos do que ser apontado por duas tags em vez de
// uma. Empate fica na ordem em que o chunk apareceu, para o resultado ser estável.
func fuseByConsensus(perTag [][]RetrievedChunk) []RetrievedChunk {
	type fused struct {
		chunk   RetrievedChunk
		score   float64
		arrival int
	}

	byKey := make(map[string]*fused)
	var arrived []*fused

	for _, chunks := range perTag {
		for rank, chunk := range chunks {
			entry, ok := byKey[chunk.Key]
			if !ok {
				entry = &fused{chunk: chunk, arrival: len(arrived)}
				byKey[chunk.Key] = entry
				arrived = append(arrived, entry)
			}
			entry.score += 1 / float64(consensusRankBias+rank+1)
		}
	}

	sort.SliceStable(arrived, func(i, j int) bool {
		if arrived[i].score != arrived[j].score {
			return arrived[i].score > arrived[j].score
		}
		return arrived[i].arrival < arrived[j].arrival
	})

	fusedChunks := make([]RetrievedChunk, len(arrived))
	for index, entry := range arrived {
		fusedChunks[index] = entry.chunk
	}
	return fusedChunks
}

// pickSpread escolhe até `needed` chunks alternando entre os grupos de tags: o melhor de cada
// grupo, depois o segundo de cada, e assim por diante. Na primeira passada dois chunks nunca saem
// da mesma página, para dois desafios não virarem o mesmo parágrafo; se isso não fechar as vagas
// (documento pequeno), uma segunda passada aceita repetir a página, ainda
// alternando entre os grupos.
func pickSpread(perGroup [][]RetrievedChunk, needed int) []RetrievedChunk {
	taken := make(map[string]bool)
	pages := make(map[string]bool)
	var found []RetrievedChunk

	longest := 0
	for _, queue := range perGroup {
		longest = max(longest, len(queue))
	}

	sweep := func(allowUsedPage bool) {
		for round := 0; round < longest; round++ {
			for _, queue := range perGroup {
				if len(found) >= needed {
					return
				}
				if round >= len(queue) {
					continue
				}

				chunk := queue[round]
				page := fmt.Sprintf("%s#%d", chunk.ObjectKey, chunk.Page)
				if taken[chunk.Key] || (!allowUsedPage && pages[page]) {
					continue
				}

				taken[chunk.Key] = true
				pages[page] = true
				found = append(found, chunk)
			}
		}
	}

	sweep(false)
	if len(found) < needed {
		sweep(true)
	}
	return found
}

// SelectedSlot é uma vaga do firing já com o chunk foco escolhido.
type SelectedSlot struct {
	ChallengerIndex int
	Chunk           RetrievedChunk
}

// assignSlots distribui os chunks encontrados pelas vagas dos desafios, na ordem dos desafios.
// Se houver menos chunks do que vagas (um documento pequeno, por exemplo), os já escolhidos se
// repetem em rodízio, para cada desafio ainda vir com a quantidade de itens configurada.
func assignSlots(challengers []model.Challenger, chunks []RetrievedChunk) []SelectedSlot {
	if len(chunks) == 0 {
		return nil
	}

	var selected []SelectedSlot
	next := 0
	for index, challenger := range challengers {
		for i := 0; i < challenger.ItemCount(); i++ {
			selected = append(selected, SelectedSlot{ChallengerIndex: index, Chunk: chunks[next%len(chunks)]})
			next++
		}
	}
	return selected
}

// loadSupportChunks completa o mapa com os vizinhos dos chunks foco, usados como apoio. Os
// vizinhos são opcionais: uma falha ao buscá-los só tira o apoio dos slots.
func (s *RAGService) loadSupportChunks(ctx context.Context, selected []SelectedSlot, available map[string]RetrievedChunk) {
	seen := make(map[string]bool)
	var neighbors []string
	for _, slot := range selected {
		for _, key := range neighborKeys(slot.Chunk.Key) {
			if _, ok := available[key]; !ok && !seen[key] {
				seen[key] = true
				neighbors = append(neighbors, key)
			}
		}
	}

	if len(neighbors) > 0 {
		chunks, err := s.VectorService.GetChunksByKeys(ctx, neighbors)
		if err != nil {
			logger.Log.Error("failed to load support chunks, generating without them: ", logger.Any("error", err))
			return
		}
		for key, chunk := range chunks {
			available[key] = chunk
		}
	}
}

type challengerSlot struct {
	challengerIndex int
	slot            GenerationSlot
}

// buildGenerationSlots transforma as vagas escolhidas em slots do prompt, com o vizinho como
// apoio. O apoio nunca é o chunk foco de outra vaga.
func buildGenerationSlots(selected []SelectedSlot, available map[string]RetrievedChunk) []challengerSlot {
	focusKeys := make(map[string]bool, len(selected))
	for _, slot := range selected {
		focusKeys[slot.Chunk.Key] = true
	}

	supportPool := make(map[string]RetrievedChunk, len(available))
	for key, chunk := range available {
		if !focusKeys[key] {
			supportPool[key] = chunk
		}
	}

	slots := make([]challengerSlot, 0, len(selected))
	for _, slot := range selected {
		generationSlot := GenerationSlot{Main: slot.Chunk}
		if support, ok := supportFor(slot.Chunk.Key, supportPool); ok {
			generationSlot.Support = &support
		}
		slots = append(slots, challengerSlot{challengerIndex: slot.ChallengerIndex, slot: generationSlot})
	}
	return slots
}

// groupGenerationSlots agrupa os slots por desafio, mantendo a ordem.
func groupGenerationSlots(slots []challengerSlot) map[int][]GenerationSlot {
	grouped := make(map[int][]GenerationSlot)
	for _, slot := range slots {
		grouped[slot.challengerIndex] = append(grouped[slot.challengerIndex], slot.slot)
	}
	return grouped
}

// promptTopics monta a lista de tópicos do prompt: as tags usadas na busca e, para completar,
// tags sorteadas dos objetos do agendador, até o limite. Serve só para o modelo escolher a
// tag de cada item; não participa da seleção.
func promptTopics(searchedTags []string, objects []*model.Object) []string {
	seen := make(map[string]bool)
	topics := make([]string, 0, maxPromptTopics)
	for _, tag := range searchedTags {
		if !seen[tag] && len(topics) < maxPromptTopics {
			seen[tag] = true
			topics = append(topics, tag)
		}
	}

	var others []string
	for _, object := range objects {
		for _, tag := range object.Tags {
			if !seen[tag] {
				seen[tag] = true
				others = append(others, tag)
			}
		}
	}
	rand.Shuffle(len(others), func(i, j int) { others[i], others[j] = others[j], others[i] })

	for _, tag := range others {
		if len(topics) >= maxPromptTopics {
			break
		}
		topics = append(topics, tag)
	}
	return topics
}

// Limiares do filtro de chunk foco. Ainda não foram calibrados com documentos reais.
const (
	minFocusRunes       = 200
	minFocusLetterRatio = 0.6
	maxFocusDigitRatio  = 0.3
	maxFocusDotLeaders  = 3
)

// isUsableFocus descarta chunks que provavelmente não geram uma boa pergunta: pouco texto
// útil (cabeçalhos, itens soltos), sumários com linhas pontilhadas e trechos quase todos
// numéricos (tabelas).
func isUsableFocus(content string) bool {
	trimmed := strings.TrimSpace(content)
	if len([]rune(trimmed)) < minFocusRunes {
		return false
	}
	if strings.Count(trimmed, "....") >= maxFocusDotLeaders {
		return false
	}

	letters, digits, visible := 0, 0, 0
	for _, r := range trimmed {
		if unicode.IsSpace(r) {
			continue
		}
		visible++
		switch {
		case unicode.IsLetter(r):
			letters++
		case unicode.IsDigit(r):
			digits++
		}
	}
	if visible == 0 {
		return false
	}

	return float64(letters)/float64(visible) >= minFocusLetterRatio && float64(digits)/float64(visible) <= maxFocusDigitRatio
}

func (s *RAGService) generateQuery(tag string) string {
	queries := []string{
		tag,
		fmt.Sprintf("concepts about %s", tag),
		fmt.Sprintf("facts about %s", tag),
		fmt.Sprintf("explanations about %s", tag),
		fmt.Sprintf("events related to %s", tag),
	}

	return queries[rand.Intn(len(queries))]
}
