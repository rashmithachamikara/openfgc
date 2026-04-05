// Package config provides configuration loading and validation for the BFF service.
package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/env"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
)

// Config is the root configuration model for the BFF service.
type Config struct {
	Server ServerConfig `koanf:"server"`
	Log    LogConfig    `koanf:"log"`
}

// ServerConfig contains HTTP server runtime settings.
type ServerConfig struct {
	Host            string        `koanf:"host"`
	Port            int           `koanf:"port"`
	ReadTimeout     time.Duration `koanf:"read_timeout"`
	WriteTimeout    time.Duration `koanf:"write_timeout"`
	IdleTimeout     time.Duration `koanf:"idle_timeout"`
	ShutdownTimeout time.Duration `koanf:"shutdown_timeout"`
}

// LogConfig contains logging configuration for the BFF.
type LogConfig struct {
	Level string `koanf:"level"`
}

// Load initializes configuration from defaults, optional file, and environment variables.
func Load() (*Config, error) {
	k := koanf.New(".")

	if err := setDefaults(k); err != nil {
		return nil, fmt.Errorf("set defaults: %w", err)
	}

	configPath := os.Getenv("BFF_CONFIG_FILE")
	if configPath != "" {
		if err := k.Load(file.Provider(configPath), yaml.Parser()); err != nil {
			return nil, fmt.Errorf("load config file: %w", err)
		}
	}

	if err := k.Load(env.Provider("BFF_", ".", func(s string) string {
		s = strings.TrimPrefix(s, "BFF_")
		s = strings.ToLower(s)
		s = strings.ReplaceAll(s, "__", ".")
		return s
	}), nil); err != nil {
		return nil, fmt.Errorf("load env config: %w", err)
	}

	var cfg Config
	if err := k.Unmarshal("", &cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	return &cfg, validate(cfg)
}

func setDefaults(k *koanf.Koanf) error {
	if err := k.Set("server.host", "0.0.0.0"); err != nil {
		return err
	}
	if err := k.Set("server.port", 8080); err != nil {
		return err
	}
	if err := k.Set("server.read_timeout", "15s"); err != nil {
		return err
	}
	if err := k.Set("server.write_timeout", "15s"); err != nil {
		return err
	}
	if err := k.Set("server.idle_timeout", "60s"); err != nil {
		return err
	}
	if err := k.Set("server.shutdown_timeout", "10s"); err != nil {
		return err
	}
	if err := k.Set("log.level", "info"); err != nil {
		return err
	}

	return nil
}

func validate(cfg Config) error {
	if cfg.Server.Port <= 0 {
		return fmt.Errorf("server.port must be a positive value")
	}
	if cfg.Server.ShutdownTimeout <= 0 {
		return fmt.Errorf("server.shutdown_timeout must be > 0")
	}
	return nil
}
