# Research: Sailor.sh Kubernetes Exam Platform

**Feature**: 002-sailor-exam-platform
**Date**: 2026-02-07

## Research Topics

### 1. Multi-Session VNC Isolation

**Decision**: Use dynamic VNC proxy routing with session-specific container URLs

**Rationale**:
- Current architecture uses a single hardcoded VNC target (`remote-desktop-service:6901`)
- Multi-session requires routing each user to their dedicated CKX container
- Session ID maps to container URL via Redis lookup

**Alternatives Considered**:
- **Static port mapping**: Rejected - doesn't scale, port exhaustion risk
- **Shared VNC with user isolation**: Rejected - violates constitution principle II
- **VNC multiplexer**: Rejected - adds complexity, single point of failure

**Implementation Pattern**:
```javascript
// Session-aware VNC proxy
const targetUrl = await redis.get(`session:${sessionId}:vnc_url`);
createProxyMiddleware({ target: targetUrl, ...config });
```

### 2. Server-Side Time Enforcement

**Decision**: PostgreSQL + background worker for time expiration checks

**Rationale**:
- Time limits MUST be enforced server-side (constitution VI)
- Background worker checks for expired sessions every 5 seconds
- Expired sessions trigger container termination via CKX orchestrator
- Frontend timer is display-only, syncs with server on each API call

**Alternatives Considered**:
- **Frontend-only timer**: Rejected - easily bypassed
- **Redis TTL with pub/sub**: Considered - faster but less auditable
- **Cron job**: Rejected - 1-minute minimum granularity too coarse

**Implementation Pattern**:
```sql
-- Find expired sessions
SELECT session_id, user_id FROM exam_sessions
WHERE status = 'active'
AND started_at + duration_seconds * INTERVAL '1 second' < NOW();
```

### 3. Stripe Integration

**Decision**: Stripe Checkout with webhooks for payment confirmation

**Rationale**:
- Stripe Checkout handles PCI compliance (constitution VI)
- Webhooks provide reliable payment confirmation
- Support for payment methods beyond cards (Apple Pay, Google Pay)

**Alternatives Considered**:
- **Stripe Elements**: More control but requires more PCI scope
- **PayPal**: Less developer-friendly, higher fees
- **Custom payment form**: Rejected - PCI compliance nightmare

**Implementation Pattern**:
```javascript
// Create checkout session
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{ price: exam.stripe_price_id, quantity: 1 }],
  mode: 'payment',
  success_url: `${baseUrl}/exam/${examId}/access?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/exam/${examId}`,
  metadata: { userId, examId }
});

// Webhook handler
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  if (event.type === 'checkout.session.completed') {
    await grantExamAccess(event.data.object.metadata);
  }
});
```

### 4. CKX Container Orchestration

**Decision**: Kubernetes Jobs with dynamic pod creation per session

**Rationale**:
- EKS provides AWS-native Kubernetes management
- Jobs ensure one-shot container lifecycle (start, run, terminate)
- Labels enable session-to-pod mapping for routing

**Alternatives Considered**:
- **Docker Swarm**: Less mature, smaller ecosystem
- **ECS Fargate**: Works but less flexible for VNC networking
- **Static container pool**: Rejected - violates isolation principle

**Implementation Pattern**:
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ckx-session-${sessionId}
  labels:
    session-id: ${sessionId}
    user-id: ${userId}
spec:
  template:
    spec:
      containers:
      - name: ckx
        image: ckx-exam:latest
        ports:
        - containerPort: 6901
      restartPolicy: Never
  ttlSecondsAfterFinished: 300
```

### 5. 90% Loading Bug Root Cause

**Decision**: Add timeout handling and structured error responses

**Rationale**:
- Current code lacks timeout on VNC connection establishment
- JSON parsing errors occur when VNC returns HTML error pages
- Progress updates are based on client-side heuristics, not actual status

**Root Cause Analysis**:
1. VNC proxy returns 502/503 when container not ready
2. Frontend parses response as JSON, fails
3. Error handler doesn't update progress, stuck at 90%

**Fix Pattern**:
```javascript
// Add timeout and structured error handling
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000);

try {
  const response = await fetch('/api/session/vnc-status', { signal: controller.signal });
  if (!response.ok) {
    throw new SessionError('VNC_NOT_READY', response.status);
  }
  const data = await response.json();
  updateProgress(data.progress);
} catch (error) {
  if (error.name === 'AbortError') {
    showError('Session initialization timed out. Please retry.');
  } else if (error instanceof SyntaxError) {
    showError('Server returned unexpected response. Please retry.');
  }
} finally {
  clearTimeout(timeout);
}
```

### 6. React Frontend Architecture

**Decision**: Vite + React 18 + TailwindCSS + React Query

**Rationale**:
- Vite provides fast development and optimized builds
- React Query handles server state (sessions, exams)
- TailwindCSS matches constitution requirement (III)
- noVNC library for VNC client integration

**Alternatives Considered**:
- **Next.js**: Overkill for SPA, adds SSR complexity
- **Create React App**: Deprecated, slow builds
- **Vue/Svelte**: Team expertise is React

**Key Dependencies**:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "@novnc/novnc": "^1.4.0",
    "@stripe/stripe-js": "^2.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}
```

### 7. Database Schema Design

**Decision**: Additive migrations with foreign keys to existing users table

**Rationale**:
- Constitution requires non-destructive schema changes (V)
- Foreign key to existing users table preserves auth system
- Soft deletes for audit trail

**Schema Additions**:
```sql
-- Exam sessions (tracks each exam attempt)
CREATE TABLE exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  exam_id UUID NOT NULL REFERENCES exams(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL,
  container_id VARCHAR(255),
  vnc_url VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments (tracks Stripe transactions)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  exam_id UUID NOT NULL REFERENCES exams(id),
  stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_payment_intent VARCHAR(255),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exam access (tracks which exams user has access to)
CREATE TABLE exam_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  exam_id UUID NOT NULL REFERENCES exams(id),
  access_type VARCHAR(20) NOT NULL, -- 'mock' or 'full'
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  payment_id UUID REFERENCES payments(id),
  UNIQUE(user_id, exam_id, access_type)
);
```

## Summary

All research topics resolved. No NEEDS CLARIFICATION items remain.

| Topic | Decision | Risk Level |
|-------|----------|------------|
| VNC Isolation | Dynamic proxy routing via Redis | Low |
| Time Enforcement | PostgreSQL + background worker | Low |
| Payments | Stripe Checkout + webhooks | Low |
| CKX Orchestration | Kubernetes Jobs on EKS | Medium |
| 90% Bug Fix | Timeout + structured errors | Low |
| Frontend | Vite + React 18 + TailwindCSS | Low |
| Database | Additive migrations | Low |
