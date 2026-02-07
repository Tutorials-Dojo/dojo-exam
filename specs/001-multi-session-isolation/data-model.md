# Data Model: Multi-Session Exam Isolation

**Feature**: 001-multi-session-isolation
**Date**: 2026-02-07

## Entity Relationship Diagram

```
┌─────────────────┐       1:N       ┌─────────────────┐
│  ExamCandidate  │────────────────▶│   ExamSession   │
│    (user_id)    │                 │(exam_session_id)│
└─────────────────┘                 └────────┬────────┘
                                             │
                                             │ 1:1
                                             ▼
                                    ┌─────────────────────┐
                                    │ExecutionEnvironment │
                                    │(environment_id)     │
                                    └─────────────────────┘
```

## Entities

### ExamCandidate

Represents an authenticated user who can take exams.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| user_id | UUID | PRIMARY KEY | Unique identifier for the candidate |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | When the user record was created |

**Validation Rules**:
- user_id must be a valid UUID (format validation)
- user_id must be provided explicitly (no inference)

**Notes**: This entity may already exist in the authentication system. The session isolation feature references it but does not own it.

---

### ExamSession

Represents a single exam attempt by a candidate.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| exam_session_id | UUID | PRIMARY KEY | Unique identifier for the session |
| user_id | UUID | NOT NULL, FOREIGN KEY | Reference to the candidate |
| exam_id | UUID | NOT NULL | Reference to the exam being taken |
| lifecycle_state | ENUM | NOT NULL | Current state in the lifecycle |
| lifecycle_reason | TEXT | NULLABLE | Reason for current state (especially for failed) |
| started_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | When the session was created |
| ready_at | TIMESTAMP | NULLABLE | When the environment became ready |
| terminated_at | TIMESTAMP | NULLABLE | When the session ended |
| duration_seconds | INTEGER | NOT NULL | Allowed exam duration |

**Lifecycle States**:
```
ENUM lifecycle_state:
  - created       # Session record created, environment not yet provisioned
  - initializing  # Environment provisioning in progress
  - ready         # Environment ready, waiting for candidate interaction
  - running       # Candidate actively using the environment
  - terminated    # Session completed normally
  - failed        # Session failed due to error
```

**State Transitions** (enforced by Session Lifecycle Library):
```
created      → initializing | failed
initializing → ready | failed
ready        → running | terminated | failed
running      → terminated | failed
terminated   → (terminal state)
failed       → (terminal state)
```

**Validation Rules**:
- exam_session_id must be a valid UUID
- user_id must exist and be valid
- Only one session per user can be in non-terminal state at a time
- lifecycle_state transitions must follow the state machine

**Indexes**:
- `idx_session_user_active`: (user_id, lifecycle_state) WHERE lifecycle_state NOT IN ('terminated', 'failed')
- `idx_session_state`: (lifecycle_state) for cleanup queries

---

### ExecutionEnvironment

Represents the isolated runtime environment for a session.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| environment_id | UUID | PRIMARY KEY | Unique identifier for the environment |
| exam_session_id | UUID | NOT NULL, UNIQUE, FOREIGN KEY | One-to-one with session |
| pod_name | VARCHAR(253) | NOT NULL | Kubernetes pod name |
| pod_namespace | VARCHAR(63) | NOT NULL | Kubernetes namespace |
| container_status | VARCHAR(50) | NOT NULL | Current container state |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | When provisioning started |
| ready_at | TIMESTAMP | NULLABLE | When container became ready |
| destroyed_at | TIMESTAMP | NULLABLE | When container was destroyed |

**Container Status Values**:
```
- pending     # Pod scheduled, not yet running
- creating    # Container being created
- running     # Container running and accessible
- terminating # Container being destroyed
- destroyed   # Container no longer exists
- error       # Container failed to start or crashed
```

**Validation Rules**:
- environment_id must be a valid UUID
- exam_session_id must reference exactly one session (1:1)
- pod_name must be valid Kubernetes name (lowercase, alphanumeric, hyphens)
- No two environments can share the same pod_name within a namespace

**Indexes**:
- `idx_environment_session`: (exam_session_id) UNIQUE
- `idx_environment_status`: (container_status) for cleanup queries

---

### SessionAccessLog (Audit Entity)

Records all access attempts for security auditing.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| log_id | UUID | PRIMARY KEY | Unique log entry ID |
| exam_session_id | UUID | NOT NULL | Session being accessed |
| requesting_user_id | UUID | NOT NULL | User making the request |
| access_type | VARCHAR(50) | NOT NULL | Type of access (terminal, status, etc.) |
| access_result | ENUM | NOT NULL | granted, denied |
| denial_reason | TEXT | NULLABLE | Why access was denied |
| timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | When the access attempt occurred |
| client_ip | INET | NULLABLE | Client IP address |

**Access Results**:
```
ENUM access_result:
  - granted  # Access was authorized
  - denied   # Access was denied (user_id mismatch, session terminated, etc.)
```

**Validation Rules**:
- Both exam_session_id and requesting_user_id must be valid UUIDs
- denial_reason is required when access_result is 'denied'

---

## Database Schema (PostgreSQL)

```sql
-- Lifecycle state enumeration
CREATE TYPE lifecycle_state AS ENUM (
    'created',
    'initializing',
    'ready',
    'running',
    'terminated',
    'failed'
);

-- Access result enumeration
CREATE TYPE access_result AS ENUM (
    'granted',
    'denied'
);

-- Exam sessions table
CREATE TABLE exam_sessions (
    exam_session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exam_id UUID NOT NULL,
    lifecycle_state lifecycle_state NOT NULL DEFAULT 'created',
    lifecycle_reason TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ready_at TIMESTAMP WITH TIME ZONE,
    terminated_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER NOT NULL,

    CONSTRAINT valid_duration CHECK (duration_seconds > 0)
);

CREATE INDEX idx_session_user_active ON exam_sessions (user_id, lifecycle_state)
    WHERE lifecycle_state NOT IN ('terminated', 'failed');
CREATE INDEX idx_session_state ON exam_sessions (lifecycle_state);

-- Execution environments table
CREATE TABLE execution_environments (
    environment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_session_id UUID NOT NULL UNIQUE REFERENCES exam_sessions(exam_session_id),
    pod_name VARCHAR(253) NOT NULL,
    pod_namespace VARCHAR(63) NOT NULL,
    container_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ready_at TIMESTAMP WITH TIME ZONE,
    destroyed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT unique_pod UNIQUE (pod_namespace, pod_name)
);

CREATE INDEX idx_environment_session ON execution_environments (exam_session_id);
CREATE INDEX idx_environment_status ON execution_environments (container_status);

-- Session access log table
CREATE TABLE session_access_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_session_id UUID NOT NULL,
    requesting_user_id UUID NOT NULL,
    access_type VARCHAR(50) NOT NULL,
    access_result access_result NOT NULL,
    denial_reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    client_ip INET,

    CONSTRAINT denial_reason_required CHECK (
        (access_result = 'granted') OR (denial_reason IS NOT NULL)
    )
);

CREATE INDEX idx_access_log_session ON session_access_logs (exam_session_id);
CREATE INDEX idx_access_log_timestamp ON session_access_logs (timestamp);
```

## Identity Composition

Per Article V (Explicit Identity), every operation requires the composite identity:

```typescript
interface SessionIdentity {
  user_id: string;           // UUID - who is this
  exam_session_id: string;   // UUID - which session
  environment_id?: string;   // UUID - which environment (once provisioned)
}
```

**Validation in Session Identity Library**:
- All three fields must be present when accessing the environment
- user_id + exam_session_id required for session operations
- Validation fails loudly with structured error if any field missing
