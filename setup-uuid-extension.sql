-- Enable the UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set the default value for schedule_id to auto-generate UUIDs
ALTER TABLE vesting_schedules 
ALTER COLUMN schedule_id SET DEFAULT uuid_generate_v4();

-- You can run this to verify the column definition
SELECT 
  column_name, 
  data_type, 
  column_default 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'vesting_schedules' 
  AND column_name = 'schedule_id';
