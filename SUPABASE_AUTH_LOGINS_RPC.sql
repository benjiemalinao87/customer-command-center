-- RPC Function to Get Today's Logins from auth.users
-- This function has SECURITY DEFINER so it can access auth.users table
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_logins_today()
RETURNS INTEGER AS $$
DECLARE
  login_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO login_count
  FROM auth.users
  WHERE last_sign_in_at >= CURRENT_DATE;

  RETURN login_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_logins_today TO authenticated;

COMMENT ON FUNCTION get_logins_today IS 'Returns count of users who logged in today by checking auth.users.last_sign_in_at';
