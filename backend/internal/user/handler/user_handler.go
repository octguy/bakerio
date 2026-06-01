package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/response"
	"github.com/octguy/bakerio/backend/internal/user/dto"
	"github.com/octguy/bakerio/backend/internal/user/service"
	"github.com/octguy/bakerio/backend/pkg/pagination"
)

type UserHandler struct {
	svc service.UserService
}

func NewUserHandler(svc service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

func (h *UserHandler) RegisterRoutes(protected *gin.RouterGroup) {
	g := protected.Group("/users")
	g.POST("",
		middleware.RequireAnyPermission("user:manage:all", "user:manage:branch"),
		h.CreateUser,
	)
	g.GET("",
		middleware.RequirePermission("user:view:all"),
		h.SearchAllUsers,
	)
	g.GET("/:id/profile",
		middleware.RequireAnyPermission("user:view:all", "user:manage:branch"),
		h.GetUserProfile,
	)
	g.PATCH("/:id/profile",
		middleware.RequireAnyPermission("user:manage:all", "user:manage:branch"),
		h.UpdateUserProfile,
	)
	g.PATCH("/:id/password",
		middleware.RequireAnyPermission("user:manage:all", "user:manage:branch"),
		h.SetUserPassword,
	)

	// Staff list (siblings of /users but auto-scopes for managers + excludes
	// pure customers/guests).
	protected.GET("/staff",
		middleware.RequireAnyPermission("user:view:all", "user:manage:branch"),
		h.SearchStaff,
	)
}

// CreateUser godoc
// @Summary      Create a staff account
// @Description  Admin or manager creates a staff account with a specific role. Role must be within the caller's permission level.
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.CreateUserRequest   true  "Create user payload"
// @Success      201      {object}  dto.CreateUserResponse
// @Failure      403      {object}  response.ErrorResponse
// @Failure      409      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /users [post]
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req dto.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)

	res, err := h.svc.CreateUser(c.Request.Context(), req, perms)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Success(c, http.StatusCreated, res)
}

// GetUserProfile godoc
// @Summary      Get staff profile
// @Description  Returns the profile of any user. Requires user:view:all or user:manage:branch.
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "User ID"
// @Success      200  {object}  dto.ProfileResponse
// @Failure      403  {object}  response.ErrorResponse
// @Failure      404  {object}  response.ErrorResponse
// @Router       /users/{id}/profile [get]
func (h *UserHandler) GetUserProfile(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid user id"))
		return
	}
	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)

	res, err := h.svc.GetUserProfile(c.Request.Context(), perms, targetID)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// UpdateUserProfile godoc
// @Summary      Update staff profile
// @Description  Updates display name, avatar URL, and/or bio for a staff member
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id       path      string                   true  "User ID"
// @Param        request  body      dto.UpdateProfileRequest  true  "Update profile payload"
// @Success      200      {object}  dto.ProfileResponse
// @Failure      403      {object}  response.ErrorResponse
// @Failure      404      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /users/{id}/profile [patch]
func (h *UserHandler) UpdateUserProfile(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid user id"))
		return
	}
	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}
	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)

	res, err := h.svc.UpdateUserProfile(c.Request.Context(), perms, targetID, req)
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// SetUserPassword godoc
// @Summary      Set staff password
// @Description  Admin/manager sets a new password for a staff member without requiring the current password
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id       path      string                  true  "User ID"
// @Param        request  body      dto.SetPasswordRequest  true  "Password payload"
// @Success      204
// @Failure      403  {object}  response.ErrorResponse
// @Failure      422  {object}  response.ErrorResponse
// @Router       /users/{id}/password [patch]
func (h *UserHandler) SetUserPassword(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid user id"))
		return
	}
	var req dto.SetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)

	if err := h.svc.AdminSetPassword(c.Request.Context(), perms, targetID, req.Password); err != nil {
		response.Error(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// SearchAllUsers godoc
// @Summary      Search all users (admin)
// @Description  Search across every user (customers + staff). Admin only.
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        q          query     string  false  "Email or display name (ILIKE %q%)"
// @Param        role       query     string  false  "Filter by exact role name"
// @Param        branch_id  query     string  false  "Filter by branch UUID (user must be a member)"
// @Param        staff_only query     bool    false  "If true, excludes pure customer/guest accounts (default false for /users)"
// @Param        page       query     int     false  "Page (default 1)"
// @Param        size       query     int     false  "Page size (default 20, max 100)"
// @Success      200        {object}  dto.UserListResponse
// @Failure      403        {object}  response.ErrorResponse
// @Router       /users [get]
func (h *UserHandler) SearchAllUsers(c *gin.Context) {
	filter, ok := buildUserFilter(c, false)
	if !ok {
		return // buildUserFilter already wrote the 4xx response
	}
	// /users default = all users; ?staff_only=true narrows to staff.
	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)

	res, err := h.svc.SearchUsers(c.Request.Context(), perms, filter, pagination.FromQuery(c))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// SearchStaff godoc
// @Summary      Search staff (admin or branch manager)
// @Description  Search non-customer accounts. Admin sees all branches; a branch_manager is scoped to their own branch.
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Param        q          query     string  false  "Email or display name (ILIKE %q%)"
// @Param        role       query     string  false  "Filter by exact staff role (branch_manager, branch_staff, product_manager, …)"
// @Param        branch_id  query     string  false  "Filter by branch UUID — ignored for branch_manager callers (forced to own branch)"
// @Param        staff_only query     bool    false  "Default true on /staff. Set false to include customers/guests in the result"
// @Param        page       query     int     false  "Page (default 1)"
// @Param        size       query     int     false  "Page size (default 20, max 100)"
// @Success      200        {object}  dto.UserListResponse
// @Failure      403        {object}  response.ErrorResponse
// @Router       /staff [get]
func (h *UserHandler) SearchStaff(c *gin.Context) {
	filter, ok := buildUserFilter(c, true) // /staff default = staff-only; can be overridden via ?staff_only=false
	if !ok {
		return
	}
	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)

	res, err := h.svc.SearchUsers(c.Request.Context(), perms, filter, pagination.FromQuery(c))
	if err != nil {
		response.Error(c, err)
		return
	}
	response.Success(c, http.StatusOK, res)
}

// buildUserFilter reads ?q=&role=&branch_id=&staff_only= and returns the filter.
// `defaultStaffOnly` is what the endpoint resolves to when ?staff_only= is omitted.
// Writes a 4xx response and returns ok=false if any param is malformed.
func buildUserFilter(c *gin.Context, defaultStaffOnly bool) (dto.UserListFilter, bool) {
	f := dto.UserListFilter{
		Q:         c.Query("q"),
		Role:      c.Query("role"),
		StaffOnly: defaultStaffOnly,
	}
	if raw := c.Query("staff_only"); raw != "" {
		v, err := strconv.ParseBool(raw)
		if err != nil {
			response.Error(c, apperrors.Validation("invalid staff_only (use true/false)"))
			return f, false
		}
		f.StaffOnly = v
	}
	if raw := c.Query("branch_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			response.Error(c, apperrors.Validation("invalid branch_id"))
			return f, false
		}
		f.BranchID = &id
	}
	return f, true
}
