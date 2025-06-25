-- View for current pricing information
CREATE OR REPLACE VIEW current_pricing_info AS
SELECT 
    wsp.week_start,
    wsp.peg_price,
    wsp.average_hodl_percentage,
    wsp.calculated_price as current_price,
    dhs.hodl_percentage as latest_daily_hodl,
    dhs.snapshot_date as latest_hodl_date,
    ss.shares_issued,
    ss.total_supply
FROM weekly_share_prices wsp
CROSS JOIN LATERAL (
    SELECT hodl_percentage, snapshot_date
    FROM daily_hodl_snapshots
    ORDER BY snapshot_date DESC
    LIMIT 1
) dhs
CROSS JOIN LATERAL (
    SELECT shares_issued, total_supply
    FROM share_supply
    ORDER BY created_at DESC
    LIMIT 1
) ss
WHERE wsp.week_start = date_trunc('week', CURRENT_DATE)::date
OR wsp.week_start = (
    SELECT MAX(week_start) 
    FROM weekly_share_prices
);

-- View for pricing trends
CREATE OR REPLACE VIEW pricing_trends AS
SELECT 
    wsp.week_start,
    wsp.peg_price,
    wsp.average_hodl_percentage,
    wsp.calculated_price,
    LAG(wsp.calculated_price) OVER (ORDER BY wsp.week_start) as previous_price,
    ROUND(
        ((wsp.calculated_price - LAG(wsp.calculated_price) OVER (ORDER BY wsp.week_start)) 
         / LAG(wsp.calculated_price) OVER (ORDER BY wsp.week_start)) * 100, 2
    ) as price_change_percentage
FROM weekly_share_prices wsp
ORDER BY wsp.week_start DESC;
