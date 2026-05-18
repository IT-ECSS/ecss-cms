# Payment Method & Registration Status Update Flow Analysis

## Executive Summary

The application uses a **two-field payment method tracking system** with synchronization logic:
- **`course.payment`**: Primary payment method field (updated directly)
- **`course.finalPaymentMethod`**: Final/approved payment method (set once, rarely updated)
- **`status`**: Primary registration payment status (Paid, Pending, Cancelled, Withdrawn, Refunded, Not Successful, SkillsFuture states)
- **`official.registration_status`**: Secondary registration status (Confirmed Slot, Submitted)

Payment method changes automatically cascade to update registration status through both backend and frontend logic.

---

## 1. PAYMENT METHOD FIELDS & TRACKING

### Field Definitions

| Field | Location | Purpose | Default | When Set |
|-------|----------|---------|---------|----------|
| `course.payment` | Registration record | Current/active payment method | Empty initially | On registration; Updated when payment method changes |
| `course.finalPaymentMethod` | Registration record | Final approved method (NSA-controlled) | Empty initially | Set on first payment method change; Rarely updated afterward |
| `status` | Root level | Payment/registration status | "Submitted" | On registration; Updated on payment/status changes |
| `official.registration_status` | Root level | Secondary status flag | Unset initially | Set to "Confirmed Slot" when paid or SkillsFuture done |
| `official.confirmed` | Root level | SkillsFuture confirmation toggle | false | Set based on Confirmation column |

### Available Payment Method Values

```
- Cash
- PayNow
- SkillsFuture
- (Other custom values as defined in course setup)
```

### Payment Status Values

**For Cash/PayNow methods:**
```
Pending → Paid → Refunded/Cancelled/Withdrawn/Not Successful
```

**For SkillsFuture methods:**
```
Pending → Generating SkillsFuture Invoice → SkillsFuture Done → Refunded/Cancelled/Withdrawn
```

---

## 2. WHERE PAYMENT METHOD UPDATES HAPPEN

### 2.1 Frontend Payment Method Change Handler

**File:** [frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js](frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js#L116)

**Function:** `handlePaymentMethodChange(event, context)` - Lines 116-139

**Trigger:** User edits "Payment Method" column in grid

**Flow:**
```
1. User changes Payment Method in grid
2. Calls: updatePaymentMethod(id, newValue, userName)
   - API endpoint: POST /courseregistration
   - Purpose: "updatePaymentMethod"
3. Logs the change to audit log
```

### 2.2 Frontend Final Payment Method Change Handler

**File:** [frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js](frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js#L141)

**Function:** `handleFinalPaymentMethodChange(event, context)` - Lines 141-332

**Trigger:** User edits "Final Payment Method (by Staff)" column

**Key Logic:**
- **If changing TO Cash or PayNow (Lines 219-289):**
  - Auto-calls `handleAutoSetPaidStatus()`
  - Sets payment status to "Paid"
  - Updates final payment method
  - Updates registration status to "Confirmed Slot"
  - Generates receipt automatically

- **If changing TO SkillsFuture (Lines 291-330):**
  - Auto-sets payment status to "Pending"
  - Auto-sets registration status to "Submitted"
  - Does NOT auto-generate invoice yet

### 2.3 Backend Payment Method Update (Database Level)

**File:** [backend/database/databaseConnectivity.js](backend/database/databaseConnectivity.js#L1222)

**Method:** `async updatePaymentMethod(dbname, id, newPaymentMethod, staff, date, time)` - Lines 1222-1260

**Database Updates:**
```javascript
{
  $set: {
    "course.payment": newPaymentMethod,              // Update primary field
    "status": "Pending",                             // RESET to Pending
    "official.receiptNo": "",                        // Clear receipt
    "official.name": staff,
    "official.date": date,
    "official.time": time,
    "official.confirmed": false,
    // Only if first time setting final method:
    "course.finalPaymentMethod": newPaymentMethod    // Set final method once
  }
}
```

**Key Observation:** Payment method change **ALWAYS resets status to "Pending"**
- This is a hard reset regardless of previous status
- Forces re-approval/verification of payment

---

## 3. WHERE REGISTRATION STATUS IS UPDATED

### 3.1 Status Values by Context

**Payment Status (main `status` field):**
```
"Submitted"                       - Initial registration state
"Pending"                         - Awaiting payment/approval
"Paid"                            - Cash/PayNow received
"Generating SkillsFuture Invoice" - SF invoice being created
"SkillsFuture Done"               - SF payment complete
"Cancelled"                       - Participant cancelled
"Withdrawn"                       - Participant withdrew
"Refunded"                        - Payment refunded
"Not Successful"                  - Payment failed
```

**Secondary Status (`official.registration_status`):**
```
"Confirmed Slot" - Slot confirmed (set when Paid or SkillsFuture Done)
"Submitted"      - Initial submitted state
```

### 3.2 Backend Status Update Locations

#### Location 3.2.1: Payment Method Change
**File:** [backend/database/databaseConnectivity.js](backend/database/databaseConnectivity.js#L1240)

Lines 1240-1246:
```javascript
{
  $set: {
    "course.payment": newPaymentMethod,
    "status": "Pending",  // ← ALWAYS set to Pending
    "official.receiptNo": "",
    "official.name": staff,
    "official.date": date,
    "official.time": time,
    "official.confirmed": false,
    ...(shouldSetFinalPayment ? { 
      "course.finalPaymentMethod": newPaymentMethod 
    } : {}),
  }
}
```

#### Location 3.2.2: Direct Payment Status Update
**File:** [backend/database/databaseConnectivity.js](backend/database/databaseConnectivity.js#L1092)

Method: `async updatePaymentOfficialUse(dbname, id, name, date, time, status)` - Lines 1092-1160

**Conditional Logic:**
```
IF status === "Paid" OR status === "SkillsFuture Done":
  └─ Sets: official.registration_status = "Confirmed Slot"
  └─ Sets: official.name, official.date, official.time

ELSE IF status === "Generating SkillsFuture Invoice" OR "SkillsFuture Done":
  └─ Sets: official.name, official.date, official.time
  └─ KEEPS: official.confirmed unchanged

ELSE IF status === "Cancelled":
  └─ Sets: status = "Cancelled"
  └─ Sets: official.confirmed = false

ELSE (Pending, Withdrawn, Refunded, etc.):
  └─ Sets: status, official.name, official.date, official.time
  └─ Sets: official.confirmed = false
```

#### Location 3.2.3: Confirmation Status Update (SkillsFuture)
**File:** [backend/database/databaseConnectivity.js](backend/database/databaseConnectivity.js#L1163)

Method: `async updateConfirmationOfficialUse(dbname, id, name, date, time, status)` - Lines 1163-1216

**Logic:**
```
IF status === true (Confirmed):
  └─ Sets: official.confirmed = true
  └─ Sets: official.name, official.date, official.time
  └─ Does NOT change status field
  └─ (Frontend follows with status update call)

ELSE IF status === false (Not Confirmed):
  └─ Sets: official.confirmed = false
  └─ Sets: status = "Pending" ← RESETS TO PENDING
  └─ Sets: official.receiptNo = ""
  └─ Sets: official.name, official.date, official.time
```

### 3.3 Frontend Status Update Handler

**File:** [frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js](frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js#L412)

**Function:** `handlePaymentStatusChange(event, context)` - Lines 412-545

**Trigger:** User edits "Payment Status" or "Registration Status" column

**Auto-triggers:**
1. **When status becomes "Paid" or "SkillsFuture Done" (Line 471):**
   - Auto-sets registration status to "Confirmed Slot"
   
2. **For Cash/PayNow methods (Line 492):**
   - Auto-generates receipt when status = "Paid"
   
3. **For SkillsFuture (Line 500):**
   - Triggers invoice generation based on payment state

### 3.4 NSA Approval Triggered Updates

**File:** [backend/Controller/NSA_Approval/NsaApprovalController.js](backend/Controller/NSA_Approval/NsaApprovalController.js#L191)

**Method:** `maybeGenerateReceiptNumberForApproval()` - Lines 191-245

**Payment Method Change Auto-trigger (Lines 196-204):**
```javascript
if (mappingPurpose === 'updatePaymentMethod') {
  var requestedMethod = normalizePaymentMethod(approval.newValue);
  if (requestedMethod === 'Cash' || requestedMethod === 'PayNow') {
    // AUTO-SET status to Paid when method changes to Cash/PayNow
    await axios.post(`${BASE_URL}/courseregistration`, {
      purpose: 'updatePaymentStatus',
      id: registrationId,
      staff: staff,
      newUpdateStatus: 'Paid',
    });
  }
}
```

**Confirmation Status Change Auto-trigger (Lines 206-220):**
```javascript
if (mappingPurpose === 'updateConfirmationStatus') {
  var isConfirmed = parseConfirmationValue(approval.newValue);
  if (isConfirmed === true) {
    var rowAfterConfirm = await getRegistrationForApproval(db, registrationId);
    var methodAfterConfirm = normalizePaymentMethod(rowAfterConfirm?.course?.payment);
    if (methodAfterConfirm === 'SkillsFuture') {
      // AUTO-SET status to "Generating SkillsFuture Invoice"
      await axios.post(`${BASE_URL}/receipt`, {
        purpose: 'updatePaymentStatus',
        id: registrationId,
        staff: staff,
        newUpdateStatus: 'Generating SkillsFuture Invoice',
      });
    }
  }
}
```

---

## 4. API ENDPOINTS FOR STATUS UPDATES

### 4.1 Course Registration Endpoints

**Base Route:** [backend/routes/courseregistration.js](backend/routes/courseregistration.js)

| Purpose | Endpoint | Handler | Line |
|---------|----------|---------|------|
| updatePaymentMethod | POST /courseregistration | [Line 470-483](backend/routes/courseregistration.js#L470) | Updates `course.payment`, resets status to "Pending" |
| updatePaymentStatus | POST /courseregistration | [Line 356-376](backend/routes/courseregistration.js#L356) | Calls `updatePaymentOfficialUse()` |
| updateConfirmationStatus | POST /courseregistration | [Line 378-395](backend/routes/courseregistration.js#L378) | Calls `updateConfirmationOfficialUse()` |
| addReceiptNumber | POST /courseregistration | [Line 398-437](backend/routes/courseregistration.js#L398) | Sets receipt number and calls updateOfficialUse |
| addInvoiceNumber | POST /courseregistration | [Line 440-450](backend/routes/courseregistration.js#L440) | Sets invoice number for SkillsFuture |

### 4.2 Request/Response Format

**Update Payment Method:**
```javascript
POST /courseregistration
{
  purpose: "updatePaymentMethod",
  id: registrationId,
  newUpdatePayment: "Cash" | "PayNow" | "SkillsFuture",
  staff: staffName
}
```

**Update Payment Status:**
```javascript
POST /courseregistration
{
  purpose: "updatePaymentStatus",
  id: registrationId,
  newUpdateStatus: "Pending" | "Paid" | "Cancelled" | "SkillsFuture Done" | ...,
  staff: staffName
}
```

---

## 5. SYNCHRONIZATION BETWEEN PAYMENT FIELDS

### 5.1 When `course.payment` Updates

**Scenario:** User changes payment method from Cash → SkillsFuture

**Backend Flow:**
1. `course.payment` = "SkillsFuture"
2. `status` = "Pending" (always reset)
3. `official.receiptNo` = "" (cleared)
4. `course.finalPaymentMethod` = unchanged (already set on first change)

**Frontend Follow-up:**
1. Detects "SkillsFuture" assignment
2. Auto-calls `updatePaymentStatus(id, "Pending", userName)`
3. Auto-calls `editRegistrationField(id, "registrationStatus", "Submitted")`

### 5.2 When `course.finalPaymentMethod` Updates

**Policy:** 
- Set ONCE on first payment method change (Lines 1236 in database connectivity)
- Only updated if currently empty
- Acts as immutable final record for NSA tracking

**Logic:**
```javascript
const existingDocument = await table.findOne(filter, 
  { projection: { 'course.finalPaymentMethod': 1 } }
);
const shouldSetFinalPayment = !existingDocument?.course?.finalPaymentMethod;

// In update:
...(shouldSetFinalPayment ? { 
  "course.finalPaymentMethod": newPaymentMethod 
} : {}),
```

### 5.3 When `status` Updates

**Automatic side-effects:**

| From Status | To Status | Side Effect |
|------------|-----------|------------|
| Any | "Paid" | Set `official.registration_status = "Confirmed Slot"` |
| Any | "SkillsFuture Done" | Set `official.registration_status = "Confirmed Slot"` |
| Any | "Cancelled" | Set `official.confirmed = false` |
| "Confirmed" (SF) | Any | Unchanged (SF confirmation independent) |
| Any | "Pending" | Set `official.confirmed = false` |

### 5.4 Synchronization on Registration Creation

**File:** [backend/routes/courseregistration.js](backend/routes/courseregistration.js#L119)

Lines 119-124:
```javascript
participantsParticulars.course = {
  ...(participantsParticulars.course || {}),
  finalPaymentMethod: participantsParticulars.course?.finalPaymentMethod 
                      || participantsParticulars.course?.payment 
                      || '',
};
```

**Logic:** If `finalPaymentMethod` is missing, use `payment` value as fallback during registration

---

## 6. POTENTIAL SYNCHRONIZATION ISSUES

### Issue 6.1: Dual Payment Method Fields

**Problem:**
- Two fields track similar information (`course.payment` vs `course.finalPaymentMethod`)
- Can lead to inconsistency if not properly coordinated
- Frontend sometimes uses one, sometimes the other

**Current Code Pattern (Frontend):** [frontend/src/html/components/RegistrationAndPayment/index.jsx](frontend/src/html/components/RegistrationAndPayment/index.jsx#L197)

Lines 197-202:
```javascript
_getResolvedNsaPaymentMethod(rowData = {}) {
  const finalPaymentMethod = String(rowData?.finalPaymentMethod || '').trim();
  if (finalPaymentMethod) return finalPaymentMethod;
  
  return String(rowData?.paymentMethod || '').trim();
}
```

**Priority Order:** finalPaymentMethod > paymentMethod

**Recommendation:** Always display `finalPaymentMethod` when available for NSA records

### Issue 6.2: Status Reset on Payment Method Change

**Problem:**
- Changing payment method ALWAYS resets status to "Pending" (Line 1241, databaseConnectivity.js)
- User may not expect this behavior
- Can cause workflow interruption if status was "Paid" before change

**Example:**
1. Status = "Paid" with Cash payment
2. Admin changes to SkillsFuture
3. Status → "Pending" (unexpected to some users)

**Mitigation:** Frontend should warn user before allowing payment method change when status is "Paid"

### Issue 6.3: Registration Status vs Payment Status

**Problem:**
- Two separate status fields with overlapping purposes:
  - `status` (main field, many values)
  - `official.registration_status` (secondary, only "Confirmed Slot")
- Confusing which one to display/use
- NSA column names vary: "Payment Status", "Registration Status", "Registration and Payment Status"

**NSA Editable Columns:** [backend/Controller/NSA_Approval/NsaApprovalController.js](backend/Controller/NSA_Approval/NsaApprovalController.js#L11)

Lines 11-24:
```javascript
const COLUMN_FIELD_MAP = {
  'Registration Status': { purpose: 'updatePaymentStatus' },
  'Registration and Payment Status': { purpose: 'updatePaymentStatus' },
  'Payment Status': { purpose: 'updatePaymentStatus' },
  'Confirmation': { purpose: 'updateConfirmationStatus' },
  'Confirmation Status': { purpose: 'updateConfirmationStatus' },
  'Payment Method': { purpose: 'updatePaymentMethod' },
};
```

**All map to `status` field** (not the secondary `official.registration_status`)

### Issue 6.4: Confirmation Independence

**Problem:**
- `official.confirmed` (SkillsFuture confirmation) is independent of `status`
- Confusing relationship between Confirmed flag and actual payment status
- Confirmed SF → can stay "Pending" until invoice generated

**Flow:**
1. SF method selected → status = "Pending"
2. SF confirmation set to true → status = "Pending" (still!)
3. Only when status manually changed to "Generating SkillsFuture Invoice" does it move forward

---

## 7. REGISTRATION STATUS UPDATE LOCATIONS SUMMARY

### Location Reference Table

| File | Method/Function | Lines | Purpose | Updates |
|------|-----------------|-------|---------|---------|
| [backend/database/databaseConnectivity.js](backend/database/databaseConnectivity.js) | `updatePaymentMethod()` | 1222-1260 | Payment method change | `status="Pending"`, `course.payment`, `course.finalPaymentMethod` |
| [backend/database/databaseConnectivity.js](backend/database/databaseConnectivity.js) | `updatePaymentOfficialUse()` | 1092-1160 | Direct status change | `status`, `official.registration_status` |
| [backend/database/databaseConnectivity.js](backend/database/databaseConnectivity.js) | `updateConfirmationOfficialUse()` | 1163-1216 | SF confirmation toggle | `official.confirmed`, `status="Pending"` if unchecking |
| [backend/routes/courseregistration.js](backend/routes/courseregistration.js) | updatePaymentStatus handler | 356-376 | Route handler | Calls updatePaymentOfficialUse |
| [backend/routes/courseregistration.js](backend/routes/courseregistration.js) | updatePaymentMethod handler | 470-483 | Route handler | Calls RegistrationController.updatePaymentMethod |
| [frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js](frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js) | `handlePaymentMethodChange()` | 116-139 | Frontend grid change | Calls API updatePaymentMethod |
| [frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js](frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js) | `handleFinalPaymentMethodChange()` | 141-332 | Frontend grid change | Cascades: finalPaymentMethod → status → registrationStatus |
| [frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js](frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js) | `handlePaymentStatusChange()` | 412-545 | Frontend grid change | Updates status, triggers auto-confirmations |
| [backend/Controller/NSA_Approval/NsaApprovalController.js](backend/Controller/NSA_Approval/NsaApprovalController.js) | `maybeGenerateReceiptNumberForApproval()` | 191-245 | NSA approval logic | Auto-triggers status changes for approved method/confirmation |

---

## 8. DATA FLOW DIAGRAMS

### 8.1 Payment Method Change Flow

```
User edits "Payment Method" in Grid
          ↓
[Frontend] handlePaymentMethodChange()
          ↓
POST /courseregistration 
{ purpose: "updatePaymentMethod", id, newPaymentMethod, staff }
          ↓
[Backend] RegistrationController.updatePaymentMethod()
          ↓
[Database] updatePaymentMethod()
          ├─ SET course.payment = newPaymentMethod
          ├─ SET status = "Pending" (ALWAYS)
          ├─ SET official.confirmed = false
          ├─ SET course.finalPaymentMethod = (if first time)
          └─ CLEAR official.receiptNo
          ↓
[Frontend] Auto-cascade logic based on payment method:
          │
          ├─ If Cash/PayNow:
          │   ├─ Auto-call updatePaymentStatus("Paid")
          │   ├─ Auto-set registrationStatus("Confirmed Slot")
          │   └─ Auto-generate receipt
          │
          └─ If SkillsFuture:
              ├─ Auto-call updatePaymentStatus("Pending")
              └─ Auto-set registrationStatus("Submitted")
```

### 8.2 Payment Status Change Flow

```
User edits "Payment Status" in Grid
          ↓
[Frontend] handlePaymentStatusChange()
          ↓
POST /courseregistration
{ purpose: "updatePaymentStatus", id, newUpdateStatus, staff }
          ↓
[Backend] RegistrationController.updateOfficialUse()
          ↓
[Database] updatePaymentOfficialUse()
          ├─ SET status = newUpdateStatus
          ├─ If (Paid || SkillsFuture Done):
          │   └─ SET official.registration_status = "Confirmed Slot"
          └─ SET official.name, date, time
          ↓
[Frontend] Auto-cascade logic:
          ├─ If status → "Paid" or "SkillsFuture Done":
          │   └─ Auto-set registrationStatus = "Confirmed Slot"
          │
          └─ If payment method = Cash/PayNow and status = "Paid":
              └─ Auto-generate receipt
```

### 8.3 NSA Approval Payment Method Change

```
NSA Admin approves Payment Method change
          ↓
[Backend] NsaApprovalController.applyApproval()
          ├─ POST /courseregistration { purpose: "updatePaymentMethod", ... }
          └─ Call maybeGenerateReceiptNumberForApproval()
                    ↓
                    If method changed TO Cash/PayNow:
                    └─ AUTO: POST /courseregistration 
                       { purpose: "updatePaymentStatus", status: "Paid", ... }
                    ↓
                    If SkillsFuture: Generate receipt/invoice
```

---

## 9. COMPLETE PAYMENT WORKFLOW EXAMPLE

### Example: Cash to SkillsFuture Migration

**Initial State:**
```
course.payment = "Cash"
course.finalPaymentMethod = "Cash"
status = "Paid"
official.registration_status = "Confirmed Slot"
official.confirmed = false
```

**Step 1: Admin Changes Payment Method in UI**
```
User selects finalPaymentMethod = "SkillsFuture"
  ↓
Frontend handler: handleFinalPaymentMethodChange()
  ├─ API: editRegistrationField(id, "finalPaymentMethod", "SkillsFuture")
  ├─ Detects SkillsFuture selection
  ├─ API: updatePaymentStatus(id, "Pending", userName)
  └─ API: editRegistrationField(id, "registrationStatus", "Submitted")
```

**Step 2: Backend Updates**
```
Database record now has:
  course.payment = "Cash" (unchanged - this is separate)
  course.finalPaymentMethod = "SkillsFuture" (updated)
  status = "Pending" (reset by status update)
  registrationStatus = "Submitted" (set by frontend)
  official.confirmed = false
```

**Step 3: Admin Confirms Participant (SF Confirmation)**
```
User toggles Confirmation = true
  ↓
Frontend: handleConfirmationStatusChange()
  ├─ API: updateConfirmationStatus(id, true, userName)
  ├─ Detects SkillsFuture method
  └─ Auto-triggers invoice generation
```

**Final State:**
```
course.payment = "Cash" (original - may cause confusion!)
course.finalPaymentMethod = "SkillsFuture" (the authoritative one)
status = "Generating SkillsFuture Invoice"
official.confirmed = true
official.registration_status = "Confirmed Slot"
```

**Issue:** `course.payment` still shows "Cash" while `finalPaymentMethod` shows "SkillsFuture" - frontend should always prefer `finalPaymentMethod`

---

## 10. RECOMMENDATIONS

### Recommendation 1: Simplify Payment Method Tracking
**Action:** Consider unifying the two payment method fields or clearly document which takes priority
- Current: `finalPaymentMethod` takes priority
- Suggest: Always update both in sync, or eliminate `course.payment` from display

### Recommendation 2: Add Pre-change Validation
**Action:** Warn users before changing payment method when status is "Paid"
- Current: Silently resets to "Pending"
- Suggest: Show confirmation dialog highlighting consequence

### Recommendation 3: Add Soft-delete/Archive for Status Changes
**Action:** Track history of status changes for audit purposes
- Current: Overwrites old status
- Suggest: Keep audit log of every status transition with timestamp and staff name

### Recommendation 4: Clarify Registration Status Terminology
**Action:** Rename or document the purpose of `official.registration_status`
- Current: Only "Confirmed Slot" is set; rarely used
- Suggest: Use only `status` field for all status tracking to reduce confusion

### Recommendation 5: Add Race Condition Protection
**Action:** Implement version/timestamp checking for concurrent updates
- Risk: Two admins updating same record simultaneously
- Suggest: Add `version` or `lastModifiedAt` timestamp for optimistic locking

---

## Appendix A: Field Location Reference

| Field | Full Path | Type | Backend Collection |
|-------|-----------|------|-------------------|
| Payment Method | `course.payment` | String | Registration Forms |
| Final Payment Method | `course.finalPaymentMethod` | String | Registration Forms |
| Payment Status | `status` | String | Registration Forms |
| Registration Status | `official.registration_status` | String | Registration Forms |
| SF Confirmation | `official.confirmed` | Boolean | Registration Forms |
| Receipt Number | `official.receiptNo` | String | Registration Forms |
| Staff Name | `official.name` | String | Registration Forms |
| Update Date | `official.date` | String | Registration Forms |
| Update Time | `official.time` | String | Registration Forms |

---

## Appendix B: NSA Column to Database Field Mapping

**File:** [backend/Controller/NSA_Approval/NsaApprovalController.js](backend/Controller/NSA_Approval/NsaApprovalController.js#L11)

| NSA Column Name | Purpose | Backend Action |
|---|---|---|
| Payment Status | updatePaymentStatus | Updates `status` field |
| Registration Status | updatePaymentStatus | Updates `status` field |
| Registration and Payment Status | updatePaymentStatus | Updates `status` field |
| Payment Method | updatePaymentMethod | Updates `course.payment`, resets `status` to "Pending" |
| Confirmation | updateConfirmationStatus | Updates `official.confirmed` |
| Confirmation Status | updateConfirmationStatus | Updates `official.confirmed` |

---

## Appendix C: Key Code Snippets

### C.1 Payment Method Update (Database)
```javascript
// File: backend/database/databaseConnectivity.js, Line 1222-1260
async updatePaymentMethod(dbname, id, newPaymentMethod, staff, date, time) {
  const filter = { _id: this._makeObjectId(id) };
  const existingDocument = await table.findOne(filter, { 
    projection: { 'course.finalPaymentMethod': 1 } 
  });
  const shouldSetFinalPayment = !existingDocument?.course?.finalPaymentMethod;

  var update = {
    $set: {
      "course.payment": newPaymentMethod,
      "status": "Pending",  // ALWAYS RESET
      "official.receiptNo": "",
      "official.name": staff,
      "official.date": date,
      "official.time": time,
      "official.confirmed": false,
      ...(shouldSetFinalPayment ? { 
        "course.finalPaymentMethod": newPaymentMethod 
      } : {}),
    }
  };
  return await table.updateOne(filter, update);
}
```

### C.2 Frontend Final Method Change Logic
```javascript
// File: frontend/src/html/components/RegistrationAndPayment/handlers/cellValueChangedHandlers.js
if (newValue === 'Cash' || newValue === 'PayNow') {
  await handleAutoSetPaidStatus({
    id, sn, userName,
    courseName, courseChiName, courseLocation,
    participantInfo, courseInfo, officialInfo,
    oldPaymentStatus: currentPaymentStatus,
    newPaymentMethod: newValue,
    currentRegistrationStatus,
    updateWooCommerce,
    autoReceiptGenerator,
  });
} else if (newValue === 'SkillsFuture') {
  const desiredPaymentStatus = 'Pending';
  // Set payment status to Pending
  // Set registration status to Submitted
}
```

### C.3 NSA Auto-trigger for Payment Method Approval
```javascript
// File: backend/Controller/NSA_Approval/NsaApprovalController.js, Line 196-204
if (mappingPurpose === 'updatePaymentMethod') {
  var requestedMethod = normalizePaymentMethod(approval.newValue);
  if (requestedMethod === 'Cash' || requestedMethod === 'PayNow') {
    // AUTO: Set status to Paid
    await axios.post(`${BASE_URL}/courseregistration`, {
      purpose: 'updatePaymentStatus',
      id: registrationId,
      staff: staff,
      newUpdateStatus: 'Paid',
    });
  }
}
```

---

**Document Generated:** 2026-05-15
**Analysis Tool:** GitHub Copilot Code Analysis
