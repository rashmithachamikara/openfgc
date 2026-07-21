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
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type manifest struct {
	ManifestVersion   int                     `json:"manifestVersion"`
	BaseURL           string                  `json:"baseUrl,omitempty"`
	OrgID             string                  `json:"orgId"`
	GroupModel        groupModel              `json:"groupModel"`
	Distributions     distributions           `json:"distributions"`
	ConsentTypes      []consentTypeDefinition `json:"consentTypes"`
	Attributes        map[string][]string     `json:"attributes"`
	Elements          []elementDefinition     `json:"elements"`
	Purposes          []purposeDefinition     `json:"purposes"`
	CreateDefaults    createDefaults          `json:"createDefaults"`
	SearchSamples     map[string][]string     `json:"searchSamples"`
	TemplateConsentID string                  `json:"templateConsentId,omitempty"`
	CreatedAt         int64                   `json:"createdAt,omitempty"`
	SeedMode          string                  `json:"seedMode,omitempty"`
	SeededCount       int                     `json:"seededCount,omitempty"`
	SeedSamples       []seedSample            `json:"seedSamples,omitempty"`
}

type groupModel struct {
	Prefix                   string `json:"prefix"`
	MinGroupCount            int    `json:"minGroupCount"`
	MaxGroupCount            int    `json:"maxGroupCount"`
	PurposeEnabledGroupCount int    `json:"purposeEnabledGroupCount"`
}

type distributions struct {
	Status                        map[string]int `json:"status"`
	ConsentTypes                  map[string]int `json:"consentTypes"`
	PurposeCount                  map[string]int `json:"purposeCount"`
	AuthorizationCount            map[string]int `json:"authorizationCount"`
	UserPopulationRatio           float64        `json:"userPopulationRatio"`
	GroupDistribution             map[string]int `json:"groupDistribution"`
	UserAuthorizationDistribution map[string]int `json:"userAuthorizationDistribution"`
}

type consentTypeDefinition struct {
	Name         string   `json:"name"`
	Weight       int      `json:"weight"`
	PurposeNames []string `json:"purposeNames"`
}

type elementDefinition struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Type      string `json:"type"`
	Version   int    `json:"version"`
}

type purposeDefinition struct {
	Name      string           `json:"name"`
	Scope     string           `json:"scope"`
	Types     []string         `json:"types"`
	Elements  []purposeElement `json:"elements"`
	Instances []any            `json:"instances"`
}

type purposeElement struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Mandatory bool   `json:"mandatory"`
}

type createDefaults struct {
	ConsentType      string `json:"consentType"`
	PurposeName      string `json:"purposeName"`
	ElementName      string `json:"elementName"`
	ElementNamespace string `json:"elementNamespace"`
}

type seedContext struct {
	manifest           manifest
	groupCount         int
	enabledGroupCount  int
	userCount          int
	purposeDefinitions map[string]purposeDefinition
	elementByKey       map[string]elementDefinition
}

type consentRequest struct {
	Type           string                  `json:"type"`
	ExpirationTime int64                   `json:"expirationTime"`
	Attributes     map[string]string       `json:"attributes"`
	Purposes       []consentPurposeRequest `json:"purposes"`
	Authorizations []authorizationRequest  `json:"authorizations,omitempty"`
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

type authorizationRequest struct {
	UserID    string      `json:"userId"`
	Type      string      `json:"type"`
	Status    string      `json:"status"`
	Resources interface{} `json:"resources"`
}

type consentResponse struct {
	ID string `json:"id"`
}

type revokeRequest struct {
	ActionBy         string `json:"actionBy"`
	RevocationReason string `json:"revocationReason"`
}

type seedSample struct {
	ConsentID   string `json:"consentId"`
	GroupID     string `json:"groupId"`
	UserID      string `json:"userId"`
	ConsentType string `json:"consentType"`
	Status      string `json:"status"`
}

type consentRecipe struct {
	targetStatus string
	groupIndex   int
	groupID      string
	consentType  string
	userID       string
	request      consentRequest
}

type apiClient struct {
	baseURL string
	orgID   string
	http    *http.Client
}

type weightedChoice struct {
	Name   string
	Weight int
}

func main() {
	count := flag.Int("count", 1000000, "number of consents to create")
	concurrency := flag.Int("concurrency", 20, "number of concurrent create workers")
	templatesPath := flag.String("templates", "tests/performance/seed/templates.json", "template metadata JSON path")
	baseURL := flag.String("base-url", "", "API base URL (defaults to manifest baseUrl or BASE_URL)")
	orgID := flag.String("org-id", "", "organization ID (defaults to manifest orgId or PERF_ORG_ID)")
	sampleSize := flag.Int("sample-size", 400, "number of seed samples to persist back into the manifest")
	flag.Parse()

	if *count < 0 {
		fail("count must be non-negative")
	}
	if *concurrency <= 0 {
		fail("concurrency must be greater than zero")
	}
	if *sampleSize < 0 {
		fail("sample-size must be non-negative")
	}

	m, err := readManifest(*templatesPath)
	if err != nil {
		fail("read templates: %v", err)
	}

	if *baseURL == "" {
		*baseURL = envOrDefault("BASE_URL", m.BaseURL)
	}
	if *baseURL == "" {
		*baseURL = "http://localhost:9091"
	}
	if *orgID == "" {
		*orgID = envOrDefault("PERF_ORG_ID", m.OrgID)
	}
	if *orgID == "" {
		*orgID = "openfgc-perf-org"
	}
	m.BaseURL = strings.TrimRight(*baseURL, "/")
	m.OrgID = *orgID

	ctx, err := newSeedContext(m, *count)
	if err != nil {
		fail("load manifest metadata: %v", err)
	}

	client := &apiClient{
		baseURL: m.BaseURL,
		orgID:   m.OrgID,
		http:    &http.Client{Timeout: 60 * time.Second},
	}
	if err := client.checkHealth(); err != nil {
		fail("health check failed: %v", err)
	}

	fmt.Printf("Seeding %d consents through %s with %d workers across %d groups and %d users\n",
		*count, client.baseURL, *concurrency, ctx.groupCount, ctx.userCount)

	start := time.Now()
	recipes := make(chan consentRecipe, *concurrency*2)
	errCh := make(chan error, 1)
	ctxRun, cancel := context.WithCancel(context.Background())
	defer cancel()

	var completed atomic.Int64
	var progressPrinted atomic.Int64
	collector := newSampleCollector(*sampleSize)

	var wg sync.WaitGroup
	for worker := 0; worker < *concurrency; worker++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for recipe := range recipes {
				consentID, err := client.createConsent(ctxRun, recipe)
				if err != nil {
					select {
					case errCh <- err:
					default:
					}
					cancel()
					return
				}
				collector.add(seedSample{
					ConsentID:   consentID,
					GroupID:     recipe.groupID,
					UserID:      recipe.userID,
					ConsentType: recipe.consentType,
					Status:      recipe.targetStatus,
				})
				done := completed.Add(1)
				if done%100 == 0 || done == int64(*count) {
					last := progressPrinted.Load()
					if done > last && progressPrinted.CompareAndSwap(last, done) {
						fmt.Printf("Seeded %d/%d consents\n", done, *count)
					}
				}
			}
		}()
	}

	go func() {
		defer close(recipes)
		now := time.Now().UnixMilli()
		for n := int64(1); n <= int64(*count); n++ {
			select {
			case <-ctxRun.Done():
				return
			case recipes <- buildConsentRecipe(ctx, n, now):
			}
		}
	}()

	wg.Wait()
	select {
	case err := <-errCh:
		fail("seed via api: %v", err)
	default:
	}

	m.SeedMode = "api"
	m.SeededCount = *count
	m.SeedSamples = collector.samples()
	if err := writeManifest(*templatesPath, m); err != nil {
		fail("write updated manifest: %v", err)
	}

	fmt.Printf("✓ Seeded %d consents via API in %s\n", *count, time.Since(start).Round(time.Second))
}

func readManifest(path string) (manifest, error) {
	file, err := os.Open(path)
	if err != nil {
		return manifest{}, err
	}
	defer file.Close()

	var m manifest
	if err := json.NewDecoder(file).Decode(&m); err != nil {
		return manifest{}, err
	}
	if m.OrgID == "" || m.GroupModel.Prefix == "" || len(m.ConsentTypes) == 0 || len(m.Purposes) == 0 || len(m.Elements) == 0 {
		return manifest{}, fmt.Errorf("manifest is missing required fields")
	}
	if m.GroupModel.MinGroupCount <= 0 {
		m.GroupModel.MinGroupCount = 100
	}
	if m.GroupModel.MaxGroupCount <= 0 {
		m.GroupModel.MaxGroupCount = 1000
	}
	if m.GroupModel.PurposeEnabledGroupCount <= 0 {
		m.GroupModel.PurposeEnabledGroupCount = 120
	}
	return m, nil
}

func writeManifest(path string, m manifest) error {
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(data, '\n'), 0o644)
}

func newSeedContext(m manifest, consentCount int) (*seedContext, error) {
	groupCount := consentCount / 1000
	if groupCount < m.GroupModel.MinGroupCount {
		groupCount = m.GroupModel.MinGroupCount
	}
	if groupCount > m.GroupModel.MaxGroupCount {
		groupCount = m.GroupModel.MaxGroupCount
	}
	enabledGroupCount := m.GroupModel.PurposeEnabledGroupCount
	if enabledGroupCount > groupCount {
		enabledGroupCount = groupCount
	}
	userCount := int(math.Round(float64(consentCount) * m.Distributions.UserPopulationRatio))
	if userCount < groupCount*20 {
		userCount = groupCount * 20
	}

	purposeDefinitions := make(map[string]purposeDefinition, len(m.Purposes))
	for _, purpose := range m.Purposes {
		purposeDefinitions[purpose.Name] = purpose
	}
	if err := validateConsentTypeCoverage(m, purposeDefinitions, groupCount, enabledGroupCount); err != nil {
		return nil, err
	}

	elementByKey := make(map[string]elementDefinition, len(m.Elements))
	for _, element := range m.Elements {
		elementByKey[elementKey(element.Name, element.Namespace)] = element
	}

	return &seedContext{
		manifest:           m,
		groupCount:         groupCount,
		enabledGroupCount:  enabledGroupCount,
		userCount:          userCount,
		purposeDefinitions: purposeDefinitions,
		elementByKey:       elementByKey,
	}, nil
}

func validateConsentTypeCoverage(m manifest, purposeDefinitions map[string]purposeDefinition, groupCount int, enabledGroupCount int) error {
	if enabledGroupCount >= groupCount {
		return nil
	}
	impossibleTypes := make([]string, 0)
	for _, consentType := range m.ConsentTypes {
		hasOrgScopedPurpose := false
		for _, purposeName := range consentType.PurposeNames {
			purpose, ok := purposeDefinitions[purposeName]
			if ok && purpose.Scope == "org" {
				hasOrgScopedPurpose = true
				break
			}
		}
		if !hasOrgScopedPurpose {
			impossibleTypes = append(impossibleTypes, consentType.Name)
		}
	}
	if len(impossibleTypes) == 0 {
		return nil
	}
	sort.Strings(impossibleTypes)
	return fmt.Errorf(
		"manifest covers only %d purpose-enabled groups, but seed requires %d groups; consent types without org-scoped fallback: %s",
		enabledGroupCount,
		groupCount,
		strings.Join(impossibleTypes, ", "),
	)
}

func buildConsentRecipe(ctx *seedContext, n int64, now int64) consentRecipe {
	groupIndex := groupIndexFor(n, ctx.groupCount)
	groupID := groupIDFor(ctx.manifest.GroupModel.Prefix, groupIndex)
	consentType := consentTypeFor(ctx.manifest, n)
	targetStatus := statusFor(ctx.manifest, n)
	userID := selectUserID(ctx, n, consentType, groupIndex, 0)
	expirationTime := expirationFor(targetStatus, n, now)

	purposeNames := selectPurposeNames(ctx, n, consentType, groupID, groupIndex)
	purposes := make([]consentPurposeRequest, 0, len(purposeNames))
	for _, purposeName := range purposeNames {
		definition := ctx.purposeDefinitions[purposeName]
		elements := make([]consentElementRequest, 0, len(definition.Elements))
		for _, purposeElement := range definition.Elements {
			elementDef, ok := ctx.elementByKey[elementKey(purposeElement.Name, purposeElement.Namespace)]
			if !ok {
				continue
			}
			elements = append(elements, consentElementRequest{
				Name:      purposeElement.Name,
				Namespace: purposeElement.Namespace,
				Approved:  targetStatus != "CREATED",
				Value:     elementValue(consentShape{index: n, groupIndex: groupIndex, groupID: groupID, consentType: consentType, attributes: buildAttributes(ctx, n, consentType, groupIndex)}, elementDef),
			})
		}
		purposes = append(purposes, consentPurposeRequest{Name: purposeName, Elements: elements})
	}

	auths := make([]authorizationRequest, 0)
	switch targetStatus {
	case "ACTIVE", "EXPIRED", "REVOKED":
		count := authCountFor(ctx.manifest, n)
		usedUsers := make(map[string]bool, count)
		for slot := 0; slot < count; slot++ {
			slotUserID := selectUserID(ctx, n, consentType, groupIndex, slot)
			for attempt := 0; usedUsers[slotUserID] && attempt < count+8; attempt++ {
				slotUserID = selectUserID(ctx, n+int64(attempt+1)*7919, consentType, groupIndex, slot+attempt+1)
			}
			if usedUsers[slotUserID] {
				slotUserID = nextUnusedUserID(ctx, n, slot, usedUsers)
			}
			usedUsers[slotUserID] = true
			if slot == 0 {
				userID = slotUserID
			}
			auths = append(auths, authorizationRequest{
				UserID:    slotUserID,
				Type:      authTypeFor(consentType, slot),
				Status:    "APPROVED",
				Resources: resourcePayload(consentType, groupIndex, n, slot),
			})
		}
	case "CREATED":
		userID = selectUserID(ctx, n, consentType, groupIndex, 0)
		auths = append(auths, authorizationRequest{
			UserID:    userID,
			Type:      authTypeFor(consentType, 0),
			Status:    "CREATED",
			Resources: resourcePayload(consentType, groupIndex, n, 0),
		})
	}

	return consentRecipe{
		targetStatus: targetStatus,
		groupIndex:   groupIndex,
		groupID:      groupID,
		consentType:  consentType,
		userID:       userID,
		request: consentRequest{
			Type:           consentType,
			ExpirationTime: expirationTime,
			Attributes:     buildAttributes(ctx, n, consentType, groupIndex),
			Purposes:       purposes,
			Authorizations: auths,
		},
	}
}

func (c *apiClient) checkHealth() error {
	req, err := http.NewRequest(http.MethodGet, c.baseURL+"/health", nil)
	if err != nil {
		return err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("GET /health failed with HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}

func (c *apiClient) createConsent(ctx context.Context, recipe consentRecipe) (string, error) {
	var response consentResponse
	if err := c.request(ctx, http.MethodPost, "/api/v1/consents", map[string]string{
		"org-id":   c.orgID,
		"group-id": recipe.groupID,
	}, recipe.request, &response); err != nil {
		return "", err
	}

	if recipe.targetStatus == "REVOKED" {
		if err := c.request(ctx, http.MethodPost, "/api/v1/consents/"+response.ID+"/revoke", map[string]string{
			"org-id": c.orgID,
		}, revokeRequest{
			ActionBy:         "performance-seed-api",
			RevocationReason: "performance seed revoked sample",
		}, nil); err != nil {
			return "", err
		}
	}
	return response.ID, nil
}

func (c *apiClient) request(ctx context.Context, method string, path string, headers map[string]string, body any, out any) error {
	var payload io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return err
		}
		payload = bytes.NewReader(data)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, payload)
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

type sampleCollector struct {
	limit int
	mu    sync.Mutex
	all   []seedSample
	byKey map[string]int
}

func newSampleCollector(limit int) *sampleCollector {
	return &sampleCollector{
		limit: limit,
		byKey: make(map[string]int),
	}
}

func (c *sampleCollector) add(sample seedSample) {
	if c.limit == 0 {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()

	key := sample.Status
	count := c.byKey[key]
	perStatusLimit := maxInt(1, c.limit/4)
	if count < perStatusLimit {
		c.all = append(c.all, sample)
		c.byKey[key] = count + 1
		return
	}
	if len(c.all) < c.limit {
		c.all = append(c.all, sample)
	}
}

func (c *sampleCollector) samples() []seedSample {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := make([]seedSample, len(c.all))
	copy(out, c.all)
	return out
}

func consentTypeFor(m manifest, n int64) string {
	weights := make([]weightedChoice, 0, len(m.ConsentTypes))
	for _, consentType := range m.ConsentTypes {
		weights = append(weights, weightedChoice{Name: consentType.Name, Weight: consentType.Weight})
	}
	return chooseWeighted(weights, n, 11)
}

func statusFor(m manifest, n int64) string {
	weights := make([]weightedChoice, 0, len(m.Distributions.Status))
	for name, weight := range m.Distributions.Status {
		weights = append(weights, weightedChoice{Name: name, Weight: weight})
	}
	sort.Slice(weights, func(i, j int) bool { return weights[i].Name < weights[j].Name })
	return chooseWeighted(weights, n, 23)
}

func purposeCountFor(m manifest, n int64) int {
	weights := make([]weightedChoice, 0, len(m.Distributions.PurposeCount))
	for name, weight := range m.Distributions.PurposeCount {
		weights = append(weights, weightedChoice{Name: name, Weight: weight})
	}
	sort.Slice(weights, func(i, j int) bool { return weights[i].Name < weights[j].Name })
	value, _ := strconv.Atoi(chooseWeighted(weights, n, 31))
	if value < 1 {
		return 1
	}
	return value
}

func authCountFor(m manifest, n int64) int {
	weights := make([]weightedChoice, 0, len(m.Distributions.AuthorizationCount))
	for name, weight := range m.Distributions.AuthorizationCount {
		weights = append(weights, weightedChoice{Name: name, Weight: weight})
	}
	sort.Slice(weights, func(i, j int) bool { return weights[i].Name < weights[j].Name })
	value, _ := strconv.Atoi(chooseWeighted(weights, n, 37))
	if value < 1 {
		return 1
	}
	return value
}

func groupIndexFor(n int64, groupCount int) int {
	if groupCount <= 1 {
		return 1
	}
	topCount := maxInt(1, int(math.Round(float64(groupCount)*0.05)))
	midCount := maxInt(1, int(math.Round(float64(groupCount)*0.20)))
	if topCount+midCount >= groupCount {
		midCount = maxInt(1, groupCount-topCount-1)
	}
	tailCount := maxInt(1, groupCount-topCount-midCount)
	selector := hashModulo(n, 41, 100)
	switch {
	case selector < 40:
		return 1 + hashModulo(n, 43, topCount)
	case selector < 75:
		return 1 + topCount + hashModulo(n, 47, midCount)
	default:
		return 1 + topCount + midCount + hashModulo(n, 53, tailCount)
	}
}

func groupIDFor(prefix string, index int) string {
	return fmt.Sprintf("%s-%04d", prefix, index)
}

func expirationFor(status string, n int64, now int64) int64 {
	switch status {
	case "EXPIRED":
		return now - int64(hashModulo(n, 61, 45*24*60*60*1000)+24*60*60*1000)
	case "CREATED":
		return now + int64(hashModulo(n, 67, 14*24*60*60*1000)+2*24*60*60*1000)
	case "REVOKED":
		return now + int64(hashModulo(n, 71, 90*24*60*60*1000)+24*60*60*1000)
	default:
		return now + int64(hashModulo(n, 73, 365*24*60*60*1000)+7*24*60*60*1000)
	}
}

func selectPurposeNames(ctx *seedContext, n int64, consentType string, groupID string, groupIndex int) []string {
	var candidateNames []string
	for _, definition := range ctx.manifest.ConsentTypes {
		if definition.Name == consentType {
			for _, purposeName := range definition.PurposeNames {
				purpose := ctx.purposeDefinitions[purposeName]
				if purpose.Scope == "org" || groupIndex <= ctx.enabledGroupCount {
					candidateNames = append(candidateNames, purposeName)
				}
			}
			break
		}
	}
	if len(candidateNames) == 0 {
		return []string{ctx.manifest.CreateDefaults.PurposeName}
	}

	targetCount := purposeCountFor(ctx.manifest, n)
	if targetCount > len(candidateNames) {
		targetCount = len(candidateNames)
	}

	selectedNames := make([]string, 0, targetCount)
	used := make(map[string]bool, targetCount)
	for offset := int64(0); len(selectedNames) < targetCount && offset < int64(len(candidateNames)*3); offset++ {
		name := candidateNames[hashModulo(n+offset, 79+uint64(offset), len(candidateNames))]
		if used[name] {
			continue
		}
		used[name] = true
		selectedNames = append(selectedNames, name)
	}
	return selectedNames
}

type consentShape struct {
	index       int64
	groupIndex  int
	groupID     string
	consentType string
	attributes  map[string]string
}

func buildAttributes(ctx *seedContext, n int64, consentType string, groupIndex int) map[string]string {
	return map[string]string{
		"segment":       attributeValue(ctx.manifest.Attributes["segment"], n, 101),
		"channel":       channelValue(ctx, consentType, n),
		"region":        attributeValue(ctx.manifest.Attributes["region"], n+int64(groupIndex), 103),
		"customer_tier": customerTierValue(ctx, consentType, n),
		"product_line":  productLineValue(ctx, consentType, n),
		"service_plan":  servicePlanValue(ctx, consentType, n, groupIndex),
		"risk_band":     riskBandValue(ctx, consentType, n),
		"perf_index":    strconv.FormatInt(n, 10),
	}
}

func nextUnusedUserID(ctx *seedContext, n int64, slot int, usedUsers map[string]bool) string {
	start := hashModulo(n+int64(slot), 997, ctx.userCount)
	for offset := 0; offset < ctx.userCount; offset++ {
		userID := fmt.Sprintf("user-%09d", ((start+offset)%ctx.userCount)+1)
		if !usedUsers[userID] {
			return userID
		}
	}
	return fmt.Sprintf("user-%09d", start+1)
}

func selectUserID(ctx *seedContext, n int64, consentType string, groupIndex int, slot int) string {
	topUsers := alignedBucketSize(ctx.userCount, ctx.groupCount, 0.05)
	midUsers := alignedBucketSize(ctx.userCount, ctx.groupCount, 0.20)
	if topUsers+midUsers >= ctx.userCount {
		midUsers = maxInt(ctx.groupCount, ctx.userCount-topUsers-ctx.groupCount)
	}
	tailUsers := maxInt(ctx.groupCount, ctx.userCount-topUsers-midUsers)
	selector := hashModulo(n+int64(slot), 131+uint64(slot*3), 100)
	bucketStart := 0
	bucketSize := topUsers
	switch {
	case selector < 45:
		bucketStart = 0
		bucketSize = topUsers
	case selector < 80:
		bucketStart = topUsers
		bucketSize = midUsers
	default:
		bucketStart = topUsers + midUsers
		bucketSize = tailUsers
	}

	userIndex := bucketAlignedIndex(bucketStart, bucketSize, ctx.groupCount, groupIndex-1, hashModulo(n, 149+uint64(slot), maxInt(1, bucketSize/ctx.groupCount)))
	if consentType == "profile-sharing" && selector < 45 {
		userIndex = bucketAlignedIndex(bucketStart, bucketSize, ctx.groupCount, hashModulo(n, 151+uint64(slot), ctx.groupCount), hashModulo(n, 157+uint64(slot), maxInt(1, bucketSize/ctx.groupCount)))
	}
	return fmt.Sprintf("user-%09d", userIndex+1)
}

func authTypeFor(consentType string, slot int) string {
	if slot == 0 {
		return "primary"
	}
	if consentType == "payments" {
		return "approver"
	}
	return "delegate"
}

func resourcePayload(consentType string, groupIndex int, n int64, slot int) []string {
	switch consentType {
	case "payments":
		return []string{
			fmt.Sprintf("payment:PAY-%09d", n),
			fmt.Sprintf("account:ACC-%04d-%09d", groupIndex, n+int64(slot)),
		}
	case "profile-sharing":
		return []string{
			fmt.Sprintf("profile:PROF-%09d", n),
			fmt.Sprintf("group:GRP-%04d", groupIndex),
		}
	default:
		return []string{
			fmt.Sprintf("account:ACC-%04d-%09d", groupIndex, n),
			fmt.Sprintf("iban:IBAN-%09d", n),
		}
	}
}

func channelValue(ctx *seedContext, consentType string, n int64) string {
	values := ctx.manifest.Attributes["channel"]
	if consentType == "payments" {
		return values[chooseIndexWithBias(n, 171, []int{1, 0, 3, 2, 4}, len(values))]
	}
	return values[hashModulo(n, 173, len(values))]
}

func customerTierValue(ctx *seedContext, consentType string, n int64) string {
	values := ctx.manifest.Attributes["customer_tier"]
	if consentType == "payments" {
		return values[chooseIndexWithBias(n, 181, []int{2, 3, 1, 0}, len(values))]
	}
	return values[chooseIndexWithBias(n, 183, []int{1, 2, 0, 3}, len(values))]
}

func productLineValue(ctx *seedContext, consentType string, n int64) string {
	values := ctx.manifest.Attributes["product_line"]
	switch consentType {
	case "payments":
		return values[chooseIndexWithBias(n, 191, []int{5, 10, 11, 6, 1, 0, 2, 3, 4, 7, 8, 9}, len(values))]
	case "profile-sharing":
		return values[chooseIndexWithBias(n, 193, []int{7, 8, 9, 11, 0, 1, 2, 3, 4, 5, 6, 10}, len(values))]
	default:
		return values[chooseIndexWithBias(n, 197, []int{0, 1, 2, 3, 4, 6, 5, 7, 8, 9, 10, 11}, len(values))]
	}
}

func servicePlanValue(ctx *seedContext, consentType string, n int64, groupIndex int) string {
	values := ctx.manifest.Attributes["service_plan"]
	index := hashModulo(n+int64(groupIndex), 199, len(values))
	if consentType == "payments" && index < len(values)-1 {
		index = (index + 2) % len(values)
	}
	return values[index]
}

func riskBandValue(ctx *seedContext, consentType string, n int64) string {
	values := ctx.manifest.Attributes["risk_band"]
	if consentType == "payments" {
		return values[chooseIndexWithBias(n, 211, []int{2, 3, 4, 1, 0}, len(values))]
	}
	return values[chooseIndexWithBias(n, 223, []int{0, 1, 2, 3, 4}, len(values))]
}

func attributeValue(values []string, n int64, salt uint64) string {
	return values[hashModulo(n, salt, len(values))]
}

func elementValue(shape consentShape, element elementDefinition) any {
	switch element.Type {
	case "json":
		return jsonElementValue(shape, element)
	default:
		return basicElementValue(shape, element)
	}
}

func basicElementValue(shape consentShape, element elementDefinition) string {
	switch element.Name {
	case "full-name":
		return fmt.Sprintf("User %09d", shape.index)
	case "email":
		return fmt.Sprintf("user-%09d@example.com", shape.index)
	case "phone":
		return fmt.Sprintf("+94%09d", 700000000+shape.index%100000000)
	case "account-id":
		return fmt.Sprintf("ACC-%04d-%09d", shape.groupIndex, shape.index)
	case "iban":
		return fmt.Sprintf("LK%02dBANK%012d", (shape.groupIndex%89)+10, shape.index%1000000000000)
	case "account-type":
		types := []string{"savings", "current", "salary", "wallet"}
		return types[int(shape.index)%len(types)]
	case "balance-tier":
		tiers := []string{"low", "mid", "high", "ultra"}
		return tiers[int(shape.index)%len(tiers)]
	case "payee-id":
		return fmt.Sprintf("PAYEE-%09d", shape.index%250000)
	case "payment-limit":
		return fmt.Sprintf("%d", 5000+(shape.index%20)*5000)
	case "beneficiary-id":
		return fmt.Sprintf("BEN-%09d", shape.index%180000)
	case "transaction-reference":
		return fmt.Sprintf("TRX-%010d", shape.index%10000000000)
	case "marketing-opt-in":
		if shape.attributes["segment"] == "premium" || shape.attributes["segment"] == "staff" {
			return "true"
		}
		return "false"
	default:
		return fmt.Sprintf("%s-%09d", strings.ToUpper(strings.ReplaceAll(element.Name, "-", "_")), shape.index)
	}
}

func jsonElementValue(shape consentShape, element elementDefinition) map[string]any {
	switch element.Name {
	case "address-json":
		return map[string]any{"line1": fmt.Sprintf("%d Market Street", shape.index%1000), "city": fmt.Sprintf("city-%02d", shape.groupIndex%25), "country": "LK"}
	case "preferences-json":
		return map[string]any{
			"alerts":   hashModulo(shape.index, 241, 2) == 0,
			"theme":    []string{"light", "dark", "system"}[hashModulo(shape.index, 239, 3)],
			"language": "en",
		}
	case "demographics-json":
		return map[string]any{
			"ageBand":    []string{"18-24", "25-34", "35-44", "45-54", "55+"}[hashModulo(shape.index, 251, 5)],
			"employment": []string{"student", "salaried", "self-employed", "retired"}[hashModulo(shape.index, 257, 4)],
		}
	default:
		return map[string]any{"value": "unknown"}
	}
}

func alignedBucketSize(total int, groupCount int, ratio float64) int {
	size := int(math.Round(float64(total) * ratio))
	if size < groupCount {
		size = groupCount
	}
	size -= size % groupCount
	if size == 0 {
		size = groupCount
	}
	return size
}

func bucketAlignedIndex(bucketStart int, bucketSize int, groupCount int, groupSlot int, offset int) int {
	span := maxInt(1, bucketSize/groupCount)
	return bucketStart + groupSlot + groupCount*(offset%span)
}

func chooseIndexWithBias(n int64, salt uint64, order []int, length int) int {
	if len(order) == 0 || length == 0 {
		return 0
	}
	index := hashModulo(n, salt, len(order))
	value := order[index]
	if value >= length {
		return value % length
	}
	return value
}

func chooseWeighted(choices []weightedChoice, n int64, salt uint64) string {
	total := 0
	for _, choice := range choices {
		total += choice.Weight
	}
	if total == 0 {
		return choices[0].Name
	}
	pick := hashModulo(n, salt, total)
	running := 0
	for _, choice := range choices {
		running += choice.Weight
		if pick < running {
			return choice.Name
		}
	}
	return choices[len(choices)-1].Name
}

func hashModulo(n int64, salt uint64, modulo int) int {
	if modulo <= 1 {
		return 0
	}
	x := uint64(n) + salt*0x9e3779b97f4a7c15
	x ^= x >> 33
	x *= 0xff51afd7ed558ccd
	x ^= x >> 33
	x *= 0xc4ceb9fe1a85ec53
	x ^= x >> 33
	return int(x % uint64(modulo))
}

func elementKey(name string, namespace string) string {
	return name + "|" + namespace
}

func envOrDefault(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func maxInt(a int, b int) int {
	if a > b {
		return a
	}
	return b
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "error: "+format+"\n", args...)
	os.Exit(1)
}
