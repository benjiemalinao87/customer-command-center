# Enhanced Webhook Rules System

## Overview

The Enhanced Webhook Rules system allows you to create sophisticated conditional routing rules for incoming webhook contacts. Instead of simple webhook-to-column mapping, you can now create rules based on multiple data conditions like lead status, product, lead source, market, and custom fields.

## Features

### ✅ **Conditional Logic**
- Support for multiple conditions per rule (AND logic)
- 10+ operators: equals, contains, in list, starts with, etc.
- JSON path extraction from webhook payloads
- Priority-based rule processing

### ✅ **Field Types Supported**
- **Lead Status** - Route based on lead qualification
- **Product** - Different products to different columns  
- **Lead Source** - Organic, paid ads, referrals, etc.
- **Market** - Geographic or demographic markets
- **Email/Phone** - Contact information based routing
- **Custom Fields** - Any JSON field with custom JSON path

### ✅ **Advanced Operators**
- `equals` / `not_equals` - Exact matching
- `contains` / `not_contains` - Substring matching
- `in` / `not_in` - List-based matching (comma-separated)
- `starts_with` / `ends_with` - Prefix/suffix matching
- `exists` / `not_exists` - Field presence checking

### ✅ **Priority System**
- Rules processed in priority order (0-100)
- Higher priority rules evaluated first
- First matching rule wins

### ✅ **Management Features**
- Create, edit, delete rules
- Enable/disable rules without deletion
- View rule conditions and logic
- Real-time validation

## Database Schema

### Tables Created
1. **`webhook_conditional_rules`** - Main rule definitions
2. **`webhook_rule_conditions`** - Individual conditions per rule

### Key Fields
- `webhook_id` - Which webhook this rule applies to
- `target_column_id` - Destination board column
- `priority` - Processing order (higher = first)
- `is_active` - Enable/disable toggle
- `field_name` - Data field to evaluate
- `operator` - Comparison operation
- `field_value` - Value to match against
- `json_path` - JSONPath for field extraction

## Usage Examples

### Example 1: Lead Status Routing
```
Rule: "Route Qualified Leads to Hot Column"
Webhook: "Lead Generation"
Target Column: "Hot Leads"
Conditions:
- lead_status equals "qualified" ($.lead_status)
```

### Example 2: Product-Based Routing
```
Rule: "Solar Leads to Solar Team"
Webhook: "Product Inquiries" 
Target Column: "Solar Team"
Conditions:
- product contains "solar" ($.product)
- market in "residential,commercial" ($.market)
```

### Example 3: Geographic Routing
```
Rule: "SF Bay Area Leads"
Webhook: "Geographic Leads"
Target Column: "SF Team"
Conditions:
- market equals "SF" ($.market)
- lead_source not_equals "spam" ($.lead_source)
```

## JSON Path Examples

### Common Patterns
- `$.lead_status` - Root level field
- `$.contact.email` - Nested object field
- `$.tags[0]` - Array element
- `$.custom_fields.industry` - Custom nested field

### Complex Examples
- `$.lead_data.qualification.score` - Deep nesting
- `$.source_info.utm_campaign` - UTM tracking
- `$.address.city` - Geographic data

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Webhook Processing Flow                     │
└─────────────────────────────────────────────────────────────────┘

1. Incoming Webhook Payload
         │
         ▼
┌────────────────────┐
│  Extract JSON Data │
│   (JSONPath)       │
└─────────┬──────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│  Load Rules (Ordered by Priority Desc)  │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────┐
│  For Each Rule...   │
└─────────┬───────────┘
          │
          ▼
┌────────────────────────────┐      ┌──────────────┐
│  Evaluate All Conditions   │─────>│ All Match?   │
│  (AND Logic)               │      └──────┬───────┘
└────────────────────────────┘             │
                                           │
                           ┌───────────────┴────────────┐
                           │                            │
                          YES                          NO
                           │                            │
                           ▼                            ▼
                  ┌─────────────────┐         ┌──────────────┐
                  │ Route to Target │         │ Try Next     │
                  │     Column      │         │     Rule     │
                  └────────┬────────┘         └──────┬───────┘
                           │                         │
                           ▼                         │
                  ┌─────────────────┐                │
                  │  Create Contact │                │
                  │  in Column      │                │
                  └─────────────────┘                │
                                                     │
                           ┌─────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  No Rule Match  │
                  │  Use Default    │
                  └─────────────────┘
```

### Frontend Components
- **`EnhancedWebhookRulesPanel`** - Main UI component
- **`ConditionRow`** - Individual condition editor
- **`RuleModal`** - Rule creation/editing dialog

### Backend Processing
- Rules stored in Supabase with RLS policies
- Webhook processing evaluates rules by priority
- First matching rule determines column placement

### Security
- Row Level Security (RLS) enabled
- Workspace-based access control
- User authentication required

## Best Practices

### Rule Design
1. **Use descriptive names** - "SF Qualified Leads" vs "Rule 1"
2. **Set appropriate priorities** - Important rules = higher priority
3. **Test with sample data** - Validate JSON paths work
4. **Keep conditions simple** - Avoid overly complex logic

### Performance
1. **Limit conditions per rule** - More conditions = slower processing
2. **Use efficient operators** - `equals` faster than `contains`
3. **Order by frequency** - Common rules = higher priority
4. **Regular cleanup** - Remove unused/inactive rules

### Maintenance
1. **Document business logic** - Use description fields
2. **Monitor rule effectiveness** - Check if rules are matching
3. **Update JSON paths** - When webhook payload structure changes
4. **Test after changes** - Verify rules work as expected

## Migration from Basic Rules

The system maintains backward compatibility with the basic `webhook_board_rules` table. Enhanced rules take precedence when both exist.

### Migration Steps
1. Note existing basic rules
2. Create equivalent enhanced rules
3. Test with sample webhooks
4. Disable/remove basic rules
5. Monitor for correct routing

## Troubleshooting

### Common Issues
1. **Rule not matching** - Check JSON path syntax
2. **Wrong column routing** - Verify priority order
3. **No rules applying** - Check webhook/board association
4. **Performance slow** - Reduce condition complexity

### Debug Process
1. Check webhook logs for payload structure
2. Verify JSON paths extract correct values
3. Test conditions individually
4. Confirm rule is active and has correct priority

## Future Enhancements

### Planned Features
- OR logic between conditions
- Regular expression matching
- Date/time based conditions
- A/B testing for rules
- Analytics dashboard
- Bulk rule import/export
- Rule templates library

### Integration Opportunities
- CRM system integration
- Lead scoring integration
- Marketing automation triggers
- Analytics and reporting
- Workflow automation

## API Reference

### GraphQL Queries
```graphql
# Get rules for a board
query GetWebhookRules($boardId: String!, $workspaceId: String!) {
  webhook_conditional_rules(
    where: {
      board_id: { _eq: $boardId }
      workspace_id: { _eq: $workspaceId }
    }
    order_by: { priority: desc }
  ) {
    id
    name
    webhook_id
    target_column_id
    priority
    is_active
    webhook_rule_conditions {
      field_name
      operator
      field_value
      json_path
    }
  }
}
```

### REST API Endpoints
```
GET    /api/webhook-rules/:boardId
POST   /api/webhook-rules
PUT    /api/webhook-rules/:ruleId  
DELETE /api/webhook-rules/:ruleId
POST   /api/webhook-rules/:ruleId/test
```

## Support

For technical support or feature requests related to Enhanced Webhook Rules:

1. Check existing documentation
2. Test with sample payloads
3. Review webhook logs
4. Contact development team

---

**Created**: June 24, 2025  
**Version**: 1.0.0  
**Status**: Production Ready 