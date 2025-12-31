-- Create system_logs_view for ERROR level logs only (excludes INFO/success logs to reduce costs)
CREATE OR REPLACE VIEW system_logs_view WITH (security_invoker = true) AS
SELECT 
  mel.id,
  mel.created_at as timestamp,
  'ERROR' as level,
  UPPER(mel.message_type || '_' || mel.direction) as category,
  COALESCE(mel.recipient, mel.sender, c.phone_number, c.email) as phone_or_email,
  mel.error_message as message,
  mel.workspace_id,
  mel.details as metadata,
  'error_log' as source_type
FROM message_error_logs mel
LEFT JOIN contacts c ON mel.contact_id = c.id;

-- Grant access to the view
GRANT SELECT ON system_logs_view TO service_role;
GRANT SELECT ON system_logs_view TO authenticated;
GRANT SELECT ON system_logs_view TO anon;

-- Add comment
COMMENT ON VIEW system_logs_view IS 'System logs for ERROR level only (excludes INFO/success logs to reduce costs)';
