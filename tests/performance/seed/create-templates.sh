#!/usr/bin/env bash

# ----------------------------------------------------------------------------
# Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
#
# WSO2 LLC. licenses this file to you under the Apache License,
# Version 2.0 (the "License"); you may not use this file except
# in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied. See the License for the
# specific language governing permissions and limitations
# under the License.
# ----------------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${BASE_URL:-http://localhost:${PERF_SERVER_PORT:-9091}}"
PERF_ORG_ID="${PERF_ORG_ID:-openfgc-perf-org}"
PERF_GROUP_ID="${PERF_GROUP_ID:-perf-group-001}"
ELEMENT_NAME="${PERF_ELEMENT_NAME:-perf-account-id}"
PURPOSE_NAME="${PERF_PURPOSE_NAME:-perf-account-access}"
TEMPLATES_FILE="$SCRIPT_DIR/templates.json"

require_success() {
    local status="$1"
    local body_file="$2"
    local action="$3"
    if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
        echo "$action failed with HTTP $status"
        cat "$body_file"
        exit 1
    fi
}

json_value() {
    local expression="$1"
    local file="$2"
    python -c "import json,sys; data=json.load(open(sys.argv[2])); print($expression)" "$expression" "$file"
}

echo "Checking server health at $BASE_URL"
health_status=$(curl -sS -o /tmp/openfgc-perf-health.json -w "%{http_code}" "$BASE_URL/health")
require_success "$health_status" /tmp/openfgc-perf-health.json "Health check"

element_body=/tmp/openfgc-perf-element.json
element_status=$(curl -sS -o "$element_body" -w "%{http_code}" \
    -X POST "$BASE_URL/api/v1/consent-elements" \
    -H "Content-Type: application/json" \
    -H "org-id: $PERF_ORG_ID" \
    -d "[{\"name\":\"$ELEMENT_NAME\",\"namespace\":\"default\",\"type\":\"basic\",\"displayName\":\"Performance Account ID\",\"description\":\"Synthetic account identifier for performance tests\",\"schema\":{\"type\":\"string\"},\"properties\":{\"classification\":\"performance\"}}]")
require_success "$element_status" "$element_body" "Create element"
element_id=$(json_value "data['results'][0]['element']['elementId']" "$element_body")

purpose_body=/tmp/openfgc-perf-purpose.json
purpose_status=$(curl -sS -o "$purpose_body" -w "%{http_code}" \
    -X POST "$BASE_URL/api/v1/consent-purposes" \
    -H "Content-Type: application/json" \
    -H "org-id: $PERF_ORG_ID" \
    -d "{\"name\":\"$PURPOSE_NAME\",\"displayName\":\"Performance Account Access\",\"description\":\"Synthetic purpose for performance tests\",\"properties\":{\"classification\":\"performance\"},\"elements\":[{\"name\":\"$ELEMENT_NAME\",\"namespace\":\"default\",\"mandatory\":true}]}")
require_success "$purpose_status" "$purpose_body" "Create purpose"
purpose_id=$(json_value "data['purposeId']" "$purpose_body")

now_ms=$(python -c "import time; print(int(time.time() * 1000))")
expiration_ms=$((now_ms + 31536000000))
consent_body=/tmp/openfgc-perf-consent.json
consent_status=$(curl -sS -o "$consent_body" -w "%{http_code}" \
    -X POST "$BASE_URL/api/v1/consents" \
    -H "Content-Type: application/json" \
    -H "org-id: $PERF_ORG_ID" \
    -H "group-id: $PERF_GROUP_ID" \
    -d "{\"type\":\"accounts\",\"expirationTime\":$expiration_ms,\"attributes\":{\"segment\":\"retail\",\"channel\":\"web\",\"perf_template\":\"true\"},\"purposes\":[{\"name\":\"$PURPOSE_NAME\",\"elements\":[{\"name\":\"$ELEMENT_NAME\",\"namespace\":\"default\",\"approved\":true,\"value\":\"ACC-TEMPLATE\"}]}],\"authorizations\":[{\"userId\":\"perf-user-template\",\"type\":\"primary\",\"status\":\"APPROVED\",\"resources\":[\"accounts\"]}]}")
require_success "$consent_status" "$consent_body" "Create template consent"
consent_id=$(json_value "data['id']" "$consent_body")

python - "$TEMPLATES_FILE" "$BASE_URL" "$PERF_ORG_ID" "$PERF_GROUP_ID" "$ELEMENT_NAME" "$element_id" "$PURPOSE_NAME" "$purpose_id" "$consent_id" <<'PY'
import json
import sys
import time

path, base_url, org_id, group_id, element_name, element_id, purpose_name, purpose_id, consent_id = sys.argv[1:]
data = {
    "baseUrl": base_url,
    "orgId": org_id,
    "groupId": group_id,
    "consentType": "accounts",
    "element": {
        "id": element_id,
        "name": element_name,
        "namespace": "default",
        "version": 1
    },
    "purpose": {
        "id": purpose_id,
        "name": purpose_name,
        "version": 1
    },
    "templateConsentId": consent_id,
    "createdAt": int(time.time() * 1000)
}
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY

echo "✓ Performance templates written to $TEMPLATES_FILE"
