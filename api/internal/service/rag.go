package service

import (
	"context"
	"fmt"
	"math/rand"
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
	// perTagTopK é quantos chunks cada tag traz; o chunk principal de cada vaga é sorteado entre eles.
	perTagTopK = 6
	// maxSearchTags limita as tags sorteadas por firing. Cada tag custa um embedding e uma
	// consulta, e tags diferentes mantêm assuntos diferentes no mesmo disparo.
	maxSearchTags = 4
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
	for _, found := range candidates {
		available[found.chunk.Key] = found.chunk
	}
	s.loadSupportChunks(ctx, selected, available)

	slotsByChallenger := groupGenerationSlots(buildGenerationSlots(selected, available))
	language := string(scheduler.Language)

	logger.Log.Info(
		"selected chunks for the firing",
		logger.String("scheduler_id", scheduler.Id),
		logger.Any("slots", len(selected)),
		logger.Any("distinct_chunks", len(candidates)),
		logger.Any("tags", searchedTags),
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
			result.MultipleChoices, err = s.GenerationService.GenerateMultipleChoices(ctx, slots, language)
		case model.ChallengeTypeTrueFalse:
			result.TrueFalses, err = s.GenerationService.GenerateTrueFalse(ctx, slots, language)
		case model.ChallengeTypeDiscovery:
			result.Discoveries, err = s.GenerationService.GenerateDiscoveries(ctx, slots, language)
		default:
			err = fmt.Errorf("unsupported challenge type: %s", challenger.ChallengeType)
		}
		if err != nil {
			// Sem itens ligados com certeza aos seus chunks, o tipo fica fora deste disparo; os
			// outros tipos seguem valendo.
			logger.Log.Error("failed generating a challenge type, leaving it out of the firing: ", logger.String("challenge_type", string(challenger.ChallengeType)), logger.Any("error", err))
			continue
		}

		results = append(results, result)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("no challenge could be generated for this firing")
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

// foundChunk é um chunk foco junto com a tag cuja busca o encontrou.
type foundChunk struct {
	chunk RetrievedChunk
	tag   string
}

// findNewChunks busca os chunks foco do firing: uma busca por tag sorteada, com a tag pura
// como consulta, alternando entre os objetos. Devolve os chunks e as tags usadas.
func (s *RAGService) findNewChunks(ctx context.Context, userId string, objects []*model.Object, needed int) ([]foundChunk, []string, error) {
	search := func(ctx context.Context, object *model.Object, tag string) ([]RetrievedChunk, error) {
		return s.VectorService.RetrieveRelevantChunks(ctx, userId, object.Key, tag, perTagTopK)
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

// newChunkSearch busca, dentro do objeto, os chunks mais parecidos com uma tag.
type newChunkSearch func(ctx context.Context, object *model.Object, tag string) ([]RetrievedChunk, error)

// tagSearch é uma busca planejada: o objeto e a tag consultada nele.
type tagSearch struct {
	object *model.Object
	tag    string
}

// planTagSearches sorteia as tags de um firing: as tags de cada objeto ativo em ordem
// sorteada, alternando entre os objetos (uma do primeiro, uma do segundo...) para um objeto
// com muitas tags não ocupar todas as buscas.
func planTagSearches(objects []*model.Object, count int) []tagSearch {
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

	var searches []tagSearch
	for len(searches) < count {
		progressed := false

		for _, pool := range pools {
			if len(searches) >= count {
				break
			}
			if pool.used >= len(pool.tags) {
				continue
			}

			searches = append(searches, tagSearch{object: pool.object, tag: pool.tags[pool.used]})
			pool.used++
			progressed = true
		}

		if !progressed {
			break
		}
	}
	return searches
}

// gatherNewChunks junta os chunks foco do firing. Faz uma busca por tag sorteada, até
// maxSearchTags, e preenche as vagas em rodízio entre as tags (ver pickSpread), para o firing
// cobrir assuntos diferentes. Chunks repetidos ou sem texto útil são descartados. Só devolve
// erro se nada foi encontrado e toda busca falhou.
func gatherNewChunks(ctx context.Context, objects []*model.Object, needed int, search newChunkSearch) ([]foundChunk, []string, error) {
	searches := planTagSearches(objects, min(needed, maxSearchTags))
	if len(searches) == 0 {
		return nil, nil, nil
	}

	var perTag []tagResults
	var usedTags []string
	var lastErr error
	seen := make(map[string]bool)

	for _, planned := range searches {
		chunks, err := search(ctx, planned.object, planned.tag)
		if err != nil {
			lastErr = err
			logger.Log.Error("failed retrieving chunks for one tag, skipping it", logger.String("tag", planned.tag), logger.Any("error", err))
			continue
		}
		usedTags = append(usedTags, planned.tag)

		var usable []RetrievedChunk
		for _, chunk := range chunks {
			if seen[chunk.Key] || !isUsableFocus(chunk.Content) {
				continue
			}
			seen[chunk.Key] = true
			usable = append(usable, chunk)
		}
		if len(usable) > 0 {
			perTag = append(perTag, tagResults{tag: planned.tag, chunks: usable})
		}
	}

	found := pickSpread(perTag, needed)
	if len(found) == 0 && lastErr != nil {
		return nil, usedTags, lastErr
	}
	return found, usedTags, nil
}

// tagResults são os chunks utilizáveis que a busca de uma tag trouxe.
type tagResults struct {
	tag    string
	chunks []RetrievedChunk
}

// pickSpread escolhe até `needed` chunks em rodízio entre as tags: uma vaga da primeira tag,
// uma da segunda, e assim por diante. Em cada vaga o chunk é sorteado entre os da lista da
// tag que ainda não foram escolhidos, para a mesma tag não trazer sempre o mesmo trecho. Na
// primeira passada o sorteio só aceita páginas que nenhum chunk escolhido ocupa, para dois
// desafios não virarem o mesmo parágrafo; se isso não fechar as vagas (documento pequeno),
// uma segunda passada aceita repetir a página, ainda em rodízio entre as tags.
func pickSpread(perTag []tagResults, needed int) []foundChunk {
	taken := make(map[string]bool)
	pages := make(map[string]bool)
	var found []foundChunk

	pageOf := func(chunk RetrievedChunk) string {
		return fmt.Sprintf("%s#%d", chunk.ObjectKey, chunk.Page)
	}

	sweep := func(allowUsedPage bool) {
		for len(found) < needed {
			progressed := false

			for _, queue := range perTag {
				if len(found) >= needed {
					return
				}

				var options []RetrievedChunk
				for _, chunk := range queue.chunks {
					if !taken[chunk.Key] && (allowUsedPage || !pages[pageOf(chunk)]) {
						options = append(options, chunk)
					}
				}
				if len(options) == 0 {
					continue
				}

				chunk := options[rand.Intn(len(options))]
				taken[chunk.Key] = true
				pages[pageOf(chunk)] = true
				found = append(found, foundChunk{chunk: chunk, tag: queue.tag})
				progressed = true
			}

			if !progressed {
				return
			}
		}
	}

	sweep(false)
	if len(found) < needed {
		sweep(true)
	}
	return found
}

// SelectedSlot é uma vaga do firing já com o chunk foco escolhido e a tag que o encontrou.
type SelectedSlot struct {
	ChallengerIndex int
	Chunk           RetrievedChunk
	Tag             string
}

// assignSlots distribui os chunks encontrados pelas vagas dos desafios, na ordem dos desafios.
// Se houver menos chunks do que vagas (um documento pequeno, por exemplo), os já escolhidos se
// repetem em rodízio, para cada desafio ainda vir com a quantidade de itens configurada.
func assignSlots(challengers []model.Challenger, chunks []foundChunk) []SelectedSlot {
	if len(chunks) == 0 {
		return nil
	}

	var selected []SelectedSlot
	next := 0
	for index, challenger := range challengers {
		for i := 0; i < challenger.ItemCount(); i++ {
			found := chunks[next%len(chunks)]
			selected = append(selected, SelectedSlot{ChallengerIndex: index, Chunk: found.chunk, Tag: found.tag})
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
		generationSlot := GenerationSlot{Main: slot.Chunk, Tag: slot.Tag}
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
