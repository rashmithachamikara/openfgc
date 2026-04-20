// Package health provides readiness and liveness HTTP handlers.
package health

import (
	"encoding/json"
	"net/http"
)

// Handler serves liveness and readiness endpoints.
type Handler struct{}

type response struct {
	Status string `json:"status"`
}

// NewHandler returns a health handler instance.
func NewHandler() *Handler {
	return &Handler{}
}

// Liveness responds with service liveness state.
func (h *Handler) Liveness(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, response{Status: "ok"})
}

// Readiness responds with service readiness state.
func (h *Handler) Readiness(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, response{Status: "ready"})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
