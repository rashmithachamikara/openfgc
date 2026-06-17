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
PERF_GROUP_PREFIX="${PERF_GROUP_PREFIX:-perf-group}"
PERF_MAX_GROUPS="${PERF_MAX_GROUPS:-1000}"
PERF_PURPOSE_ENABLED_GROUP_COUNT="${PERF_PURPOSE_ENABLED_GROUP_COUNT:-$PERF_MAX_GROUPS}"
TEMPLATES_FILE="$SCRIPT_DIR/templates.json"

go run "$SCRIPT_DIR/create-templates.go" \
    --base-url "$BASE_URL" \
    --org-id "$PERF_ORG_ID" \
    --group-prefix "$PERF_GROUP_PREFIX" \
    --max-groups "$PERF_MAX_GROUPS" \
    --purpose-enabled-groups "$PERF_PURPOSE_ENABLED_GROUP_COUNT" \
    --output "$TEMPLATES_FILE"

echo "✓ Performance templates written to $TEMPLATES_FILE"
