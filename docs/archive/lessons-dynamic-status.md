## Dynamic Status Handling in Pipeline View

### Database Constraints vs. Dynamic Data

1. **Check Database Constraints**:
   - When implementing dynamic fields that users can configure, ensure database constraints don't restrict those values
   - Use `\d table_name` or check constraint definitions to identify restrictions before implementing features
   - Remember that SQL CHECK constraints will prevent insertion/updates with values outside the constraint

2. **Status Name Preservation**:
   - For truly dynamic features, avoid database constraints that limit specific values
   - Store the exact user-configured values in the database rather than mapping to predefined values
   - Consider using enums only for system statuses that aren't user-configurable

3. **Error Handling**:
   - Add specific error handling to catch database constraint violations
   - Provide clear user feedback when constraint errors occur
   - Log database errors with sufficient context for debugging

4. **Migration Best Practices**:
   - Document constraint changes in migration files with detailed comments
   - Always create rollback plans for constraint modifications
   - Test constraint changes on a staging environment before production

5. **UI Integration**:
   - Ensure the UI properly reflects the exact status values from the database
   - Use consistent field names in UI and database to avoid confusion
   - Add flexible styling to accommodate variable length status names
