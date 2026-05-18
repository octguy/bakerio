package service

import (
	"context"
	"io"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/shared/domain"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// --- MOCKS ---

type MockImageRepo struct {
	mock.Mock
}

func (m *MockImageRepo) AddImage(ctx context.Context, productID uuid.UUID, url string, isPrimary bool, sortOrder int32) (*domain.ProductImage, error) {
	args := m.Called(ctx, productID, url, isPrimary, sortOrder)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ProductImage), args.Error(1)
}

func (m *MockImageRepo) ListByProduct(ctx context.Context, productID uuid.UUID) ([]*domain.ProductImage, error) {
	args := m.Called(ctx, productID)
	return args.Get(0).([]*domain.ProductImage), args.Error(1)
}

func (m *MockImageRepo) SetPrimary(ctx context.Context, productID uuid.UUID, imageID uuid.UUID) error {
	args := m.Called(ctx, productID, imageID)
	return args.Error(0)
}

func (m *MockImageRepo) Delete(ctx context.Context, imageID uuid.UUID) error {
	args := m.Called(ctx, imageID)
	return args.Error(0)
}

func (m *MockImageRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.ProductImage, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ProductImage), args.Error(1)
}

type MockMediaStore struct {
	mock.Mock
}

func (m *MockMediaStore) Upload(ctx context.Context, dir string, r io.Reader, contentType string) (string, error) {
	args := m.Called(ctx, dir, r, contentType)
	return args.String(0), args.Error(1)
}

func (m *MockMediaStore) Delete(ctx context.Context, url string) error {
	args := m.Called(ctx, url)
	return args.Error(0)
}

type MockImageTxManager struct {
	mock.Mock
}

func (m *MockImageTxManager) WithTx(ctx context.Context, fn func(ctx context.Context) error) error {
	m.Called(ctx, mock.Anything)
	return fn(ctx)
}

// --- TEST SUITE ---

type ImageServiceTestSuite struct {
	suite.Suite
	mockRepo  *MockImageRepo
	mockMS    *MockMediaStore
	mockTx    *MockImageTxManager
	service   ImageService
}

func (s *ImageServiceTestSuite) SetupTest() {
	s.mockRepo = new(MockImageRepo)
	s.mockMS = new(MockMediaStore)
	s.mockTx = new(MockImageTxManager)
	s.service = NewImageService(s.mockTx, s.mockRepo, s.mockMS)
}

func (s *ImageServiceTestSuite) TestUploadImage() {
	ctx := context.Background()
	productID := uuid.New()
	url := "http://example.com/img.jpg"
	content := strings.NewReader("fake-image")

	img := &domain.ProductImage{ID: uuid.New(), Url: url}

	s.Run("Success", func() {
		s.mockMS.On("Upload", ctx, "products", content, "image/jpeg").Return(url, nil).Once()
		s.mockTx.On("WithTx", ctx, mock.Anything).Return(nil).Once()
		s.mockRepo.On("AddImage", ctx, productID, url, false, int32(0)).Return(img, nil).Once()

		res, err := s.service.UploadImage(ctx, productID, content, "image/jpeg", false)

		s.NoError(err)
		s.Equal(url, res.Url)
		s.mockMS.AssertExpectations(s.T())
		s.mockTx.AssertExpectations(s.T())
		s.mockRepo.AssertExpectations(s.T())
	})
}

func (s *ImageServiceTestSuite) TestDeleteImage() {
	ctx := context.Background()
	id := uuid.New()
	url := "http://example.com/img.jpg"
	img := &domain.ProductImage{ID: id, Url: url}

	s.Run("Success", func() {
		s.mockRepo.On("GetByID", ctx, id).Return(img, nil).Once()
		s.mockTx.On("WithTx", ctx, mock.Anything).Return(nil).Once()
		s.mockRepo.On("Delete", ctx, id).Return(nil).Once()
		s.mockMS.On("Delete", ctx, url).Return(nil).Once()

		err := s.service.DeleteImage(ctx, id)

		s.NoError(err)
		s.mockRepo.AssertExpectations(s.T())
		s.mockTx.AssertExpectations(s.T())
		s.mockMS.AssertExpectations(s.T())
	})
}

func (s *ImageServiceTestSuite) TestSetPrimary() {
	ctx := context.Background()
	productID := uuid.New()
	imageID := uuid.New()

	s.Run("Success", func() {
		s.mockTx.On("WithTx", ctx, mock.Anything).Return(nil).Once()
		s.mockRepo.On("SetPrimary", ctx, productID, imageID).Return(nil).Once()

		err := s.service.SetPrimary(ctx, productID, imageID)
		s.NoError(err)
		s.mockRepo.AssertExpectations(s.T())
		s.mockTx.AssertExpectations(s.T())
	})
}

func TestImageServiceSuite(t *testing.T) {
	suite.Run(t, new(ImageServiceTestSuite))
}
