package notification

import (
	"context"

	"github.com/octguy/bakerio/backend/internal/notification/service"
	"github.com/octguy/bakerio/backend/internal/platform/email"
	"github.com/octguy/bakerio/backend/internal/platform/mq"
	"github.com/octguy/bakerio/backend/internal/platform/otp"
)

// Module owns outbound transactional notifications (email today). It is a
// consumer-side module: no HTTP routes; subscribes to MQ events via
// RegisterConsumers.
type Module struct {
	emailSvc service.EmailService
}

type Deps struct {
	Mail *email.MailService
	OTP  *otp.Service
}

func New(deps Deps) *Module {
	return &Module{emailSvc: service.NewEmailService(deps.Mail, deps.OTP)}
}

func (m *Module) RegisterConsumers(ctx context.Context, consumer *mq.Consumer) error {
	return consumer.Consume(ctx, "user.notifications", m.emailSvc.HandleUserRegistered)
}
