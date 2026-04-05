// Package middleware contains HTTP middleware helpers used by the BFF.
package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
)

const correlationHeader = "X-Correlation-ID"

// CorrelationID ensures each request has a correlation ID and mirrors it in responses.
func CorrelationID(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(correlationHeader)
		if id == "" {
			id = newCorrelationID()
		}
		w.Header().Set(correlationHeader, id)

		log.Debug("request received", "method", r.Method, "path", r.URL.Path, "correlation_id", id)
		next.ServeHTTP(w, r)
	})
}

func newCorrelationID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "fallback-correlation-id"
	}
	return hex.EncodeToString(buf)
}
