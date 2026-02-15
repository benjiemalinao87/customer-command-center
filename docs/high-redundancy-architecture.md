# High Redundancy Frontend Architecture

> **TL;DR**: If Railway goes down, users don't notice. Traffic automatically
> switches to Cloudflare Pages, then R2 storage. Zero downtime, zero manual
> intervention, $0/month extra cost.

---

## Why This Exists

On **2026-02-11**, Railway sent SIGTERM to all containers during platform
maintenance. Our `ON_FAILURE` restart policy didn't restart containers that
exited cleanly (code 0). Result: **~2.5 hours of frontend downtime**.

This architecture ensures that can never happen again.

---

## The Big Picture

```
                           +------------------+
                           |  User's Browser  |
                           +--------+---------+
                                    |
                                    | HTTPS request
                                    v
                    +-------------------------------+
                    |  Cloudflare DNS (proxied)     |
                    |  cc1.automate8.com            |
                    |  dash.customerconnects.app    |
                    +---------------+---------------+
                                    |
                                    | Intercepted by Worker route
                                    v
+-----------------------------------------------------------------------+
|                                                                       |
|                   frontend-gateway  (Cloudflare Worker)               |
|                                                                       |
|   +-------------------+    +-----------------+    +----------------+  |
|   |  1. Railway       |    | 2. CF Pages     |    | 3. R2 Bucket   |  |
|   |  (primary)        |--->| (auto-fallback) |--->| (emergency)    |  |
|   |  3s timeout       |    | 2s timeout      |    | last resort    |  |
|   +-------------------+    +-----------------+    +----------------+  |
|                                                                       |
|   Cron: every 5 min -> probe Railway -> alert if down                |
|   Health: /_gateway/health -> JSON status of all 3 origins           |
|                                                                       |
+-----------------------------------------------------------------------+
        |                        |                       |
        v                        v                       v
+---------------+    +--------------------+    +-------------------+
| Railway       |    | Cloudflare Pages   |    | R2 Storage        |
| 2 replicas    |    | cc-frontend-       |    | frontend-builds   |
| ALWAYS restart|    | fallback.pages.dev |    | bucket            |
| Auto-deploy   |    | Auto-deploy via    |    | Auto-deploy via   |
| on git push   |    | GitHub Action      |    | GitHub Action     |
+---------------+    +--------------------+    +-------------------+
```

---

## Failover Flow (Per Request)

Every single HTTP request goes through this decision tree. There is no
caching of "which origin is healthy" — each request is evaluated fresh.

```
                        Request arrives
                             |
                             v
                    +------------------+
                    | Is it OPTIONS?   |
                    +--------+---------+
                     yes     |      no
                      |      |       |
                      v      |       v
               Return 204    |  +---------------------+
               (CORS)        |  | Is path             |
                             |  | /_gateway/health?   |
                             |  +----------+----------+
                             |   yes       |       no
                             |    |        |        |
                             |    v        |        v
                             | Return JSON |   TRY RAILWAY
                             | health     |        |
                             |             |        v
                             |             |  +-----------+
                             |             |  | Fetch     |
                             |             |  | Railway   |
                             |             |  | origin    |  3 second
                             |             |  | (3s max)  |  timeout
                             |             |  +-----+-----+
                             |             |        |
                             |             |    +---+---+
                             |             |    |       |
                             |             |  success  fail/500+/timeout
                             |             |    |       |
                             |             |    v       v
                             |             | RETURN   TRY PAGES
                             |             | response      |
                             |             | (railway)     v
                             |             |         +-----------+
                             |             |         | Fetch     |
                             |             |         | Pages     |
                             |             |         | origin    |  2 second
                             |             |         | (2s max)  |  timeout
                             |             |         +-----+-----+
                             |             |               |
                             |             |           +---+---+
                             |             |           |       |
                             |             |         success  fail/500+/timeout
                             |             |           |       |
                             |             |           v       v
                             |             |        RETURN   TRY R2
                             |             |        response      |
                             |             |        (pages-       v
                             |             |        fallback) +-----------+
                             |             |                  | Read file |
                             |             |                  | from R2   |
                             |             |                  | bucket    |
                             |             |                  +-----+-----+
                             |             |                        |
                             |             |                    +---+---+
                             |             |                    |       |
                             |             |                  found   not found
                             |             |                    |       |
                             |             |                    v       v
                             |             |                 RETURN   RETURN
                             |             |                 response  503
                             |             |                 (r2-      maintenance
                             |             |                 fallback) page
```

---

## State Machine: Origin Health

The gateway doesn't maintain state between requests, but here's how the
**health endpoint** (`/_gateway/health`) evaluates each origin:

```
+------------------------------------------------------------------+
|                    ORIGIN HEALTH STATES                           |
+------------------------------------------------------------------+

Railway:
  +----------+    HTTP < 500     +-----------+
  |          |------------------>|           |
  | PROBING  |                   |  HEALTHY  |  "railway": "healthy"
  |          |<------------------|           |
  +----+-----+    next check     +-----------+
       |
       | HTTP >= 500 / timeout / unreachable
       v
  +-----------+
  |           |
  | UNHEALTHY |  "railway": "unhealthy"
  |           |  --> triggers Slack alert (cron)
  +-----------+  --> gateway skips Railway for that request


Pages:
  +----------+    HTTP < 500     +-----------+
  |          |------------------>|           |
  | PROBING  |                   |  HEALTHY  |  "pages": "healthy"
  |          |<------------------|           |
  +----+-----+    next check     +-----------+
       |
       | HTTP >= 500 / timeout / not configured
       v
  +-----------+
  |           |
  | UNHEALTHY |  "pages": "unhealthy"
  +-----------+  "pages": "not_configured" (if no PAGES_ORIGIN)


R2:
  +----------+    index.html     +-----------+
  |          |    exists         |           |
  | CHECKING |------------------>| AVAILABLE |  "r2": "available"
  |          |                   |           |
  +----+-----+                   +-----------+
       |
       | index.html not found / bucket empty
       v
  +-----------+
  |           |
  |   EMPTY   |  "r2": "empty"
  +-----------+
```

---

## What Happens During an Outage (Timeline)

```
TIME        EVENT                              WHAT USERS SEE
----        -----                              --------------

00:00       Railway goes down (SIGTERM,
            deploy failure, etc.)

00:00       Next user request hits gateway     Nothing changes.
            -> Railway times out (3s)          Gateway tries Pages.
            -> Pages responds (200)            Page loads normally.
            -> X-Served-From: pages-fallback   (maybe 3s slower on first load)

00:05       Cron fires, probes Railway         Slack alert:
            -> Railway still down              "Railway frontend is DOWN"
            -> Alert webhook fires             You get notified.

00:05+      All requests served from Pages     Users notice NOTHING.
                                               Full app works: SMS, chat,
                                               contacts, everything.

??:??       Railway comes back up              Next request automatically
                                               goes back to Railway.
                                               X-Served-From: railway

            NO MANUAL ACTION NEEDED.           Failover + recovery is 100%
                                               automatic.
```

---

## SPA Routing: How Static Files Become a Full App

```
Browser requests: https://cc1.automate8.com/contacts/12345
                                    |
                                    v
                    Gateway receives: /contacts/12345
                                    |
                                    v
                    Does /contacts/12345 have a file extension?
                    (.js, .css, .png, .html, etc.)
                                    |
                          +---------+---------+
                          |                   |
                         NO                  YES
                          |                   |
                          v                   v
                    Serve index.html    Serve that file
                    (React SPA)         (static asset)
                          |
                          v
                    Browser loads index.html
                          |
                          v
                    <script src="/static/js/main.abc123.js">
                    <link href="/static/css/main.def456.css">
                    <script src="/config.js">
                          |
                          v
                    React boots up, reads URL path
                    /contacts/12345
                          |
                          v
                    React Router renders ContactDetail
                    component for contact ID 12345
                          |
                          v
                    App fetches data from backend APIs:
                    - Supabase (database)
                    - Express (cc.automate8.com)
                    - Workers (prod-api.customerconnects.app)
                          |
                          v
                    Full app is running!
                    (Backend APIs are separate services,
                     unaffected by which origin served the frontend)
```

---

## Why the Same Build Works Everywhere

```
+------------------------------------------------------------------+
|                     Frontend Build Output                         |
|                     (npm run build:prod)                          |
+------------------------------------------------------------------+
|                                                                   |
|  index.html -----> Entry point. Loads config.js + JS bundles     |
|                                                                   |
|  config.js ------> Runtime config (NOT baked at build time)      |
|                    Sets window.APP_CONFIG with:                   |
|                    - API URLs                                     |
|                    - Supabase keys                                |
|                    - Feature flags                                |
|                                                                   |
|  static/js/ -----> React app bundle (content-hashed filenames)   |
|                    main.b3aa48f1.js                               |
|                                                                   |
|  static/css/ ----> Stylesheets (content-hashed)                  |
|                    main.3981e25b.css                              |
|                                                                   |
|  sounds/ --------> Notification audio files                      |
|  manifest.json --> PWA manifest                                  |
|  asset-manifest -> Build manifest                                |
+------------------------------------------------------------------+

KEY INSIGHT: config.js is loaded at RUNTIME, not bundled at build time.
This means the exact same files work on Railway, Pages, AND R2.
No rebuild needed per environment.

    Railway serves these files  --> App works
    Pages serves these files    --> App works (identical)
    R2 serves these files       --> App works (identical)
```

---

## Cache Strategy

```
Request for /static/js/main.b3aa48f1.js
                    |
                    v
        Is path under /static/ ?
                    |
                   YES
                    |
                    v
        Cache-Control: public, max-age=31536000, immutable
        (Cache for 1 year. The hash in the filename changes
         when content changes, so this is safe.)


Request for /index.html (or any non-file path)
                    |
                    v
        Cache-Control: no-cache
        (Always fetch fresh. This ensures users get the
         latest version that points to new hashed bundles.)


Request for /config.js
                    |
                    v
        Cache-Control: no-cache
        (Always fetch fresh. Config can change without
         a new frontend deploy.)
```

---

## Deployment Pipeline

```
Developer pushes code to main branch
                    |
                    +---> Railway auto-deploys (Tier 1)
                    |     - Detects git push
                    |     - Builds Docker container
                    |     - Deploys 2 replicas
                    |     - ~2-3 min deploy time
                    |
                    +---> GitHub Action triggers (Tier 2)
                    |     - .github/workflows/deploy-pages-fallback.yml
                    |     - npm install && npm run build:prod
                    |     - wrangler pages deploy
                    |     - ~3-5 min deploy time
                    |
                    +---> GitHub Action also uploads to R2 (Tier 3)
                          - Same workflow as Pages deploy
                          - wrangler r2 object put for each file
                          - All 3 tiers stay in sync automatically
```

---

## Frontend Domains

```
+-------------------------------+     +----------------------------+
| cc1.automate8.com             |     | Gateway Worker intercepts  |
| dash.customerconnects.app     |---->| and routes through         |
|                               |     | 3-tier failover            |
| (Cloudflare DNS, proxied)     |     +----------------------------+
+-------------------------------+

+-------------------------------+     +----------------------------+
| app2.channelautomation.com    |     | Goes DIRECTLY to Railway   |
|                               |---->| (no gateway)               |
| (Cloudflare DNS, proxied)     |     |                            |
+-------------------------------+     +----------------------------+

WHY app2 is different:
  app2.channelautomation.com IS the Railway origin URL
  (RAILWAY_ORIGIN in wrangler.toml). If the gateway routed
  app2 through itself, it would create an infinite loop:

      Gateway -> fetch app2 -> hits Gateway -> fetch app2 -> ...

  So app2's Worker route is intentionally commented out.
  It still works (Railway serves it directly), but it
  doesn't have automatic failover to Pages/R2.
```

---

## Origins Detail

| Tier | Origin | URL | Deploy Method | Freshness |
|------|--------|-----|---------------|-----------|
| 1 | Railway | `app2.channelautomation.com` | `git push` auto-deploys | Always current |
| 2 | CF Pages | `cc-frontend-fallback.pages.dev` | GitHub Action on push | Always current |
| 3 | R2 | `frontend-builds` bucket | GitHub Action on push | Always current |

---

## Response Headers (Debugging)

Every response from the gateway includes an `X-Served-From` header:

```
$ curl -sI https://cc1.automate8.com/ | grep x-served-from

x-served-from: railway           # Normal operation
x-served-from: pages-fallback    # Railway is down
x-served-from: r2-fallback       # Railway AND Pages are down
```

| Header Value | Meaning | Action Needed |
|-------------|---------|---------------|
| `railway` | Normal operation | None |
| `pages-fallback` | Railway is down, Pages serving | Check Railway dashboard |
| `r2-fallback` | Railway + Pages both down | Investigate immediately |
| `gateway-maintenance` | ALL origins down, 503 page shown | Critical incident |

---

## Health Endpoint

```
GET https://cc1.automate8.com/_gateway/health

Response:
{
  "status": "operational",        // or "degraded" if all origins down
  "origins": {
    "railway": "healthy",         // or "unhealthy"
    "pages": "healthy",           // or "unhealthy" or "not_configured"
    "r2": "available"             // or "empty" or "not_configured"
  },
  "timestamp": "2026-02-15T12:00:00.000Z"
}
```

---

## Alerting (Cron)

```
Every 5 minutes:
                    +------------------+
                    | Cron fires       |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    | Probe Railway    |
                    | (5s timeout)     |
                    +--------+---------+
                             |
                    +--------+---------+
                    |                  |
                  healthy           unhealthy
                    |                  |
                    v                  v
                  (done)       +------------------+
                               | ALERT_WEBHOOK_URL|
                               | configured?      |
                               +--------+---------+
                                        |
                               +--------+---------+
                               |                  |
                              yes                 no
                               |                  |
                               v                  v
                        Send POST to         Log warning
                        Slack webhook        (no alert sent)
                               |
                               v
                        Slack message:
                        "[ALERT] Railway frontend
                         origin is DOWN. Traffic
                         is being served from
                         fallback."
```

---

## Key Files

| File | Purpose |
|------|---------|
| `cloudflare-workers/frontend-gateway/src/index.js` | Gateway Worker (fetch handler + cron) |
| `cloudflare-workers/frontend-gateway/wrangler.toml` | Worker config: routes, R2 binding, env vars, cron |
| `cloudflare-workers/frontend-gateway/package.json` | Minimal package.json |
| `.github/workflows/deploy-pages-fallback.yml` | GitHub Action: build + deploy to Pages on push |
| `railway.json` | Railway config: 2 replicas, ALWAYS restart |
| `tools/upload-frontend-to-r2.sh` | Upload frontend build to R2 emergency bucket |
| `frontend/public/config.js` | Runtime config (API URLs, keys) |

---

## Railway Configuration

`railway.json` settings that prevent the 2026-02-11 incident from recurring:

| Setting | Value | Why |
|---------|-------|-----|
| `numReplicas` | `2` | One replica survives SIGTERM while the other restarts |
| `restartPolicyType` | `ALWAYS` | Restarts even on clean exit (code 0) |
| `healthcheckPath` | `/` | Railway auto-restarts if health check fails |
| `restartPolicyMaxRetries` | `10` | Max retry attempts before giving up |

---

## Cost

| Component | Monthly Cost |
|-----------|-------------|
| Gateway Worker (free tier: 100k req/day) | $0 |
| Cloudflare Pages (free tier: 500 builds/mo) | $0 |
| R2 storage (~50MB build) | ~$0.001 |
| R2 reads (only during double-outage) | ~$0 |
| Railway 2nd replica (minimal static server) | ~$3-5 |
| **Total** | **~$3-5/mo** |

---

## Common Commands

```bash
# Deploy the gateway worker
cd cloudflare-workers/frontend-gateway && wrangler deploy

# Check current health
curl -s https://cc1.automate8.com/_gateway/health | python3 -m json.tool

# Check which origin is serving
curl -sI https://cc1.automate8.com/ | grep x-served-from

# Set Slack alert webhook (one-time)
cd cloudflare-workers/frontend-gateway
wrangler secret put ALERT_WEBHOOK_URL
# Paste your Slack incoming webhook URL

# Upload to R2 emergency cache (after major release)
cd frontend && npm run build:prod
# Upload files with: wrangler r2 object put frontend-builds/<key> --file=build/<file> --remote
```

---

## Testing Failover

```bash
# 1. Verify normal operation
curl -sI https://cc1.automate8.com/ | grep x-served-from
# Expected: x-served-from: railway

# 2. Simulate Railway outage (Pages takes over)
cd cloudflare-workers/frontend-gateway
wrangler deploy --var RAILWAY_ORIGIN:https://invalid.example.com
curl -sI https://cc1.automate8.com/ | grep x-served-from
# Expected: x-served-from: pages-fallback

# 3. Simulate double outage (R2 takes over)
wrangler deploy --var RAILWAY_ORIGIN:https://invalid.example.com \
                --var PAGES_ORIGIN:https://invalid.example.com
curl -sI https://cc1.automate8.com/ | grep x-served-from
# Expected: x-served-from: r2-fallback
# Visit https://cc1.automate8.com - full app still works!

# 4. Restore everything
wrangler deploy
curl -sI https://cc1.automate8.com/ | grep x-served-from
# Expected: x-served-from: railway
```

---

## Incident Response Playbook

```
You receive Slack alert: "Railway frontend origin is DOWN"

Step 1: Don't panic. Users are already on the fallback.
        +--------------------------------------------------+
        | Check: https://cc1.automate8.com/_gateway/health |
        +--------------------------------------------------+
                             |
                             v
               Is "pages" or "r2" healthy?
                    |                |
                   YES               NO
                    |                |
                    v                v
            Users are fine.    ALL origins down.
            Proceed to         This is critical.
            Step 2.            Escalate immediately.
                    |
                    v
Step 2: Check Railway dashboard for the cause.
        - Deployment failed?
        - Platform maintenance?
        - Resource limits?
                    |
                    v
Step 3: Fix Railway.
        - Redeploy: railway redeploy --service frontend --yes
        - Or wait for Railway to recover
                    |
                    v
Step 4: Verify recovery.
        curl -sI https://cc1.automate8.com/ | grep x-served-from
        # Should show: x-served-from: railway
                    |
                    v
Step 5: Done. No user-facing action was needed at any point.
        The failover handled everything automatically.
```

---

## FAQ

**Q: Do users see anything different during failover?**
A: No. The app looks and works identically. SMS, chat, contacts, workflows - everything works because the backend APIs are separate services.

**Q: How fast is the failover?**
A: 3 seconds max (Railway timeout). The next request after Railway goes down will take ~3s longer, then Pages responds instantly.

**Q: What if I push a broken frontend?**
A: Railway and Pages both deploy the same code. If the build is broken on both, R2 still serves the last known-good version.

**Q: Do I need to update R2 on every push?**
A: No, it's automatic. The same GitHub Action that deploys to Pages also uploads to R2. All 3 tiers stay in sync on every push to `main`.

**Q: Why not just use Cloudflare Pages as the primary?**
A: Railway gives us a full Node.js server with `serve`, which handles SPA routing natively. Pages works too (via `_redirects`), but Railway is our established primary with monitoring, logs, and 2 replicas.

**Q: What about the backend? Is it also redundant?**
A: This architecture only covers the **frontend** (UI files). The backend (Express on Railway, Cloudflare Workers, Supabase) has its own redundancy patterns.
