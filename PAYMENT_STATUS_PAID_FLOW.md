# Payment Status "Paid" - Complete Flow Documentation

## Overview
When the final payment method is **Cash** or **PayNow** and the payment status changes to **"Paid"**, the system executes all 6 required steps in proper sequence with visual progress tracking.

## Required Steps (with progress tracking)
1. ✅ **Updating payment status** - Payment status changes to "Paid"
2. ✅ **Updating registration status** - Registration status auto-updates to "Confirmed Slot"
3. ✅ **Updating vacancies counter** - NSA course vacancies decrease by 1
4. ✅ **Generating receipt number** - Next receipt number is fetched from backend
5. ✅ **Generating receipt** - Receipt PDF is created with participant & course details
6. ✅ **Downloading and previewing receipt** - Receipt auto-opens in new tab and auto-downloads

## Complete Flow Sequence

### Step 1: Update Payment Status
**File**: `paymentStatusHandlers.js` (line 181)
```javascript
const res = await updatePaymentStatus(id, newValue, userName, userRole, _sgtPayDate, _sgtPayTime);
```

**Backend**: `courseregistration.js` route → `RegistrationController.updateOfficialUse()` → `databaseConnectivity.updatePaymentOfficialUse()`

**What happens**:
- Payment status set to "Paid" in MongoDB
- SGT date/time recorded in `official.date` and `official.time`
- Registration status auto-set to "Confirmed Slot" in `official.registration_status`
- Progress indicator: Step 1 complete (auto-completes via API call)

**Progress tracker advance**: Line 217 calls `progressTracker.advance()` → moves to Step 2

### Step 2: Update Registration Status
**File**: `paymentStatusHandlers.js` (lines 158-163)
```javascript
const updated = await autoSetConfirmedSlotRegistrationStatus({
  id, sn, userName, participantInfo,
  currentRegistrationStatus: event.data.registrationStatus,
});
```

**Backend**: `registrationApi.editRegistrationField()` → `courseregistration.js` route

**What happens**:
- Frontend explicitly confirms registration status is "Confirmed Slot"
- Audit log recorded for the status change
- Progress indicator: Step 2 complete

**Progress tracker advance**: Line 217 (same as above) moves to next step

### Step 3: Update Vacancies Counter
**File**: `paymentStatusHandlers.js` (lines 200-207)
```javascript
const shouldRunWooCommerceSync = 
  shouldDecreaseWooCommerceStock && 
  String(event.data.registrationStatus || '').trim() === 'Confirmed Slot';

if (shouldRunWooCommerceSync) {
  if (useTracker) progressTracker.advance(); // → Updating vacancies counter
  await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
}
```

**Backend**: Python Django `woocommerce/views.py:update_stock()`

**What happens**:
- If course type is "NSA" and payment status is "Paid"
- WooCommerce stock is reduced by 1 (vacancy count decreases)
- Progress indicator: Step 3 complete

**Progress tracker advance**: Line 206 moves to next step (Generating receipt number or receipt generation if no WooCommerce)

### Steps 4-6: Receipt Generation and Download
**File**: `paymentStatusHandlers.js` (lines 208-268) and `receiptHandlers.js` (lines 203-209)

#### Step 4: Generate Receipt Number
```javascript
// receiptHandlers.js - _generateCashPayNowReceipt()
const receiptNo = await fetchReceiptNumber(course, paymentMethod);
if (progressTracker) progressTracker.advance(); // → Generating receipt
```

**Backend**: Fetches next sequential receipt number based on course type

**What happens**:
- Receipt number generated (e.g., "RC2026-001")
- Progress indicator: Step 4 complete

#### Step 5: Generate Receipt PDF
```javascript
// receiptHandlers.js - _generateCashPayNowReceipt()
const result = await generatePDFReceipt(id, participant, course, userName, receiptNo, status, officialInfo);
if (progressTracker) progressTracker.advance(); // → Recording payment date and time
```

**What happens**:
- PDF created with:
  - Participant name, contact number
  - Course name (English & Chinese), location
  - Receipt number, payment date & time
  - Payment method (Cash or PayNow)
- Returns: `{ receiptNo, blob, filename, paymentDate, paymentTime }`
- Backend: `addReceiptNumber()` API stores receipt number and date/time
- Progress indicator: Step 5 complete

#### Step 6: Download and Preview Receipt
```javascript
// paymentStatusHandlers.js - lines 246-256
if (shouldGenerateReceipt && useTracker) {
  progressTracker.advance(); // → Recording payment date and time (already done in Step 5)
  
  if (generatedNo) {
    // Update frontend grid with payment date/time
    event.data.paymentDate = _dispDate;
    event.data.paymentTime = _dispTime;
    progressTracker.advance(); // → Downloading and previewing receipt
  }
}

// homePage.jsx - _progressFinish()
progressTracker.finish(receiptData);
// Triggers in 400ms:
this._progressDownloadReceipt();    // Downloads PDF to device
this._progressPreviewReceipt();     // Opens PDF in new browser tab
// Auto-closes modal in 3 seconds
```

**What happens**:
- Receipt data (blob) passed to progress tracker
- After 400ms:
  - PDF opens in new tab for preview
  - PDF automatically downloads to device with filename: `{ParticipantName}-Cash-{ReceiptNo}.pdf`
- Modal auto-closes after 3 seconds
- Progress indicator: Step 6 complete ✓

## Data Flow Summary

### Frontend Files Modified
1. **`paymentStatusHandlers.js`**
   - Fixed WooCommerce sync advance logic (lines 200-210)
   - Removed premature advance before receipt generation
   - Proper advance after WooCommerce sync completion
   - Proper advances after receipt generation

2. **`receiptHandlers.js`**
   - Added advance after `generatePDFReceipt()` (line 206)
   - Ensures proper step progression through receipt generation

### Backend Files (No Changes Required)
- `courseregistration.js` - Already properly handling payment status updates
- `RegistrationController.js` - Already properly updating official data
- `databaseConnectivity.js` - Already properly storing all required fields
- `woocommerce/views.py` - Already handling stock reduction for "Paid" status

### Database Updates
When payment status changes to "Paid", MongoDB updates:
```javascript
{
  "status": "Paid",                           // Payment status
  "official.registration_status": "Confirmed Slot",  // Auto-set registration status
  "official.date": "21/05/2026",              // SGT payment date
  "official.time": "14:30:45",                // SGT payment time
  "official.receiptNo": "RC2026-0001",        // Receipt number
  "official.name": "Staff Name",              // Staff who recorded
}
```

## Testing Checklist
- [ ] Select a registration with Cash/PayNow payment method
- [ ] Change payment status to "Paid"
- [ ] Verify progress modal shows all 6 steps in order
- [ ] Each step completes and moves to next
- [ ] Receipt PDF generates successfully
- [ ] PDF opens in new tab automatically
- [ ] PDF downloads to device automatically
- [ ] Modal closes after 3 seconds
- [ ] Table shows: Receipt number, Payment date, Payment time
- [ ] Registration status shows "Confirmed Slot"
- [ ] For NSA courses: Vacancies counter decreases by 1

## Error Handling
- If any step fails, progress indicator shows error state
- Modal displays error message
- No partial updates (all-or-nothing transaction)
- Audit log records all successful updates

## Performance Notes
- Progress tracking uses `flushSync()` for immediate UI updates
- Receipt PDF generation happens in parallel with status updates
- Auto-preview/download triggers after 400ms to allow final step animation
- Modal closes after 3 seconds regardless of completion

## Related Features
- **Auto-confirmation**: When payment method changes to Cash/PayNow, status auto-sets to "Paid"
- **SkillsFuture invoices**: Similar flow but generates invoice instead of receipt
- **Refunds**: Triggers inverse flow (increase vacancies, record refund date/time)
- **Stock management**: NSA courses only (ILP/Talks don't affect WooCommerce stock)
