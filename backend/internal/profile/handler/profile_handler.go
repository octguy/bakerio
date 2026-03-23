package handler

import (
	"github.com/octguy/bakerio/backend/internal/profile/service"
)

type ProfileHandler struct {
	svc service.ProfileService
}

func NewProfileHandler(svc service.ProfileService) *ProfileHandler {
	return &ProfileHandler{svc: svc}
}

//func (h *ProfileHandler) RegisterRoutes(rg *gin.RouterGroup) {
//	auth := rg.Group("/profile")
//	auth.POST("/create", h.CreateProfile)
//}
//
//func (h *ProfileHandler) CreateProfile(c *gin.Context) {
//	var req dto.CreateProfileRequest
//	if err := c.ShouldBindJSON(&req); err != nil {
//		response.Error(c, apperrors.Validation(err.Error()))
//		return
//	}
//
//	res, err := h.svc.CreateProfile(c.Request.Context(), &req)
//	if err != nil {
//		response.Error(c, err)
//		return
//	}
//
//	response.Success(c, http.StatusCreated, res)
//}
