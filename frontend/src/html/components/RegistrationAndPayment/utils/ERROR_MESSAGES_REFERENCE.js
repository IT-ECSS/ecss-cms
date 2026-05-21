/**
 * Error Message Reference Guide
 * NSA Course Payment & Registration Status Validation
 */

// ──────────────────────────────────────────────────────────────────────────
// REGISTRATION STATUS CHANGE ERRORS
// ──────────────────────────────────────────────────────────────────────────

// When payment is "Paid" and user tries to change registration status to anything except "Confirmed Slot"
// Example: Trying to change from "Confirmed Slot" to "Submitted"
"❌ Cannot Update Registration Status

Cannot change Registration Status to "Submitted". When Payment Status is "Paid", Registration Status must be "Confirmed Slot"."

// When payment is "SkillsFuture Done" and user tries to change registration status to anything except "Confirmed Slot"
"❌ Cannot Update Registration Status

Cannot change Registration Status to "Withdrawn". When Payment Status is "SkillsFuture Done", Registration Status must be "Confirmed Slot"."

// When payment is "To refund" and user tries to change registration status to anything except "Cancelled for duplication" or "Withdrawn"
"❌ Cannot Update Registration Status

Cannot change Registration Status to "Confirmed Slot". When Payment Status is "To Refund", Registration Status must be either "Cancelled for duplication" or "Withdrawn"."

// ──────────────────────────────────────────────────────────────────────────
// PAYMENT STATUS CHANGE ERRORS
// ──────────────────────────────────────────────────────────────────────────

// When registration is NOT "Confirmed Slot" and user tries to change payment to "Paid"
// Example: Registration is "Submitted", trying to change payment to "Paid"
"❌ Cannot Update Payment Status

Cannot change Payment Status to "Paid". Registration Status must be "Confirmed Slot". Current: "Submitted""

// When registration is NOT "Confirmed Slot" and user tries to change payment to "SkillsFuture Done"
"❌ Cannot Update Payment Status

Cannot change Payment Status to "SkillsFuture Done". Registration Status must be "Confirmed Slot". Current: "Withdrawn""

// When registration is NOT "Cancelled for duplication" or "Withdrawn" and user tries to change payment to "To Refund"
// Example: Registration is "Confirmed Slot", trying to change payment to "To Refund"
"❌ Cannot Update Payment Status

Cannot change Payment Status to "To Refund". Registration Status must be either "Cancelled for duplication" or "Withdrawn". Current: "Confirmed Slot""

// ──────────────────────────────────────────────────────────────────────────
// VALID TRANSITIONS (NO ERRORS)
// ──────────────────────────────────────────────────────────────────────────

// ✓ Payment: Paid, Registration: Confirmed Slot - VALID
// ✓ Payment: Paid, Registration: Refunded - VALID (no change to registration)
// ✓ Payment: SkillsFuture Done, Registration: Confirmed Slot - VALID
// ✓ Payment: To refund, Registration: Cancelled for duplication - VALID
// ✓ Payment: To refund, Registration: Withdrawn - VALID
// ✓ Any other combination for non-NSA courses - VALID (no validation)
