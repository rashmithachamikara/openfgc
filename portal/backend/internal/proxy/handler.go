package proxy

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/wso2/openfgc/portal/backend/internal/config"
)

// Handler serves /api and /me route groups for Phase 2.
type Handler struct {
	svc *Service
	cfg config.ProxyConfig
}

type errorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// NewHandler creates a proxy handler with initialized service.
func NewHandler(cfg config.ProxyConfig) (*Handler, error) {
	svc, err := NewService(cfg)
	if err != nil {
		return nil, err
	}
	return &Handler{svc: svc, cfg: cfg}, nil
}

// API proxies passthrough /api/* routes to /api/v1/* after allowlist checks.
func (h *Handler) API(w http.ResponseWriter, r *http.Request) {
	if !h.svc.IsAllowedPassthroughMethod(r.Method) {
		writeJSONError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	knownPath, methodAllowed := h.svc.CheckAPIAccess(r.Method, r.URL.Path)
	if !knownPath {
		writeJSONError(w, http.StatusNotFound, "NOT_FOUND", "route not found")
		return
	}
	if !methodAllowed {
		writeJSONError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	path, ok := strings.CutPrefix(r.URL.Path, "/api")
	if !ok {
		writeJSONError(w, http.StatusNotFound, "NOT_FOUND", "route not found")
		return
	}
	if path == "" {
		path = "/"
	}
	body, err := h.readBoundedBody(r)
	if err != nil {
		writeJSONError(w, http.StatusRequestEntityTooLarge, "REQUEST_TOO_LARGE", "request entity too large")
		return
	}
	if err := h.svc.Forward(w, r, r.Method, "/api/v1"+path, nil, body); err != nil {
		h.writeProxyError(w, err)
	}
}

// MeConsents handles GET /me/consents.
func (h *Handler) MeConsents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSONError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	if !h.cfg.PlaceholderModeEnabled {
		writeJSONError(w, http.StatusInternalServerError, "PLACEHOLDER_DISABLED", "placeholder mode disabled")
		return
	}
	if err := h.svc.Forward(w, r, http.MethodGet, "/api/v1/consents", func(q url.Values) {
		q.Set("userIds", h.cfg.PlaceholderUserID)
	}, nil); err != nil {
		h.writeProxyError(w, err)
	}
}

// MeConsentByID handles GET /me/consents/{consentId}.
func (h *Handler) MeConsentByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSONError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	consentID := r.PathValue("consentId")
	if consentID == "" {
		writeJSONError(w, http.StatusNotFound, "NOT_FOUND", "consent id not found")
		return
	}
	if err := h.svc.Forward(w, r, http.MethodGet, "/api/v1/consents/"+consentID, nil, nil); err != nil {
		h.writeProxyError(w, err)
	}
}

// MeConsentApprove handles POST /me/consents/{consentId}/approve.
func (h *Handler) MeConsentApprove(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSONError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	consentID := r.PathValue("consentId")
	if consentID == "" {
		writeJSONError(w, http.StatusNotFound, "NOT_FOUND", "consent id not found")
		return
	}
	body, err := h.readBoundedBody(r)
	if err != nil {
		writeJSONError(w, http.StatusRequestEntityTooLarge, "REQUEST_TOO_LARGE", "request entity too large")
		return
	}
	payload, err := h.buildApprovalPayload(body)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "invalid request payload")
		return
	}
	if err := h.svc.Forward(w, r, http.MethodPost, "/api/v1/consents/"+consentID+"/authorizations", nil, payload); err != nil {
		h.writeProxyError(w, err)
	}
}

// MeConsentRevoke handles PUT /me/consents/{consentId}/revoke.
func (h *Handler) MeConsentRevoke(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		writeJSONError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	consentID := r.PathValue("consentId")
	if consentID == "" {
		writeJSONError(w, http.StatusNotFound, "NOT_FOUND", "consent id not found")
		return
	}
	body, err := h.readBoundedBody(r)
	if err != nil {
		writeJSONError(w, http.StatusRequestEntityTooLarge, "REQUEST_TOO_LARGE", "request entity too large")
		return
	}
	payload, err := h.buildRevokePayload(body)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "invalid request payload")
		return
	}
	if err := h.svc.Forward(w, r, http.MethodPut, "/api/v1/consents/"+consentID+"/revoke", nil, payload); err != nil {
		h.writeProxyError(w, err)
	}
}

func (h *Handler) writeProxyError(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrUpstreamTimeout) {
		writeJSONError(w, http.StatusServiceUnavailable, "UPSTREAM_TIMEOUT", "upstream timeout")
		return
	}
	writeJSONError(w, http.StatusBadGateway, "UPSTREAM_UNAVAILABLE", "upstream unavailable")
}

func writeJSONError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorResponse{Code: code, Message: message})
}

func (h *Handler) readBoundedBody(r *http.Request) ([]byte, error) {
	if r.Body == nil {
		return nil, nil
	}
	defer func() {
		_ = r.Body.Close()
	}()
	limited := io.LimitReader(r.Body, h.cfg.MaxRequestBytes+1)
	body, err := io.ReadAll(limited)
	if err != nil {
		return nil, err
	}
	if int64(len(body)) > h.cfg.MaxRequestBytes {
		return nil, errors.New("body too large")
	}
	return body, nil
}

func (h *Handler) buildApprovalPayload(in []byte) ([]byte, error) {
	payload := map[string]any{
		"type":   "authorisation",
		"status": "APPROVED",
		"userId": h.cfg.PlaceholderUserID,
	}
	if len(in) > 0 {
		if err := json.Unmarshal(in, &payload); err != nil {
			return nil, err
		}
	}
	payload["type"] = valueOrDefault(payload["type"], "authorisation")
	payload["status"] = "APPROVED"
	payload["userId"] = h.cfg.PlaceholderUserID
	return json.Marshal(payload)
}

func (h *Handler) buildRevokePayload(in []byte) ([]byte, error) {
	payload := map[string]any{
		"actionBy": h.cfg.PlaceholderUserID,
	}
	if len(in) > 0 {
		if err := json.Unmarshal(in, &payload); err != nil {
			return nil, err
		}
	}
	payload["actionBy"] = h.cfg.PlaceholderUserID
	if payload["actionBy"] == "" {
		return nil, errors.New("missing actionBy")
	}
	return json.Marshal(payload)
}

func valueOrDefault(v any, fallback string) string {
	s, ok := v.(string)
	if !ok || strings.TrimSpace(s) == "" {
		return fallback
	}
	return s
}
