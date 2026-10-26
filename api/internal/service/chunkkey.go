package service

import (
	"fmt"
	"strconv"
	"strings"
)

const chunkKeyPrefix = "vec_"

// chunkPosition é a posição de um chunk dentro de um objeto.
type chunkPosition struct {
	ObjectId   string
	Page       int
	ChunkIndex int
}

// buildChunkKey monta o id determinístico do vetor de um chunk. Precisa ser idêntico ao
// build_vector_id do processor (api/processor/services/utils.py): vec_<objectId>_<page>_<chunkIndex>.
func buildChunkKey(objectId string, page int, chunkIndex int) string {
	return fmt.Sprintf("%s%s_%d_%d", chunkKeyPrefix, objectId, page, chunkIndex)
}

// parseChunkKey desfaz buildChunkKey. O id do objeto pode ter underscores, então o
// índice e a página são lidos da direita.
func parseChunkKey(key string) (chunkPosition, bool) {
	rest, ok := strings.CutPrefix(key, chunkKeyPrefix)
	if !ok {
		return chunkPosition{}, false
	}

	indexSeparator := strings.LastIndex(rest, "_")
	if indexSeparator < 0 {
		return chunkPosition{}, false
	}
	chunkIndex, err := strconv.Atoi(rest[indexSeparator+1:])
	if err != nil || chunkIndex < 0 {
		return chunkPosition{}, false
	}

	beforeIndex := rest[:indexSeparator]
	pageSeparator := strings.LastIndex(beforeIndex, "_")
	if pageSeparator <= 0 {
		return chunkPosition{}, false
	}
	page, err := strconv.Atoi(beforeIndex[pageSeparator+1:])
	if err != nil || page < 1 {
		return chunkPosition{}, false
	}

	return chunkPosition{ObjectId: beforeIndex[:pageSeparator], Page: page, ChunkIndex: chunkIndex}, true
}

// neighborKeys lista os vizinhos de um chunk na mesma página: o seguinte primeiro e depois o
// anterior. Nem todo vizinho existe (o último chunk de uma página não tem seguinte), então
// quem usa deve tolerar a ausência.
func neighborKeys(key string) []string {
	position, ok := parseChunkKey(key)
	if !ok {
		return nil
	}

	neighbors := []string{buildChunkKey(position.ObjectId, position.Page, position.ChunkIndex+1)}
	if position.ChunkIndex > 0 {
		neighbors = append(neighbors, buildChunkKey(position.ObjectId, position.Page, position.ChunkIndex-1))
	}
	return neighbors
}

// supportFor escolhe o chunk de apoio de um foco: o vizinho seguinte se ele existe, senão o
// anterior (caso do último chunk da página).
func supportFor(focusKey string, available map[string]RetrievedChunk) (RetrievedChunk, bool) {
	for _, key := range neighborKeys(focusKey) {
		if chunk, ok := available[key]; ok {
			return chunk, true
		}
	}
	return RetrievedChunk{}, false
}
