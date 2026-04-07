// Package router wires HTTP routes and middleware composition for the BFF.
package router

import (
	"log/slog"
	"net/http"

	"github.com/wso2/openfgc/portal/backend/internal/config"
	"github.com/wso2/openfgc/portal/backend/internal/health"
	"github.com/wso2/openfgc/portal/backend/internal/middleware"
	"github.com/wso2/openfgc/portal/backend/internal/proxy"
)

// New builds the root HTTP handler with Phase 1 bootstrap routes.
func New(log *slog.Logger, cfg config.Config) (http.Handler, error) {
	mux := http.NewServeMux()

	healthHandler := health.NewHandler()
	mux.HandleFunc("GET /health/liveness", healthHandler.Liveness)
	mux.HandleFunc("GET /health/readiness", healthHandler.Readiness)
	mux.HandleFunc("GET /health", healthHandler.Liveness)

	proxyHandler, err := proxy.NewHandler(cfg.Proxy)
	if err != nil {
		return nil, err
	}

	mux.HandleFunc("GET /me/consents", proxyHandler.MeConsents)
	mux.HandleFunc("GET /me/consents/{consentId}", proxyHandler.MeConsentByID)
	mux.HandleFunc("POST /me/consents/{consentId}/approve", proxyHandler.MeConsentApprove)
	mux.HandleFunc("PUT /me/consents/{consentId}/revoke", proxyHandler.MeConsentRevoke)
	mux.HandleFunc("/api/{path...}", proxyHandler.API)

	withCORS := middleware.CORS(mux, middleware.CORSOptions{
		AllowedOrigins:   cfg.CORS.AllowedOrigins,
		AllowedMethods:   cfg.CORS.AllowedMethods,
		AllowedHeaders:   cfg.CORS.AllowedHeaders,
		AllowCredentials: cfg.CORS.AllowCredentials,
	})

	return middleware.CorrelationID(log, withCORS), nil
}
