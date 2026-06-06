package event

const (
	UserRegistered           = "user.registered"
	OrderPlaced              = "order.placed"
	OrderCancelled           = "order.cancelled"
	PaymentDone              = "payment.completed"
	ShopUpdated              = "baker.shop.updated"
	AuthPasswordChanged      = "auth.password_changed"
	AuthPasswordResetByAdmin = "auth.password_reset_by_admin"
	MembershipTierUpgrade    = "membership.tier_upgraded"
)
