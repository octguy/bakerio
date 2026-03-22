package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/auth/dto"
	"github.com/octguy/bakerio/backend/internal/auth/service"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"go.uber.org/zap"
)

type AuthHandler struct {
	svc service.AuthService
}

func NewAuthHandler(svc service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

func (h *AuthHandler) RegisterRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	auth.POST("/register", h.Register)
	auth.POST("/login", h.Login)
}

// Register godoc
// @Summary      Register a new user
// @Description  Creates a new user account and profile in a single transaction
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body     dto.RegisterRequest  true "Register payload"
// @Success      201     {object} dto.RegisterResponse
// @Failure      409     {object} response.ErrorResponse "Email already taken"
// @Failure      422     {object} response.ErrorResponse "Validation error"
// @Failure      500     {object} response.ErrorResponse "Internal server error"
// @Router       /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Log.Warn("register: invalid request body", zap.Error(err))
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	logger.Log.Debug("register: incoming request", zap.String("email", req.Email))

	res, err := h.svc.Register(c.Request.Context(), &req)
	if err != nil {
		logger.Log.Warn("register: failed", zap.String("email", req.Email), zap.Error(err))
		response.Error(c, err)
		return
	}

	logger.Log.Info("register: success", zap.String("user_id", res.ID.String()), zap.String("email", res.Email))
	response.Success(c, http.StatusCreated, res)
}

// Login godoc
// @Summary      Login
// @Description  Authenticates a user and returns a JWT access token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body     dto.LoginRequest  true "Login payload"
// @Success      200     {object} dto.LoginResponse
// @Failure      401     {object} response.ErrorResponse "Invalid credentials"
// @Failure      422     {object} response.ErrorResponse "Validation error"
// @Router       /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
	}

	res, err := h.svc.Login(c.Request.Context(), &req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}
