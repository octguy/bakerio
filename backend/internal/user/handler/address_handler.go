package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"github.com/octguy/bakerio/backend/internal/user/dto"
	"github.com/octguy/bakerio/backend/internal/user/service"
)

type AddressHandler struct {
	svc service.AddressService
}

func NewAddressHandler(svc service.AddressService) *AddressHandler {
	return &AddressHandler{svc: svc}
}

func (h *AddressHandler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/addresses", middleware.RequirePermission("address:manage:own"))
	g.GET("", h.List)
	g.POST("", h.Create)
	// Static "/default" must be registered before "/:id" so it doesn't get
	// swallowed by the param route.
	g.GET("/default", h.GetDefault)
	g.GET("/:id", h.Get)
	g.PATCH("/:id", h.Update)
	g.DELETE("/:id", h.Delete)
	g.PUT("/:id/default", h.SetDefault)
}

func addressCallerID(c *gin.Context) (uuid.UUID, bool) {
	return authcontext.CallerID(c.Request.Context())
}

// List godoc
// @Summary      List the caller's saved addresses
// @Description  Returns all addresses for the authenticated user, default first.
// @Tags         addresses
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  dto.AddressListResponse
// @Router       /addresses [get]
func (h *AddressHandler) List(c *gin.Context) {
	userID, ok := addressCallerID(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	res, err := h.svc.List(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// GetDefault godoc
// @Summary      Get the caller's default address
// @Description  Returns the address flagged as default. 404 if the user has none saved.
// @Tags         addresses
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  dto.AddressResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /addresses/default [get]
func (h *AddressHandler) GetDefault(c *gin.Context) {
	userID, ok := addressCallerID(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	res, err := h.svc.GetDefault(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// Create godoc
// @Summary      Save a new address
// @Description  Creates an address for the caller. First-ever address auto-promotes to default; otherwise pass is_default=true to promote it (the previous default is demoted in the same tx).
// @Tags         addresses
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.CreateAddressRequest  true  "Address payload"
// @Success      201      {object}  dto.AddressResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /addresses [post]
func (h *AddressHandler) Create(c *gin.Context) {
	userID, ok := addressCallerID(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	var req dto.CreateAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	res, err := h.svc.Create(c.Request.Context(), userID, req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusCreated, res)
}

// Get godoc
// @Summary      Get a saved address
// @Tags         addresses
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Address ID"
// @Success      200  {object}  dto.AddressResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /addresses/{id} [get]
func (h *AddressHandler) Get(c *gin.Context) {
	userID, ok := addressCallerID(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid address id"))
		return
	}
	res, err := h.svc.Get(c.Request.Context(), userID, id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// Update godoc
// @Summary      Update an address
// @Description  Partial update for address text and/or lat/long. Use PUT /addresses/{id}/default to change which address is the default.
// @Tags         addresses
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id       path      string                    true  "Address ID"
// @Param        request  body      dto.UpdateAddressRequest  true  "Patch payload"
// @Success      200      {object}  dto.AddressResponse
// @Failure      404      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /addresses/{id} [patch]
func (h *AddressHandler) Update(c *gin.Context) {
	userID, ok := addressCallerID(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid address id"))
		return
	}
	var req dto.UpdateAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	res, err := h.svc.Update(c.Request.Context(), userID, id, req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// Delete godoc
// @Summary      Delete a saved address (hard delete)
// @Description  Removes the address from the user's catalog. Past orders are unaffected because they snapshot the address text on the order row.
// @Tags         addresses
// @Security     BearerAuth
// @Param        id   path  string  true  "Address ID"
// @Success      204
// @Failure      404  {object}  response.ErrorResponse
// @Router       /addresses/{id} [delete]
func (h *AddressHandler) Delete(c *gin.Context) {
	userID, ok := addressCallerID(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid address id"))
		return
	}
	if err := h.svc.Delete(c.Request.Context(), userID, id); err != nil {
		response.Error(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// SetDefault godoc
// @Summary      Mark an address as the default
// @Description  Atomically demotes the previous default and promotes this one. Enforced at the DB level via a partial unique index.
// @Tags         addresses
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Address ID"
// @Success      200  {object}  dto.AddressResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /addresses/{id}/default [put]
func (h *AddressHandler) SetDefault(c *gin.Context) {
	userID, ok := addressCallerID(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("caller identity missing"))
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid address id"))
		return
	}
	res, err := h.svc.SetDefault(c.Request.Context(), userID, id)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}
