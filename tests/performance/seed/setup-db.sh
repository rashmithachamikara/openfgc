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
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

PERF_DB_HOST="${PERF_DB_HOST:-127.0.0.1}"
PERF_DB_PORT="${PERF_DB_PORT:-3306}"
PERF_DB_USER="${PERF_DB_USER:-root}"
PERF_DB_PASSWORD="${PERF_DB_PASSWORD-password}"
PERF_DB_NAME="${PERF_DB_NAME:-consent_mgt_perf}"
SCHEMA_FILE="$REPO_ROOT/consent-server/dbscripts/db_schema_mysql.sql"

MYSQL_ARGS=(-h "$PERF_DB_HOST" -P "$PERF_DB_PORT" -u "$PERF_DB_USER")
if [ -n "$PERF_DB_PASSWORD" ]; then
    MYSQL_ARGS+=("-p$PERF_DB_PASSWORD")
fi

echo "Dropping and recreating database: $PERF_DB_NAME"
mysql "${MYSQL_ARGS[@]}" -e "DROP DATABASE IF EXISTS \`$PERF_DB_NAME\`; CREATE DATABASE \`$PERF_DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "Applying schema: $SCHEMA_FILE"
mysql "${MYSQL_ARGS[@]}" "$PERF_DB_NAME" < "$SCHEMA_FILE"

if [ "${PERF_ENABLE_SLOW_QUERY_LOG:-true}" = "true" ]; then
    echo "Enabling MySQL slow query log capture to mysql.slow_log"
    mysql "${MYSQL_ARGS[@]}" -e "SET GLOBAL log_output = 'TABLE'; SET GLOBAL slow_query_log = 'ON'; SET GLOBAL long_query_time = ${PERF_SLOW_QUERY_TIME:-0.2};" \
        || echo "⚠ Could not enable slow query log. Continue after enabling it manually if query timing capture is required."
fi

echo "✓ MySQL performance database is ready"
