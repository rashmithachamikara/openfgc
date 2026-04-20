// Package middleware contains HTTP middleware helpers used by the BFF.
package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"unicode"
)

const correlationHeader = "X-Correlation-ID"
const maxCorrelationIDLength = 64

// CorrelationID ensures each request has a correlation ID and mirrors it in responses.
func CorrelationID(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(correlationHeader)
		if !isValidCorrelationID(id) {
			id = newCorrelationID()
		}
		r.Header.Set(correlationHeader, id)
		w.Header().Set(correlationHeader, id)

		log.Debug("request received", "method", r.Method, "path", r.URL.Path, "correlation_id", id)
		next.ServeHTTP(w, r)
	})
}

func isValidCorrelationID(id string) bool {
	if id == "" || len(id) > maxCorrelationIDLength {
		return false
	}

	for _, r := range id {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			continue
		}

		switch r {
		case '-', '_', '.', ':':
			continue
		default:
			return false
		}
	}

	return true
}

func newCorrelationID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "fallback-correlation-id"
	}
	return hex.EncodeToString(buf)
}
