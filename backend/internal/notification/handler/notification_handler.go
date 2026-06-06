package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	_ "github.com/octguy/bakerio/backend/internal/notification/dto" // make sure swag walks dto
	"github.com/octguy/bakerio/backend/internal/notification/service"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

type Handler struct {
	svc service.QueryService
}

func NewHandler(svc service.QueryService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/notifications")
	g.GET("", h.List)
	g.GET("/unread-count", h.UnreadCount)
	g.PATCH("/read-all", h.MarkAllRead)
	g.PATCH("/:id/read", h.MarkRead)
}

// List godoc
// @Summary      List caller's notifications (paginated, newest first)
// @Tags         notifications
// @Security     BearerAuth
// @Produce      json
// @Param        unread query    boolean false "true → unread only, false → read only, omit → all"
// @Param        page   query    int     false "Page (default 1)"
// @Param        size   query    int     false "Page size (default 20)"
// @Success      200 {object} dto.NotificationListResponse
// @Router       /notifications [get]
func (h *Handler) List(c *gin.Context) {
	userID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	var unreadFilter *bool
	if v := c.Query("unread"); v != "" {
		switch strings.ToLower(v) {
		case "true", "1":
			t := true
			unreadFilter = &t
		case "false", "0":
			f := false
			unreadFilter = &f
		default:
			response.Error(c, apperrors.Validation("unread must be true or false"))
			return
		}
	}
	res, err := h.svc.List(c.Request.Context(), userID, unreadFilter, pagination.FromQuery(c))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// UnreadCount godoc
// @Summary      Bell-icon badge count (polled every ~10s)
// @Tags         notifications
// @Security     BearerAuth
// @Produce      json
// @Success      200 {object} dto.UnreadCountResponse
// @Router       /notifications/unread-count [get]
func (h *Handler) UnreadCount(c *gin.Context) {
	userID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	count, err := h.svc.UnreadCount(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, gin.H{"count": count})
}

// MarkRead godoc
// @Summary      Mark one notification as read (idempotent)
// @Tags         notifications
// @Security     BearerAuth
// @Produce      json
// @Param        id path string true "Notification ID"
// @Success      200 {object} dto.NotificationResponse
// @Failure      404 {object} response.ErrorResponse
// @Router       /notifications/{id}/read [patch]
func (h *Handler) MarkRead(c *gin.Context) {
	userID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid notification id"))
		return
	}
	res, err := h.svc.MarkRead(c.Request.Context(), userID, id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// MarkAllRead godoc
// @Summary      Mark every unread notification as read
// @Tags         notifications
// @Security     BearerAuth
// @Produce      json
// @Success      200 {object} dto.MarkReadAllResponse
// @Router       /notifications/read-all [patch]
func (h *Handler) MarkAllRead(c *gin.Context) {
	userID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	n, err := h.svc.MarkAllRead(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, gin.H{"updated": n})
}
