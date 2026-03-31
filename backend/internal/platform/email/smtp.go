package email

import (
	"context"
	"fmt"
	"net/smtp"

	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/pkg/config"
	"go.uber.org/zap"
)

type MailService struct {
	cfg    config.SMTPConfig
	appEnv config.ServerConfig
}

func NewMailService(cfg config.SMTPConfig, appEnv config.ServerConfig) *MailService {
	return &MailService{cfg: cfg, appEnv: appEnv}
}

func (p *MailService) Send(_ context.Context, to, subject, body string) error {
	addr := p.cfg.Host + ":" + p.cfg.Port

	var auth smtp.Auth

	if p.appEnv.Env == "production" {
		auth = smtp.PlainAuth("", p.cfg.User, p.cfg.Password, p.cfg.Host)
	}
	// Not authentication when using mail hog for development environment

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		p.cfg.From, to, subject, body,
	)

	if err := smtp.SendMail(addr, auth, p.cfg.From, []string{to}, []byte(msg)); err != nil {
		logger.Log.Error("email: failed to send", zap.String("to", to), zap.String("subject", subject), zap.Error(err))
		return err
	}

	logger.Log.Info("email: sent successfully", zap.String("to", to), zap.String("subject", subject))
	return nil
}
