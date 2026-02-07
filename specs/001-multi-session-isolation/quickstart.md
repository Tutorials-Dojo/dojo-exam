# Quickstart: Multi-Session Exam Isolation

**Feature**: 001-multi-session-isolation
**Date**: 2026-02-07

This guide walks through the complete flow of starting, using, and terminating
an exam session using the CLI tools and API.

## Prerequisites

- Node.js LTS installed
- PostgreSQL running (localhost:5432)
- Kubernetes cluster available (k3d for local development)
- All library packages installed

## 1. Validate Identity

Before any operation, validate the session identity:

```bash
# Validate user identity
npx session-identity validate \
  --user-id "550e8400-e29b-41d4-a716-446655440000" \
  --session-id "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
```

**Expected output**:
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

## 2. Create Session and Environment

### 2.1 Create the session (lifecycle: created)

```bash
# Transition to created state (typically done by orchestrator)
npx session-lifecycle transition \
  --session-id "6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  --to created
```

### 2.2 Provision execution environment

```bash
# Create isolated container for the session
npx execution-environment create \
  --session-id "6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  --timeout 60
```

**Expected output**:
```json
{
  "environment_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "pod_name": "exam-6ba7b810",
  "pod_namespace": "exam-sessions",
  "status": "running",
  "ready_at": "2026-02-07T10:28:45.000Z"
}
```

### 2.3 Transition to ready

```bash
npx session-lifecycle transition \
  --session-id "6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  --to ready
```

## 3. Check Session Status

```bash
npx session-status get \
  --session-id "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
```

**Expected output**:
```json
{
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "display_state": "ready",
  "message": "Your exam environment is ready",
  "environment_ready": true,
  "remaining_seconds": 7200
}
```

## 4. Authorize Access

Before allowing terminal connection:

```bash
npx environment-access authorize \
  --session-id "6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  --user-id "550e8400-e29b-41d4-a716-446655440000"
```

**Expected output**:
```json
{
  "authorized": true,
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 5. Start Exam (Transition to Running)

```bash
npx session-lifecycle transition \
  --session-id "6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  --to running
```

## 6. Connect to Terminal via API

```bash
# Using websocat for demonstration
websocat -H "Authorization: Bearer <token>" \
  "wss://localhost:3000/v1/sessions/6ba7b810-9dad-11d1-80b4-00c04fd430c8/terminal"
```

## 7. Terminate Session

When exam time expires or candidate submits:

```bash
# Transition to terminated
npx session-lifecycle transition \
  --session-id "6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  --to terminated \
  --reason "Exam time expired"

# Destroy the execution environment
npx execution-environment destroy \
  --session-id "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
```

## 8. Cleanup Check

Verify resources are released:

```bash
npx cleanup-ttl check \
  --session-id "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
```

**Expected output** (after termination):
```json
{
  "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "should_cleanup": false,
  "reason": "Session already terminated and cleaned",
  "ttl_remaining_seconds": 0
}
```

## Complete API Flow

Using curl to demonstrate the HTTP API:

```bash
# 1. Create session
curl -X POST http://localhost:3000/v1/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"exam_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'

# 2. Check status (poll until ready)
curl http://localhost:3000/v1/sessions/6ba7b810-9dad-11d1-80b4-00c04fd430c8/status \
  -H "Authorization: Bearer <token>"

# 3. Connect terminal (WebSocket - use wscat/websocat)
# 4. Work on exam

# 5. Terminate when done
curl -X POST http://localhost:3000/v1/sessions/6ba7b810-9dad-11d1-80b4-00c04fd430c8/terminate \
  -H "Authorization: Bearer <token>"
```

## Error Scenarios

### Unauthorized Access Attempt

```bash
# User A tries to access User B's session
npx environment-access authorize \
  --session-id "user-b-session-id" \
  --user-id "user-a-id"
```

**Expected output** (exit code 5):
```json
{
  "error": true,
  "code": "ACCESS_DENIED",
  "message": "Access denied",
  "details": {}
}
```

### Invalid Lifecycle Transition

```bash
# Try to go from terminated back to running
npx session-lifecycle transition \
  --session-id "6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  --to running
```

**Expected output** (exit code 6):
```json
{
  "error": true,
  "code": "INVALID_TRANSITION",
  "message": "Cannot transition from 'terminated' to 'running'",
  "details": {
    "current_state": "terminated",
    "allowed_transitions": []
  }
}
```

### Missing Identity

```bash
# Call without required user_id
npx session-identity validate --session-id "some-session"
```

**Expected output** (exit code 3):
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

## Development Setup

```bash
# 1. Start dependencies
docker-compose up -d postgres
k3d cluster create exam-dev

# 2. Run database migrations
npm run db:migrate

# 3. Start the backend
npm run dev

# 4. In another terminal, start the frontend
cd frontend && npm run dev

# 5. Run tests
npm test
```

## Verification Checklist

- [ ] Identity validation fails when user_id missing
- [ ] Identity validation fails when session_id missing
- [ ] Lifecycle rejects invalid transitions
- [ ] Environment create provisions isolated pod
- [ ] Environment destroy removes pod completely
- [ ] Access control denies mismatched user/session
- [ ] Access denial leaks no session information
- [ ] Session status reflects backend state accurately
- [ ] Terminal connection requires authorization
- [ ] Terminated sessions cannot be accessed
