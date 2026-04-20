package unit

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/wso2/openfgc/portal/backend/internal/middleware"
)

func TestCorrelationIDMiddleware_UsesValidClientID(t *testing.T) {
	const clientID = "client-req.123:abc_DEF"

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Correlation-ID"); got != clientID {
			t.Fatalf("expected request correlation id %q, got %q", clientID, got)
		}
		w.WriteHeader(http.StatusOK)
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := middleware.CorrelationID(logger, next)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set("X-Correlation-ID", clientID)
	res := httptest.NewRecorder()

	handler.ServeHTTP(res, req)

	if got := res.Header().Get("X-Correlation-ID"); got != clientID {
		t.Fatalf("expected response correlation id %q, got %q", clientID, got)
	}
}

func TestCorrelationIDMiddleware_RegeneratesInvalidClientID(t *testing.T) {
	invalidID := "bad id with spaces"

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := r.Header.Get("X-Correlation-ID")
		if got == "" {
			t.Fatal("expected generated request correlation id")
		}
		if got == invalidID {
			t.Fatal("expected invalid client id to be replaced")
		}
		w.WriteHeader(http.StatusOK)
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := middleware.CorrelationID(logger, next)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set("X-Correlation-ID", invalidID)
	res := httptest.NewRecorder()

	handler.ServeHTTP(res, req)

	got := res.Header().Get("X-Correlation-ID")
	if got == "" {
		t.Fatal("expected response correlation id")
	}
	if got == invalidID {
		t.Fatal("expected invalid client id to be replaced in response")
	}
}

func TestCorrelationIDMiddleware_GeneratesWhenMissing(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Correlation-ID"); got == "" {
			t.Fatal("expected generated request correlation id")
		}
		w.WriteHeader(http.StatusOK)
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := middleware.CorrelationID(logger, next)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	res := httptest.NewRecorder()

	handler.ServeHTTP(res, req)

	if got := res.Header().Get("X-Correlation-ID"); got == "" {
		t.Fatal("expected generated response correlation id")
	}
}
