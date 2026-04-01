package notification

import (
	"context"

	"github.com/octguy/bakerio/backend/internal/notification/service"
	"github.com/octguy/bakerio/backend/internal/platform/email"
	"github.com/octguy/bakerio/backend/internal/platform/mq"
	"github.com/octguy/bakerio/backend/internal/platform/otp"
)

type Module struct {
	emailSvc service.EmailService
}

func New(
	email *email.MailService,
	otp *otp.Service,
) *Module {
	svc := service.NewEmailService(email, otp)
	return &Module{emailSvc: svc}
}

// RegisterConsumers registers all MQ consumers for the notification module.
func (m *Module) RegisterConsumers(ctx context.Context, consumer *mq.Consumer) error {
	return consumer.Consume(ctx, "user.notifications", m.emailSvc.HandleUserRegistered)
}

//func (m *Module) EmailService() service.EmailService {
//	return m.emailSvc
//}
