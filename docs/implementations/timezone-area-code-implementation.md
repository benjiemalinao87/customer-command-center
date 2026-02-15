# Timezone Identification by Area Code from Phone Number

## Overview

This feature automatically detects a contact's timezone based on their US phone number area code when they are created via webhook. This enables accurate TCPA business hours compliance for SMS messaging.

## Problem Statement

Previously, contacts received their timezone from the board's settings (`boards.settings.timezone`). This was inaccurate because:
- A board in California might receive leads from New York
- SMS messages could be sent outside business hours in the contact's actual timezone
- TCPA compliance requires respecting the contact's local time, not the business's time

## Solution

Detect timezone from the contact's phone number area code at creation time, with board timezone as fallback.

---

## Data Flow Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONTACT CREATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌──────────────────┐
                          │  External Source │
                          │  (Form, CRM, etc)│
                          └────────┬─────────┘
                                   │
                                   │ POST /webhooks/{webhook_id}
                                   │ { phone_number: "+12125551234" }
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE WORKER (Edge)                              │
│                        webhook-processor-prod                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  1. Receive webhook payload                                            │  │
│  │  2. Validate webhook exists & is active                                │  │
│  │  3. Process field mappings (phone_number populated here)               │  │
│  │  4. Call addBoardMetadata() ◄── TIMEZONE DETECTION HAPPENS HERE        │  │
│  │     └─► getTimezoneFromPhone("+12125551234")                           │  │
│  │         └─► Extract area code: "212"                                   │  │
│  │         └─► Lookup: AREA_CODE_TIMEZONE_MAP["212"]                      │  │
│  │         └─► Return: "America/New_York"                                 │  │
│  │  5. Store in contactData.metadata.timezone                             │  │
│  │  6. Insert contact into Supabase                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ INSERT into contacts table
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE (PostgreSQL)                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  contacts table                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │  id: "1f2746dc-b83f-..."                                        │  │  │
│  │  │  phone_number: "+12125551234"                                   │  │  │
│  │  │  metadata: {                                                    │  │  │
│  │  │    "timezone": "America/New_York",  ◄── STORED HERE             │  │  │
│  │  │    "webhook": { ... },                                          │  │  │
│  │  │    "board_phone_number": "+18005551234"                         │  │  │
│  │  │  }                                                              │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### SMS Sending Flow (Using Timezone)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SMS SENDING FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend   │     │  Trigger.dev │     │   Supabase   │     │   Twilio    │
│   (React)    │     │  (Workflows) │     │  (Database)  │     │   (SMS)     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬──────┘
       │                    │                    │                    │
       │  User clicks       │                    │                    │
       │  "Send SMS"        │                    │                    │
       │────────────────────►                    │                    │
       │                    │                    │                    │
       │                    │  Fetch contact     │                    │
       │                    │────────────────────►                    │
       │                    │                    │                    │
       │                    │  Return contact    │                    │
       │                    │  with metadata     │                    │
       │                    │◄────────────────────                    │
       │                    │                    │                    │
       │                    │  ┌─────────────────────────────────┐   │
       │                    │  │ sendSMSDirectly() checks:       │   │
       │                    │  │                                 │   │
       │                    │  │ 1. Get timezone from:           │   │
       │                    │  │    contact.metadata.timezone    │   │
       │                    │  │    → "America/New_York"         │   │
       │                    │  │                                 │   │
       │                    │  │ 2. Get current time in timezone │   │
       │                    │  │    → 2:30 PM EST                │   │
       │                    │  │                                 │   │
       │                    │  │ 3. Check business hours         │   │
       │                    │  │    → 8 AM - 9 PM? YES ✓         │   │
       │                    │  │                                 │   │
       │                    │  │ 4. If within hours, send SMS    │   │
       │                    │  └─────────────────────────────────┘   │
       │                    │                    │                    │
       │                    │  Send SMS via Twilio                   │
       │                    │────────────────────────────────────────►
       │                    │                    │                    │
       │                    │                    │    SMS Delivered   │
       │                    │◄────────────────────────────────────────
       │                    │                    │                    │
       │  Update UI         │                    │                    │
       │◄────────────────────                    │                    │
       │                    │                    │                    │
```

### Timezone Detection Logic

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      getTimezoneFromPhone() LOGIC                            │
└─────────────────────────────────────────────────────────────────────────────┘

                    Input: "+12125551234"
                              │
                              ▼
                 ┌────────────────────────┐
                 │ Remove non-digits      │
                 │ "12125551234"          │
                 └───────────┬────────────┘
                             │
                             ▼
                 ┌────────────────────────┐
                 │ Check length           │
                 └───────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────────┐
        │ 11 digits│  │ 10 digits│  │ Other length │
        │ starts   │  │          │  │              │
        │ with "1" │  │          │  │              │
        └────┬─────┘  └────┬─────┘  └──────┬───────┘
             │             │               │
             ▼             ▼               ▼
      ┌────────────┐ ┌────────────┐  ┌──────────┐
      │ Extract    │ │ Extract    │  │ Return   │
      │ chars 1-4  │ │ chars 0-3  │  │ null     │
      │ "212"      │ │ "212"      │  │          │
      └─────┬──────┘ └─────┬──────┘  └──────────┘
            │              │
            └──────┬───────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ Lookup area code    │
        │ in AREA_CODE_MAP    │
        └──────────┬──────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
    ┌─────────┐        ┌──────────┐
    │ Found   │        │ Not Found│
    │         │        │          │
    └────┬────┘        └────┬─────┘
         │                  │
         ▼                  ▼
  ┌─────────────────┐  ┌──────────┐
  │ Return timezone │  │ Return   │
  │ "America/       │  │ null     │
  │  New_York"      │  │          │
  └─────────────────┘  └──────────┘
```

### Timezone Priority Fallback

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TIMEZONE PRIORITY CHAIN                                │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │  Priority 1: Area Code Detection (NEW)                              │
    │  ════════════════════════════════════                               │
    │  getTimezoneFromPhone(contact.phone_number)                         │
    │                                                                     │
    │  Example: +1 (212) 555-1234 → "America/New_York"                    │
    │                                                                     │
    └───────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    │ If null (non-US or unknown area code)
                                    ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │  Priority 2: Board Timezone Setting (EXISTING)                      │
    │  ══════════════════════════════════════════════                     │
    │  board.settings.timezone                                            │
    │                                                                     │
    │  Example: "America/Los_Angeles" (from board settings)               │
    │                                                                     │
    └───────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    │ If null (no board timezone set)
                                    ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │  Priority 3: Workspace Timezone (EXISTING)                          │
    │  ══════════════════════════════════════════                         │
    │  workspace.timezone                                                 │
    │                                                                     │
    │  Example: "America/Chicago" (from workspace settings)               │
    │                                                                     │
    └───────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    │ If null (no workspace timezone)
                                    ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │  Priority 4: UTC (FINAL FALLBACK)                                   │
    │  ═════════════════════════════════                                  │
    │  "UTC"                                                              │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
deepseek-test-livechat/
├── backend/
│   └── src/
│       └── utils/
│           └── areaCodeTimezone.js       ◄── Main utility (Express backend)
│
├── cloudflare-workers/
│   └── webhook-processor/
│       └── src/
│           ├── handlers/
│           │   └── fieldMapping.js       ◄── Uses timezone detection
│           └── utils/
│               └── areaCodeTimezone.js   ◄── Copy for Cloudflare Worker
│
└── trigger/
    └── utils/
        └── areaCodeTimezone.js           ◄── Copy for Trigger.dev tasks
```

---

## Key Files and Code

### 1. Area Code Timezone Utility

**File:** `backend/src/utils/areaCodeTimezone.js`

```javascript
// ~350 US area codes mapped to IANA timezones
const AREA_CODE_TIMEZONE_MAP = {
  // Eastern Time (America/New_York)
  '201': 'America/New_York',  // New Jersey
  '202': 'America/New_York',  // Washington DC
  '212': 'America/New_York',  // New York City
  '312': 'America/Chicago',   // Chicago
  '310': 'America/Los_Angeles', // Los Angeles
  '303': 'America/Denver',    // Denver
  '808': 'Pacific/Honolulu',  // Hawaii
  '907': 'America/Anchorage', // Alaska
  // ... ~350 more area codes
};

export function getTimezoneFromPhone(phoneNumber) {
  if (!phoneNumber) return null;

  // Remove all non-digits
  const digits = phoneNumber.replace(/\D/g, '');

  let areaCode;

  // Handle +1XXXXXXXXXX format (11 digits)
  if (digits.length === 11 && digits.startsWith('1')) {
    areaCode = digits.substring(1, 4);
  }
  // Handle XXXXXXXXXX format (10 digits)
  else if (digits.length === 10) {
    areaCode = digits.substring(0, 3);
  }
  // Not a US number format
  else {
    return null;
  }

  return AREA_CODE_TIMEZONE_MAP[areaCode] || null;
}
```

### 2. Field Mapping Handler (Cloudflare Worker)

**File:** `cloudflare-workers/webhook-processor/src/handlers/fieldMapping.js`

```javascript
import { getTimezoneFromPhone } from '../utils/areaCodeTimezone.js';

export async function processFieldMappings(payload, mappings, webhook, env) {
  // ... field mapping logic ...

  // IMPORTANT: This must be called AFTER field mappings
  // so that contactData.phone_number is populated
  await addBoardMetadata(contactData, webhook, env);

  return contactData;
}

async function addBoardMetadata(contactData, webhook, env) {
  // ... fetch board from database ...

  // Timezone detection: Priority 1) Area code, 2) Board setting
  const phoneNumber = contactData.phone_number;
  const areaCodeTimezone = getTimezoneFromPhone(phoneNumber);

  if (areaCodeTimezone) {
    contactData.metadata.timezone = areaCodeTimezone;
    console.log(`Applied timezone ${areaCodeTimezone} from area code`);
  } else if (board.settings?.timezone) {
    contactData.metadata.timezone = board.settings.timezone;
    console.log(`Applied board timezone ${board.settings.timezone}`);
  }
}
```

### 3. SMS Sending with Timezone Check

**File:** `trigger/unifiedWorkflows.js` (in `sendSMSDirectly()`)

```javascript
// Get contact's timezone for TCPA compliance
const contactTimezone = contact.metadata?.timezone
  || workspace.timezone
  || 'UTC';

// Check if current time is within business hours
const now = DateTime.now().setZone(contactTimezone);
const hour = now.hour;

// TCPA requires SMS between 8 AM - 9 PM local time
if (hour < 8 || hour >= 21) {
  console.log(`Outside business hours in ${contactTimezone}, scheduling for later`);
  // Schedule for next business hour window
  return scheduleForBusinessHours(contact, message, contactTimezone);
}

// Within business hours, send immediately
await twilioClient.messages.create({
  to: contact.phone_number,
  from: boardPhoneNumber,
  body: message
});
```

---

## US Area Code Coverage

### By Timezone

| Timezone | IANA Identifier | States/Regions |
|----------|-----------------|----------------|
| Eastern | `America/New_York` | CT, DC, DE, FL, GA, IN, KY, MA, MD, ME, MI, NC, NH, NJ, NY, OH, PA, RI, SC, TN, VA, VT, WV |
| Central | `America/Chicago` | AL, AR, IA, IL, KS, LA, MN, MO, MS, ND, NE, OK, SD, TX, WI |
| Mountain | `America/Denver` | CO, ID, MT, NM, UT, WY |
| Mountain (No DST) | `America/Phoenix` | AZ |
| Pacific | `America/Los_Angeles` | CA, NV, OR, WA |
| Alaska | `America/Anchorage` | AK (907) |
| Hawaii | `Pacific/Honolulu` | HI (808) |
| Puerto Rico | `America/Puerto_Rico` | PR (787, 939) |
| US Virgin Islands | `America/St_Thomas` | VI (340) |
| Guam | `Pacific/Guam` | GU (671) |

### Sample Area Codes

```
Eastern Time (America/New_York):
  212 - New York City, NY
  617 - Boston, MA
  202 - Washington, DC
  404 - Atlanta, GA
  305 - Miami, FL

Central Time (America/Chicago):
  312 - Chicago, IL
  214 - Dallas, TX
  504 - New Orleans, LA
  612 - Minneapolis, MN

Mountain Time (America/Denver):
  303 - Denver, CO
  505 - Albuquerque, NM
  801 - Salt Lake City, UT

Pacific Time (America/Los_Angeles):
  310 - Los Angeles, CA
  415 - San Francisco, CA
  206 - Seattle, WA
  702 - Las Vegas, NV

Special:
  808 - Hawaii (Pacific/Honolulu)
  907 - Alaska (America/Anchorage)
  787 - Puerto Rico (America/Puerto_Rico)
```

---

## Edge Cases

### 1. Non-US Phone Numbers

```
Input:  +44 20 7946 0958 (UK)
Result: null (not in area code map)
Action: Falls back to board timezone
```

### 2. Canadian Numbers (+1)

```
Input:  +1 416 555 1234 (Toronto)
Result: null (416 not mapped - Canadian area code)
Action: Falls back to board timezone
```

### 3. Invalid/Unknown Area Codes

```
Input:  +1 000 555 1234
Result: null (000 not a valid area code)
Action: Falls back to board timezone
```

### 4. Short/Long Numbers

```
Input:  "5551234" (7 digits)
Result: null (not 10 or 11 digits)
Action: Falls back to board timezone
```

---

## Testing

### Test Contacts Created

| Name | Phone | Area Code | Expected Timezone | Contact ID |
|------|-------|-----------|-------------------|------------|
| NYC212 | +12125559999 | 212 | America/New_York | `1f2746dc-b83f-4cf2-b75a-31f1328165d5` |
| LA310 | +13105559999 | 310 | America/Los_Angeles | `866eca01-5ad0-497a-a329-2a852886e68e` |
| Chicago312 | +13125559999 | 312 | America/Chicago | `02ee5249-ceac-4079-9597-098098911b5d` |
| Denver303 | +13035559999 | 303 | America/Denver | `f13caa30-aa62-46f1-9efa-2c9fc5d6ab1d` |
| Hawaii808 | +18085559999 | 808 | Pacific/Honolulu | `8a99fd38-9630-47e2-9959-f75cc2475793` |

### Test via cURL

```bash
# Test with NYC area code (212 → America/New_York)
curl -X POST "https://worker.api-customerconnect.app/webhooks/{webhook_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "phone_number": "+12125551234",
    "email": "test@example.com"
  }'
```

### Verify Timezone in Database

```javascript
// Query contact to verify timezone was set
const { data } = await supabase
  .from('contacts')
  .select('phone_number, metadata')
  .eq('id', contactId);

console.log(data[0].metadata.timezone);
// Expected: "America/New_York"
```

---

## Deployment

### Files Modified

1. **Backend utility:** `backend/src/utils/areaCodeTimezone.js`
2. **Backend routes:** `backend/src/routes/webhookRoutes.js`
3. **Worker utility:** `cloudflare-workers/webhook-processor/src/utils/areaCodeTimezone.js`
4. **Worker handler:** `cloudflare-workers/webhook-processor/src/handlers/fieldMapping.js`
5. **Trigger utility:** `trigger/utils/areaCodeTimezone.js`

### Deploy Commands

```bash
# Deploy Cloudflare Worker
cd cloudflare-workers/webhook-processor
wrangler deploy --env production

# Deploy Trigger.dev
npx trigger.dev@4.3.2 deploy
```

---

## Bug Fixes Applied

### Bug 1: Timezone Detection Order

**Problem:** `addBoardMetadata()` was called before field mappings processed, so `contactData.phone_number` was undefined.

**Fix:** Moved `addBoardMetadata()` call to after field mappings in `fieldMapping.js:103`.

### Bug 2: Invalid IANA Timezone

**Problem:** Area code 340 (US Virgin Islands) was mapped to `'America/Virgin'` which is not a valid IANA timezone identifier.

**Fix:** Changed to `'America/St_Thomas'` in all three files.

---

## Related Files

- [fieldMapping.js](../cloudflare-workers/webhook-processor/src/handlers/fieldMapping.js) - Webhook processing
- [areaCodeTimezone.js](../backend/src/utils/areaCodeTimezone.js) - Timezone utility
- [unifiedWorkflows.js](../trigger/unifiedWorkflows.js) - SMS sending with TCPA check

---

## Questions?

Contact the backend team or check the Trigger.dev dashboard for workflow execution logs.
