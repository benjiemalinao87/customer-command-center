-- API Request Tracking Table - FIXED VERSION
-- Run this in Supabase SQL Editor to create the tracking table

-- Create api_requests table
CREATE TABLE IF NOT EXISTS public.api_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id VARCHAR(50),
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  user_agent TEXT,
  ip_address VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint ON public.api_requests(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON public.api_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_api_requests_workspace_id ON public.api_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_status_code ON public.api_requests(status_code);

-- Create index for most used endpoints query
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint_created ON public.api_requests(endpoint, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all records
-- (Since only SaaS team members have access to the admin dashboard)
CREATE POLICY "Authenticated users can view API requests"
  ON public.api_requests
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Service role can insert (backend using service_role key)
CREATE POLICY "Service role can insert API requests"
  ON public.api_requests
  FOR INSERT
  WITH CHECK (true);

-- Create a function to get most used endpoints
CREATE OR REPLACE FUNCTION get_most_used_endpoints(
  time_range_hours INTEGER DEFAULT 24,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  endpoint VARCHAR,
  request_count BIGINT,
  avg_response_time NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.endpoint,
    COUNT(*)::BIGINT as request_count,
    ROUND(AVG(ar.response_time_ms)::NUMERIC, 2) as avg_response_time,
    ROUND((COUNT(*) FILTER (WHERE ar.status_code < 400)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) as success_rate
  FROM api_requests ar
  WHERE ar.created_at >= NOW() - (time_range_hours || ' hours')::INTERVAL
  GROUP BY ar.endpoint
  ORDER BY request_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get endpoint usage trends
CREATE OR REPLACE FUNCTION get_endpoint_trends(
  days INTEGER DEFAULT 7
)
RETURNS TABLE (
  date DATE,
  total_requests BIGINT,
  unique_endpoints BIGINT,
  avg_response_time NUMERIC,
  error_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ar.created_at) as date,
    COUNT(*)::BIGINT as total_requests,
    COUNT(DISTINCT ar.endpoint)::BIGINT as unique_endpoints,
    ROUND(AVG(ar.response_time_ms)::NUMERIC, 2) as avg_response_time,
    COUNT(*) FILTER (WHERE ar.status_code >= 400)::BIGINT as error_count
  FROM api_requests ar
  WHERE ar.created_at >= NOW() - (days || ' days')::INTERVAL
  GROUP BY DATE(ar.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_most_used_endpoints TO authenticated;
GRANT EXECUTE ON FUNCTION get_endpoint_trends TO authenticated;

-- Create a view for quick analytics
CREATE OR REPLACE VIEW api_requests_summary AS
SELECT
  endpoint,
  COUNT(*) as total_requests,
  COUNT(DISTINCT workspace_id) as unique_workspaces,
  ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
  MIN(response_time_ms) as min_response_time_ms,
  MAX(response_time_ms) as max_response_time_ms,
  ROUND((COUNT(*) FILTER (WHERE status_code < 400)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) as success_rate_percent,
  MAX(created_at) as last_request_at
FROM api_requests
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY total_requests DESC;

COMMENT ON TABLE api_requests IS 'Tracks all API requests for analytics and monitoring';
COMMENT ON COLUMN api_requests.endpoint IS 'API endpoint path (e.g., /api/contacts/list)';
COMMENT ON COLUMN api_requests.method IS 'HTTP method (GET, POST, PUT, DELETE, etc.)';
COMMENT ON COLUMN api_requests.response_time_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN api_requests.metadata IS 'Additional data like user_id, error details, etc.';
