import axios from 'axios';

const API_BASE_URL = window.location.hostname === "localhost" 
  ? "http://localhost:3001" 
  : "https://ecss-backend-node.azurewebsites.net";

const DJANGO_BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:3002"
  : "https://ecss-backend-django.azurewebsites.net";

/**
 * Change password API call
 */
export const changePassword = async (accountId, newPassword) => {
  return axios.post(`${API_BASE_URL}/login`, {
    purpose: "changePassword",
    accountId,
    newPassword
  });
};

/**
 * Reset password API call
 */
export const resetPassword = async (username, password) => {
  return axios.post(`${API_BASE_URL}/login`, {
    purpose: "resetPassword",
    username,
    password
  });
};

/**
 * Delete account API call
 */
export const deleteAccount = async (accountId) => {
  return axios.post(`${API_BASE_URL}/accountDetails`, {
    purpose: "deleteAccount",
    accountId
  });
};

/**
 * Delete course registration API call
 */
export const deleteCourseRegistration = async (id) => {
  return axios.post(`${API_BASE_URL}/courseregistration`, {
    purpose: "delete",
    id
  });
};

/**
 * Send details API call
 */
export const sendDetails = async (id) => {
  return axios.post(`${API_BASE_URL}/courseregistration`, {
    purpose: "sendDetails",
    id
  });
};

/**
 * Port over API call
 */
export const portOverRegistration = async (id, selectedLocation) => {
  return axios.post(`${API_BASE_URL}/courseregistration`, {
    purpose: "portOver",
    id,
    selectedLocation
  });
};

/**
 * Update WooCommerce stock API call
 */
export const updateWooCommerceStock = async (courseChiName, courseEngName, courseLocation, updatedStatus, location, updateType = 'update') => {
  return axios.post(`${DJANGO_BASE_URL}/update_stock/`, {
    type: updateType,
    page: {
      courseChiName,
      courseEngName,
      courseLocation
    },
    status: updatedStatus,
    location
  });
};

/**
 * Port over WooCommerce API call
 */
export const portOverWooCommerce = async (courseChiName, courseEngName, courseLocation, updatedStatus, location) => {
  return axios.post(`${DJANGO_BASE_URL}/port_over/`, {
    type: 'update',
    page: {
      courseChiName,
      courseEngName,
      courseLocation
    },
    status: updatedStatus,
    location
  });
};

/**
 * Add receipt number API call
 */
export const addReceiptNumber = async (id, participant, staff, receiptNo, status) => {
  return axios.post(`${API_BASE_URL}/courseregistration`, {
    purpose: "addReceiptNumber",
    id,
    participant,
    staff,
    receiptNo,
    status
  });
};

/**
 * Generate receipt number API call
 */
export const generateReceiptNumber = async (courseLocation, centreLocation) => {
  return axios.post(`${API_BASE_URL}/receipt`, {
    purpose: "getReceiptNo",
    courseLocation,
    centreLocation
  });
};

/**
 * Create receipt in database API call
 */
export const createReceiptRecord = async (receiptNo, location, registration_id, url, staff) => {
  return axios.post(`${API_BASE_URL}/receipt`, {
    purpose: "createReceipt",
    receiptNo,
    location,
    registration_id,
    url,
    staff
  });
};

/**
 * Update access rights API call
 */
export const updateAccessRights = async (accessRight, accessRightId) => {
  return axios.post(`${API_BASE_URL}/accessRights`, {
    purpose: "updateAccessRight",
    accessRight,
    accessRightId
  });
};

/**
 * Update entry API call
 */
export const updateEntry = async (entry) => {
  return axios.post(`${API_BASE_URL}/courseregistration`, {
    purpose: "updateEntry",
    entry
  });
};

/**
 * Logout API call
 */
export const logout = async (accountId) => {
  return axios.post(`${API_BASE_URL}/login`, {
    purpose: "logout",
    accountId
  });
};
