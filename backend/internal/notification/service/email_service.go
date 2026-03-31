package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/octguy/bakerio/backend/internal/platform/email"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/platform/otp"
	"github.com/octguy/bakerio/backend/internal/shared/event"
	"go.uber.org/zap"
)

type EmailProvider interface {
	Send(ctx context.Context, to, subject, body string) error
}

type EmailService interface {
	HandleUserRegistered(ctx context.Context, body []byte) error
	Verify(ctx context.Context, userID, submitted string) (bool, error)
}

type emailService struct {
	email *email.MailService
	otp   *otp.Service
}

func NewEmailService(
	email *email.MailService,
	otp *otp.Service,
) EmailService {
	return &emailService{email: email, otp: otp}
}

// HandleUserRegistered is the RabbitMQ consumer handler for the "user.registered" event.
//
// This function is called by the Consumer goroutine (internal/platform/mq/consumer.go).
// The Consumer passes the raw message body (JSON bytes) into this function.
// If this function returns an error, the Consumer calls msg.Nack() → message is requeued.
// If it returns nil, the Consumer calls msg.Ack() → message is removed from the queue.
//
// This means: if the email send fails, the message stays in the queue and will be
// retried. Design handlers to be idempotent — generating a new OTP on retry is fine
// because the new code overwrites the old Redis key (same key, same TTL reset).
func (s *emailService) HandleUserRegistered(ctx context.Context, body []byte) error {
	// 1. Deserialise the event payload from JSON.
	//    The payload struct mirrors exactly what auth.Register() passed to outboxRepo.Save().
	var payload event.UserRegisteredPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		// Malformed JSON is a permanent failure — returning error would requeue forever.
		// In production, return nil here (or send to DLX) to stop the loop.
		// For now we return the error so it shows up in logs.
		return fmt.Errorf("notification: unmarshal UserRegistered: %w", err)
	}

	// 2. Generate OTP and store it in Redis.
	//    otp.Generate() returns the 6-digit code AND stores it atomically.
	//    If Redis is down, this returns an error → message is Nacked → retried.
	code, err := s.otp.Generate(ctx, payload.UserID.String())
	if err != nil {
		logger.Log.Error("notification: generate otp failed",
			zap.String("user_id", payload.UserID.String()),
			zap.Error(err),
		)
		return err
	}

	// 3. Send the OTP by email.
	subject := "Your Bakerio verification code"
	content := fmt.Sprintf(
		"Hi %s,\n\nYour verification code is: %s\n\nIt expires in 5 minutes.\n\nDo not share this code with anyone.",
		payload.DisplayName, code,
	)

	if err := s.email.Send(ctx, payload.Email, subject, content); err != nil {
		logger.Log.Error("notification: send otp email failed",
			zap.String("user_id", payload.UserID.String()),
			zap.String("email", payload.Email),
			zap.Error(err),
		)
		return err // Nack → requeue → retry
	}

	logger.Log.Info("notification: otp email sent",
		zap.String("user_id", payload.UserID.String()),
		zap.String("email", payload.Email),
	)
	return nil
}

func (s *emailService) Verify(ctx context.Context, userID, submitted string) (bool, error) {
	valid, err := s.otp.Verify(ctx, userID, submitted)
	if err != nil {
		logger.Log.Error("notification: verify otp failed", zap.String("user_id", userID), zap.String("submitted", submitted), zap.Error(err))
	}

	return valid, err
}
