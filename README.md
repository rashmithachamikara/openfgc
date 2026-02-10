# OpenFGC

An industry-agnostic, flexible fine-grained consent management engine built for developers.

OpenFGC provides the Open Fine-Grained Consent API for managing consent elements, consent purposes, and user consents with organization-level multi-tenancy support.

## Features

- **Consent Elements**: Define and manage granular data attributes and processing activities
- **Consent Purposes**: Group elements into logical purposes with type-based validation
- **Consent Management**: Create, retrieve, update, revoke, and validate user consents
- **Authorization Resources**: Track granular authorization status for each consent
- **Attribute Search**: Search consents by custom attributes (key or key-value pairs)
- **Status Auditing**: Complete audit trail for consent status changes
- **Multi-tenancy**: Organization-level data isolation with `org-id` header
- **Expiration Handling**: Automatic consent expiration with cascading status updates

## Core Concepts

### 1. Consent Element
The Consent Element is the most granular unit of data or specific activity being consented to.

- **Definition**: The most granular unit—a specific data point (e.g., email address) or processing action (e.g., sharing with third parties).

### 2. Consent Purpose
The Consent Purpose provides the context and legal justification for the collection.

- **Definition**: A logical grouping of elements under a single objective. Instead of asking users about each data point, you present the reason for the request (e.g., "Marketing Communications" includes email and phone).

### 3. Consent (The Record)
The Consent is the immutable evidence of a user’s decision regarding specific Purposes.

- **Definition**: The record of a user's decision. Tracks who approved what, when, and maintains the full status lifecycle (Created → Active → Expired/Revoked) with audit trail.

## Technology Stack

- **Go** 1.25+
- **Web Framework**: net/http (standard library) with gorilla/mux style routing
- **Database**: MySQL 8.0+
- **ORM/Data Access**: sqlx
- **Architecture**: Domain-driven layered architecture
- **Transaction Management**: Atomic operations

## Prerequisites

- Go 1.25 or higher
- MySQL 8.0 or higher
- Make (optional, for build commands)

## Project Structure

```
openfgc/
├── api/                                    # OpenAPI specifications
│   ├── consent-management-API.yaml         # Consent API spec
├── consent-server/                         # Main application
│   ├── cmd/
│   │   └── server/
│   │       ├── main.go                     # Application entry point
│   │       └── servicemanager.go           # Service initialization
│   ├── internal/
│   │   ├── authresource/                   # Authorization resource module
│   │   ├── consent/                        # Consent module
│   │   ├── consentelement/                 # Consent element module
│   │   ├── consentpurpose/                 # Consent purpose module
│   │   └── system/                         # Shared system components
│   │       ├── config/                     # Configuration management
│   │       ├── database/                   # Database client & transactions
│   │       ├── error/                      # Error handling
│   │       ├── healthcheck/                # Health check endpoints
│   │       ├── log/                        # Logging infrastructure
│   │       ├── middleware/                 # HTTP middleware
│   │       ├── stores/                     # Store registry
│   │       └── utils/                      # Utilities
│   ├── dbscripts/
│   │   ├── db_schema_mysql.sql             # Consent tables schema
│   │   └── WIP-db_schema_config_mysql.sql  # Config tables schema
│   └── docs/                               # Internal documentation
├── tests/
│   └── integration/                        # Integration tests
│       ├── consent/                        # Consent API tests
│       ├── consentelement/                 # Consent element tests
│       ├── consentpurpose/                 # Consent purpose tests
│       └── main.go                         # Test runner
├── build.sh                                # Build script
├── start.sh                                # Server startup script
├── target/                                 # Build output directory (generated)
│   ├── server/                             # Runnable server artifacts
│   └── dist/                               # Distribution packages
└── version.txt                             # Version information
```

## Quick Start

### 1. Setup Database

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS consent_mgt;"

# Import schemas
mysql -u root -p consent_mgt < consent-server/dbscripts/db_schema_mysql.sql
```

### 2. Build

**Using build.sh (Recommended)**

```bash
# Build the application (binary only)
./build.sh build

# Create distribution package (binary + zip archive)
./build.sh package
```

Build artifacts are created in `target/server/`:
- `target/server/consent-server` (binary)
- `target/server/repository/conf/` (config directory)
- `target/server/api/` (API specs)
- `target/server/dbscripts/` (database scripts)

### 3. Configure Application

Update configuration file at `target/server/repository/conf/deployment.yaml`:

```yaml
server:
  port: 3000
  host: "0.0.0.0"

database:
  host: "localhost"
  port: 3306
  username: "root"
  password: "your_password"
  database: "consent_mgt"
  max_open_connections: 25
  max_idle_connections: 10
  connection_max_lifetime_minutes: 5
```


### 4. Run

```bash
# Run in normal mode
cd target/server
./start.sh

# Run in debug mode (with remote debugging on port 2345)
./start.sh --debug

# Run in debug mode with custom port
./start.sh --debug --debug-port 3000
```

Server starts at `http://localhost:3000`

Health check: `curl http://localhost:3000/health`

## API Endpoints

- [Open Fine-Grained Consent API schema](api/consent-management-API.yaml)

> **Tip:** You can import these OpenAPI specifications directly into [Postman](https://www.postman.com/) or similar tools to easily explore and test the API.

All requests require headers:
- `org-id`: Organization identifier

## Development

### Build from Source

```bash
# Navigate to server directory
cd consent-server

# Build binary
go build -o bin/consent-server cmd/server/main.go

# Run
./bin/consent-server
```

### Run Tests

**Using build.sh (Recommended)**

```bash
# Run unit tests
./build.sh test_unit

# Run integration tests
./build.sh test_integration

# Run all tests
./build.sh test
```

> **Note:** Integration tests use the configuration at `tests/integration/repository/conf/deployment.yaml`. If you're using a separate database for testing, ensure it's created and the credentials are updated in this configuration file before running the tests. The test database will be automatically initialized with the required schema.

**Manual Execution**

```bash
# Navigate to test directory
cd tests/integration

# Run all tests
go test ./... -v
```