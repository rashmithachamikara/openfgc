# Consent History Implementation Plan

## Summary

Implement tiered consent history in `consent-server` with no change to the hot-path current consent read unless explicitly requested. Keep `CONSENT_STATUS_AUDIT` as the status-history source, add a new `CONSENT_HISTORY` table for full pre-mutation snapshots, and make full amendment history configurable independently from status audit.

## Key Changes

- Add `CONSENT_HISTORY` schema to all supported DB scripts:
  - MySQL: `SNAPSHOT JSON`
  - Postgres: `SNAPSHOT JSONB`
  - SQLite: `SNAPSHOT TEXT` with JSON stored as serialized text
  - Use `(HISTORY_ID, ORG_ID)` primary key and `(CONSENT_ID, ORG_ID, ACTION_TIME)` index.
- Add config under `consent.history`:
  - `enabled: true|false`
  - Default to `false` if omitted, so status audit remains unaffected and existing deployments do not fail on unknown behavior.
- Add consent history models:
  - `ConsentHistory`
  - `ConsentHistoryResponse`
  - `ConsentHistoryListResponse`
  - Snapshot shape should reuse the current API naming conventions: `id`, `type`, `status`, `frequency`, `authorizations[].id`, `purposes[].name`, `elements[].name`, etc.
- Centralize history write logic in the consent service:
  - Add a private helper such as `recordConsentHistory(ctx, tx, consentID, orgID, actionBy, reasonCode)` in `consent-server/internal/consent/service.go`.
  - The helper must check `consent.history.enabled`, build the full pre-mutation snapshot, generate `HISTORY_ID` and `ACTION_TIME`, map the system reason code to the public reason string, and call `ConsentStore.CreateHistory`.
  - Mutation paths must call this helper from inside their existing database transaction before changing live tables.
- Extend `ConsentStore` with:
  - `GetByIDForUpdate(tx, consentID, orgID)` for row locking.
  - `CreateHistory(tx, history)`
  - `GetHistoryByConsentID(ctx, consentID, orgID, includeSnapshots)`
  - `GetStatusAuditsByConsentID(ctx, consentID, orgID)`
- Add routes:
  - `GET /api/v1/consents/{consentId}?includeStatusHistory=true`
  - `GET /api/v1/consents/{consentId}/history`
  - `GET /api/v1/consents/{consentId}/history?includeSnapshots=true`

## Write Behavior

- For `PUT /consents/{consentId}`:
  - Validate and resolve the incoming update as today.
  - Build the complete pre-mutation snapshot from current consent, attributes, auth resources, and purposes.
  - Compare the effective requested state against the current state; if unchanged, return the current consent without history or mutation.
  - In one DB transaction: lock parent `CONSENT`, call the centralized history helper when enabled, apply live-table mutations, insert `CONSENT_STATUS_AUDIT` if status changed.
  - If the PUT changes embedded authorization resources and this derives a new consent status, do not add a second history row; status audit records the status transition.
  - If the PUT extends `validityTime` and reactivates an expired consent, do not add a second history row; status audit records the reactivation transition.
- For revoke:
  - Apply in `consentService.RevokeConsent` in `consent-server/internal/consent/service.go`.
  - The current revoke transaction updates `CONSENT.CURRENT_STATUS`, updates all related authorization resources through `AuthResource.UpdateAllStatusByConsentID`, and inserts `CONSENT_STATUS_AUDIT`.
  - Call the centralized history helper in that same transaction before the status/auth mutations.
  - Use `req.ActionBy` as `ACTION_BY`, but always use a system-generated history reason; keep `req.RevocationReason` only in `CONSENT_STATUS_AUDIT`.
- For expiry:
  - Apply inside `consentService.expireConsent` in `consent-server/internal/consent/service.go`, because this is the centralized mutation point for expiry.
  - `expireConsent` is currently triggered after create when a consent is created already expired, during `GetConsent`, after `UpdateConsent`, and during `ValidateConsent`.
  - The current expiry transaction updates `CONSENT.CURRENT_STATUS`, updates all related authorization resources through `AuthResource.UpdateAllStatusByConsentID`, and inserts `CONSENT_STATUS_AUDIT`.
  - Call the centralized history helper in that same transaction before the status/auth mutations, with `actionBy = SYSTEM` and history reason `Consent expired`.
- For post-update reactivation:
  - Apply in the reactivation branch inside `UpdateConsent`, where an expired consent is moved out of the expired state after `validityTime` is extended.
  - Do not create a separate history row when reactivation is caused by the same PUT operation; the main PUT history row is the amendment record.
  - Keep the existing status audit entry for the lifecycle transition, with reason `Consent reactivated - validity time extended to future`.
- For direct authorization resource mutations:
  - Apply in `authresource.CreateAuthResource` and `authresource.UpdateAuthResource`, because these endpoints can change consent status through authorization state evaluation.
  - Record one history row before creating/updating the auth resource when the auth-resource mutation changes consent state or is treated as a consent amendment.
  - If the auth-resource mutation also changes consent status, do not create an additional history row; status audit records the derived status transition.
- Status audit remains always-on and does not depend on full history config.

## Centralized History Helper

- Implement one consent-service helper for all amendment history writes; do not duplicate snapshot assembly or `CONSENT_HISTORY` insert logic in each mutation path.
- The helper should:
  - Return immediately when `consent.history.enabled` is false.
  - Lock/read the parent consent row through `GetByIDForUpdate` using the active transaction.
  - Build the snapshot from the same live tables used by current consent retrieval.
  - Persist one history row with generated ID, current millisecond timestamp, caller-supplied `actionBy`, and a mapped system-generated reason.
- Keep reason selection explicit at the call site by passing a small internal reason code such as `HistoryReasonConsentRevoked`, not arbitrary free text.
- Keep no-change detection outside the helper for PUT, because only the update path has the resolved incoming state needed to know whether a mutation is necessary.
- Enforce the rule that one logical API mutation writes at most one history row. Status changes derived from the same PUT or auth-resource request should write status audit, not an additional history row.

## Implementation Phases

- Phase 1: Schema and config foundation
  - Add `CONSENT_HISTORY` to MySQL, Postgres, and SQLite schema scripts.
  - Add `consent.history.enabled` config support with a safe default when omitted.
  - Do not change runtime write behavior in this phase.
- Phase 2: Models and store methods
  - Add history and status-history response models.
  - Add store methods for history insert, history listing, status-audit listing, and locked consent reads.
  - Add focused store tests for DB row mapping and snapshot storage.
- Phase 3: Snapshot builder and history recorder
  - Add the centralized snapshot builder using the same live tables as current consent retrieval.
  - Add the centralized history recorder with config gating, system reason mapping, generated IDs, and millisecond timestamps.
  - Add tests for snapshot shape, reason mapping, and disabled-history behavior.
- Phase 4: Consent PUT history
  - Add effective no-change detection for PUT.
  - Record one history row before PUT mutations.
  - Ensure PUT-derived status changes and PUT-driven reactivation create status audit only, not additional history rows.
- Phase 5: Revoke and expiry history
  - Add history recording to `RevokeConsent`.
  - Add history recording inside `expireConsent`, with locked re-read to prevent duplicate concurrent expiry history.
  - Cover create-triggered, get-triggered, update-triggered, and validate-triggered expiry.
- Phase 6: Direct authorization-resource history
  - Add history recording to `authresource.CreateAuthResource` and `authresource.UpdateAuthResource`.
  - Ensure derived consent status changes create status audit only, not additional history rows.
- Phase 7: Read API surface
  - Add `includeStatusHistory=true` support to `GET /consents/{consentId}`.
  - Add `GET /consents/{consentId}/history` with optional `includeSnapshots=true`.
  - Update OpenAPI schemas and examples using current naming conventions.
- Phase 8: Final integration pass
  - Run `go test ./...` under `consent-server`.
  - Verify history-disabled behavior still writes status audit.
  - Review ordering for same-millisecond history rows.

## History Reasons

- `Consent amended`: default reason for PUT changes when no more specific category is needed.
- `Consent details amended`: consent-level fields changed, such as `type`, `frequency`, `validityTime`, `recurringIndicator`, or `dataAccessValidityDuration`.
- `Consent attributes amended`: attributes were added, removed, or changed.
- `Consent authorizations amended`: embedded authorization resources were added, removed, or changed by the consent PUT request.
- `Consent purposes amended`: purpose mappings or element approvals were added, removed, or changed.
- `Consent revoked`: consent was revoked through `RevokeConsent`; user-provided revocation text remains only in status audit.
- `Consent expired`: consent moved to the configured expired status through `expireConsent`.
- `Consent details amended and reactivated`: PUT changed consent details and caused an expired consent to move out of the expired state.
- `Consent authorizations amended and status updated`: authorization changes caused a derived consent status transition in the same API operation.

History reasons must be generated by server logic and must not copy request-provided free text. If multiple categories change in one PUT, use the most specific combined reason the implementation supports, or fall back to `Consent amended`.

## API/OpenAPI Updates

- Update `api/consent-management-API.yaml` using existing naming style.
- `GET /consents/{consentId}` remains unchanged unless `includeStatusHistory=true`.
- With `includeStatusHistory=true`, append:
  - `statusHistory: [{ statusAuditId, previousStatus, currentStatus, actionTime, actionBy, reason }]`
- `GET /consents/{consentId}/history` returns:
  - `{ id, history: [{ historyId, actionTime, actionBy, reason }] }`
- With `includeSnapshots=true`, each history item additionally includes `snapshot`, shaped like the current consent retrieval response.

## Tests

- Store tests for history insert, history listing with and without snapshots, status audit listing, and DB-specific snapshot mapping.
- Service tests for:
  - PUT with changes creates history when enabled.
  - PUT with no effective changes creates no history.
  - PUT status change still writes `CONSENT_STATUS_AUDIT` but only one history row.
  - Full history disabled still allows status audit.
  - Revoke creates history only when enabled and stores the pre-revocation consent/auth state.
  - Expiry creates history only when enabled from each trigger path: create-with-expired-validity, get, update, and validate.
  - PUT-driven reactivation writes one PUT history row and one status audit row, not a second history row.
  - Direct auth-resource create/update writes one history row for the auth mutation and one status audit row when consent status changes.
- Handler tests for:
  - `includeStatusHistory=true`
  - `/history`
  - `/history?includeSnapshots=true`
  - invalid/missing `org-id` and invalid `consentId`.
- Run `go test ./...` under `consent-server`.

## Assumptions

- Current consent response naming wins over the example payload naming, so history snapshots use `id`, `status`, `authorizations[].id`, and `purposes[].name`.
- No separate single-history-entry endpoint is needed.
- Full history is optional by config, but status audit is mandatory and always written.
- History captures pre-mutation state only, not the post-mutation state.
- History `reason` is system-generated; user/API-supplied reasons remain in status audit only.
- A status transition caused by the same API mutation is not a separate history event; status audit is the source of truth for that transition.
