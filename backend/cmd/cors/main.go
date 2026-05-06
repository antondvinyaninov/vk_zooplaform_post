package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// Утилита для настройки CORS правил для бакета S3.
// Запускается так:
// export $(grep -v '^#' ../../.env | xargs) && go run main.go
func main() {
	endpoint := os.Getenv("S3_ENDPOINT")
	bucket := os.Getenv("S3_BUCKET")
	accessKey := os.Getenv("S3_ACCESS_KEY")
	secretKey := os.Getenv("S3_SECRET_KEY")
	region := os.Getenv("S3_REGION")

	if region == "" {
		region = "ru-central1"
	}

	if endpoint == "" || bucket == "" || accessKey == "" || secretKey == "" {
		log.Fatal("S3 env vars not set (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY)")
	}

	cfg := aws.Config{
		Region:      region,
		Credentials: credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
	})

	corsConfiguration := &types.CORSConfiguration{
		CORSRules: []types.CORSRule{
			{
				AllowedHeaders: []string{"*"},
				AllowedMethods: []string{"PUT", "POST", "GET", "DELETE", "HEAD"},
				AllowedOrigins: []string{"*"},
				ExposeHeaders:  []string{"ETag"},
				MaxAgeSeconds:  aws.Int32(3000),
			},
		},
	}

	_, err := client.PutBucketCors(context.TODO(), &s3.PutBucketCorsInput{
		Bucket:            aws.String(bucket),
		CORSConfiguration: corsConfiguration,
	})

	if err != nil {
		log.Fatalf("Failed to put bucket cors: %v", err)
	}

	fmt.Println("Successfully configured CORS on bucket:", bucket)
}
