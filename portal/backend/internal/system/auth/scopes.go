/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

package auth

import "strings"

// ScopePrefix and the remaining constants define the canonical portal authorization scopes.
const (
	// ScopePrefix is the namespace shared by all portal-owned scopes.
	// Set it to an empty string when the identity provider uses unprefixed scopes.
	ScopePrefix = "portal:"

	ScopeConsentsReadSelf  = ScopePrefix + "consents:read:self"
	ScopeConsentsWriteSelf = ScopePrefix + "consents:write:self"
	ScopeConsentsReadAny   = ScopePrefix + "consents:read:any"
	ScopeConsentsWriteAny  = ScopePrefix + "consents:write:any"
	ScopeElementsRead      = ScopePrefix + "elements:read"
	ScopeElementsWrite     = ScopePrefix + "elements:write"
	ScopePurposesRead      = ScopePrefix + "purposes:read"
	ScopePurposesWrite     = ScopePrefix + "purposes:write"
)

// AllPortalScopes lists every canonical portal authorization scope.
var AllPortalScopes = []string{
	ScopeConsentsReadSelf, ScopeConsentsWriteSelf,
	ScopeConsentsReadAny, ScopeConsentsWriteAny,
	ScopeElementsRead, ScopeElementsWrite,
	ScopePurposesRead, ScopePurposesWrite,
}

// ScopeForAPIRequest returns the canonical scope for an allowlisted /api request.
func ScopeForAPIRequest(method, path string) (string, bool) {
	method = strings.ToUpper(method)
	parts := strings.Split(strings.Trim(strings.TrimPrefix(path, "/api/"), "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		return "", false
	}
	write := method == "POST" || method == "PUT" || method == "DELETE"
	switch parts[0] {
	case "consents":
		if len(parts) == 2 && parts[1] == "validate" && method == "POST" {
			return ScopeConsentsReadAny, true
		}
		if write {
			return ScopeConsentsWriteAny, true
		}
		return ScopeConsentsReadAny, method == "GET"
	case "consent-elements":
		if write {
			return ScopeElementsWrite, true
		}
		return ScopeElementsRead, method == "GET"
	case "consent-purposes":
		if write {
			return ScopePurposesWrite, true
		}
		return ScopePurposesRead, method == "GET"
	default:
		return "", false
	}
}
