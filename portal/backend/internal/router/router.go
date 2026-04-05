// Package router wires HTTP routes and middleware composition for the BFF.
package router

import (
	"log/slog"
	"net/http"

	"github.com/wso2/openfgc/portal/backend/internal/health"
	"github.com/wso2/openfgc/portal/backend/internal/middleware"
)

// New builds the root HTTP handler with Phase 1 bootstrap routes.
func New(log *slog.Logger) http.Handler {
	mux := http.NewServeMux()

	healthHandler := health.NewHandler()
	mux.HandleFunc("GET /health/liveness", healthHandler.Liveness)
	mux.HandleFunc("GET /health/readiness", healthHandler.Readiness)
	mux.HandleFunc("GET /health", healthHandler.Liveness)

	return middleware.CorrelationID(log, mux)
}
