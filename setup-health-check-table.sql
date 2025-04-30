-- Create a simple health check table for connection testing
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ok',
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a single row if the table is empty
INSERT INTO health_check (status)
SELECT 'ok'
WHERE NOT EXISTS (SELECT 1 FROM health_check);
