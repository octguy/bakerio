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
