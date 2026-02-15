# Supabase Realtime Subscription Optimization Tracking

> **Created:** December 28, 2025
> **Status:** Active - Systematic Fix Required
> **Database Impact:** 247,186 calls consuming 85% of DB time
> **Expected Reduction:** 75-90% after all fixes

---

## Executive Summary

The application has **47+ Realtime subscription patterns** causing excessive database load. This document tracks all subscriptions, their issues, and systematic fixes.

### Key Metrics

| Metric | Current | Target |
|--------|---------|--------|
| `realtime.list_changes` calls | 247,186 | ~25,000 |
| DB time consumed | 85.1% | <15% |
| Active subscriptions per session | ~40-50 | <15 |
| Mean query time | 10ms | 10ms (acceptable) |
| Max query time (outliers) | 11,330ms | <1,000ms |

---

## Audit Results Summary (Updated)

### Good News
After deep audit, most subscriptions are **properly implemented**:
- ✅ **All critical files have workspace filters** - no unfiltered subscriptions found
- ✅ **Most files have proper cleanup** - using `unsubscribe()` or `removeChannel()`
- ✅ Action Center sections (Messages, Emails, Calls, Notifications) are all properly filtered

### Primary Optimization Opportunities
The main issue is **subscription count**, not missing filters:

| Optimization | Current → Target | Reduction |
|--------------|-----------------|-----------|
| ActionCenterButton.js | 4 channels → 1 | 75% |
| useCampaignAnalytics.js | 3 channels → 1 | 67% |
| useBoardData.js | 3 channels → 1 | 67% |
| Action Center Sections | 5 channels → 1 | 80% |

### Root Cause Analysis
The 247k `realtime.list_changes` calls are likely due to:
1. **High subscription count** (~40-50 active channels per session)
2. **Frequent component mounting/unmounting** (LiveChat, Board views)
3. **Multiple components subscribing to same tables** (contacts table has 5+ subscribers)
4. **Channel polling frequency** (Supabase default interval)

---

## Phase 1: Critical Fixes (Immediate Priority)

### Status Legend
- [ ] Not Started
- [x] Completed
- [~] In Progress
- [!] Blocked

---

### 1.1 ActionCenterButton.js - CRITICAL

**File:** `frontend/src/components/action-center/ActionCenterButton.js`
**Lines:** 135-204
**Subscriptions:** 4 channels
**Status:** [ ] Not Started

#### Current State
```javascript
// Lines 135-150: contacts_count_changes
const contactsSubscription = supabase
  .channel('contacts_count_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'contacts',
    filter: `workspace_id=eq.${currentWorkspace.id}`  // ✓ Filter exists
  }, ...)
  .subscribe();

// Lines 152-168: calls_count_changes
const callsSubscription = supabase
  .channel('calls_count_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'call_logs',
    filter: `workspace_id=eq.${currentWorkspace.id}`  // ✓ Filter exists
  }, ...)
  .subscribe();

// Lines 170-186: emails_count_changes
const emailsSubscription = supabase
  .channel('emails_count_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'email_messages',
    filter: `workspace_id=eq.${currentWorkspace.id}`  // ✓ Filter exists
  }, ...)
  .subscribe();

// Lines 188-204: notifications_count_changes
const notificationsSubscription = supabase
  .channel('notifications_count_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'custom_notifications',
    filter: `workspace_id=eq.${currentWorkspace.id}`  // ✓ Filter exists
  }, ...)
  .subscribe();
```

#### Issues Found
| Issue | Severity | Status |
|-------|----------|--------|
| 4 separate channels (inefficient) | Medium | [ ] |
| Workspace filter present | ✓ OK | ✓ |
| Cleanup uses `.unsubscribe()` instead of `removeChannel()` | Low | [ ] |

#### Recommended Fix
```javascript
// CONSOLIDATE: Use single channel with multiple listeners
const actionCenterChannel = supabase
  .channel(`action_center_${currentWorkspace.id}`)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'contacts',
    filter: `workspace_id=eq.${currentWorkspace.id}`
  }, () => fetchNotificationCount())
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'call_logs',
    filter: `workspace_id=eq.${currentWorkspace.id}`
  }, () => fetchNotificationCount())
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'email_messages',
    filter: `workspace_id=eq.${currentWorkspace.id}`
  }, () => fetchNotificationCount())
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'custom_notifications',
    filter: `workspace_id=eq.${currentWorkspace.id}`
  }, () => fetchNotificationCount())
  .subscribe();

return () => supabase.removeChannel(actionCenterChannel);
```

#### Expected Impact
- **Before:** 4 subscriptions
- **After:** 1 subscription
- **Reduction:** 75%

---

### 1.2 useCampaignAnalytics.js - COMPLETED

**File:** `frontend/src/hooks/useCampaignAnalytics.js`
**Lines:** 83-148
**Subscriptions:** 3 channels → 1 channel
**Status:** [x] Completed (2025-12-28)

#### Current State
```javascript
// Lines 95-107: campaign_time_metrics_changes
const timeMetricsSubscription = supabase
  .channel('campaign_time_metrics_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'campaign_time_metrics',
    filter: `workspace_id=eq.${workspaceId} AND board_id=eq.${boardId}`  // ✓ Filter
  }, ...)
  .subscribe();

// Lines 109-121: sequence_performance_changes
const sequenceSubscription = supabase
  .channel('sequence_performance_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'campaign_sequence_performance',
    filter: `workspace_id=eq.${workspaceId} AND board_id=eq.${boardId}`  // ✓ Filter
  }, ...)
  .subscribe();

// Lines 123-135: board_performance_changes
const boardSubscription = supabase
  .channel('board_performance_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'board_performance_ranking',
    filter: `workspace_id=eq.${workspaceId}`  // ✓ Filter
  }, ...)
  .subscribe();
```

#### Issues Found
| Issue | Severity | Status |
|-------|----------|--------|
| 3 separate channels (inefficient) | Medium | [ ] |
| Workspace + board filters present | ✓ OK | ✓ |
| Cleanup implemented correctly | ✓ OK | ✓ |

#### Recommended Fix
```javascript
// CONSOLIDATE: Use single channel
const analyticsChannel = supabase
  .channel(`campaign_analytics_${workspaceId}_${boardId}`)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'campaign_time_metrics',
    filter: `workspace_id=eq.${workspaceId}`
  }, () => fetchTimeMetrics())
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'campaign_sequence_performance',
    filter: `workspace_id=eq.${workspaceId}`
  }, () => fetchSequenceData())
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'board_performance_ranking',
    filter: `workspace_id=eq.${workspaceId}`
  }, () => fetchBoardComparison())
  .subscribe();
```

#### Expected Impact
- **Before:** 3 subscriptions
- **After:** 1 subscription
- **Reduction:** 67%

#### Implementation (2025-12-28)
```javascript
// OPTIMIZED: Consolidated 3 separate channels into 1 channel with multiple listeners
const channelName = `campaign-analytics-${workspaceId}-${boardId}`;
const campaignAnalyticsChannel = supabase
  .channel(channelName)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'campaign_time_metrics',
    filter: `workspace_id=eq.${workspaceId}`
  }, (payload) => {
    if (payload.new?.board_id === boardId || payload.old?.board_id === boardId) {
      fetchTimeMetrics();
    }
  })
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'campaign_sequence_performance',
    filter: `workspace_id=eq.${workspaceId}`
  }, (payload) => {
    if (payload.new?.board_id === boardId || payload.old?.board_id === boardId) {
      fetchSequenceData();
    }
  })
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'board_performance_ranking',
    filter: `workspace_id=eq.${workspaceId}`
  }, () => fetchBoardComparison())
  .subscribe();

// Cleanup: Remove the single consolidated channel
return () => supabase.removeChannel(campaignAnalyticsChannel);
```

---

### 1.3 boardNotificationService.js - HIGH PRIORITY

**File:** `frontend/src/services/boardNotificationService.js`
**Lines:** 197-214
**Subscriptions:** 1 channel
**Status:** [ ] Not Started

#### Current State
```javascript
// Lines 197-209
const subscription = supabase
  .channel('contacts-channel')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'contacts',
    filter: `workspace_id=eq.${workspaceId}`  // ✓ Filter exists
  }, async (payload) => {
    const unreadCounts = await boardNotificationService.getAllBoardUnreadCounts(workspaceId);
    callback(unreadCounts);
  })
  .subscribe();
```

#### Issues Found
| Issue | Severity | Status |
|-------|----------|--------|
| Generic channel name `contacts-channel` | Low | [ ] |
| Workspace filter present | ✓ OK | ✓ |
| Cleanup implemented | ✓ OK | ✓ |

#### Recommended Fix
```javascript
// Use unique channel name per workspace
const subscription = supabase
  .channel(`board_notifications_${workspaceId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'contacts',
    filter: `workspace_id=eq.${workspaceId}`
  }, ...)
  .subscribe();
```

#### Expected Impact
- Minor improvement in channel management
- Prevents potential channel name collisions

---

### 1.4 NeedsFollowUp.js - HIGH PRIORITY

**File:** `frontend/src/components/contactV2/NeedsFollowUp.js`
**Lines:** 184-212
**Subscriptions:** 1 channel
**Status:** [ ] Not Started

#### Current State
```javascript
// Lines 187-207
const channel = supabase
  .channel("follow-up-contacts")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "contacts",
      filter: `workspace_id=eq.${currentWorkspace.id}`,  // ✓ Filter exists
    },
    (payload) => {
      if (
        payload.new?.follow_up_date !== payload.old?.follow_up_date ||
        payload.eventType === "DELETE"
      ) {
        fetchFollowUpContacts();
      }
    }
  )
  .subscribe();

return () => {
  supabase.removeChannel(channel);  // ✓ Proper cleanup
};
```

#### Issues Found
| Issue | Severity | Status |
|-------|----------|--------|
| Workspace filter present | ✓ OK | ✓ |
| Proper cleanup with removeChannel | ✓ OK | ✓ |
| Fetches all workspace contacts on any change | Medium | [ ] |

#### Recommended Fix
- Consider debouncing the `fetchFollowUpContacts()` call
- Current implementation is acceptable

#### Expected Impact
- Low priority - already well-implemented

---

### 1.5 TrainingList.js - MEDIUM PRIORITY

**File:** `frontend/src/components/my-ai-agent/components/Training/TrainingList.js`
**Lines:** 77-108
**Subscriptions:** 1 channel
**Status:** [ ] Not Started

#### Current State
```javascript
// Lines 80-101
const subscription = supabase
  .channel('ai_training_records_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'ai_training_records',
    filter: `workspace_id=eq.${currentWorkspace.id}`  // ✓ Filter exists
  }, (payload) => {
    // Handle INSERT, UPDATE, DELETE
  })
  .subscribe();

return subscription;
```

#### Issues Found
| Issue | Severity | Status |
|-------|----------|--------|
| Workspace filter present | ✓ OK | ✓ |
| Cleanup implemented | ✓ OK | ✓ |
| Uses `.unsubscribe()` instead of `removeChannel()` | Low | [ ] |

#### Recommended Fix
```javascript
// Use removeChannel for proper cleanup
return () => {
  supabase.removeChannel(subscription);
};
```

---

## Phase 2: Consolidation Opportunities

### 2.1 MainContent.js Global Notifications

**File:** `frontend/src/components/MainContent.js`
**Lines:** 127-201
**Subscriptions:** 2 channels (current + next month partitions)
**Status:** [ ] Not Started

#### Current State
- Subscribes to 2 monthly partitions for global notifications
- Has proper workspace filter
- Has proper cleanup

#### Assessment
- **Current implementation is acceptable** for global notifications
- Consider adding a debounce for month boundary transitions

---

## Phase 3: All Subscription Inventory

### Complete File List (43 files with subscriptions)

| # | File | Subs | Has Filter | Has Cleanup | Priority |
|---|------|------|------------|-------------|----------|
| 1 | ActionCenterButton.js | 4 | ✓ | ✓ | MEDIUM (consolidate) |
| 2 | useCampaignAnalytics.js | 3 | ✓ | ✓ | MEDIUM (consolidate) |
| 3 | boardNotificationService.js | 1 | ✓ | ✓ | LOW |
| 4 | NeedsFollowUp.js | 1 | ✓ | ✓ | LOW |
| 5 | TrainingList.js | 1 | ✓ | ✓ | LOW |
| 6 | MainContent.js | 2 | ✓ | ✓ | LOW |
| 7 | contactV2State.js | 1 | ✓ | ~partial | MEDIUM |
| 8 | useDailyPriorities.js | 1 | ? | ? | AUDIT |
| 9 | ContactList.js (livechat) | 1 | ? | ? | AUDIT |
| 10 | FeatureRequestButton.js | 1 | ? | ? | AUDIT |
| 11 | messageStore.js | 1 | ? | ? | AUDIT |
| 12 | useRealtimeMessages.js | 1 | ✓ | ✓ | LOW |
| 13 | useMessageRealtime.js | 3 | ✓ | ✓ | LOW |
| 14 | TodoSection.js | 1 | ✓ | ? | LOW |
| 15 | SpeedToLeadBoard.js | 1 | ? | ? | AUDIT |
| 16 | ChatPopUp.js | 1 | ? | ? | AUDIT |
| 17 | livechatService.js | 1 | ✓ | ✓ | LOW |
| 18 | BoardWindow.js | 1 | ? | ? | AUDIT |
| 19 | trainingService.js | 1 | ? | ? | AUDIT |
| 20 | useContactTimeline.js | 2+ | ✓ | ✓ | LOW |
| 21 | useBoardData.js | 2 | ✓ | ✓ | ✅ DONE (consolidated 3→2) |
| 22 | usePresence.js | 1 | N/A | ✓ | LOW |
| 23 | BoardView.js | 1 | ? | ? | AUDIT |
| 24 | OpenConversationsCounter.js | 1 | ? | ? | AUDIT |
| 25 | EmailsSection.js | 1 | ✓ | ✓ | LOW |
| 26 | MessagesSection.js | 1 | ✓ | ✓ | LOW |
| 27 | CallsSection.js | 1 | ✓ | ✓ | LOW |
| 28 | CustomNotificationsSection.js | 1 | ✓ | ✓ | LOW |
| 29 | webchatRealtimeService.js | 1 | ? | ? | AUDIT |
| 30 | scheduledMessagesService.js | 1 | ✓ | ✓ | LOW |
| 31 | BroadcastService.js | 1 | ? | ? | AUDIT |
| 32 | emailService.js | 1 | ? | ? | AUDIT |
| 33 | workspaceEventsService.js | 1 | ? | ? | AUDIT |
| 34 | webchatService.js | 1 | ? | ? | AUDIT |
| 35 | assignmentService.js | 1 | ? | ? | AUDIT |
| 36 | useBackground.js | 1 | ✓ | ✓ | LOW |
| 37 | useStatusCounts.js | 1 | ✓ | ✓ | LOW |

---

## Implementation Checklist

### Phase 1: Channel Consolidation (Highest Impact)
- [x] **ActionCenterButton.js** - Remove duplicate subscriptions ✅ DONE (2025-12-28)
  - File: `frontend/src/components/action-center/ActionCenterButton.js`
  - Lines: 125-153
  - Impact: -4 subscriptions (removed entirely, sections handle their own)
  - Change: Removed all real-time subscriptions, replaced with 30-second polling for badge count. Individual sections (MessagesSection, EmailsSection, etc.) handle real-time updates when Action Center is open.

- [x] **useCampaignAnalytics.js** - Consolidate 3 channels → 1 channel ✅ DONE (2025-12-28)
  - File: `frontend/src/hooks/useCampaignAnalytics.js`
  - Lines: 83-148
  - Impact: -2 subscriptions when analytics are used
  - Change: Consolidated 3 separate channels into 1 channel with multiple `.on()` listeners. Added board_id payload filtering to ensure updates only trigger for the current board.

- [x] **useBoardData.js** - Consolidate 3 channels → 2 channels ✅ DONE (2025-12-28)
  - File: `frontend/src/components/livechat2/boardView/useBoardData.js`
  - Lines: 181-255 (consolidated), 135-178 (boards - kept separate)
  - Impact: -1 subscription per board view
  - Change: Merged `livechat_board_column` and `contact_livechat_board_column` subscriptions into single channel with multiple `.on()` listeners. Board subscription kept separate due to different dependencies (workspace_id only vs activeBoardId).

- [ ] **Action Center Sections** - Consider consolidating into parent
  - MessagesSection.js (Line 89)
  - EmailsSection.js (Line 103)
  - CallsSection.js (Line 159)
  - CustomNotificationsSection.js (Line 255)
  - TodoSection.js (Line 87)
  - Note: These may already be handled by ActionCenterButton.js subscriptions

### Phase 2: Contacts Table Optimization (Medium Impact)
Multiple components subscribe to `contacts` table changes:
- [ ] **Audit contacts subscriptions** - Identify if some can be shared
  - contactV2State.js (Line 52)
  - NeedsFollowUp.js (Line 187)
  - useStatusCounts.js (Line 74)
  - MessagesSection.js (Line 89)
  - boardNotificationService.js (Line 197)

- [ ] **Consider shared subscription service** for contacts table
  - Create `contactsRealtimeService.js`
  - Single subscription, multiple callbacks
  - Reduces 5+ subscriptions to 1

### Phase 3: Architecture Improvements (Lower Priority)
- [ ] Create centralized subscription registry for debugging
- [ ] Add `supabase.getChannels().length` logging in dev mode
- [ ] Create reusable `useSupabaseSubscription` hook with auto-cleanup
- [ ] Implement batch processing for callbacks

### Phase 4: Remaining Audit Items
Files still needing review:
- [ ] useDailyPriorities.js
- [ ] ContactList.js (livechat)
- [ ] FeatureRequestButton.js
- [ ] messageStore.js
- [ ] SpeedToLeadBoard.js
- [ ] ChatPopUp.js
- [ ] BoardWindow.js
- [ ] trainingService.js
- [ ] BoardView.js
- [ ] OpenConversationsCounter.js
- [ ] webchatRealtimeService.js
- [ ] BroadcastService.js
- [ ] emailService.js
- [ ] workspaceEventsService.js
- [ ] webchatService.js
- [ ] assignmentService.js

---

## Verification Steps

After each fix:

1. **Test real-time updates still work:**
   ```javascript
   // Browser console - check active channels
   console.log(supabase.getChannels());
   ```

2. **Monitor subscription count:**
   ```javascript
   // Should be < 15 for typical usage
   const channelCount = supabase.getChannels().length;
   console.log(`Active channels: ${channelCount}`);
   ```

3. **Check Supabase dashboard:**
   - Navigate to Database → Query Performance
   - Verify `realtime.list_changes` calls decreasing

4. **Memory leak check:**
   - Open DevTools → Memory
   - Navigate between pages
   - Take heap snapshots
   - Verify subscriptions are cleaned up

---

## Code Patterns Reference

### Good Pattern: Proper Cleanup
```javascript
useEffect(() => {
  const channel = supabase
    .channel(`unique_channel_${workspaceId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'my_table',
      filter: `workspace_id=eq.${workspaceId}`
    }, handleChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);  // ✓ Use removeChannel
  };
}, [workspaceId]);
```

### Bad Pattern: Missing Filter
```javascript
// ✗ DON'T DO THIS - receives ALL rows
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'contacts'  // No filter = ALL workspaces
}, ...)
```

### Bad Pattern: Multiple Channels for Same Purpose
```javascript
// ✗ DON'T DO THIS - use single channel with multiple listeners
const channel1 = supabase.channel('table1_changes')...
const channel2 = supabase.channel('table2_changes')...
const channel3 = supabase.channel('table3_changes')...
```

---

## Progress Log

| Date | Action | Impact | By |
|------|--------|--------|-----|
| 2025-12-28 | Initial audit completed | Identified 43 files | Claude |
| 2025-12-28 | ActionCenterButton.js optimized | Removed 4 duplicate subscriptions, use polling instead | Claude |
| 2025-12-28 | useCampaignAnalytics.js optimized | Consolidated 3 channels → 1 channel (-2 subscriptions) | Claude |
| 2025-12-28 | ChatbotAssistant duplicate fixed | Removed duplicate render in App.js | Claude |
| 2025-12-28 | useDailyPriorities channel names fixed | Changed static channel names to workspace-scoped (`chatbot-contacts-${workspaceId}`) to prevent React StrictMode duplicates | Claude |
| 2025-12-28 | useBoardData.js optimized | Consolidated 3 channels → 2 channels (-1 subscription per board view) | Claude |
| 2025-12-28 | contact_custom_fields index added | Created `idx_contact_custom_fields_contact_id` for 7.27% query cost improvement | Claude |
| 2025-12-28 | usePresence.js optimized | Removed random suffix from channel name, throttled cursor updates (500ms, 10px threshold), use payload directly instead of refetching | Claude |
| 2025-12-28 | BoardPresence.js fixed | Fixed layout shift with consistent width, removed SlideFade animation | Claude |

---

## Notes

- All ActionCenter section files (EmailsSection, MessagesSection, etc.) may share similar patterns - audit as a group
- The message subscription system (useRealtimeMessages + useMessageRealtime) has intentional redundancy for reliability
- Presence channels (usePresence.js) don't need workspace filters - they work differently
- Monthly partition subscriptions in MainContent.js are necessary for handling month boundaries

---

## Related Documentation

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- Internal: `docs/BACKGROUND_JOBS_IMPLEMENTATION.md`
