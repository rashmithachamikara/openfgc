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

// Package middleware contains HTTP middleware helpers used by the BFF.
package middleware

import (
	"encoding/json"
	"net/http"
	"strings"

	systemcontext "github.com/wso2/openfgc/portal/backend/internal/system/context"
)

// UserIDOptions configures placeholder-based user ID resolution for /me routes.
type UserIDOptions struct {
	PlaceholderModeEnabled bool
	PlaceholderUserID      string
	Environment            string
}

type userIDErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// UserID resolves the effective user ID once and stores it in request context.
func UserID(next http.Handler, opts UserIDOptions) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !opts.PlaceholderModeEnabled {
			message := "identity unavailable"
			if !strings.EqualFold(strings.TrimSpace(opts.Environment), "production") {
				message += "; consider enabling placeholder identity mode for development"
			}
			writeUserIDError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", message)
			return
		}

		userID := strings.TrimSpace(opts.PlaceholderUserID)
		if userID == "" {
			writeUserIDError(w, http.StatusServiceUnavailable, "PLACEHOLDER_UNAVAILABLE", "placeholder identity unavailable")
			return
		}

		next.ServeHTTP(w, r.WithContext(systemcontext.WithUserID(r.Context(), userID)))
	})
}

func writeUserIDError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(userIDErrorResponse{Code: code, Message: message})
}
