# API Contracts: Sailor.sh Kubernetes Exam Platform

**Feature**: 002-sailor-exam-platform
**Date**: 2026-02-07
**Base URL**: `/api/v1`

## Authentication

All endpoints except public catalog require authentication via session cookie or Bearer token.

```
Authorization: Bearer <jwt_token>
```

Unauthorized requests return:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

---

## Exam Catalog

### GET /exams

List available exams with pricing and access status.

**Authentication**: Optional (shows access status if authenticated)

**Response 200**:
```json
{
  "exams": [
    {
      "id": "uuid",
      "title": "CKA Practice Exam",
      "description": "Certified Kubernetes Administrator practice",
      "type": "full",
      "duration_minutes": 120,
      "mock_duration_minutes": 30,
      "price": {
        "amount_cents": 2999,
        "currency": "usd",
        "formatted": "$29.99"
      },
      "user_access": {
        "has_mock_access": true,
        "has_full_access": false,
        "attempts_remaining": 0
      }
    }
  ]
}
```

### GET /exams/:examId

Get exam details.

**Response 200**:
```json
{
  "id": "uuid",
  "title": "CKA Practice Exam",
  "description": "Full description...",
  "type": "full",
  "duration_minutes": 120,
  "mock_duration_minutes": 30,
  "price": {
    "amount_cents": 2999,
    "currency": "usd",
    "formatted": "$29.99"
  },
  "topics": ["pods", "deployments", "services"],
  "question_count": 25,
  "user_access": {
    "has_mock_access": true,
    "has_full_access": false,
    "attempts_remaining": 0
  }
}
```

---

## Sessions

### POST /sessions

Start a new exam session.

**Authentication**: Required

**Request**:
```json
{
  "exam_id": "uuid",
  "access_type": "mock" | "full"
}
```

**Response 201** (Session Created):
```json
{
  "session": {
    "id": "uuid",
    "exam_id": "uuid",
    "status": "pending",
    "duration_seconds": 1800,
    "created_at": "2026-02-07T10:00:00Z"
  }
}
```

**Response 400** (Validation Error):
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid access type",
  "details": { "access_type": "must be 'mock' or 'full'" }
}
```

**Response 403** (No Access):
```json
{
  "error": "ACCESS_DENIED",
  "message": "You don't have access to this exam",
  "details": { "required": "full", "has": "mock" }
}
```

**Response 409** (Active Session Exists):
```json
{
  "error": "SESSION_EXISTS",
  "message": "You already have an active session",
  "active_session_id": "uuid"
}
```

### GET /sessions/:sessionId

Get session status and connection info.

**Authentication**: Required (must own session)

**Response 200**:
```json
{
  "session": {
    "id": "uuid",
    "exam_id": "uuid",
    "status": "active",
    "started_at": "2026-02-07T10:00:00Z",
    "duration_seconds": 1800,
    "time_remaining_seconds": 1500,
    "vnc_url": "/vnc-proxy/session-uuid",
    "progress": {
      "questions_answered": 5,
      "questions_total": 10
    }
  }
}
```

**Response 403** (Not Owner):
```json
{
  "error": "ACCESS_DENIED",
  "message": "You don't have access to this session"
}
```

### GET /sessions/:sessionId/status

Lightweight status check (for polling).

**Authentication**: Required (must own session)

**Response 200**:
```json
{
  "status": "active",
  "time_remaining_seconds": 1500,
  "vnc_ready": true
}
```

### POST /sessions/:sessionId/submit

Submit exam for evaluation.

**Authentication**: Required (must own session)

**Response 200**:
```json
{
  "session": {
    "id": "uuid",
    "status": "completed",
    "ended_at": "2026-02-07T10:30:00Z"
  },
  "redirect_url": "/results/uuid"
}
```

**Response 400** (Session Not Active):
```json
{
  "error": "INVALID_STATE",
  "message": "Session is not active",
  "current_status": "expired"
}
```

### DELETE /sessions/:sessionId

Abandon session (user gives up).

**Authentication**: Required (must own session)

**Response 200**:
```json
{
  "session": {
    "id": "uuid",
    "status": "terminated",
    "termination_reason": "user_abandoned"
  }
}
```

### GET /sessions/active

Get user's active session (if any).

**Authentication**: Required

**Response 200** (Has Active Session):
```json
{
  "has_active_session": true,
  "session": {
    "id": "uuid",
    "exam_id": "uuid",
    "status": "active",
    "time_remaining_seconds": 1500
  }
}
```

**Response 200** (No Active Session):
```json
{
  "has_active_session": false,
  "session": null
}
```

---

## Payments

### POST /payments/checkout

Create Stripe Checkout session.

**Authentication**: Required

**Request**:
```json
{
  "exam_id": "uuid"
}
```

**Response 200**:
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_test_..."
}
```

**Response 400** (Already Has Access):
```json
{
  "error": "ALREADY_PURCHASED",
  "message": "You already have full access to this exam"
}
```

### POST /payments/webhook

Stripe webhook handler.

**Authentication**: Stripe signature verification

**Request**: Raw Stripe event payload

**Response 200**:
```json
{ "received": true }
```

### GET /payments

List user's payment history.

**Authentication**: Required

**Response 200**:
```json
{
  "payments": [
    {
      "id": "uuid",
      "exam_id": "uuid",
      "exam_title": "CKA Practice Exam",
      "amount": {
        "cents": 2999,
        "currency": "usd",
        "formatted": "$29.99"
      },
      "status": "completed",
      "created_at": "2026-02-07T10:00:00Z"
    }
  ]
}
```

---

## Results

### GET /results/:sessionId

Get exam results.

**Authentication**: Required (must own session)

**Response 200**:
```json
{
  "result": {
    "session_id": "uuid",
    "exam_id": "uuid",
    "exam_title": "CKA Practice Exam",
    "status": "completed",
    "score": {
      "correct": 18,
      "total": 25,
      "percentage": 72,
      "passed": true,
      "passing_threshold": 66
    },
    "duration": {
      "allowed_seconds": 7200,
      "used_seconds": 6543
    },
    "completed_at": "2026-02-07T12:00:00Z"
  }
}
```

---

## VNC Proxy

### GET /vnc-proxy/:sessionId/*

Proxy VNC traffic to session's CKX container.

**Authentication**: Required (must own session)

**Response**: Proxied VNC content or WebSocket upgrade

**Response 403**:
```json
{
  "error": "ACCESS_DENIED",
  "message": "You don't have access to this session"
}
```

**Response 503** (Container Not Ready):
```json
{
  "error": "NOT_READY",
  "message": "Session container is still initializing",
  "retry_after_seconds": 5
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": { "field": "specific error" }
}
```

**Common Error Codes**:
- `UNAUTHORIZED`: Missing or invalid authentication
- `ACCESS_DENIED`: Authenticated but not authorized
- `VALIDATION_ERROR`: Invalid request body
- `NOT_FOUND`: Resource doesn't exist
- `SESSION_EXISTS`: Conflict with existing session
- `INVALID_STATE`: Operation not valid for current state
- `RATE_LIMITED`: Too many requests
- `SERVER_ERROR`: Internal server error

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /sessions | 5 | 1 minute |
| POST /payments/checkout | 10 | 1 minute |
| GET /sessions/:id/status | 60 | 1 minute |
| All other endpoints | 100 | 1 minute |

**Rate Limit Response** (429):
```json
{
  "error": "RATE_LIMITED",
  "message": "Too many requests",
  "retry_after_seconds": 30
}
```
