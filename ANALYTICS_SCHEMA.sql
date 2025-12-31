-- =====================================================
-- Customer Connect Command Center - Analytics Schema
-- =====================================================
-- This schema tracks real-time connection metrics, Socket.IO performance,
-- and authentication token refresh rates for monitoring and debugging.
-- =====================================================

-- 1. Connection Analytics Table
-- Tracks Socket.IO connection events and performance metrics
CREATE TABLE IF NOT EXISTS public.connection_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id BIGINT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Event details
    event_type TEXT NOT NULL, -- 'connect', 'disconnect', 'connect_error', 'reconnecting'
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Connection details
    socket_id TEXT,
    transport TEXT, -- 'polling', 'websocket'
    url TEXT,

    -- Performance metrics
    connection_duration_ms INTEGER, -- Time connected before disconnect
    reconnection_attempts INTEGER DEFAULT 0,
    time_to_connect_ms INTEGER, -- Time from attempt to successful connection

    -- Error tracking
    error_message TEXT,
    error_type TEXT,
    circuit_breaker_triggered BOOLEAN DEFAULT FALSE,

    -- Context
    user_agent TEXT,
    ip_address INET,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_connection_analytics_workspace
    ON public.connection_analytics(workspace_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_connection_analytics_user
    ON public.connection_analytics(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_connection_analytics_event
    ON public.connection_analytics(event_type, timestamp DESC);

-- 2. Token Refresh Analytics Table
-- Tracks Supabase authentication token refresh performance
CREATE TABLE IF NOT EXISTS public.token_refresh_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Refresh details
    refresh_triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    refresh_completed_at TIMESTAMPTZ,
    success BOOLEAN NOT NULL,

    -- Timing metrics
    time_to_refresh_ms INTEGER, -- Duration of refresh operation
    time_before_expiry_ms INTEGER, -- How early was refresh triggered

    -- Error tracking
    error_message TEXT,
    error_code TEXT,

    -- Token info (non-sensitive)
    token_expires_at TIMESTAMPTZ,
    was_proactive BOOLEAN DEFAULT TRUE, -- vs reactive/on-failure

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_token_refresh_user
    ON public.token_refresh_analytics(user_id, refresh_triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_refresh_success
    ON public.token_refresh_analytics(success, refresh_triggered_at DESC);

-- 3. Retry Pattern Analytics Table
-- Tracks connection retry patterns for optimization
CREATE TABLE IF NOT EXISTS public.retry_pattern_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id BIGINT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Retry session details
    session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_end TIMESTAMPTZ,

    -- Retry metrics
    total_attempts INTEGER NOT NULL DEFAULT 0,
    successful_connect BOOLEAN DEFAULT FALSE,
    circuit_breaker_opened BOOLEAN DEFAULT FALSE,

    -- Timing
    total_retry_duration_ms INTEGER,
    time_to_recovery_ms INTEGER, -- Time from first failure to successful connection
    average_delay_between_retries_ms INTEGER,

    -- Pattern details
    retry_delays_ms INTEGER[], -- Array of delays used
    transports_attempted TEXT[], -- Array of transports tried

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analysis
CREATE INDEX IF NOT EXISTS idx_retry_pattern_workspace
    ON public.retry_pattern_analytics(workspace_id, session_start DESC);
CREATE INDEX IF NOT EXISTS idx_retry_pattern_recovery
    ON public.retry_pattern_analytics(time_to_recovery_ms);

-- 4. Real-time Metrics Summary View
-- Aggregated metrics for dashboard display
CREATE OR REPLACE VIEW public.connection_metrics_summary AS
SELECT
    DATE_TRUNC('hour', timestamp) as hour,
    workspace_id,
    COUNT(*) FILTER (WHERE event_type = 'connect') as successful_connections,
    COUNT(*) FILTER (WHERE event_type = 'connect_error') as failed_connections,
    COUNT(*) FILTER (WHERE circuit_breaker_triggered = TRUE) as circuit_breaker_triggers,
    AVG(time_to_connect_ms) FILTER (WHERE time_to_connect_ms IS NOT NULL) as avg_connection_time_ms,
    AVG(connection_duration_ms) FILTER (WHERE connection_duration_ms IS NOT NULL) as avg_session_duration_ms,
    COUNT(DISTINCT user_id) as unique_users
FROM public.connection_analytics
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), workspace_id
ORDER BY hour DESC;

-- 5. Token Refresh Success Rate View
CREATE OR REPLACE VIEW public.token_refresh_metrics AS
SELECT
    DATE_TRUNC('hour', refresh_triggered_at) as hour,
    COUNT(*) as total_refreshes,
    COUNT(*) FILTER (WHERE success = TRUE) as successful_refreshes,
    COUNT(*) FILTER (WHERE success = FALSE) as failed_refreshes,
    ROUND((COUNT(*) FILTER (WHERE success = TRUE)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) as success_rate_pct,
    AVG(time_to_refresh_ms) as avg_refresh_time_ms,
    AVG(time_before_expiry_ms) as avg_proactive_buffer_ms,
    COUNT(DISTINCT user_id) as unique_users
FROM public.token_refresh_analytics
WHERE refresh_triggered_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', refresh_triggered_at)
ORDER BY hour DESC;

-- 6. Retry Pattern Insights View
CREATE OR REPLACE VIEW public.retry_insights AS
SELECT
    DATE_TRUNC('hour', session_start) as hour,
    COUNT(*) as total_retry_sessions,
    COUNT(*) FILTER (WHERE successful_connect = TRUE) as recovered_sessions,
    COUNT(*) FILTER (WHERE circuit_breaker_opened = TRUE) as circuit_breaker_sessions,
    AVG(total_attempts) as avg_attempts_per_session,
    AVG(time_to_recovery_ms) FILTER (WHERE time_to_recovery_ms IS NOT NULL) as avg_recovery_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY time_to_recovery_ms) as p95_recovery_time_ms
FROM public.retry_pattern_analytics
WHERE session_start > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', session_start)
ORDER BY hour DESC;

-- 7. Enable Row Level Security
ALTER TABLE public.connection_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_refresh_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retry_pattern_analytics ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies (admins and service role can read all, users can read their own)
CREATE POLICY "Users can view their own connection analytics"
    ON public.connection_analytics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert connection analytics"
    ON public.connection_analytics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view their own token refresh analytics"
    ON public.token_refresh_analytics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert token refresh analytics"
    ON public.token_refresh_analytics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view their own retry analytics"
    ON public.retry_pattern_analytics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert retry analytics"
    ON public.retry_pattern_analytics FOR INSERT
    WITH CHECK (true);

-- 9. Automatic cleanup function (runs daily to keep tables from growing indefinitely)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Keep only last 30 days of detailed analytics
    DELETE FROM public.connection_analytics WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM public.token_refresh_analytics WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM public.retry_pattern_analytics WHERE created_at < NOW() - INTERVAL '30 days';

    RAISE NOTICE 'Analytics cleanup completed at %', NOW();
END;
$$;

-- 10. Comments for documentation
COMMENT ON TABLE public.connection_analytics IS 'Tracks Socket.IO connection events and performance metrics for monitoring';
COMMENT ON TABLE public.token_refresh_analytics IS 'Monitors Supabase authentication token refresh performance and success rates';
COMMENT ON TABLE public.retry_pattern_analytics IS 'Analyzes connection retry patterns to optimize reconnection logic';
COMMENT ON VIEW public.connection_metrics_summary IS 'Hourly aggregated connection metrics for dashboard display';
COMMENT ON VIEW public.token_refresh_metrics IS 'Hourly token refresh success rates and performance metrics';
COMMENT ON VIEW public.retry_insights IS 'Retry pattern analysis with recovery time percentiles';
