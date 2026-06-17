// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type elementRequest struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace"`
	Type        string            `json:"type"`
	DisplayName string            `json:"displayName"`
	Description string            `json:"description"`
	Schema      map[string]any    `json:"schema"`
	Properties  map[string]string `json:"properties"`
}

type purposeElementRequest struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Mandatory bool   `json:"mandatory"`
}

type purposeRequest struct {
	Name        string                  `json:"name"`
	DisplayName string                  `json:"displayName"`
	Description string                  `json:"description"`
	Properties  map[string]string       `json:"properties"`
	Elements    []purposeElementRequest `json:"elements"`
}

type consentRequest struct {
	Type           string                  `json:"type"`
	ExpirationTime int64                   `json:"expirationTime"`
	Attributes     map[string]string       `json:"attributes"`
	Purposes       []consentPurposeRequest `json:"purposes"`
	Authorizations []consentAuthorization  `json:"authorizations"`
}

type consentPurposeRequest struct {
	Name     string                  `json:"name"`
	Elements []consentElementRequest `json:"elements"`
}

type consentElementRequest struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Approved  bool   `json:"approved"`
	Value     any    `json:"value"`
}

type consentAuthorization struct {
	UserID    string   `json:"userId"`
	Type      string   `json:"type"`
	Status    string   `json:"status"`
	Resources []string `json:"resources"`
}

type batchCreateResponse struct {
	Results []struct {
		Status  string `json:"status"`
		Element struct {
			ElementID string `json:"elementId"`
			Name      string `json:"name"`
			Namespace string `json:"namespace"`
			Type      string `json:"type"`
			Version   string `json:"version"`
		} `json:"element"`
		Error *string `json:"error"`
	} `json:"results"`
}

type purposeResponse struct {
	PurposeID string `json:"purposeId"`
	GroupID   string `json:"groupId"`
	Version   string `json:"version"`
}

type consentResponse struct {
	ID string `json:"id"`
}

type manifest struct {
	ManifestVersion   int                 `json:"manifestVersion"`
	BaseURL           string              `json:"baseUrl"`
	OrgID             string              `json:"orgId"`
	GroupModel        map[string]any      `json:"groupModel"`
	Distributions     map[string]any      `json:"distributions"`
	ConsentTypes      []map[string]any    `json:"consentTypes"`
	Attributes        map[string][]string `json:"attributes"`
	Elements          []map[string]any    `json:"elements"`
	Purposes          []map[string]any    `json:"purposes"`
	SearchSamples     map[string][]string `json:"searchSamples"`
	CreateDefaults    map[string]string   `json:"createDefaults"`
	TemplateConsentID string              `json:"templateConsentId"`
	CreatedAt         int64               `json:"createdAt"`
}

type client struct {
	baseURL string
	orgID   string
	http    *http.Client
}

func main() {
	baseURL := flag.String("base-url", "http://localhost:9091", "API base URL")
	orgID := flag.String("org-id", "openfgc-perf-org", "Organization ID")
	groupPrefix := flag.String("group-prefix", "perf-group", "Group ID prefix")
	maxGroups := flag.Int("max-groups", 1000, "Maximum performance groups")
	enabledGroups := flag.Int("purpose-enabled-groups", 1000, "Groups that get group-scoped purposes")
	output := flag.String("output", filepath.Join("tests", "performance", "seed", "templates.json"), "Manifest output path")
	flag.Parse()
	if *enabledGroups <= 0 {
		*enabledGroups = *maxGroups
	}
	if *enabledGroups > *maxGroups {
		*enabledGroups = *maxGroups
	}

	c := &client{
		baseURL: strings.TrimRight(*baseURL, "/"),
		orgID:   *orgID,
		http:    &http.Client{Timeout: 30 * time.Second},
	}

	if err := c.checkHealth(); err != nil {
		fail("%v", err)
	}

	elementCatalog := elementCatalog()
	elementResponses, err := c.createElements(elementCatalog)
	if err != nil {
		fail("create elements: %v", err)
	}

	purposes := purposeCatalog()
	purposeManifest, err := c.createPurposes(purposes, *groupPrefix, *enabledGroups)
	if err != nil {
		fail("create purposes: %v", err)
	}

	sampleConsentID, err := c.createSampleConsent(*groupPrefix)
	if err != nil {
		fail("create sample consent: %v", err)
	}

	out := manifest{
		ManifestVersion: 2,
		BaseURL:         c.baseURL,
		OrgID:           c.orgID,
		GroupModel: map[string]any{
			"prefix":                   *groupPrefix,
			"minGroupCount":            100,
			"maxGroupCount":            *maxGroups,
			"purposeEnabledGroupCount": *enabledGroups,
		},
		Distributions: map[string]any{
			"status":                        map[string]int{"ACTIVE": 70, "CREATED": 10, "EXPIRED": 12, "REVOKED": 8},
			"consentTypes":                  map[string]int{"accounts": 55, "payments": 30, "profile-sharing": 15},
			"purposeCount":                  map[string]int{"1": 55, "2": 30, "3": 12, "4": 3},
			"authorizationCount":            map[string]int{"1": 82, "2": 15, "3": 3},
			"userPopulationRatio":           0.22,
			"groupDistribution":             map[string]int{"top5": 40, "next20": 35, "remaining": 25},
			"userAuthorizationDistribution": map[string]int{"top5": 45, "next20": 35, "remaining": 20},
		},
		ConsentTypes: []map[string]any{
			{"name": "accounts", "weight": 55, "purposeNames": []string{"account-overview", "transaction-history", "profile-basics", "contact-sharing"}},
			{"name": "payments", "weight": 30, "purposeNames": []string{"payment-initiation", "standing-order-access", "beneficiary-access", "fraud-review"}},
			{"name": "profile-sharing", "weight": 15, "purposeNames": []string{"profile-basics", "contact-sharing", "marketing-personalization"}},
		},
		Attributes: map[string][]string{
			"segment":       {"retail", "business", "premium", "staff"},
			"channel":       {"web", "mobile", "branch", "partner", "ivr"},
			"region":        makeRange("region-", 10),
			"customer_tier": {"starter", "standard", "gold", "platinum"},
			"product_line":  {"savings", "current", "salary", "student", "mortgage", "cards", "merchant", "investment", "wealth", "lending", "wallet", "insurance"},
			"service_plan":  {"core", "plus", "prime", "family", "youth", "digital", "elite", "enterprise"},
			"risk_band":     {"low", "guarded", "medium", "elevated", "high"},
		},
		Elements:          elementResponses,
		Purposes:          purposeManifest,
		SearchSamples:     map[string][]string{"statuses": {"ACTIVE", "CREATED", "EXPIRED", "REVOKED"}, "attributeKeys": {"segment", "channel", "region", "customer_tier", "product_line", "service_plan", "risk_band"}},
		CreateDefaults:    map[string]string{"consentType": "accounts", "purposeName": "account-overview", "elementName": "account-id", "elementNamespace": "accounts"},
		TemplateConsentID: sampleConsentID,
		CreatedAt:         time.Now().UnixMilli(),
	}

	data, err := json.MarshalIndent(out, "", "  ")
	if err != nil {
		fail("marshal manifest: %v", err)
	}
	if err := os.WriteFile(*output, append(data, '\n'), 0o644); err != nil {
		fail("write manifest: %v", err)
	}
	fmt.Printf("Created realistic template manifest at %s\n", *output)
}

func (c *client) checkHealth() error {
	var payload map[string]string
	if err := c.request(http.MethodGet, "/health", nil, nil, &payload); err != nil {
		return fmt.Errorf("health check failed: %w", err)
	}
	if payload["status"] != "UP" {
		return fmt.Errorf("health check returned unexpected payload: %v", payload)
	}
	return nil
}

func (c *client) createElements(elements []elementRequest) ([]map[string]any, error) {
	var response batchCreateResponse
	if err := c.request(http.MethodPost, "/api/v1/consent-elements", map[string]string{"org-id": c.orgID}, elements, &response); err != nil {
		return nil, err
	}
	created := make([]map[string]any, 0, len(response.Results))
	for _, result := range response.Results {
		if result.Status != "SUCCESS" {
			return nil, fmt.Errorf("element creation failed: %v", result.Error)
		}
		version, _ := strconv.Atoi(strings.TrimPrefix(result.Element.Version, "v"))
		created = append(created, map[string]any{
			"id":        result.Element.ElementID,
			"name":      result.Element.Name,
			"namespace": result.Element.Namespace,
			"type":      result.Element.Type,
			"version":   version,
		})
	}
	return created, nil
}

func (c *client) createPurposes(purposes []map[string]any, groupPrefix string, enabledGroups int) ([]map[string]any, error) {
	manifestPurposes := make([]map[string]any, 0, len(purposes))
	for _, purpose := range purposes {
		scope := purpose["scope"].(string)
		ownerGroups := []string{c.orgID}
		if scope == "group" {
			ownerGroups = make([]string, 0, enabledGroups)
			for i := 1; i <= enabledGroups; i++ {
				ownerGroups = append(ownerGroups, fmt.Sprintf("%s-%04d", groupPrefix, i))
			}
		}
		instances := make([]map[string]any, 0, len(ownerGroups))
		for _, ownerGroup := range ownerGroups {
			headers := map[string]string{"org-id": c.orgID}
			if scope == "group" {
				headers["group-id"] = ownerGroup
			}
			req := purposeRequest{
				Name:        purpose["name"].(string),
				DisplayName: strings.ReplaceAll(strings.Title(strings.ReplaceAll(purpose["name"].(string), "-", " ")), " ", " "),
				Description: fmt.Sprintf("%s purpose for performance testing", purpose["name"].(string)),
				Properties:  map[string]string{"classification": "performance", "scope": scope},
				Elements:    purpose["elements"].([]purposeElementRequest),
			}
			var response purposeResponse
			if err := c.request(http.MethodPost, "/api/v1/consent-purposes", headers, req, &response); err != nil {
				return nil, fmt.Errorf("purpose %s / %s: %w", purpose["name"], ownerGroup, err)
			}
			version, _ := strconv.Atoi(strings.TrimPrefix(response.Version, "v"))
			instances = append(instances, map[string]any{
				"groupId": response.GroupID,
				"id":      response.PurposeID,
				"version": version,
			})
		}
		manifestPurposes = append(manifestPurposes, map[string]any{
			"name":      purpose["name"],
			"scope":     scope,
			"types":     purpose["types"],
			"elements":  purpose["elements"],
			"instances": instances,
		})
	}
	return manifestPurposes, nil
}

func (c *client) createSampleConsent(groupPrefix string) (string, error) {
	body := consentRequest{
		Type:           "accounts",
		ExpirationTime: time.Now().UnixMilli() + 31536000000,
		Attributes: map[string]string{
			"segment":       "retail",
			"channel":       "web",
			"region":        "region-01",
			"customer_tier": "standard",
			"product_line":  "savings",
			"service_plan":  "core",
			"risk_band":     "low",
			"perf_index":    "template",
		},
		Purposes: []consentPurposeRequest{{
			Name: "account-overview",
			Elements: []consentElementRequest{
				{Name: "full-name", Namespace: "identity", Approved: true, Value: "Template User"},
				{Name: "email", Namespace: "identity", Approved: true, Value: "template@example.com"},
				{Name: "account-id", Namespace: "accounts", Approved: true, Value: "ACC-TEMPLATE-0001"},
			},
		}},
		Authorizations: []consentAuthorization{{
			UserID:    "user-000000001",
			Type:      "primary",
			Status:    "APPROVED",
			Resources: []string{"accounts"},
		}},
	}
	var response consentResponse
	if err := c.request(http.MethodPost, "/api/v1/consents", map[string]string{
		"org-id":   c.orgID,
		"group-id": fmt.Sprintf("%s-%04d", groupPrefix, 1),
	}, body, &response); err != nil {
		return "", err
	}
	return response.ID, nil
}

func (c *client) request(method string, path string, headers map[string]string, body any, out any) error {
	var payload io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return err
		}
		payload = bytes.NewReader(data)
	}
	req, err := http.NewRequest(method, c.baseURL+path, payload)
	if err != nil {
		return err
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("%s %s failed with HTTP %d: %s", method, path, resp.StatusCode, strings.TrimSpace(string(responseBody)))
	}
	if out != nil && len(responseBody) > 0 {
		if err := json.Unmarshal(responseBody, out); err != nil {
			return fmt.Errorf("decode %s %s response: %w", method, path, err)
		}
	}
	return nil
}

func elementCatalog() []elementRequest {
	return []elementRequest{
		{Name: "full-name", Namespace: "identity", Type: "basic", DisplayName: "Full Name", Description: "Customer full name", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "pii"}},
		{Name: "email", Namespace: "identity", Type: "basic", DisplayName: "Email", Description: "Customer email address", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "pii"}},
		{Name: "phone", Namespace: "identity", Type: "basic", DisplayName: "Phone", Description: "Customer phone number", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "pii"}},
		{Name: "address-json", Namespace: "identity", Type: "json", DisplayName: "Address", Description: "Structured address", Schema: map[string]any{"type": "object", "properties": map[string]any{"line1": map[string]any{"type": "string"}, "city": map[string]any{"type": "string"}, "country": map[string]any{"type": "string"}}, "required": []string{"line1", "city", "country"}}, Properties: map[string]string{"classification": "pii"}},
		{Name: "account-id", Namespace: "accounts", Type: "basic", DisplayName: "Account ID", Description: "Internal account identifier", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "financial"}},
		{Name: "iban", Namespace: "accounts", Type: "basic", DisplayName: "IBAN", Description: "International bank account number", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "financial"}},
		{Name: "account-type", Namespace: "accounts", Type: "basic", DisplayName: "Account Type", Description: "Account type", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "financial"}},
		{Name: "balance-tier", Namespace: "accounts", Type: "basic", DisplayName: "Balance Tier", Description: "Balance bucket", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "financial"}},
		{Name: "payee-id", Namespace: "payments", Type: "basic", DisplayName: "Payee ID", Description: "Payment payee identifier", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "financial"}},
		{Name: "payment-limit", Namespace: "payments", Type: "basic", DisplayName: "Payment Limit", Description: "Configured payment limit", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "financial"}},
		{Name: "beneficiary-id", Namespace: "payments", Type: "basic", DisplayName: "Beneficiary ID", Description: "Beneficiary identifier", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "financial"}},
		{Name: "transaction-reference", Namespace: "payments", Type: "basic", DisplayName: "Transaction Reference", Description: "Transaction reference number", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "financial"}},
		{Name: "marketing-opt-in", Namespace: "profile", Type: "basic", DisplayName: "Marketing Opt In", Description: "Marketing consent flag", Schema: map[string]any{"type": "string"}, Properties: map[string]string{"classification": "preference"}},
		{Name: "preferences-json", Namespace: "profile", Type: "json", DisplayName: "Preferences", Description: "Structured preference payload", Schema: map[string]any{"type": "object", "properties": map[string]any{"alerts": map[string]any{"type": "boolean"}, "theme": map[string]any{"type": "string"}, "language": map[string]any{"type": "string"}}, "required": []string{"alerts", "theme", "language"}}, Properties: map[string]string{"classification": "preference"}},
		{Name: "demographics-json", Namespace: "profile", Type: "json", DisplayName: "Demographics", Description: "Structured demographic information", Schema: map[string]any{"type": "object", "properties": map[string]any{"ageBand": map[string]any{"type": "string"}, "employment": map[string]any{"type": "string"}}, "required": []string{"ageBand", "employment"}}, Properties: map[string]string{"classification": "profile"}},
	}
}

func purposeCatalog() []map[string]any {
	return []map[string]any{
		{"name": "account-overview", "scope": "org", "types": []string{"accounts"}, "elements": []purposeElementRequest{{Name: "full-name", Namespace: "identity", Mandatory: true}, {Name: "email", Namespace: "identity", Mandatory: true}, {Name: "account-id", Namespace: "accounts", Mandatory: true}, {Name: "iban", Namespace: "accounts", Mandatory: false}, {Name: "account-type", Namespace: "accounts", Mandatory: false}, {Name: "balance-tier", Namespace: "accounts", Mandatory: false}}},
		{"name": "profile-basics", "scope": "org", "types": []string{"accounts", "profile-sharing"}, "elements": []purposeElementRequest{{Name: "full-name", Namespace: "identity", Mandatory: true}, {Name: "email", Namespace: "identity", Mandatory: true}, {Name: "phone", Namespace: "identity", Mandatory: false}, {Name: "marketing-opt-in", Namespace: "profile", Mandatory: false}, {Name: "preferences-json", Namespace: "profile", Mandatory: false}}},
		{"name": "contact-sharing", "scope": "org", "types": []string{"accounts", "profile-sharing"}, "elements": []purposeElementRequest{{Name: "full-name", Namespace: "identity", Mandatory: true}, {Name: "email", Namespace: "identity", Mandatory: true}, {Name: "phone", Namespace: "identity", Mandatory: false}, {Name: "address-json", Namespace: "identity", Mandatory: false}}},
		{"name": "payment-initiation", "scope": "group", "types": []string{"payments"}, "elements": []purposeElementRequest{{Name: "account-id", Namespace: "accounts", Mandatory: true}, {Name: "payee-id", Namespace: "payments", Mandatory: true}, {Name: "payment-limit", Namespace: "payments", Mandatory: true}, {Name: "transaction-reference", Namespace: "payments", Mandatory: false}}},
		{"name": "standing-order-access", "scope": "group", "types": []string{"payments"}, "elements": []purposeElementRequest{{Name: "account-id", Namespace: "accounts", Mandatory: true}, {Name: "payee-id", Namespace: "payments", Mandatory: true}, {Name: "payment-limit", Namespace: "payments", Mandatory: true}}},
		{"name": "transaction-history", "scope": "group", "types": []string{"accounts"}, "elements": []purposeElementRequest{{Name: "account-id", Namespace: "accounts", Mandatory: true}, {Name: "iban", Namespace: "accounts", Mandatory: false}, {Name: "balance-tier", Namespace: "accounts", Mandatory: false}}},
		{"name": "beneficiary-access", "scope": "group", "types": []string{"payments"}, "elements": []purposeElementRequest{{Name: "beneficiary-id", Namespace: "payments", Mandatory: true}, {Name: "payee-id", Namespace: "payments", Mandatory: true}, {Name: "full-name", Namespace: "identity", Mandatory: false}}},
		{"name": "marketing-personalization", "scope": "group", "types": []string{"profile-sharing"}, "elements": []purposeElementRequest{{Name: "marketing-opt-in", Namespace: "profile", Mandatory: true}, {Name: "preferences-json", Namespace: "profile", Mandatory: true}, {Name: "demographics-json", Namespace: "profile", Mandatory: false}}},
		{"name": "fraud-review", "scope": "group", "types": []string{"payments"}, "elements": []purposeElementRequest{{Name: "account-id", Namespace: "accounts", Mandatory: true}, {Name: "payee-id", Namespace: "payments", Mandatory: true}, {Name: "beneficiary-id", Namespace: "payments", Mandatory: false}, {Name: "transaction-reference", Namespace: "payments", Mandatory: false}, {Name: "demographics-json", Namespace: "profile", Mandatory: false}}},
	}
}

func makeRange(prefix string, count int) []string {
	values := make([]string, 0, count)
	for i := 1; i <= count; i++ {
		values = append(values, fmt.Sprintf("%s%02d", prefix, i))
	}
	return values
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "error: "+format+"\n", args...)
	os.Exit(1)
}
