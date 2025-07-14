-- ==============================================
-- STEP 3: VERIFY CONVERSION ACCURACY
-- ==============================================

-- Compare original balances with converted shares
SELECT 'CONVERSION ACCURACY CHECK' as section;
SELECT 
    u.email,
    b.pwt_invest_balance as original_invest_tokens,
    b.pwt_cashout_balance as original_cashout_tokens,
    
    -- Get converted shares
    (SELECT shares FROM user_shares us WHERE us.user_uuid = u.id AND us.wallet_type = 'hold_wallet_pre_hold') as converted_pre_shares,
    (SELECT shares FROM user_shares us WHERE us.user_uuid = u.id AND us.wallet_type = 'hold_wallet_post_hold') as converted_post_shares,
    
    -- Verify conversion math (should be exactly 2x)
    ROUND(b.pwt_invest_balance * 2, 4) as expected_pre_shares,
    ROUND(b.pwt_cashout_balance * 2, 4) as expected_post_shares,
    
    -- Check if conversion is accurate
    CASE 
        WHEN ROUND(b.pwt_invest_balance * 2, 4) = (SELECT shares FROM user_shares us WHERE us.user_uuid = u.id AND us.wallet_type = 'hold_wallet_pre_hold') 
        THEN 'CORRECT' 
        ELSE 'ERROR' 
    END as pre_conversion_status,
    
    CASE 
        WHEN ROUND(b.pwt_cashout_balance * 2, 4) = (SELECT shares FROM user_shares us WHERE us.user_uuid = u.id AND us.wallet_type = 'hold_wallet_post_hold') 
        THEN 'CORRECT' 
        ELSE 'ERROR' 
    END as post_conversion_status

FROM balances b
JOIN auth.users u ON b.user_id = u.id
JOIN user_shares us ON u.id = us.user_uuid
WHERE us.source = 'balance_conversion_restore'
AND u.email NOT IN ('mwaikange@gmail.com', 'charitywinstaan93@gmail.com', 'luwa@yopmail.com')
GROUP BY u.email, u.id, b.pwt_invest_balance, b.pwt_cashout_balance
ORDER BY u.email
LIMIT 10;

-- Overall summary
SELECT 'FINAL USER_SHARES SUMMARY' as section;
SELECT 
    source,
    COUNT(DISTINCT user_uuid) as unique_users,
    COUNT(*) as total_wallet_records,
    wallet_type::text,
    AVG(shares) as avg_shares,
    SUM(shares) as total_shares
FROM user_shares 
GROUP BY source, wallet_type::text
ORDER BY source, wallet_type::text;

-- Total user count verification
SELECT 'TOTAL USER COUNT VERIFICATION' as section;
SELECT 
    COUNT(DISTINCT user_uuid) as total_users_with_wallets,
    COUNT(*) as total_wallet_records
FROM user_shares;

-- Check for any conversion errors
SELECT 'CONVERSION ERROR CHECK' as section;
SELECT 
    COUNT(*) as potential_errors
FROM balances b
JOIN auth.users u ON b.user_id = u.id
JOIN user_shares us ON u.id = us.user_uuid
WHERE us.source = 'balance_conversion_restore'
AND (
    ROUND(b.pwt_invest_balance * 2, 4) != (SELECT shares FROM user_shares us2 WHERE us2.user_uuid = u.id AND us2.wallet_type = 'hold_wallet_pre_hold')
    OR
    ROUND(b.pwt_cashout_balance * 2, 4) != (SELECT shares FROM user_shares us2 WHERE us2.user_uuid = u.id AND us2.wallet_type = 'hold_wallet_post_hold')
);

SELECT 'CONVERSION VERIFICATION COMPLETED!' as status;
