# Data Model: Sailor.sh Kubernetes Exam Platform

**Feature**: 002-sailor-exam-platform
**Date**: 2026-02-07

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │───────│ ExamAccess  │───────│    Exam     │
│  (existing) │  1:N  │             │  N:1  │             │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │                     │
      │ 1:N                 │ 0:1                 │ 1:N
      ▼                     ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Payment   │◄──────│ ExamSession │       │  Question   │
│             │  0:1  │             │       │  (existing) │
└─────────────┘       └─────────────┘       └─────────────┘
                            │
                            │ 1:1
                            ▼
                      ┌─────────────┐
                      │   CKXPod    │
                      │  (runtime)  │
                      └─────────────┘
```

## Entities

### User (Existing)

Referenced by new entities. Not modified.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | User email |
| password_hash | VARCHAR(255) | Hashed password |
| created_at | TIMESTAMPTZ | Account creation |

### Exam (Existing/Extended)

Extended with pricing and type fields.

| Field | Type | Description | New? |
|-------|------|-------------|------|
| id | UUID | Primary key | No |
| title | VARCHAR(255) | Exam name | No |
| description | TEXT | Exam description | No |
| duration_minutes | INTEGER | Exam duration | No |
| type | VARCHAR(20) | 'mock' or 'full' | **Yes** |
| price_cents | INTEGER | Price in cents (null for free) | **Yes** |
| stripe_price_id | VARCHAR(255) | Stripe Price object ID | **Yes** |
| mock_duration_minutes | INTEGER | Duration for mock version | **Yes** |
| is_active | BOOLEAN | Published/unpublished | No |
| created_at | TIMESTAMPTZ | Creation timestamp | No |

### ExamSession (New)

Tracks each exam attempt by a user.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Session identifier |
| user_id | UUID | FK users(id), NOT NULL | User taking exam |
| exam_id | UUID | FK exams(id), NOT NULL | Exam being taken |
| access_id | UUID | FK exam_access(id) | Access grant used |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | Session state |
| started_at | TIMESTAMPTZ | | When exam started |
| ended_at | TIMESTAMPTZ | | When exam ended |
| duration_seconds | INTEGER | NOT NULL | Allowed duration |
| container_id | VARCHAR(255) | | Kubernetes pod name |
| vnc_url | VARCHAR(255) | | VNC connection URL |
| termination_reason | VARCHAR(50) | | Why session ended |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Status Values**:
- `pending`: Session created, container not yet provisioned
- `provisioning`: CKX container being created
- `ready`: Container ready, waiting for user to connect
- `active`: User connected, exam in progress
- `completed`: User submitted or time expired gracefully
- `expired`: Time limit enforced by server
- `failed`: Container provisioning or other error
- `terminated`: Admin or system terminated

**Termination Reasons**:
- `user_submitted`: User clicked submit
- `time_expired`: Duration reached
- `user_abandoned`: User left without submitting
- `admin_terminated`: Admin action
- `system_error`: Infrastructure failure
- `container_failed`: CKX pod crashed

### Payment (New)

Tracks Stripe payment transactions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Payment identifier |
| user_id | UUID | FK users(id), NOT NULL | Paying user |
| exam_id | UUID | FK exams(id), NOT NULL | Exam purchased |
| stripe_session_id | VARCHAR(255) | UNIQUE, NOT NULL | Stripe Checkout session |
| stripe_payment_intent | VARCHAR(255) | | Stripe PaymentIntent ID |
| amount_cents | INTEGER | NOT NULL | Amount charged |
| currency | VARCHAR(3) | NOT NULL, DEFAULT 'usd' | Currency code |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | Payment state |
| refund_id | VARCHAR(255) | | Stripe Refund ID if refunded |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Status Values**:
- `pending`: Checkout session created, not completed
- `completed`: Payment successful
- `failed`: Payment failed
- `refunded`: Payment refunded
- `expired`: Checkout session expired

### ExamAccess (New)

Tracks which exams a user has access to.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Access identifier |
| user_id | UUID | FK users(id), NOT NULL | User with access |
| exam_id | UUID | FK exams(id), NOT NULL | Exam accessible |
| access_type | VARCHAR(20) | NOT NULL | 'mock' or 'full' |
| granted_at | TIMESTAMPTZ | DEFAULT NOW() | When access granted |
| expires_at | TIMESTAMPTZ | | Access expiration (null = never) |
| payment_id | UUID | FK payments(id) | Payment that granted access |
| attempts_allowed | INTEGER | DEFAULT 1 | Max attempts |
| attempts_used | INTEGER | DEFAULT 0 | Attempts consumed |

**Unique Constraint**: (user_id, exam_id, access_type)

### CKXPod (Runtime - Not persisted)

Represents a running CKX container. State managed in Kubernetes, cached in Redis.

| Field | Type | Description |
|-------|------|-------------|
| pod_name | STRING | Kubernetes pod name |
| session_id | UUID | Associated exam session |
| user_id | UUID | Owning user |
| vnc_port | INTEGER | Exposed VNC port |
| internal_ip | STRING | Pod cluster IP |
| status | STRING | Pod phase (Pending/Running/Succeeded/Failed) |
| created_at | TIMESTAMP | Pod creation time |

## Indexes

```sql
-- ExamSession indexes
CREATE INDEX idx_exam_sessions_user_id ON exam_sessions(user_id);
CREATE INDEX idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX idx_exam_sessions_active ON exam_sessions(user_id, status)
  WHERE status IN ('pending', 'provisioning', 'ready', 'active');

-- Payment indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_session ON payments(stripe_session_id);

-- ExamAccess indexes
CREATE INDEX idx_exam_access_user_exam ON exam_access(user_id, exam_id);
CREATE INDEX idx_exam_access_active ON exam_access(user_id, exam_id)
  WHERE expires_at IS NULL OR expires_at > NOW();
```

## State Machine: ExamSession

```
                                    ┌──────────────┐
                                    │   pending    │
                                    └──────┬───────┘
                                           │ provision_container()
                                           ▼
                                    ┌──────────────┐
                              ┌─────│ provisioning │─────┐
                              │     └──────┬───────┘     │
                   container_failed()      │             │ provision_timeout()
                              │            │ container_ready()
                              ▼            ▼             ▼
                       ┌──────────┐  ┌──────────┐  ┌──────────┐
                       │  failed  │  │  ready   │  │  failed  │
                       └──────────┘  └────┬─────┘  └──────────┘
                                          │ user_connect()
                                          ▼
                                    ┌──────────────┐
                   ┌────────────────│    active    │────────────────┐
                   │                └──────┬───────┘                │
         user_submit()                     │                 time_expire()
                   │            admin_terminate() / user_abandon()  │
                   ▼                       ▼                        ▼
            ┌───────────┐          ┌─────────────┐          ┌───────────┐
            │ completed │          │ terminated  │          │  expired  │
            └───────────┘          └─────────────┘          └───────────┘
```

## Validation Rules

### ExamSession
- User can have at most ONE active session (status in pending/provisioning/ready/active)
- duration_seconds must match exam's duration_minutes * 60 (or mock_duration_minutes for mock access)
- started_at required when status transitions to 'active'
- ended_at required when status transitions to terminal state

### Payment
- amount_cents must equal exam.price_cents at time of purchase
- refund_id only set when status = 'refunded'

### ExamAccess
- attempts_used <= attempts_allowed
- Cannot create session if attempts_used >= attempts_allowed
- payment_id required for access_type = 'full' (unless granted by admin)
- Mock access auto-granted to all authenticated users

## Migration Strategy

1. **001_add_exam_type.sql**: Add type, price_cents, stripe_price_id, mock_duration_minutes to exams
2. **002_create_exam_sessions.sql**: Create exam_sessions table
3. **003_create_payments.sql**: Create payments table
4. **004_create_exam_access.sql**: Create exam_access table
5. **005_add_indexes.sql**: Add performance indexes
6. **006_seed_exam_types.sql**: Set existing exams as type='full', assign stripe prices

All migrations are additive and reversible (down migrations provided).
