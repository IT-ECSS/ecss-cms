# Payment Method Change Cases - Progress Tracker Definitions

## Overview
This document defines the progress tracker steps for two payment method change scenarios in the Registration & Payment Table (NSA Course Type).

---

## Case 8: Cash/PayNow → SkillsFuture (Payment Already Made)

### Scenario
When the final payment method is changed from Cash/PayNow to SkillsFuture while the payment status is currently "Paid":
- Current payment status (Cash/PayNow): **Paid**
- New payment method: **SkillsFuture**

### Expected Outcomes (7 steps)

| Step # | Action | Frontend | Backend | Database |
|--------|--------|----------|---------|----------|
| 1 | Payment status (Cash/PayNow) becomes "Not Available" | `editRegistrationField(id, 'finalPaymentMethod', 'SkillsFuture')` | Updates `course.finalPaymentMethod` | `course.finalPaymentMethod = 'SkillsFuture'` |
| 2 | Confirmation status will be displayed in the table | Registration status updated to Submitted | `editRegistrationField(id, 'registrationStatus', 'Submitted')` | `official.registration_status = 'Submitted'` |
| 3 | Payment status (SkillsFuture) will be updated to Pending | `updatePaymentStatus(id, 'Pending', ...)` | Sets status to Pending + confirmed = false | `status = 'Pending'`, `official.confirmed = false` |
| 4 | Registration status will update as Submitted | Already done in Step 2 | - | - |
| 5 | Receipt number removed in the table | `clearPaymentDetails(id)` | Clears receipt number and dates | `official.receiptNo = ''`, `official.date = ''`, `official.time = ''` |
| 6 | Payment date and time will be removed in the table | Already done in Step 5 | - | - |
| 7 | Vacancies counter will increase back by 1 | `updateWooCommerce(..., 'To refund')` | Increases WooCommerce stock | Course product quantity increased by 1 |

### Progress Tracker Steps (Frontend)

```javascript
const steps = [
  'Changing final payment method',           // Step 1
  'Updating registration status',            // Step 2
  'Updating payment status',                 // Step 3
  'Clearing payment details',                // Step 4-6
  'Updating vacancies counter',              // Step 7 (NSA only)
];
```

### Implementation Flow

1. **Condition Check**: `isCashPayNowPaidToSF = isCashPayNowToSF && currentPaymentStatus === 'Paid'`
2. **Initialize Progress Tracker** with 5 steps (4 base steps + 1 vacancies for NSA)
3. **Step 1**: Call `editRegistrationField(id, 'finalPaymentMethod', 'SkillsFuture')`
4. **Step 2**: Advance and call `editRegistrationField(id, 'registrationStatus', 'Submitted')`
5. **Step 3**: Advance and call `updatePaymentStatus(id, 'Pending', ...)`
6. **Step 4**: Advance and call `clearPaymentDetails(id)`
7. **Step 5** (if NSA): Advance and call `updateWooCommerce(..., 'To refund')`
8. **Refresh Table Cells** with columns: `paymentStatusCashPayNow`, `paymentStatusSkillsFuture`, `finalPaymentMethod`, `confirmed`, `registrationStatus`, `recinvNo`, `paymentDate`, `paymentTime`
9. **Finish Progress Tracker** with immediate close

### Console Output
```
✅ [Case 8] Changing payment method from Cash/PayNow to SkillsFuture (Payment already Paid)
✅ Vacancies counter increased for NSA course: { courseEngName, courseLocation }
```

### Database State After Completion
```javascript
{
  course: {
    payment: 'SkillsFuture',              // Updated to new method
    finalPaymentMethod: 'SkillsFuture',   // Set as final
  },
  status: 'Pending',                      // Reset to Pending
  official: {
    registration_status: 'Submitted',     // Updated
    confirmed: false,                     // Reset
    receiptNo: '',                        // Cleared
    date: '',                             // Cleared
    time: '',                             // Cleared
  },
  // WooCommerce stock: increased by 1 (NSA course)
}
```

---

## Case 9: SkillsFuture → Cash/PayNow (Payment Already Made)

### Scenario
When the final payment method is changed from SkillsFuture to Cash/PayNow while the payment status is currently "SkillsFuture Done":
- Current payment status (SkillsFuture): **SkillsFuture Done**
- New payment method: **Cash/PayNow**

### Expected Outcomes (7 steps)

| Step # | Action | Frontend | Backend | Database |
|--------|--------|----------|---------|----------|
| 1 | Payment status (SkillsFuture) becomes "Not Available" | `editRegistrationField(id, 'finalPaymentMethod', 'Cash'/'PayNow')` | Updates `course.finalPaymentMethod` | `course.finalPaymentMethod = 'Cash'/'PayNow'` |
| 2 | Confirmation status will change to Not Confirmed and remove in the table | Registration status updated to Submitted | `editRegistrationField(id, 'registrationStatus', 'Submitted')` | `official.registration_status = 'Submitted'`, `official.confirmed = false` |
| 3 | Payment status (Cash/PayNow) will be updated to Pending | `updatePaymentStatus(id, 'Pending', ...)` | Sets status to Pending | `status = 'Pending'` |
| 4 | Registration status will update as Submitted | Already done in Step 2 | - | - |
| 5 | Receipt number removed in the table | `clearPaymentDetails(id)` | Clears receipt number and dates | `official.receiptNo = ''`, `official.date = ''`, `official.time = ''` |
| 6 | Payment date and time will be removed in the table | Already done in Step 5 | - | - |
| 7 | Vacancies counter will increase back by 1 | `updateWooCommerce(..., 'To refund')` | Increases WooCommerce stock | Course product quantity increased by 1 |

### Progress Tracker Steps (Frontend)

```javascript
const steps = [
  'Changing final payment method',           // Step 1
  'Updating registration status',            // Step 2
  'Updating payment status',                 // Step 3
  'Clearing payment details',                // Step 4-6
  'Updating vacancies counter',              // Step 7 (NSA only)
];
```

### Implementation Flow

1. **Condition Check**: `isSFDoneSwapToCashPayNow = isSFToCashPayNow && currentPaymentStatus === 'SkillsFuture Done'`
2. **Initialize Progress Tracker** with 5 steps (4 base steps + 1 vacancies for NSA)
3. **Step 1**: Call `editRegistrationField(id, 'finalPaymentMethod', newValue)`
4. **Step 2**: Advance and call `editRegistrationField(id, 'registrationStatus', 'Submitted')`
5. **Step 3**: Advance and call `updatePaymentStatus(id, 'Pending', ...)`
6. **Step 4**: Advance and call `clearPaymentDetails(id)`
7. **Step 5** (if NSA): Advance and call `updateWooCommerce(..., 'To refund')`
8. **Refresh Table Cells** with columns: `paymentStatusCashPayNow`, `paymentStatusSkillsFuture`, `finalPaymentMethod`, `confirmed`, `registrationStatus`, `recinvNo`, `paymentDate`, `paymentTime`
9. **Finish Progress Tracker** with immediate close

### Console Output
```
✅ [Case 9] Changing payment method from SkillsFuture to Cash/PayNow (Payment already SkillsFuture Done)
✅ Vacancies counter increased for NSA course: { courseEngName, courseLocation }
```

### Database State After Completion
```javascript
{
  course: {
    payment: 'Cash' || 'PayNow',          // Updated to new method
    finalPaymentMethod: 'Cash' || 'PayNow', // Set as final
  },
  status: 'Pending',                      // Reset to Pending
  official: {
    registration_status: 'Submitted',     // Updated
    confirmed: false,                     // Reset
    receiptNo: '',                        // Cleared
    date: '',                             // Cleared
    time: '',                             // Cleared
  },
  // WooCommerce stock: increased by 1 (NSA course)
}
```

---

## Backend Validation

Both cases should validate in the backend at the time of final payment method update:
- Check that the registration exists
- Verify the user has permission to change payment method (NSA Approval staff only)
- Validate the new payment method value is one of: 'Cash', 'PayNow', 'SkillsFuture'
- Ensure the course type supports payment method changes

---

## UI Behavior

### Payment Status Columns Visibility
- **Case 8 (Cash/PayNow → SF)**:
  - Cash/PayNow column shows: "Not Available" (greyed out)
  - SkillsFuture column shows: "Pending"
  - Confirmation status column appears (empty, for future confirmation)

- **Case 9 (SF → Cash/PayNow)**:
  - SkillsFuture column shows: "Not Available" (greyed out)
  - Cash/PayNow column shows: "Pending"
  - Confirmation status column disappears (not applicable)

### Table Cell Refresh
All affected columns are refreshed after the payment method change:
```javascript
event.api.refreshCells({
  rowNodes: [event.node],
  columns: [
    'paymentStatusCashPayNow',
    'paymentStatusSkillsFuture',
    'finalPaymentMethod',
    'confirmed',              // Confirmation status
    'registrationStatus',
    'recinvNo',              // Receipt/Invoice number
    'paymentDate',
    'paymentTime',
  ],
  force: true,
});
```

---

## WooCommerce Integration

### Stock Update Mechanism
When payment method changes involve completed payments (Paid or SkillsFuture Done), the stock must be restored:

```javascript
// Both cases call updateWooCommerce with 'To refund' status
await updateWooCommerce(courseChiName, courseEngName, courseLocation, 'To refund');
```

### Conditions
- Only for **NSA courses** (`courseInfo?.courseType === 'NSA'`)
- Applied to both Case 8 and Case 9
- Increases course product quantity by 1 in WooCommerce

---

## Testing Checklist

### Case 8: Cash/PayNow Paid → SkillsFuture
- [ ] Select a paid Cash/PayNow registration
- [ ] Change Final Payment Method to SkillsFuture
- [ ] Verify progress tracker shows 5 steps (or 4 for non-NSA)
- [ ] Verify Cash/PayNow status column shows "Not Available"
- [ ] Verify SkillsFuture status column shows "Pending"
- [ ] Verify confirmation status column appears
- [ ] Verify registration status becomes "Submitted"
- [ ] Verify receipt number is cleared
- [ ] Verify payment date/time are cleared
- [ ] For NSA courses: Verify vacancies counter increased by 1
- [ ] Verify table cells refresh immediately
- [ ] Check backend logs for successful updates

### Case 9: SkillsFuture Done → Cash/PayNow
- [ ] Select a SkillsFuture Done registration
- [ ] Change Final Payment Method to Cash or PayNow
- [ ] Verify progress tracker shows 5 steps (or 4 for non-NSA)
- [ ] Verify SkillsFuture status column shows "Not Available"
- [ ] Verify Cash/PayNow status column shows "Pending"
- [ ] Verify confirmation status is reset
- [ ] Verify registration status becomes "Submitted"
- [ ] Verify receipt/invoice number is cleared
- [ ] Verify payment date/time are cleared
- [ ] For NSA courses: Verify vacancies counter increased by 1
- [ ] Verify table cells refresh immediately
- [ ] Check backend logs for successful updates

---

## File Modifications

### Frontend Files Modified
- `frontend/src/html/components/RegistrationAndPayment/handlers/finalPaymentMethodHandler.js`
  - Added Case 8: Cash/PayNow Paid → SkillsFuture handler
  - Updated Case 9: Added WooCommerce stock increase step

### Backend Files (No Changes Required)
- Backend already supports payment method changes through existing API endpoints
- `clearPaymentDetails()` already handles receipt/date clearing
- WooCommerce integration already in place

---

## Version
- **Created**: May 21, 2026
- **Status**: ✅ IMPLEMENTED
- **Test Status**: Pending manual testing
