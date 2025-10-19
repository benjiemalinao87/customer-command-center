Instructions for running the migration script:

1. Connect to your database using psql or your database management tool
2. Run the SQL commands in migration_make_segment_id_nullable.sql
3. Verify the change by checking the campaigns table schema

Example command:
psql -h your-database-host -U your-username -d your-database -f migration_make_segment_id_nullable.sql
