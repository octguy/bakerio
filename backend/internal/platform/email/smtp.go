package email

import (
	"context"
	"fmt"
	"net/smtp"

	"github.com/octguy/bakerio/backend/pkg/config"
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

	if p.appEnv.Env == "production" || p.appEnv.Env == "local" {
		auth = smtp.PlainAuth("", p.cfg.User, p.cfg.Password, p.cfg.Host)
	}

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		p.cfg.From, to, subject, body,
	)

	return smtp.SendMail(addr, auth, p.cfg.From, []string{to}, []byte(msg))
}
