-- Active Session Tracking + Real-time User Activity
-- Run this entire script in Supabase SQL Editor.
-- It adds:
-- 1) A user_session_activity table
-- 2) RPC to upsert live activity events from frontend
-- 3) RPC to mark user offline on signout/unload
-- 4) Upgraded get_active_sessions RPC with tracked page/window + last sign-in analytics

CREATE TABLE IF NOT EXISTS public.user_session_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,
  user_email TEXT,
  current_view TEXT NOT NULL DEFAULT 'dashboard',
  current_path TEXT NOT NULL DEFAULT '/dashboard',
  current_window TEXT,
  current_window_title TEXT,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,
  is_online BOOLEAN NOT NULL DEFAULT TRUE,
  page_visits INTEGER NOT NULL DEFAULT 1,
  total_events INTEGER NOT NULL DEFAULT 1,
  view_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_session_activity_user_id
  ON public.user_session_activity(user_id);

CREATE INDEX IF NOT EXISTS idx_user_session_activity_last_activity
  ON public.user_session_activity(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_session_activity_online
  ON public.user_session_activity(is_online, last_activity_at DESC);

CREATE OR REPLACE FUNCTION public.set_user_session_activity_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_session_activity_updated_at ON public.user_session_activity;
CREATE TRIGGER trg_user_session_activity_updated_at
BEFORE UPDATE ON public.user_session_activity
FOR EACH ROW
EXECUTE FUNCTION public.set_user_session_activity_updated_at();

ALTER TABLE public.user_session_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view session activity" ON public.user_session_activity;
CREATE POLICY "Authenticated users can view session activity"
  ON public.user_session_activity
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert their own session activity" ON public.user_session_activity;
CREATE POLICY "Users can insert their own session activity"
  ON public.user_session_activity
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own session activity" ON public.user_session_activity;
CREATE POLICY "Users can update their own session activity"
  ON public.user_session_activity
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.track_user_session_activity(
  p_current_view TEXT,
  p_current_path TEXT,
  p_current_window TEXT DEFAULT NULL,
  p_current_window_title TEXT DEFAULT NULL,
  p_event_type TEXT DEFAULT 'heartbeat',
  p_last_sign_in_at TIMESTAMPTZ DEFAULT NULL,
  p_login_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT := COALESCE(auth.jwt() ->> 'email', 'unknown@unknown.local');
  v_session_id_text TEXT := NULLIF(auth.jwt() ->> 'session_id', '');
  v_session_id UUID;
  v_view_key TEXT := COALESCE(NULLIF(TRIM(p_current_view), ''), 'dashboard');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_session_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_session_id := v_session_id_text::UUID;
  END IF;

  INSERT INTO public.user_session_activity (
    user_id,
    session_id,
    user_email,
    current_view,
    current_path,
    current_window,
    current_window_title,
    last_activity_at,
    login_at,
    last_sign_in_at,
    is_online,
    page_visits,
    total_events,
    view_counts,
    metadata
  )
  VALUES (
    v_user_id,
    v_session_id,
    v_user_email,
    COALESCE(NULLIF(TRIM(p_current_view), ''), 'dashboard'),
    COALESCE(NULLIF(TRIM(p_current_path), ''), '/dashboard'),
    p_current_window,
    p_current_window_title,
    NOW(),
    COALESCE(p_login_at, NOW()),
    COALESCE(p_last_sign_in_at, NOW()),
    TRUE,
    1,
    1,
    jsonb_build_object(v_view_key, 1),
    jsonb_build_object(
      'last_event_type', p_event_type,
      'last_event_at', NOW()
    )
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    session_id = COALESCE(EXCLUDED.session_id, user_session_activity.session_id),
    user_email = EXCLUDED.user_email,
    current_view = EXCLUDED.current_view,
    current_path = EXCLUDED.current_path,
    current_window = EXCLUDED.current_window,
    current_window_title = EXCLUDED.current_window_title,
    last_activity_at = NOW(),
    login_at = COALESCE(user_session_activity.login_at, EXCLUDED.login_at),
    last_sign_in_at = COALESCE(EXCLUDED.last_sign_in_at, user_session_activity.last_sign_in_at),
    is_online = TRUE,
    page_visits = CASE
      WHEN COALESCE(user_session_activity.current_view, '') IS DISTINCT FROM EXCLUDED.current_view
        OR COALESCE(user_session_activity.current_path, '') IS DISTINCT FROM EXCLUDED.current_path
      THEN user_session_activity.page_visits + 1
      ELSE user_session_activity.page_visits
    END,
    total_events = user_session_activity.total_events + 1,
    view_counts = COALESCE(user_session_activity.view_counts, '{}'::jsonb)
      || jsonb_build_object(
        v_view_key,
        COALESCE((user_session_activity.view_counts ->> v_view_key)::INTEGER, 0) + 1
      ),
    metadata = COALESCE(user_session_activity.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'last_event_type', p_event_type,
        'last_event_at', NOW()
      );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_user_session_offline(
  p_current_view TEXT DEFAULT NULL,
  p_current_path TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT 'signed_out'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.user_session_activity
  SET
    current_view = COALESCE(p_current_view, current_view),
    current_path = COALESCE(p_current_path, current_path),
    is_online = FALSE,
    last_activity_at = NOW(),
    metadata = COALESCE(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'last_event_type', p_reason,
        'last_event_at', NOW()
      )
  WHERE user_id = v_user_id;
END;
$$;

-- Optional helper to bypass RLS when resolving "current page" from user_presence.
-- Safe to run even if user_presence does not exist in this project.
CREATE OR REPLACE FUNCTION public.get_user_presence_context(
  p_user_ids UUID[]
)
RETURNS TABLE (
  user_id UUID,
  updated_at TIMESTAMPTZ,
  presence JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.user_presence') IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY EXECUTE $query$
    SELECT
      (to_jsonb(up.*) ->> 'user_id')::UUID AS user_id,
      CASE
        WHEN NULLIF(to_jsonb(up.*) ->> 'updated_at', '') IS NULL THEN NULL::TIMESTAMPTZ
        ELSE (to_jsonb(up.*) ->> 'updated_at')::TIMESTAMPTZ
      END AS updated_at,
      to_jsonb(up.*) AS presence
    FROM public.user_presence up
    WHERE (to_jsonb(up.*) ->> 'user_id')::UUID = ANY($1)
  $query$ USING p_user_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_presence_context(UUID[]) TO authenticated;

-- Required when OUT columns changed; CREATE OR REPLACE cannot change return row type.
DROP FUNCTION IF EXISTS public.get_active_sessions();

CREATE OR REPLACE FUNCTION public.get_active_sessions()
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  user_email VARCHAR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  refreshed_at TIMESTAMPTZ,
  ip TEXT,
  user_agent TEXT,
  last_sign_in_at TIMESTAMPTZ,
  current_view TEXT,
  current_path TEXT,
  current_window TEXT,
  current_window_title TEXT,
  tracked_last_activity_at TIMESTAMPTZ,
  tracked_last_sign_in_at TIMESTAMPTZ,
  page_visits INTEGER,
  total_events INTEGER,
  view_counts JSONB,
  is_online BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  WITH latest_sessions AS (
    SELECT
      s.id,
      s.user_id,
      s.created_at,
      s.updated_at,
      s.refreshed_at,
      s.ip,
      s.user_agent,
      ROW_NUMBER() OVER (
        PARTITION BY s.user_id
        ORDER BY COALESCE(
          s.refreshed_at::TIMESTAMPTZ,
          s.updated_at::TIMESTAMPTZ,
          s.created_at::TIMESTAMPTZ
        ) DESC
      ) AS rn
    FROM auth.sessions s
    WHERE s.created_at >= NOW() - INTERVAL '24 hours'
  )
  SELECT
    ls.id AS session_id,
    ls.user_id,
    u.email::VARCHAR AS user_email,
    ls.created_at::TIMESTAMPTZ,
    ls.updated_at::TIMESTAMPTZ,
    ls.refreshed_at::TIMESTAMPTZ,
    ls.ip::TEXT AS ip,
    ls.user_agent,
    u.last_sign_in_at::TIMESTAMPTZ,
    a.current_view,
    a.current_path,
    a.current_window,
    a.current_window_title,
    a.last_activity_at::TIMESTAMPTZ AS tracked_last_activity_at,
    a.last_sign_in_at::TIMESTAMPTZ AS tracked_last_sign_in_at,
    a.page_visits,
    a.total_events,
    a.view_counts,
    a.is_online
  FROM latest_sessions ls
  INNER JOIN auth.users u ON u.id = ls.user_id
  LEFT JOIN public.user_session_activity a ON a.user_id = ls.user_id
  WHERE ls.rn = 1
  ORDER BY COALESCE(
    a.last_activity_at::TIMESTAMPTZ,
    ls.refreshed_at::TIMESTAMPTZ,
    ls.updated_at::TIMESTAMPTZ,
    ls.created_at::TIMESTAMPTZ
  ) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_user_session_activity(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_user_session_offline(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_sessions() TO authenticated;

COMMENT ON TABLE public.user_session_activity IS 'Tracks live command-center user page/window activity with heartbeat updates.';
COMMENT ON FUNCTION public.track_user_session_activity(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Upserts live user activity and increments per-view usage counts.';
COMMENT ON FUNCTION public.mark_user_session_offline(TEXT, TEXT, TEXT) IS 'Marks the authenticated user as offline when signing out or leaving the app.';
