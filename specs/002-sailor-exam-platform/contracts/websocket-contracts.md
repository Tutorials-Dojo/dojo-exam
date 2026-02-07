# WebSocket Contracts: Sailor.sh Kubernetes Exam Platform

**Feature**: 002-sailor-exam-platform
**Date**: 2026-02-07

## Overview

WebSocket connections are used for:
1. Real-time session status updates
2. VNC remote desktop streaming
3. Timer synchronization

---

## Session Status WebSocket

**Endpoint**: `wss://api.sailor.sh/ws/sessions/:sessionId`

**Authentication**: JWT token in query string or first message

### Connection

```javascript
const ws = new WebSocket(`wss://api.sailor.sh/ws/sessions/${sessionId}?token=${jwt}`);
```

Or authenticate after connection:
```javascript
ws.send(JSON.stringify({ type: 'auth', token: jwt }));
```

### Server Messages

#### Session Status Update
```json
{
  "type": "session_status",
  "data": {
    "status": "active",
    "time_remaining_seconds": 1500,
    "vnc_ready": true
  }
}
```

#### Time Warning
```json
{
  "type": "time_warning",
  "data": {
    "time_remaining_seconds": 300,
    "message": "5 minutes remaining"
  }
}
```

#### Session Expired
```json
{
  "type": "session_expired",
  "data": {
    "reason": "time_expired",
    "message": "Your exam time has ended",
    "redirect_url": "/results/uuid"
  }
}
```

#### Container Status
```json
{
  "type": "container_status",
  "data": {
    "status": "provisioning" | "ready" | "failed",
    "progress_percent": 75,
    "message": "Starting Kubernetes cluster..."
  }
}
```

#### Error
```json
{
  "type": "error",
  "data": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session does not exist or you don't have access"
  }
}
```

### Client Messages

#### Heartbeat (keep-alive)
```json
{
  "type": "heartbeat"
}
```

Response:
```json
{
  "type": "heartbeat_ack",
  "data": {
    "server_time": "2026-02-07T10:15:00Z",
    "time_remaining_seconds": 1500
  }
}
```

#### Request Status
```json
{
  "type": "request_status"
}
```

Response: `session_status` message

---

## VNC WebSocket

**Endpoint**: `wss://api.sailor.sh/vnc-ws/:sessionId`

This is a passthrough WebSocket to the noVNC/websockify endpoint on the CKX container.

### Connection Flow

1. Client connects to `/vnc-ws/:sessionId`
2. Server validates session ownership
3. Server establishes connection to CKX container VNC port
4. Server proxies binary frames between client and container

### Authentication

Session ID in URL path. Server validates:
- User owns the session
- Session is in 'active' status
- Time has not expired

### Binary Protocol

Standard RFB (Remote Framebuffer) protocol. See [RFC 6143](https://tools.ietf.org/html/rfc6143).

### Error Handling

If session expires during VNC connection:
```json
{
  "type": "session_terminated",
  "reason": "time_expired",
  "message": "Your exam time has ended"
}
```

Connection is then closed with code 4000.

### WebSocket Close Codes

| Code | Meaning |
|------|---------|
| 1000 | Normal closure (user submitted/abandoned) |
| 1001 | Going away (server shutdown) |
| 4000 | Session expired |
| 4001 | Session terminated by admin |
| 4002 | Authentication failed |
| 4003 | Session not found |
| 4004 | Container not ready |
| 4005 | Container failed |

---

## Timer Synchronization

To prevent clock drift between client and server:

1. Client sends `heartbeat` every 30 seconds
2. Server responds with `heartbeat_ack` including `time_remaining_seconds`
3. Client updates local timer display

### Drift Tolerance

- If client timer is > 5 seconds ahead of server: sync immediately
- If client timer is > 5 seconds behind server: gradual correction (1 sec/min)
- Never show more time than server reports

---

## Connection Resilience

### Reconnection Strategy

```javascript
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

let reconnectAttempt = 0;

ws.onclose = (event) => {
  if (event.code >= 4000) {
    // Session-level error, don't reconnect
    handleSessionError(event);
    return;
  }

  const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
  setTimeout(() => {
    reconnectAttempt++;
    connect();
  }, delay);
};

ws.onopen = () => {
  reconnectAttempt = 0;
};
```

### Offline Detection

If no heartbeat_ack received for 60 seconds:
1. Show "Connection lost" banner
2. Attempt reconnection
3. If reconnect succeeds, verify session still active
4. If session expired during offline period, redirect to results

---

## Message Size Limits

| Message Type | Max Size |
|--------------|----------|
| Control messages (JSON) | 64 KB |
| VNC frames | 16 MB |

Messages exceeding limits are rejected with:
```json
{
  "type": "error",
  "data": {
    "code": "MESSAGE_TOO_LARGE",
    "message": "Message exceeds maximum size"
  }
}
```
