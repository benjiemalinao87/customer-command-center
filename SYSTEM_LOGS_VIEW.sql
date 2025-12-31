-- Create a unified view for System Logs (SMS and Email focus)
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
LEFT JOIN contacts c ON mel.contact_id = c.id

UNION ALL

SELECT 
  lm.id,
  lm.created_at as timestamp,
  'INFO' as level,
  UPPER(lm.msg_type || '_' || lm.direction) as category,
  CASE 
    WHEN lm.msg_type = 'EMAIL' THEN COALESCE(c.email, lm.sender)
    ELSE COALESCE(c.phone_number, lm.sender)
  END as phone_or_email,
  COALESCE(lm.body, lm.subject, '[No Content]') as message,
  lm.workspace_id,
  jsonb_build_object(
    'twilio_sid', lm.twilio_sid,
    'status', lm.status,
    'media_urls', lm.media_urls,
    'subject', lm.subject
  ) as metadata,
  'livechat' as source_type
FROM livechat_messages lm
LEFT JOIN contacts c ON lm.contact_id = c.id
WHERE 
  -- Exclude internal notes (system-generated metadata)
  (lm.msg_type != 'internal_note' OR lm.msg_type IS NULL)
  AND (lm.is_internal != true OR lm.is_internal IS NULL)
  -- Only include actual SMS, MMS, and Email messages
  AND lm.msg_type IN ('text', 'mms', 'MMS', 'EMAIL', 'email', 'sms', 'SMS');

-- Grant access to the view
GRANT SELECT ON system_logs_view TO service_role;
GRANT SELECT ON system_logs_view TO authenticated;
GRANT SELECT ON system_logs_view TO anon;

COMMENT ON VIEW system_logs_view IS 'Unified system logs for SMS and Email activities (excludes internal notes)';
