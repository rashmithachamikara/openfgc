/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

package auth

import (
	"crypto/rsa"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"

	"github.com/wso2/openfgc/portal/backend/internal/system/config"
)

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
