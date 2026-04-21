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
	userIDOptions := middleware.UserIDOptions{
		PlaceholderModeEnabled: cfg.Proxy.PlaceholderModeEnabled,
		PlaceholderUserID:      cfg.Proxy.PlaceholderUserID,
		Environment:            cfg.Env,
	}

	mux.Handle("GET /me/consents", middleware.UserID(http.HandlerFunc(proxyHandler.MeConsents), userIDOptions))
	mux.Handle("GET /me/consents/{consentId}", middleware.UserID(http.HandlerFunc(proxyHandler.MeConsentByID), userIDOptions))
	mux.Handle("POST /me/consents/{consentId}/approve", middleware.UserID(http.HandlerFunc(proxyHandler.MeConsentApprove), userIDOptions))
	mux.Handle("PUT /me/consents/{consentId}/revoke", middleware.UserID(http.HandlerFunc(proxyHandler.MeConsentRevoke), userIDOptions))
	mux.HandleFunc("/api/{path...}", proxyHandler.API)

	withCORS := middleware.CORS(mux, middleware.CORSOptions{
		AllowedOrigins:   cfg.CORS.AllowedOrigins,
		AllowedMethods:   cfg.CORS.AllowedMethods,
		AllowedHeaders:   cfg.CORS.AllowedHeaders,
		AllowCredentials: cfg.CORS.AllowCredentials,
	})

	return middleware.CorrelationID(log, withCORS), nil
}
