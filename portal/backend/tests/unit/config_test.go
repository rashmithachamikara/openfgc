package unit

import (
	"os"
	"strings"
	"testing"

	"github.com/wso2/openfgc/portal/backend/internal/config"
)

func TestLoadFromEnv(t *testing.T) {
	t.Setenv("BFF_SERVER__PORT", "8082")
	t.Setenv("BFF_LOG__LEVEL", "debug")
	t.Setenv("BFF_CORS__ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
	_ = os.Unsetenv("BFF_CONFIG_FILE")

	cfg, err := config.Load()
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
}

func TestInvalidCORSOriginRejected(t *testing.T) {
	t.Setenv("BFF_CORS__ALLOWED_ORIGINS", "not-a-url")

	_, err := config.Load()
	if err == nil {
		t.Fatal("expected config load to fail for invalid CORS origin")
	}
}

func TestAllowCredentialsRequiresNonWildcardOrigins(t *testing.T) {
	t.Setenv("BFF_CORS__ALLOW_CREDENTIALS", "true")
	t.Setenv("BFF_CORS__ALLOWED_ORIGINS", "*")

	_, err := config.Load()
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

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("expected config load success, got: %v", err)
	}
	if !cfg.CORS.AllowCredentials {
		t.Fatal("expected cors.allow_credentials to be true")
	}
}
