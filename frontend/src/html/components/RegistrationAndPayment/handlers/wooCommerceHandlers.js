import { updateWooCommerceStock } from '../services/registrationApi';

const TRIGGER_STATUSES = ['Paid', 'Cancelled', 'Withdrawn', 'Confirmed'];

/**
 * Updates WooCommerce stock when a registration status changes to a
 * status that affects seat availability.
 */
export async function updateWooCommerceForRegistrationPayment(chi, eng, location, updatedStatus) {
  if (!TRIGGER_STATUSES.includes(updatedStatus)) return;
  try {
    const res = await updateWooCommerceStock(chi, eng, location, updatedStatus);
    if (!res.data.success) console.error('WooCommerce stock update error:', res.data);
  } catch (error) {
    console.error('Error updating WooCommerce stock:', error);
  }
}
