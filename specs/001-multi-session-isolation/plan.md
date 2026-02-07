# Implementation Plan: Multi-Session Exam Isolation

**Branch**: `001-multi-session-isolation` | **Date**: 2026-02-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-multi-session-isolation/spec.md`

## Summary

Produce a multi-session Kubernetes exam system where each exam session is fully
isolated, observable, testable, and lifecycle-driven. The system is implemented
as a set of composable libraries, each exposing CLI interfaces, following strict
Test-Driven Development. Session identity is always explicit, and no shared
runtime resources are permitted.

## Technical Context

**Language/Version**: JavaScript (Node.js LTS)
**Primary Dependencies**: Express/Fastify (API), commander/yargs (CLI), ws (WebSockets), xterm.js (terminal)
**Storage**: PostgreSQL (session lifecycle state, source of truth)
**Testing**: Jest or Vitest (contract, integration, failure injection tests)
**Target Platform**: Linux server (Kubernetes-managed containers)
**Project Type**: Web application (backend libraries + thin API layer + frontend terminal)
**Performance Goals**: 50+ concurrent exam sessions, session creation <60 seconds
**Constraints**: One session = one container, no shared containers/volumes, explicit identity required
**Scale/Scope**: Multi-user concurrent exams, real container isolation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Library-First | Every feature as standalone library | ✅ PASS | 8 libraries defined (Identity, Lifecycle, Environment, Access Control, Orchestrator, Status, Failure, Cleanup) |
| II. CLI Interface | Every library exposes CLI | ✅ PASS | All libraries have documented CLI contracts |
| III. Test-First | Tests written before implementation | ✅ PASS | Contract tests → Integration tests → Failure tests (mandatory order) |
| IV. Session Isolation | One session = one environment | ✅ PASS | Enforced by Environment Library, no shared containers |
| V. Explicit Identity | user_id, exam_session_id, execution_environment_id | ✅ PASS | Identity Library validates presence, fails if missing |
| VI. Backend Source of Truth | Backend owns lifecycle state | ✅ PASS | Status Library is authoritative, no frontend inference |
| VII. Simplicity | Max 3 projects initially | ✅ PASS | Libraries + Backend + Frontend = 3 projects |
| VIII. Anti-Abstraction | Framework primitives over wrappers | ✅ PASS | Direct pg client, native WebSockets, no custom wrappers |
| IX. Integration-First | Real databases, containers, WebSockets | ✅ PASS | Mocks forbidden for session isolation tests |

**Gate Status**: ✅ ALL GATES PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-session-isolation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (CLI contracts, API specs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/
├── session-identity/        # 0.1 Session Identity Library
│   ├── src/
│   │   ├── index.js         # Library exports
│   │   └── cli.js           # CLI entrypoint
│   └── tests/
│       ├── contract/
│       └── unit/
├── session-lifecycle/       # 0.2 Session Lifecycle Library
│   ├── src/
│   │   ├── index.js
│   │   └── cli.js
│   └── tests/
├── execution-environment/   # 1.1 Execution Environment Library
│   ├── src/
│   │   ├── index.js
│   │   └── cli.js
│   └── tests/
├── environment-access/      # 1.2 Environment Access Control Library
│   ├── src/
│   │   ├── index.js
│   │   └── cli.js
│   └── tests/
├── session-status/          # 3.1 Session Status Library
│   ├── src/
│   │   ├── index.js
│   │   └── cli.js
│   └── tests/
├── failure-classification/  # 4.1 Failure Classification Library
│   ├── src/
│   │   ├── index.js
│   │   └── cli.js
│   └── tests/
└── cleanup-ttl/             # 4.2 Cleanup & TTL Library
    ├── src/
    │   ├── index.js
    │   └── cli.js
    └── tests/

backend/
├── src/
│   ├── orchestrator/        # 2.1 Session Orchestrator (composition layer)
│   │   └── index.js
│   ├── api/                 # 5.1 API Gateway (thin layer)
│   │   ├── routes/
│   │   └── websocket/
│   └── index.js
└── tests/
    ├── contract/
    ├── integration/
    └── failure/

frontend/
├── src/
│   ├── terminal/            # xterm.js integration
│   └── status/              # Session status display
└── tests/
```

**Structure Decision**: Monorepo with library packages + backend + frontend.
Libraries are independent and expose CLIs. Backend composes libraries via
the orchestrator. Frontend is a thin terminal UI that connects to backend.

## Library Architecture

### Phase 0: Core Domain Libraries

#### 0.1 Session Identity Library (`packages/session-identity`)

| Aspect | Definition |
|--------|------------|
| **Responsibility** | Define canonical session identity model; Validate explicit identity presence |
| **Guarantees** | No implicit user or session context; Identity must be supplied or execution fails |
| **CLI Contract** | `session-identity validate --user-id <id> --session-id <id>` |
| **Input** | user_id, exam_session_id |
| **Output** | Validated identity object (JSON) or explicit error |

#### 0.2 Session Lifecycle Library (`packages/session-lifecycle`)

| Aspect | Definition |
|--------|------------|
| **Responsibility** | Define allowed lifecycle states; Enforce deterministic transitions |
| **States** | created → initializing → ready → running → terminated (or failed) |
| **Guarantees** | Illegal transitions rejected; Lifecycle externally observable |
| **CLI Contract** | `session-lifecycle transition --session-id <id> --to <state>` |
| **Input** | session_id, desired transition |
| **Output** | Updated state (JSON) or explicit error |

### Phase 1: Execution Environment Management

#### 1.1 Execution Environment Library (`packages/execution-environment`)

| Aspect | Definition |
|--------|------------|
| **Responsibility** | Create and destroy isolated execution environments; Enforce 1:1 session-environment mapping |
| **Guarantees** | One session == one environment; No reuse across sessions; Environment cannot exist without session |
| **CLI Contract** | `execution-environment create --session-id <id>` |
|                  | `execution-environment status --session-id <id>` |
|                  | `execution-environment destroy --session-id <id>` |

#### 1.2 Environment Access Control Library (`packages/environment-access`)

| Aspect | Definition |
|--------|------------|
| **Responsibility** | Gate access to execution environments; Prevent cross-session access |
| **Guarantees** | Access denied if session_id mismatch; No environment enumeration allowed |
| **CLI Contract** | `environment-access authorize --session-id <id> --user-id <id>` |
|                  | `environment-access deny --reason <message>` |

### Phase 2: Session Orchestration

#### 2.1 Session Orchestrator (`backend/src/orchestrator`)

| Aspect | Definition |
|--------|------------|
| **Responsibility** | Coordinate libraries (not own logic); Drive session lifecycle end-to-end |
| **Flow** | 1. Validate identity → 2. Create session → 3. Provision environment → 4. Transition to ready → 5. Expose status |
| **Guarantees** | No hidden state; All failures surfaced explicitly; Orchestrator is stateless |

### Phase 3: Observability & Status

#### 3.1 Session Status Library (`packages/session-status`)

| Aspect | Definition |
|--------|------------|
| **Responsibility** | Provide authoritative session status; Power frontend progress indicators |
| **Guarantees** | Backend is source of truth; No guessed/inferred status; No infinite loading states |
| **CLI Contract** | `session-status get --session-id <id>` |
| **Output** | Lifecycle state + reason if blocked (JSON) |

### Phase 4: Failure Handling & Cleanup

#### 4.1 Failure Classification Library (`packages/failure-classification`)

| Aspect | Definition |
|--------|------------|
| **Responsibility** | Classify failures (init, runtime, access, infra); Attach human-readable reasons |
| **Guarantees** | Failures are loud; Failures are explainable |
| **CLI Contract** | `failure-classification classify --type <type> --context <json>` |

#### 4.2 Cleanup & TTL Library (`packages/cleanup-ttl`)

| Aspect | Definition |
|--------|------------|
| **Responsibility** | Enforce session termination; Clean up abandoned environments |
| **Guarantees** | No orphaned environments; No zombie sessions |
| **CLI Contract** | `cleanup-ttl check --session-id <id>` |
|                  | `cleanup-ttl sweep` |

### Phase 5: Integration Surface

#### 5.1 API Gateway (`backend/src/api`)

| Aspect | Definition |
|--------|------------|
| **Responsibility** | Translate HTTP/WebSocket requests to library calls; Never contain business logic |
| **Guarantees** | Stateless; Identity always explicit; Backend-driven truth only |

## Testing Strategy

*Per Article III (Test-First) and Article IX (Integration-First)*

### Test Phases (MANDATORY ORDER)

| Phase | Type | Description | Requirements |
|-------|------|-------------|--------------|
| A | Contract Tests | Validate CLI inputs/outputs; Validate lifecycle transitions | MUST FAIL initially |
| B | Integration Tests | Real execution environments; Real concurrency | No mocks for session isolation |
| C | Failure Injection | Startup failure; Mid-session crash; Unauthorized access; Backend unavailable | Real failure scenarios |

### Concurrency & Load Validation

| Scenario | Guarantee |
|----------|-----------|
| Multiple users start exams simultaneously | No cross-session leakage |
| Session termination during active use | Deterministic cleanup |
| Reconnect attempts with stale identity | Identity revalidation required |

## Explicit Non-Plan Items (Guardrails)

- ❌ No shared terminals
- ❌ No shared containers
- ❌ No global in-memory session registry
- ❌ No frontend-derived session state
- ❌ No "best-effort" recovery logic

## Complexity Tracking

*No violations to justify - all constitutional gates pass.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | - | - |

## Deliverables

1. Library CLIs with documented contracts
2. Approved failing tests for all libraries
3. Stateless orchestration layer
4. Explicit session lifecycle model
5. Observable failure modes
