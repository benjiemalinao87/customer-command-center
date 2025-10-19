# LiveChat Search Optimization Plan

## Current Implementation Analysis

The current search implementation in LiveChat has several limitations:

1. **Direct ILIKE Queries**: Search is performed using PostgreSQL's ILIKE operator on multiple columns, which is inefficient for large datasets.
2. **No Caching**: Every search query directly hits the database without any caching mechanism.
3. **Limited Relevance Ranking**: Results are sorted by creation date rather than search relevance.
4. **Poor Scalability**: The current approach doesn't scale well with increasing data volume.
5. **Limited UX Features**: No search highlighting, suggestions, or autocomplete functionality.

## Proposed Optimization Strategy

### 1. Database-Level Optimizations

#### Implement PostgreSQL Full-Text Search

```sql
-- Create a search vector that combines relevant fields
ALTER TABLE contacts 
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(firstname, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(lastname, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(email, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(phone_number, '')), 'C')
) STORED;

-- Create a GIN index for the search vector
CREATE INDEX contacts_search_idx ON contacts USING GIN (search_vector);

-- Create a function for searching contacts
CREATE OR REPLACE FUNCTION search_contacts(
  workspace_id_param UUID,
  search_term TEXT,
  result_limit INTEGER DEFAULT 50
) RETURNS SETOF contacts AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM contacts
  WHERE 
    workspace_id = workspace_id_param AND
    search_vector @@ plainto_tsquery('english', search_term)
  ORDER BY ts_rank(search_vector, plainto_tsquery('english', search_term)) DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
```

### 2. Backend Service Optimizations

#### Create a Dedicated Search Service

We'll create a new `livechatSearchService.js` file with the following features:

- API for utilizing the PostgreSQL full-text search
- Results caching using memory or Redis
- Debounced search requests
- Enhanced error handling
- Search analytics tracking

#### Caching Strategy

- Implement a TTL (Time-To-Live) cache for frequent search queries
- Cache invalidation on relevant data changes
- Separate caches for different workspaces

### 3. Frontend Optimizations

#### Enhanced Search UX

- Implement debounced search input to reduce unnecessary API calls
- Add loading indicators during search operations
- Display highlighted search terms in results
- Implement "no results found" states with suggestions
- Add keyboard navigation for search results

#### Pagination and Infinite Scrolling

- Load initial results quickly and allow pagination or infinite scrolling for additional results
- Cache previous search pages to improve navigation experience

### 4. Implementation Plan

#### Phase 1: Database Preparation

1. Create the search vector column and GIN index
2. Implement the `search_contacts` function
3. Test performance against the current implementation

#### Phase 2: Search Service Implementation

1. Create the `livechatSearchService.js` file
2. Implement caching mechanisms
3. Connect to the new PostgreSQL search function
4. Add error handling and logging

#### Phase 3: Frontend Integration

1. Update the LiveChat2 component to use the new search service
2. Implement debounced search input
3. Enhance the UI with loading states and highlights
4. Add keyboard navigation and pagination

#### Phase 4: Testing and Optimization

1. Performance testing with various dataset sizes
2. Identify and fix any bottlenecks
3. Fine-tune caching parameters
4. Monitor and adjust based on real-world usage

### 5. Expected Outcomes

- **Improved Performance**: Faster search results, especially for large datasets
- **Better Relevance**: Results sorted by relevance rather than creation date
- **Reduced Database Load**: Fewer and more efficient database queries
- **Enhanced User Experience**: More responsive UI with helpful features
- **Scalability**: System that scales well with increasing data volume

## Technical Considerations

### Security

- All user inputs must be sanitized to prevent SQL injection attacks
- Implement proper authorization checks before performing searches

### Monitoring

- Add logging for search performance metrics
- Track common search terms to optimize the system further

### Compatibility

- Ensure backward compatibility with existing LiveChat features
- Design for easy integration with future enhancements
