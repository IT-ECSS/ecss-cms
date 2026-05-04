import axios from "axios";

export const NODE_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://ecss-backend-node.azurewebsites.net";

const DJANGO_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3002"
    : "https://ecss-backend-django.azurewebsites.net";

// ─── Course Registration ──────────────────────────────────────────────────────

/**
 * Fetch all course registrations for a given site IC / role.
 */
export const fetchCourseRegistrations = async (siteIC, role) => {
  const response = await axios.post(`${NODE_BASE_URL}/courseregistration`, {
    purpose: "retrieve",
    siteIC,
    role,
  });
  return response;
};

/**
 * Update the payment method for a single registration.
 */
export const updatePaymentMethod = async (id, newUpdatePayment, staff) => {
  const response = await axios.post(`${NODE_BASE_URL}/courseregistration`, {
    purpose: "updatePaymentMethod",
    id,
    newUpdatePayment,
    staff,
  });
  return response;
};

/**
 * Update the payment status for a single registration.
 */
export const updatePaymentStatus = async (id, newUpdateStatus, staff) => {
  const response = await axios.post(`${NODE_BASE_URL}/courseregistration`, {
    purpose: "updatePaymentStatus",
    id,
    newUpdateStatus,
    staff,
  });
  return response;
};

/**
 * Update the confirmation status (boolean) for a single registration.
 */
export const updateConfirmationStatus = async (id, newConfirmation, staff) => {
  const response = await axios.post(`${NODE_BASE_URL}/courseregistration`, {
    purpose: "updateConfirmationStatus",
    id,
    newConfirmation,
    staff,
  });
  return response;
};

/**
 * Edit an arbitrary field on a registration record.
 */
export const editRegistrationField = async (id, field, editedValue) => {
  const response = await axios.post(`${NODE_BASE_URL}/courseregistration`, {
    purpose: "edit",
    id,
    field,
    editedValue,
  });
  return response;
};

/**
 * Add / update cancel remarks on a registration.
 */
export const addCancelRemarks = async (id, editedValue) => {
  const response = await axios.post(`${NODE_BASE_URL}/courseregistration`, {
    purpose: "addCancelRemarks",
    id,
    editedValue,
  });
  return response;
};

/**
 * Record a refunded date on a registration.
 */
export const addRefundedDate = async (id) => {
  const response = await axios.post(`${NODE_BASE_URL}/courseregistration`, {
    id,
    purpose: "addRefundedDate",
  });
  return response;
};

/**
 * Remove the refunded date from a registration.
 */
export const removeRefundedDate = async (id) => {
  const response = await axios.post(`${NODE_BASE_URL}/courseregistration`, {
    id,
    purpose: "removedRefundedDate",
  });
  return response;
};

/**
 * Bulk update payment status and/or payment method for multiple registrations.
 * @param {Array<{id, paymentStatus, paymentMethod}>} updates
 */
export const bulkUpdateRegistrations = async (updates, staff) => {
  const response = await axios.post(`${NODE_BASE_URL}/courseregistration`, {
    purpose: "bulkUpdate",
    updates,
    staff,
  });
  return response;
};

/**
 * Persist a receipt number against a registration record.
 */
export const addReceiptNumber = async (
  id,
  participant,
  course,
  staff,
  receiptNo,
  status
) => {
  const response = await axios.post(`${NODE_BASE_URL}/courseregistration`, {
    purpose: "addReceiptNumber",
    id,
    participant,
    course,
    staff,
    receiptNo,
    status,
  });
  return response;
};

/**
 * Persist an invoice number against a registration record.
 */
export const addInvoiceNumber = async (
  id,
  participant,
  course,
  staff,
  receiptNo,
  status
) => {
  const response = await axios.post(`${NODE_BASE_URL}/courseregistration`, {
    purpose: "addInvoiceNumber",
    id,
    participant,
    course,
    staff,
    receiptNo,
    status,
  });
  return response;
};

/**
 * Ask the backend to generate a receipt/invoice PDF and stream it back as a
 * binary blob.
 * @param {"receipt"|"invoice"} purpose
 */
export const generateReceiptPDF = async (
  purpose,
  participant,
  course,
  staff,
  receiptNo,
  officialInfo
) => {
  const response = await axios.post(
    `${NODE_BASE_URL}/courseregistration`,
    { purpose, participant, course, staff, receiptNo, officialInfo },
    { responseType: "blob" }
  );
  return response;
};

// ─── Receipt ─────────────────────────────────────────────────────────────────

/**
 * Fetch the next sequential receipt number from the backend.
 */
export const getReceiptNumber = async (course, paymentMethod) => {
  const response = await axios.post(`${NODE_BASE_URL}/receipt`, {
    purpose: "getReceiptNo",
    course,
    paymentMethod,
  });

  return response;
};

/**
 * Persist a new receipt record in the database.
 */
export const createReceiptRecord = async (
  receiptNo,
  location,
  registration_id,
  url,
  staff
) => {
  const response = await axios.post(`${NODE_BASE_URL}/receipt`, {
    purpose: "createReceipt",
    receiptNo,
    location,
    registration_id,
    url,
    staff,
  });
  return response;
};

// ─── WooCommerce / Django ─────────────────────────────────────────────────────

/**
 * Update the WooCommerce product stock via the Django backend.
 * Only called when status is Paid / Cancelled / Withdrawn / Confirmed.
 */
export const updateWooCommerceStock = async (chi, eng, location, status) => {
  const response = await axios.post(`${DJANGO_BASE_URL}/update_stock/`, {
    type: "update",
    page: {
      courseChiName: chi,
      courseEngName: eng,
      courseLocation: location,
    },
    status,
    location,
  });
  return response;
};
