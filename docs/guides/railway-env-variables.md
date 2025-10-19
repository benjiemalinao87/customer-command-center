# Railway Environment Variables Fix

The deployment is failing because of missing environment variables. Please add the following environment variables to your Railway project:

## Required Environment Variables

```
# Supabase configuration
SUPABASE_URL=https://ycwttshvizkotcwwyjpt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3R0c2h2aXprb3Rjd3d5anB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODI0NDk3NSwiZXhwIjoyMDUzODIwOTc1fQ.blOq_yJX-J-N7znR-4220THNruoI7j_bLONliOtukmQ

# Resend API Key
RESEND_API_KEY=re_Cq1JnYTU_CahwLyvctsSrZVqp4LWiSHV1
```

## Steps to Add Environment Variables in Railway

1. Go to your Railway project dashboard
2. Select the backend service
3. Go to the "Variables" tab
4. Add each of the environment variables listed above
5. Deploy the service again after adding the variables

## Error Details

The current error is:
```
Error: supabaseKey is required.
    at new SupabaseClient (/app/node_modules/@supabase/supabase-js/dist/main/SupabaseClient.js:45:19)
    at createClient (/app/node_modules/@supabase/supabase-js/dist/main/index.js:38:12)
    at new EmailService (file:///app/src/services/emailService.js:6:21)
```

This error occurs because the EmailService is trying to connect to Supabase but cannot find the required environment variables. 