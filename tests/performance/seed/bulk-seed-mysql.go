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
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type templatesFile struct {
	OrgID       string `json:"orgId"`
	GroupID     string `json:"groupId"`
	ConsentType string `json:"consentType"`
	Element     struct {
		ID        string `json:"id"`
		Name      string `json:"name"`
		Namespace string `json:"namespace"`
		Version   int    `json:"version"`
	} `json:"element"`
	Purpose struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Version int    `json:"version"`
	} `json:"purpose"`
}

type dbConfig struct {
	host     string
	port     string
	user     string
	password string
	database string
}

type templateVersions struct {
	elementVersionID string
	purposeVersionID string
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

	templates, err := readTemplates(*templatesPath)
	if err != nil {
		fail("read templates: %v", err)
	}

	db := loadDBConfig()
	versions, err := loadTemplateVersions(db, templates)
	if err != nil {
		fail("load template version IDs: %v", err)
	}

	if *reset {
		fmt.Printf("Resetting existing performance consent rows for org %s\n", templates.OrgID)
		if err := runSQL(db, fmt.Sprintf("DELETE FROM CONSENT WHERE ORG_ID = %s;", sqlString(templates.OrgID))); err != nil {
			fail("reset existing rows: %v", err)
		}
	}

	fmt.Printf("Seeding %d consents in batches of %d\n", *count, *batchSize)
	start := time.Now()
	for offset := 0; offset < *count; offset += *batchSize {
		limit := *batchSize
		if remaining := *count - offset; remaining < limit {
			limit = remaining
		}
		if err := insertBatch(db, templates, versions, int64(offset+1), limit, *includeAudit); err != nil {
			fail("insert batch starting at %d: %v", offset+1, err)
		}
		fmt.Printf("Seeded %d/%d consents\n", offset+limit, *count)
	}
	fmt.Printf("✓ Seeded %d consents in %s\n", *count, time.Since(start).Round(time.Second))
}

func readTemplates(path string) (templatesFile, error) {
	file, err := os.Open(path)
	if err != nil {
		return templatesFile{}, err
	}
	defer file.Close()

	var templates templatesFile
	if err := json.NewDecoder(file).Decode(&templates); err != nil {
		return templatesFile{}, err
	}
	if templates.OrgID == "" || templates.GroupID == "" || templates.ConsentType == "" ||
		templates.Element.ID == "" || templates.Purpose.ID == "" {
		return templatesFile{}, fmt.Errorf("templates file is missing required fields")
	}
	if templates.Element.Namespace == "" {
		templates.Element.Namespace = "default"
	}
	if templates.Element.Version == 0 {
		templates.Element.Version = 1
	}
	if templates.Purpose.Version == 0 {
		templates.Purpose.Version = 1
	}
	return templates, nil
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

func loadTemplateVersions(db dbConfig, templates templatesFile) (templateVersions, error) {
	elementSQL := fmt.Sprintf(
		"SELECT VERSION_ID FROM ELEMENT WHERE ORG_ID = %s AND ID = %s AND VERSION = %d LIMIT 1;",
		sqlString(templates.OrgID),
		sqlString(templates.Element.ID),
		templates.Element.Version,
	)
	purposeSQL := fmt.Sprintf(
		"SELECT VERSION_ID FROM PURPOSE WHERE ORG_ID = %s AND ID = %s AND VERSION = %d LIMIT 1;",
		sqlString(templates.OrgID),
		sqlString(templates.Purpose.ID),
		templates.Purpose.Version,
	)

	elementVersionID, err := queryScalar(db, elementSQL)
	if err != nil {
		return templateVersions{}, err
	}
	purposeVersionID, err := queryScalar(db, purposeSQL)
	if err != nil {
		return templateVersions{}, err
	}
	if elementVersionID == "" || purposeVersionID == "" {
		return templateVersions{}, fmt.Errorf("template element/purpose version rows were not found")
	}
	return templateVersions{elementVersionID: elementVersionID, purposeVersionID: purposeVersionID}, nil
}

func insertBatch(db dbConfig, templates templatesFile, versions templateVersions, start int64, count int, includeAudit bool) error {
	now := time.Now().UnixMilli()
	future := now + int64(365*24*time.Hour/time.Millisecond)
	past := now - int64(24*time.Hour/time.Millisecond)

	var sql bytes.Buffer
	consents := make([]string, 0, count)
	authResources := make([]string, 0, count)
	attributes := make([]string, 0, count*3)
	purposeMappings := make([]string, 0, count)
	approvals := make([]string, 0, count)
	audits := make([]string, 0, count)

	for i := 0; i < count; i++ {
		n := start + int64(i)
		consentID := deterministicID(0xc0, n)
		authID := deterministicID(0xa0, n)
		auditID := deterministicID(0x50, n)
		status := statusFor(n)
		authStatus := authStatusFor(status)
		groupID := fmt.Sprintf("%s-%03d", templates.GroupID, (n-1)%100)
		userID := fmt.Sprintf("perf-user-%09d", n)
		createdTime := now - (n % 86400000)
		expiration := future
		if status == "EXPIRED" {
			expiration = past
		}

		consents = append(consents, fmt.Sprintf("(%s,%d,%d,%s,%s,%s,NULL,%d,false,NULL,%s)",
			sqlString(consentID),
			createdTime,
			createdTime,
			sqlString(groupID),
			sqlString(templates.ConsentType),
			sqlString(status),
			expiration,
			sqlString(templates.OrgID),
		))
		authResources = append(authResources, fmt.Sprintf("(%s,%s,%s,%s,%s,%d,%s,%s)",
			sqlString(authID),
			sqlString(consentID),
			sqlString("primary"),
			sqlString(userID),
			sqlString(authStatus),
			createdTime,
			sqlString(`[{"type":"account","id":"ACC-`+strconv.FormatInt(n, 10)+`"}]`),
			sqlString(templates.OrgID),
		))
		attributes = append(attributes,
			fmt.Sprintf("(%s,%s,%s,%s)", sqlString(consentID), sqlString("segment"), sqlString(segmentFor(n)), sqlString(templates.OrgID)),
			fmt.Sprintf("(%s,%s,%s,%s)", sqlString(consentID), sqlString("channel"), sqlString(channelFor(n)), sqlString(templates.OrgID)),
			fmt.Sprintf("(%s,%s,%s,%s)", sqlString(consentID), sqlString("perf_index"), sqlString(strconv.FormatInt(n, 10)), sqlString(templates.OrgID)),
		)
		purposeMappings = append(purposeMappings, fmt.Sprintf("(%s,%s,%s)",
			sqlString(consentID),
			sqlString(versions.purposeVersionID),
			sqlString(templates.OrgID),
		))
		approvals = append(approvals, fmt.Sprintf("(%s,%s,%s,true,%s,%s)",
			sqlString(consentID),
			sqlString(versions.purposeVersionID),
			sqlString(versions.elementVersionID),
			sqlString(fmt.Sprintf("ACC-%09d", n)),
			sqlString(templates.OrgID),
		))
		if includeAudit {
			audits = append(audits, fmt.Sprintf("(%s,%s,%s,%d,%s,%s,%s,%s)",
				sqlString(auditID),
				sqlString(consentID),
				sqlString(status),
				createdTime,
				sqlString("performance seed"),
				sqlString("bulk-seed-mysql"),
				sqlString("CREATED"),
				sqlString(templates.OrgID),
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
	return runSQL(db, sql.String())
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

func deterministicID(kind uint32, n int64) string {
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		kind,
		uint16(n>>32),
		uint16(n>>16),
		uint16(n),
		uint64(n)&0xffffffffffff,
	)
}

func statusFor(n int64) string {
	switch n % 10 {
	case 0:
		return "REVOKED"
	case 1:
		return "CREATED"
	case 2:
		return "EXPIRED"
	default:
		return "ACTIVE"
	}
}

func authStatusFor(status string) string {
	switch status {
	case "EXPIRED":
		return "SYS_EXPIRED"
	case "REVOKED":
		return "SYS_REVOKED"
	default:
		return "APPROVED"
	}
}

func segmentFor(n int64) string {
	switch n % 4 {
	case 0:
		return "retail"
	case 1:
		return "business"
	case 2:
		return "premium"
	default:
		return "staff"
	}
}

func channelFor(n int64) string {
	switch n % 3 {
	case 0:
		return "web"
	case 1:
		return "mobile"
	default:
		return "branch"
	}
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

func queryScalar(db dbConfig, sql string) (string, error) {
	args := append(mysqlBaseArgs(db), "-N", "-B", "-e", sql, db.database)
	cmd := exec.Command("mysql", args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return strings.TrimSpace(stdout.String()), nil
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

func sqlString(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

func envOrDefault(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "error: "+format+"\n", args...)
	os.Exit(1)
}
