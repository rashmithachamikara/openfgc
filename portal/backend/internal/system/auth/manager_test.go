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

package auth

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/wso2/openfgc/portal/backend/internal/system/config"
	systemcontext "github.com/wso2/openfgc/portal/backend/internal/system/context"
)

func TestPlaceholderModePopulatesPrincipalContext(t *testing.T) {
	manager, err := NewManager(
		context.Background(),
		config.AuthConfig{},
		config.ProxyConfig{
			PlaceholderModeEnabled: true,
			PlaceholderUserID:      " user-1 ",
			PlaceholderOrgID:       " org-1 ",
		},
		slog.New(slog.NewTextHandler(io.Discard, nil)),
	)
	if err != nil {
		t.Fatalf("new manager: %v", err)
	}

	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	recorder := httptest.NewRecorder()
	manager.Require(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal, ok := systemcontext.PrincipalFromContext(r.Context())
		if !ok {
			t.Error("expected placeholder principal in request context")
			return
		}
		if principal.UserID != "user-1" || principal.OrgID != "org-1" {
			t.Errorf("unexpected placeholder principal: %#v", principal)
		}
		for _, scope := range AllPortalScopes {
			if _, ok := principal.Scopes[scope]; !ok {
				t.Errorf("placeholder principal missing scope %q", scope)
			}
		}
		w.WriteHeader(http.StatusNoContent)
	})).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("unexpected response status: %d", recorder.Code)
	}
}
