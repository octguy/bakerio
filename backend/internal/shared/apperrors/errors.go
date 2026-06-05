package apperrors

import "fmt"

type Code string

const (
	CodeNotFound           Code = "NOT_FOUND"
	CodeUnauthorized       Code = "UNAUTHORIZED"
	CodeForbidden          Code = "FORBIDDEN"
	CodeConflict           Code = "CONFLICT"             // generic 409
	CodeGone               Code = "GONE"                 // 410 — session expired, etc.
	CodeStockConflict      Code = "STOCK_CONFLICT"       // 409 with stock-detail payload
	CodeVoucherAlreadyUsed Code = "VOUCHER_ALREADY_USED" // 409 — user already redeemed this voucher
	CodeValidation         Code = "VALIDATION"
	CodeInternal           Code = "INTERNAL"
)

type AppError struct {
	Code    Code
	Message string
	Cause   error // original error, not exposed to client
	Details any   // optional structured payload (rendered as error.details JSON)
}

func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error { return e.Cause }

// Constructors
func NotFound(msg string) *AppError {
	return &AppError{Code: CodeNotFound, Message: msg}
}

func Unauthorized(msg string) *AppError {
	return &AppError{Code: CodeUnauthorized, Message: msg}
}

func Forbidden(msg string) *AppError {
	return &AppError{Code: CodeForbidden, Message: msg}
}

func Conflict(msg string) *AppError {
	return &AppError{Code: CodeConflict, Message: msg}
}

func Internal(msg string, cause error) *AppError {
	return &AppError{Code: CodeInternal, Message: msg, Cause: cause}
}

func Validation(msg string) *AppError {
	return &AppError{Code: CodeValidation, Message: msg}
}

// Gone returns HTTP 410 — caller's resource (session, token) no longer exists.
func Gone(msg string) *AppError {
	return &AppError{Code: CodeGone, Message: msg}
}

// StockConflict returns HTTP 409 with a structured payload identifying the
// problem items. details is rendered as `error.details` in the response.
func StockConflict(msg string, details any) *AppError {
	return &AppError{Code: CodeStockConflict, Message: msg, Details: details}
}

// VoucherAlreadyUsed returns HTTP 409 when the same user attempts to redeem
// the same voucher a second time. Caught at /orders/confirm via the
// UNIQUE (voucher_id, user_id) constraint on voucher.redemptions.
func VoucherAlreadyUsed(msg string) *AppError {
	return &AppError{Code: CodeVoucherAlreadyUsed, Message: msg}
}
