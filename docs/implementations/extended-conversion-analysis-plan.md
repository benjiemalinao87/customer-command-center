# Extended Conversion Analysis Modal - Implementation Plan

## Overview

Extend the existing Conversion Analysis Modal to include additional metrics requested by the user. All metrics will reuse existing RPC functions and tracking where possible.

## User Requirements

1. **Contact Metrics**: Today, yesterday, this week counts
2. **Appointment Comparison**: This week vs last week
3. **Voice AI Conversion**: Add voice AI conversion tracking
4. **Email Metrics**: Delivery rate and open rate
5. **AI Response Metrics**: Number of contacts AI responded to, hours saved, cost savings

## Existing Functions Analysis

### ✅ Already Available

1. **`getDashboardKPIs(workspaceId)`** - Returns:
   - `total_contacts`, `week_contacts`, `prev_week_contacts`
   - `total_messages`, `week_messages`, `prev_week_messages`
   - `total_appointments`, `week_appointments`, `prev_week_appointments`
   - `ai_messages`

2. **`getAILaborSavings(workspaceId, dateRange)`** - Returns:
   - `aiMessageCount` - Number of AI responses
   - `totalAICost` - Cost of AI usage
   - `estimatedSavings` - Savings vs human cost
   - `hoursSaved` - Time saved (3 min per message)

3. **`getAppointmentsByChannel(workspaceId, dateRange)`** - Returns:
   - SMS Campaign appointments
   - Voice AI appointments

4. **Email Analytics** (Backend):
   - `backend/src/services/analytics/emailAnalytics.js`
   - `getEmailMetrics(workspaceId, dateRange)` - Returns delivery rate, open rate
   - Table: `sendgrid_events`

5. **`getCallsTimeSeries(workspaceId, dateRange)`** - Voice call data
   - Table: `call_logs`

### 🔨 Need to Create

1. **Contact time-based metrics** (today, yesterday)
2. **Email metrics RPC** (for frontend integration)
3. **Extended conversion analysis RPC** (to include all new metrics)

## Implementation Plan

### Phase 1: Create New RPC Functions

#### 1.1 Contact Time Metrics RPC

```sql
CREATE OR REPLACE FUNCTION get_contact_time_metrics(p_workspace_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSON;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_week_start DATE := CURRENT_DATE - INTERVAL '7 days';
BEGIN
  SELECT json_build_object(
    'today', (
      SELECT COUNT(*) FROM contacts 
      WHERE workspace_id = p_workspace_id 
      AND DATE(created_at) = v_today
    ),
    'yesterday', (
      SELECT COUNT(*) FROM contacts 
      WHERE workspace_id = p_workspace_id 
      AND DATE(created_at) = v_yesterday
    ),
    'this_week', (
      SELECT COUNT(*) FROM contacts 
      WHERE workspace_id = p_workspace_id 
      AND created_at >= v_week_start
    ),
    'total', (
      SELECT COUNT(*) FROM contacts 
      WHERE workspace_id = p_workspace_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
```

#### 1.2 Email Metrics RPC

```sql
CREATE OR REPLACE FUNCTION get_email_metrics_summary(p_workspace_id TEXT, p_date_range TEXT DEFAULT '7d')
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMP;
  v_sent INT;
  v_delivered INT;
  v_opened INT;
  v_clicked INT;
  v_bounced INT;
BEGIN
  -- Calculate start date based on range
  v_start_date := CASE p_date_range
    WHEN 'today' THEN CURRENT_DATE
    WHEN '7d' THEN NOW() - INTERVAL '7 days'
    WHEN '30d' THEN NOW() - INTERVAL '30 days'
    ELSE NOW() - INTERVAL '7 days'
  END;

  -- Count events by type
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'processed') as sent,
    COUNT(*) FILTER (WHERE event_type = 'delivered') as delivered,
    COUNT(DISTINCT CASE WHEN event_type = 'open' THEN email_address END) as opened,
    COUNT(DISTINCT CASE WHEN event_type = 'click' THEN email_address END) as clicked,
    COUNT(*) FILTER (WHERE event_type = 'bounce') as bounced
  INTO v_sent, v_delivered, v_opened, v_clicked, v_bounced
  FROM sendgrid_events
  WHERE workspace_id = p_workspace_id
    AND created_at >= v_start_date;

  -- Calculate rates
  v_result := json_build_object(
    'sent', COALESCE(v_sent, 0),
    'delivered', COALESCE(v_delivered, 0),
    'opened', COALESCE(v_opened, 0),
    'clicked', COALESCE(v_clicked, 0),
    'bounced', COALESCE(v_bounced, 0),
    'deliveryRate', CASE 
      WHEN v_sent > 0 THEN ROUND((v_delivered::numeric / v_sent::numeric) * 100, 2)
      ELSE 0
    END,
    'openRate', CASE 
      WHEN v_delivered > 0 THEN ROUND((v_opened::numeric / v_delivered::numeric) * 100, 2)
      ELSE 0
    END,
    'clickRate', CASE 
      WHEN v_opened > 0 THEN ROUND((v_clicked::numeric / v_opened::numeric) * 100, 2)
      ELSE 0
    END,
    'bounceRate', CASE 
      WHEN v_sent > 0 THEN ROUND((v_bounced::numeric / v_sent::numeric) * 100, 2)
      ELSE 0
    END
  );

  RETURN v_result;
END;
$$;
```

#### 1.3 Extended Conversion Analysis RPC

Update existing `get_sequence_conversion_analysis` to include new metrics:

```sql
-- Add to existing function
v_contact_metrics JSON;
v_email_metrics JSON;
v_ai_savings JSON;
v_voice_conversions INT;

-- Get contact time metrics
SELECT get_contact_time_metrics(p_workspace_id) INTO v_contact_metrics;

-- Get email metrics
SELECT get_email_metrics_summary(p_workspace_id, '7d') INTO v_email_metrics;

-- Get AI savings
SELECT json_build_object(
  'aiMessageCount', COUNT(*),
  'hoursSaved', ROUND(COUNT(*) * 3.0 / 60, 1),
  'costSavings', ROUND(COUNT(*) * 0.50 - COALESCE(SUM(cost), 0), 2)
) INTO v_ai_savings
FROM ai_response_logs
WHERE workspace_id = p_workspace_id
  AND created_at >= NOW() - INTERVAL '30 days';

-- Get voice AI conversions
SELECT COUNT(DISTINCT a.id) INTO v_voice_conversions
FROM appointments a
JOIN contacts c ON a.contact_id = c.id
WHERE c.workspace_id = p_workspace_id
  AND a.attribution_source = 'voice_ai';

-- Add to final result
v_result := json_build_object(
  'summary', v_summary,
  'sequences', COALESCE(v_sequences, '[]'::json),
  'topConvertingSteps', COALESCE(v_top_steps, '[]'::json),
  'insights', array_to_json(v_insights),
  'contactMetrics', v_contact_metrics,
  'emailMetrics', v_email_metrics,
  'aiSavings', v_ai_savings,
  'voiceConversions', v_voice_conversions
);
```

### Phase 2: Frontend Service Functions

Add to `frontend/src/services/analytics/dashboardAnalytics.js`:

```javascript
/**
 * Get contact time-based metrics (today, yesterday, this week)
 */
export const getContactTimeMetrics = async (workspaceId) => {
  try {
    const { data, error } = await supabase.rpc('get_contact_time_metrics', {
      p_workspace_id: workspaceId
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching contact time metrics:', error);
    return { today: 0, yesterday: 0, this_week: 0, total: 0 };
  }
};

/**
 * Get email metrics summary (delivery rate, open rate)
 */
export const getEmailMetricsSummary = async (workspaceId, dateRange = '7d') => {
  try {
    const { data, error } = await supabase.rpc('get_email_metrics_summary', {
      p_workspace_id: workspaceId,
      p_date_range: dateRange
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching email metrics:', error);
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      deliveryRate: 0,
      openRate: 0
    };
  }
};
```

### Phase 3: Update Modal Component

Add new slides to `ConversionAnalysisModal.js`:

#### Slide 6: Contact Activity Metrics
- Today's contacts
- Yesterday's contacts
- This week's contacts
- Week-over-week comparison

#### Slide 7: Email Performance
- Delivery rate (with gauge chart)
- Open rate (with gauge chart)
- Total sent/delivered/opened
- Bounce rate

#### Slide 8: AI Impact & Savings
- Number of contacts AI responded to
- Hours saved (vs human agent)
- Cost savings ($)
- Average response time

#### Slide 9: Voice AI Conversions
- Total voice AI appointments
- Voice AI vs SMS Campaign comparison
- Conversion rate by channel
- Top performing channel

### Phase 4: Update Total Slides Count

Change from 5 slides to 9 slides in modal:

```javascript
const totalSlides = 9; // Updated from 5
```

## Data Structure

### Extended RPC Response

```json
{
  "summary": {
    "totalAppointments": 49,
    "totalEnrollments": 46,
    "overallConversionRate": 106.52,
    "avgDaysToBooking": 8.2
  },
  "sequences": [...],
  "topConvertingSteps": [...],
  "insights": [...],
  "contactMetrics": {
    "today": 12,
    "yesterday": 15,
    "this_week": 89,
    "total": 23681
  },
  "emailMetrics": {
    "sent": 1000,
    "delivered": 950,
    "opened": 380,
    "clicked": 95,
    "bounced": 50,
    "deliveryRate": 95.0,
    "openRate": 40.0,
    "clickRate": 25.0,
    "bounceRate": 5.0
  },
  "aiSavings": {
    "aiMessageCount": 1500,
    "hoursSaved": 75.0,
    "costSavings": 650.00
  },
  "voiceConversions": 25,
  "appointmentComparison": {
    "thisWeek": 12,
    "lastWeek": 8,
    "percentChange": 50.0
  }
}
```

## UI Design for New Slides

### Slide 6: Contact Activity
```
┌─────────────────────────────────────┐
│ Contact Activity Overview           │
├─────────────────────────────────────┤
│  Today        Yesterday    This Week│
│  [  12  ]     [  15  ]     [  89  ] │
│                                     │
│  Week-over-Week Growth              │
│  ████████████░░░░░░░░░░░░░ +15%    │
└─────────────────────────────────────┘
```

### Slide 7: Email Performance
```
┌─────────────────────────────────────┐
│ Email Performance Metrics           │
├─────────────────────────────────────┤
│  Delivery Rate    Open Rate         │
│  ◉ 95.0%          ◉ 40.0%          │
│                                     │
│  1,000 sent → 950 delivered         │
│  380 opened → 95 clicked            │
└─────────────────────────────────────┘
```

### Slide 8: AI Impact
```
┌─────────────────────────────────────┐
│ AI Assistant Impact                 │
├─────────────────────────────────────┤
│  💬 1,500 Contacts Responded        │
│  ⏱️  75 Hours Saved                 │
│  💰 $650 Cost Savings               │
│                                     │
│  vs Human Agent: $750 → $100        │
└─────────────────────────────────────┘
```

### Slide 9: Voice AI Conversions
```
┌─────────────────────────────────────┐
│ Voice AI vs SMS Campaign            │
├─────────────────────────────────────┤
│  Voice AI:      25 appointments     │
│  SMS Campaign:  24 appointments     │
│                                     │
│  Voice AI is performing 4% better   │
└─────────────────────────────────────┘
```

## Implementation Steps

1. ✅ Create SQL migration for new RPC functions
2. ✅ Test RPC functions with workspace 22836
3. ✅ Add frontend service functions
4. ✅ Create new slide components
5. ✅ Update modal navigation (5 → 9 slides)
6. ✅ Test with real data
7. ✅ Update documentation

## Files to Modify

1. `supabase/migrations/20260119_extend_conversion_analysis.sql` (NEW)
2. `frontend/src/services/analytics/dashboardAnalytics.js` (ADD functions)
3. `frontend/src/components/analytics/ConversionAnalysisModal.js` (ADD slides)
4. `docs/implementations/extended-conversion-analysis-plan.md` (THIS FILE)

## Success Criteria

- ✅ Contact metrics show today, yesterday, this week counts
- ✅ Appointment comparison shows this week vs last week with % change
- ✅ Voice AI conversions tracked and displayed
- ✅ Email delivery and open rates displayed
- ✅ AI response metrics show contacts helped, hours saved, cost savings
- ✅ All metrics use existing RPC functions where possible
- ✅ Modal has 9 slides total
- ✅ Design matches existing HGE_PRESENTATION.html aesthetic
- ✅ Zero linting errors

## Timeline

- Phase 1 (RPC Functions): 30 minutes
- Phase 2 (Service Functions): 15 minutes
- Phase 3 (Modal Slides): 45 minutes
- Phase 4 (Testing): 30 minutes
- **Total**: ~2 hours

## Notes

- Reusing `get_dashboard_kpis_fast` for appointment comparison
- Reusing `getAILaborSavings` for AI metrics
- Reusing `getAppointmentsByChannel` for voice AI data
- Email metrics require new RPC (no existing frontend integration)
- Contact time metrics require new RPC (existing only has week totals)
