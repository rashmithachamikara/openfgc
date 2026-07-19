/*
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 * Licensed under the Apache License, Version 2.0.
 */

package auth

import "testing"

func TestLoginTransactionGenerationAndPKCEChallenge(t *testing.T) {
	state, verifier, err := newLoginTransaction()
	if err != nil {
		t.Fatal(err)
	}
	if len(state) != 43 || !validPKCEVerifier(verifier) || state == verifier {
		t.Fatalf("unexpected generated transaction values")
	}

	const rfcVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
	const rfcChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
	if got := pkceChallenge(rfcVerifier); got != rfcChallenge {
		t.Fatalf("PKCE challenge = %q, want %q", got, rfcChallenge)
	}
}

func TestPKCEVerifierAndStateValidation(t *testing.T) {
	valid := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~"
	if !validPKCEVerifier(valid) {
		t.Fatal("valid RFC 7636 verifier rejected")
	}
	for _, verifier := range []string{"short", valid + "!", string(make([]byte, 129))} {
		if validPKCEVerifier(verifier) {
			t.Fatalf("invalid verifier accepted: %q", verifier)
		}
	}
	if !statesMatch("matching-state", "matching-state") || statesMatch("matching-state", "different-state") || statesMatch("", "") {
		t.Fatal("unexpected state comparison result")
	}
}
