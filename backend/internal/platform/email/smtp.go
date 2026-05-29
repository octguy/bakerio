package email

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"

	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/pkg/config"
	"go.uber.org/zap"
)

type MailService struct {
	cfg config.SMTPConfig
}

func NewMailService(cfg config.SMTPConfig, _ config.ServerConfig) *MailService {
	return &MailService{cfg: cfg}
}

func (p *MailService) Send(_ context.Context, to, subject, body string) error {
	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		p.cfg.From, to, subject, body,
	)

	var err error
	if p.cfg.Port == "465" {
		err = p.sendTLS(to, msg)
	} else {
		err = p.sendPlain(to, msg)
	}

	if err != nil {
		logger.Log.Error("email: failed to send", zap.String("to", to), zap.String("subject", subject), zap.Error(err))
		return err
	}

	logger.Log.Info("email: sent successfully", zap.String("to", to), zap.String("subject", subject))
	return nil
}

// sendTLS dials port 465 with implicit TLS (SMTPS).
func (p *MailService) sendTLS(to, msg string) error {
	addr := p.cfg.Host + ":" + p.cfg.Port
	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: p.cfg.Host})
	if err != nil {
		return fmt.Errorf("smtp tls dial: %w", err)
	}
	defer conn.Close()

	c, err := smtp.NewClient(conn, p.cfg.Host)
	if err != nil {
		return fmt.Errorf("smtp client: %w", err)
	}
	defer c.Close()

	if p.cfg.User != "" {
		if err = c.Auth(smtp.PlainAuth("", p.cfg.User, p.cfg.Password, p.cfg.Host)); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}

	if err = c.Mail(p.cfg.From); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err = c.Rcpt(to); err != nil {
		return fmt.Errorf("smtp rcpt: %w", err)
	}
	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	if _, err = fmt.Fprint(w, msg); err != nil {
		return fmt.Errorf("smtp write: %w", err)
	}
	return w.Close()
}

// sendPlain uses smtp.SendMail for port 587 (STARTTLS) and 1025 (MailHog, no auth).
func (p *MailService) sendPlain(to, msg string) error {
	addr := net.JoinHostPort(p.cfg.Host, p.cfg.Port)

	var auth smtp.Auth
	if p.cfg.User != "" {
		auth = smtp.PlainAuth("", p.cfg.User, p.cfg.Password, p.cfg.Host)
	}

	return smtp.SendMail(addr, auth, p.cfg.From, []string{to}, []byte(msg))
}

