package proxy

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
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

type consentRetrievalResponse struct {
	ID                         string                      `json:"id"`
	Purposes                   []consentPurposeItem        `json:"purposes"`
	CreatedTime                int64                       `json:"createdTime"`
	UpdatedTime                int64                       `json:"updatedTime"`
	ClientID                   string                      `json:"clientId"`
	Type                       string                      `json:"type"`
	Status                     string                      `json:"status"`
	Frequency                  *int                        `json:"frequency,omitempty"`
	ValidityTime               *int64                      `json:"validityTime,omitempty"`
	RecurringIndicator         *bool                       `json:"recurringIndicator,omitempty"`
	DataAccessValidityDuration *int64                      `json:"dataAccessValidityDuration,omitempty"`
	Attributes                 map[string]any              `json:"attributes,omitempty"`
	Authorizations             []consentAuthorizationEntry `json:"authorizations,omitempty"`
}

type consentPurposeItem struct {
	Name        string               `json:"name"`
	Description string               `json:"description,omitempty"`
	Elements    []consentElementItem `json:"elements"`
}

type consentElementItem struct {
	Name           string         `json:"name"`
	IsUserApproved bool           `json:"isUserApproved"`
	Value          any            `json:"value,omitempty"`
	IsMandatory    *bool          `json:"isMandatory,omitempty"`
	Type           string         `json:"type,omitempty"`
	Description    string         `json:"description,omitempty"`
	Properties     map[string]any `json:"properties,omitempty"`
}

type consentAuthorizationEntry struct {
	ID          string  `json:"id"`
	UserID      *string `json:"userId,omitempty"`
	Type        string  `json:"type"`
	Status      string  `json:"status"`
	UpdatedTime int64   `json:"updatedTime"`
	Resources   any     `json:"resources,omitempty"`
}

type purposeListResponse struct {
	Data []purposeMetadata `json:"data"`
}

type purposeMetadata struct {
	ClientID    string                `json:"clientId"`
	Name        string                `json:"name"`
	Description *string               `json:"description"`
	Elements    []purposeElementEntry `json:"elements"`
}

type purposeElementEntry struct {
	Name        string `json:"name"`
	IsMandatory bool   `json:"isMandatory"`
}

type elementListResponse struct {
	Data []elementMetadata `json:"data"`
}

type elementMetadata struct {
	Name        string         `json:"name"`
	Type        string         `json:"type"`
	Description *string        `json:"description"`
	Properties  map[string]any `json:"properties"`
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

	baseResp, err := h.svc.ForwardRaw(r, http.MethodGet, "/api/v1/consents/"+consentID, nil, nil)
	if err != nil {
		h.writeProxyError(w, err)
		return
	}
	if baseResp.StatusCode != http.StatusOK {
		h.writeUpstreamResponse(w, baseResp)
		return
	}

	aggregatedBody, err := h.buildAggregatedConsentResponse(r, baseResp.Body)
	if err != nil {
		h.writeProxyError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(aggregatedBody)
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

func (h *Handler) writeUpstreamResponse(w http.ResponseWriter, resp *UpstreamResponse) {
	for key, values := range resp.Headers {
		if strings.EqualFold(key, "Transfer-Encoding") || strings.EqualFold(key, "Connection") {
			continue
		}
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	w.WriteHeader(resp.StatusCode)
	if len(resp.Body) > 0 {
		_, _ = w.Write(resp.Body)
	}
}

func (h *Handler) buildAggregatedConsentResponse(r *http.Request, baseBody []byte) ([]byte, error) {
	var consent consentRetrievalResponse
	if err := json.Unmarshal(baseBody, &consent); err != nil {
		return nil, ErrUpstreamUnavailable
	}

	purposeMetadataByName := make(map[string]purposeMetadata, len(consent.Purposes))
	for _, purpose := range consent.Purposes {
		if _, exists := purposeMetadataByName[purpose.Name]; exists {
			continue
		}
		metadata, err := h.fetchPurposeMetadata(r, consent.ClientID, purpose)
		if err != nil {
			return nil, err
		}
		purposeMetadataByName[purpose.Name] = metadata
	}

	elementMetadataByName := make(map[string]elementMetadata)
	for _, purpose := range consent.Purposes {
		for _, element := range purpose.Elements {
			if _, exists := elementMetadataByName[element.Name]; exists {
				continue
			}
			metadata, err := h.fetchElementMetadata(r, element.Name)
			if err != nil {
				return nil, err
			}
			elementMetadataByName[element.Name] = metadata
		}
	}

	for purposeIndex := range consent.Purposes {
		purpose := &consent.Purposes[purposeIndex]
		purposeMetadata, exists := purposeMetadataByName[purpose.Name]
		if !exists {
			return nil, ErrUpstreamUnavailable
		}
		if purposeMetadata.Description != nil {
			purpose.Description = *purposeMetadata.Description
		}

		mandatoryByElement := make(map[string]bool, len(purposeMetadata.Elements))
		for _, entry := range purposeMetadata.Elements {
			mandatoryByElement[entry.Name] = entry.IsMandatory
		}

		for elementIndex := range purpose.Elements {
			element := &purpose.Elements[elementIndex]
			mandatory, exists := mandatoryByElement[element.Name]
			if !exists {
				return nil, ErrUpstreamUnavailable
			}
			element.IsMandatory = &mandatory

			elementMetadata, exists := elementMetadataByName[element.Name]
			if !exists {
				return nil, ErrUpstreamUnavailable
			}
			element.Type = elementMetadata.Type
			if elementMetadata.Description != nil {
				element.Description = *elementMetadata.Description
			}
			element.Properties = elementMetadata.Properties
		}
	}

	aggregated, err := json.Marshal(consent)
	if err != nil {
		return nil, ErrUpstreamUnavailable
	}

	return aggregated, nil
}

func (h *Handler) fetchPurposeMetadata(r *http.Request, clientID string, consentPurpose consentPurposeItem) (purposeMetadata, error) {
	exactByClient, err := h.fetchPurposeMetadataPage(r, consentPurpose.Name, clientID)
	if err != nil {
		return purposeMetadata{}, err
	}
	elementNames := make(map[string]struct{}, len(consentPurpose.Elements))
	for _, element := range consentPurpose.Elements {
		elementNames[element.Name] = struct{}{}
	}

	if purpose, ok := selectPurposeCandidate(exactByClient, consentPurpose.Name, clientID, elementNames); ok {
		return purpose, nil
	}

	// Fallback without clientIds filter handles inconsistent historical data.
	exactByName, err := h.fetchPurposeMetadataPage(r, consentPurpose.Name, "")
	if err != nil {
		return purposeMetadata{}, err
	}
	if purpose, ok := selectPurposeCandidate(exactByName, consentPurpose.Name, clientID, elementNames); ok {
		return purpose, nil
	}

	return purposeMetadata{}, ErrUpstreamUnavailable
}

func (h *Handler) fetchPurposeMetadataPage(r *http.Request, purposeName, clientID string) ([]purposeMetadata, error) {
	resp, err := h.svc.ForwardRaw(r, http.MethodGet, "/api/v1/consent-purposes", func(q url.Values) {
		q.Set("name", purposeName)
		if clientID != "" {
			q.Set("clientIds", clientID)
		}
		q.Set("limit", "50")
		q.Set("offset", "0")
	}, nil)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, ErrUpstreamUnavailable
	}

	var payload purposeListResponse
	if err := json.Unmarshal(resp.Body, &payload); err != nil {
		return nil, ErrUpstreamUnavailable
	}

	return payload.Data, nil
}

func selectPurposeCandidate(candidates []purposeMetadata, purposeName, clientID string, requiredElements map[string]struct{}) (purposeMetadata, bool) {
	matchingName := make([]purposeMetadata, 0, len(candidates))
	for _, purpose := range candidates {
		if purpose.Name != purposeName {
			continue
		}
		matchingName = append(matchingName, purpose)
	}

	if len(matchingName) == 0 {
		return purposeMetadata{}, false
	}

	best := make([]purposeMetadata, 0, len(matchingName))
	for _, purpose := range matchingName {
		if purposeContainsAllElements(purpose, requiredElements) {
			best = append(best, purpose)
		}
	}
	if len(best) == 0 {
		best = matchingName
	}

	if clientID != "" {
		for _, purpose := range best {
			if purpose.ClientID == clientID {
				return purpose, true
			}
		}
	}

	return best[0], true
}

func purposeContainsAllElements(purpose purposeMetadata, requiredElements map[string]struct{}) bool {
	if len(requiredElements) == 0 {
		return true
	}
	purposeElements := make(map[string]struct{}, len(purpose.Elements))
	for _, element := range purpose.Elements {
		purposeElements[element.Name] = struct{}{}
	}
	for name := range requiredElements {
		if _, ok := purposeElements[name]; !ok {
			return false
		}
	}
	return true
}

func (h *Handler) fetchElementMetadata(r *http.Request, elementName string) (elementMetadata, error) {
	resp, err := h.svc.ForwardRaw(r, http.MethodGet, "/api/v1/consent-elements", func(q url.Values) {
		q.Set("name", elementName)
		q.Set("limit", strconv.Itoa(50))
		q.Set("offset", "0")
	}, nil)
	if err != nil {
		return elementMetadata{}, err
	}
	if resp.StatusCode != http.StatusOK {
		return elementMetadata{}, ErrUpstreamUnavailable
	}

	var payload elementListResponse
	if err := json.Unmarshal(resp.Body, &payload); err != nil {
		return elementMetadata{}, ErrUpstreamUnavailable
	}
	for _, element := range payload.Data {
		if element.Name == elementName {
			return element, nil
		}
	}

	return elementMetadata{}, ErrUpstreamUnavailable
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
