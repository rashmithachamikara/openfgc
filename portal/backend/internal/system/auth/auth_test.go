/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"

	"github.com/wso2/openfgc/portal/backend/internal/system/config"
)

func TestSplitAndReconstructToken(t *testing.T) {
	part1, part2, err := splitToken("abcde", 3)
	if err != nil || part1 != "ab" || part2 != "cde" {
		t.Fatalf("unexpected split: %q %q %v", part1, part2, err)
	}
	cfg := config.AuthConfig{MaxTokenPartBytes: 3, MaxReconstructedTokenBytes: 6}
	joined, err := reconstructToken(part1, part2, cfg)
	if err != nil || joined != "abcde" {
		t.Fatalf("unexpected reconstruction: %q %v", joined, err)
	}
	if _, _, err := splitToken("toolarge", 3); err == nil {
		t.Fatal("expected oversized split to fail")
	}
}

func TestScopeForAPIRequest(t *testing.T) {
	tests := []struct {
		method string
		path   string
		scope  string
	}{
		{http.MethodGet, "/api/consents", ScopeConsentsReadAny},
		{http.MethodPost, "/api/consents", ScopeConsentsWriteAny},
		{http.MethodPost, "/api/consents/validate", ScopeConsentsReadAny},
		{http.MethodDelete, "/api/consent-elements/id/versions/v1", ScopeElementsWrite},
		{http.MethodGet, "/api/consent-purposes/id", ScopePurposesRead},
	}
	for _, test := range tests {
		got, ok := ScopeForAPIRequest(test.method, test.path)
		if !ok || got != test.scope {
			t.Fatalf("%s %s: got %q, %v", test.method, test.path, got, ok)
		}
	}
}

func TestValidateConfiguredScopesSupportsEmptyPrefix(t *testing.T) {
	if err := validateConfiguredScopesWithPrefix(
		[]string{"openid", "consents:read:self"},
		"",
		[]string{"consents:read:self"},
	); err != nil {
		t.Fatalf("empty scope prefix should be supported: %v", err)
	}
}

func TestValidateConfiguredScopesRejectsUnknownPrefixedScope(t *testing.T) {
	err := validateConfiguredScopesWithPrefix(
		[]string{"openid", "portal:unknown"},
		"portal:",
		[]string{"portal:consents:read:self"},
	)
	if err == nil {
		t.Fatal("expected an unknown prefixed scope to be rejected")
	}
}

func TestOIDCLoginCallbackRefreshAndLogout(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	keyID := "test-key"
	var issuer *httptest.Server
	var refreshCalls int
	issuer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			writeTestJSON(w, map[string]any{
				"issuer": issuer.URL, "authorization_endpoint": issuer.URL + "/authorize",
				"token_endpoint": issuer.URL + "/token", "jwks_uri": issuer.URL + "/jwks",
				"end_session_endpoint":                  issuer.URL + "/logout",
				"id_token_signing_alg_values_supported": []string{"RS256"},
			})
		case "/jwks":
			writeTestJSON(w, jose.JSONWebKeySet{Keys: []jose.JSONWebKey{{
				Key: &privateKey.PublicKey, KeyID: keyID, Algorithm: "RS256", Use: "sig",
			}}})
		case "/token":
			if err := r.ParseForm(); err != nil {
				t.Errorf("parse token form: %v", err)
			}
			if clientID, clientSecret, ok := r.BasicAuth(); !ok || clientID != "portal-client" || clientSecret != "secret" {
				t.Errorf("unexpected confidential-client authentication")
			}
			now := time.Now()
			access := signTestToken(t, privateKey, keyID, map[string]any{
				"iss": issuer.URL, "sub": "user-1", "aud": "portal-api", "exp": now.Add(time.Hour).Unix(),
				"iat": now.Unix(), "nbf": now.Add(-time.Minute).Unix(), "org_id": "org-1",
				"scope": ScopeConsentsReadSelf + " " + ScopeConsentsWriteSelf,
			})
			idToken := signTestToken(t, privateKey, keyID, map[string]any{
				"iss": issuer.URL, "sub": "user-1", "aud": "portal-client", "exp": now.Add(time.Hour).Unix(), "iat": now.Unix(),
			})
			refresh := "refresh-token-initial"
			if r.Form.Get("grant_type") == "refresh_token" {
				refreshCalls++
				refresh = "refresh-token-rotated"
			}
			writeTestJSON(w, map[string]any{
				"access_token": access, "refresh_token": refresh, "id_token": idToken,
				"token_type": "Bearer", "expires_in": 3600,
			})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer issuer.Close()

	cfg := testAuthConfig(issuer.URL)
	manager, err := NewManager(context.Background(), cfg, config.ProxyConfig{}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatalf("new manager: %v", err)
	}
	mux := http.NewServeMux()
	manager.RegisterRoutes(mux)

	login := httptest.NewRecorder()
	mux.ServeHTTP(login, httptest.NewRequest(http.MethodGet, "/auth/login", nil))
	if login.Code != http.StatusFound || strings.Contains(login.Header().Get("Location"), "state=") {
		t.Fatalf("unexpected login redirect: %d %s", login.Code, login.Header().Get("Location"))
	}

	callback := httptest.NewRecorder()
	mux.ServeHTTP(callback, httptest.NewRequest(http.MethodGet, "/auth/callback?code=test-code", nil))
	if callback.Code != http.StatusFound || callback.Header().Get("Location") != cfg.PortalURL {
		t.Fatalf("unexpected callback: %d %s", callback.Code, callback.Header().Get("Location"))
	}
	cookies := cookiesByName(callback.Result().Cookies())
	for _, name := range []string{cfg.AccessTokenPart1Cookie, cfg.AccessTokenPart2Cookie, cfg.RefreshTokenPart1Cookie, cfg.RefreshTokenPart2Cookie, cfg.IDTokenPart1Cookie, cfg.IDTokenPart2Cookie} {
		if cookies[name] == nil {
			t.Fatalf("missing cookie %s", name)
		}
	}
	if cookies[cfg.AccessTokenPart1Cookie].HttpOnly || !cookies[cfg.AccessTokenPart2Cookie].HttpOnly || cookies[cfg.IDTokenPart2Cookie].HttpOnly {
		t.Fatal("unexpected split-cookie visibility")
	}
	protectedRequest := httptest.NewRequest(http.MethodGet, "/protected", nil)
	protectedRequest.Header.Set("Authorization", "Bearer "+cookies[cfg.AccessTokenPart1Cookie].Value)
	protectedRequest.AddCookie(cookies[cfg.AccessTokenPart2Cookie])
	forbidden := httptest.NewRecorder()
	manager.Require(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}), ScopeElementsWrite).ServeHTTP(forbidden, protectedRequest)
	if forbidden.Code != http.StatusForbidden {
		t.Fatalf("expected missing scope to return 403, got %d", forbidden.Code)
	}

	refreshPart := cookies[cfg.RefreshTokenPart1Cookie].Value
	refreshRequest := httptest.NewRequest(http.MethodPost, "/auth/refresh", strings.NewReader(url.Values{"refresh_token": {refreshPart}}.Encode()))
	refreshRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	refreshRequest.AddCookie(cookies[cfg.RefreshTokenPart2Cookie])
	refresh := httptest.NewRecorder()
	mux.ServeHTTP(refresh, refreshRequest)
	if refresh.Code != http.StatusNoContent || refreshCalls != 1 {
		t.Fatalf("unexpected refresh: status=%d calls=%d", refresh.Code, refreshCalls)
	}

	logoutRequest := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	logoutRequest.Header.Set("Authorization", "Bearer "+cookies[cfg.AccessTokenPart1Cookie].Value)
	for _, cookie := range cookies {
		logoutRequest.AddCookie(cookie)
	}
	logout := httptest.NewRecorder()
	mux.ServeHTTP(logout, logoutRequest)
	if logout.Code != http.StatusOK {
		t.Fatalf("unexpected logout status: %d", logout.Code)
	}
	var payload map[string]string
	if err := json.Unmarshal(logout.Body.Bytes(), &payload); err != nil || !strings.HasPrefix(payload["logoutUrl"], issuer.URL+"/logout?") {
		t.Fatalf("unexpected logout payload: %s", logout.Body.String())
	}
}

func testAuthConfig(issuer string) config.AuthConfig {
	return config.AuthConfig{
		Enabled: true, IssuerURL: issuer, ClientID: "portal-client", ClientSecret: "secret",
		PortalURL: "http://portal.example/consents", RedirectURI: "http://bff.example/auth/callback",
		PostLogoutRedirectURI: "http://portal.example/", Scopes: []string{"openid", "profile"},
		ResourceAudience: "portal-api", AllowedSigningAlgorithms: []string{"RS256"},
		HTTPTimeout: 5 * time.Second, RefreshTimeout: 5 * time.Second, ClockSkew: 30 * time.Second,
		ScopeClaim: "scope", OrgIDClaim: "org_id", AccessTokenPart1Cookie: "portal-at-p1",
		AccessTokenPart2Cookie: "portal-at-p2", RefreshTokenPart1Cookie: "portal-rt-p1",
		RefreshTokenPart2Cookie: "portal-rt-p2", IDTokenPart1Cookie: "portal-id-p1",
		IDTokenPart2Cookie: "portal-id-p2", CookieSameSite: "Lax", RefreshCookieMaxAgeSeconds: 3600,
		MaxTokenPartBytes: 3800, MaxReconstructedTokenBytes: 7600,
	}
}

func signTestToken(t *testing.T, key *rsa.PrivateKey, keyID string, claims map[string]any) string {
	t.Helper()
	signer, err := jose.NewSigner(jose.SigningKey{Algorithm: jose.RS256, Key: key}, (&jose.SignerOptions{}).WithType("JWT").WithHeader("kid", keyID))
	if err != nil {
		t.Fatal(err)
	}
	serialized, err := jwt.Signed(signer).Claims(claims).Serialize()
	if err != nil {
		t.Fatal(err)
	}
	return serialized
}

func writeTestJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(value)
}

func cookiesByName(cookies []*http.Cookie) map[string]*http.Cookie {
	result := make(map[string]*http.Cookie, len(cookies))
	for _, cookie := range cookies {
		result[cookie.Name] = cookie
	}
	return result
}
