// Package middleware contains HTTP middleware helpers used by the BFF.
package middleware

import (
	"net/http"
	"strings"
)

// CORSOptions defines configurable CORS policy for browser clients.
type CORSOptions struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	AllowCredentials bool
}

// CORS applies origin checks and preflight handling for allowed browser origins.
func CORS(next http.Handler, options CORSOptions) http.Handler {
	allowedOrigins := toSet(options.AllowedOrigins)
	allowMethods := strings.Join(options.AllowedMethods, ", ")
	allowHeaders := strings.Join(options.AllowedHeaders, ", ")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := strings.TrimSpace(r.Header.Get("Origin"))
		if origin == "" {
			next.ServeHTTP(w, r)
			return
		}

		if _, ok := allowedOrigins[origin]; !ok {
			w.WriteHeader(http.StatusForbidden)
			return
		}

		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", allowMethods)
		w.Header().Set("Access-Control-Allow-Headers", allowHeaders)
		if options.AllowCredentials {
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func toSet(values []string) map[string]struct{} {
	out := make(map[string]struct{}, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		out[trimmed] = struct{}{}
	}
	return out
}
