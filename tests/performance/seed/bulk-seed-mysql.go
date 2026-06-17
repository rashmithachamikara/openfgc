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
	"math"
	"os"
	"os/exec"
	"sort"
	"strconv"
	"strings"
	"time"
)

type manifest struct {
	ManifestVersion int                     `json:"manifestVersion"`
	OrgID           string                  `json:"orgId"`
	GroupModel      groupModel              `json:"groupModel"`
	Distributions   distributions           `json:"distributions"`
	ConsentTypes    []consentTypeDefinition `json:"consentTypes"`
	Attributes      map[string][]string     `json:"attributes"`
	Elements        []elementDefinition     `json:"elements"`
	Purposes        []purposeDefinition     `json:"purposes"`
	CreateDefaults  createDefaults          `json:"createDefaults"`
	SearchSamples   map[string][]string     `json:"searchSamples"`
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
	Name      string                `json:"name"`
	Scope     string                `json:"scope"`
	Types     []string              `json:"types"`
	Elements  []purposeElement      `json:"elements"`
	Instances []purposeInstanceInfo `json:"instances"`
}

type purposeElement struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Mandatory bool   `json:"mandatory"`
}

type purposeInstanceInfo struct {
	GroupID string `json:"groupId"`
	ID      string `json:"id"`
	Version int    `json:"version"`
}

type createDefaults struct {
	ConsentType      string `json:"consentType"`
	PurposeName      string `json:"purposeName"`
	ElementName      string `json:"elementName"`
	ElementNamespace string `json:"elementNamespace"`
}

type dbConfig struct {
	host     string
	port     string
	user     string
	password string
	database string
}

type elementVersion struct {
	VersionID string
	ElementID string
	Name      string
	Namespace string
	Type      string
	Version   int
}

type purposeVersion struct {
	VersionID string
	PurposeID string
	Name      string
	GroupID   string
	Version   int
}

type seedContext struct {
	manifest              manifest
	db                    dbConfig
	groupCount            int
	enabledGroupCount     int
	userCount             int
	elementVersions       map[string]elementVersion
	elementVersionsByName map[string]elementVersion
	purposeDefinitions    map[string]purposeDefinition
	purposeVersionByGroup map[string]map[string]purposeVersion
}

type authResourceRow struct {
	authID      string
	userID      string
	authType    string
	authStatus  string
	updatedTime int64
	resources   string
}

type consentShape struct {
	index         int64
	consentID     string
	groupIndex    int
	groupID       string
	consentType   string
	status        string
	createdTime   int64
	expiration    int64
	attributes    map[string]string
	authResources []authResourceRow
	purposes      []purposeVersion
}

func main() {
	count := flag.Int("count", 1000000, "number of consent rows to create")
	batchSize := flag.Int("batch-size", 5000, "number of consents per SQL batch")
	templatesPath := flag.String("templates", "tests/performance/seed/templates.json", "template metadata JSON path")
	includeAudit := flag.Bool("include-audit", true, "insert one status audit row per consent")
	reset := flag.Bool("reset", true, "delete existing performance consent rows for the template org before seeding")
	flag.Parse()

	if *count < 0 {
		fail("count must be non-negative")
	}
	if *batchSize <= 0 {
		fail("batch-size must be greater than zero")
	}

	manifest, err := readManifest(*templatesPath)
	if err != nil {
		fail("read templates: %v", err)
	}

	db := loadDBConfig()
	ctx, err := newSeedContext(db, manifest, *count)
	if err != nil {
		fail("load manifest metadata: %v", err)
	}

	if *reset {
		fmt.Printf("Resetting existing performance consent rows for org %s\n", manifest.OrgID)
		if err := runSQL(db, fmt.Sprintf("DELETE FROM CONSENT WHERE ORG_ID = %s;", sqlString(manifest.OrgID))); err != nil {
			fail("reset existing rows: %v", err)
		}
	}

	fmt.Printf("Seeding %d consents in batches of %d across %d groups and %d users\n", *count, *batchSize, ctx.groupCount, ctx.userCount)
	start := time.Now()
	for offset := 0; offset < *count; offset += *batchSize {
		limit := *batchSize
		if remaining := *count - offset; remaining < limit {
			limit = remaining
		}
		fmt.Printf("Building batch %d-%d...\n", offset+1, offset+limit)
		if err := insertBatch(db, ctx, int64(offset+1), limit, *includeAudit); err != nil {
			fail("insert batch starting at %d: %v", offset+1, err)
		}
		fmt.Printf("Seeded %d/%d consents\n", offset+limit, *count)
	}
	fmt.Printf("✓ Seeded %d consents in %s\n", *count, time.Since(start).Round(time.Second))
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

func loadDBConfig() dbConfig {
	return dbConfig{
		host:     envOrDefault("PERF_DB_HOST", "127.0.0.1"),
		port:     envOrDefault("PERF_DB_PORT", "3306"),
		user:     envOrDefault("PERF_DB_USER", "root"),
		password: envOrDefault("PERF_DB_PASSWORD", "password"),
		database: envOrDefault("PERF_DB_NAME", "consent_mgt_perf"),
	}
}

func newSeedContext(db dbConfig, m manifest, consentCount int) (*seedContext, error) {
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

	elementVersions, err := loadElementVersions(db, m.OrgID)
	if err != nil {
		return nil, err
	}
	elementVersionsByName := make(map[string]elementVersion, len(elementVersions))
	for _, version := range elementVersions {
		elementVersionsByName[elementNameVersionKey(version.Name, version.Namespace, version.Version)] = version
	}
	purposeDefinitions := make(map[string]purposeDefinition, len(m.Purposes))
	for _, purpose := range m.Purposes {
		purposeDefinitions[purpose.Name] = purpose
	}
	if err := validateConsentTypeCoverage(m, purposeDefinitions, groupCount, enabledGroupCount); err != nil {
		return nil, err
	}

	purposeVersionsByID, purposeVersionsByName, err := loadPurposeVersions(db, m.OrgID)
	if err != nil {
		return nil, err
	}
	purposeVersionByGroup := make(map[string]map[string]purposeVersion, len(m.Purposes))
	for _, purpose := range m.Purposes {
		groupMap := make(map[string]purposeVersion, len(purpose.Instances))
		for _, instance := range purpose.Instances {
			version, ok := purposeVersionsByID[purposeManifestVersionKey(instance.ID, instance.Version)]
			if !ok {
				version, ok = purposeVersionsByName[purposeVersionKey(purpose.Name, instance.GroupID, instance.Version)]
			}
			if !ok {
				return nil, fmt.Errorf(
					"purpose version not found for %s / %s / v%d (manifest purpose id %s)",
					purpose.Name,
					instance.GroupID,
					instance.Version,
					instance.ID,
				)
			}
			groupMap[instance.GroupID] = version
		}
		purposeVersionByGroup[purpose.Name] = groupMap
	}

	return &seedContext{
		manifest:              m,
		db:                    db,
		groupCount:            groupCount,
		enabledGroupCount:     enabledGroupCount,
		userCount:             userCount,
		elementVersions:       elementVersions,
		elementVersionsByName: elementVersionsByName,
		purposeDefinitions:    purposeDefinitions,
		purposeVersionByGroup: purposeVersionByGroup,
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

func loadElementVersions(db dbConfig, orgID string) (map[string]elementVersion, error) {
	rows, err := queryRows(db, fmt.Sprintf(
		"SELECT NAME, NAMESPACE, VERSION_ID, ID, TYPE, VERSION FROM ELEMENT WHERE ORG_ID = %s;",
		sqlString(orgID),
	))
	if err != nil {
		return nil, err
	}
	versions := make(map[string]elementVersion, len(rows))
	for _, row := range rows {
		if len(row) != 6 {
			continue
		}
		versionNum, _ := strconv.Atoi(row[5])
		key := elementManifestVersionKey(row[3], versionNum)
		versions[key] = elementVersion{
			Name:      row[0],
			Namespace: row[1],
			VersionID: row[2],
			ElementID: row[3],
			Type:      row[4],
			Version:   versionNum,
		}
	}
	return versions, nil
}

func loadPurposeVersions(db dbConfig, orgID string) (map[string]purposeVersion, map[string]purposeVersion, error) {
	rows, err := queryRows(db, fmt.Sprintf(
		"SELECT NAME, GROUP_ID, VERSION_ID, ID, VERSION FROM PURPOSE WHERE ORG_ID = %s;",
		sqlString(orgID),
	))
	if err != nil {
		return nil, nil, err
	}
	byID := make(map[string]purposeVersion, len(rows))
	byName := make(map[string]purposeVersion, len(rows))
	for _, row := range rows {
		if len(row) != 5 {
			continue
		}
		versionNum, _ := strconv.Atoi(row[4])
		version := purposeVersion{
			Name:      row[0],
			GroupID:   row[1],
			VersionID: row[2],
			PurposeID: row[3],
			Version:   versionNum,
		}
		byID[purposeManifestVersionKey(version.PurposeID, version.Version)] = version
		byName[purposeVersionKey(version.Name, version.GroupID, version.Version)] = version
	}
	return byID, byName, nil
}

func loadElementVersionByID(db dbConfig, orgID string, elementID string, version int) (elementVersion, error) {
	rows, err := queryRows(db, fmt.Sprintf(
		"SELECT NAME, NAMESPACE, VERSION_ID, ID, TYPE, VERSION FROM ELEMENT WHERE ORG_ID = %s AND ID = %s AND VERSION = %d LIMIT 1;",
		sqlString(orgID),
		sqlString(elementID),
		version,
	))
	if err != nil {
		return elementVersion{}, err
	}
	if len(rows) == 0 || len(rows[0]) != 6 {
		return elementVersion{}, fmt.Errorf("no matching ELEMENT row")
	}
	versionNum, _ := strconv.Atoi(rows[0][5])
	return elementVersion{
		Name:      rows[0][0],
		Namespace: rows[0][1],
		VersionID: rows[0][2],
		ElementID: rows[0][3],
		Type:      rows[0][4],
		Version:   versionNum,
	}, nil
}

func loadElementVersionByNameNamespaceVersion(db dbConfig, orgID string, name string, namespace string, version int) (elementVersion, error) {
	rows, err := queryRows(db, fmt.Sprintf(
		"SELECT NAME, NAMESPACE, VERSION_ID, ID, TYPE, VERSION FROM ELEMENT WHERE ORG_ID = %s AND NAME = %s AND NAMESPACE = %s AND VERSION = %d LIMIT 1;",
		sqlString(orgID),
		sqlString(name),
		sqlString(namespace),
		version,
	))
	if err != nil {
		return elementVersion{}, err
	}
	if len(rows) == 0 || len(rows[0]) != 6 {
		return elementVersion{}, fmt.Errorf("no matching ELEMENT row")
	}
	versionNum, _ := strconv.Atoi(rows[0][5])
	return elementVersion{
		Name:      rows[0][0],
		Namespace: rows[0][1],
		VersionID: rows[0][2],
		ElementID: rows[0][3],
		Type:      rows[0][4],
		Version:   versionNum,
	}, nil
}

func loadPurposeVersionByID(db dbConfig, orgID string, purposeID string, version int) (purposeVersion, error) {
	rows, err := queryRows(db, fmt.Sprintf(
		"SELECT NAME, GROUP_ID, VERSION_ID, ID, VERSION FROM PURPOSE WHERE ORG_ID = %s AND ID = %s AND VERSION = %d LIMIT 1;",
		sqlString(orgID),
		sqlString(purposeID),
		version,
	))
	if err != nil {
		return purposeVersion{}, err
	}
	if len(rows) == 0 || len(rows[0]) != 5 {
		return purposeVersion{}, fmt.Errorf("no matching PURPOSE row")
	}
	versionNum, _ := strconv.Atoi(rows[0][4])
	return purposeVersion{
		Name:      rows[0][0],
		GroupID:   rows[0][1],
		VersionID: rows[0][2],
		PurposeID: rows[0][3],
		Version:   versionNum,
	}, nil
}

func loadPurposeVersionByNameGroupVersion(db dbConfig, orgID string, purposeName string, groupID string, version int) (purposeVersion, error) {
	rows, err := queryRows(db, fmt.Sprintf(
		"SELECT NAME, GROUP_ID, VERSION_ID, ID, VERSION FROM PURPOSE WHERE ORG_ID = %s AND NAME = %s AND GROUP_ID = %s AND VERSION = %d LIMIT 1;",
		sqlString(orgID),
		sqlString(purposeName),
		sqlString(groupID),
		version,
	))
	if err != nil {
		return purposeVersion{}, err
	}
	if len(rows) == 0 || len(rows[0]) != 5 {
		return purposeVersion{}, fmt.Errorf("no matching PURPOSE row")
	}
	versionNum, _ := strconv.Atoi(rows[0][4])
	return purposeVersion{
		Name:      rows[0][0],
		GroupID:   rows[0][1],
		VersionID: rows[0][2],
		PurposeID: rows[0][3],
		Version:   versionNum,
	}, nil
}

func insertBatch(db dbConfig, ctx *seedContext, start int64, count int, includeAudit bool) error {
	now := time.Now().UnixMilli()

	var sql bytes.Buffer
	consents := make([]string, 0, count)
	authResources := make([]string, 0, count*2)
	attributes := make([]string, 0, count*8)
	purposeMappings := make([]string, 0, count*3)
	approvals := make([]string, 0, count*10)
	audits := make([]string, 0, count)

	for i := 0; i < count; i++ {
		n := start + int64(i)
		shape, err := buildConsentShape(ctx, n, now)
		if err != nil {
			return err
		}

		consents = append(consents, fmt.Sprintf("(%s,%d,%d,%s,%s,%s,NULL,%d,false,NULL,%s)",
			sqlString(shape.consentID),
			shape.createdTime,
			shape.createdTime,
			sqlString(shape.groupID),
			sqlString(shape.consentType),
			sqlString(shape.status),
			shape.expiration,
			sqlString(ctx.manifest.OrgID),
		))

		for _, auth := range shape.authResources {
			authResources = append(authResources, fmt.Sprintf("(%s,%s,%s,%s,%s,%d,%s,%s)",
				sqlString(auth.authID),
				sqlString(shape.consentID),
				sqlString(auth.authType),
				sqlString(auth.userID),
				sqlString(auth.authStatus),
				auth.updatedTime,
				sqlString(auth.resources),
				sqlString(ctx.manifest.OrgID),
			))
		}

		for key, value := range shape.attributes {
			attributes = append(attributes, fmt.Sprintf("(%s,%s,%s,%s)",
				sqlString(shape.consentID),
				sqlString(key),
				sqlString(value),
				sqlString(ctx.manifest.OrgID),
			))
		}

		for _, purposeVersion := range shape.purposes {
			purposeMappings = append(purposeMappings, fmt.Sprintf("(%s,%s,%s)",
				sqlString(shape.consentID),
				sqlString(purposeVersion.VersionID),
				sqlString(ctx.manifest.OrgID),
			))

			definition := ctx.purposeDefinitions[purposeVersion.Name]
			for _, purposeElement := range definition.Elements {
				elementDef, ok := findManifestElement(ctx.manifest.Elements, purposeElement.Name, purposeElement.Namespace)
				if !ok {
					return fmt.Errorf("manifest element not found for %s / %s", purposeElement.Name, purposeElement.Namespace)
				}
				elementVersion, ok := ctx.elementVersions[elementManifestVersionKey(elementDef.ID, elementDef.Version)]
				if !ok {
					elementVersion, ok = ctx.elementVersionsByName[elementNameVersionKey(elementDef.Name, elementDef.Namespace, elementDef.Version)]
				}
				if !ok {
					elementVersion, ok = loadElementVersionForManifest(ctx, elementDef)
				}
				if !ok {
					return fmt.Errorf(
						"element version not found for %s / %s / v%d (manifest element id %s)",
						purposeElement.Name,
						purposeElement.Namespace,
						elementDef.Version,
						elementDef.ID,
					)
				}
				approvals = append(approvals, fmt.Sprintf("(%s,%s,%s,%s,%s,%s)",
					sqlString(shape.consentID),
					sqlString(purposeVersion.VersionID),
					sqlString(elementVersion.VersionID),
					sqlBool(true),
					sqlString(elementValue(shape, elementVersion)),
					sqlString(ctx.manifest.OrgID),
				))
			}
		}

		if includeAudit {
			audits = append(audits, fmt.Sprintf("(%s,%s,%s,%d,%s,%s,%s,%s)",
				sqlString(deterministicID(0x50, n)),
				sqlString(shape.consentID),
				sqlString(shape.status),
				shape.createdTime,
				sqlString("performance seed"),
				sqlString("bulk-seed-mysql"),
				sqlString("CREATED"),
				sqlString(ctx.manifest.OrgID),
			))
		}
	}

	writeInsert(&sql, "CONSENT", "CONSENT_ID,CREATED_TIME,UPDATED_TIME,GROUP_ID,CONSENT_TYPE,CURRENT_STATUS,CONSENT_FREQUENCY,EXPIRATION_TIME,RECURRING_INDICATOR,DATA_ACCESS_VALIDITY_DURATION,ORG_ID", consents)
	writeInsert(&sql, "CONSENT_AUTH_RESOURCE", "AUTH_ID,CONSENT_ID,AUTH_TYPE,USER_ID,AUTH_STATUS,UPDATED_TIME,RESOURCES,ORG_ID", authResources)
	writeInsert(&sql, "CONSENT_ATTRIBUTE", "CONSENT_ID,ATT_KEY,ATT_VALUE,ORG_ID", attributes)
	writeInsert(&sql, "PURPOSE_CONSENT_MAPPING", "CONSENT_ID,PURPOSE_VERSION_ID,ORG_ID", purposeMappings)
	writeInsert(&sql, "CONSENT_ELEMENT_APPROVAL", "CONSENT_ID,PURPOSE_VERSION_ID,ELEMENT_VERSION_ID,APPROVED,VALUE,ORG_ID", approvals)
	if includeAudit {
		writeInsert(&sql, "CONSENT_STATUS_AUDIT", "STATUS_AUDIT_ID,CONSENT_ID,CURRENT_STATUS,ACTION_TIME,REASON,ACTION_BY,PREVIOUS_STATUS,ORG_ID", audits)
	}

	fmt.Printf("Writing batch %d-%d (%d consents, %d auth resources, %d attributes, %d purpose mappings, %d approvals, %d audits)...\n",
		start,
		start+int64(count)-1,
		len(consents),
		len(authResources),
		len(attributes),
		len(purposeMappings),
		len(approvals),
		len(audits),
	)
	return runSQL(db, sql.String())
}

func buildConsentShape(ctx *seedContext, n int64, now int64) (consentShape, error) {
	groupIndex := groupIndexFor(n, ctx.groupCount)
	groupID := groupIDFor(ctx.manifest.GroupModel.Prefix, groupIndex)
	consentType := consentTypeFor(ctx.manifest, n)
	status := statusFor(ctx.manifest, n)
	createdTime := now - int64(hashModulo(n, 3, 180*24*60*60*1000))
	expiration := expirationFor(status, n, now)
	attributes := buildAttributes(ctx, n, consentType, groupIndex)
	purposeVersions, err := selectPurposeVersions(ctx, n, consentType, groupID, groupIndex)
	if err != nil {
		return consentShape{}, err
	}
	authRows := buildAuthResources(ctx, n, consentType, status, groupIndex, createdTime)
	return consentShape{
		index:         n,
		consentID:     deterministicID(0xc0, n),
		groupIndex:    groupIndex,
		groupID:       groupID,
		consentType:   consentType,
		status:        status,
		createdTime:   createdTime,
		expiration:    expiration,
		attributes:    attributes,
		authResources: authRows,
		purposes:      purposeVersions,
	}, nil
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

func selectPurposeVersions(ctx *seedContext, n int64, consentType string, groupID string, groupIndex int) ([]purposeVersion, error) {
	var candidateNames []string
	for _, definition := range ctx.manifest.ConsentTypes {
		if definition.Name == consentType {
			for _, purposeName := range definition.PurposeNames {
				definition := ctx.purposeDefinitions[purposeName]
				if definition.Scope == "org" || groupIndex <= ctx.enabledGroupCount {
					candidateNames = append(candidateNames, purposeName)
				}
			}
			break
		}
	}
	if len(candidateNames) == 0 {
		return nil, fmt.Errorf("no purpose candidates found for consent type %s", consentType)
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

	purposeVersions := make([]purposeVersion, 0, len(selectedNames))
	for _, purposeName := range selectedNames {
		definition := ctx.purposeDefinitions[purposeName]
		ownerGroup := ctx.manifest.OrgID
		if definition.Scope == "group" {
			ownerGroup = groupID
		}
		version, ok := ctx.purposeVersionByGroup[purposeName][ownerGroup]
		if !ok {
			return nil, fmt.Errorf("missing purpose version for %s in group %s", purposeName, ownerGroup)
		}
		purposeVersions = append(purposeVersions, version)
	}
	return purposeVersions, nil
}

func buildAttributes(ctx *seedContext, n int64, consentType string, groupIndex int) map[string]string {
	attrs := map[string]string{
		"segment":       attributeValue(ctx.manifest.Attributes["segment"], n, 101),
		"channel":       channelValue(ctx, consentType, n),
		"region":        attributeValue(ctx.manifest.Attributes["region"], n+int64(groupIndex), 103),
		"customer_tier": customerTierValue(ctx, consentType, n),
		"product_line":  productLineValue(ctx, consentType, n),
		"service_plan":  servicePlanValue(ctx, consentType, n, groupIndex),
		"risk_band":     riskBandValue(ctx, consentType, n),
		"perf_index":    strconv.FormatInt(n, 10),
	}
	return attrs
}

func buildAuthResources(ctx *seedContext, n int64, consentType string, status string, groupIndex int, updatedTime int64) []authResourceRow {
	count := authCountFor(ctx.manifest, n)
	authStatus := authStatusFor(status)
	rows := make([]authResourceRow, 0, count)
	usedUsers := make(map[string]bool, count)
	for slot := 0; slot < count; slot++ {
		userID := selectUserID(ctx, n, consentType, groupIndex, slot)
		for attempt := 0; usedUsers[userID] && attempt < count+8; attempt++ {
			userID = selectUserID(ctx, n+int64(attempt+1)*7919, consentType, groupIndex, slot+attempt+1)
		}
		if usedUsers[userID] {
			userID = nextUnusedUserID(ctx, n, slot, usedUsers)
		}
		usedUsers[userID] = true
		rows = append(rows, authResourceRow{
			authID:      deterministicID(0xa0+uint32(slot), n),
			userID:      userID,
			authType:    authTypeFor(consentType, slot),
			authStatus:  authStatus,
			updatedTime: updatedTime,
			resources:   resourcePayload(consentType, groupIndex, n, slot),
		})
	}
	return rows
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

func authStatusFor(status string) string {
	switch status {
	case "CREATED":
		return "CREATED"
	case "EXPIRED":
		return "SYS_EXPIRED"
	case "REVOKED":
		return "SYS_REVOKED"
	default:
		return "APPROVED"
	}
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

func resourcePayload(consentType string, groupIndex int, n int64, slot int) string {
	switch consentType {
	case "payments":
		return fmt.Sprintf(`[{"type":"payment","id":"PAY-%09d"},{"type":"account","id":"ACC-%04d-%09d"}]`, n, groupIndex, n+int64(slot))
	case "profile-sharing":
		return fmt.Sprintf(`[{"type":"profile","id":"PROF-%09d"},{"type":"group","id":"GRP-%04d"}]`, n, groupIndex)
	default:
		return fmt.Sprintf(`[{"type":"account","id":"ACC-%04d-%09d"},{"type":"iban","id":"IBAN-%09d"}]`, groupIndex, n, n)
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

func elementValue(shape consentShape, element elementVersion) string {
	switch element.Type {
	case "json":
		return jsonElementValue(shape, element)
	default:
		return basicElementValue(shape, element)
	}
}

func basicElementValue(shape consentShape, element elementVersion) string {
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

func jsonElementValue(shape consentShape, element elementVersion) string {
	switch element.Name {
	case "address-json":
		return fmt.Sprintf(`{"line1":"%d Market Street","city":"city-%02d","country":"LK"}`, shape.index%1000, shape.groupIndex%25)
	case "preferences-json":
		return fmt.Sprintf(`{"alerts":%s,"theme":"%s","language":"en"}`,
			boolLiteral(hashModulo(shape.index, 241, 2) == 0),
			[]string{"light", "dark", "system"}[hashModulo(shape.index, 239, 3)],
		)
	case "demographics-json":
		return fmt.Sprintf(`{"ageBand":"%s","employment":"%s"}`,
			[]string{"18-24", "25-34", "35-44", "45-54", "55+"}[hashModulo(shape.index, 251, 5)],
			[]string{"student", "salaried", "self-employed", "retired"}[hashModulo(shape.index, 257, 4)],
		)
	default:
		return `{"value":"unknown"}`
	}
}

func writeInsert(sql *bytes.Buffer, table string, columns string, values []string) {
	if len(values) == 0 {
		return
	}
	sql.WriteString("INSERT INTO ")
	sql.WriteString(table)
	sql.WriteString(" (")
	sql.WriteString(columns)
	sql.WriteString(") VALUES\n")
	sql.WriteString(strings.Join(values, ",\n"))
	sql.WriteString(";\n")
}

func queryRows(db dbConfig, sql string) ([][]string, error) {
	args := append(mysqlBaseArgs(db), "-N", "-B", "-e", sql, db.database)
	cmd := exec.Command("mysql", args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("%w: %s", err, strings.TrimSpace(stderr.String()))
	}

	lines := strings.Split(strings.TrimSpace(stdout.String()), "\n")
	rows := make([][]string, 0, len(lines))
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		fields := strings.Split(line, "\t")
		for i := range fields {
			fields[i] = strings.TrimSpace(strings.TrimSuffix(fields[i], "\r"))
		}
		rows = append(rows, fields)
	}
	return rows, nil
}

func runSQL(db dbConfig, sql string) error {
	cmd := exec.Command("mysql", mysqlArgs(db)...)
	cmd.Stdin = strings.NewReader(sql)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func mysqlArgs(db dbConfig) []string {
	args := mysqlBaseArgs(db)
	args = append(args, db.database)
	return args
}

func mysqlBaseArgs(db dbConfig) []string {
	args := []string{"-h", db.host, "-P", db.port, "-u", db.user}
	if db.password != "" {
		args = append(args, "-p"+db.password)
	}
	return args
}

func deterministicID(kind uint32, n int64) string {
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		kind,
		uint16(n>>32),
		uint16(n>>16),
		uint16(n),
		uint64(n)&0xffffffffffff,
	)
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

type weightedChoice struct {
	Name   string
	Weight int
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

func elementVersionKey(name string, namespace string, version int) string {
	return fmt.Sprintf("%s|%s|%d", name, namespace, version)
}

func purposeVersionKey(name string, groupID string, version int) string {
	return fmt.Sprintf("%s|%s|%d", name, groupID, version)
}

func purposeManifestVersionKey(id string, version int) string {
	return fmt.Sprintf("%s|%d", id, version)
}

func elementManifestVersionKey(id string, version int) string {
	return fmt.Sprintf("%s|%d", id, version)
}

func elementNameVersionKey(name string, namespace string, version int) string {
	return fmt.Sprintf("%s|%s|%d", name, namespace, version)
}

func loadElementVersionForManifest(ctx *seedContext, elementDef elementDefinition) (elementVersion, bool) {
	version, err := loadElementVersionByID(ctx.db, ctx.manifest.OrgID, elementDef.ID, elementDef.Version)
	if err == nil {
		ctx.elementVersions[elementManifestVersionKey(version.ElementID, version.Version)] = version
		ctx.elementVersionsByName[elementNameVersionKey(version.Name, version.Namespace, version.Version)] = version
		return version, true
	}
	version, err = loadElementVersionByNameNamespaceVersion(ctx.db, ctx.manifest.OrgID, elementDef.Name, elementDef.Namespace, elementDef.Version)
	if err == nil {
		ctx.elementVersions[elementManifestVersionKey(version.ElementID, version.Version)] = version
		ctx.elementVersionsByName[elementNameVersionKey(version.Name, version.Namespace, version.Version)] = version
		return version, true
	}
	return elementVersion{}, false
}

func findManifestElement(elements []elementDefinition, name string, namespace string) (elementDefinition, bool) {
	for _, element := range elements {
		if element.Name == name && element.Namespace == namespace {
			return element, true
		}
	}
	return elementDefinition{}, false
}

func sqlString(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

func sqlBool(value bool) string {
	if value {
		return "true"
	}
	return "false"
}

func boolLiteral(value bool) string {
	if value {
		return "true"
	}
	return "false"
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
