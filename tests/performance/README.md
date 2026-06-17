# Performance Tests

This harness is for local or scheduled performance runs against MySQL. It is separate from the integration tests and does not run as a normal CI gate.

The seed pipeline now creates a realistic manifest in `tests/performance/seed/templates.json` with:
- a catalog of elements and purposes
- org-level and group-scoped purpose instances
- deterministic distribution settings for consent types, groups, users, statuses, and attributes
- defaults that the k6 scenarios use for realistic reads, searches, validates, and lightweight writes

Template generation now runs through `tests/performance/seed/create-templates.go` via the shell wrapper, so Python is no longer required for manifest generation.

## Commands

```bash
./build.sh perf_setup mysql
cd target/server-performance && ./start.sh
./build.sh perf_seed mysql 1000000
./build.sh perf_validate mysql 1000000
./build.sh perf_test smoke
./build.sh perf_test read
./build.sh perf_test search
./build.sh perf_test validate
./build.sh perf_test mixed
```

## Environment

The scripts default to local MySQL:

```bash
PERF_DB_HOST=127.0.0.1
PERF_DB_PORT=3306
PERF_DB_USER=root
PERF_DB_PASSWORD=password
PERF_DB_NAME=consent_mgt_perf
BASE_URL=http://localhost:9091
ORG_ID=openfgc-perf-org
GROUP_PREFIX=perf-group
CONSENT_COUNT=1000000
```

`perf_setup` copies `tests/performance/repository/conf/deployment.yaml` into `target/server-performance` and uses the DB values from that source config as defaults for database setup. Any `PERF_DB_*` environment variable overrides the config value for the setup/validation scripts.

`create-templates.sh` also accepts:

```bash
PERF_GROUP_PREFIX=perf-group
PERF_MAX_GROUPS=1000
PERF_PURPOSE_ENABLED_GROUP_COUNT=120
```

## Slow Query Capture

`setup-db.sh` attempts to enable MySQL slow query logging to `mysql.slow_log`. Each `perf_test` command writes a scenario report like `tests/performance/reports/read-summary.json` and, when the DB user has permission, a slow query report like `tests/performance/reports/read-slow-log.tsv`.
