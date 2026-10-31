package service

import (
	"fmt"
	"strconv"
	"strings"
)

const chunkKeyPrefix = "vec_"

type chunkPosition struct {
	ObjectId   string
	Page       int
	ChunkIndex int
}

func buildChunkKey(objectId string, page int, chunkIndex int) string {
	return fmt.Sprintf("%s%s_%d_%d", chunkKeyPrefix, objectId, page, chunkIndex)
}

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

func supportFor(focusKey string, available map[string]RetrievedChunk) (RetrievedChunk, bool) {
	for _, key := range neighborKeys(focusKey) {
		if chunk, ok := available[key]; ok {
			return chunk, true
		}
	}
	return RetrievedChunk{}, false
}
