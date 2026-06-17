#!/bin/bash

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

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Set Default OS and architecture ---
# Auto-detect GO OS
DEFAULT_OS=$(go env GOOS 2>/dev/null)
if [ -z "$DEFAULT_OS" ]; then
  UNAME_OS="$(uname -s)"
  case "$UNAME_OS" in
    Darwin) DEFAULT_OS="darwin" ;;
    Linux) DEFAULT_OS="linux" ;;
    MINGW*|MSYS*|CYGWIN*) DEFAULT_OS="windows" ;;
    *) echo "Unsupported OS: $UNAME_OS"; exit 1 ;;
  esac
fi

# Auto-detect GO ARCH
DEFAULT_ARCH=$(go env GOARCH 2>/dev/null)
if [ -z "$DEFAULT_ARCH" ]; then
  UNAME_ARCH="$(uname -m)"
  case "$UNAME_ARCH" in
    x86_64|amd64) DEFAULT_ARCH="amd64" ;;
    arm64|aarch64) DEFAULT_ARCH="arm64" ;;
    *) echo "Unsupported architecture: $UNAME_ARCH"; exit 1 ;;
  esac
fi

COMMAND="$1"
case "$COMMAND" in
    build|package|run)
        GO_OS=${2:-$DEFAULT_OS}
        GO_ARCH=${3:-$DEFAULT_ARCH}
        ;;
    *)
        GO_OS=$DEFAULT_OS
        GO_ARCH=$DEFAULT_ARCH
        ;;
esac

echo "================================================================"
echo "Using GO OS: $GO_OS and ARCH: $GO_ARCH"
echo "================================================================"

# Version management
VERSION_FILE="version.txt"
if [ -f "$VERSION_FILE" ]; then
    VERSION=$(cat "$VERSION_FILE")
else
    VERSION="1.0.0"
fi

# Configuration
BINARY_NAME="consent-server"
TARGET_DIR="target"
OUTPUT_DIR="$TARGET_DIR/server"
INTEGRATION_OUTPUT_DIR="${INTEGRATION_OUTPUT_DIR:-$TARGET_DIR/server-integration}"
PERF_OUTPUT_DIR="${PERF_OUTPUT_DIR:-$TARGET_DIR/server-performance}"
DIST_DIR="$TARGET_DIR/dist"
SOURCE_DIR="consent-server/cmd/server"
CONFIG_SOURCE="consent-server/cmd/server/repository/conf/deployment.yaml"
CONFIG_TARGET="$OUTPUT_DIR/repository/conf/deployment.yaml"
TEST_CONFIG_SOURCE_MYSQL="tests/integration/repository/conf/deployment.yaml"
TEST_CONFIG_SOURCE_SQLITE="tests/integration/repository/conf/deployment-sqlite.yaml"
PERF_CONFIG_SOURCE="tests/performance/repository/conf/deployment.yaml"
PERF_SEED_DIR="tests/performance/seed"
PERF_K6_DIR="tests/performance/k6"
PERF_REPORTS_DIR="tests/performance/reports"

# Package naming
PACKAGE_OS=$GO_OS
PACKAGE_ARCH=$GO_ARCH

# Normalize OS name for distribution packaging
if [ "$GO_OS" = "darwin" ]; then
    PACKAGE_OS=macos
elif [ "$GO_OS" = "windows" ]; then
    PACKAGE_OS="win"
fi

if [ "$GO_ARCH" = "amd64" ]; then
    PACKAGE_ARCH=x64
fi

# Strip leading 'v' from version for zip/folder naming (e.g. v0.5.0 -> 0.5.0)
PACKAGE_VERSION="${VERSION#v}"

PRODUCT_FOLDER="${BINARY_NAME}-${PACKAGE_VERSION}-${PACKAGE_OS}-${PACKAGE_ARCH}"

# ============================================================================
# Functions
# ============================================================================

function clean_all() {
    echo "================================================================"
    echo "Cleaning all build artifacts..."
    rm -rf "$TARGET_DIR"
    echo "✓ All build artifacts cleaned"
    echo "================================================================"
}

function clean() {
    clean_all
}

function build_binary() {
    echo "================================================================"
    echo "Building Consent Management API Server..."

    # Set binary name with .exe extension for Windows
    local output_binary="$BINARY_NAME"
    if [ "$GO_OS" = "windows" ]; then
        output_binary="${BINARY_NAME}.exe"
    fi

    # Clean previous build
    if [ -d "$OUTPUT_DIR" ]; then
        echo "Cleaning previous build..."
        rm -rf "$OUTPUT_DIR"
    fi

    # Create directory structure
    echo "Creating directory structure..."
    mkdir -p "$OUTPUT_DIR/repository/conf"

    # Build the binary with version and build date
    echo "Compiling binary for $GO_OS/$GO_ARCH..."
    cd consent-server
    GOOS=$GO_OS GOARCH=$GO_ARCH CGO_ENABLED=0 go build \
        -ldflags "-X 'main.version=$VERSION' -X 'main.buildDate=$(date -u '+%Y-%m-%d %H:%M:%S UTC')'" \
        -o "../$OUTPUT_DIR/$output_binary" "./cmd/server"
    cd ..

    # Copy configuration
    echo "Copying configuration..."
    cp "$CONFIG_SOURCE" "$CONFIG_TARGET"

    # Copy start script
    echo "Copying start script..."
    cp start.sh "$OUTPUT_DIR/start.sh"
    chmod +x "$OUTPUT_DIR/start.sh"

    # Copy database scripts
    if [ -d "consent-server/dbscripts" ]; then
        echo "Copying database scripts..."
        mkdir -p "$OUTPUT_DIR/dbscripts"
        cp consent-server/dbscripts/*.sql "$OUTPUT_DIR/dbscripts/" 2>/dev/null || true
    fi

    # Copy API specifications
    if [ -d "api" ]; then
        echo "Copying API specifications..."
        mkdir -p "$OUTPUT_DIR/api"
        cp api/*.yaml "$OUTPUT_DIR/api/" 2>/dev/null || true
    fi

    # Copy README
    if [ -f "README.md" ]; then
        echo "Copying README..."
        cp "README.md" "$OUTPUT_DIR/"
    fi

    # Copy version file
    if [ -f "$VERSION_FILE" ]; then
        echo "Copying version file..."
        cp "$VERSION_FILE" "$OUTPUT_DIR/"
    fi

    # Make binary executable (not needed for Windows)
    if [ "$GO_OS" != "windows" ]; then
        chmod +x "$OUTPUT_DIR/$output_binary"
    fi

    echo ""
    echo "✓ Build completed successfully!"
    echo ""
    echo "Build output:"
    echo "  Binary: $OUTPUT_DIR/$output_binary"
    echo "  Start Script: $OUTPUT_DIR/start.sh"
    echo "  Config: $CONFIG_TARGET"
    if [ -d "$OUTPUT_DIR/dbscripts" ]; then
        echo "  DB Scripts: $OUTPUT_DIR/dbscripts/"
    fi
    if [ -d "$OUTPUT_DIR/api" ]; then
        echo "  API Specs: $OUTPUT_DIR/api/"
    fi
    echo ""
    echo "To run the server:"
    echo "  cd $OUTPUT_DIR && ./start.sh"
    echo ""
    echo "Or with debug mode:"
    echo "  cd $OUTPUT_DIR && ./start.sh --debug"
    echo ""
    echo "================================================================"
}

function package() {
    echo "================================================================"
    echo "Creating distribution package..."

    # Build first
    build_binary

    # Create distribution directory
    mkdir -p "$DIST_DIR/$PRODUCT_FOLDER"

    # Copy everything from bin to dist
    echo "Copying build artifacts to distribution..."
    cp -r "$OUTPUT_DIR/"* "$DIST_DIR/$PRODUCT_FOLDER/"

    # Copy version file
    if [ -f "$VERSION_FILE" ]; then
        cp "$VERSION_FILE" "$DIST_DIR/$PRODUCT_FOLDER/"
    fi

    # Copy README if exists
    if [ -f "README.md" ]; then
        cp "README.md" "$DIST_DIR/$PRODUCT_FOLDER/"
    fi

    # Copy LICENSE if exists
    if [ -f "LICENSE" ]; then
        cp "LICENSE" "$DIST_DIR/$PRODUCT_FOLDER/"
    fi

    # Create zip file
    echo "Creating zip archive..."
    (cd "$DIST_DIR" && zip -r "$PRODUCT_FOLDER.zip" "$PRODUCT_FOLDER")

    # Clean up unzipped folder
    rm -rf "${DIST_DIR:?DIST_DIR not set}/${PRODUCT_FOLDER:?PRODUCT_FOLDER not set}"

    echo ""
    echo "✓ Distribution package created successfully!"
    echo ""
    echo "Package: $DIST_DIR/$PRODUCT_FOLDER.zip"
    echo ""
    echo "================================================================"
}

function run_server() {
    echo "================================================================"
    echo "Running Consent Management API Server..."

    # Build first if binary doesn't exist
    if [ ! -f "$OUTPUT_DIR/$BINARY_NAME" ]; then
        echo "Binary not found. Building first..."
        build_binary
    fi

    echo "Starting server..."
    cd "$OUTPUT_DIR" && "./$BINARY_NAME"
    echo "================================================================"
}

function test_unit() {
    echo "================================================================"
    echo "Running unit tests..."
    echo "Cleaning test cache..."
    go clean -testcache
    cd consent-server || exit 1
    go test ./internal/... -v -cover
    cd "$SCRIPT_DIR" || exit 1
    echo "================================================================"
}

function test_integration() {
    echo "================================================================"
    echo "Running integration tests..."

    OUTPUT_DIR="$INTEGRATION_OUTPUT_DIR"
    CONFIG_TARGET="$OUTPUT_DIR/repository/conf/deployment.yaml"
    local test_server_dir="../../$OUTPUT_DIR"
    echo "Integration server output: $OUTPUT_DIR"

    # Select database type: default mysql, override with DB_TYPE env var
    local db_type="${DB_TYPE:-mysql}"
    echo "Database type: $db_type"

    # Clean test cache to ensure tests run with latest changes
    echo "Cleaning test cache..."
    go clean -testcache

    # Build a dedicated integration-test server so normal build outputs are untouched.
    build_binary

    # Select test config based on DB_TYPE
    local test_config_source
    if [ "$db_type" = "sqlite" ]; then
        test_config_source="$TEST_CONFIG_SOURCE_SQLITE"
    else
        test_config_source="$TEST_CONFIG_SOURCE_MYSQL"
    fi

    # Replace app config with test config for integration tests
    echo "Copying test configuration..."
    if [ -f "$test_config_source" ]; then
        cp "$test_config_source" "$CONFIG_TARGET"
        echo "✓ Test configuration copied ($test_config_source)"
    else
        echo "⚠ Warning: Test configuration not found, using default config"
    fi

    # Run integration test suite
    echo "Starting integration test suite..."
    cd tests/integration || exit 1
    set +e
    TEST_SERVER_DIR="$test_server_dir" DB_TYPE="$db_type" go run main.go
    TEST_EXIT_CODE=$?
    set -e
    cd "$SCRIPT_DIR" || exit 1

    if [ $TEST_EXIT_CODE -ne 0 ]; then
        echo "✗ Integration tests failed"
        exit 1
    fi

    echo "✓ Integration tests passed"
    echo "================================================================"
}

function test_all() {
    test_unit
    test_integration
}

function perf_mysql_args() {
    perf_set_db_env_defaults
    local host="$PERF_DB_HOST"
    local port="$PERF_DB_PORT"
    local user="$PERF_DB_USER"
    local password="$PERF_DB_PASSWORD"
    local database="$PERF_DB_NAME"

    MYSQL_ARGS=(-h "$host" -P "$port" -u "$user")
    if [ -n "$password" ]; then
        MYSQL_ARGS+=("-p$password")
    fi
    MYSQL_DB_ARGS=("${MYSQL_ARGS[@]}" "$database")
}

function perf_config_value() {
    local key="$1"
    local fallback="$2"
    local line value
    local in_database=false
    local in_consent=false

    while IFS= read -r line; do
        if [[ "$line" != " "* && "$line" != $'\t'* ]]; then
            in_database=false
            in_consent=false
            if [ "$line" = "database:" ]; then
                in_database=true
            fi
            continue
        fi

        if [ "$in_database" = true ] && [[ "$line" = "  consent:"* ]]; then
            in_consent=true
            continue
        fi

        if [ "$in_consent" = true ] && [[ "$line" = "  "* ]] && [[ "$line" != "    "* ]]; then
            in_consent=false
            continue
        fi

        if [ "$in_consent" = true ] && [[ "$line" = "    $key:"* ]]; then
            value="${line#*:}"
            value="${value#"${value%%[![:space:]]*}"}"
            value="${value%\"}"
            value="${value#\"}"
            echo "$value"
            return
        fi
    done < "$PERF_CONFIG_SOURCE"

    echo "$fallback"
}

function perf_set_db_env_defaults() {
    export PERF_DB_HOST="${PERF_DB_HOST:-$(perf_config_value hostname 127.0.0.1)}"
    export PERF_DB_PORT="${PERF_DB_PORT:-$(perf_config_value port 3306)}"
    export PERF_DB_USER="${PERF_DB_USER:-$(perf_config_value user root)}"
    export PERF_DB_PASSWORD="${PERF_DB_PASSWORD:-$(perf_config_value password password)}"
    export PERF_DB_NAME="${PERF_DB_NAME:-$(perf_config_value database consent_mgt_perf)}"
}

function perf_required_group_count() {
    local count="${1:-1000000}"
    local group_count=$((count / 1000))

    if [ "$group_count" -lt 100 ]; then
        group_count=100
    fi
    if [ "$group_count" -gt 1000 ]; then
        group_count=1000
    fi

    echo "$group_count"
}

function perf_manifest_group_value() {
    local key="$1"
    local manifest_path="$PERF_SEED_DIR/templates.json"

    if [ ! -f "$manifest_path" ]; then
        echo ""
        return
    fi

    local line
    line=$(grep -m1 "\"$key\"" "$manifest_path" || true)
    if [ -z "$line" ]; then
        echo ""
        return
    fi

    echo "$line" | sed -E 's/.*: ([0-9]+).*/\1/'
}

function perf_setup() {
    local db_type="${2:-mysql}"
    if [ "$db_type" != "mysql" ]; then
        echo "Only MySQL performance setup is supported."
        exit 1
    fi

    echo "================================================================"
    echo "Preparing MySQL performance database and server output..."
    OUTPUT_DIR="$PERF_OUTPUT_DIR"
    CONFIG_TARGET="$OUTPUT_DIR/repository/conf/deployment.yaml"
    build_binary

    echo "Copying performance configuration..."
    cp "$PERF_CONFIG_SOURCE" "$CONFIG_TARGET"

    perf_set_db_env_defaults
    bash "$PERF_SEED_DIR/setup-db.sh"
    rm -f "$PERF_SEED_DIR/templates.json"

    echo "✓ Performance setup completed"
    echo "Server output: $PERF_OUTPUT_DIR"
    echo "Start it with: cd $PERF_OUTPUT_DIR && ./start.sh"
    echo "================================================================"
}

function perf_seed() {
    local db_type="${2:-mysql}"
    local count="${3:-1000000}"
    local required_groups
    local manifest_enabled_groups
    local manifest_max_groups
    local create_max_groups
    local create_enabled_groups
    if [ "$db_type" != "mysql" ]; then
        echo "Only MySQL performance seeding is supported."
        exit 1
    fi

    required_groups="$(perf_required_group_count "$count")"
    create_max_groups="${PERF_MAX_GROUPS:-$required_groups}"
    if [ "$create_max_groups" -lt "$required_groups" ]; then
        create_max_groups="$required_groups"
    fi
    create_enabled_groups="${PERF_PURPOSE_ENABLED_GROUP_COUNT:-$create_max_groups}"
    if [ "$create_enabled_groups" -lt "$required_groups" ]; then
        create_enabled_groups="$required_groups"
    fi

    if [ ! -f "$PERF_SEED_DIR/templates.json" ]; then
        echo "Performance templates not found. Creating them through the API..."
        PERF_MAX_GROUPS="$create_max_groups" \
        PERF_PURPOSE_ENABLED_GROUP_COUNT="$create_enabled_groups" \
            bash "$PERF_SEED_DIR/create-templates.sh"
    else
        manifest_enabled_groups="$(perf_manifest_group_value purposeEnabledGroupCount)"
        manifest_max_groups="$(perf_manifest_group_value maxGroupCount)"
        if [ -z "$manifest_enabled_groups" ] || [ -z "$manifest_max_groups" ] || \
           [ "$manifest_enabled_groups" -lt "$required_groups" ] || \
           [ "$manifest_max_groups" -lt "$required_groups" ]; then
            echo "Existing performance templates only cover $manifest_enabled_groups enabled groups and $manifest_max_groups max groups."
            echo "Regenerating templates for $required_groups groups..."
            rm -f "$PERF_SEED_DIR/templates.json"
            PERF_MAX_GROUPS="$create_max_groups" \
            PERF_PURPOSE_ENABLED_GROUP_COUNT="$create_enabled_groups" \
                bash "$PERF_SEED_DIR/create-templates.sh"
        fi
    fi

    echo "================================================================"
    echo "Seeding $count MySQL performance consents..."
    perf_set_db_env_defaults
    go run "$PERF_SEED_DIR/bulk-seed-mysql.go" --count "$count"
    echo "✓ Performance seed completed"
    echo "================================================================"
}

function perf_validate() {
    local db_type="${2:-mysql}"
    local expected_count="${3:-1000000}"
    if [ "$db_type" != "mysql" ]; then
        echo "Only MySQL performance validation is supported."
        exit 1
    fi

    perf_mysql_args
    echo "================================================================"
    echo "Validating MySQL performance seed..."
    {
        printf "SET @expected_count := %s;\n" "$expected_count"
        printf "SET @perf_org_id := '%s';\n" "${PERF_ORG_ID:-openfgc-perf-org}"
        cat "$PERF_SEED_DIR/validate-seed.sql"
    } | mysql "${MYSQL_DB_ARGS[@]}"
    echo "✓ Performance seed validation passed"
    echo "================================================================"
}

function perf_test() {
    local scenario="${2:-smoke}"
    local script="$PERF_K6_DIR/$scenario.js"

    if [ ! -f "$script" ]; then
        echo "Unknown performance scenario: $scenario"
        echo "Available scenarios: smoke, read, search, validate, mixed"
        exit 1
    fi

    mkdir -p "$PERF_REPORTS_DIR"
    local start_epoch
    start_epoch=$(date +%s)
    echo "================================================================"
    echo "Running k6 performance scenario: $scenario"
    k6 run "$script"
    perf_mysql_args
    local slow_log_report="$PERF_REPORTS_DIR/$scenario-slow-log.tsv"
    if mysql "${MYSQL_ARGS[@]}" -N -B -e "SELECT start_time, query_time, lock_time, rows_sent, rows_examined, sql_text FROM mysql.slow_log WHERE start_time >= FROM_UNIXTIME($start_epoch) ORDER BY start_time" > "$slow_log_report" 2>/dev/null; then
        echo "Slow query report: $slow_log_report"
    else
        echo "⚠ Could not capture MySQL slow query log. Enable TABLE slow logging or check DB privileges."
        rm -f "$slow_log_report"
    fi
    echo "✓ Performance scenario completed: $scenario"
    echo "Reports: $PERF_REPORTS_DIR"
    echo "================================================================"
}

function show_help() {
    echo "Consent Management API Build Script"
    echo ""
    echo "Usage: ./build.sh {command} [OS] [ARCH]"
    echo ""
    echo "Commands:"
    echo "  clean            - Clean build artifacts"
    echo "  clean_all        - Clean all artifacts including distributions"
    echo "  build            - Build the binary and prepare output directory"
    echo "  package          - Build and create distribution package (zip)"
    echo "  run              - Build and run the server"
    echo "  test_unit        - Run unit tests"
    echo "  test_integration - Run integration tests"
    echo "  test             - Run all tests"
    echo "  perf_setup mysql - Prepare MySQL DB and dedicated performance server output"
    echo "  perf_seed mysql [count]"
    echo "                   - Seed MySQL performance data (default: 1000000)"
    echo "  perf_validate mysql [count]"
    echo "                   - Validate seeded MySQL performance data"
    echo "  perf_test {smoke|read|search|validate|mixed}"
    echo "                   - Run a k6 performance scenario"
    echo "  help             - Show this help message"
    echo ""
    echo "Optional Arguments:"
    echo "  OS               - Target operating system (darwin, linux, windows)"
    echo "                     Default: auto-detected ($DEFAULT_OS)"
    echo "  ARCH             - Target architecture (amd64, arm64)"
    echo "                     Default: auto-detected ($DEFAULT_ARCH)"
    echo ""
    echo "Examples:"
    echo "  ./build.sh build                    # Build for current platform"
    echo "  ./build.sh build linux amd64        # Build for Linux AMD64"
    echo "  ./build.sh build darwin arm64       # Build for macOS ARM64"
    echo "  ./build.sh package                  # Create distribution package"
    echo "  ./build.sh run                      # Build and run server"
    echo "  ./build.sh perf_setup mysql         # Prepare performance DB/output"
    echo "  ./build.sh perf_seed mysql 1000000  # Seed 1M performance consents"
    echo "  ./build.sh perf_test smoke          # Run smoke performance checks"
    echo ""
}

# ============================================================================
# Main script execution
# ============================================================================

case "$1" in
    clean)
        clean
        ;;
    clean_all)
        clean_all
        ;;
    build)
        build_binary
        ;;
    package)
        package
        ;;
    run)
        run_server
        ;;
    test_unit)
        test_unit
        ;;
    test_integration)
        test_integration
        ;;
    test)
        test_all
        ;;
    perf_setup)
        perf_setup "$@"
        ;;
    perf_seed)
        perf_seed "$@"
        ;;
    perf_validate)
        perf_validate "$@"
        ;;
    perf_test)
        perf_test "$@"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Error: Unknown command '$1'"
        echo ""
        show_help
        exit 1
        ;;
esac
