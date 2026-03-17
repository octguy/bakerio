package apperrors

import "fmt"

type Code string

const (
	CodeNotFound     Code = "NOT_FOUND"
	CodeUnauthorized Code = "UNAUTHORIZED"
	CodeForbidden    Code = "FORBIDDEN"
	CodeConflict     Code = "CONFLICT" // e.g. email already exists
	CodeValidation   Code = "VALIDATION"
	CodeInternal     Code = "INTERNAL"
)

type AppError struct {
	Code    Code
	Message string
	Cause   error // original error, not exposed to client
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
