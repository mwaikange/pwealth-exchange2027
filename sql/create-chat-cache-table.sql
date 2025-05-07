-- Create table for caching chat responses
CREATE TABLE IF NOT EXISTS chat_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text TEXT NOT NULL,
  question_hash TEXT NOT NULL,
  response_text TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category TEXT,
  UNIQUE(question_hash)
);

-- Create table for tracking OpenAI API usage
CREATE TABLE IF NOT EXISTS openai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_uuid TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(10,4) NOT NULL DEFAULT 0
);

-- Create table for tracking user daily chat limits
CREATE TABLE IF NOT EXISTS chat_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uuid TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  questions_used INTEGER NOT NULL DEFAULT 0,
  questions_limit INTEGER NOT NULL DEFAULT 15,
  UNIQUE(user_uuid, date)
);

-- Create table for FAQ patterns and responses
CREATE TABLE IF NOT EXISTS chat_faq_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern TEXT NOT NULL,
  response_template TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some initial FAQ patterns
INSERT INTO chat_faq_patterns (pattern, response_template, category) VALUES
('what is my balance', 'Your current balances are:\nPWT Invest: {{pwt_invest_balance}} PWT ({{pwt_invest_value}} USD)\nPWT Cashout: {{pwt_cashout_balance}} PWT ({{pwt_cashout_value}} USD)\nAFT: {{aft_balance}} AFT ({{aft_value}} USD)', 'balance'),
('how much pwt do i have', 'You currently have {{pwt_invest_balance}} PWT in your Invest wallet and {{pwt_cashout_balance}} PWT in your Cashout wallet. The total value is {{total_pwt_value}} USD.', 'balance'),
('what is my referral link', 'Your referral link is: {{referral_link}}\nShare this with friends to earn rewards when they join and complete vesting schedules!', 'referral'),
('how many referrals do i have', 'You currently have {{referral_count}} referrals. Keep inviting more people to increase your earnings!', 'referral'),
('how does vesting work', 'Vesting works by locking your PWT tokens for a period of time. As the vesting progresses, you earn rewards at 20%, 40%, 60%, 80%, and 100% completion. There are 3 levels with 5 schedules each. When all 15 schedules are completed, the level refreshes.', 'education')
ON CONFLICT DO NOTHING;
