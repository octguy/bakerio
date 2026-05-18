package handler

import (
	"bytes"
	"context"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/product/dto"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

type MockImageService struct {
	mock.Mock
}

func (m *MockImageService) UploadImage(ctx context.Context, productID uuid.UUID, r io.Reader, contentType string, isPrimary bool) (dto.ProductImageResponse, error) {
	args := m.Called(ctx, productID, r, contentType, isPrimary)
	return args.Get(0).(dto.ProductImageResponse), args.Error(1)
}

func (m *MockImageService) DeleteImage(ctx context.Context, imageID uuid.UUID) error {
	args := m.Called(ctx, imageID)
	return args.Error(0)
}

func (m *MockImageService) SetPrimary(ctx context.Context, productID uuid.UUID, imageID uuid.UUID) error {
	args := m.Called(ctx, productID, imageID)
	return args.Error(0)
}

type ImageHandlerTestSuite struct {
	suite.Suite
	mockSvc *MockImageService
	handler *ImageHandler
	router  *gin.Engine
}

func (s *ImageHandlerTestSuite) SetupTest() {
	gin.SetMode(gin.TestMode)
	s.mockSvc = new(MockImageService)
	s.handler = NewImageHandler(s.mockSvc, 1024*1024)
	s.router = gin.New()

	group := s.router.Group("/products/:id/images")
	group.POST("", s.handler.Upload)
}

func (s *ImageHandlerTestSuite) TestUpload_InvalidType() {
	productID := uuid.New()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "test.txt")
	part.Write([]byte("some text"))
	writer.Close()

	w := httptest.NewRecorder()
	r, _ := http.NewRequest(http.MethodPost, "/products/"+productID.String()+"/images", body)
	r.Header.Set("Content-Type", writer.FormDataContentType())
	
	// Manually set a non-image content type for the file part if possible, 
	// but FormFile uses the header from the part.
	
	s.router.ServeHTTP(w, r)

	s.Equal(http.StatusUnprocessableEntity, w.Code)
}

func TestImageHandlerSuite(t *testing.T) {
	suite.Run(t, new(ImageHandlerTestSuite))
}
