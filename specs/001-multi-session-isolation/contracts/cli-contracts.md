# CLI Contracts: Multi-Session Exam Isolation

**Feature**: 001-multi-session-isolation
**Date**: 2026-02-07

All libraries expose CLI interfaces per Article II (CLI Interface Mandate).

## Common Conventions

- **Input**: Command-line arguments (flags and positional)
- **Output**: JSON to stdout (structured data)
- **Errors**: JSON to stderr with exit code > 0
- **Format**: All UUIDs are RFC 4122 v4

### Standard Error Format

```json
{
  "error": true,
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {}
}
```

### Standard Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Validation failure |
| 4 | Resource not found |
| 5 | Access denied |
| 6 | State transition error |

---

## session-identity

Validates explicit identity presence.

### `session-identity validate`

Validates that all required identity components are present and valid.

```bash
session-identity validate \
  --user-id <uuid> \
  --session-id <uuid> \
  [--environment-id <uuid>]
```

**Arguments**:
| Flag | Required | Description |
|------|----------|-------------|
| --user-id | Yes | User identifier (UUID) |
| --session-id | Yes | Session identifier (UUID) |
| --environment-id | No | Environment identifier (UUID) |

**Success Output** (exit 0):
```json
{
  "valid": true,
  "identity": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "exam_session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "environment_id": null
  }
}
```

**Error Output** (exit 3):
```json
{
  "error": true,
  "code": "INVALID_IDENTITY",
  "message": "Missing required identity component: user_id",
  "details": {
    "missing_fields": ["user_id"]
  }
}
```

---

## session-lifecycle

Manages session lifecycle state transitions.

### `session-lifecycle transition`

Transitions a session to a new lifecycle state.

```bash
session-lifecycle transition \
  --session-id <uuid> \
  --to <state> \
  [--reason <text>]
```

**Arguments**:
| Flag | Required | Description |
|------|----------|-------------|
| --session-id | Yes | Session identifier (UUID) |
| --to | Yes | Target state (created, initializing, ready, running, terminated, failed) |
| --reason | No | Reason for transition (required for 'failed') |

**Success Output** (exit 0):
```json
{
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "previous_state": "initializing",
  "current_state": "ready",
  "transitioned_at": "2026-02-07T10:30:00.000Z"
}
```

**Error Output** (exit 6):
```json
{
  "error": true,
  "code": "INVALID_TRANSITION",
  "message": "Cannot transition from 'terminated' to 'running'",
  "details": {
    "current_state": "terminated",
    "requested_state": "running",
    "allowed_transitions": []
  }
}
```

### `session-lifecycle status`

Gets the current lifecycle state of a session.

```bash
session-lifecycle status --session-id <uuid>
```

**Success Output** (exit 0):
```json
{
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "state": "running",
  "reason": null,
  "started_at": "2026-02-07T10:25:00.000Z",
  "last_transition_at": "2026-02-07T10:30:00.000Z"
}
```

---

## execution-environment

Manages isolated execution environments.

### `execution-environment create`

Creates a new execution environment for a session.

```bash
execution-environment create \
  --session-id <uuid> \
  [--timeout <seconds>]
```

**Arguments**:
| Flag | Required | Description |
|------|----------|-------------|
| --session-id | Yes | Session identifier (UUID) |
| --timeout | No | Creation timeout in seconds (default: 60) |

**Success Output** (exit 0):
```json
{
  "environment_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "pod_name": "exam-6ba7b810",
  "pod_namespace": "exam-sessions",
  "status": "running",
  "created_at": "2026-02-07T10:28:00.000Z",
  "ready_at": "2026-02-07T10:28:45.000Z"
}
```

**Error Output** (exit 1):
```json
{
  "error": true,
  "code": "ENVIRONMENT_CREATE_FAILED",
  "message": "Failed to create execution environment",
  "details": {
    "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "reason": "Pod creation timeout after 60 seconds"
  }
}
```

### `execution-environment status`

Gets the current status of an execution environment.

```bash
execution-environment status --session-id <uuid>
```

**Success Output** (exit 0):
```json
{
  "environment_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "pod_name": "exam-6ba7b810",
  "pod_namespace": "exam-sessions",
  "status": "running",
  "ready": true
}
```

### `execution-environment destroy`

Destroys an execution environment.

```bash
execution-environment destroy --session-id <uuid>
```

**Success Output** (exit 0):
```json
{
  "environment_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "destroyed_at": "2026-02-07T11:30:00.000Z"
}
```

---

## environment-access

Controls access to execution environments.

### `environment-access authorize`

Checks if a user is authorized to access a session's environment.

```bash
environment-access authorize \
  --session-id <uuid> \
  --user-id <uuid>
```

**Success Output** (exit 0):
```json
{
  "authorized": true,
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Denied Output** (exit 5):
```json
{
  "error": true,
  "code": "ACCESS_DENIED",
  "message": "Access denied",
  "details": {}
}
```

**Note**: When access is denied, no information about the session is leaked. The details object is intentionally empty.

---

## session-status

Provides authoritative session status for frontend display.

### `session-status get`

Gets the current session status for display.

```bash
session-status get --session-id <uuid>
```

**Success Output** (exit 0):
```json
{
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "display_state": "ready",
  "message": "Your exam environment is ready",
  "progress": {
    "current_step": 3,
    "total_steps": 3,
    "step_description": "Environment ready"
  },
  "environment_ready": true,
  "remaining_seconds": 7200,
  "updated_at": "2026-02-07T10:30:00.000Z"
}
```

**Blocked/Error Output** (exit 0, but with error state):
```json
{
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "display_state": "error",
  "message": "Failed to start your exam environment",
  "error_reason": "Container creation timeout",
  "recoverable": false,
  "updated_at": "2026-02-07T10:29:00.000Z"
}
```

---

## failure-classification

Classifies and describes failures.

### `failure-classification classify`

Classifies a failure and provides human-readable description.

```bash
failure-classification classify \
  --type <failure_type> \
  --context <json>
```

**Arguments**:
| Flag | Required | Description |
|------|----------|-------------|
| --type | Yes | Failure type: init, runtime, access, infra |
| --context | Yes | JSON object with failure context |

**Success Output** (exit 0):
```json
{
  "type": "init",
  "severity": "high",
  "message": "Failed to start exam environment",
  "user_message": "We couldn't start your exam environment. Please try again or contact support.",
  "technical_details": "Pod creation failed: ImagePullBackOff",
  "recoverable": true,
  "recovery_action": "retry"
}
```

---

## cleanup-ttl

Manages session cleanup and TTL enforcement.

### `cleanup-ttl check`

Checks if a session should be cleaned up.

```bash
cleanup-ttl check --session-id <uuid>
```

**Success Output** (exit 0):
```json
{
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "should_cleanup": false,
  "reason": "Session still active",
  "ttl_remaining_seconds": 3600
}
```

### `cleanup-ttl sweep`

Sweeps and cleans up expired/abandoned sessions.

```bash
cleanup-ttl sweep [--dry-run]
```

**Success Output** (exit 0):
```json
{
  "sweep_started_at": "2026-02-07T12:00:00.000Z",
  "sweep_completed_at": "2026-02-07T12:00:15.000Z",
  "sessions_checked": 150,
  "sessions_cleaned": 5,
  "cleaned_session_ids": [
    "session-id-1",
    "session-id-2",
    "session-id-3",
    "session-id-4",
    "session-id-5"
  ],
  "dry_run": false
}
```
