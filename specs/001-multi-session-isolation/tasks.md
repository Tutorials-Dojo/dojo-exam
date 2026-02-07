# Tasks: Multi-Session Exam Isolation

**Input**: Design documents from `/specs/001-multi-session-isolation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Methodology**: TDD-First (Article III) - Every task follows: Test → CLI Contract → Implementation
**Guardrails**: No shared terminals, containers, or global state. Explicit identity required.

## Task Format

```
- [ ] [ID] [P?] [Story?] Task Name - Description - CLI Contract - Test Required
```

- **[P]**: Parallelizable (different files, no dependencies)
- **[Story]**: Maps to user story (US1-US5)
- **FR/FS**: Maps to Functional Requirement or Failure Scenario

---

## Phase -1: Constitutional Gates (MANDATORY)

**Purpose**: Verify all constitutional requirements before any implementation

- [ ] T001 Gate Check - Verify library-first architecture (7 libraries defined) - N/A - No
- [ ] T002 Gate Check - Verify CLI contracts exist for all libraries in contracts/cli-contracts.md - N/A - No
- [ ] T003 Gate Check - Verify test-first workflow documented (contract → integration → failure) - N/A - No
- [ ] T004 Gate Check - Verify explicit identity model (user_id, session_id, environment_id) defined - N/A - No
- [ ] T005 Gate Check - Verify no shared resources in architecture (1:1 session:container) - N/A - No

**Checkpoint**: All gates MUST pass before proceeding

---

## Phase 0: Setup (Shared Infrastructure)

**Purpose**: Project initialization, monorepo structure, shared tooling

- [ ] T006 Create Monorepo - Initialize root package.json with workspaces for packages/, backend/, frontend/ - N/A - No
- [ ] T007 [P] Configure Tooling - Setup ESLint, Prettier in .eslintrc.js, .prettierrc - N/A - No
- [ ] T008 [P] Configure Testing - Setup Vitest in vitest.config.js - N/A - No
- [ ] T009 [P] Configure Logging - Setup pino with structured JSON in packages/shared/logger.js - N/A - No
- [ ] T010 [P] Define Types - Create SessionIdentity types in packages/shared/types.js (enforces NFR-001) - N/A - No
- [ ] T011 Create Dev Environment - Setup docker-compose.yml for PostgreSQL + k3d cluster - N/A - No

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure - BLOCKS all user stories until complete

### Database Foundation

- [ ] T012 Create Migration Framework - Setup backend/db/migrations/ with runner script - N/A - No
- [ ] T013 Create Enums Migration - Define lifecycle_state enum in backend/db/migrations/001_create_enums.sql - N/A - No
- [ ] T014 Create Sessions Table - Define exam_sessions per data-model in backend/db/migrations/002_create_exam_sessions.sql - N/A - No
- [ ] T015 Create Environments Table - Define execution_environments per data-model in backend/db/migrations/003_create_execution_environments.sql - N/A - No
- [ ] T016 Create Access Logs Table - Define session_access_logs per data-model in backend/db/migrations/004_create_access_logs.sql - N/A - No

### Library Package Scaffolds (All Parallelizable)

- [ ] T017 [P] Init session-identity - Create packages/session-identity/ with package.json, src/, tests/ - N/A - No
- [ ] T018 [P] Init session-lifecycle - Create packages/session-lifecycle/ with package.json, src/, tests/ - N/A - No
- [ ] T019 [P] Init execution-environment - Create packages/execution-environment/ with package.json, src/, tests/ - N/A - No
- [ ] T020 [P] Init environment-access - Create packages/environment-access/ with package.json, src/, tests/ - N/A - No
- [ ] T021 [P] Init session-status - Create packages/session-status/ with package.json, src/, tests/ - N/A - No
- [ ] T022 [P] Init failure-classification - Create packages/failure-classification/ with package.json, src/, tests/ - N/A - No
- [ ] T023 [P] Init cleanup-ttl - Create packages/cleanup-ttl/ with package.json, src/, tests/ - N/A - No

### Backend Foundation

- [ ] T024 Init Fastify App - Create backend/src/index.js with Fastify server - N/A - No
- [ ] T025 Configure DB Pool - Setup pg connection pool in backend/src/db.js - N/A - No
- [ ] T026 [P] Error Handler - Create backend/src/middleware/error-handler.js - N/A - No
- [ ] T027 [P] Request Logger - Create backend/src/middleware/request-logger.js with session_id logging - N/A - No
- [ ] T028 Auth Middleware - Create backend/src/middleware/auth.js (JWT → user_id extraction, enforces NFR-002) - N/A - Yes

**Checkpoint**: Foundation ready - library implementation can begin

---

## Phase 2: Core Domain Libraries (Phase 0 in Plan)

**Purpose**: Build session-identity and session-lifecycle libraries

### 2.1 Session Identity Library (FR-001, NFR-001, NFR-002)

**CLI Contract**: `session-identity validate --user-id <uuid> --session-id <uuid> [--environment-id <uuid>]`

- [ ] T029 [P] [US1] Contract Test: Identity Valid - Test valid identity returns JSON in packages/session-identity/tests/contract/validate-success.test.js - `session-identity validate --user-id <uuid> --session-id <uuid>` → exit 0 + JSON - Yes
- [ ] T030 [P] [US1] Contract Test: Identity Missing Field - Test missing user_id returns error in packages/session-identity/tests/contract/validate-missing.test.js - `session-identity validate --session-id <uuid>` → exit 3 + INVALID_IDENTITY - Yes
- [ ] T031 [P] [US1] Contract Test: Identity Invalid UUID - Test invalid UUID format in packages/session-identity/tests/contract/validate-invalid.test.js - `session-identity validate --user-id "not-uuid"` → exit 3 - Yes
- [ ] T032 [US1] Implement Validation Logic - Create packages/session-identity/src/index.js with validateIdentity() - N/A - Yes
- [ ] T033 [US1] Implement CLI - Create packages/session-identity/src/cli.js with commander, outputs JSON to stdout - `session-identity validate` - Yes
- [ ] T034 [US1] Register CLI - Add bin entry to packages/session-identity/package.json - N/A - No

### 2.2 Session Lifecycle Library (NFR-003, NFR-004)

**CLI Contract**: `session-lifecycle transition --session-id <uuid> --to <state> [--reason <text>]`
**States**: created → initializing → ready → running → terminated | failed

- [ ] T035 [P] [US1] Contract Test: Valid Transition - Test created→initializing in packages/session-lifecycle/tests/contract/transition-valid.test.js - `session-lifecycle transition --session-id <uuid> --to initializing` → exit 0 - Yes
- [ ] T036 [P] [US1] Contract Test: Invalid Transition - Test terminated→running rejected in packages/session-lifecycle/tests/contract/transition-invalid.test.js - exit 6 + INVALID_TRANSITION - Yes
- [ ] T037 [P] [US1] Contract Test: Status Query - Test current state retrieval in packages/session-lifecycle/tests/contract/status.test.js - `session-lifecycle status --session-id <uuid>` → JSON with state - Yes
- [ ] T038 [US1] Implement State Machine - Create packages/session-lifecycle/src/state-machine.js with allowed transitions - N/A - Yes
- [ ] T039 [US1] Implement Transition Logic - Create packages/session-lifecycle/src/index.js with DB persistence - N/A - Yes
- [ ] T040 [US1] Implement CLI - Create packages/session-lifecycle/src/cli.js (transition, status commands) - `session-lifecycle transition|status` - Yes
- [ ] T041 [US1] Register CLI - Add bin entry to packages/session-lifecycle/package.json - N/A - No

---

## Phase 3: Execution Environment Management (Phase 1 in Plan)

**Purpose**: Build execution-environment and environment-access libraries

### 3.1 Execution Environment Library (FR-003, FR-004)

**CLI Contract**: `execution-environment create|status|destroy --session-id <uuid>`
**Guarantees**: One session = one container, no reuse, no sharing

- [ ] T042 [P] [US1] Contract Test: Create Environment - Test pod creation in packages/execution-environment/tests/contract/create.test.js - `execution-environment create --session-id <uuid>` → exit 0 + environment_id - Yes
- [ ] T043 [P] [US1] Contract Test: Create Timeout - Test 60s timeout failure in packages/execution-environment/tests/contract/create-timeout.test.js - exit 1 + ENVIRONMENT_CREATE_FAILED - Yes
- [ ] T044 [P] [US1] Contract Test: Status Query - Test environment status in packages/execution-environment/tests/contract/status.test.js - `execution-environment status --session-id <uuid>` → JSON - Yes
- [ ] T045 [P] [US1] Contract Test: Destroy - Test pod destruction in packages/execution-environment/tests/contract/destroy.test.js - `execution-environment destroy --session-id <uuid>` → exit 0 - Yes
- [ ] T046 [US1] Implement K8s Client - Create packages/execution-environment/src/k8s-client.js for pod operations - N/A - Yes
- [ ] T047 [US1] Implement Create Logic - Create packages/execution-environment/src/index.js with 1:1 session mapping - N/A - Yes
- [ ] T048 [US1] Implement CLI - Create packages/execution-environment/src/cli.js (create, status, destroy) - `execution-environment create|status|destroy` - Yes
- [ ] T049 [US1] Register CLI - Add bin entry to packages/execution-environment/package.json - N/A - No

### 3.2 Environment Access Control Library (FR-002, FR-011)

**CLI Contract**: `environment-access authorize --session-id <uuid> --user-id <uuid>`
**Guarantees**: Access denied if mismatch, no enumeration, no information leakage

- [ ] T050 [P] [US2] Contract Test: Authorize Success - Test matching identity in packages/environment-access/tests/contract/authorize-success.test.js - `environment-access authorize --session-id <uuid> --user-id <uuid>` → exit 0 + authorized:true - Yes
- [ ] T051 [P] [US2] Contract Test: Authorize Denied - Test mismatched identity in packages/environment-access/tests/contract/authorize-denied.test.js - exit 5 + ACCESS_DENIED + empty details - Yes
- [ ] T052 [P] [US5] Contract Test: No Leakage - Test denied response has empty details in packages/environment-access/tests/contract/no-leakage.test.js - details: {} on denial - Yes
- [ ] T053 [US2] Implement Authorization Logic - Create packages/environment-access/src/index.js with session ownership check - N/A - Yes
- [ ] T054 [US2] Implement Denial Logic - Create packages/environment-access/src/deny.js with no-leakage guarantee - N/A - Yes
- [ ] T055 [US2] Implement CLI - Create packages/environment-access/src/cli.js (authorize command) - `environment-access authorize` - Yes
- [ ] T056 [US2] Register CLI - Add bin entry to packages/environment-access/package.json - N/A - No

---

## Phase 4: Session Orchestration (Phase 2 in Plan)

**Purpose**: Stateless orchestrator composing all libraries

### 4.1 Session Orchestrator (FR-001, FR-012, FS-1)

**Flow**: Validate identity → Create session → Provision environment → Transition to ready → Expose status

- [ ] T057 [US1] Integration Test: Start Flow - Test full session start in backend/tests/integration/session-start.test.js - POST /sessions → session_id + websocket_url - Yes
- [ ] T058 [US1] Failure Test: Init Failure - Test FS-1 (clear error, no indefinite loading) in backend/tests/failure/session-init-failure.test.js - error within 10s, no infinite loading - Yes
- [ ] T059 [US1] Implement Orchestrator - Create backend/src/orchestrator/index.js composing library CLIs - N/A - Yes
- [ ] T060 [US1] Implement Error Handler - Create backend/src/orchestrator/error-handler.js using failure-classification - N/A - Yes

### 4.2 API Gateway (FR-001)

- [ ] T061 [US1] Contract Test: POST /sessions - Test session creation in backend/tests/contract/sessions.create.test.js - POST /sessions → 201 + session_id - Yes
- [ ] T062 [US1] Contract Test: 409 Active Session - Test active session conflict in backend/tests/contract/sessions.conflict.test.js - POST /sessions with existing active → 409 - Yes
- [ ] T063 [US1] Implement POST /sessions - Create backend/src/api/routes/sessions.js delegating to orchestrator - N/A - Yes
- [ ] T064 [US1] Wire Routes - Register session routes in backend/src/api/index.js - N/A - No

**Checkpoint**: User Story 1 complete - candidate can start exam

---

## Phase 5: Terminal Interaction (Phase 1 in Plan continued)

**Purpose**: WebSocket terminal with session isolation (FR-005, FR-006)

### 5.1 WebSocket Terminal

- [ ] T065 [P] [US2] Contract Test: WS Handshake - Test identity validation on connect in backend/tests/contract/terminal.websocket.test.js - WSS /sessions/:id/terminal with auth → connected - Yes
- [ ] T066 [P] [US2] Contract Test: WS Denied - Test 4003 on mismatch in backend/tests/contract/terminal.denied.test.js - wrong session_id → close 4003 - Yes
- [ ] T067 [US2] Integration Test: I/O Isolation - Test terminal reflects session only in backend/tests/integration/terminal-isolation.test.js - commands affect only own session - Yes
- [ ] T068 [US2] Implement WS Server - Create backend/src/api/websocket/index.js with ws library - N/A - Yes
- [ ] T069 [US2] Implement Terminal Handler - Create backend/src/api/websocket/terminal.js with identity validation - N/A - Yes
- [ ] T070 [US2] Implement Pod Bridge - Create backend/src/api/websocket/pod-bridge.js for exec I/O - N/A - Yes
- [ ] T071 [US2] Implement Close Codes - Create backend/src/api/websocket/close-codes.js per contract - N/A - No

### 5.2 Frontend Terminal

- [ ] T072 [P] [US2] Init Frontend - Create frontend/package.json with xterm.js dependency - N/A - No
- [ ] T073 [US2] Implement Terminal Component - Create frontend/src/terminal/Terminal.js with xterm.js - N/A - Yes
- [ ] T074 [US2] Implement Connection Manager - Create frontend/src/terminal/connection.js with WebSocket - N/A - Yes
- [ ] T075 [US2] Implement Resize Handler - Create frontend/src/terminal/resize.js - N/A - No

**Checkpoint**: User Story 2 complete - candidate can interact with terminal

---

## Phase 6: Observability & Status (Phase 3 in Plan)

**Purpose**: Backend-authoritative status, no frontend inference (FR-007)

### 6.1 Session Status Library

**CLI Contract**: `session-status get --session-id <uuid>`

- [ ] T076 [P] [US3] Contract Test: Status Get - Test status retrieval in packages/session-status/tests/contract/get.test.js - `session-status get --session-id <uuid>` → JSON with display_state - Yes
- [ ] T077 [P] [US3] Contract Test: Error State - Test error display_state in packages/session-status/tests/contract/get-error.test.js - failed session → display_state:"error" + error_reason - Yes
- [ ] T078 [US3] Integration Test: 5s Accuracy - Test status within 5s of change in backend/tests/integration/status-accuracy.test.js - SC-004 validation - Yes
- [ ] T079 [US3] Implement Status Logic - Create packages/session-status/src/index.js reading from DB - N/A - Yes
- [ ] T080 [US3] Implement Progress Calc - Create packages/session-status/src/progress.js for step calculation - N/A - Yes
- [ ] T081 [US3] Implement Display Mapping - Create packages/session-status/src/display.js (lifecycle → user-friendly) - N/A - Yes
- [ ] T082 [US3] Implement CLI - Create packages/session-status/src/cli.js - `session-status get` - Yes
- [ ] T083 [US3] Register CLI - Add bin entry to packages/session-status/package.json - N/A - No

### 6.2 Status API & WebSocket

- [ ] T084 [P] [US3] Contract Test: GET /status - Test status endpoint in backend/tests/contract/sessions.status.test.js - GET /sessions/:id/status → 200 + display_state - Yes
- [ ] T085 [P] [US3] Contract Test: WSS /status - Test status updates in backend/tests/contract/status.websocket.test.js - WSS /sessions/:id/status → status_update messages - Yes
- [ ] T086 [US3] Implement GET /status - Add route to backend/src/api/routes/sessions.js - N/A - Yes
- [ ] T087 [US3] Implement GET /:id - Add route to backend/src/api/routes/sessions.js - N/A - Yes
- [ ] T088 [US3] Implement Status WS - Create backend/src/api/websocket/status.js - N/A - Yes

### 6.3 Frontend Status

- [ ] T089 [P] [US3] Implement Status Display - Create frontend/src/status/StatusDisplay.js - N/A - Yes
- [ ] T090 [US3] Implement Progress Bar - Create frontend/src/status/ProgressBar.js - N/A - No
- [ ] T091 [US3] Implement Status Subscription - Create frontend/src/status/subscription.js for WS - N/A - Yes

**Checkpoint**: User Story 3 complete - candidate sees accurate status

---

## Phase 7: Session Termination & Cleanup (Phase 4 in Plan)

**Purpose**: Proper termination, resource release (FR-008, FR-009, FR-010)

### 7.1 Cleanup & TTL Library

**CLI Contract**: `cleanup-ttl check --session-id <uuid>` and `cleanup-ttl sweep [--dry-run]`

- [ ] T092 [P] [US4] Contract Test: Check Active - Test active session in packages/cleanup-ttl/tests/contract/check-active.test.js - should_cleanup:false for active - Yes
- [ ] T093 [P] [US4] Contract Test: Check Expired - Test expired session in packages/cleanup-ttl/tests/contract/check-expired.test.js - should_cleanup:true for expired - Yes
- [ ] T094 [P] [US4] Contract Test: Sweep - Test sweep operation in packages/cleanup-ttl/tests/contract/sweep.test.js - returns cleaned_session_ids - Yes
- [ ] T095 [US4] Implement Check Logic - Create packages/cleanup-ttl/src/index.js with TTL calculation - N/A - Yes
- [ ] T096 [US4] Implement Sweep Logic - Create packages/cleanup-ttl/src/sweep.js for batch cleanup - N/A - Yes
- [ ] T097 [US4] Implement CLI - Create packages/cleanup-ttl/src/cli.js (check, sweep) - `cleanup-ttl check|sweep` - Yes
- [ ] T098 [US4] Register CLI - Add bin entry to packages/cleanup-ttl/package.json - N/A - No

### 7.2 Termination Flow

- [ ] T099 [US4] Contract Test: POST /terminate - Test termination in backend/tests/contract/sessions.terminate.test.js - POST /sessions/:id/terminate → 200 + terminated_at - Yes
- [ ] T100 [US4] Integration Test: Full Termination - Test lifecycle → destroy → cleanup in backend/tests/integration/session-terminate.test.js - environment inaccessible within 30s - Yes
- [ ] T101 [US4] Failure Test: FS-2 Access After Term - Test access denied after termination in backend/tests/failure/access-after-termination.test.js - terminal access → 4006 - Yes
- [ ] T102 [US4] Implement Orchestrator Terminate - Create backend/src/orchestrator/terminate.js - N/A - Yes
- [ ] T103 [US4] Implement POST /terminate - Add route to backend/src/api/routes/sessions.js - N/A - Yes
- [ ] T104 [US4] Implement Termination Broadcast - Create backend/src/api/websocket/termination.js - N/A - Yes
- [ ] T105 [US4] Update Access Control - Add terminated session rejection to packages/environment-access/src/index.js - N/A - Yes

### 7.3 Frontend Termination

- [ ] T106 [US4] Implement Termination UI - Create frontend/src/status/Terminated.js with message - N/A - No

**Checkpoint**: User Story 4 complete - sessions terminate properly

---

## Phase 8: Failure Classification (Phase 4 in Plan continued)

**Purpose**: Classify failures, attach human-readable reasons (FR-012, FR-013, FS-1, FS-3)

### 8.1 Failure Classification Library

**CLI Contract**: `failure-classification classify --type <type> --context <json>`

- [ ] T107 [P] [US5] Contract Test: Classify Init - Test init failure in packages/failure-classification/tests/contract/classify-init.test.js - type:init → severity + user_message - Yes
- [ ] T108 [P] [US5] Contract Test: Classify Access - Test access failure in packages/failure-classification/tests/contract/classify-access.test.js - type:access → no leakage - Yes
- [ ] T109 [P] [US5] Contract Test: Classify Infra - Test infra failure in packages/failure-classification/tests/contract/classify-infra.test.js - type:infra → recoverable flag - Yes
- [ ] T110 [US5] Implement Classification Logic - Create packages/failure-classification/src/index.js - N/A - Yes
- [ ] T111 [US5] Implement Error Messages - Create packages/failure-classification/src/messages.js with user-friendly text - N/A - Yes
- [ ] T112 [US5] Implement CLI - Create packages/failure-classification/src/cli.js - `failure-classification classify` - Yes
- [ ] T113 [US5] Register CLI - Add bin entry to packages/failure-classification/package.json - N/A - No

---

## Phase 9: Concurrency & Load (Phase 7 in Plan)

**Purpose**: Multiple concurrent sessions without interference (FR-003, FR-004, NFR-006)

### 9.1 Concurrency Tests

- [ ] T114 [US5] Integration Test: Concurrent Create - Test 10 simultaneous starts in backend/tests/integration/concurrent-create.test.js - all get unique environments - Yes
- [ ] T115 [US5] Integration Test: Cross-Session Isolation - Test isolation in backend/tests/integration/cross-session-isolation.test.js - no visibility between sessions - Yes
- [ ] T116 [US5] Load Test: 50 Sessions - Test SC-003 in backend/tests/load/concurrent-sessions.test.js - creation <60s under load - Yes
- [ ] T117 [US5] Failure Test: FS-2 Cross Access - Test unauthorized access in backend/tests/failure/cross-session-access.test.js - 403 + no leakage - Yes

### 9.2 Concurrency Hardening

- [ ] T118 [US5] Unique Active Constraint - Create backend/db/migrations/005_unique_active_session.sql - N/A - Yes
- [ ] T119 [US5] Optimistic Locking - Add version column and locking to packages/session-lifecycle/src/index.js - N/A - Yes
- [ ] T120 [US5] Access Logging - Add log recording to packages/environment-access/src/index.js - N/A - Yes

### 9.3 Error Responses

- [ ] T121 [US5] Explicit Errors - Implement all error codes in backend/src/api/routes/sessions.js - N/A - Yes
- [ ] T122 [US5] Frontend Error Display - Create frontend/src/status/Error.js with recovery actions - N/A - No

**Checkpoint**: User Story 5 complete - concurrent sessions work safely

---

## Phase 10: Polish & Cross-Cutting

**Purpose**: Quality improvements across all stories

- [ ] T123 [P] Add Structured Logging - Add user_id + session_id to all library logs - N/A - No
- [ ] T124 [P] Generate OpenAPI - Create backend/src/api/openapi.js from contracts - N/A - No
- [ ] T125 [P] Validate Quickstart - Run all CLI examples from quickstart.md - N/A - Yes
- [ ] T126 [P] Cleanup Cron - Create backend/src/jobs/cleanup.js for sweep scheduling - N/A - Yes
- [ ] T127 Security Audit - Verify no information leakage on all denial paths - N/A - Yes
- [ ] T128 Performance Profile - Measure 50-session concurrency performance - N/A - Yes

---

## Requirement Traceability Matrix

| Requirement | Tasks |
|-------------|-------|
| FR-001 (Create Session) | T029-T034, T057-T064 |
| FR-002 (Own Environment Only) | T050-T056, T117 |
| FR-003 (Session Isolation) | T042-T049, T114-T116 |
| FR-004 (Scoped State) | T042-T049, T115 |
| FR-005 (Terminal Interaction) | T065-T075 |
| FR-006 (Session-Only I/O) | T067, T070 |
| FR-007 (Status Visibility) | T076-T091 |
| FR-008 (Session Termination) | T092-T106 |
| FR-009 (Env Inaccessible) | T101, T105 |
| FR-010 (Release Resources) | T095-T096 |
| FR-011 (Deny + No Leak) | T051-T052, T117 |
| FR-012 (Clear Error) | T058, T107-T113 |
| FR-013 (Explicit Failures) | T107-T113 |
| NFR-001 (Explicit Identity) | T010, T029-T034 |
| NFR-002 (No Implicit Identity) | T028, T032-T033 |
| NFR-003 (Defined Lifecycle) | T035-T041 |
| NFR-004 (Observable Lifecycle) | T076-T088 |
| NFR-005 (Report Failure Reason) | T107-T113 |
| NFR-006 (Concurrent Sessions) | T114-T122 |

## Failure Scenario Coverage

| Scenario | Tasks |
|----------|-------|
| FS-1: Session Init Failure | T058, T107 |
| FS-2: Cross-Session Access | T051-T052, T101, T117 |
| FS-3: Backend Unavailable | T108-T109 |

---

## Dependencies & Execution Order

```
Phase -1: Gates → No dependencies (BLOCKS ALL)
Phase 0: Setup → Gates passed
Phase 1: Foundation → Setup complete (BLOCKS user stories)
Phase 2: Core Libraries → Foundation complete
Phase 3: Execution Environment → Phase 2 complete
Phase 4: Orchestration → Phase 3 complete → US1 COMPLETE
Phase 5: Terminal → Phase 4 complete → US2 COMPLETE
Phase 6: Status → Phase 1 complete (parallel with US1/US2) → US3 COMPLETE
Phase 7: Termination → US1 complete → US4 COMPLETE
Phase 8: Failure Classification → US4 complete
Phase 9: Concurrency → US1, US2, US4 complete → US5 COMPLETE
Phase 10: Polish → All user stories complete
```

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 128 |
| **Phase -1 (Gates)** | 5 |
| **Phase 0 (Setup)** | 6 |
| **Phase 1 (Foundation)** | 17 |
| **Phase 2-3 (Core Libraries)** | 28 |
| **Phase 4 (Orchestration)** | 8 |
| **Phase 5 (Terminal)** | 11 |
| **Phase 6 (Status)** | 16 |
| **Phase 7 (Termination)** | 15 |
| **Phase 8 (Failure)** | 7 |
| **Phase 9 (Concurrency)** | 9 |
| **Phase 10 (Polish)** | 6 |
| **Parallelizable [P]** | 38 |
| **Tests Required** | 87 |
| **CLI Contracts** | 14 |

### MVP Scope (US1 + US2)

Tasks T001-T075 (75 tasks) deliver:
- Session creation with isolated environment
- Terminal interaction with session isolation
- Full TDD coverage

### TDD Workflow

1. Write contract test → **MUST FAIL**
2. Define CLI contract in cli.js
3. Implement logic in index.js
4. Run test → **MUST PASS**
5. Write integration test
6. Commit
