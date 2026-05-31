package pagination

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

const (
	DefaultPage = int32(1)
	DefaultSize = int32(20)
	MaxSize     = int32(100)
)

// Params is the normalized page + size for a single list call.
type Params struct {
	Page int32
	Size int32
}

// Offset is the LIMIT/OFFSET friend: (page - 1) * size.
func (p Params) Offset() int32 { return (p.Page - 1) * p.Size }

// FromQuery reads ?page=&size= from a gin context and applies defaults +
// clamping. It does not return an error; bad input falls back to defaults.
func FromQuery(c *gin.Context) Params {
	return Params{
		Page: clampPage(c.Query("page")),
		Size: clampSize(c.Query("size")),
	}
}

func clampPage(s string) int32 {
	if s == "" {
		return DefaultPage
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 {
		return DefaultPage
	}
	return int32(n)
}

func clampSize(s string) int32 {
	if s == "" {
		return DefaultSize
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 {
		return DefaultSize
	}
	if int32(n) > MaxSize {
		return MaxSize
	}
	return int32(n)
}

// Meta is the page metadata embedded by every list response DTO so the JSON
// shape stays consistent across modules:
//
//	{ "items": [...], "page": 1, "size": 20, "total": 42, "total_pages": 3 }
type Meta struct {
	Page       int32 `json:"page"`
	Size       int32 `json:"size"`
	Total      int64 `json:"total"`
	TotalPages int32 `json:"total_pages"`
} // @name PaginationMeta

// NewMeta builds Meta from the Params used and the total row count.
func NewMeta(p Params, total int64) Meta {
	var totalPages int32
	if total > 0 && p.Size > 0 {
		totalPages = int32((total + int64(p.Size) - 1) / int64(p.Size))
	}
	return Meta{
		Page:       p.Page,
		Size:       p.Size,
		Total:      total,
		TotalPages: totalPages,
	}
}
