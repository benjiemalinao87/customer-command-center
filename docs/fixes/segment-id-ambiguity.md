# Segment ID Ambiguity Fix Plan

## Issue Description
When updating lead status for contacts that are members of a board, the system encounters a SQL error:
`Error updating status: column reference "segment_id" is ambiguous`

### Current Behavior
- Works correctly when updating contacts NOT in any board
- Fails when updating contacts that ARE members of a board
- Error suggests multiple tables have `segment_id` column in the JOIN operations

### Affected Components
- Contact status updates
- Board member relationships
- Segment operations

## Database Schema Analysis
### Relevant Tables
1. `contacts`
   - Contains contact information
   - Lead status and other contact details

2. `board_members`
   - Tracks which contacts belong to which boards
   - Contains segment relationships

3. `audience_segments`
   - Manages segmentation
   - Referenced by other tables

4. `campaigns`
   - Contains segment references
   - Related to contact management

## Proposed Solutions

### 1. Query-Level Fix (Minimal Impact)
```sql
-- Qualify column names in queries
SELECT * FROM contacts c 
JOIN board_members bm ON bm.contact_id = c.id
WHERE c.segment_id = 'some_id'  -- Explicitly reference table
```

**Pros:**
- No schema changes required
- Quick to implement
- No data migration needed

**Cons:**
- Need to update all related queries
- Doesn't prevent future ambiguity

### 2. Schema-Level Fix (More Robust)
```sql
-- Rename columns for clarity
ALTER TABLE board_members 
RENAME COLUMN segment_id TO board_segment_id;

ALTER TABLE campaigns
RENAME COLUMN segment_id TO audience_segment_id;
```

**Pros:**
- Prevents ambiguity at database level
- More maintainable long-term
- Self-documenting

**Cons:**
- Requires schema changes
- Need to update all dependent code
- Requires data migration

### 3. View-Based Solution (Intermediate)
```sql
CREATE VIEW contact_board_details AS
SELECT 
    c.*,
    b.segment_id AS board_segment_id,
    s.id AS audience_segment_id
FROM contacts c
LEFT JOIN board_members b ON b.contact_id = c.id
LEFT JOIN audience_segments s ON s.id = b.segment_id;
```

**Pros:**
- No schema changes
- Centralizes JOIN logic
- Easier to maintain

**Cons:**
- Additional complexity
- Potential performance impact
- Need to update existing queries

## Implementation Plan

### Phase 1: Investigation & Preparation
1. Map all occurrences of segment_id in queries
2. Document all affected components
3. Create test cases for validation
4. Back up relevant data

### Phase 2: Implementation
1. Start with Query-Level Fix
   - Update queries with proper table qualification
   - Test in development environment
   - Validate all use cases

2. If needed, proceed with Schema-Level Fix
   - Create migration scripts
   - Update dependent code
   - Comprehensive testing

### Phase 3: Validation
1. Test all contact status update scenarios
2. Verify board member operations
3. Check segment-related functionality
4. Performance testing

### Phase 4: Rollout
1. Deploy to staging
2. Thorough testing in staging
3. Plan production deployment
4. Monitor for issues

## Rollback Plan
1. Keep backup of original queries
2. Maintain ability to revert schema changes
3. Document rollback procedures

## Success Criteria
- No ambiguity errors in status updates
- All existing functionality works correctly
- No performance degradation
- Clean error logs

## Next Steps
1. Review this plan with team
2. Choose preferred solution approach
3. Create detailed implementation timeline
4. Schedule deployment window

## Notes
- Monitor performance impact
- Consider future schema changes
- Document all changes thoroughly
- Update relevant tests 