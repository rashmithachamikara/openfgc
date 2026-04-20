// Package main starts the OpenFGC portal backend BFF service.
package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/wso2/openfgc/portal/backend/internal/config"
	"github.com/wso2/openfgc/portal/backend/internal/logger"
	"github.com/wso2/openfgc/portal/backend/internal/router"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	log := logger.New(cfg.Log.Level)
	if cfg.Proxy.PlaceholderModeEnabled {
		log.Warn("placeholder identity mode is enabled; do not use in production")
	}
	handler, err := router.New(log, *cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to initialize router: %v\n", err)
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:      handler,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	serveErrCh := make(chan error, 1)

	go func() {
		log.Info("starting OpenFGC portal backend server", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serveErrCh <- err
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	exitCode := 0

	select {
	case <-ctx.Done():
	case err := <-serveErrCh:
		log.Error("server stopped unexpectedly", "error", err)
		exitCode = 1
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	log.Info("shutting down OpenFGC portal backend server")
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("graceful shutdown failed", "error", err)
		exitCode = 1
	}

	time.Sleep(50 * time.Millisecond)
	log.Info("OpenFGC portal backend server stopped")

	if exitCode != 0 {
		os.Exit(exitCode)
	}
}
