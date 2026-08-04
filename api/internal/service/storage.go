package service

import (
	"bytes"
	"context"
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
)

type StorageService struct {
	BucketName string
	S3Client *s3.Client
	S3PresignClient *s3.PresignClient
	MaxUploadSizeBytes int64
}

func NewStorageService(bucketName string, s3Client *s3.Client, maxUploadSizeBytes int64) *StorageService {
	return &StorageService{
		BucketName:      bucketName,
		S3Client:    	 s3Client,
		S3PresignClient: s3.NewPresignClient(s3Client),
		MaxUploadSizeBytes: maxUploadSizeBytes,
	}
}

func (s *StorageService) PresignGetObject(ctx context.Context, userId string, objectName string, lifetimeSecs int64)  (*v4.PresignedHTTPRequest, error) { 
	objectKey := fmt.Sprintf("tenants/%s/context/%s", userId,	objectName)
	
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

// PresignUploadObject returns a presigned POST (form-data) upload request, rather than a
// presigned PUT, because only S3's POST policy conditions support enforcing an upload size
// limit (content-length-range) -- that lets S3 itself reject an oversized upload before
// accepting any bytes, instead of only catching it later in the processor after the object
// already landed in the bucket.
func (s *StorageService) PresignUploadObject(ctx context.Context, userId string, objectName string, lifetimeSecs int64) (*s3.PresignedPostRequest, error) {
	objectKey := fmt.Sprintf("tenants/%s/context/%s", userId,	objectName)

	request, err := s.S3PresignClient.PresignPostObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.BucketName),
		Key:    aws.String(objectKey),
		}, func(opts *s3.PresignPostOptions) {
			opts.Expires = time.Duration(lifetimeSecs * int64(time.Second))
			opts.Conditions = []any{
				[]any{"content-length-range", 0, s.MaxUploadSizeBytes},
				// The client sends a Content-Type field (from the picked file's mime
				// type); every non-reserved form field must have a matching policy
				// condition or S3 rejects the whole request with 403 "Policy
				// Condition failed". starts-with with an empty value allows any
				// Content-Type without pinning it to a specific one.
				[]any{"starts-with", "$Content-Type", ""},
			}
	})
	if err != nil {
		logger.Log.Error("Couldn't get a presigned request to put %v:%v.",s.BucketName, objectKey, logger.Any("error", err))
	}
	return request, err
}

func (s *StorageService) DeleteObject(ctx context.Context, userId string, objectName string) error {
	objectKey := fmt.Sprintf("tenants/%s/context/%s", userId,	objectName)
	
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

func (s *StorageService) ListObjects(ctx context.Context, userId string) ([]string, error) {
	prefix := fmt.Sprintf("tenants/%s/context/", userId)
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

