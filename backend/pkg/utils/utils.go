package utils

// Difference returns the elements in a that are not in b.
func Difference[T comparable](a, b []T) []T {
	m := make(map[T]struct{}, len(b))

	for _, v := range b {
		m[v] = struct{}{}
	}

	result := make([]T, 0)

	for _, v := range a {
		if _, exists := m[v]; !exists {
			result = append(result, v)
		}
	}

	return result
}
