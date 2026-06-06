package service

import (
	"context"
	"encoding/json"
	"fmt"

	"go.uber.org/zap"

	branchSvc "github.com/octguy/bakerio/backend/internal/branch/service"
	"github.com/octguy/bakerio/backend/internal/notification/repository"
	"github.com/octguy/bakerio/backend/internal/platform/email"
	"github.com/octguy/bakerio/backend/internal/platform/logger"
	"github.com/octguy/bakerio/backend/internal/shared/event"
)

// Dispatcher is the central router for non-OTP events. Each consumer queue
// forwards (routingKey, body) to a Handle*Queue method which switches on
// the routing key and calls per-event-type sub-handlers.
//
// Returning an error nacks the message → RabbitMQ requeues. We treat
// unmarshal failures as permanent (log + return nil) so a bad message can't
// loop forever; everything else is transient.
type Dispatcher struct {
	repo       repository.NotificationRepository
	email      *email.MailService
	branchMems branchSvc.MembershipService
}

func NewDispatcher(
	repo repository.NotificationRepository,
	mail *email.MailService,
	branchMems branchSvc.MembershipService,
) *Dispatcher {
	return &Dispatcher{repo: repo, email: mail, branchMems: branchMems}
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue routers — one per RabbitMQ queue.
// ─────────────────────────────────────────────────────────────────────────────

func (d *Dispatcher) HandleOrderQueue(ctx context.Context, routingKey string, body []byte) error {
	switch routingKey {
	case event.OrderPlaced:
		return d.handleOrderPlaced(ctx, body)
	default:
		logger.Log.Debug("notification: ignoring unknown order event",
			zap.String("routing_key", routingKey))
		return nil
	}
}

func (d *Dispatcher) HandleAuthQueue(ctx context.Context, routingKey string, body []byte) error {
	switch routingKey {
	case event.AuthPasswordChanged:
		return d.handleAuthPasswordChanged(ctx, body)
	case event.AuthPasswordResetByAdmin:
		return d.handleAuthPasswordResetByAdmin(ctx, body)
	default:
		logger.Log.Debug("notification: ignoring unknown auth event",
			zap.String("routing_key", routingKey))
		return nil
	}
}

func (d *Dispatcher) HandleMembershipQueue(ctx context.Context, routingKey string, body []byte) error {
	switch routingKey {
	case event.MembershipTierUpgrade:
		return d.handleMembershipTierUpgraded(ctx, body)
	default:
		logger.Log.Debug("notification: ignoring unknown membership event",
			zap.String("routing_key", routingKey))
		return nil
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-event handlers.
// ─────────────────────────────────────────────────────────────────────────────

func (d *Dispatcher) handleOrderPlaced(ctx context.Context, body []byte) error {
	var p event.OrderPlacedPayload
	if err := json.Unmarshal(body, &p); err != nil {
		logger.Log.Warn("notification: malformed order.placed — dropping",
			zap.Error(err), zap.ByteString("body", body))
		return nil
	}

	data := mustMarshalEventData(p)

	// (a) Customer: in-app + email receipt.
	if _, err := d.repo.Insert(ctx, repository.InsertParams{
		UserID: p.UserID,
		Type:   event.OrderPlaced,
		Title:  fmt.Sprintf("Đơn %s đã được xác nhận", p.OrderCode),
		Body:   fmt.Sprintf("Tổng %s VND — chi nhánh %s", p.Total.String(), p.BranchName),
		Data:   data,
	}); err != nil {
		return fmt.Errorf("insert customer notification: %w", err)
	}
	if p.UserEmail != "" {
		subject := fmt.Sprintf("Đơn hàng Bakerio %s", p.OrderCode)
		html := fmt.Sprintf(
			"<p>Xin chào,</p>"+
				"<p>Đơn hàng <b>%s</b> đã được xác nhận tại chi nhánh <b>%s</b>.</p>"+
				"<p>Tổng cộng: <b>%s</b> VND</p>"+
				"<p>Cảm ơn bạn đã đặt hàng!</p>",
			p.OrderCode, p.BranchName, p.Total.String())
		if err := d.email.Send(ctx, p.UserEmail, subject, html); err != nil {
			logger.Log.Warn("notification: order receipt email failed",
				zap.String("order_code", p.OrderCode), zap.Error(err))
			// Don't nack — in-app row already written.
		}
	}

	// (b) Branch fanout: every branch_membership row → in-app each.
	memberIDs, err := d.branchMems.ListUsersByBranch(ctx, p.BranchID)
	if err != nil {
		return fmt.Errorf("list branch members: %w", err)
	}
	logger.Log.Info("notification: order.placed branch fanout",
		zap.String("order_code", p.OrderCode),
		zap.String("branch_id", p.BranchID.String()),
		zap.Int("members", len(memberIDs)))
	for _, uid := range memberIDs {
		if uid == p.UserID {
			continue // customer already got their copy above
		}
		if _, err := d.repo.Insert(ctx, repository.InsertParams{
			UserID: uid,
			Type:   event.OrderPlaced + ".branch",
			Title:  fmt.Sprintf("Đơn mới %s", p.OrderCode),
			Body:   fmt.Sprintf("%d món — Tổng %s VND", p.ItemCount, p.Total.String()),
			Data:   data,
		}); err != nil {
			logger.Log.Warn("notification: insert branch member failed",
				zap.String("user_id", uid.String()), zap.Error(err))
			// Log + continue — one staff failure shouldn't black-hole the whole event.
		}
	}
	return nil
}

func (d *Dispatcher) handleAuthPasswordChanged(ctx context.Context, body []byte) error {
	var p event.AuthPasswordChangedPayload
	if err := json.Unmarshal(body, &p); err != nil {
		logger.Log.Warn("notification: malformed auth.password_changed — dropping",
			zap.Error(err), zap.ByteString("body", body))
		return nil
	}

	data := mustMarshalEventData(p)
	if _, err := d.repo.Insert(ctx, repository.InsertParams{
		UserID: p.UserID,
		Type:   event.AuthPasswordChanged,
		Title:  "Mật khẩu của bạn đã được thay đổi",
		Body:   "Nếu không phải bạn, hãy đăng nhập và đổi lại mật khẩu ngay.",
		Data:   data,
	}); err != nil {
		return fmt.Errorf("insert password-changed notification: %w", err)
	}
	if p.Email != "" {
		html := "<p>Mật khẩu tài khoản Bakerio của bạn vừa được thay đổi.</p>" +
			"<p>Nếu bạn không thực hiện hành động này, vui lòng đăng nhập và đặt lại mật khẩu ngay.</p>"
		if err := d.email.Send(ctx, p.Email, "Bakerio — mật khẩu đã thay đổi", html); err != nil {
			logger.Log.Warn("notification: password-changed email failed",
				zap.String("user_id", p.UserID.String()), zap.Error(err))
		}
	}
	return nil
}

func (d *Dispatcher) handleAuthPasswordResetByAdmin(ctx context.Context, body []byte) error {
	var p event.AuthPasswordResetByAdminPayload
	if err := json.Unmarshal(body, &p); err != nil {
		logger.Log.Warn("notification: malformed auth.password_reset_by_admin — dropping",
			zap.Error(err), zap.ByteString("body", body))
		return nil
	}

	data := mustMarshalEventData(p)
	if _, err := d.repo.Insert(ctx, repository.InsertParams{
		UserID: p.UserID,
		Type:   event.AuthPasswordResetByAdmin,
		Title:  "Quản trị viên đã đặt lại mật khẩu của bạn",
		Body:   "Vui lòng đăng nhập bằng mật khẩu mới được cấp và đổi ngay sau khi đăng nhập.",
		Data:   data,
	}); err != nil {
		return fmt.Errorf("insert admin-reset notification: %w", err)
	}
	if p.Email != "" {
		html := "<p>Mật khẩu tài khoản Bakerio của bạn vừa được quản trị viên đặt lại.</p>" +
			"<p>Vui lòng đăng nhập bằng mật khẩu mới mà quản trị viên đã cung cấp, " +
			"và đổi ngay sau khi đăng nhập.</p>" +
			"<p>Nếu bạn không yêu cầu thao tác này, hãy liên hệ với chúng tôi ngay.</p>"
		if err := d.email.Send(ctx, p.Email, "Bakerio — mật khẩu đã được đặt lại bởi quản trị viên", html); err != nil {
			logger.Log.Warn("notification: admin-reset email failed",
				zap.String("user_id", p.UserID.String()), zap.Error(err))
		}
	}
	return nil
}

func (d *Dispatcher) handleMembershipTierUpgraded(ctx context.Context, body []byte) error {
	var p event.MembershipTierUpgradedPayload
	if err := json.Unmarshal(body, &p); err != nil {
		logger.Log.Warn("notification: malformed membership.tier_upgraded — dropping",
			zap.Error(err), zap.ByteString("body", body))
		return nil
	}
	data := mustMarshalEventData(p)
	if _, err := d.repo.Insert(ctx, repository.InsertParams{
		UserID: p.UserID,
		Type:   event.MembershipTierUpgrade,
		Title:  fmt.Sprintf("Chúc mừng! Bạn đã lên hạng %s", p.ToTier),
		Body:   fmt.Sprintf("Hạng cũ: %s → Hạng mới: %s. Tiếp tục mua sắm để giữ vững vị trí!", p.FromTier, p.ToTier),
		Data:   data,
	}); err != nil {
		return fmt.Errorf("insert tier-upgrade notification: %w", err)
	}
	return nil
}

// mustMarshalEventData re-serialises a known struct. Cannot realistically
// fail at runtime — panic-fold to keep call sites clean.
func mustMarshalEventData(v any) json.RawMessage {
	b, err := json.Marshal(v)
	if err != nil {
		panic(fmt.Sprintf("notification: marshal event data: %v", err))
	}
	return b
}
