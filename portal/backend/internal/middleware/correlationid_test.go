package middleware

import (
	"errors"
	"testing"
)

func TestNewCorrelationID_UsesUniqueFallbackWhenRandomFails(t *testing.T) {
	originalRandomRead := randomRead
	randomRead = func(_ []byte) (int, error) {
		return 0, errors.New("entropy unavailable")
	}
	t.Cleanup(func() {
		randomRead = originalRandomRead
	})

	first := newCorrelationID()
	second := newCorrelationID()

	if first == second {
		t.Fatalf("expected unique fallback ids, got same value %q", first)
	}
	if !isValidCorrelationID(first) {
		t.Fatalf("expected first fallback id to be valid, got %q", first)
	}
	if !isValidCorrelationID(second) {
		t.Fatalf("expected second fallback id to be valid, got %q", second)
	}
}
