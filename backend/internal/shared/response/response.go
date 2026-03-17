package response

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/octguy/bakerio/backend/internal/shared/apperrors"
)

type envelope struct {
	Data  any       `json:"data,omitempty"`
	Error *apiError `json:"error,omitempty"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func Success(c *gin.Context, status int, data any) {
	c.JSON(status, envelope{Data: data})
}

func Error(c *gin.Context, err error) {
	var appErr *apperrors.AppError
	if errors.As(err, &appErr) {
		c.JSON(appErrToStatus(appErr.Code), envelope{
			Error: &apiError{Code: string(appErr.Code), Message: appErr.Message},
		})
		return
	}
	c.JSON(http.StatusInternalServerError, envelope{
		Error: &apiError{Code: string(apperrors.CodeInternal), Message: "internal server error"},
	})
}

func appErrToStatus(code apperrors.Code) int {
	switch code {
	case apperrors.CodeNotFound:
		return http.StatusNotFound
	case apperrors.CodeUnauthorized:
		return http.StatusUnauthorized
	case apperrors.CodeForbidden:
		return http.StatusForbidden
	case apperrors.CodeConflict:
		return http.StatusConflict
	case apperrors.CodeValidation:
		return http.StatusUnprocessableEntity
	default:
		return http.StatusInternalServerError
	}
}
