# Database Constraint Implementation Guide

## 🎯 **Objective**
Add a unique constraint to the `contacts` table to prevent duplicate phone numbers within the same workspace at the database level.

## 📋 **Implementation Steps**

### **Step 1: Run the Constraint Script**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the script: `scripts/add_unique_constraint.sql`

### **Step 2: Test the Constraint**
1. Run the test script: `scripts/test_unique_constraint.sql`
2. Verify that:
   - Duplicate phone numbers in same workspace are rejected
   - Same phone numbers in different workspaces are allowed
   - Different phone numbers in same workspace are allowed

### **Step 3: Verify Implementation**
```sql
-- Check if constraint exists
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'contacts' 
    AND tc.constraint_type = 'UNIQUE'
    AND tc.constraint_name = 'unique_phone_workspace';
```

## 🔍 **What This Constraint Does**

### **Prevents:**
- ❌ Same phone number in same workspace
- ❌ Race condition duplicates
- ❌ Application-level deduplication failures

### **Allows:**
- ✅ Same phone number in different workspaces
- ✅ Different phone numbers in same workspace
- ✅ Existing data remains unchanged

## 🚨 **Important Notes**

### **Before Implementation:**
- **Backup your database** (recommended)
- **Test in development** environment first
- **Verify no existing duplicates** that would conflict

### **After Implementation:**
- **Monitor webhook logs** for constraint violations
- **Update error handling** in webhook processing
- **Test webhook functionality** thoroughly

## 📊 **Expected Results**

### **Success Indicators:**
- ✅ Constraint added successfully
- ✅ Test script runs without errors
- ✅ Webhook processing continues normally
- ✅ Duplicate prevention works at database level

### **Error Handling:**
- Webhook will receive constraint violation errors
- Application should handle gracefully
- Log constraint violations for monitoring

## 🔧 **Troubleshooting**

### **If Constraint Addition Fails:**
1. Check for existing duplicates in the database
2. Clean up duplicates first
3. Retry constraint addition

### **If Webhook Processing Fails:**
1. Check webhook error logs
2. Verify constraint is working correctly
3. Update webhook error handling if needed

## 📈 **Next Steps**

After successful implementation:
1. **Monitor performance** - Check webhook processing times
2. **Update documentation** - Document the new constraint
3. **Plan next feature** - Performance monitoring or analytics

## 🎯 **Success Criteria**

- [ ] Constraint added successfully
- [ ] Test script passes all tests
- [ ] Webhook processing works normally
- [ ] No duplicate contacts can be created
- [ ] Cross-workspace contacts still allowed
