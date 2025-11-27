# Data Flow Analysis: Fundraising Data → Fiscal Balance Report Modal

## Current Data Flow Path

```
FundraisingOrders.jsx (fetchFundraisingData)
  ↓
console.log('Fundraising data fetched:', response.data.result)
  ↓
response.data.result (raw API response)
  ↓
[ENRICHED in enrichFundraisingDataWithProductDetails()]
  ↓
this.setState({ fundraisingData: enrichedData, originalData: enrichedData })
  ↓
FundraisingOrders.state.fundraisingData (stored in state)
  ↓
[Referenced via ref in homePage.jsx]
  ↓
this.fundraisingTableRef?.current?.state?.fundraisingData
  ↓
Passed to FiscalBalanceReportModal via props
  ↓
FiscalBalanceReportModal receives fundraisingData prop
```

## Issue Identified

**YES**, the data IS being passed to the modal, BUT there's a potential problem:

1. **Path uses optional chaining**: `this.fundraisingTableRef?.current?.state?.fundraisingData || []`
   - If ANY link in the chain fails, it defaults to empty array `[]`

2. **When does the chain break?**
   - If `fundraisingTableRef` is not properly set as ref
   - If `current` is null (component not mounted)
   - If `state.fundraisingData` hasn't been initialized yet
   - If the FundraisingOrders component is being rendered but state update is pending

3. **The data IS enriched before reaching the modal**, which means:
   - The modal receives `enrichedData` with `enrichedTotalPrice`
   - Products should be in `items` array with `wooCommerceDetails`

## Why "No items available" appears:

The console.log shows data is being fetched, but the modal might receive:
- Empty array `[]` (ref chain broke) → Shows "No items available"
- Array with items but no `status === 'paid'` → Summary shows 0/0, items empty
- Array with items but products not in expected location

## Recommended Debug Steps:

1. Add logging in homePage.jsx to confirm fundraisingTableRef is set
2. Add logging to FiscalBalanceReportModal to show actual data received
3. Check if data is being enriched correctly
4. Verify status field values match "paid" (case-sensitive)
