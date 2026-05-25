import { updateWooCommerceStock } from '../services/registrationApi';

/**
 * List of payment/registration statuses that trigger WooCommerce stock updates.
 * - 'Paid': Cash/PayNow payment confirmed → decrease vacancies
 * - 'SkillsFuture Done': SkillsFuture payment confirmed → decrease vacancies
 * - 'Cancelled': Registration cancelled → increase vacancies
 * - 'Withdrawn': Registration withdrawn → increase vacancies
 * - 'Refunded': Payment refunded → increase vacancies
 * - 'Confirmed': Course confirmed → decrease vacancies
 */
const TRIGGER_STATUSES = ['Paid', 'SkillsFuture Done', 'Cancelled', 'Withdrawn', 'Refunded', 'Confirmed'];

/**
 * Updates WooCommerce stock when a registration status changes to a
 * status that affects seat availability.
 */
export async function updateWooCommerceForRegistrationPayment(chi, eng, location, updatedStatus) {
  if (!TRIGGER_STATUSES.includes(updatedStatus)) {
    console.warn(`WooCommerce sync skipped: status '${updatedStatus}' not in trigger list. Allowed statuses:`, TRIGGER_STATUSES);
    return;
  }
  try {
    const res = await updateWooCommerceStock(chi, eng, location, updatedStatus);
    if (!res.data.success) {
      console.error('WooCommerce stock update error:', res.data.error || res.data.message || res.data);
    }
  } catch (error) {
    console.error('Error updating WooCommerce stock:', error);
  }
}
