package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/auth/dto"
	"github.com/octguy/bakerio/backend/internal/auth/service"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
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

func (h *AuthHandler) RegisterRoutes(public, protected *gin.RouterGroup) {
	pub := public.Group("/auth")
	pub.POST("/register", h.Register)
	pub.POST("/login", h.Login)
	pub.POST("/verify", h.VerifyEmail)

	prot := protected.Group("/auth")
	prot.POST("/logout", h.Logout)
	prot.PATCH("/password", h.ChangePassword)
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

	res, err := h.svc.Register(c.Request.Context(), req)
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
		logger.Log.Warn("login: invalid request body", zap.Error(err))
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	res, err := h.svc.Login(c.Request.Context(), req)
	if err != nil {
		logger.Log.Warn("login: failed", zap.String("email", req.Email), zap.Error(err))
		response.Error(c, err)
		return
	}

	logger.Log.Info("register: success", zap.String("email", req.Email))
	response.Success(c, http.StatusOK, res)
}

// VerifyEmail godoc
// @Summary      Verify email address
// @Description  Verifies a user's email using the 6-digit OTP sent after registration
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body     dto.VerifyEmailRequest  true "Verify email payload"
// @Success      200     {object} dto.VerifyEmailResponse
// @Failure      400     {object} response.ErrorResponse "Invalid or expired OTP"
// @Failure      404     {object} response.ErrorResponse "User not found"
// @Failure      422     {object} response.ErrorResponse "Validation error"
// @Failure      500     {object} response.ErrorResponse "Internal server error"
// @Router       /auth/verify [post]
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req dto.VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Log.Warn("verify: invalid request body", zap.Error(err))
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	res, err := h.svc.VerifyEmail(c.Request.Context(), req)
	if err != nil {
		logger.Log.Warn("verify: invalid otp code", zap.String("otp", req.OTP), zap.Error(err))
		response.Error(c, err)
		return
	}

	logger.Log.Info("verify: success", zap.String("userId", req.UserId.String()))
	response.Success(c, http.StatusOK, res)
}

// Logout godoc
// @Summary      Logout
// @Description  Invalidates the current JWT by adding it to the Redis blacklist
// @Tags         auth
// @Security     BearerAuth
// @Success      204
// @Failure      401  {object} response.ErrorResponse
// @Router       /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	jti, _ := c.Get(middleware.JTIKey)
	exp, _ := c.Get(middleware.ExpiresAtKey)

	if err := h.svc.Logout(c.Request.Context(), jti.(string), exp.(time.Time)); err != nil {
		logger.Log.Error("logout: failed to blacklist token", zap.Error(err))
		response.Error(c, apperrors.Internal("logout failed", err))
		return
	}

	c.Status(http.StatusNoContent)
}

// ChangePassword godoc
// @Summary      Change own password
// @Description  Changes the authenticated user's password after verifying the current one
// @Tags         auth
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request body     dto.ChangePasswordRequest true "Change password payload"
// @Success      204
// @Failure      401  {object} response.ErrorResponse
// @Failure      422  {object} response.ErrorResponse
// @Router       /auth/password [patch]
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req dto.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	userID, _ := c.Get(middleware.UserIDKey)
	if err := h.svc.ChangePassword(c.Request.Context(), userID.(uuid.UUID), req.CurrentPassword, req.NewPassword); err != nil {
		response.Error(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}
