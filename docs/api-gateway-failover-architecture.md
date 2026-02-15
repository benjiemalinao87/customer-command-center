# API Gateway Failover Architecture

## Overview

This document describes the Cloudflare API Gateway with automatic Railway failover - a high-availability architecture that ensures your API remains accessible even when the primary backend (Railway) goes down.

---

## System Architecture

```
                                    INTERNET
                                        │
                                        ▼
                    ┌───────────────────────────────────────┐
                    │         CLOUDFLARE EDGE NETWORK       │
                    │    (Global, 300+ data centers)        │
                    └───────────────────┬───────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY WORKER                                    │
│                   api-gateway.customerconnects.app                          │
│                                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────────┐   │
│  │   Router    │───▶│ Health Check │───▶│     Circuit Breaker         │   │
│  │  (by path)  │    │   (KV store) │    │ (tracks Railway failures)   │   │
│  └─────────────┘    └──────────────┘    └─────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
    ┌───────────────────────────┐           ┌───────────────────────────┐
    │      PRIMARY: RAILWAY     │           │   FALLBACK: CF WORKERS    │
    │     cc.automate8.com      │           │                           │
    │                           │           │  ┌─────────────────────┐  │
    │  ┌─────────────────────┐  │           │  │    livechat-api     │  │
    │  │   Express.js API    │  │           │  │    (D1 database)    │  │
    │  │   Socket.IO         │  │           │  └─────────────────────┘  │
    │  │   Full backend      │  │           │  ┌─────────────────────┐  │
    │  └─────────────────────┘  │           │  │     leads-api       │  │
    │                           │           │  │    (Supabase)       │  │
    │  ┌─────────────────────┐  │           │  └─────────────────────┘  │
    │  │     Supabase        │  │           │  ┌─────────────────────┐  │
    │  │    PostgreSQL       │  │           │  │  webhook-processor  │  │
    │  └─────────────────────┘  │           │  └─────────────────────┘  │
    └───────────────────────────┘           └───────────────────────────┘
```

---

## Request Flow (Normal Operation)

```
┌──────────┐      ┌───────────┐      ┌─────────┐      ┌─────────┐
│  Client  │      │  Gateway  │      │ Railway │      │ Response│
│ (Browser)│      │ (Worker)  │      │  (API)  │      │         │
└────┬─────┘      └─────┬─────┘      └────┬────┘      └────┬────┘
     │                  │                 │                │
     │  1. API Request  │                 │                │
     │─────────────────▶│                 │                │
     │                  │                 │                │
     │                  │ 2. Check Health │                │
     │                  │    (KV lookup)  │                │
     │                  │────────┐        │                │
     │                  │        │        │                │
     │                  │◀───────┘        │                │
     │                  │ Railway=HEALTHY │                │
     │                  │                 │                │
     │                  │ 3. Forward Req  │                │
     │                  │────────────────▶│                │
     │                  │                 │                │
     │                  │                 │ 4. Process     │
     │                  │                 │────────┐       │
     │                  │                 │        │       │
     │                  │                 │◀───────┘       │
     │                  │                 │                │
     │                  │ 5. Response     │                │
     │                  │◀────────────────│                │
     │                  │                 │                │
     │  6. Response     │                 │                │
     │◀─────────────────│                 │                │
     │                  │                 │                │
     ▼                  ▼                 ▼                ▼
```

---

## Request Flow (Failover Mode)

```
┌──────────┐      ┌───────────┐      ┌─────────┐      ┌──────────┐
│  Client  │      │  Gateway  │      │ Railway │      │ CF Worker│
│ (Browser)│      │ (Worker)  │      │  (DOWN) │      │(Fallback)│
└────┬─────┘      └─────┬─────┘      └────┬────┘      └────┬─────┘
     │                  │                 │                │
     │  1. API Request  │                 │                │
     │─────────────────▶│                 │                │
     │                  │                 │                │
     │                  │ 2. Check Health │                │
     │                  │────────┐        │                │
     │                  │        │        │                │
     │                  │◀───────┘        │                │
     │                  │ Railway=HEALTHY │                │
     │                  │                 │                │
     │                  │ 3. Forward Req  │                │
     │                  │────────────────▶│                │
     │                  │                 │                │
     │                  │    4. TIMEOUT   │                │
     │                  │    or 5xx ERROR │                │
     │                  │◀ ─ ─ ─ ─ ─ ─ ─ ─│                │
     │                  │                 │                │
     │                  │ 5. Mark UNHEALTHY                │
     │                  │────────┐        │                │
     │                  │        │        │                │
     │                  │◀───────┘        │                │
     │                  │                 │                │
     │                  │ 6. Route to Fallback             │
     │                  │─────────────────────────────────▶│
     │                  │                 │                │
     │                  │                 │     7. Process │
     │                  │                 │       ────────┐│
     │                  │                 │               ││
     │                  │                 │       ◀───────┘│
     │                  │                 │                │
     │                  │ 8. Fallback Response             │
     │                  │◀─────────────────────────────────│
     │                  │                 │                │
     │  9. Response     │                 │                │
     │◀─────────────────│                 │                │
     │                  │                 │                │
     ▼                  ▼                 ▼                ▼
```

---

## Circuit Breaker State Machine

The circuit breaker prevents hammering a dead backend and enables fast failover.

```
                              ┌─────────────────────────────────────┐
                              │                                     │
                              │         CIRCUIT BREAKER             │
                              │          STATE MACHINE              │
                              │                                     │
                              └─────────────────────────────────────┘

     ┌──────────────────────────────────────────────────────────────────────┐
     │                                                                      │
     │    ┌─────────┐         Failure         ┌─────────┐                  │
     │    │         │ ───────────────────────▶│         │                  │
     │    │ CLOSED  │     (count failures)    │  OPEN   │                  │
     │    │         │                         │         │                  │
     │    │ (Normal │◀─────────────────────── │(Failing)│                  │
     │    │  flow)  │     Success in          │         │                  │
     │    │         │     HALF_OPEN           │         │                  │
     │    └─────────┘                         └────┬────┘                  │
     │         ▲                                   │                       │
     │         │                                   │                       │
     │         │                        Timeout    │                       │
     │         │                       (60 sec)    │                       │
     │         │                                   ▼                       │
     │         │                            ┌───────────┐                  │
     │         │                            │           │                  │
     │         └────────────────────────────│ HALF_OPEN │                  │
     │                   Success            │           │                  │
     │                                      │  (Probe)  │──────┐           │
     │                                      │           │      │           │
     │                                      └───────────┘      │ Failure   │
     │                                            ▲            │           │
     │                                            │            │           │
     │                                            └────────────┘           │
     │                                          (Back to OPEN)             │
     │                                                                      │
     └──────────────────────────────────────────────────────────────────────┘


    STATE DEFINITIONS:
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │  CLOSED    │ Normal operation. All requests go to Railway.         │
    │            │ Track failure count.                                   │
    │            │ Transition to OPEN after 3 consecutive failures.       │
    │────────────┼───────────────────────────────────────────────────────│
    │  OPEN      │ Railway is considered DOWN.                           │
    │            │ All requests go directly to Cloudflare fallback.      │
    │            │ Transition to HALF_OPEN after 60 second timeout.      │
    │────────────┼───────────────────────────────────────────────────────│
    │  HALF_OPEN │ Testing if Railway is back.                           │
    │            │ Send ONE probe request to Railway.                    │
    │            │ Success → CLOSED, Failure → OPEN                      │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

---

## KV Store Schema

The gateway uses Cloudflare KV to track health state across all edge locations.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          KV NAMESPACE: GATEWAY_STATE                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Key                      │ Value                    │ TTL             │
│  ─────────────────────────┼──────────────────────────┼────────────────│
│  railway:status           │ "healthy" | "unhealthy"  │ 30 seconds     │
│  railway:failure_count    │ number (0-3)             │ 60 seconds     │
│  railway:circuit_state    │ "closed"|"open"|"half"   │ none           │
│  railway:last_check       │ ISO timestamp            │ none           │
│  railway:open_until       │ ISO timestamp            │ none           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Route Mapping Table

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ROUTE MAPPING                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Incoming Path          │ Primary (Railway)    │ Fallback (CF Worker)  │
│  ───────────────────────┼──────────────────────┼──────────────────────│
│  /api/livechat/*        │ cc.automate8.com     │ livechat-api          │
│  /api/leads/*           │ cc.automate8.com     │ leads-api             │
│  /api/webhooks/*        │ cc.automate8.com     │ webhook-processor     │
│  /api/opportunities/*   │ cc.automate8.com     │ opportunities         │
│  /api/contacts/*        │ cc.automate8.com     │ leads-api             │
│  /api/messages/*        │ cc.automate8.com     │ livechat-api          │
│  ───────────────────────┼──────────────────────┼──────────────────────│
│  /api/forward/*         │ cc.automate8.com     │ ⚠️  503 (no fallback) │
│  /api/ai/*              │ cc.automate8.com     │ ⚠️  503 (no fallback) │
│  /socket.io/*           │ cc.automate8.com     │ ⚠️  503 (no fallback) │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Legend:
  ✅ Full fallback support - endpoint works in degraded mode
  ⚠️  No fallback - returns 503 Service Unavailable with retry hint
```

---

## Frontend Integration

The frontend doesn't need changes if using the gateway URL. For gradual rollout:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND API CONFIGURATION                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  // Current (direct to Railway)                                         │
│  REACT_APP_API_V1_URL=https://cc.automate8.com                         │
│                                                                         │
│  // With Gateway (recommended)                                          │
│  REACT_APP_API_V1_URL=https://api-gateway.customerconnects.app         │
│                                                                         │
│  // The gateway transparently proxies to Railway when healthy           │
│  // and fails over to Cloudflare Workers when Railway is down           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘


                        FRONTEND REQUEST FLOW
                        ─────────────────────

    ┌──────────────────┐
    │     Frontend     │
    │   (React App)    │
    └────────┬─────────┘
             │
             │ fetch('/api/contacts')
             ▼
    ┌──────────────────┐
    │  API Service     │
    │  (messageService │
    │   contactService)│
    └────────┬─────────┘
             │
             │ Uses REACT_APP_API_V1_URL
             ▼
    ┌──────────────────┐         ┌──────────────────┐
    │    Gateway       │────────▶│     Railway      │  (if healthy)
    │    Worker        │         │                  │
    │                  │         └──────────────────┘
    │                  │
    │                  │         ┌──────────────────┐
    │                  │────────▶│  CF Workers      │  (if Railway down)
    │                  │         │  (fallback)      │
    └──────────────────┘         └──────────────────┘
```

---

## Failure Scenarios & Responses

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FAILURE SCENARIO MATRIX                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Scenario                    │ Gateway Response                        │
│  ────────────────────────────┼────────────────────────────────────────│
│                                                                         │
│  Railway timeout (>5s)       │ Failover to CF Worker                   │
│                              │ Mark Railway unhealthy                  │
│                              │                                         │
│  Railway 5xx error           │ Failover to CF Worker                   │
│                              │ Increment failure counter               │
│                              │                                         │
│  Railway 4xx error           │ Return 4xx to client                    │
│                              │ (not a backend failure)                 │
│                              │                                         │
│  No fallback available       │ Return 503 with:                        │
│                              │ { error: "Service temporarily           │
│                              │    unavailable",                        │
│                              │   retry_after: 30,                      │
│                              │   fallback: false }                     │
│                              │                                         │
│  CF Worker fallback fails    │ Return 503 with:                        │
│                              │ { error: "All backends unavailable",    │
│                              │   retry_after: 60 }                     │
│                              │                                         │
│  Railway back online         │ Circuit breaker: HALF_OPEN → CLOSED    │
│  (after being down)          │ Traffic gradually returns to Railway   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Timeline: What Happens During an Outage

```
TIME        EVENT                           CIRCUIT STATE    USER EXPERIENCE
────────────────────────────────────────────────────────────────────────────

T+0s        Railway deployment starts       CLOSED           Normal
            (bad code pushed)

T+5s        Railway crashes                 CLOSED           Normal
                                                             (no requests yet)

T+10s       User makes request #1           CLOSED           ⏳ 5s timeout
            Gateway tries Railway                            then fallback
            → Times out                                      ✅ Success via CF

T+11s       Failure count = 1               CLOSED

T+15s       User makes request #2           CLOSED           ⏳ 5s timeout
            Gateway tries Railway                            then fallback
            → Times out                                      ✅ Success via CF

T+16s       Failure count = 2               CLOSED

T+20s       User makes request #3           CLOSED           ⏳ 5s timeout
            Gateway tries Railway                            then fallback
            → Times out                                      ✅ Success via CF

T+21s       Failure count = 3               CLOSED → OPEN
            CIRCUIT OPENS!

T+25s       User makes request #4           OPEN             ⚡ Instant fallback
            Gateway skips Railway                            ✅ Success via CF
            → Direct to fallback                             (no 5s wait!)

T+30s       More requests...                OPEN             ⚡ All instant
            All go to fallback                               ✅ All succeed

T+81s       60 seconds elapsed              OPEN → HALF_OPEN
            Time to test Railway

T+82s       Gateway sends probe             HALF_OPEN
            to Railway
            → Still failing                 HALF_OPEN → OPEN

T+142s      Another 60 seconds              OPEN → HALF_OPEN

T+143s      Railway fixed & redeployed
            Gateway sends probe             HALF_OPEN
            → Success!                      HALF_OPEN → CLOSED

T+145s      Normal operation resumes        CLOSED           ✅ Back to Railway

────────────────────────────────────────────────────────────────────────────

SUMMARY:
- First 3 requests: 5s delay each (15s total user pain)
- After circuit opens: instant failover (no delay)
- Total user impact: ~15-20 seconds of degraded latency
- Without gateway: complete outage until manual fix
```

---

## Deployment Checklist

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT STEPS                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  □ Phase 1: Create Gateway Worker                                       │
│    □ Create cloudflare-workers/api-gateway/ directory                   │
│    □ Write wrangler.toml with KV namespace binding                      │
│    □ Implement gateway logic in src/index.js                            │
│    □ Test locally with wrangler dev                                     │
│                                                                         │
│  □ Phase 2: Deploy to Staging                                           │
│    □ Deploy to staging subdomain (staging-gateway.customerconnects.app) │
│    □ Test with Railway running                                          │
│    □ Manually stop Railway, verify failover                             │
│    □ Verify circuit breaker timing                                      │
│                                                                         │
│  □ Phase 3: Production Rollout                                          │
│    □ Deploy to production (api-gateway.customerconnects.app)            │
│    □ Update frontend env to use gateway URL                             │
│    □ Monitor gateway metrics in Cloudflare dashboard                    │
│    □ Keep cc.automate8.com as direct bypass (for debugging)             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Alerts

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MONITORING STRATEGY                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Metric                      │ Alert Threshold    │ Action             │
│  ────────────────────────────┼────────────────────┼───────────────────│
│  Circuit state = OPEN        │ Immediately        │ Page on-call       │
│  Fallback request rate       │ > 10% of traffic   │ Investigate        │
│  Gateway error rate          │ > 1%               │ Check both backends│
│  Gateway latency p99         │ > 2000ms           │ Check Railway      │
│                                                                         │
│  Cloudflare Analytics:                                                  │
│  - Request count by origin (Railway vs CF Worker)                       │
│  - Error rates by route                                                 │
│  - Latency percentiles                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Benefits Summary

| Without Gateway | With Gateway |
|-----------------|--------------|
| Railway down = Complete outage | Railway down = Degraded but working |
| Manual intervention needed | Automatic failover in <20 seconds |
| Users see errors | Users see slower responses at worst |
| Single point of failure | Multi-backend resilience |
| No visibility into failures | Circuit breaker metrics & logging |

---

## Questions?

For implementation details, see:
- `cloudflare-workers/api-gateway/src/index.js` - Gateway implementation
- `cloudflare-workers/api-gateway/wrangler.toml` - Configuration
- Cloudflare Dashboard > Workers > api-gateway > Metrics
