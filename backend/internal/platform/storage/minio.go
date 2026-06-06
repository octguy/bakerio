package storage

import (
	"context"
	"fmt"
	"io"
	"strings"
	"sync"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/octguy/bakerio/backend/pkg/config"
)

// Client wraps a MinIO/S3 client for a single bucket whose objects are served
// publicly (product images).
//
// The bucket is ensured lazily on first upload (not at boot), so the app runs
// without MinIO until an image operation actually needs it.
type Client struct {
	mc        *minio.Client
	bucket    string
	publicURL string

	mu    sync.Mutex
	ready bool
}

func New(cfg config.StorageConfig) (*Client, error) {
	mc, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, err
	}
	return &Client{
		mc:        mc,
		bucket:    cfg.Bucket,
		publicURL: strings.TrimRight(cfg.PublicURL, "/"),
	}, nil
}

// ensure creates the bucket (with a public-read policy) on first use. It is
// safe to call repeatedly: once it succeeds it becomes a no-op; if MinIO is
// down it returns an error and will retry on the next call.
func (c *Client) ensure(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.ready {
		return nil
	}

	exists, err := c.mc.BucketExists(ctx, c.bucket)
	if err != nil {
		return err
	}
	if !exists {
		if err := c.mc.MakeBucket(ctx, c.bucket, minio.MakeBucketOptions{}); err != nil {
			return err
		}
	}

	policy := fmt.Sprintf(`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": ["*"]},
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::%s/*"]
  }]
}`, c.bucket)
	if err := c.mc.SetBucketPolicy(ctx, c.bucket, policy); err != nil {
		return err
	}

	c.ready = true
	return nil
}

func (c *Client) Upload(ctx context.Context, key string, r io.Reader, size int64, contentType string) error {
	if err := c.ensure(ctx); err != nil {
		return err
	}
	_, err := c.mc.PutObject(ctx, c.bucket, key, r, size, minio.PutObjectOptions{ContentType: contentType})
	return err
}

func (c *Client) Delete(ctx context.Context, key string) error {
	return c.mc.RemoveObject(ctx, c.bucket, key, minio.RemoveObjectOptions{})
}

// PublicURL builds the externally-reachable URL for an object key.
//
// If the stored value is already an absolute URL (starts with http:// or
// https://) we return it as-is. This lets seed data (or any future flow
// that wants to point at an external CDN / placeholder service) bypass the
// MinIO bucket prefix without confusing the read path.
func (c *Client) PublicURL(key string) string {
	if strings.HasPrefix(key, "http://") || strings.HasPrefix(key, "https://") {
		return key
	}
	return fmt.Sprintf("%s/%s/%s", c.publicURL, c.bucket, key)
}
