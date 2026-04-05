package integration

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/wso2/openfgc/portal/backend/internal/logger"
	"github.com/wso2/openfgc/portal/backend/internal/router"
)

func TestLivenessEndpoint(t *testing.T) {
	h := router.New(logger.New("error"))
	ts := httptest.NewServer(h)
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/health/liveness")
	if err != nil {
		t.Fatalf("unexpected request error: %v", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			t.Fatalf("failed to close response body: %v", err)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}
