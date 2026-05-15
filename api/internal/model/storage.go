package model

type ObjectMetadataContent struct {
	User       string   `json:"user"`
	Schedulers []string `json:"schedulers"`
	Tags       []string `json:"tags"`
}

type ObjectMetadata struct {
	MetadataAttributes *ObjectMetadataContent `json:"metadataAttributes"`
}