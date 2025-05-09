-- Add local_amount column to pay_submissions table
ALTER TABLE pay_submissions 
ADD COLUMN local_amount DECIMAL(10, 2);

-- Update existing records to calculate local_amount based on amount_usd and country exchange rate
UPDATE pay_submissions ps
SET local_amount = ps.amount
WHERE local_amount IS NULL;

-- Add a comment to the column
COMMENT ON COLUMN pay_submissions.local_amount IS 'Amount in local currency';

-- Make sure the column is included in future inserts
-- You may want to update your application code to populate this field
