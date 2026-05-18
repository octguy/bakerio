package mediastore

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

type MediaStore interface {
	Upload(ctx context.Context, prefix string, r io.Reader, contentType string) (publicURL string, err error)
	Delete(ctx context.Context, publicURL string) error
}

type localMediaStore struct {
	uploadsDir string
	baseURL    string
}

func NewLocalMediaStore(uploadsDir, baseURL string) (MediaStore, error) {
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create uploads directory: %w", err)
	}
	return &localMediaStore{
		uploadsDir: uploadsDir,
		baseURL:    strings.TrimSuffix(baseURL, "/"),
	}, nil
}

func (s *localMediaStore) Upload(ctx context.Context, prefix string, r io.Reader, contentType string) (string, error) {
	ext := ""
	switch contentType {
	case "image/jpeg":
		ext = ".jpg"
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	default:
		return "", fmt.Errorf("unsupported content type: %s", contentType)
	}

	filename := uuid.New().String() + ext
	dir := filepath.Join(s.uploadsDir, prefix)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create prefix directory: %w", err)
	}

	filePath := filepath.Join(dir, filename)
	f, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer f.Close()

	if _, err := io.Copy(f, r); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	return fmt.Sprintf("%s/uploads/%s/%s", s.baseURL, prefix, filename), nil
}

func (s *localMediaStore) Delete(ctx context.Context, publicURL string) error {
	// Extract relative path from public URL
	// e.g. "http://localhost:8080/uploads/products/uuid.jpg" -> "products/uuid.jpg"
	search := "/uploads/"
	idx := strings.Index(publicURL, search)
	if idx == -1 {
		return fmt.Errorf("invalid public URL: %s", publicURL)
	}

	relPath := publicURL[idx+len(search):]
	fullPath := filepath.Join(s.uploadsDir, relPath)
	return os.Remove(fullPath)
}
