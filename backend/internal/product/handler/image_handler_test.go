package handler

import (
	"bytes"
	"context"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
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
	group.DELETE("/:imgId", s.handler.Delete)
	group.PATCH("/:imgId/primary", s.handler.SetPrimary)
}

func (s *ImageHandlerTestSuite) TestUpload() {
	productID := uuid.New()
	url := "http://example.com/test.jpg"
	resp := dto.ProductImageResponse{ID: uuid.New(), Url: url}

	s.Run("Success", func() {
		s.mockSvc.On("UploadImage", mock.Anything, productID, mock.Anything, "image/jpeg", false).Return(resp, nil).Once()

		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		
		h := make(textproto.MIMEHeader)
		h.Set("Content-Disposition", `form-data; name="file"; filename="test.jpg"`)
		h.Set("Content-Type", "image/jpeg")
		part, _ := writer.CreatePart(h)
		part.Write([]byte("fake image data"))
		writer.Close()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/products/"+productID.String()+"/images", body)
		r.Header.Set("Content-Type", writer.FormDataContentType())
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusCreated, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Invalid Type", func() {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		part, _ := writer.CreateFormFile("file", "test.txt")
		part.Write([]byte("some text"))
		writer.Close()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPost, "/products/"+productID.String()+"/images", body)
		r.Header.Set("Content-Type", writer.FormDataContentType())
		
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *ImageHandlerTestSuite) TestDelete() {
	productID := uuid.New()
	imageID := uuid.New()

	s.Run("Success", func() {
		s.mockSvc.On("DeleteImage", mock.Anything, imageID).Return(nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodDelete, "/products/"+productID.String()+"/images/"+imageID.String(), nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusNoContent, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Invalid Image ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodDelete, "/products/"+productID.String()+"/images/invalid", nil)
		s.router.ServeHTTP(w, r)
		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *ImageHandlerTestSuite) TestSetPrimary() {
	productID := uuid.New()
	imageID := uuid.New()

	s.Run("Success", func() {
		s.mockSvc.On("SetPrimary", mock.Anything, productID, imageID).Return(nil).Once()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/products/"+productID.String()+"/images/"+imageID.String()+"/primary", nil)
		s.router.ServeHTTP(w, r)

		s.Equal(http.StatusNoContent, w.Code)
		s.mockSvc.AssertExpectations(s.T())
	})

	s.Run("Invalid Product ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/products/invalid/images/"+imageID.String()+"/primary", nil)
		s.router.ServeHTTP(w, r)
		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})

	s.Run("Invalid Image ID", func() {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodPatch, "/products/"+productID.String()+"/images/invalid/primary", nil)
		s.router.ServeHTTP(w, r)
		s.Equal(http.StatusUnprocessableEntity, w.Code)
	})
}

func (s *ImageHandlerTestSuite) TestRegisterRoutes() {
	router := gin.New()
	s.handler.RegisterRoutes(router.Group("/api"))
	s.NotNil(router)
}

func TestImageHandlerSuite(t *testing.T) {
	suite.Run(t, new(ImageHandlerTestSuite))
}
