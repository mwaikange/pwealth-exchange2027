-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample notifications if the table is empty
INSERT INTO notifications (message, is_active)
SELECT 'Please make sure to activate vesting schedule and invest your Early Adopter tokens immediately!', true
WHERE NOT EXISTS (SELECT 1 FROM notifications);

INSERT INTO notifications (message, is_active)
SELECT 'Remember to complete your profile to unlock all platform features!', true
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE message = 'Remember to complete your profile to unlock all platform features!');

INSERT INTO notifications (message, is_active)
SELECT 'Invite friends to earn referral bonuses and grow your network!', true
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE message = 'Invite friends to earn referral bonuses and grow your network!');
