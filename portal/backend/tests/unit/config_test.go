package unit

import (
	"os"
	"testing"

	"github.com/wso2/openfgc/portal/backend/internal/config"
)

func TestLoadFromEnv(t *testing.T) {
	t.Setenv("BFF_SERVER__PORT", "8082")
	t.Setenv("BFF_LOG__LEVEL", "debug")
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
}
