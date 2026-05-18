# AG-Grid Cell Handlers - Refactored Structure

This directory contains the refactored cell handlers for the Registration & Payment AG-Grid table. Previously all handlers were in a single 1300+ line file. They are now organized into focused, specialized modules.

## File Organization

### `handlerHelpers.js` ✅ CREATED
Common utility functions and helper utilities used across all handlers.

**Exports:**
- Utility functions: `waitForNextPaint()`, `isResultSuccessful()`, `isApiResultSuccessful()`
- Document type helpers: `isSkillsFutureInvoiceNumber()`, `inferDocumentType()`, `getCurrentTimestampLabel()`
- Remark helpers: `appendLocalRemark()`, `buildLogPayload()`
- Common handlers: `updateFinalPaymentMethodIfNeeded()`, `autoSetConfirmedSlotRegistrationStatus()`, `appendVoidedNumberRemark()`
- Constants: `RECENT_VOID_REMARK_WINDOW_MS`, `recentVoidRemarkByKey`

### `paymentMethodHandlers.js` ✅ CREATED
Handlers for payment method changes (both participant and staff overrides).

**Exports:**
- `handlePaymentMethodChange()` - Participant payment method changes (Auto-sets status to Paid, generates receipt)
- `handleFinalPaymentMethodChange()` - Staff final payment method override (Updates status and generates receipt/invoice)

### `confirmationHandlers.js` ✅ CREATED
Handlers for SkillsFuture confirmation status and invoice generation.

**Exports:**
- `handleConfirmationStatusChange()` - Confirmation toggle for SkillsFuture registrations
- `handleSkillsFutureConfirmation()` - Helper for SF invoice generation

### `paymentStatusHandlers.js` ✅ CREATED
Handlers for payment status column changes.

**Exports:**
- `handlePaymentStatusChange()` - Main handler for payment status changes
- `handleCashPayNowStatusChange()` - Sub-handler for Cash/PayNow statuses
- `handleSkillsFutureStatusChange()` - Sub-handler for SkillsFuture invoice statuses
- `handleILPOrTalksStatusChange()` - Sub-handler for ILP/Talks & Seminar statuses

### `otherHandlers.js` ✅ CREATED
Remaining handlers for misc. columns.

**Exports:**
- `handleRemarksChange()` - Remarks/comments column updates
- `handleRefundedDateChange()` - Refund date tracking
- `handleRegistrationStatusChange()` - Registration status changes
- `handleGenericFieldChange()` - Fallback for generic field updates

### `index.js` ✅ CREATED
Central re-export point for all handlers and utilities. Import from here for convenience.

**Usage:**
```javascript
// Option 1: Import from index
import { handlePaymentMethodChange, handleConfirmationStatusChange } from './handlers';

// Option 2: Import from specific module
import { handlePaymentMethodChange } from './handlers/paymentMethodHandlers';
import { handleConfirmationStatusChange } from './handlers/confirmationHandlers';
```

## Migration Guide

The old `cellValueChangedHandlers.js` is being split into multiple files. The new structure is designed for:

1. **Better maintainability** - Each file handles a single concern
2. **Easier navigation** - Find the handler you need in a focused 300-400 line file instead of 1300+
3. **Clear dependencies** - Each handler file explicitly imports only what it needs
4. **Easier testing** - Smaller modules are easier to unit test

## Files to Clean Up

Once all handlers are migrated:
- Delete the original `cellValueChangedHandlers.js`
- Update any imports in `index.jsx` to use `./handlers/index.js` instead

## Progress

- [x] Extract helpers to `handlerHelpers.js`
- [x] Extract payment method handlers to `paymentMethodHandlers.js`
- [x] Extract confirmation handlers to `confirmationHandlers.js`
- [x] Extract payment status handlers to `paymentStatusHandlers.js`
- [x] Extract other handlers to `otherHandlers.js`
- [x] Create index.js re-exporter
- [ ] Update main component imports in `index.jsx`
- [ ] Delete old `cellValueChangedHandlers.js`
