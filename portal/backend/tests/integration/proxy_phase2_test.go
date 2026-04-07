package integration

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/wso2/openfgc/portal/backend/internal/config"
	"github.com/wso2/openfgc/portal/backend/internal/logger"
	"github.com/wso2/openfgc/portal/backend/internal/router"
)

func newPhase2Server(t *testing.T, upstreamURL string) *httptest.Server {
	t.Helper()
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}
	cfg.Proxy.OpenFGCAPIURL = upstreamURL
	cfg.Proxy.PlaceholderModeEnabled = true
	cfg.Proxy.PlaceholderUserID = "user@example.com"
	cfg.Proxy.PlaceholderOrgID = "ORG-001"
	cfg.Proxy.PlaceholderClientID = "TPP-CLIENT-001"

	h, err := router.New(logger.New("error"), *cfg)
	if err != nil {
		t.Fatalf("failed to create router: %v", err)
	}
	return httptest.NewServer(h)
}

func newPhase2ServerWithTimeout(t *testing.T, upstreamURL string, timeout time.Duration) *httptest.Server {
	t.Helper()
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}
	cfg.Proxy.OpenFGCAPIURL = upstreamURL
	cfg.Proxy.OpenFGCAPITimeout = timeout
	cfg.Proxy.PlaceholderModeEnabled = true
	cfg.Proxy.PlaceholderUserID = "user@example.com"
	cfg.Proxy.PlaceholderOrgID = "ORG-001"
	cfg.Proxy.PlaceholderClientID = "TPP-CLIENT-001"

	h, err := router.New(logger.New("error"), *cfg)
	if err != nil {
		t.Fatalf("failed to create router: %v", err)
	}
	return httptest.NewServer(h)
}

func newPhase2ServerWithMaxBytes(t *testing.T, upstreamURL string, maxBytes int64) *httptest.Server {
	t.Helper()
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}
	cfg.Proxy.OpenFGCAPIURL = upstreamURL
	cfg.Proxy.MaxRequestBytes = maxBytes
	cfg.Proxy.PlaceholderModeEnabled = true
	cfg.Proxy.PlaceholderUserID = "user@example.com"
	cfg.Proxy.PlaceholderOrgID = "ORG-001"
	cfg.Proxy.PlaceholderClientID = "TPP-CLIENT-001"

	h, err := router.New(logger.New("error"), *cfg)
	if err != nil {
		t.Fatalf("failed to create router: %v", err)
	}
	return httptest.NewServer(h)
}

func TestAPIPassthroughRewriteAndHeaderSafety(t *testing.T) {
	var gotPath string
	var gotQuery string
	var gotOrg string
	var gotTPP string

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotQuery = r.URL.RawQuery
		gotOrg = r.Header.Get("org-id")
		gotTPP = r.Header.Get("TPP-client-id")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer upstream.Close()

	bff := newPhase2Server(t, upstream.URL)
	defer bff.Close()

	req, err := http.NewRequest(http.MethodGet, bff.URL+"/api/consents?limit=10&offset=2", nil)
	if err != nil {
		t.Fatalf("request creation failed: %v", err)
	}
	req.Header.Set("org-id", "MALICIOUS")
	req.Header.Set("TPP-client-id", "MALICIOUS")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	if gotPath != "/api/v1/consents" {
		t.Fatalf("expected rewritten path /api/v1/consents, got %s", gotPath)
	}
	if gotQuery != "limit=10&offset=2" {
		t.Fatalf("expected preserved query limit=10&offset=2, got %s", gotQuery)
	}
	if gotOrg != "ORG-001" {
		t.Fatalf("expected trusted org-id header, got %s", gotOrg)
	}
	if gotTPP != "TPP-CLIENT-001" {
		t.Fatalf("expected trusted TPP-client-id header, got %s", gotTPP)
	}
}

func TestMeConsentsForcesUserIDs(t *testing.T) {
	var gotPath string
	var gotQuery string

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotQuery = r.URL.RawQuery
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	bff := newPhase2Server(t, upstream.URL)
	defer bff.Close()

	resp, err := http.Get(bff.URL + "/me/consents?userIds=attacker&limit=5")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	if gotPath != "/api/v1/consents" {
		t.Fatalf("expected path /api/v1/consents, got %s", gotPath)
	}
	if gotQuery != "limit=5&userIds=user%40example.com" && gotQuery != "userIds=user%40example.com&limit=5" {
		t.Fatalf("expected query to include forced userIds and preserve limit, got %s", gotQuery)
	}
}

func TestApproveAndRevokeMappings(t *testing.T) {
	t.Run("approve maps to authorizations endpoint", func(t *testing.T) {
		var gotMethod string
		var gotPath string
		var gotBody map[string]any

		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			gotMethod = r.Method
			gotPath = r.URL.Path
			body, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(body, &gotBody)
			w.WriteHeader(http.StatusOK)
		}))
		defer upstream.Close()

		bff := newPhase2Server(t, upstream.URL)
		defer bff.Close()

		payload := []byte(`{"type":"authorisation","userId":"attacker@example.com"}`)
		resp, err := http.Post(bff.URL+"/me/consents/consent-123/approve", "application/json", bytes.NewReader(payload))
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer func() {
			_ = resp.Body.Close()
		}()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", resp.StatusCode)
		}
		if gotMethod != http.MethodPost {
			t.Fatalf("expected POST, got %s", gotMethod)
		}
		if gotPath != "/api/v1/consents/consent-123/authorizations" {
			t.Fatalf("unexpected path: %s", gotPath)
		}
		if gotBody["status"] != "APPROVED" {
			t.Fatalf("expected status APPROVED, got %v", gotBody["status"])
		}
		if gotBody["userId"] != "user@example.com" {
			t.Fatalf("expected placeholder userId, got %v", gotBody["userId"])
		}
	})

	t.Run("revoke maps to revoke endpoint", func(t *testing.T) {
		var gotMethod string
		var gotPath string
		var gotBody map[string]any

		upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			gotMethod = r.Method
			gotPath = r.URL.Path
			body, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(body, &gotBody)
			w.WriteHeader(http.StatusOK)
		}))
		defer upstream.Close()

		bff := newPhase2Server(t, upstream.URL)
		defer bff.Close()

		req, err := http.NewRequest(http.MethodPut, bff.URL+"/me/consents/consent-123/revoke", bytes.NewReader([]byte(`{"revocationReason":"test"}`)))
		if err != nil {
			t.Fatalf("request creation failed: %v", err)
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer func() {
			_ = resp.Body.Close()
		}()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", resp.StatusCode)
		}
		if gotMethod != http.MethodPut {
			t.Fatalf("expected PUT, got %s", gotMethod)
		}
		if gotPath != "/api/v1/consents/consent-123/revoke" {
			t.Fatalf("unexpected path: %s", gotPath)
		}
		if gotBody["actionBy"] != "user@example.com" {
			t.Fatalf("expected placeholder actionBy, got %v", gotBody["actionBy"])
		}
		if gotBody["revocationReason"] != "test" {
			t.Fatalf("expected revocationReason passthrough, got %v", gotBody["revocationReason"])
		}
	})
}

func TestAPIDenyByDefault(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	bff := newPhase2Server(t, upstream.URL)
	defer bff.Close()

	t.Run("unknown path returns 404", func(t *testing.T) {
		resp, err := http.Get(bff.URL + "/api/unknown/resource")
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer func() {
			_ = resp.Body.Close()
		}()
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", resp.StatusCode)
		}
	})

	t.Run("known path wrong method returns 405", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodDelete, bff.URL+"/api/consents", nil)
		if err != nil {
			t.Fatalf("request creation failed: %v", err)
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer func() {
			_ = resp.Body.Close()
		}()
		if resp.StatusCode != http.StatusMethodNotAllowed {
			t.Fatalf("expected 405, got %d", resp.StatusCode)
		}
	})
}

func TestProxyTimeoutMapsTo503(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(120 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	bff := newPhase2ServerWithTimeout(t, upstream.URL, 40*time.Millisecond)
	defer bff.Close()

	resp, err := http.Get(bff.URL + "/api/consents")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", resp.StatusCode)
	}

	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("expected json error payload: %v", err)
	}
	if payload["code"] != "UPSTREAM_TIMEOUT" {
		t.Fatalf("expected code UPSTREAM_TIMEOUT, got %v", payload["code"])
	}
}

func TestRequestBodySizeLimitReturns413(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	bff := newPhase2ServerWithMaxBytes(t, upstream.URL, 8)
	defer bff.Close()

	t.Run("api passthrough returns 413 with json error", func(t *testing.T) {
		big := bytes.Repeat([]byte("a"), 32)
		req, err := http.NewRequest(http.MethodPost, bff.URL+"/api/consents", bytes.NewReader(big))
		if err != nil {
			t.Fatalf("request creation failed: %v", err)
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer func() {
			_ = resp.Body.Close()
		}()

		if resp.StatusCode != http.StatusRequestEntityTooLarge {
			t.Fatalf("expected 413, got %d", resp.StatusCode)
		}
		if got := resp.Header.Get("Content-Type"); got != "application/json" {
			t.Fatalf("expected content type application/json, got %s", got)
		}
		var payload map[string]any
		if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
			t.Fatalf("expected json error payload: %v", err)
		}
		if payload["code"] != "REQUEST_TOO_LARGE" {
			t.Fatalf("expected code REQUEST_TOO_LARGE, got %v", payload["code"])
		}
	})

	t.Run("me approve returns 413 with json error", func(t *testing.T) {
		big := bytes.Repeat([]byte("b"), 64)
		resp, err := http.Post(bff.URL+"/me/consents/c-1/approve", "application/json", bytes.NewReader(big))
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer func() {
			_ = resp.Body.Close()
		}()

		if resp.StatusCode != http.StatusRequestEntityTooLarge {
			t.Fatalf("expected 413, got %d", resp.StatusCode)
		}
		var payload map[string]any
		if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
			t.Fatalf("expected json error payload: %v", err)
		}
		if payload["code"] != "REQUEST_TOO_LARGE" {
			t.Fatalf("expected code REQUEST_TOO_LARGE, got %v", payload["code"])
		}
	})
}

func TestUpstreamUnavailableMapsTo502(t *testing.T) {
	bff := newPhase2Server(t, "http://127.0.0.1:1")
	defer bff.Close()

	resp, err := http.Get(bff.URL + "/api/consents")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusBadGateway {
		t.Fatalf("expected 502, got %d", resp.StatusCode)
	}

	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("expected json error payload: %v", err)
	}
	if payload["code"] != "UPSTREAM_UNAVAILABLE" {
		t.Fatalf("expected code UPSTREAM_UNAVAILABLE, got %v", payload["code"])
	}
}
