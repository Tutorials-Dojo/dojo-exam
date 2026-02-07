# API Contracts: Multi-Session Exam Isolation

**Feature**: 001-multi-session-isolation
**Date**: 2026-02-07

The API Gateway (backend/src/api) exposes HTTP and WebSocket endpoints.
All endpoints delegate to library CLIs; no business logic in routes.

## Base URL

```
https://api.example.com/v1
```

## Authentication

All requests require a valid `Authorization: Bearer <token>` header.
The token must contain the `user_id` claim.

## Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

---

## HTTP Endpoints

### POST /sessions

Creates a new exam session.

**Request**:
```json
{
  "exam_id": "uuid"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "exam_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "created",
    "websocket_url": "wss://api.example.com/v1/sessions/6ba7b810-9dad-11d1-80b4-00c04fd430c8/terminal"
  }
}
```

**Errors**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| ACTIVE_SESSION_EXISTS | 409 Conflict | User already has an active session |
| INVALID_EXAM_ID | 400 Bad Request | Exam ID not found or invalid |
| SESSION_CREATE_FAILED | 500 Internal Server Error | Failed to create session |

---

### GET /sessions/:session_id

Gets session details and current status.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "exam_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "lifecycle_state": "running",
    "started_at": "2026-02-07T10:25:00.000Z",
    "remaining_seconds": 7200,
    "environment": {
      "ready": true,
      "environment_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
    }
  }
}
```

**Errors**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| SESSION_NOT_FOUND | 404 Not Found | Session does not exist |
| ACCESS_DENIED | 403 Forbidden | User not authorized for this session |

**Note**: ACCESS_DENIED returns no session details (no information leakage).

---

### GET /sessions/:session_id/status

Gets session status for frontend display (progress indicators).

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "display_state": "ready",
    "message": "Your exam environment is ready",
    "progress": {
      "current_step": 3,
      "total_steps": 3,
      "step_description": "Environment ready"
    },
    "environment_ready": true,
    "remaining_seconds": 7200
  }
}
```

**Display States**:
| State | Description |
|-------|-------------|
| creating | Session being created |
| initializing | Environment being provisioned |
| ready | Environment ready, can start |
| running | Exam in progress |
| terminated | Exam completed |
| error | Something went wrong |

---

### POST /sessions/:session_id/terminate

Terminates an active session.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "terminated_at": "2026-02-07T12:30:00.000Z"
  }
}
```

**Errors**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| SESSION_NOT_FOUND | 404 Not Found | Session does not exist |
| ACCESS_DENIED | 403 Forbidden | User not authorized |
| SESSION_ALREADY_TERMINATED | 400 Bad Request | Session already ended |

---

## WebSocket Endpoints

### WSS /sessions/:session_id/terminal

Establishes terminal connection for interactive environment access.

**Connection Flow**:
1. Client connects with `Authorization` header
2. Server validates identity (session_id + user_id from token)
3. On success: Connection established, terminal I/O begins
4. On failure: Connection closed with error code

**WebSocket Close Codes**:
| Code | Description |
|------|-------------|
| 1000 | Normal closure (session terminated) |
| 4001 | Authentication failed |
| 4003 | Access denied (session_id mismatch) |
| 4004 | Session not found |
| 4005 | Session not ready |
| 4006 | Session terminated |

**Message Types** (Client → Server):
```json
{
  "type": "input",
  "data": "ls -la\n"
}
```

```json
{
  "type": "resize",
  "cols": 120,
  "rows": 40
}
```

**Message Types** (Server → Client):
```json
{
  "type": "output",
  "data": "total 48\ndrwxr-xr-x ..."
}
```

```json
{
  "type": "status",
  "state": "running",
  "remaining_seconds": 7195
}
```

```json
{
  "type": "termination",
  "reason": "time_expired",
  "message": "Your exam time has expired"
}
```

---

### WSS /sessions/:session_id/status

Real-time session status updates.

**Connection Flow**:
1. Client connects with `Authorization` header
2. Server validates identity
3. Server pushes status updates as they occur

**Message Types** (Server → Client):
```json
{
  "type": "status_update",
  "data": {
    "lifecycle_state": "ready",
    "environment_ready": true,
    "remaining_seconds": 7200
  }
}
```

```json
{
  "type": "error",
  "data": {
    "code": "ENVIRONMENT_FAILED",
    "message": "Failed to start environment",
    "recoverable": false
  }
}
```

---

## OpenAPI Specification (Excerpt)

```yaml
openapi: 3.0.3
info:
  title: CKX Exam Session API
  version: 1.0.0
  description: Multi-session exam environment management

paths:
  /sessions:
    post:
      summary: Create new exam session
      operationId: createSession
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [exam_id]
              properties:
                exam_id:
                  type: string
                  format: uuid
      responses:
        '201':
          description: Session created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionResponse'
        '409':
          description: Active session exists

  /sessions/{session_id}:
    get:
      summary: Get session details
      operationId: getSession
      parameters:
        - name: session_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Session details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionDetails'
        '403':
          description: Access denied
        '404':
          description: Session not found

components:
  schemas:
    SessionResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            session_id:
              type: string
              format: uuid
            user_id:
              type: string
              format: uuid
            exam_id:
              type: string
              format: uuid
            status:
              type: string
              enum: [created, initializing, ready, running, terminated, failed]
            websocket_url:
              type: string
              format: uri

    SessionDetails:
      type: object
      properties:
        session_id:
          type: string
          format: uuid
        lifecycle_state:
          type: string
          enum: [created, initializing, ready, running, terminated, failed]
        environment:
          type: object
          properties:
            ready:
              type: boolean
            environment_id:
              type: string
              format: uuid

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```
