package notification

import (
	"context"

	"github.com/octguy/bakerio/backend/internal/notification/service"
	"github.com/octguy/bakerio/backend/internal/platform/email"
	"github.com/octguy/bakerio/backend/internal/platform/mq"
	"github.com/octguy/bakerio/backend/internal/platform/otp"
	"go.uber.org/zap"
)

type Module struct {
	svc *service.NotificationService
}

func New(
	email *email.MailService,
	otp *otp.Service,
	logger *zap.Logger,
) *Module {
	svc := service.NewNotificationService(email, otp, logger)
	return &Module{svc: svc}
}

// RegisterConsumers registers all MQ consumers for the notification module.
func (m *Module) RegisterConsumers(ctx context.Context, consumer *mq.Consumer) error {
	return consumer.Consume(ctx, "user.notifications", m.svc.HandleUserRegistered)
}
