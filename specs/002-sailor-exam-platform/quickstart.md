# Quickstart: Sailor.sh Kubernetes Exam Platform

**Feature**: 002-sailor-exam-platform
**Date**: 2026-02-07

## Prerequisites

- Node.js 20 LTS
- Docker Desktop with Kubernetes enabled (or k3d/minikube)
- PostgreSQL 15+
- Redis 7+
- Stripe CLI (for webhook testing)

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd dojo-exam
git checkout 002-sailor-exam-platform

# Install backend dependencies
cd facilitator && npm install && cd ..
cd app && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Environment Configuration

Create `.env` files:

**facilitator/.env**:
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sailor_dev
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Session
SESSION_SECRET=dev-secret-change-in-prod
JWT_SECRET=dev-jwt-secret

# CKX (local k3d)
CKX_NAMESPACE=ckx-sessions
KUBECONFIG=~/.kube/config
```

**frontend/.env**:
```bash
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### 3. Database Setup

```bash
# Start PostgreSQL (if using Docker)
docker run -d --name sailor-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sailor_dev \
  -p 5432:5432 \
  postgres:15

# Run migrations
cd facilitator
npm run migrate:up
```

### 4. Redis Setup

```bash
docker run -d --name sailor-redis -p 6379:6379 redis:7
```

### 5. Local Kubernetes (k3d)

```bash
# Create cluster
k3d cluster create sailor-dev --port 6901:6901@loadbalancer

# Create CKX namespace
kubectl create namespace ckx-sessions

# Apply CKX container image secret (if using private registry)
kubectl create secret docker-registry ckx-registry \
  --namespace=ckx-sessions \
  --docker-server=<registry> \
  --docker-username=<user> \
  --docker-password=<token>
```

### 6. Stripe CLI (for webhooks)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/v1/payments/webhook

# Note the webhook signing secret and update STRIPE_WEBHOOK_SECRET
```

### 7. Start Services

```bash
# Terminal 1: Backend (facilitator)
cd facilitator && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: App (VNC proxy)
cd app && npm run dev
```

### 8. Access Application

- Frontend: http://localhost:5173
- API: http://localhost:3001
- VNC Proxy: http://localhost:3000

---

## Testing

### Run Unit Tests

```bash
# Backend
cd facilitator && npm test

# Frontend
cd frontend && npm test
```

### Run Integration Tests

```bash
# Requires running PostgreSQL and Redis
cd facilitator && npm run test:integration
```

### Run E2E Tests

```bash
# Requires all services running
cd frontend && npm run test:e2e
```

### Load Testing

```bash
# Using k6
k6 run tests/load/concurrent-sessions.js
```

---

## Common Development Tasks

### Create a Test User

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test1234"}'
```

### Create a Test Exam

```bash
# Login first to get token
TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin1234"}' \
  | jq -r '.token')

# Create exam
curl -X POST http://localhost:3001/api/v1/admin/exams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "CKA Practice",
    "description": "Test exam",
    "type": "full",
    "duration_minutes": 120,
    "mock_duration_minutes": 30,
    "price_cents": 2999
  }'
```

### Manually Trigger Session Expiration

```bash
# For testing time enforcement
curl -X POST http://localhost:3001/api/v1/admin/sessions/<session-id>/expire \
  -H "Authorization: Bearer $TOKEN"
```

### View CKX Pod Logs

```bash
kubectl logs -n ckx-sessions -l session-id=<session-id> -f
```

---

## Troubleshooting

### VNC Not Loading

1. Check CKX pod status: `kubectl get pods -n ckx-sessions`
2. Check pod logs: `kubectl logs -n ckx-sessions ckx-session-<id>`
3. Verify VNC proxy is running: `curl http://localhost:3000/health`

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
curl http://localhost:3001/health | jq '.database'
```

### Stripe Webhook Not Receiving

1. Ensure Stripe CLI is running: `stripe listen`
2. Check webhook secret matches `.env`
3. Test with: `stripe trigger checkout.session.completed`

### Session Stuck in "Provisioning"

```bash
# Check CKX orchestrator logs
kubectl logs -n facilitator deployment/facilitator | grep CKX

# Manually check pod status
kubectl get pods -n ckx-sessions -l session-id=<session-id>
```

---

## Deployment

See `docs/deployment.md` for production deployment instructions.

### Quick AWS Deployment

```bash
# Configure AWS CLI
aws configure

# Deploy infrastructure (Terraform)
cd infra && terraform apply

# Deploy services (Kubernetes)
kubectl apply -f k8s/production/
```
