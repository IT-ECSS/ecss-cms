# User Guide - NSA Course Status Validation

## Overview
The Registration & Payment system now includes smart validation for NSA courses. This ensures that payment and registration statuses are always in a valid state, preventing data inconsistencies.

## Valid Status Combinations for NSA Courses

### When Payment Status is "Paid"
✅ **MUST** have Registration Status: **"Confirmed Slot"**
- ❌ Cannot use: Submitted, Cancelled for duplication, Withdrawn, Not Successful

### When Payment Status is "SkillsFuture Done"
✅ **MUST** have Registration Status: **"Confirmed Slot"**
- ❌ Cannot use: Submitted, Cancelled for duplication, Withdrawn, Not Successful

### When Payment Status is "To Refund"
✅ **MUST** have Registration Status: **"Cancelled for duplication"** OR **"Withdrawn"**
- ❌ Cannot use: Submitted, Confirmed Slot, Not Successful

### Other Payment Statuses (Pending, etc.)
✅ Any Registration Status is allowed
- These statuses don't have prerequisites

## Example Scenarios

### Scenario 1: Correct Flow ✅
1. Student registers → Registration Status: "Submitted", Payment Status: "Pending"
2. Staff confirms slot → Registration Status changes to "Confirmed Slot"
3. Payment received → Payment Status changes to "Paid" (requires "Confirmed Slot" ✓)
4. **SUCCESS** - Both statuses are valid

### Scenario 2: Attempting Invalid Change ❌
1. Current state: Registration Status "Submitted", Payment Status "Pending"
2. User tries to change Payment Status to "Paid"
3. **ERROR** - Cannot change Payment Status to "Paid" when Registration Status is "Submitted"
4. Registration Status must be "Confirmed Slot" first
5. Change is reverted - no data is saved

### Scenario 3: Refund Flow ✅
1. Current state: Registration Status "Confirmed Slot", Payment Status "Paid"
2. Change Registration Status to "Withdrawn" (cancellation request)
3. Change Payment Status to "To Refund" (requires "Withdrawn" or "Cancelled for duplication" ✓)
4. **SUCCESS** - System processes refund

## Error Messages

### "Cannot Update Payment Status"
**Meaning**: You're trying to set a payment status that doesn't match the current registration status.

**Example Error:**
```
Cannot change Payment Status to "Paid". 
Registration Status must be "Confirmed Slot". 
Current: "Submitted"
```

**Solution**: First change the Registration Status to "Confirmed Slot", then change Payment Status.

### "Cannot Update Registration Status"
**Meaning**: You're trying to set a registration status that conflicts with the current payment status.

**Example Error:**
```
Cannot change Registration Status to "Submitted". 
When Payment Status is "Paid", Registration Status must be "Confirmed Slot".
```

**Solution**: If payment is already processed, the registration must stay as "Confirmed Slot".

## Important Notes

### NSA Courses Only
- This validation applies **ONLY** to NSA courses
- Other course types (ILP, Talks & Seminar, etc.) have no restrictions

### Data Safety
- ✅ If you see an error, **nothing is saved** - the row automatically reverts
- ✅ Your previous data remains unchanged
- ✅ Try again with a valid combination

### Status Definitions

**Payment Statuses:**
- **Pending**: Awaiting payment
- **Paid**: Cash/PayNow payment received
- **SkillsFuture Done**: SkillsFuture billing processed
- **To Refund**: Payment needs to be refunded
- **Refunded**: Refund completed

**Registration Statuses:**
- **Submitted**: Initial registration created
- **Confirmed Slot**: Slot confirmed by system (usually automatic when paid)
- **Cancelled for duplication**: Registration cancelled (duplicate participant)
- **Withdrawn**: Registration cancelled (participant request)
- **Not Successful**: Registration unsuccessful

## Quick Reference Table

| Payment Status | Allowed Registration Status(es) |
|---|---|
| Pending | Any |
| Paid | Confirmed Slot ONLY |
| SkillsFuture Done | Confirmed Slot ONLY |
| To Refund | Cancelled for duplication, Withdrawn |
| Refunded | Cancelled for duplication, Withdrawn |
| Generating SkillsFuture Invoice | Any |
| Cancelled - No payment received | Any |

## Still Have Questions?
- Check the error message - it tells you exactly what's required
- Refer to the status definitions above
- Contact system administrator if validation seems incorrect

---

**Remember**: The validation system helps maintain data integrity. If you get an error, it's protecting the data - just follow the instructions in the error message to proceed correctly.
