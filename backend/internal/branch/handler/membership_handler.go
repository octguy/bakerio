package handler

import (
	"errors"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/branch/dto"
	"github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
	"github.com/octguy/bakerio/backend/internal/shared/authcontext"
	"github.com/octguy/bakerio/backend/internal/shared/response"
)

type MembershipHandler struct {
	svc service.MembershipService
	dir service.UserDirectory
}

func NewMembershipHandler(svc service.MembershipService, dir service.UserDirectory) *MembershipHandler {
	return &MembershipHandler{svc: svc, dir: dir}
}

func toMemberInfo(u service.UserInfo) dto.MemberInfo {
	return dto.MemberInfo{
		UserID:      u.UserID,
		DisplayName: u.DisplayName,
		Email:       u.Email,
		Roles:       u.Roles,
	}
}

func (h *MembershipHandler) RegisterRoutes(protected *gin.RouterGroup) {
	// Coarse gate: only admin (via *:*:all) or branch_manager (branch:manage:own)
	// reach these handlers. The per-branch ownership check happens inside.
	guard := middleware.RequireAnyPermission("branch:manage:all", "branch:manage:own")

	g := protected.Group("/branch/:id/members", guard)
	g.GET("", h.ListMembers)
	g.POST("", h.AssignMember)
	g.DELETE("/:userId", h.RemoveMember)
}

// ensureBranchScope enforces the per-branch rule the middleware can't: admin
// (wildcard or branch:manage:all) may operate any branch; everyone else may
// only operate the branch they belong to.
func (h *MembershipHandler) ensureBranchScope(c *gin.Context, target uuid.UUID) error {
	raw, _ := c.Get(middleware.PermissionsKey)
	perms, _ := raw.([]string)
	if slices.Contains(perms, "*:*:all") || slices.Contains(perms, "branch:manage:all") {
		return nil
	}

	callerID, ok := authcontext.CallerID(c.Request.Context())
	if !ok {
		return apperrors.Forbidden("caller identity missing")
	}

	mb, err := h.svc.GetMembership(c.Request.Context(), callerID)
	if err != nil {
		if ae, ok2 := errors.AsType[*apperrors.AppError](err); ok2 && ae.Code == apperrors.CodeNotFound {
			return apperrors.Forbidden("you do not belong to any branch")
		}
		return err
	}
	if mb.BranchID != target {
		return apperrors.Forbidden("you can only manage members of your own branch")
	}
	return nil
}

// ListMembers godoc
// @Summary      List branch members
// @Description  List the user IDs assigned to a branch. Admin sees any branch; a branch_manager only their own.
// @Tags         branch
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Branch ID"
// @Success      200  {object}  dto.BranchMembersResponse
// @Failure      403  {object}  response.ErrorResponse
// @Router       /branch/{id}/members [get]
func (h *MembershipHandler) ListMembers(c *gin.Context) {
	branchID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid branch id"))
		return
	}
	if err := h.ensureBranchScope(c, branchID); err != nil {
		response.Error(c, err)
		return
	}

	userIDs, err := h.svc.ListUsersByBranch(c.Request.Context(), branchID)
	if err != nil {
		response.Error(c, err)
		return
	}

	infos, err := h.dir.GetUsersInfo(c.Request.Context(), userIDs)
	if err != nil {
		response.Error(c, err)
		return
	}
	members := make([]dto.MemberInfo, 0, len(infos))
	for _, u := range infos {
		members = append(members, toMemberInfo(u))
	}
	response.Success(c, http.StatusOK, dto.BranchMembersResponse{BranchID: branchID, Members: members})
}

// AssignMember godoc
// @Summary      Assign a member to a branch
// @Description  Assign (or move) a user to a branch. Admin may target any branch; a branch_manager only their own.
// @Tags         branch
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id       path      string                   true  "Branch ID"
// @Param        request  body      dto.AssignMemberRequest  true  "User to assign"
// @Success      200      {object}  dto.MemberInfo
// @Failure      403      {object}  response.ErrorResponse
// @Failure      404      {object}  response.ErrorResponse
// @Failure      422      {object}  response.ErrorResponse
// @Router       /branch/{id}/members [post]
func (h *MembershipHandler) AssignMember(c *gin.Context) {
	branchID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid branch id"))
		return
	}
	if err := h.ensureBranchScope(c, branchID); err != nil {
		response.Error(c, err)
		return
	}

	var req dto.AssignMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, apperrors.Validation(err.Error()))
		return
	}

	if err := h.svc.SetMembership(c.Request.Context(), req.UserID, branchID); err != nil {
		response.Error(c, err)
		return
	}

	infos, err := h.dir.GetUsersInfo(c.Request.Context(), []uuid.UUID{req.UserID})
	if err != nil {
		response.Error(c, err)
		return
	}
	if len(infos) == 0 {
		response.Error(c, apperrors.NotFound("user not found"))
		return
	}
	response.Success(c, http.StatusOK, toMemberInfo(infos[0]))
}

// RemoveMember godoc
// @Summary      Remove a member from a branch
// @Description  Remove a user's membership. Admin may target any branch; a branch_manager only their own.
// @Tags         branch
// @Security     BearerAuth
// @Param        id      path      string  true  "Branch ID"
// @Param        userId  path      string  true  "User ID"
// @Success      204
// @Failure      403     {object}  response.ErrorResponse
// @Failure      404     {object}  response.ErrorResponse
// @Router       /branch/{id}/members/{userId} [delete]
func (h *MembershipHandler) RemoveMember(c *gin.Context) {
	branchID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid branch id"))
		return
	}
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		response.Error(c, apperrors.Validation("invalid user id"))
		return
	}
	if err := h.ensureBranchScope(c, branchID); err != nil {
		response.Error(c, err)
		return
	}

	// Only remove if the user actually belongs to this branch — stops a manager
	// from deleting a membership that lives in someone else's branch.
	mb, err := h.svc.GetMembership(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, err)
		return
	}
	if mb.BranchID != branchID {
		response.Error(c, apperrors.NotFound("user is not a member of this branch"))
		return
	}

	if err := h.svc.RemoveMembership(c.Request.Context(), userID); err != nil {
		response.Error(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
