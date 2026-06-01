// Package dbq provides tiny SQL helpers used where sqlc's static queries don't
// fit — primarily for search endpoints with multiple optional filters.
package dbq

import (
	"fmt"
	"strings"
)

// Where is a small builder for SQL WHERE clauses. Each call appends one
// condition with one or more bound args; the placeholders ($1, $2, …) are
// numbered as you go. Designed to be cheap and obvious; not a general SQL
// builder. Always parameterised — never interpolates user input into SQL.
//
// Usage:
//
//	w := dbq.NewWhere()
//	w.AddIfNotEmpty("name ILIKE ", "%"+q+"%")        // skips when q == ""
//	w.AddIfNotEmpty("status = ", status)
//	sql := "SELECT * FROM branch.branches" + w.SQL() // " WHERE …" or ""
//	rows, _ := pool.Query(ctx, sql, w.Args()...)
type Where struct {
	conds []string
	args  []any
}

func NewWhere() *Where { return &Where{} }

// Add appends a condition with one bound arg. The expr should end with the
// operator (e.g. "name = " or "name ILIKE "); Add appends the placeholder.
func (w *Where) Add(expr string, value any) {
	w.args = append(w.args, value)
	w.conds = append(w.conds, fmt.Sprintf("%s$%d", expr, len(w.args)))
}

// AddIfNotEmpty skips the condition when the string value is empty. Convenience
// for handler ?q=&status= patterns where missing params are empty strings.
func (w *Where) AddIfNotEmpty(expr string, value string) {
	if value == "" {
		return
	}
	w.Add(expr, value)
}

// AddRaw appends a condition with N bound args (the expr must include the
// matching $N placeholders, computed via Next()).
func (w *Where) AddRaw(expr string, values ...any) {
	w.conds = append(w.conds, expr)
	w.args = append(w.args, values...)
}

// Next returns the next placeholder number (so callers building multi-arg
// expressions like "(a = $N OR b = $N)" can position them correctly).
func (w *Where) Next() int { return len(w.args) + 1 }

// SQL renders the " WHERE c1 AND c2 …" suffix, or "" if no conditions.
func (w *Where) SQL() string {
	if len(w.conds) == 0 {
		return ""
	}
	return " WHERE " + strings.Join(w.conds, " AND ")
}

// Args returns the bound argument slice in placeholder order.
func (w *Where) Args() []any { return w.args }

// Append adds an existing parameterised string to the args + adjusts placeholders.
// For composite conditions (rarely needed). Most callers should use Add/AddIfNotEmpty.
func (w *Where) Append(cond string, values ...any) {
	w.conds = append(w.conds, cond)
	w.args = append(w.args, values...)
}
