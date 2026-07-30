/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package config

import (
	"os"
	"strings"
	"testing"
)

func TestLoadFromEnv(t *testing.T) {
	t.Setenv("BFF_SERVER__PORT", "8082")
	t.Setenv("BFF_LOG__LEVEL", "debug")
	t.Setenv("BFF_CORS__ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
	t.Setenv("BFF_PROXY__MAX_RESPONSE_BYTES", "2097152")
	_ = os.Unsetenv("BFF_CONFIG_FILE")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected config to load, got error: %v", err)
	}

	if cfg.Server.Port != 8082 {
		t.Fatalf("expected port 8082, got %d", cfg.Server.Port)
	}
	if cfg.Log.Level != "debug" {
		t.Fatalf("expected log level debug, got %s", cfg.Log.Level)
	}
	if len(cfg.CORS.AllowedOrigins) != 2 {
		t.Fatalf("expected 2 cors origins, got %d", len(cfg.CORS.AllowedOrigins))
	}
	if cfg.CORS.AllowedOrigins[0] != "http://localhost:3000" {
		t.Fatalf("unexpected first origin: %s", cfg.CORS.AllowedOrigins[0])
	}
	if cfg.Proxy.MaxResponseBytes != 2097152 {
		t.Fatalf("expected max response bytes 2097152, got %d", cfg.Proxy.MaxResponseBytes)
	}
}

func TestInvalidCORSOriginRejected(t *testing.T) {
	tests := []struct {
		name    string
		origin  string
		errText string
	}{
		{name: "invalid url", origin: "http://[::1", errText: "invalid URL"},
		{name: "contains path", origin: "http://localhost:3000/some/path", errText: "must not contain a path"},
		{name: "contains query", origin: "http://localhost:3000?debug=true", errText: "must not contain a query string"},
		{name: "contains fragment", origin: "http://localhost:3000#app", errText: "must not contain a fragment"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("BFF_CORS__ALLOWED_ORIGINS", tt.origin)

			_, err := Load()
			if err == nil {
				t.Fatal("expected config load to fail for invalid CORS origin")
			}
			if !strings.Contains(err.Error(), tt.errText) {
				t.Fatalf("expected error to contain %q, got %v", tt.errText, err)
			}
		})
	}
}

func TestAllowCredentialsRequiresNonWildcardOrigins(t *testing.T) {
	t.Setenv("BFF_CORS__ALLOW_CREDENTIALS", "true")
	t.Setenv("BFF_CORS__ALLOWED_ORIGINS", "*")

	_, err := Load()
	if err == nil {
		t.Fatal("expected config load to fail for wildcard origins with credentials")
	}
	if !strings.Contains(err.Error(), "cannot contain wildcard") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestAllowCredentialsEnvParsing(t *testing.T) {
	t.Setenv("BFF_CORS__ALLOW_CREDENTIALS", "true")
	t.Setenv("BFF_CORS__ALLOWED_ORIGINS", "http://localhost:5173")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected config load success, got: %v", err)
	}
	if !cfg.CORS.AllowCredentials {
		t.Fatal("expected cors.allow_credentials to be true")
	}
}

func TestPlaceholderModeBlockedInProduction(t *testing.T) {
	t.Setenv("BFF_ENV", "production")
	t.Setenv("BFF_PROXY__PLACEHOLDER_MODE_ENABLED", "true")
	t.Setenv("BFF_PROXY__PLACEHOLDER_USER_ID", "user@example.com")

	_, err := Load()
	if err == nil {
		t.Fatal("expected error when placeholder mode is enabled in production")
	}
	if !strings.Contains(err.Error(), "cannot be true in production") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestPlaceholderValuesRejectedWhenModeDisabled(t *testing.T) {
	tests := []struct {
		name    string
		envName string
		errText string
	}{
		{name: "user id", envName: "BFF_PROXY__PLACEHOLDER_USER_ID", errText: "proxy.placeholder_user_id must be empty"},
		{name: "org id", envName: "BFF_PROXY__PLACEHOLDER_ORG_ID", errText: "proxy.placeholder_org_id must be empty"},
		{name: "group id", envName: "BFF_PROXY__PLACEHOLDER_GROUP_ID", errText: "proxy.placeholder_group_id must be empty"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("BFF_PROXY__PLACEHOLDER_MODE_ENABLED", "false")
			t.Setenv(tt.envName, "placeholder-value")

			_, err := Load()
			if err == nil {
				t.Fatal("expected error when placeholder value is set while mode is disabled")
			}
			if !strings.Contains(err.Error(), tt.errText) {
				t.Fatalf("expected error to contain %q, got %v", tt.errText, err)
			}
		})
	}
}

func TestAllowedPassthroughMethodsEnvJSON(t *testing.T) {
	t.Setenv("BFF_PROXY__ALLOWED_PASSTHROUGH_METHODS", `["get", "put"]`)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected config to load, got error: %v", err)
	}

	if len(cfg.Proxy.AllowedPassthrough) != 2 {
		t.Fatalf("expected 2 allowed methods, got %d", len(cfg.Proxy.AllowedPassthrough))
	}
	if cfg.Proxy.AllowedPassthrough[0] != "GET" || cfg.Proxy.AllowedPassthrough[1] != "PUT" {
		t.Fatalf("unexpected methods: %#v", cfg.Proxy.AllowedPassthrough)
	}
}

func TestOpenFGCAPIURLRequiresHTTPSchemeAndHost(t *testing.T) {
	tests := []struct {
		name    string
		url     string
		errText string
	}{
		{name: "empty url", url: "", errText: "must not be empty"},
		{name: "relative url", url: "/consent-server", errText: "must use http or https scheme"},
		{name: "missing host", url: "http:///api", errText: "must include a host"},
		{name: "unsupported scheme", url: "ftp://localhost:9090", errText: "must use http or https scheme"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("BFF_PROXY__OPENFGC_API_URL", tt.url)

			_, err := Load()
			if err == nil {
				t.Fatal("expected config load error")
			}
			if !strings.Contains(err.Error(), tt.errText) {
				t.Fatalf("expected error to contain %q, got %v", tt.errText, err)
			}
		})
	}
}

func TestMaxResponseBytesMustBePositive(t *testing.T) {
	t.Setenv("BFF_PROXY__MAX_RESPONSE_BYTES", "0")

	_, err := Load()
	if err == nil {
		t.Fatal("expected config load error")
	}
	if !strings.Contains(err.Error(), "proxy.max_response_bytes must be > 0") {
		t.Fatalf("unexpected error: %v", err)
	}
}
