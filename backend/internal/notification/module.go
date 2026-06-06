package notification

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/notification/handler"
	"github.com/octguy/bakerio/backend/internal/notification/repository"
	"github.com/octguy/bakerio/backend/internal/notification/service"
	"github.com/octguy/bakerio/backend/internal/platform/email"
	"github.com/octguy/bakerio/backend/internal/platform/mq"
	"github.com/octguy/bakerio/backend/internal/platform/otp"
)

// Module owns outbound transactional notifications. Consumer-side for the
// MQ subscription; the customer-facing REST surface lands in NX4 (this same
// epic) next.
type Module struct {
	emailSvc   service.EmailService
	dispatcher *service.Dispatcher
	repo       repository.NotificationRepository
	h          *handler.Handler
}

type Deps struct {
	Pool       *pgxpool.Pool
	Mail       *email.MailService
	OTP        *otp.Service
	BranchMems branchSvc.MembershipService
}

func New(deps Deps) *Module {
	repo := repository.New(deps.Pool)
	querySvc := service.NewQueryService(repo)
	return &Module{
		emailSvc:   service.NewEmailService(deps.Mail, deps.OTP),
		dispatcher: service.NewDispatcher(repo, deps.Mail, deps.BranchMems),
		repo:       repo,
		h:          handler.NewHandler(querySvc),
	}
}

func (m *Module) Repo() repository.NotificationRepository { return m.repo }

// RegisterRoutes mounts the customer-facing REST surface.
func (m *Module) RegisterRoutes(public, protected *gin.RouterGroup) {
	m.h.RegisterRoutes(protected)
}

func (m *Module) RegisterConsumers(ctx context.Context, consumer *mq.Consumer) error {
	if err := consumer.Consume(ctx, "user.notifications", m.emailSvc.HandleUserRegistered); err != nil {
		return err
	}
	if err := consumer.Consume(ctx, "order.notifications", m.dispatcher.HandleOrderQueue); err != nil {
		return err
	}
	if err := consumer.Consume(ctx, "auth.notifications", m.dispatcher.HandleAuthQueue); err != nil {
		return err
	}
	if err := consumer.Consume(ctx, "membership.notifications", m.dispatcher.HandleMembershipQueue); err != nil {
		return err
	}
	return nil
}
