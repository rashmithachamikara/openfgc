package unit

import (
	"testing"
	"time"

	"github.com/wso2/openfgc/portal/backend/internal/config"
	"github.com/wso2/openfgc/portal/backend/internal/proxy"
)

func TestCheckAPIAccess(t *testing.T) {
	svc, err := proxy.NewService(config.ProxyConfig{
		OpenFGCAPIURL:       "http://localhost:9090",
		OpenFGCAPITimeout:   2 * time.Second,
		MaxRequestBytes:     1024,
		AllowedPassthrough:  []string{"GET", "POST", "PUT", "DELETE"},
		PlaceholderOrgID:    "ORG-001",
		PlaceholderClientID: "TPP-CLIENT-001",
	})
	if err != nil {
		t.Fatalf("failed to construct service: %v", err)
	}

	tests := []struct {
		name          string
		method        string
		path          string
		expectKnown   bool
		expectAllowed bool
	}{
		{name: "known path and method", method: "GET", path: "/api/consents", expectKnown: true, expectAllowed: true},
		{name: "known path wrong method", method: "DELETE", path: "/api/consents", expectKnown: true, expectAllowed: false},
		{name: "known wildcard path", method: "PUT", path: "/api/consents/abc-123/revoke", expectKnown: true, expectAllowed: true},
		{name: "known wildcard wrong method", method: "POST", path: "/api/consents/abc-123/revoke", expectKnown: true, expectAllowed: false},
		{name: "unknown path", method: "GET", path: "/api/does-not-exist", expectKnown: false, expectAllowed: false},
		{name: "non api prefix", method: "GET", path: "/health", expectKnown: false, expectAllowed: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			known, allowed := svc.CheckAPIAccess(tt.method, tt.path)
			if known != tt.expectKnown || allowed != tt.expectAllowed {
				t.Fatalf("expected (known=%v, allowed=%v), got (known=%v, allowed=%v)", tt.expectKnown, tt.expectAllowed, known, allowed)
			}
		})
	}
}

func TestIsAllowedPassthroughMethod(t *testing.T) {
	svc, err := proxy.NewService(config.ProxyConfig{
		OpenFGCAPIURL:      "http://localhost:9090",
		OpenFGCAPITimeout:  2 * time.Second,
		MaxRequestBytes:    1024,
		AllowedPassthrough: []string{"GET", "POST"},
	})
	if err != nil {
		t.Fatalf("failed to construct service: %v", err)
	}

	if !svc.IsAllowedPassthroughMethod("get") {
		t.Fatal("expected lowercase get to be allowed")
	}
	if svc.IsAllowedPassthroughMethod("DELETE") {
		t.Fatal("expected DELETE to be disallowed")
	}
}
