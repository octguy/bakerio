package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"github.com/octguy/bakerio/backend/internal/branch/dto"
	"github.com/octguy/bakerio/backend/internal/branch/service"
)


type BranchHandler struct {
	svc service.BranchService
}

func NewBranchHandler(svc service.BranchService) *BranchHandler {
	return &BranchHandler{svc: svc}
}

func (h *BranchHandler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/branch")
	g.GET("", h.GetBranchList)
	g.GET(":id", h.GetBranchByID)
	g.POST("", h.CreateBranch)
	g.PATCH(":id", h.UpdateBranch)
	g.PATCH(":id/status", h.UpdateStatus)
}