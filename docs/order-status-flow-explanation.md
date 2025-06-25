# Order Status Flow & Card Distribution

## 📊 **4 Cards & Their Status Filters**

### 1. **Market Buy Orders** (All Users - Public View)
**Statuses Shown:** `pending`, `partial`, `filled`
- `pending` - Order placed, waiting for matches
- `partial` - Partially filled, still accepting matches  
- `filled` - Completely filled, no longer matching

### 2. **Market Sell Orders** (All Users - Public View)  
**Statuses Shown:** `available`, `partial`, `matched`
- `available` - Shares listed, waiting for buyers
- `partial` - Some shares sold, remainder still available
- `matched` - Completely sold out

### 3. **Your Buy Orders** (Current User Only - Private)
**Statuses Shown:** `pending`, `partial`, `completed`, `filled`, `cancelled`
- `pending` - Your order waiting for matches
- `partial` - Your order partially filled
- `completed` - Your order fully executed
- `filled` - Alternative term for completed
- `cancelled` - Order cancelled/expired

### 4. **Your Sell Orders** (Current User Only - Private)
**Statuses Shown:** `available`, `partial`, `completed`, `matched`, `expired`, `cancelled`
- `available` - Your shares listed for sale
- `partial` - Some of your shares sold
- `completed` - All your shares sold
- `matched` - Alternative term for completed
- `expired` - Order expired (Sunday 23:59)
- `cancelled` - You cancelled the order

---

## 🔄 **Order Matching Flow**

### When Buy Order Meets Sell Order:

1. **matched_orders Table Entry Created:**
\`\`\`sql
INSERT INTO matched_orders (
    buy_order_id,     -- UUID of buy order
    sell_order_id,    -- UUID of sell order  
    buyer_uuid,       -- Buyer's user ID
    seller_uuid,      -- Seller's user ID
    shares_matched,   -- Number of shares traded
    price_per_share,  -- Price per share
    total_amount,     -- shares_matched × price_per_share
    matched_at        -- Timestamp of match
);
\`\`\`

2. **Wallet Transfers:**
\`\`\`sql
-- Buyer receives shares in hold_pre wallet
UPDATE user_shares 
SET shares = shares + shares_matched
WHERE user_uuid = buyer_uuid AND wallet_type = 'hold_pre';

-- Seller receives money in cashout_wallet  
UPDATE user_shares 
SET shares = shares + total_amount
WHERE user_uuid = seller_uuid AND wallet_type = 'cashout_wallet';
\`\`\`

3. **Order Status Updates:**
\`\`\`sql
-- Update buy order
UPDATE buy_orders 
SET 
    shares_filled = shares_filled + shares_matched,
    amount_filled = amount_filled + total_amount,
    status = CASE 
        WHEN shares_filled = shares_requested THEN 'completed'
        ELSE 'partial'
    END;

-- Update sell order
UPDATE sell_orders 
SET 
    shares_remaining = shares_remaining - shares_matched,
    status = CASE 
        WHEN shares_remaining = 0 THEN 'matched'  
        ELSE 'partial'
    END;
\`\`\`

---

## 🎨 **Progress Bar Colors**

- **Market Orders:** Blue (public data)
- **Your Orders:** Yellow (your personal progress)

---

## 📋 **Status Lifecycle**

### Buy Order Lifecycle:
`pending` → `partial` → `completed`/`filled`
                ↓
           `cancelled` (if insufficient matches)

### Sell Order Lifecycle:  
`available` → `partial` → `matched`/`completed`
                ↓
           `expired` (Sunday 23:59) or `cancelled`

---

## ✅ **Verification Points**

1. ✅ matched_orders table gets entry for every trade
2. ✅ Buyer's hold_pre wallet credited with shares
3. ✅ Seller's cashout_wallet credited with money
4. ✅ Order statuses updated appropriately
5. ✅ Progress bars show fill percentage
6. ✅ Yellow progress bars for personal orders
\`\`\`

Now let me verify that the order matching functions are correctly implementing this flow:
