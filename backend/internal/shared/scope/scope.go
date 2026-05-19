package scope

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octguy/bakerio/backend/internal/platform/middleware"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
)

type ListScope struct {
	All      bool
	BranchID *uuid.UUID
}

func Resolve(c *gin.Context, allPerm string) (ListScope, error) {
	raw, _ := c.Get(middleware.PermissionsKey)
	held, _ := raw.([]string)
	for _, p := range held {
		if p == "*:*:all" || p == allPerm {
			return ListScope{All: true}, nil
		}
	}
	bidRaw, _ := c.Get(middleware.BranchIDKey)
	bid, _ := bidRaw.(*uuid.UUID)
	if bid == nil {
		return ListScope{}, apperrors.Forbidden("no branch context for scoped listing")
	}
	return ListScope{BranchID: bid}, nil
}
