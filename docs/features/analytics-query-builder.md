# Analytics Query Builder

A comprehensive visual query builder that allows users to create custom analytics queries without writing SQL, with support for saving queries, exporting results, and real-time execution.

## 🎯 Features

### Visual Query Building
- **Data Source Selection**: Choose from available tables (contacts, messages, webhooks, etc.)
- **Field Selection**: Pick specific columns with categorized organization
- **Filter Builder**: Create complex filters with multiple operators
- **Real-time SQL Generation**: See the generated SQL query as you build
- **Query Validation**: Built-in security checks and validation

### Query Management
- **Save & Load Queries**: Save frequently used queries for reuse
- **Query Templates**: Pre-built templates for common analytics needs
- **Query History**: Track all executed queries with performance metrics
- **Share Queries**: Share queries across workspace team members

### Data Export & Visualization
- **CSV Export**: Export query results as CSV files
- **Real-time Results**: Execute queries and see results immediately
- **Performance Metrics**: View execution time and row counts
- **Result Limits**: Automatic limits to prevent overwhelming queries

## 🏗️ Architecture

### Database Tables

#### Core Tables
```sql
-- Analytics Query Templates (pre-built queries)
analytics_query_templates
├── id (UUID)
├── name (TEXT)
├── description (TEXT)
├── category (TEXT) -- 'lead_conversion', 'messaging', 'webhook', etc.
├── query_config (JSONB) -- Query configuration
├── sql_template (TEXT) -- SQL template with placeholders
├── visualization_type (TEXT) -- 'table', 'chart', 'metric'
└── is_public (BOOLEAN)

-- User-Created Saved Queries
analytics_saved_queries
├── id (UUID)
├── workspace_id (TEXT)
├── user_email (TEXT)
├── name (TEXT)
├── description (TEXT)
├── query_config (JSONB) -- Complete query configuration
├── sql_query (TEXT) -- Generated SQL query
├── visualization_config (JSONB) -- Chart/table configuration
├── is_shared (BOOLEAN)
├── execution_count (INTEGER)
└── timestamps

-- Data Sources Configuration
analytics_data_sources
├── id (UUID)
├── source_name (TEXT) -- 'contacts', 'messages', etc.
├── table_name (TEXT)
├── display_name (TEXT)
├── description (TEXT)
├── category (TEXT) -- 'core', 'messaging', 'webhooks'
├── fields (JSONB) -- Available fields with metadata
└── relationships (JSONB) -- Table relationships

-- Query Execution Logs
analytics_query_executions
├── id (UUID)
├── workspace_id (TEXT)
├── user_email (TEXT)
├── sql_query (TEXT)
├── execution_time_ms (INTEGER)
├── result_count (INTEGER)
├── status (TEXT) -- 'success', 'error', 'timeout'
└── error_details (TEXT)
```

#### Security Features
- **SQL Injection Prevention**: Only SELECT queries allowed
- **Query Validation**: Prevents dangerous operations (DROP, DELETE, etc.)
- **Row Limits**: Maximum 5,000 rows per query
- **Execution Timeouts**: Queries limited to reasonable execution time
- **Workspace Isolation**: Users can only query their workspace data

### Backend API Endpoints

```javascript
// Data Sources
GET /api/analytics/data-sources
GET /api/analytics/templates

// Query Execution
POST /api/analytics/execute
POST /api/analytics/export/csv

// Saved Queries
GET /api/analytics/saved-queries
POST /api/analytics/saved-queries
PUT /api/analytics/saved-queries/:id
DELETE /api/analytics/saved-queries/:id

// Performance & Logs
GET /api/analytics/executions
GET /api/analytics/performance
```

### Frontend Components

```
QueryBuilder/
├── QueryBuilder.js (Main component)
├── DataSourceSelector.js (Table selection)
├── FieldSelector.js (Column selection)
├── FilterBuilder.js (WHERE clause builder)
├── QueryPreview.js (SQL display)
└── QueryResults.js (Results table)
```

## 📊 Available Data Sources

### Core Business Data
- **Contacts**: Contact information, lead status, source tracking
- **Contact Field Changes**: Historical field changes for conversion analytics
- **Messages**: Text message history and communication analytics
- **Webhooks**: Webhook configurations and execution logs
- **Webhook Logs**: Detailed webhook execution history

### Pre-built Analytics Views
- **Lead Conversion Analytics**: Complete lead journey tracking
- **Message Volume Trends**: Communication patterns over time
- **Webhook Performance**: Integration health and success rates

## 🚀 Usage Guide

### Building Your First Query

1. **Select Data Sources**
   - Choose the tables you want to query (e.g., contacts, messages)
   - Multiple tables can be joined automatically

2. **Choose Fields**
   - Select specific columns from each table
   - Fields are organized by source table for clarity

3. **Add Filters** (Optional)
   - Filter by date ranges, status values, or text content
   - Multiple filter operators: equals, contains, greater than, etc.

4. **Execute Query**
   - Click "Run Query" to execute your query
   - Results appear in real-time with performance metrics

5. **Save for Reuse**
   - Give your query a name and description
   - Save for future use or share with team

### Example Queries

#### Lead Conversion Rate by Date
```sql
-- Find leads that converted from "New" to "Closed"
SELECT 
    DATE(changed_at) as date,
    COUNT(DISTINCT contact_id) as conversions
FROM contact_field_changes 
WHERE field_name = 'lead_status'
    AND old_value = 'New' 
    AND new_value = 'Closed'
    AND workspace_id = 'your-workspace-id'
GROUP BY DATE(changed_at)
ORDER BY date
```

#### Message Volume by Direction
```sql
-- Daily message volume (inbound vs outbound)
SELECT 
    DATE(created_at) as date,
    direction,
    COUNT(*) as message_count
FROM messages 
WHERE workspace_id = 'your-workspace-id'
    AND created_at >= '2025-01-01'
GROUP BY DATE(created_at), direction
ORDER BY date, direction
```

#### Top Performing Webhooks
```sql
-- Webhook success rates
SELECT 
    w.name as webhook_name,
    COUNT(wl.*) as total_calls,
    ROUND(COUNT(CASE WHEN wl.status = 'success' THEN 1 END)::numeric / COUNT(*) * 100, 2) as success_rate
FROM webhook_logs wl
JOIN webhooks w ON wl.webhook_id = w.id
WHERE wl.workspace_id = 'your-workspace-id'
GROUP BY w.name
ORDER BY total_calls DESC
```

## 🔧 Technical Implementation

### Security Measures

```javascript
// SQL Injection Prevention
const validateQuery = (sql) => {
  const safeSql = sql.trim().toUpperCase();
  
  // Only SELECT queries allowed
  if (!safeSql.startsWith('SELECT') && !safeSql.startsWith('WITH')) {
    throw new Error('Only SELECT queries are allowed');
  }
  
  // Prevent dangerous operations
  const forbidden = /\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE)\b/i;
  if (forbidden.test(sql)) {
    throw new Error('Query contains prohibited operations');
  }
  
  return true;
};
```

### Query Generation Logic

```javascript
const generateSQL = (config) => {
  const { selectedSources, selectedFields, filters, groupBy, orderBy, limit } = config;
  
  // Build SELECT clause
  const selectFields = selectedFields.join(', ');
  
  // Build FROM clause with automatic JOINs
  let fromClause = buildJoins(selectedSources, selectedFields);
  
  // Build WHERE clause with workspace isolation
  let whereClause = `workspace_id = '${workspaceId}'`;
  
  // Add user filters
  if (filters.length > 0) {
    const filterConditions = filters.map(buildFilterCondition);
    whereClause += ' AND ' + filterConditions.join(' AND ');
  }
  
  // Combine all parts
  return `SELECT ${selectFields} FROM ${fromClause} WHERE ${whereClause} ${groupBy} ${orderBy} LIMIT ${limit}`;
};
```

### Performance Optimizations

- **Database Indexes**: Optimized indexes for common query patterns
- **Query Caching**: Results cached for frequently used queries
- **Automatic JOINs**: Smart table relationship detection
- **Result Pagination**: Large result sets automatically paginated

## 📈 Performance Monitoring

### Query Execution Logs
- Track all query executions with timing
- Monitor slow queries and optimization opportunities
- Error tracking and debugging information

### Database Performance Stats
```sql
-- Get table sizes and performance metrics
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(table_name)) as table_size,
    pg_size_pretty(pg_indexes_size(table_name)) as index_size
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(table_name) DESC;
```

## 🔮 Future Enhancements

### Planned Features
- **Chart Visualizations**: Automatic chart generation from query results
- **Scheduled Reports**: Automated query execution and email reports
- **Query Optimization**: AI-powered query optimization suggestions
- **Advanced Filters**: Date range pickers, multi-select filters
- **Real-time Dashboards**: Live updating dashboards with multiple queries

### Integration Possibilities
- **External Data Sources**: Connect to external APIs and databases
- **AI Assistant**: Natural language to SQL conversion
- **Data Warehouse**: Connect to dedicated analytics databases
- **Business Intelligence**: Integration with BI tools like Tableau, PowerBI

## 🛠️ Development Setup

### Database Setup
```sql
-- Run the analytics migration
-- This creates all necessary tables, indexes, and functions
\i backend/migrations/analytics_query_builder_setup.sql
```

### Backend Setup
```javascript
// Add analytics routes to your Express app
import analyticsRoutes from './src/routes/analyticsRoutes.js';
app.use('/api/analytics', analyticsRoutes);
```

### Frontend Integration
```javascript
// Add QueryBuilder to your analytics window
import { QueryBuilder } from './components/analytics/QueryBuilder';

// Use in your analytics tab
<TabPanel>
  <QueryBuilder />
</TabPanel>
```

## 🔒 Security Considerations

### User Access Control
- Workspace-level data isolation
- User-specific saved queries
- Admin controls for template management

### Query Safety
- SQL injection prevention
- Resource limits (rows, execution time)
- Audit logging for all queries

### Data Privacy
- No sensitive data in logs
- Secure API authentication
- Proper error handling without data exposure

## 📝 Troubleshooting

### Common Issues

#### Query Execution Errors
```
Error: Query execution failed: column "field_name" does not exist
```
**Solution**: Check that the field exists in the selected data source and verify the field name spelling.

#### Performance Issues
```
Query took longer than expected to execute
```
**Solution**: Add filters to reduce result set size, or contact admin to optimize database indexes.

#### Permission Errors
```
Error: Not authorized to access this data
```
**Solution**: Verify workspace access and user permissions.

### Debug Mode
Enable detailed logging by setting:
```
DEBUG_ANALYTICS=true
```

This will log:
- Generated SQL queries
- Execution times
- Filter conditions
- Join operations

## 🤝 Contributing

### Adding New Data Sources
1. Insert into `analytics_data_sources` table
2. Define field metadata and relationships
3. Test query generation and execution
4. Update documentation

### Creating Query Templates
1. Design the query logic
2. Create parameterized SQL template
3. Add to `analytics_query_templates`
4. Test with various parameter combinations

### Performance Optimization
1. Monitor query execution logs
2. Identify slow query patterns
3. Add appropriate database indexes
4. Optimize JOIN strategies

## 📞 Support

For issues or questions:
- Check the troubleshooting section above
- Review query execution logs in the admin panel
- Contact the development team with specific error messages

---

**Built with ❤️ for data-driven decision making** 