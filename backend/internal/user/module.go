package user

import (
	"github.com/gin-gonic/gin"
	authSvc "github.com/octguy/bakerio/backend/internal/auth/service"
	profileSvc "github.com/octguy/bakerio/backend/internal/profile/service"
	"github.com/octguy/bakerio/backend/internal/user/handler"
	"github.com/octguy/bakerio/backend/internal/user/service"
)

type Module struct {
	handler *handler.UserHandler
}

func NewModule(profSvc profileSvc.ProfileService, authService authSvc.AuthService) *Module {
	svc := service.NewUserService(profSvc, authService)
	h := handler.NewUserHandler(svc)
	return &Module{handler: h}
}

func (m *Module) RegisterRoutes(protected *gin.RouterGroup) {
	m.handler.RegisterRoutes(protected)
}
