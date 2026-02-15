# Sequence Condition Steps - User Guide

**Version:** 1.0
**Last Updated:** February 2026
**Audience:** End Users, Marketing Teams, Business Users

---

## Table of Contents

1. [What Are Condition Steps?](#what-are-condition-steps)
2. [When to Use Condition Steps](#when-to-use-condition-steps)
3. [Understanding Branches](#understanding-branches)
4. [Step-by-Step Guide](#step-by-step-guide)
5. [Real-World Examples](#real-world-examples)
6. [Settings Tab vs Condition Steps](#settings-tab-vs-condition-steps)
7. [Troubleshooting](#troubleshooting)

---

## What Are Condition Steps?

Condition Steps allow you to **send different messages to different contacts** within a single sequence, based on their data (like product interest, lead status, or any custom field).

### Before Condition Steps (Old Way)

You needed **multiple sequences** for different audiences:

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Windows Sequence   │    │  Roofing Sequence   │    │  Siding Sequence    │
├─────────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│ SMS: Windows info   │    │ SMS: Roofing info   │    │ SMS: Siding info    │
│ SMS: Window pricing │    │ SMS: Roof pricing   │    │ SMS: Siding pricing │
│ SMS: Call us!       │    │ SMS: Call us!       │    │ SMS: Call us!       │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘

Problem: 3 sequences to maintain!
```

### With Condition Steps (New Way)

**ONE sequence** handles all scenarios:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     HOME IMPROVEMENT SEQUENCE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 1: SMS "Thanks for your interest!" (Everyone gets this)           │
│                              │                                          │
│                              ▼                                          │
│  Step 2: ◆ CONDITION - Check "product_interest"                         │
│              │                                                          │
│       ┌──────┼──────┬──────────────┐                                   │
│       │      │      │              │                                   │
│       ▼      ▼      ▼              ▼                                   │
│   "Windows" "Roofing" "Siding"  Otherwise                              │
│       │      │      │              │                                   │
│       ▼      ▼      ▼              ▼                                   │
│  Step 3: Different messages based on branch                            │
│                                                                         │
│       │      │      │              │                                   │
│       └──────┴──────┴──────────────┘                                   │
│                              │                                          │
│                              ▼                                          │
│  Step 4: SMS "Call 555-1234 for your free quote" (Everyone)            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Solution: 1 sequence, multiple paths!
```

---

## When to Use Condition Steps

### Use Condition Steps When:

| Scenario | Example |
|----------|---------|
| Different products/services | Windows vs Roofing vs Siding |
| Different customer segments | Residential vs Commercial |
| Different urgency levels | Hot lead vs Warm lead |
| Different locations | North region vs South region |
| A/B testing messages | Version A vs Version B |

### Don't Use Condition Steps When:

| Scenario | Better Solution |
|----------|-----------------|
| Just want to stop unqualified leads | Use Settings tab → Enrollment Rules |
| Completely different campaigns | Create separate sequences |
| Time-based variations | Use delay settings instead |

---

## Understanding Branches

### What is a Branch?

A **branch** is a path through your sequence based on a condition.

Think of it like a road splitting into multiple paths:

```
                    START
                      │
                      ▼
              ┌───────────────┐
              │  CONDITION    │
              │ Check Status  │
              └───────┬───────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ Branch A│  │ Branch B│  │Otherwise│
    │  "Hot"  │  │ "Warm"  │  │  Stop   │
    └────┬────┘  └────┬────┘  └─────────┘
         │            │
         ▼            ▼
    Hot Lead      Warm Lead
    Messages      Messages
```

### Branch Components

Each branch has:

| Component | Description | Example |
|-----------|-------------|---------|
| **Name** | Label for the branch | "Hot Leads" |
| **Conditions** | Rules to match | `lead_status = "Hot"` |
| **Logic** | How to combine conditions | "All conditions" (AND) or "Any condition" (OR) |

### Otherwise (Default Path)

When NO branch matches, the "Otherwise" action kicks in:

| Option | What Happens |
|--------|--------------|
| **Stop sequence** | Contact exits, no more messages |
| **Continue** | Contact proceeds to next step |

---

## Step-by-Step Guide

### Creating a Condition Step

1. **Open your sequence** in the Builder tab

2. **Click "Add Condition"** at the bottom of the timeline

3. **Configure the condition:**
   ```
   ┌─────────────────────────────────────────┐
   │         Condition Branch                 │
   │  Route contacts based on field values    │
   ├─────────────────────────────────────────┤
   │                                         │
   │  Condition Name: [Product Check      ]  │
   │                                         │
   │  ┌─────────────────────────────────┐   │
   │  │ Branch 1: Hot Leads              │   │
   │  │ IF lead_status = "Hot"          │   │
   │  └─────────────────────────────────┘   │
   │                                         │
   │  [+ Add Branch]                         │
   │                                         │
   │  Otherwise: [Stop sequence ▼]           │
   │                                         │
   └─────────────────────────────────────────┘
   ```

4. **Add messages after the condition** - each message can be assigned to a branch

5. **Save** your sequence

### Adding Multiple Branches

Click "+ Add Branch" to create additional paths:

```
Branches
├── Branch 1: Windows    (IF product = "Windows")
├── Branch 2: Roofing    (IF product = "Roofing")
├── Branch 3: Siding     (IF product = "Siding")
└── Otherwise: Stop sequence
```

---

## Real-World Examples

### Example 1: Product-Based Messaging

**Scenario:** You sell Windows, Roofing, and Siding. You want to send product-specific information.

```
SEQUENCE: "Home Improvement Follow-up"

Step 1: SMS (Everyone)
        "Hi {{contact.firstname}}, thanks for your interest!"

Step 2: CONDITION - Check product_interest
        ├── Branch: Windows → Step 3
        ├── Branch: Roofing → Step 4
        ├── Branch: Siding  → Step 5
        └── Otherwise: Stop

Step 3: SMS (Windows only)
        "Our energy-efficient windows can save you 30% on heating!"

Step 4: SMS (Roofing only)
        "Our roofing comes with a 50-year warranty!"

Step 5: SMS (Siding only)
        "Transform your home's curb appeal with new siding!"

Step 6: SMS (Everyone who matched a branch)
        "Call 555-1234 for your FREE estimate!"
```

**Results:**

| Contact | product_interest | Messages Received |
|---------|------------------|-------------------|
| John | Windows | Step 1 → Step 3 → Step 6 |
| Sarah | Roofing | Step 1 → Step 4 → Step 6 |
| Mike | HVAC | Step 1 → STOP (no branch matched) |

### Example 2: Lead Temperature Routing

**Scenario:** Send more aggressive follow-up to hot leads, gentle nurturing to warm leads.

```
SEQUENCE: "Lead Follow-up"

Step 1: SMS "Thanks for contacting us!"

Step 2: CONDITION - Check lead_temperature
        ├── Branch: Hot  (lead_score > 80)
        ├── Branch: Warm (lead_score 50-80)
        └── Otherwise: Continue

Step 3: SMS (Hot only)
        "We have a special offer just for you! Call NOW: 555-1234"

Step 4: SMS (Warm only)
        "Here's some helpful information about our services..."

Step 5: SMS (Everyone)
        "Questions? Reply to this message anytime!"
```

---

## Settings Tab vs Condition Steps

### Two Filtering Systems - Different Purposes

Your sequence has TWO places to filter contacts:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SEQUENCE                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐         ┌─────────────────────────────────┐   │
│  │  SETTINGS TAB   │         │        BUILDER TAB              │   │
│  │                 │         │                                 │   │
│  │ Enrollment Rules│         │  Step 1: SMS                    │   │
│  │ "WHO can enter" │         │  Step 2: CONDITION              │   │
│  │                 │         │          "WHICH path to take"   │   │
│  │ ☑ Only contacts │         │  Step 3: SMS (Branch A)         │   │
│  │   with status   │         │  Step 4: SMS (Branch B)         │   │
│  │   "Prospect"    │         │                                 │   │
│  └─────────────────┘         └─────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Comparison Table

| Feature | Settings Tab (Enrollment Rules) | Builder (Condition Steps) |
|---------|--------------------------------|---------------------------|
| **Purpose** | Filter WHO enters | Route WHICH path |
| **When checked** | Before each step | At the condition step |
| **Outcome** | Stop or Continue | Branch A, B, C, or Stop |
| **Use for** | Blocking unqualified leads | Sending different content |

### They Work Together!

```
Contact: John Smith
         lead_status = "Prospect Arrival"
         product_interest = "Windows"

FLOW:

  1. Enrollment Check (Settings Tab)
     └── lead_status = "Prospect Arrival"? ──YES──┐
                                                   │
  2. Enter Sequence                                ▼
     └── Step 1: SMS sent

  3. Condition Step (Builder)
     └── product_interest = "Windows"? ──YES──► Branch: Windows
                                                   │
  4. Continue on Windows path                      ▼
     └── Step 3: Windows-specific SMS sent
```

### When to Use Which

| Goal | Use This |
|------|----------|
| "Only enroll leads with status X" | Settings Tab |
| "Stop sequence if status changes" | Settings Tab (Auto-stop rules) |
| "Send different messages based on product" | Condition Steps |
| "Split A/B test messages" | Condition Steps |

---

## Troubleshooting

### Contact Not Receiving Branch-Specific Message

**Check:**
1. Does contact's data match the branch condition?
2. Is the condition using the correct field name?
3. Is the value an exact match (case-sensitive)?

### Contact Stopped Unexpectedly

**Check:**
1. Did "Otherwise: Stop" trigger because no branch matched?
2. Did Settings tab enrollment rules stop them?
3. Did they respond (auto-stop on response)?

### All Contacts Going to Same Branch

**Check:**
1. Are branch conditions specific enough?
2. Are conditions using correct operators (= vs contains)?
3. Is the field populated for all contacts?

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                 CONDITION STEPS QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ADD CONDITION:     Click "Add Condition" in Builder            │
│                                                                 │
│  ADD BRANCH:        Click "+ Add Branch" in condition editor    │
│                                                                 │
│  SET CONDITIONS:    Field → Operator → Value                    │
│                     Example: lead_status = "Hot"                │
│                                                                 │
│  LOGIC OPTIONS:     "All conditions" = AND (all must match)     │
│                     "Any condition" = OR (one must match)       │
│                                                                 │
│  OTHERWISE:         Stop = Exit sequence                        │
│                     Continue = Next step for everyone           │
│                                                                 │
│  COMMON OPERATORS:  =, !=, contains, starts with, is empty      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Need Help?

Contact support if you:
- Can't find the field you need
- Need help setting up complex conditions
- See unexpected behavior in your sequences
