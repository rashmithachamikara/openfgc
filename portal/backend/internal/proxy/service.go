// Package proxy contains outbound consent-server proxying logic.
package proxy

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/wso2/openfgc/portal/backend/internal/config"
)

var hopByHopHeaders = map[string]struct{}{
	"Connection":          {},
	"Keep-Alive":          {},
	"Proxy-Authenticate":  {},
	"Proxy-Authorization": {},
	"TE":                  {},
	"Trailer":             {},
	"Transfer-Encoding":   {},
	"Upgrade":             {},
}

var (
	// ErrUpstreamTimeout is returned when upstream request times out.
	ErrUpstreamTimeout = errors.New("upstream timeout")
	// ErrUpstreamUnavailable is returned when upstream cannot be reached.
	ErrUpstreamUnavailable = errors.New("upstream unavailable")
)

type routeSpec struct {
	pathParts []string
	methods   map[string]struct{}
}

var allowedAPIRoutes = []routeSpec{
	{pathParts: []string{"consents"}, methods: toMethodSet("GET", "POST")},
	{pathParts: []string{"consents", "attributes"}, methods: toMethodSet("GET")},
	{pathParts: []string{"consents", "validate"}, methods: toMethodSet("POST")},
	{pathParts: []string{"consents", "*"}, methods: toMethodSet("GET", "PUT")},
	{pathParts: []string{"consents", "*", "revoke"}, methods: toMethodSet("PUT")},
	{pathParts: []string{"consents", "*", "authorizations"}, methods: toMethodSet("GET", "POST")},
	{pathParts: []string{"consents", "*", "authorizations", "*"}, methods: toMethodSet("GET", "PUT")},
	{pathParts: []string{"consent-elements"}, methods: toMethodSet("GET", "POST")},
	{pathParts: []string{"consent-elements", "validate"}, methods: toMethodSet("POST")},
	{pathParts: []string{"consent-elements", "*"}, methods: toMethodSet("GET", "PUT", "DELETE")},
	{pathParts: []string{"consent-purposes"}, methods: toMethodSet("GET", "POST")},
	{pathParts: []string{"consent-purposes", "*"}, methods: toMethodSet("GET", "PUT", "DELETE")},
}

// Service proxies requests to consent-server with route-specific transforms.
type Service struct {
	cfg       config.ProxyConfig
	baseURL   *url.URL
	http      *http.Client
	allowlist map[string]struct{}
}

// UpstreamResponse captures proxied response details for caller-managed handling.
type UpstreamResponse struct {
	StatusCode int
	Headers    http.Header
	Body       []byte
}

// NewService builds a proxy service from app config.
func NewService(cfg config.ProxyConfig) (*Service, error) {
	parsed, err := url.Parse(cfg.OpenFGCAPIURL)
	if err != nil {
		return nil, err
	}
	allow := make(map[string]struct{}, len(cfg.AllowedPassthrough))
	for _, m := range cfg.AllowedPassthrough {
		allow[strings.ToUpper(strings.TrimSpace(m))] = struct{}{}
	}
	return &Service{
		cfg:     cfg,
		baseURL: parsed,
		http: &http.Client{
			Timeout: cfg.OpenFGCAPITimeout,
		},
		allowlist: allow,
	}, nil
}

// IsAllowedPassthroughMethod checks whether a passthrough /api method is allowed.
func (s *Service) IsAllowedPassthroughMethod(method string) bool {
	_, ok := s.allowlist[strings.ToUpper(method)]
	return ok
}

// CheckAPIAccess returns whether the API path is known and whether method is allowed.
func (s *Service) CheckAPIAccess(method, fullPath string) (knownPath bool, methodAllowed bool) {
	path, ok := strings.CutPrefix(fullPath, "/api/")
	if !ok {
		return false, false
	}
	trimmed := strings.Trim(path, "/")
	if trimmed == "" {
		return false, false
	}
	parts := strings.Split(trimmed, "/")
	method = strings.ToUpper(method)

	for _, spec := range allowedAPIRoutes {
		if !routeMatches(spec.pathParts, parts) {
			continue
		}
		_, allowed := spec.methods[method]
		return true, allowed
	}

	return false, false
}

// Forward sends a transformed request to upstream and writes the response.
func (s *Service) Forward(w http.ResponseWriter, r *http.Request, upstreamMethod, upstreamPath string, queryMutator func(url.Values), body []byte) error {
	resp, err := s.ForwardRaw(r, upstreamMethod, upstreamPath, queryMutator, body)
	if err != nil {
		return err
	}

	s.copyResponseHeaders(w.Header(), resp.Headers)
	w.WriteHeader(resp.StatusCode)
	if len(resp.Body) == 0 {
		return nil
	}
	_, err = w.Write(resp.Body)
	return err
}

// ForwardRaw sends a transformed request to upstream and returns response status, headers, and body.
func (s *Service) ForwardRaw(r *http.Request, upstreamMethod, upstreamPath string, queryMutator func(url.Values), body []byte) (*UpstreamResponse, error) {
	ctx, cancel := context.WithTimeout(r.Context(), s.cfg.OpenFGCAPITimeout)
	defer cancel()

	target := *s.baseURL
	target.Path = upstreamPath
	query := r.URL.Query()
	if queryMutator != nil {
		queryMutator(query)
	}
	target.RawQuery = query.Encode()

	upstreamReq, err := http.NewRequestWithContext(ctx, upstreamMethod, target.String(), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	s.copyHeaders(r.Header, upstreamReq.Header)
	s.setTrustedHeaders(r, upstreamReq)
	if len(body) > 0 {
		upstreamReq.Header.Set("Content-Length", "")
	}

	resp, err := s.http.Do(upstreamReq)
	if err != nil {
		var netErr net.Error
		if errors.Is(err, context.DeadlineExceeded) || (errors.As(err, &netErr) && netErr.Timeout()) {
			return nil, ErrUpstreamTimeout
		}
		return nil, ErrUpstreamUnavailable
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return &UpstreamResponse{
		StatusCode: resp.StatusCode,
		Headers:    resp.Header.Clone(),
		Body:       respBody,
	}, nil
}

func toMethodSet(methods ...string) map[string]struct{} {
	set := make(map[string]struct{}, len(methods))
	for _, m := range methods {
		set[strings.ToUpper(m)] = struct{}{}
	}
	return set
}

func routeMatches(patternParts, parts []string) bool {
	if len(patternParts) != len(parts) {
		return false
	}
	for i := range patternParts {
		if patternParts[i] == "*" {
			if parts[i] == "" {
				return false
			}
			continue
		}
		if patternParts[i] != parts[i] {
			return false
		}
	}
	return true
}

func (s *Service) copyHeaders(src, dst http.Header) {
	for k, vals := range src {
		if s.skipHeader(k) {
			continue
		}
		for _, v := range vals {
			dst.Add(k, v)
		}
	}
}

func (s *Service) copyResponseHeaders(dst, src http.Header) {
	for k, vals := range src {
		if _, drop := hopByHopHeaders[http.CanonicalHeaderKey(k)]; drop {
			continue
		}
		for _, v := range vals {
			dst.Add(k, v)
		}
	}
}

func (s *Service) skipHeader(name string) bool {
	canonical := http.CanonicalHeaderKey(name)
	if _, drop := hopByHopHeaders[canonical]; drop {
		return true
	}
	if strings.EqualFold(canonical, "Org-Id") || strings.EqualFold(canonical, "TPP-Client-Id") {
		return true
	}
	return false
}

func (s *Service) setTrustedHeaders(incoming *http.Request, outgoing *http.Request) {
	if s.cfg.PlaceholderOrgID != "" {
		outgoing.Header.Set("org-id", s.cfg.PlaceholderOrgID)
	}
	if s.cfg.PlaceholderClientID != "" {
		outgoing.Header.Set("TPP-client-id", s.cfg.PlaceholderClientID)
	}
	correlationID := incoming.Header.Get("X-Correlation-ID")
	if correlationID == "" {
		correlationID = newCorrelationID()
	}
	outgoing.Header.Set("X-Correlation-ID", correlationID)
}

func newCorrelationID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return time.Now().UTC().Format("20060102150405")
	}
	return hex.EncodeToString(buf)
}
