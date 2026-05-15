package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/joaoleau/floslo/internal/config/logger"
	"github.com/joaoleau/floslo/internal/model"
)

type StorageService struct {
	BucketName string
	S3Client *s3.Client
	S3PresignClient *s3.PresignClient
}

func NewStorageService(bucketName string, s3Client *s3.Client) *StorageService {
	return &StorageService{
		BucketName:      bucketName,
		S3Client:    	 s3Client,
		S3PresignClient: s3.NewPresignClient(s3Client),
	}
}

func (s *StorageService) PresignGetObject(ctx context.Context, username string, objectName string, lifetimeSecs int64)  (*v4.PresignedHTTPRequest, error) { 
	objectKey := fmt.Sprintf("tenants/%s/context/%s", username,	objectName)
	
	request, err := s.S3PresignClient.PresignGetObject(ctx, &s3.GetObjectInput{ 
		Bucket: aws.String(s.BucketName), 
		Key:    aws.String(objectKey), 
		}, func(opts *s3.PresignOptions) { 
			opts.Expires = time.Duration(lifetimeSecs * int64(time.Second)) 
	}) 
	if err != nil { 
		logger.Log.Error("Couldn't get a presigned request to get %v:%v.",s.BucketName, objectName, logger.Any("error", err))
	}
	return request, err
}

func (s *StorageService) PresignPutObject(ctx context.Context, username string, objectName string, lifetimeSecs int64) (*v4.PresignedHTTPRequest, error) { 
	objectKey := fmt.Sprintf("tenants/%s/context/%s", username,	objectName)
	
	request, err := s.S3PresignClient.PresignPutObject(ctx, &s3.PutObjectInput{ 
		Bucket: aws.String(s.BucketName), 
		Key:    aws.String(objectKey), 
		}, func(opts *s3.PresignOptions) { 
			opts.Expires = time.Duration(lifetimeSecs * int64(time.Second)) 
	}) 
	if err != nil { 
		logger.Log.Error("Couldn't get a presigned request to put %v:%v.",s.BucketName, objectKey, logger.Any("error", err))
	} 
	return request, err
}

func (s *StorageService) DeleteObject(ctx context.Context, username string, objectName string) error {
	objectKey := fmt.Sprintf("tenants/%s/context/%s", username,	objectName)
	
	_, err := s.S3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
        Bucket: aws.String(s.BucketName),
        Key:    aws.String(objectKey),
    })

    if err != nil {
		logger.Log.Error("Couldn't delete object %v:%v.",s.BucketName, objectKey, logger.Any("error", err))
        return fmt.Errorf("delete object %s/%s: %w", s.BucketName, objectKey, err)
    }

    return nil
}

func (s *StorageService) GetObject(ctx context.Context, key string) ([]byte, error) {
	output, err := s.S3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.BucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		logger.Log.Error("Couldn't get object %v:%v.",s.BucketName, key, logger.Any("error", err))
		return nil, fmt.Errorf("get object %s/%s: %w", s.BucketName, key, err)
	}
	defer output.Body.Close()

	buf := new(bytes.Buffer)
	_, err = buf.ReadFrom(output.Body)
	if err != nil {
		logger.Log.Error("Couldn't read object body %v:%v.",s.BucketName, key, logger.Any("error", err))
		return nil, fmt.Errorf("read object body %s/%s: %w", s.BucketName, key, err)
	}
	return buf.Bytes(), nil
}

func (s *StorageService) ListObjects(ctx context.Context, username string) ([]string, error) {
	prefix := fmt.Sprintf("tenants/%s/context/", username)
	outputs, err := s.S3Client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(s.BucketName),
		Prefix: aws.String(prefix),
	})
	if err != nil {
		logger.Log.Error("Couldn't list objects %v:%v.",s.BucketName, prefix, logger.Any("error", err))
		return nil, fmt.Errorf("Couldn't list objects %s/%s: %w", s.BucketName, prefix, err)
	}
	var objects []string
	for _, obj := range outputs.Contents {
		if strings.HasSuffix(*obj.Key, "/") {
			continue
		}
		objectName := path.Base(*obj.Key)
		objects = append(objects, objectName)
	}

	return objects, nil
}

func (s *StorageService) PutObject(ctx context.Context, key string, content []byte) error {
	_, err := s.S3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.BucketName),
		Key:    aws.String(key),
		Body:   bytes.NewReader(content),
	})
	if err != nil {
		logger.Log.Error("Couldn't put object %v:%v.",s.BucketName, key, logger.Any("error", err))
		return fmt.Errorf("put object %s/%s: %w", s.BucketName, key, err)
	}
	return nil
}

func (s *StorageService) CreateInitialMetadata(ctx context.Context, username string, documentName string) (model.ObjectMetadata, error) {
	return model.ObjectMetadata{
		MetadataAttributes: &model.ObjectMetadataContent{
			User: username,
			Schedulers: make([]string, 0),
		},
	}, nil
}

func (s *StorageService) GetObjectMetadata(ctx context.Context, metadataKey string) (model.ObjectMetadata, error) {
	data, err := s.GetObject(ctx, metadataKey)
	if err != nil {
		logger.Log.Error("failed to get document from storage: ", logger.Any("error", err), logger.String("metadataKey", metadataKey))
		return model.ObjectMetadata{}, fmt.Errorf("failed to get metadata from storage: %w", err)
	}
	var metadata model.ObjectMetadata
	err = json.Unmarshal(data, &metadata)
	if err != nil {
		logger.Log.Error("failed to unmarshal document metadata: ", logger.Any("error", err), logger.String("metadataKey", metadataKey))
		return model.ObjectMetadata{}, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}
	return metadata, nil
}

func (s *StorageService) UpdateObjectMetadata(ctx context.Context, metadataKey string, data []byte) (error) {
	err := s.PutObject(ctx, metadataKey, data)
	if err != nil {
		logger.Log.Error("failed to update document metadata in storage: ", logger.Any("error", err), logger.String("metadata", metadataKey))
		return fmt.Errorf("failed to update document metadata in storage: %w", err)
	}
	logger.Log.Info("document metadata updated: ", logger.String("metadata", metadataKey))
	return nil
}

func (s *StorageService) AddSchedulerOnObjectMetadata(ctx context.Context, username string, documentName string, scheduler string) error {
	metadataKey := fmt.Sprintf("tenants/%s/context/%s.metadata.json", username,	documentName)
	metadata, err := s.GetObjectMetadata(ctx, metadataKey)
	if err != nil {
		return err
	}

	metadata.MetadataAttributes.Schedulers = append(metadata.MetadataAttributes.Schedulers, scheduler)
	updatedMetadata, err := json.Marshal(metadata)
	if err != nil {
		logger.Log.Error("failed to marshal updated document metadata: ", logger.Any("error", err), logger.String("document", documentName))
		return fmt.Errorf("failed to marshal updated document metadata: %w", err)
	}
	err = s.UpdateObjectMetadata(ctx, metadataKey, updatedMetadata)
	if err != nil {
		return err
	}

	return nil
}

func (s *StorageService) DeleteSchedulerOnObjectMetadata(ctx context.Context, username string, documentName string, scheduler string) error {
	metadataKey := fmt.Sprintf("tenants/%s/context/%s.metadata.json", username,	documentName)
	metadata, err := s.GetObjectMetadata(ctx, metadataKey)
	if err != nil {
		return err
	}
	found := false
	updatedSchedulers := make([]string, 0)
	for _, s := range metadata.MetadataAttributes.Schedulers {
		if s == scheduler {
			continue
		}
		updatedSchedulers = append(updatedSchedulers, s)
	}
	if !found {
		return nil
	}
	metadata.MetadataAttributes.Schedulers = updatedSchedulers
	updatedMetadata, err := json.Marshal(metadata)
	if err != nil {
		logger.Log.Error("failed to marshal updated document metadata: ", logger.Any("error", err), logger.String("document", documentName))
		return fmt.Errorf("failed to marshal updated document metadata: %w", err)
	}
	err = s.UpdateObjectMetadata(ctx, metadataKey, updatedMetadata)
	if err != nil {
		return err
	}
	return nil
}

func (s *StorageService) ObjectExists(ctx context.Context, key string) (bool, error) {
	_, err := s.S3Client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.BucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		var notFoundErr *types.NotFound
		if errors.As(err, &notFoundErr) {
			return false, nil
		}
		return false, fmt.Errorf("check object existence %s/%s: %w", s.BucketName, key, err)
	}
	return true, nil
}

