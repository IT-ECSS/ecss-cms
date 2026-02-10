import axios from 'axios';

const baseURL = window.location.hostname === "localhost" 
  ? "http://localhost:3001" 
  : "https://ecss-backend-node.azurewebsites.net";

/**
 * Creates an audit log entry
 * @param {Object} params - Audit log parameters
 * @param {string} params.userName - Name of the user performing the action
 * @param {string} params.module - Module name (e.g., "Registration And Payment", "Courses")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {string} params.description - Description of the action performed
 * @param {string} [params.actionType] - Type of action (e.g., "UPDATE", "CREATE", "EXPORT")
 * @param {Object} [params.details] - Optional additional details object
 * @returns {Promise<Object>} - Response from the audit log API
 */
export const createAuditLog = async ({ userName, module, section = '', description, actionType = '', details = {} }) => {
  try {
    // Get current date and time
    const now = new Date();
    
    // Format date as dd/mm/yyyy
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    
    // Format time as hh:mm:ss
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    const response = await axios.post(`${baseURL}/logs`, {
      purpose: "create",
      userName: userName,
      actionType: actionType || details.action || 'UNKNOWN',
      module: module,
      section: section || details.section || '',
      description: description,
      details: {
        ...details,
        date: formattedDate,
        time: formattedTime
      }
    });

    console.log("Audit log created:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating audit log:", error);
    return { success: false, message: "Failed to create audit log" };
  }
};

/**
 * Log a table update action
 * @param {Object} params - Update parameters
 * @param {string} params.userName - Name of the user
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {string} params.recordId - ID of the record being updated
 * @param {string} params.fieldName - Name of the field being updated
 * @param {any} params.oldValue - Previous value
 * @param {any} params.newValue - New value
 * @returns {Promise<Object>}
 */
export const logTableUpdate = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  recordId, 
  fieldName, 
  oldValue, 
  newValue 
}) => {
  const description = `[Section: ${section}] Updated ${fieldName}: "${oldValue}" → "${newValue}"`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      recordId,
      fieldName,
      oldValue,
      newValue,
      action: 'UPDATE'
    }
  });
};

/**
 * Log a record creation action
 * @param {Object} params - Creation parameters
 * @param {string} params.userName - Name of the user
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {string} params.recordId - ID of the new record
 * @param {string} params.recordName - Name/identifier of the new record
 * @returns {Promise<Object>}
 */
export const logRecordCreate = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  recordId, 
  recordName 
}) => {
  const description = `[Section: ${section}] Created new record: "${recordName}"`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      recordId,
      recordName,
      action: 'CREATE'
    }
  });
};

/**
 * Log an export or action event
 * @param {Object} params - Export/action parameters
 * @param {string} params.userName - Name of the user performing the action
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {string} params.actionType - Type of action (e.g., "Export to LOP", "Archive Data")
 * @param {number} [params.recordCount] - Number of records affected
 * @param {string} [params.additionalInfo] - Any additional info to include
 * @param {Array<Object>} [params.records] - Array of record details with {sn, name, contactNumber, courseName}
 * @returns {Promise<Object>}
 */
export const logExportAction = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  actionType, 
  recordCount = 0, 
  additionalInfo = '',
  records = []
}) => {
  const countInfo = recordCount > 0 ? ` (${recordCount} records)` : '';
  const extraInfo = additionalInfo ? ` - ${additionalInfo}` : '';
  
  // Build records detail string
  let recordsDetail = '';
  if (records.length > 0) {
    const recordsList = records.slice(0, 10).map(r => 
      `[S/N: ${r.sn}] [Name: ${r.name}] [Contact: ${r.contactNumber}] [Course: ${r.courseName || 'N/A'}]`
    ).join('; ');
    const moreCount = records.length > 10 ? ` and ${records.length - 10} more` : '';
    recordsDetail = ` | Records: ${recordsList}${moreCount}`;
  }
  
  const description = `[Section: ${section}] ${actionType}${countInfo}${extraInfo}${recordsDetail}`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      actionType,
      recordCount,
      additionalInfo,
      records: records, // Store all records
      action: 'EXPORT_ACTION'
    }
  });
};

/**
 * Log a record deletion action
 * @param {Object} params - Deletion parameters
 * @param {string} params.userName - Name of the user
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {string} params.recordId - ID of the deleted record
 * @param {string} params.recordName - Name/identifier of the deleted record
 * @returns {Promise<Object>}
 */
export const logRecordDelete = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  recordId, 
  recordName 
}) => {
  const description = `[Section: ${section}] Deleted record: "${recordName}"`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      recordId,
      recordName,
      action: 'DELETE'
    }
  });
};

/**
 * Log a status change action
 * @param {Object} params - Status parameters
 * @param {string} params.userName - Name of the user
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {string} params.recordId - ID of the record
 * @param {string} params.recordName - Name/identifier of the record
 * @param {string} params.oldStatus - Previous status
 * @param {string} params.newStatus - New status
 * @param {string} [params.columnName] - Optional column name being updated
 * @returns {Promise<Object>}
 */
export const logStatusChange = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  recordId, 
  recordName, 
  oldStatus, 
  newStatus, 
  columnName = 'Status' 
}) => {
  const description = `[Section: ${section}] Updated "${columnName}" for "${recordName}": "${oldStatus}" → "${newStatus}"`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      recordId,
      recordName,
      columnName,
      oldStatus,
      newStatus,
      action: 'STATUS_CHANGE'
    }
  });
};

/**
 * Log a field update action with column name
 * @param {Object} params - Update parameters
 * @param {string} params.userName - Name of the user
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {string} params.recordId - ID of the record
 * @param {string} params.recordName - Name/identifier of the record (e.g., participant name)
 * @param {string} params.columnName - Name of the column being updated
 * @param {any} params.oldValue - Previous value
 * @param {any} params.newValue - New value
 * @returns {Promise<Object>}
 */
export const logFieldUpdate = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  recordId, 
  recordName, 
  columnName, 
  oldValue, 
  newValue 
}) => {
  const description = `[Section: ${section}] Updated "${columnName}" for "${recordName}": "${oldValue || 'N/A'}" → "${newValue}"`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      recordId,
      recordName,
      columnName,
      oldValue,
      newValue,
      action: 'FIELD_UPDATE'
    }
  });
};

/**
 * Log a registration payment update with full details
 * @param {Object} params - Update parameters
 * @param {string} params.userName - Name of the user performing the action
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {number|string} params.sn - S/N (row number)
 * @param {string} params.recordId - ID of the record
 * @param {string} params.participantName - Participant's name
 * @param {string} params.contactNumber - Participant's contact number
 * @param {string} params.columnName - Name of the column being updated
 * @param {any} params.oldValue - Previous value
 * @param {any} params.newValue - New value
 * @returns {Promise<Object>}
 */
export const logRegistrationUpdate = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  sn, 
  recordId, 
  participantName, 
  contactNumber, 
  columnName, 
  oldValue, 
  newValue 
}) => {
  const description = `[Section: ${section}] [S/N: ${sn}] [Name: ${participantName}] [Contact: ${contactNumber}] Updated "${columnName}": "${oldValue || 'N/A'}" → "${newValue}"`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      sn,
      recordId,
      participantName,
      contactNumber,
      columnName,
      oldValue,
      newValue,
      action: 'REGISTRATION_UPDATE'
    }
  });
};

/**
 * Log a bulk update action
 * @param {Object} params - Bulk update parameters
 * @param {string} params.userName - Name of the user
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {number} params.recordCount - Number of records updated
 * @param {string} params.columnName - Name of the column being updated
 * @param {any} params.newValue - New value applied to all records
 * @param {Array<string>} [params.recordNames] - Optional list of participant names
 * @returns {Promise<Object>}
 */
export const logBulkUpdate = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  recordCount, 
  columnName, 
  newValue, 
  recordNames = [] 
}) => {
  const namesPreview = recordNames.length > 0 
    ? recordNames.slice(0, 3).join(', ') + (recordNames.length > 3 ? ` and ${recordNames.length - 3} more` : '')
    : `${recordCount} records`;
  const description = `[Section: ${section}] Bulk updated "${columnName}" to "${newValue}" for ${namesPreview}`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      recordCount,
      columnName,
      newValue,
      recordNames: recordNames, // Store all names
      action: 'BULK_UPDATE'
    }
  });
};

/**
 * Log a registration bulk update with full details
 * @param {Object} params - Update parameters
 * @param {string} params.userName - Name of the user performing the action
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {string} params.columnName - Name of the column being updated
 * @param {any} params.newValue - New value applied to all records
 * @param {Array<Object>} params.records - Array of record details with {sn, name, contactNumber}
 * @returns {Promise<Object>}
 */
export const logRegistrationBulkUpdate = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  columnName, 
  newValue, 
  records = [] 
}) => {
  const recordCount = records.length;
  const recordsPreview = records.slice(0, 3).map(r => `[S/N: ${r.sn}] [Name: ${r.name}] [Contact: ${r.contactNumber}]`).join(', ');
  const moreCount = recordCount > 3 ? ` and ${recordCount - 3} more` : '';
  const description = `[Section: ${section}] Bulk updated "${columnName}" to "${newValue}" for ${recordsPreview}${moreCount}`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      recordCount,
      columnName,
      newValue,
      records: records, // Store all records with details
      action: 'REGISTRATION_BULK_UPDATE'
    }
  });
};

/**
 * Log a filter change action
 * @param {Object} params - Filter parameters
 * @param {string} params.userName - Name of the user
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {string} params.filterType - Type of filter (e.g., "Type", "Location", "Course", "Quarter", "Search")
 * @param {string} params.oldValue - Previous filter value
 * @param {string} params.newValue - New filter value
 * @returns {Promise<Object>}
 */
export const logFilterChange = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  filterType, 
  oldValue, 
  newValue 
}) => {
  const description = `[Section: ${section}] Filter applied: "${filterType}" from "${oldValue || 'All'}" to "${newValue || 'All'}"`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      filterType,
      oldValue,
      newValue,
      action: 'FILTER_CHANGE'
    }
  });
};

/**
 * Log a receipt/invoice generation action
 * @param {Object} params - Receipt parameters
 * @param {string} params.userName - Name of the user
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {string} params.receiptNo - Receipt/Invoice number
 * @param {string} params.participantName - Participant's name
 * @param {string} params.contactNumber - Participant's contact number
 * @param {string} params.courseName - Name of the course
 * @param {string} params.paymentType - Type of payment (Cash, PayNow, SkillsFuture)
 * @param {string} [params.triggerSource] - What triggered the generation (e.g., "Click Receipt Number", "Payment Status Change")
 * @returns {Promise<Object>}
 */
export const logReceiptGeneration = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  receiptNo, 
  participantName, 
  contactNumber, 
  courseName, 
  paymentType,
  triggerSource = 'Manual'
}) => {
  const docType = paymentType === "SkillsFuture" ? "Invoice" : "Receipt";
  const description = `[Section: ${section}] [Name: ${participantName}] [Contact: ${contactNumber}] Generated ${docType} #${receiptNo} - ${courseName} [${paymentType}] - Triggered by: ${triggerSource}`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      receiptNo,
      participantName,
      contactNumber,
      courseName,
      paymentType,
      documentType: docType,
      triggerSource,
      action: 'RECEIPT_GENERATION'
    }
  });
};

/**
 * Log a message sending action
 * @param {Object} params - Message parameters
 * @param {string} params.userName - Name of the user
 * @param {string} params.module - Module name (e.g., "Registration And Payment")
 * @param {string} params.section - Section name (e.g., "Registration And Payment Table")
 * @param {string} params.participantName - Participant's name
 * @param {string} params.contactNumber - Participant's contact number
 * @param {string} params.courseEngName - Course name
 * @param {string} params.messageType - Type of message (e.g., "SkillsFuture Invoice", "Payment Instructions", "Confirmation", "Pending Notification")
 * @returns {Promise<Object>}
 */
export const logMessageSend = async ({ 
  userName, 
  module = "Registration And Payment", 
  section = "Registration And Payment Table",
  participantName, 
  contactNumber, 
  courseEngName, 
  messageType 
}) => {
  const description = `[Section: ${section}] [Name: ${participantName}] [Contact: ${contactNumber}] Sent WhatsApp message "${messageType}" for ${courseEngName}`;
  
  return createAuditLog({
    userName,
    module,
    description,
    details: {
      section,
      participantName,
      contactNumber,
      courseEngName,
      messageType,
      action: 'MESSAGE_SEND'
    }
  });
};

export default {
  createAuditLog,
  logTableUpdate,
  logRecordCreate,
  logRecordDelete,
  logExportAction,
  logStatusChange,
  logFieldUpdate,
  logRegistrationUpdate,
  logBulkUpdate,
  logRegistrationBulkUpdate,
  logFilterChange,
  logReceiptGeneration,
  logMessageSend
};
