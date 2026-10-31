package service

import (
	"encoding/json"
	"testing"

	smithydocumentjson "github.com/aws/smithy-go/document/json"
)

// Os metadados chegam do S3 Vectors como documento JSON, e o SDK os decodifica com o decodificador
// de documentos do smithy-go (o mesmo de UnmarshalSmithyDocument). Os nomes com sublinhado
// (object_key, chunk_index) precisam ser lidos, e não ficar com o valor zero.
func TestVectorMetadataDecodesEveryFieldWrittenByTheProcessor(t *testing.T) {
	payload := `{"user":"usr_1","object_key":"tenants/usr_1/context/obj_1/aula.pdf","page":7,"chunk_index":2,"language":"pt","chunk":"texto do trecho"}`
	var value interface{}
	if err := json.Unmarshal([]byte(payload), &value); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	var metadata VectorMetadata
	if err := smithydocumentjson.NewDecoder().DecodeJSONInterface(value, &metadata); err != nil {
		t.Fatalf("decode failed: %v", err)
	}

	if metadata.ObjectKey != "tenants/usr_1/context/obj_1/aula.pdf" {
		t.Errorf("ObjectKey = %q", metadata.ObjectKey)
	}
	if metadata.ChunkIndex != 2 {
		t.Errorf("ChunkIndex = %d, want 2", metadata.ChunkIndex)
	}
	if metadata.Page != 7 || metadata.User != "usr_1" || metadata.Language != "pt" || metadata.Chunk != "texto do trecho" {
		t.Errorf("unexpected metadata: %+v", metadata)
	}
}
