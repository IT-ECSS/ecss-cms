import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import '../../../css/sub/registrationPaymentDetails.css';
import '../../../css/ag-grid-custom-theme.css';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { io } from 'socket.io-client';

// Audit logging
import {
  logRegistrationUpdate,
  logReceiptGeneration,
  logMessageSend,
} from '../../../utils/auditLog';

// Sub-components
import ExpandedRowDetail      from './components/ExpandedRowDetail';
import SlideButtonRenderer    from './components/SlideButtonRenderer';
import PaymentMethodRenderer       from './components/PaymentMethodRenderer';
import FinalPaymentMethodRenderer  from './components/FinalPaymentMethodRenderer';
import DateTimeFieldRenderer from './components/DateTimeFieldRenderer';
import PaymentStatusRenderer       from './components/PaymentStatusRenderer';
import RegistrationStatusRenderer  from './components/RegistrationStatusRenderer';
import SelectAllHeader        from './components/SelectAllHeader';
import ActionButtonsRow       from './components/ActionButtonsRow';

// Approval popup

// Access control
import { isReadOnlyUser } from './constants/accessControl';
import { shouldRequireApprovalForCourse } from './constants/accessControl';

// Utilities
import {
  languageDatabase,
  getAllLocations,
  getAllTypes,
  getAllNames,
  getAllQuarters,
  getAllRegistrationStatuses,
  getQuarterFromDuration,
} from './utils/dataQueryUtils';
import { mapRegistrationToRowData } from './utils/rowDataMapper';

// WooCommerce handlers
import { updateWooCommerceForRegistrationPayment as updateWooCommerceFn } from './handlers/wooCommerceHandlers';

// Action button handlers
import {
  exportToLOP               as exportToLOPFn,
  exportToMarriagePreparationProgramme as exportToMarriagePrepFn,
  exportAttendance          as exportAttendanceFn,
  archiveData               as archiveDataFn,
  openBulkUpdateModal       as openBulkUpdateModalFn,
  closeBulkUpdateModal      as closeBulkUpdateModalFn,
  handleBulkUpdate          as handleBulkUpdateFn,
} from './handlers/actionButtonHandlers';

// Receipt / invoice handlers
import {
  fetchReceiptNumber,
  generatePDFReceipt,
  generatePDFInvoice,
  saveReceiptToDatabase,
  showReceipt,
  receiptGenerator as receiptGeneratorFn,
  autoReceiptGenerator as autoReceiptGeneratorFn,
} from './handlers/receiptHandlers';

// Cell-value-changed column handlers
import {
  handleConfirmationStatusChange,
  handlePaymentStatusChange,
  handleFinalPaymentMethodChange,
  handlePaymentMethodChange,
  handleRegistrationStatusChange,
  handleRemarksChange,
  handleRefundedDateChange,
  handleGenericFieldChange,
} from './handlers';

// API service layer
import {
  fetchCourseRegistrations as apiFetchCourseRegistrations,
  fetchCourseRegistrationsBatch,
  fetchRegistrationById,
  updatePaymentMethod,
  updatePaymentStatus,
  updateConfirmationStatus,
  editRegistrationField,
  addCancelRemarks,
  addRefundedDate,
  removeRefundedDate,
  addReceiptNumber,
  addInvoiceNumber,
  generateReceiptPDF,
  getReceiptNumber,
  createReceiptRecord,
  updateWooCommerceStock,
  NODE_BASE_URL,
} from './services/registrationApi';

// Register AG-Grid community modules once at module level
ModuleRegistry.registerModules([AllCommunityModule]);

const APPROVAL_QUEUE_STORAGE_KEY_PREFIX = 'registrationApprovalQueue';
const APPROVAL_STATUS_STORAGE_KEY_PREFIX = 'registrationApprovalStatus';
const APPROVAL_STATUS_CLEAR_MARKER_PREFIX = 'registrationApprovalStatusCleared';

// Stale-while-revalidate cache for the full registration dataset.
// Allows the grid to appear instantly on revisit while a background fetch
// silently refreshes the data.
// const REG_DATA_CACHE_KEY_PREFIX = 'registrationDataCache';
// const REG_DATA_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─────────────────────────────────────────────────────────────────────────────

// S/N cell renderer (plain value only)
const SNRenderer = (props) => {
  return <span>{props.value}</span>;
};

class RegistrationPaymentSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hideMarriagePrepFields: true,
      registerationDetails: [],
      isLoading: true,
      focusedInputIndex: null,
      originalData: [],
      currentPage: 1,
      entriesPerPage: 100,
      remarks: '',
      paginatedDetails: [],
      columnDefs: [],
      rowData: [],
      expandedRowIndex: null,
      editedRowIndex: '',
      aiSearchQuery: '',
      aiSuggestions: [],
      anomalyThreshold: 0.8,
      phoneNumber: '',
      message: '',
      status: '',
      isAlertShown: false,
      anomalyList: [],
      selectedRows: [],
      showBulkUpdateModal: false,
      bulkUpdateField: '',
      bulkUpdateStatus: '',
      bulkUpdateMethod: '',
      bulkUpdateValue: '',
      bulkUpdateRowValues: {},
      pendingChange: null,
      approvalQueue: [],
      approvalStatusList: [],
      notifierQueue: [],
      lastMouseX: null,
      mouseGestureThreshold: 100,
      lastPageNavigationTime: 0,
      lastMouseMoveTime: null,
      gestureStartX: null,
      gestureStartTime: null,
    };
    this.tableRef = React.createRef();
    this.gridRef  = React.createRef();
    this._isReverting = false;
    this._suppressSocketRefreshUntil = 0;
    this._pendingRefreshChild = false;
  }

  _suppressNextSocketRefresh(ms = 2500) {
    this._suppressSocketRefreshUntil = Date.now() + ms;
  }

  _getApprovalQueueStorageKey() {
    const email = (this.props.userEmail || 'unknown').toLowerCase();
    return `${APPROVAL_QUEUE_STORAGE_KEY_PREFIX}:${email}`;
  }

  _serializeQueueEvent(event) {
    return {
      value: event.newValue ?? event.value,
      oldValue: event.oldValue,
      rowIndex: event.rowIndex,
      data: event.data,
      colDef: {
        field: event.colDef?.field,
        headerName: event.colDef?.headerName,
      },
    };
  }

  _resolveFieldFromHeader(headerName) {
    const map = {
      'Name': 'name',
      'Contact Number': 'contactNo',
      'Confirmation Status': 'confirmed',
      'Registration and Payment Status': 'paymentStatus',
      'Registration Status': 'registrationStatus',
      'Payment Status': 'paymentStatus',
      'Payment Date': 'paymentDate',
      'Payment Time': 'paymentTime',
      'Refunded Date': 'refundedDate',
      'Refunded Time': 'refundedTime',
      'Remarks': 'remarks',
    };
    return map[headerName] || '';
  }

  _getPaymentMethodHeader() {
    return this.props.selectedCourseType === 'NSA'
      ? 'Payment Method (indicated by participant)'
      : 'Payment Method';
  }

  _getResolvedNsaPaymentMethod(rowData = {}) {
    const finalPaymentMethod = String(rowData?.finalPaymentMethod || '').trim();
    if (finalPaymentMethod) return finalPaymentMethod;

    return String(rowData?.paymentMethod || '').trim();
  }

  _isActiveNsaPaymentStatusColumn(columnName, rowData = {}) {
    if (columnName !== 'Payment Status (Cash/PayNow)' && columnName !== 'Payment Status (SkillsFuture)') {
      return false;
    }

    const resolvedMethod = this._getResolvedNsaPaymentMethod(rowData);
    const isSkillsFuture = resolvedMethod === 'SkillsFuture';

    return columnName === 'Payment Status (SkillsFuture)'
      ? isSkillsFuture
      : !isSkillsFuture;
  }

  _normalizeRoleString(str) {
    // Normalize: convert to lowercase, replace hyphens/underscores with spaces, collapse multiple spaces
    return String(str || '')
      .toLowerCase()
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _hasRoleKeyword(...keywords) {
    const role = this._normalizeRoleString(this.props.role || '');
    const normalizedKeywords = keywords.map((kw) => this._normalizeRoleString(kw));
    return normalizedKeywords.some((keyword) => {
      // Match as whole word or substring (more flexible)
      return role.includes(keyword) || role.split(' ').some((word) => keyword.split(' ').every((part) => role.includes(part)));
    });
  }

  // Allowed roles for NSA sensitive columns: Ops in-charge, Finance, Sub Admin, Admin
  /**
   * Checks if the current user has Finance role and can edit Payment Status.
   * Allowed roles: Finance (any variant)
   * @returns {boolean}
   */
  _canEditPaymentStatus() {
    return this._hasRoleKeyword('finance');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NSA COURSE: ROLE-BASED COLUMN EDIT ACCESS CONTROL METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if user has full admin access (Admin, Ops in-charge, Sub Admin)
   */
  _canEditAllNsaColumns() {
    return this._hasRoleKeyword('admin', 'ops in-charge', 'sub admin');
  }

  /**
   * Check if user is Finance role (can edit Payment Method, Payment Status Cash/PayNow, Payment Date, Refunded Date, Remarks)
   */
  _isFinanceRole() {
    return this._hasRoleKeyword('finance');
  }

  /**
   * Check if user is NSA in-charge (can edit Registration Status, Confirmation Status, Payment Status SkillsFuture, Remarks)
   */
  _isNsaInChargeRole() {
    return this._hasRoleKeyword('nsa in-charge');
  }

  /**
   * Check if user is Site in-charge (can edit Registration Status, Remarks)
   */
  _isSiteInChargeRole() {
    return this._hasRoleKeyword('site in-charge');
  }

  /**
   * Check if user is Site in-charge with Pasir Ris West location access
   * Site In-Charge at Pasir Ris West (PRW or full name) can edit: Registration Status, Confirmation Status, Payment Status (SkillsFuture), Remarks
   */
  _isSiteInChargeWithPasirRisWestLocation() {
    if (!this._isSiteInChargeRole()) {
      console.log('🔐 [Pasir Ris West Check] Not a Site in-charge role');
      return false;
    }
    
    const siteIC = this.props.siteIC;
    const pasirRisWestVariants = ['PRW', 'Pasir Ris West Wellness Centre', 'Pasir Ris West'];
    
    console.log('🔐 [Pasir Ris West Location Check]', {
      role: this.props.role,
      siteIC: siteIC,
      siteICType: typeof siteIC,
      siteICIsArray: Array.isArray(siteIC),
      variants: pasirRisWestVariants,
    });
    
    // If siteIC is undefined or empty, allow edit anyway (backward compatibility)
    if (!siteIC) {
      console.log('🔐 [Pasir Ris West Check] siteIC is undefined/empty - allowing edit');
      return true; // Allow Site in-charge to edit if location not specified
    }
    
    // Check if siteIC includes any variation of Pasir Ris West location
    if (Array.isArray(siteIC)) {
      const result = siteIC.some(location => {
        const match = pasirRisWestVariants.includes(location);
        console.log('  Checking:', location, '| Match:', match);
        return match;
      });
      console.log('🔐 [Array Check Result]:', result);
      return result;
    }
    
    const result = pasirRisWestVariants.includes(siteIC);
    console.log('🔐 [String Check]:', siteIC, '| Match:', result);
    return result;
  }

  /**
   * Check if user is Fitness Trainer or Social Worker (can edit Registration Status, Remarks)
   */
  _isFitnessOrSocialWorkerRole() {
    return this._hasRoleKeyword('fitness trainer', 'social worker');
  }

  /**
   * NSA: Can edit Registration Status column
   * Allowed: Admin, Ops in-charge, Sub Admin, NSA in-charge, Site in-charge (at Pasir Ris West location), Fitness Trainer, Social Worker
   */
  _canEditNsaRegistrationStatus() {
    const role = String(this.props.role || '').toLowerCase();
    const canEdit = this._canEditAllNsaColumns() || 
           this._isNsaInChargeRole() || 
           this._isSiteInChargeWithPasirRisWestLocation() || 
           this._isFitnessOrSocialWorkerRole()|| this._isFinanceRole();
    console.log('🔍 [NSA Registration Status] Role:', role, '| Can Edit:', canEdit, '| Role Checks:', {
      admin: this._canEditAllNsaColumns(),
      nsaInCharge: this._isNsaInChargeRole(),
      siteInChargePasirRisWest: this._isSiteInChargeWithPasirRisWestLocation(),
      fitnessOrSocial: this._isFitnessOrSocialWorkerRole(),
    });
    return canEdit;
  }

  /**
   * NSA: Can edit Final Payment Method (by Staff) column
   * Allowed: Admin, Ops in-charge, Sub Admin, Finance
   * Restricted: Site in-charge (ALL locations), Fitness Trainer, Social Worker
   */
  _canEditNsaFinalPaymentMethod() {
    // Restrict Site In-Charge and Fitness Trainer / Social Worker from editing this column
    if (this._isSiteInChargeRole() || this._isFitnessOrSocialWorkerRole()) {
      console.log('🔐 [Final Payment Method Check] Restricted role - Role:', this.props.role);
      return false;
    }
    const canEdit = this._canEditAllNsaColumns() || this._isFinanceRole();
    console.log('🔐 [Final Payment Method Check] Role:', this.props.role, '| Can Edit:', canEdit);
    return canEdit;
  }

  /**
   * NSA: Can edit Confirmation Status column
   * Allowed: Admin, Ops in-charge, Sub Admin, NSA in-charge, Site in-charge (at Pasir Ris West location only)
   * Restricted: Fitness Trainer, Social Worker, Finance
   */
  _canEditNsaConfirmationStatus() {
    // Restrict Fitness Trainer / Social Worker / Finance from editing this column
    if (this._isFitnessOrSocialWorkerRole() || this._isFinanceRole()) {
      console.log('🔐 [NSA Confirmation Status Check] Fitness Trainer/Social Worker/Finance restricted from editing');
      return false;
    }
    const canEdit = this._canEditAllNsaColumns() || this._isNsaInChargeRole() || this._isSiteInChargeWithPasirRisWestLocation();
    console.log('🔐 [NSA Confirmation Status Check] Role:', this.props.role, '| Can Edit:', canEdit, '| Checks:', {
      admin: this._canEditAllNsaColumns(),
      nsaInCharge: this._isNsaInChargeRole(),
      siteInChargePRW: this._isSiteInChargeWithPasirRisWestLocation(),
    });
    return canEdit;
  }

  /**
   * NSA: Can edit Payment Status (Cash/PayNow) column
   * Allowed: Admin, Ops in-charge, Sub Admin, Finance
   * Restricted: Site in-charge (ALL locations), Fitness Trainer, Social Worker
   */
  _canEditNsaCashPayNowPaymentStatus() {
    // Restrict Site In-Charge and Fitness Trainer / Social Worker from editing this column
    if (this._isSiteInChargeRole() || this._isFitnessOrSocialWorkerRole()) {
      return false;
    }
    return this._canEditAllNsaColumns() || this._isFinanceRole();
  }

  /**
   * NSA: Can edit Payment Status (SkillsFuture) column
   * Allowed: Admin, Ops in-charge, Sub Admin, NSA in-charge, Site in-charge (at Pasir Ris West location only)
   * Restricted: Finance, Fitness Trainer, Social Worker
   */
  _canEditNsaSkillsFuturePaymentStatus() {
    // Restrict Finance from editing SkillsFuture column
    if (this._isFinanceRole()) {
      console.log('🔐 [NSA Payment Status SkillsFuture Check] Finance role restricted from editing SkillsFuture');
      return false;
    }
    // Restrict Fitness Trainer / Social Worker from editing this column
    if (this._isFitnessOrSocialWorkerRole()) {
      console.log('🔐 [NSA Payment Status SkillsFuture Check] Fitness Trainer/Social Worker restricted from editing');
      return false;
    }
    const canEdit = this._canEditAllNsaColumns() || this._isNsaInChargeRole() || this._isSiteInChargeWithPasirRisWestLocation();
    console.log('🔐 [NSA Payment Status SkillsFuture Check] Role:', this.props.role, '| Can Edit:', canEdit, '| Checks:', {
      admin: this._canEditAllNsaColumns(),
      nsaInCharge: this._isNsaInChargeRole(),
      siteInChargePRW: this._isSiteInChargeWithPasirRisWestLocation(),
    });
    return canEdit;
  }

  /**
   * NSA: Can edit Payment Date column
   * Allowed: Admin, Ops in-charge, Sub Admin, Finance
   * Restricted: Site in-charge (ALL locations), Fitness Trainer, Social Worker
   */
  _canEditNsaPaymentDate() {
    // Restrict Site In-Charge and Fitness Trainer / Social Worker from editing this column
    if (this._isSiteInChargeRole() || this._isFitnessOrSocialWorkerRole()) {
      return false;
    }
    return this._canEditAllNsaColumns() || this._isFinanceRole();
  }

  /**
   * NSA: Can edit Refunded Date column
   * Allowed: Admin, Ops in-charge, Sub Admin, Finance
   * Restricted: Site in-charge (ALL locations), Fitness Trainer, Social Worker
   */
  _canEditNsaRefundedDate() {
    // Restrict Site In-Charge and Fitness Trainer / Social Worker from editing this column
    if (this._isSiteInChargeRole() || this._isFitnessOrSocialWorkerRole()) {
      return false;
    }
    return this._canEditAllNsaColumns() || this._isFinanceRole();
  }

  /**
   * NSA: Can edit Payment Time column
   * Allowed: Admin, Ops in-charge, Sub Admin, Finance
   * Note: Site in-charge is restricted from editing this column
   */
  _canEditNsaPaymentTime() {
    // Restrict Site In-Charge and Fitness Trainer / Social Worker from editing this column
    if (this._isSiteInChargeRole() || this._isFitnessOrSocialWorkerRole()) {
      return false;
    }
    return this._canEditAllNsaColumns() || this._isFinanceRole();
  }

  /**
   * NSA: Can edit Refunded Time column
   * Allowed: Admin, Ops in-charge, Sub Admin, Finance
   * Restricted: Site in-charge (ALL locations), Fitness Trainer, Social Worker
   */
  _canEditNsaRefundedTime() {
    // Restrict Site In-Charge and Fitness Trainer / Social Worker from editing this column
    if (this._isSiteInChargeRole() || this._isFitnessOrSocialWorkerRole()) {
      return false;
    }
    return this._canEditAllNsaColumns() || this._isFinanceRole();
  }

  /**
   * NSA: Can edit Remarks column
   * Allowed: Admin, Ops in-charge, Sub Admin, Finance, NSA in-charge, Fitness Trainer, Social Worker
   * Site in-charge can edit ONLY if at Pasir Ris West location
   */
  _canEditNsaRemarks() {
    // Check if Site In-Charge - if so, only allow at Pasir Ris West
    if (this._isSiteInChargeRole()) {
      const canEdit = this._isSiteInChargeWithPasirRisWestLocation();
      console.log('🔐 [NSA Remarks Check] Site In-Charge at Pasir Ris West:', canEdit);
      return canEdit;
    }
    // All other roles (including Fitness Trainer / Social Worker) can edit remarks
    return true;
  }

  /**
   * NSA: Can edit Payment Method (indicated by participant) column
   * Allowed: Admin, Ops in-charge, Sub Admin, Site in-charge (at Pasir Ris West location only)
   * Restricted: Finance, Fitness Trainer, Social Worker
   * 
   * Additional Lock: Once payment date/time or refunded date/time are set, becomes read-only
   */
  _canEditPaymentMethodIndicatedByParticipant(rowData = {}) {
    // Check if Site In-Charge - if so, only allow at Pasir Ris West
    if (this._isSiteInChargeRole()) {
      const canEdit = this._isSiteInChargeWithPasirRisWestLocation();
      console.log('🔐 [Payment Method Check] Site In-Charge at Pasir Ris West:', canEdit);
      return canEdit;
    }
    // Admin roles can edit
    const canEdit = this._canEditAllNsaColumns();
    console.log('🔐 [Payment Method Check] Admin/Ops in-charge can edit:', canEdit);
    return canEdit;
  }

  _getNsaPaymentStatusDisplayValue(columnName, rowData = {}) {
    if (!this._isActiveNsaPaymentStatusColumn(columnName, rowData)) {
      return 'Not Available';
    }

    return rowData?.paymentStatus || '';
  }

  _getNsaPaymentStatusEditorValues = (params) => {
    const { courseInfo } = params?.data || {};
    const courseType  = courseInfo?.courseType;
    const colId = params?.colDef?.colId || '';

    // NSA courses: show different values based on which payment status column
    if (courseType === 'NSA') {
      // Payment Status (SkillsFuture) column
      if (colId === 'paymentStatusSkillsFuture') {
        return { values: ['Pending', 'Generating SkillsFuture Invoice', 'SkillsFuture Done', 'Participants Withdrawn', 'SkillsFuture Unsuccessful'] };
      }
      // Payment Status (Cash/PayNow) column
      if (colId === 'paymentStatusCashPayNow') {
        return { values: ['Paid', 'Pending', 'Refunded', 'To refund'] };
      }
      // Default NSA values (fallback)
      return { values: ['Paid', 'Pending', 'Refunded', 'To refund'] };
    }

    const coursePrice = courseInfo?.coursePrice;
    const price       = parseFloat((coursePrice || '0').replace('$', ''));
    const { paymentStatus } = params?.data || {};
    let base;
    if (
      courseType === 'ILP' ||
      (courseType === 'Talks And Seminar' && price <= 0) ||
      (courseType === 'Others' && price <= 0)
    ) {
      base = ['Pending', 'Confirmed', 'Withdrawn', 'Not Successful'];
    } else if ((courseType === 'Talks And Seminar' || courseType === 'Others') && price > 0) {
      base = ['Pending', 'Paid', 'Cancelled', 'Withdrawn', 'Refunded', 'Not Successful'];
    } else {
      base = ['Pending', 'Paid', 'Withdrawn', 'Refunded', 'Not Successful'];
    }

    let options = base;
    if (paymentStatus === 'Pending') {
      options = base.filter((s) => s !== 'To refund' && s !== 'Withdrawn' && s !== 'Refunded');
    } else if (paymentStatus === 'Paid') {
      options = base.filter((s) => s !== 'Cancelled' && s !== 'Refunded');
    } else if (paymentStatus === 'To refund' || paymentStatus === 'Withdrawn') {
      options = base.filter((s) => s !== 'Cancelled');
    }

    const filtered = options.filter((s) => s !== paymentStatus);
    return { values: [paymentStatus, ...filtered] };
  };

  _refreshNsaPaymentStatusCells = (api, rowNode) => {
    if (!api || !rowNode) return;

    api.refreshCells({
      rowNodes: [rowNode],
      columns: ['paymentStatusCashPayNow', 'paymentStatusSkillsFuture', 'finalPaymentMethod'],
      force: true,
    });
  };

  _getLiveRowSnapshot = (registrationId, fallbackData = {}) => {
    if (!registrationId) return { ...(fallbackData || {}) };

    let liveData = null;
    if (this.gridApi && typeof this.gridApi.forEachNode === 'function') {
      this.gridApi.forEachNode((node) => {
        if (!liveData && String(node?.data?.id || '') === String(registrationId)) {
          liveData = { ...(node.data || {}) };
        }
      });
    }

    if (!liveData) {
      const row = (this.state.rowData || []).find(
        (item) => String(item?.id || '') === String(registrationId)
      );
      if (row) liveData = { ...row };
    }

    return { ...(fallbackData || {}), ...(liveData || {}) };
  }

  _getApprovalStatusStorageKey() {
    const email = (this.props.userEmail || 'unknown').toLowerCase();
    return `${APPROVAL_STATUS_STORAGE_KEY_PREFIX}:${email}`;
  }

  _getApprovalStatusClearMarkerKey() {
    const email = (this.props.userEmail || 'unknown').toLowerCase();
    return `${APPROVAL_STATUS_CLEAR_MARKER_PREFIX}:${email}:v2`;
  }

  _clearApprovalStatusOnce = () => {
    try {
      const markerKey = this._getApprovalStatusClearMarkerKey();
      if (localStorage.getItem(markerKey)) return;

      localStorage.removeItem(this._getApprovalStatusStorageKey());
      localStorage.setItem(markerKey, '1');
    } catch (error) {
      console.error('Failed to clear approval status list once:', error);
    }
  }

  _loadPersistedApprovalStatusList() {
    try {
      const raw = localStorage.getItem(this._getApprovalStatusStorageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to parse approval status list:', error);
      return [];
    }
  }

  _persistApprovalStatusList(list) {
    try {
      localStorage.setItem(this._getApprovalStatusStorageKey(), JSON.stringify(list || []));
    } catch (error) {
      console.error('Failed to persist approval status list:', error);
    }
  }
  
  _getApprovalQueueItemKey = (item) => {
    const event = item?.event || {};
    const row = event?.data || {};
    const rowId = row?.id || row?._id || row?.sn || '';
    const field = event?.colDef?.field || event?.colDef?.headerName || '';
    const value = String(event?.newValue ?? event?.value ?? '');
    return `${rowId}_${field}_${value}`;
  };

  _appendApprovalStatusEntries = (queue) => {
    if (!Array.isArray(queue) || queue.length === 0) return;

    const sentAt = new Date().toLocaleString();
    const newEntries = queue.map((item, index) => {
      const event = item?.event || {};
      const row = event?.data || {};
      return {
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        sn: row?.sn ?? '-',
        participantName: row?.participantInfo?.name || row?.name || '-',
        courseName: row?.courseInfo?.courseEngName || row?.course || '-',
        field: event?.colDef?.headerName || event?.colDef?.field || '-',
        oldValue: event?.oldValue ?? '(empty)',
        newValue: event?.value ?? '(empty)',
        reason: item?.reason || '-',
        status: 'Sent For Approval',
        sentAt,
      };
    });

    this.setState((prev) => ({
      approvalStatusList: [...newEntries, ...(prev.approvalStatusList || [])],
    }));
  }

  _formatApprovalStatus = (status) => {
    const normalized = String(status || 'pending').toLowerCase();
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'rejected') return 'Rejected';
    if (normalized === 'expired') return 'Expired';
    return 'Pending';
  };

  _mapApprovalStatusRows = (rows) => {
    return (rows || []).map((row, index) => ({
      id: row.id || `${row.token || 'row'}-${index}`,
      sn: row.sn || index + 1,
      participantName: row.participantName || '-',
      participantEmail: row.participantEmail || '',
      courseName: row.courseName || '-',
      courseLocation: row.courseLocation || '',
      columnName: row.columnName || '-',
      currentValue: row.currentValue ?? '',
      newValue: row.newValue ?? '',
      reason: row.reason || '',
      status: this._formatApprovalStatus(row.status),
      requestDate: row.requestDate || '',
      requestTime: row.requestTime || '',
      sentAt: row.requestDate && row.requestTime ? `${row.requestDate} ${row.requestTime}` : '-',
      batchId: row.batchId || '',
      registrationId: row.registrationId || '',
    }));
  };

  _loadPersistedApprovalQueue() {
    try {
      const raw = localStorage.getItem(this._getApprovalQueueStorageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to parse persisted approval queue:', error);
      return [];
    }
  }

  _persistApprovalQueue(queue) {
    try {
      localStorage.setItem(this._getApprovalQueueStorageKey(), JSON.stringify(queue || []));
    } catch (error) {
      console.error('Failed to persist approval queue:', error);
    }
  }

  // ── SWR cache helpers ─────────────────────────────────────────────────────

  // _getRegCacheKey() {
  //   const role   = this.props.role   || 'unknown';
  //   const siteIC = this.props.siteIC ?? null;
  //   return `${REG_DATA_CACHE_KEY_PREFIX}:${role}:${JSON.stringify(siteIC)}`;
  // }

  // _readRegCache() {
  //   try {
  //     const raw = localStorage.getItem(this._getRegCacheKey());
  //     if (!raw) return null;
  //     const { data, ts } = JSON.parse(raw);
  //     if (!Array.isArray(data) || data.length === 0) return null;
  //     if (Date.now() - ts > REG_DATA_CACHE_TTL_MS) return null;
  //     return { data, ts };
  //   } catch (_) { return null; }
  // }

  // _writeRegCache(data) {
  //   if (!Array.isArray(data) || data.length === 0) return;
  //   try {
  //     localStorage.setItem(
  //       this._getRegCacheKey(),
  //       JSON.stringify({ data, ts: Date.now() })
  //     );
  //   } catch (_) { /* quota exceeded — skip silently */ }
  // }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  // Prevent back/forward navigation on trackpad horizontal scroll
  _handleGridWheel = (event) => {
    // Check if scrolling horizontally (deltaX is non-zero for horizontal scroll)
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      // Horizontal scroll detected - prevent browser back/forward navigation
      event.preventDefault();
    }
  };

  // Prevent back/forward button clicks
  _handleMouseButton = (event) => {
    // event.button 3 = back button, 4 = forward button on mouse
    if (event.button === 3 || event.button === 4) {
      event.preventDefault();
    }
  };

  // Handle mouse movement for left/right gestures to navigate pages (velocity-based)
  _handleMouseMove = (event) => {
    const currentX = event.clientX;
    const now = Date.now();
    
    // On first mouse movement over the grid, initialize the gesture start point
    if (this.state.gestureStartX === null || this.state.gestureStartTime === null) {
      this.setState({ 
        gestureStartX: currentX,
        gestureStartTime: now,
        lastMouseMoveTime: now
      });
      return;
    }

    // Calculate distance and time since gesture start
    const distanceFromStart = this.state.gestureStartX - currentX; // Positive = moving left
    const timeElapsed = now - this.state.gestureStartTime;
    const threshold = this.state.mouseGestureThreshold; // 100px
    const minVelocity = 0.35; // pixels per millisecond (0.35 px/ms = 350 px/s) - very fast swipes only
    const maxGestureDuration = 800; // Maximum 0.8 seconds for a gesture
    const cooldownMs = 0; // No cooldown - allow rapid navigation
    
    // Calculate velocity: distance / time
    const velocity = timeElapsed > 0 ? Math.abs(distanceFromStart) / timeElapsed : 0;
    
    // Detect if the gesture has stalled (no movement for 100ms) or reversed
    const timeSinceLastMove = now - (this.state.lastMouseMoveTime || now);
    const lastDelta = (this.state.lastMouseX || currentX) - currentX;
    const isReversing = (distanceFromStart > 0 && lastDelta < 0) || (distanceFromStart < 0 && lastDelta > 0);
    
    if (timeSinceLastMove > 100 || isReversing) {
      // Reset gesture if stalled or reversed
      this.setState({ 
        gestureStartX: currentX,
        gestureStartTime: now,
        lastMouseX: currentX,
        lastMouseMoveTime: now
      });
      return;
    }

    // Check for valid fast left swipe (previous page)
    if (
      distanceFromStart > threshold && 
      velocity > minVelocity && 
      timeElapsed < maxGestureDuration &&
      (now - this.state.lastPageNavigationTime) > cooldownMs
    ) {
      this._handlePreviousPage();
      this.setState({ 
        lastPageNavigationTime: now,
        gestureStartX: currentX, // Reset after navigation
        gestureStartTime: now
      });
    } 
    // Check for valid fast right swipe (next page)
    else if (
      distanceFromStart < -threshold && 
      velocity > minVelocity && 
      timeElapsed < maxGestureDuration &&
      (now - this.state.lastPageNavigationTime) > cooldownMs
    ) {
      this._handleNextPage();
      this.setState({ 
        lastPageNavigationTime: now,
        gestureStartX: currentX, // Reset after navigation
        gestureStartTime: now
      });
    }
    
    // Always update tracking variables
    this.setState({ 
      lastMouseX: currentX,
      lastMouseMoveTime: now
    });
  };

  // Navigate to previous page using AG-Grid pagination API
  _handlePreviousPage = () => {
    if (!this.gridApi || typeof this.gridApi.paginationGetCurrentPage !== 'function') return;
    
    const currentPage = this.gridApi.paginationGetCurrentPage();
    if (currentPage > 0) {
      this.gridApi.paginationGoToPage(currentPage - 1);
      console.log('[Navigation] Mouse gesture: Previous page ' + currentPage);
    }
  };

  // Navigate to next page using AG-Grid pagination API
  _handleNextPage = () => {
    if (!this.gridApi || typeof this.gridApi.paginationGetCurrentPage !== 'function') return;
    if (!this.gridApi.paginationGetTotalPages) return;
    
    const currentPage = this.gridApi.paginationGetCurrentPage();
    const totalPages = this.gridApi.paginationGetTotalPages();
    
    if (currentPage < totalPages - 1) {
      this.gridApi.paginationGoToPage(currentPage + 1);
      console.log('[Navigation] Mouse gesture: Next page ' + (currentPage + 2));
    }
  };

  async componentDidMount() {
    // Stale-while-revalidate: show cached data immediately, then refresh in background.
    // const cached = this._readRegCache();
    // if (cached) {
    //   const { data } = cached;
    //   const inputValues  = {};
    //   const inputValues1 = {};
    //   data.forEach((item, i) => {
    //     inputValues[i]  = item.status || 'Pending';
    //     inputValues1[i] = item.official?.remarks;
    //   });
    //   this.setState(
    //     { originalData: data, registerationDetails: data, isLoading: false, inputValues, remarks: inputValues1 },
    //     () => { this.filterRegistrationDetails(); }
    //   );
    //   // Background refresh — no loading popup, no scroll-position juggling.
    //   await this.fetchAndSetRegistrationData({ background: true });
    // } else {
    //   await this.fetchAndSetRegistrationData();
    // }
    await this.fetchAndSetRegistrationData();

    // Prevent back/forward navigation when scrolling on Registration & Payment table
    // Attach wheel event to grid element to prevent trackpad horizontal scrolling from triggering back/forward
    const gridElement = this.gridRef?.current?.eGui;
    if (gridElement) {
      gridElement.addEventListener('wheel', this._handleGridWheel, { passive: false });
      gridElement.addEventListener('mousedown', this._handleMouseButton);
      console.log('✅ [RegistrationPayment] Back/forward navigation prevention enabled');
    }

    this.socket = io(NODE_BASE_URL);
    this.socket.on('registration', (eventData) => {
      if (this.props.progressModalOpen) {
        return;
      }
      if (Date.now() < this._suppressSocketRefreshUntil) {
        return;
      }
      // Pass the _id from the socket payload so the patch only fetches that one row.
      // Falls back to a full table reload when no id is present (e.g. bulk update, new insert).
      const changedId = String(eventData?.id || '').trim() || null;
      this._applySocketRowPatch(changedId);
      // this._refreshApprovalStatusList();
    });
    // Targeted event: refresh approval status list, and if modal is open push fresh data to parent
    // this.socket.on('nsa-status-update', async () => {
    //   console.log('Socket: nsa-status-update event received – refreshing approval status list');
    //   const fresh = await this._refreshApprovalStatusList();
    //   if (this._approvalStatusModalOpen) {
    //     this._publishApprovalStatusToParent(fresh);
    //   }
    // });
  }

  componentWillUnmount() {
    if (this.socket) this.socket.disconnect();
    
    // Clean up event listeners from grid element
    const gridElement = this.gridRef?.current?.eGui;
    if (gridElement) {
      gridElement.removeEventListener('wheel', this._handleGridWheel);
      gridElement.removeEventListener('mousedown', this._handleMouseButton);
      console.log('✅ [RegistrationPayment] Back/forward navigation prevention handlers removed');
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.approvalQueue !== this.state.approvalQueue) {
      this._persistApprovalQueue(this.state.approvalQueue);
    }

    if (prevState.approvalStatusList !== this.state.approvalStatusList) {
      this._persistApprovalStatusList(this.state.approvalStatusList);
    }

    if (prevState.notifierQueue !== this.state.notifierQueue && this.props.onNotifierQueueSync) {
      this.props.onNotifierQueueSync(this.state.notifierQueue);
    }

    if (prevProps.progressModalOpen && !this.props.progressModalOpen && this._pendingRefreshChild) {
      this._pendingRefreshChild = false;
      this.refreshChild({ force: true }).catch((error) => {
        console.error('Background refresh after progress tracker closed failed:', error);
      });
    }

    const {
      selectedLocation, selectedCourseType, searchQuery,
      selectedCourseName, selectedQuarter, selectedRegistrationStatus,
    } = this.props;

    const changed =
      selectedLocation   !== prevProps.selectedLocation   ||
      selectedCourseType !== prevProps.selectedCourseType ||
      selectedCourseName !== prevProps.selectedCourseName ||
      selectedQuarter    !== prevProps.selectedQuarter    ||
      selectedRegistrationStatus !== prevProps.selectedRegistrationStatus ||
      searchQuery        !== prevProps.searchQuery;

    if (!changed) return;

    // All filter/search changes are applied client-side against the already-loaded
    // originalData — no backend re-fetch needed. This makes filter switching instant.
    this.filterRegistrationDetails();
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  fetchCourseRegistrations = async (language) => {
    // Large enough to fetch all records in a single request.
    const PAGE_SIZE = 9999;
    try {
      const { siteIC, role } = this.props;

      // Fetch first page + total count in one request
      const firstResp = await fetchCourseRegistrationsBatch(siteIC, role, 0, PAGE_SIZE);
      const total = firstResp.data?.total ?? 0;
      const firstBatch = Array.isArray(firstResp.data?.result) ? firstResp.data.result : [];

      let allRaw = firstBatch;

      // Fire remaining pages in parallel if there are more records
      if (total > PAGE_SIZE) {
        const remainingSkips = [];
        for (let s = PAGE_SIZE; s < total; s += PAGE_SIZE) {
          remainingSkips.push(s);
        }
        const remainingBatches = await Promise.all(
          remainingSkips.map((skip) =>
            fetchCourseRegistrationsBatch(siteIC, role, skip, PAGE_SIZE)
              .then((r) => (Array.isArray(r.data?.result) ? r.data.result : []))
              .catch(() => [])
          )
        );
        allRaw = [...firstBatch, ...remainingBatches.flat()];
      }

      const normalized = allRaw.map((item) => {
        const id = item?._id?.$oid || item?._id?._id || (typeof item?._id === 'string' ? item._id : '') || item?.id || '';
        return { ...item, id };
      });
      return languageDatabase(normalized, language);
    } catch (error) {
      console.error('Error fetching course registrations:', error.response?.data || error.message);
      return null; // null signals a fetch failure (distinct from a genuine empty result [])
    }
  };

  _syncFilterDropdownOptions = (sourceData = this.state.originalData || []) => {
    const {
      selectedLocation,
      selectedCourseType,
      selectedQuarter,
    } = this.props;

    const base = this._filterByRoleCourseAccess(sourceData || []);
    const types = getAllTypes(base);
    const byType = this._filterByCourseType(base, selectedCourseType);
    const locations = getAllLocations(byType);
    const byLoc = this._filterByLocation(byType, selectedLocation);
    const quarters = getAllQuarters(byLoc);
    const byQtr = this._filterByQuarter(byLoc, selectedQuarter);
    const names = getAllNames(byQtr);
    const statuses = getAllRegistrationStatuses(byQtr);

    this.props.passDataToParent(locations, types, names, quarters, statuses);
  };

  _matchesSearchQuery = (registration, normalizedQuery) => {
    if (!normalizedQuery) return true;

    const fields = [
      registration?.participant?.name,
      registration?.participant?.nric,
      registration?.participant?.contactNumber,
      registration?.participant?.email,
      registration?.course?.courseLocation,
      registration?.course?.courseType,
      registration?.course?.courseEngName,
      registration?.course?.courseChiName,
      registration?.course?.courseDuration,
      registration?.course?.payment,
      registration?.status,
      registration?.official?.receiptNo,
      registration?.spouse?.name,
      registration?.marriageDetails?.maritalStatus,
      registration?.marriageDetails?.marriageDuration,
      registration?.marriageDetails?.housingType,
      registration?.marriageDetails?.typeOfMarriage,
      registration?.spouse?.nric,
      registration?.spouse?.mobile,
      registration?.spouse?.email,
      registration?.marriageDetails?.grossMonthlyIncome,
      registration?.marriageDetails?.hasChildren,
      registration?.marriageDetails?.howFoundOut,
      registration?.marriageDetails?.sourceOfReferral,
    ];

    return fields.some((value) =>
      String(value || '').toLowerCase().includes(normalizedQuery)
    );
  };

  _getFilteredRawData = (sourceData = this.state.originalData || []) => {
    const {
      section,
      selectedLocation,
      selectedCourseType,
      selectedCourseName,
      searchQuery,
      selectedQuarter,
      selectedRegistrationStatus,
    } = this.props;

    if (section && section !== 'registration') return [];

    const normalizedQuery = (searchQuery || '').toLowerCase().trim();
    let filtered = this._filterByRoleCourseAccess([...(sourceData || [])]);

    if (selectedLocation && selectedLocation !== 'All Locations') {
      filtered = filtered.filter((item) => item.course?.courseLocation === selectedLocation);
    }
    if (selectedCourseType && selectedCourseType !== 'All Courses Types') {
      const expected = String(selectedCourseType || '').toLowerCase().trim();
      filtered = filtered.filter(
        (item) => String(item.course?.courseType || '').toLowerCase().trim() === expected
      );
    }
    if (selectedCourseName && selectedCourseName !== 'All Courses Name') {
      filtered = filtered.filter((item) => item.course?.courseEngName === selectedCourseName);
    }
    if (selectedQuarter && selectedQuarter !== 'All Quarters') {
      filtered = filtered.filter(
        (item) => getQuarterFromDuration(item.course?.courseDuration) === selectedQuarter
      );
    }
    if (selectedRegistrationStatus && selectedRegistrationStatus !== 'All Statuses') {
      filtered = filtered.filter((item) => {
        const status = item.registrationStatus || item.official?.registration_status;
        return status === selectedRegistrationStatus;
      });
    }
    if (normalizedQuery) {
      filtered = filtered.filter((item) => this._matchesSearchQuery(item, normalizedQuery));
    }

    return filtered;
  };

  _applySocketRowPatch = async (registrationId = null) => {
    // ── Targeted single-row refresh ───────────────────────────────────────────
    // When the socket event carries a specific _id, fetch only that document and
    // update only that row in the grid. This avoids reloading the entire table
    // and preserves any other locally-held state.
    if (registrationId) {
      try {
        const resp = await fetchRegistrationById(registrationId);
        const rawDoc = resp?.data?.result;
        if (!rawDoc) return;

        // Normalise id the same way fetchCourseRegistrations does
        const id =
          rawDoc?._id?.$oid ||
          rawDoc?._id?._id ||
          (typeof rawDoc?._id === 'string' ? rawDoc._id : '') ||
          rawDoc?.id ||
          '';
        if (!id) return;

        const normalizedDoc = { ...rawDoc, id };

        this.setState((prev) => {
          const idx = (prev.rowData || []).findIndex((r) => String(r?.id || '') === id);
          if (idx === -1) return null; // Row not in current filtered view — skip

          const prevRow = prev.rowData[idx];
          const incomingRow = mapRegistrationToRowData(normalizedDoc, idx);

          if (JSON.stringify(prevRow) === JSON.stringify(incomingRow)) return null; // No-op

          const updatedRowData = [...prev.rowData];
          updatedRowData[idx] = { ...prevRow, ...incomingRow };
          return { rowData: updatedRowData };
        }, () => {
          if (this.gridApi && typeof this.gridApi.forEachNode === 'function') {
            this.gridApi.forEachNode((node) => {
              if (String(node?.data?.id || '') === id) {
                this.gridApi.refreshCells({ rowNodes: [node], force: true });
              }
            });
          }
        });
      } catch (error) {
        console.error('Error applying targeted socket row patch:', error);
      }
      return;
    }

    // ── Full table reload (no specific id: bulk update, new insert, etc.) ─────
    const { language } = this.props;

    const selectedIds = (this.state.selectedRows || [])
      .map((row) => String(row?.id || ''))
      .filter(Boolean);

    const expandedRowId =
      this.state.expandedRowIndex !== null
        ? String(this.state.rowData?.[this.state.expandedRowIndex]?.id || '')
        : '';

    let anchorRowId = '';
    if (this.gridApi && typeof this.gridApi.getFirstDisplayedRow === 'function') {
      const firstDisplayedRow = this.gridApi.getFirstDisplayedRow();
      if (typeof firstDisplayedRow === 'number' && firstDisplayedRow >= 0) {
        anchorRowId = String(this.gridApi.getDisplayedRowAtIndex(firstDisplayedRow)?.data?.id || '');
      }
    }

    try {
      const raw = await this.fetchCourseRegistrations(language);

      if (raw === null) {
        // Fetch failed — preserve the existing table data rather than wiping it
        return;
      }

      const unique = new Map();
      (raw || []).forEach((item) => {
        const id = String(item?.id || '').trim();
        if (id) unique.set(id, item);
      });

      const data = this._filterByRoleCourseAccess(Array.from(unique.values()));
      const filtered = this._getFilteredRawData(data);
      const incomingRows = filtered.map((item, index) => mapRegistrationToRowData(item, index));

      this._syncFilterDropdownOptions(data);
      await this.props.getTotalNumberofDetails(data.length);

      this.setState((prev) => {
        const prevMap = new Map(
          (prev.rowData || []).map((row) => [String(row?.id || ''), row])
        );

        const mergedRows = incomingRows.map((incomingRow) => {
          const rowId = String(incomingRow?.id || '');
          const prevRow = prevMap.get(rowId);
          if (!prevRow) return incomingRow;

          // Keep object identity for unchanged rows so AG-Grid minimizes viewport movement.
          if (JSON.stringify(prevRow) === JSON.stringify(incomingRow)) {
            return prevRow;
          }

          return { ...prevRow, ...incomingRow };
        });

        return {
          originalData: data,
          registerationDetails: filtered,
          rowData: mergedRows,
          columnDefs: this.getColumnDefs(mergedRows),
        };
      }, () => {
        if (this.gridApi && typeof this.gridApi.forEachNode === 'function') {
          this.gridApi.forEachNode((node) => {
            const rowId = String(node?.data?.id || '');
            if (rowId && selectedIds.includes(rowId)) {
              node.setSelected(true);
            }
          });

          if (expandedRowId) {
            let nextExpandedIndex = null;
            this.gridApi.forEachNode((node) => {
              if (nextExpandedIndex === null && String(node?.data?.id || '') === expandedRowId) {
                nextExpandedIndex = node.rowIndex;
              }
            });
            this.setState({ expandedRowIndex: nextExpandedIndex });
          }

          if (anchorRowId) {
            let anchorIndex = null;
            this.gridApi.forEachNode((node) => {
              if (anchorIndex === null && String(node?.data?.id || '') === anchorRowId) {
                anchorIndex = node.rowIndex;
              }
            });

            if (typeof anchorIndex === 'number') {
              this.gridApi.ensureIndexVisible(anchorIndex, 'top');
            }
          }

          this.gridApi.refreshCells();
        }
      });
      // Re-run anomaly detection silently so the button badge and open modal stay current.
      this.anomalitiesAlert(data, { autoOpen: false });
    } catch (error) {
      console.error('Error applying socket row patch:', error);
    }
  };

  async fetchAndSetRegistrationData() {
    if (this._isFetchingRegistrationData) return;
    this._isFetchingRegistrationData = true;
    if (typeof this.props.openLoadingPopup === 'function') {
      this.props.openLoadingPopup();
    }
    try {
    const gridContainer = document.querySelector('.ag-body-viewport');
    const savedScrollTop = gridContainer ? gridContainer.scrollTop : 0;
    const selectedIds = (this.state.selectedRows || [])
      .map((row) => String(row?.id || ''))
      .filter(Boolean);
    const expandedRowId =
      this.state.expandedRowIndex !== null
        ? String(this.state.rowData?.[this.state.expandedRowIndex]?.id || '')
        : '';

    let anchorRowId = '';
    let focusedRowId = '';
    let focusedRowIndex = null;

    if (this.gridApi && typeof this.gridApi.getFirstDisplayedRow === 'function') {
      const firstDisplayedRow = this.gridApi.getFirstDisplayedRow();
      if (typeof firstDisplayedRow === 'number' && firstDisplayedRow >= 0) {
        const firstNode = this.gridApi.getDisplayedRowAtIndex(firstDisplayedRow);
        anchorRowId = String(firstNode?.data?.id || '');
      }
    }

    if (this.gridApi && typeof this.gridApi.getFocusedCell === 'function') {
      const focusedCell = this.gridApi.getFocusedCell();
      if (focusedCell && typeof focusedCell.rowIndex === 'number') {
        focusedRowIndex = focusedCell.rowIndex;
        const focusedNode = this.gridApi.getDisplayedRowAtIndex(focusedCell.rowIndex);
        focusedRowId = String(focusedNode?.data?.id || '');
      }
    }

    const savedPage =
      this.gridApi && typeof this.gridApi.paginationGetCurrentPage === 'function'
        ? this.gridApi.paginationGetCurrentPage()
        : 0;

    const { language } = this.props;
    const raw = await this.fetchCourseRegistrations(language);

    // De-duplicate by _id
    const unique = new Map();
    (raw || []).forEach((item) => {
      const id = item?._id?._id || item?._id || item?.id;
      if (id) unique.set(id, item);
    });
    const data = this._filterByRoleCourseAccess(Array.from(unique.values()));

    // Persist to localStorage so the next mount can show this data instantly.
    // this._writeRegCache(data);

    // Build filter dropdown options
    const types     = getAllTypes(data);
    const byType    = this._filterByCourseType(data, this.props.selectedCourseType);
    const locations = getAllLocations(byType);
    const byLoc     = this._filterByLocation(byType, this.props.selectedLocation);
    const byQtr     = this._filterByQuarter(byLoc, this.props.selectedQuarter);
    const names     = getAllNames(byQtr);
    const quarters  = getAllQuarters(byLoc);

    this.props.passDataToParent(locations, types, names, quarters);
    await this.props.getTotalNumberofDetails(data.length);

    // Build initial input maps
    const inputValues  = {};
    const inputValues1 = {};
    data.forEach((item, i) => {
      inputValues[i]  = item.status || 'Pending';
      inputValues1[i] = item.official.remarks;
    });

    this.setState(
      {
        originalData: data,
        registerationDetails: data,
        isLoading: false,
        inputValues,
        remarks: inputValues1,
        locations,
        names,
      },
      async () => {
        this.filterRegistrationDetails();

        requestAnimationFrame(() => {
          if (this.gridApi && typeof this.gridApi.paginationGoToPage === 'function') {
            try { this.gridApi.paginationGoToPage(savedPage); } catch (_) {}
          }

          if (this.gridApi && typeof this.gridApi.forEachNode === 'function') {
            this.gridApi.forEachNode((node) => {
              const rowId = String(node?.data?.id || '');
              if (rowId && selectedIds.includes(rowId)) {
                node.setSelected(true);
              }
            });

            if (expandedRowId) {
              let nextExpandedIndex = null;
              this.gridApi.forEachNode((node) => {
                if (nextExpandedIndex === null && String(node?.data?.id || '') === expandedRowId) {
                  nextExpandedIndex = node.rowIndex;
                }
              });
              this.setState({ expandedRowIndex: nextExpandedIndex });
            }

            let targetIndex = null;

            if (focusedRowId) {
              this.gridApi.forEachNode((node) => {
                if (targetIndex === null && String(node?.data?.id || '') === focusedRowId) {
                  targetIndex = node.rowIndex;
                }
              });
            }

            if (targetIndex === null && anchorRowId) {
              this.gridApi.forEachNode((node) => {
                if (targetIndex === null && String(node?.data?.id || '') === anchorRowId) {
                  targetIndex = node.rowIndex;
                }
              });
            }

            if (typeof targetIndex === 'number') {
              this.gridApi.ensureIndexVisible(targetIndex, 'top');
            } else if (typeof focusedRowIndex === 'number') {
              this.gridApi.ensureIndexVisible(focusedRowIndex, 'top');
            } else if (gridContainer) {
              gridContainer.scrollTop = savedScrollTop;
            }
          } else if (gridContainer) {
            gridContainer.scrollTop = savedScrollTop;
          }
        });

        if (!this.state.isAlertShown) {
          const runAnomalyCheck = async () => {
            // Avoid blocking first table paint with an O(n^2) scan.
            await this.anomalitiesAlert(data);
            this.setState({ isAlertShown: true });
          };

          if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => {
              runAnomalyCheck().catch((error) => {
                console.error('Anomaly check failed:', error);
              });
            }, { timeout: 1200 });
          } else {
            setTimeout(() => {
              runAnomalyCheck().catch((error) => {
                console.error('Anomaly check failed:', error);
              });
            }, 0);
          }
        }
        this.props.closePopup();
      }
    );
    } finally {
      this._isFetchingRegistrationData = false;
    }
  }

  // ── Filter helpers (pure, no setState) ────────────────────────────────────

  _normalizeCourseType(type) {
    return (type || '').toString().trim().toLowerCase();
  }

  _getAllowedCourseTypesForRole(role) {
    const normalizedRole = (role || '').toString().trim().toLowerCase();
    const normalizedEmail = (this.props.userEmail || '').toString().trim().toLowerCase();
    const normalizedUserName = (this.props.userName || '').toString().trim().toLowerCase();
    const isTestingAAccount =
      normalizedEmail === 'testinga@ecss.org.sg' ||
      normalizedEmail === 'testingb@ecss.org.sg' ||
      normalizedUserName === 'testing a' ||
      normalizedUserName === 'testinga' ||
      normalizedUserName === 'testing b' ||
      normalizedUserName === 'testingb';
    const isNsaInChargeRole = normalizedRole.includes('nsa');

    // Explicit business rule: Testing A/Testing B with NSA in-charge role can only see NSA course type.
    if (isTestingAAccount && isNsaInChargeRole) {
      return new Set(['nsa']);
    }

    if (!normalizedRole) return null;
    if (
      normalizedRole === 'admin' ||
      normalizedRole === 'sub admin' ||
      normalizedRole === 'subadmin' ||
      normalizedRole === 'social worker'
    ) {
      return null;
    }

    if (normalizedRole.includes('nsa')) {
      return new Set(['nsa']);
    }
    if (normalizedRole.includes('marriage')) {
      return new Set(['marriage preparation programme']);
    }
    if (normalizedRole.includes('ilp')) {
      return new Set(['ilp']);
    }
    if (normalizedRole.includes('talk') || normalizedRole.includes('seminar')) {
      return new Set(['talks and seminar']);
    }
    if (normalizedRole.includes('other')) {
      return new Set(['others']);
    }

    return null;
  }

  _filterByRoleCourseAccess(data, role = this.props.role) {
    const allowedTypes = this._getAllowedCourseTypesForRole(role);
    if (!allowedTypes) return Array.isArray(data) ? data : [];

    return (data || []).filter((item) =>
      allowedTypes.has(this._normalizeCourseType(item?.course?.courseType))
    );
  }

  _filterByCourseType(data, courseType) {
    if (!courseType || courseType === 'All Courses Types') return data;
    const expected = (courseType || '').toString().trim().toLowerCase();
    return data.filter(
      (item) => (item.course?.courseType || '').toString().trim().toLowerCase() === expected
    );
  }

  _filterByLocation(data, location) {
    if (!location || location === 'All Locations') return data;
    return data.filter((item) => item.course?.courseLocation === location);
  }

  _filterByQuarter(data, quarter) {
    if (!quarter || quarter === 'All Quarters') return data;
    return data.filter(
      (item) => getQuarterFromDuration(item.course?.courseDuration) === quarter
    );
  }

  // ── Anomaly detection ─────────────────────────────────────────────────────

  getAnomalyRowStyles = (data) => {
    const styles = {};
    for (let i = 0; i < data.length; i++) {
      const { participantInfo: { name }, courseInfo: { courseEngName, courseLocation } } = data[i];
      for (let j = 0; j < i; j++) {
        const prev = data[j];
        if (prev.participantInfo.name !== name || prev.courseInfo.courseEngName !== courseEngName) continue;
        const color = prev.courseInfo.courseLocation !== courseLocation ? '#FFDDC1' : '#87CEEB';
        styles[i] = { backgroundColor: color };
        styles[j] = { backgroundColor: color };
      }
    }
    return styles;
  };

  anomalitiesAlert = (data, { autoOpen = true } = {}) => {
    const anomalies = [];
    for (let i = 0; i < data.length; i++) {
      const { participant: { name }, course: { courseEngName, courseLocation } } = data[i];
      for (let j = 0; j < i; j++) {
        const prev = data[j];
        if (prev.participant.name !== name || prev.course.courseEngName !== courseEngName) continue;
        anomalies.push({
          name,
          course: courseEngName,
          locations: `${prev.course.courseLocation} (index: ${j + 1}) and ${courseLocation} (index: ${i + 1})`,
          type:
            prev.course.courseLocation !== courseLocation
              ? 'Person registered same course in different locations'
              : 'Person registered same course in same location',
        });
      }
    }

    if (anomalies.length === 0) {
      this.setState({ anomalyList: [] });
      if (typeof this.props.onAnomalyListChanged === 'function') {
        this.props.onAnomalyListChanged([]);
      }
      return;
    }

    const seen = new Set();
    const unique = anomalies.filter((a) => {
      const key = `${a.name}-${a.course}-${a.locations}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Always update local state and notify parent of the latest list
    this.setState({ anomalyList: unique });
    if (typeof this.props.onAnomalyListChanged === 'function') {
      this.props.onAnomalyListChanged(unique);
    }

    // Auto-open the modal only on first detection (not on silent live refreshes)
    if (autoOpen && typeof this.props.onAnomalyDetected === 'function') {
      this.props.onAnomalyDetected(unique);
    }
  };

  // ── Row data helpers ──────────────────────────────────────────────────────

  updateRowData = (paginatedDetails) => {
    this.setState({ registerationDetails: paginatedDetails });
  };

  getRowData = (registrations) => {
    const rowData = registrations.map((item, index) => mapRegistrationToRowData(item, index));

    const marriagePrepCount = rowData.filter(
      (r) => r.courseInfo?.courseType === 'Marriage Preparation Programme'
    ).length;
    if (marriagePrepCount > 0) {
      console.log('Marriage Preparation Programme registrations found:', marriagePrepCount);
    }

    this.setState({ rowData, columnDefs: this.getColumnDefs(rowData) }, () => {
      this.debugMarriagePrepData();
    });
  };

  getPaginatedDetails() {
    const { registerationDetails } = this.state;
    const { currentPage, entriesPerPage } = this.props;
    const last  = currentPage * entriesPerPage;
    const first = last - entriesPerPage;
    return registerationDetails.slice(first, last);
  }

  // ── WooCommerce stock update ───────────────────────────────────────────────

  updateWooCommerceForRegistrationPayment = (chi, eng, location, updatedStatus) =>
    updateWooCommerceFn(chi, eng, location, updatedStatus);

  // ── Receipt / Invoice generation ─────────────────────────────────────────

  generateReceiptNumber = (course, newMethod, courseType, courseEngName, courseDuration) =>
    fetchReceiptNumber(course, courseType, courseEngName, courseDuration);

  generatePDFReceipt = (id, participant, course, receiptNo, status) =>
    generatePDFReceipt(id, participant, course, this.props.userName, receiptNo, status);

  generatePDFInvoice = (id, participant, course, receiptNo, status) =>
    generatePDFInvoice(id, participant, course, this.props.userName, receiptNo, status);

  createReceiptInDatabase = (receiptNo, location, registration_id, url) =>
    saveReceiptToDatabase(receiptNo, location, registration_id, url, this.props.userName);

  receiptShown = (participant, course, receiptNo, officialInfo) =>
    showReceipt(participant, course, receiptNo, officialInfo, this.props.userName, {
      progressTracker: this.props.progressTracker,
      showUpdatePopup: this.props.showUpdatePopup,
      closePopup: this.props.closePopup,
    });

  receiptGenerator = (id, participant, course, official, value, progressTracker = null) =>
    receiptGeneratorFn(id, participant, course, official, value, this.props.userName, progressTracker);

  autoReceiptGenerator = (id, participant, course, official, newMethod, value, progressTracker = null) =>
    autoReceiptGeneratorFn(id, participant, course, official, newMethod, value, this.props.userName, progressTracker);

  // ── Export helpers ────────────────────────────────────────────────────────

  exportToLOP = () => exportToLOPFn({
    selectedRows: this.state.selectedRows,
    userName: this.props.userName,
    userEmail: this.props.userEmail,
    warningPopUpMessage: this.props.warningPopUpMessage,
    onPendingExportApproval: this.props.onPendingExportApproval,
    onSupervisorExportConfirm: this.props.onSupervisorExportConfirm,
  });

  exportToMarriagePreparationProgramme = () => exportToMarriagePrepFn({
    selectedRows: this.state.selectedRows,
    userName: this.props.userName,
    warningPopUpMessage: this.props.warningPopUpMessage,
  });

  exportAttendance = () => exportAttendanceFn({
    selectedRows: this.state.selectedRows,
    userName: this.props.userName,
    userEmail: this.props.userEmail,
    warningPopUpMessage: this.props.warningPopUpMessage,
    onPendingExportApproval: this.props.onPendingExportApproval,
    onSupervisorExportConfirm: this.props.onSupervisorExportConfirm,
  });

  archiveData = () => archiveDataFn({
    registerationDetails: this.state.registerationDetails,
    selectedCourseType: this.props.selectedCourseType,
    userName: this.props.userName,
    closePopup: this.props.closePopup,
  });

  // ── NSA In-Charge styling check ─────────────────────────────────────────
  
  _shouldApplyNsaInChargeStyling() {
    // Always apply dark pink styling to visually differentiate editable columns for all users
    // This provides a consistent visual indicator that these columns are editable by NSA in-charge and Site in-charge roles
    return true;
  }

  // ── AG-Grid column definitions ────────────────────────────────────────────

  getColumnDefs = (optionalRowData = null) => {
    const { role, siteIC, selectedCourseType, userEmail } = this.props;
    const isReadOnly          = isReadOnlyUser(userEmail);
    const canEdit             = true;
    
    // Social Worker can edit Registration Status and Remarks for non-NSA courses
    const canSocialWorkerEdit = (params) => {
      const isSocialWorker = this._isFitnessOrSocialWorkerRole();
      if (!isSocialWorker) return false;
      // Social workers can edit Registration Status and Remarks (other columns return false)
      return true;
    };
    
    // Site In-Charge at PRW can edit only: Registration Status, Remarks for non-NSA courses
    // For NSA courses, they can only edit the 4 allowed columns (via NSA-specific methods)
    const canSiteInChargeEdit = (params) => {
      // For non-NSA courses: Site In-Charge at any location can edit Registration Status and Remarks
      // but at PRW they have restrictions applied via NSA-specific methods
      const isSiteInCharge = this._isSiteInChargeRole();
      if (!isSiteInCharge) return false;
      // Site in-charge can edit Registration Status and Remarks (other columns return false)
      return true;
    };

    const isFilteringILP           = selectedCourseType === 'ILP';
    const isFilteringTalksAndSeminar = selectedCourseType === 'Talks And Seminar';
    const isFilteringOthers        = selectedCourseType === 'Others';
    const shouldHidePaymentColumns = isFilteringILP || isFilteringTalksAndSeminar || isFilteringOthers;

    const dataToCheck = optionalRowData || this.state.rowData;

    // Determine the Payment Status header label based on filter
    const paymentStatusHeader = (() => {
      if (selectedCourseType === 'NSA' || selectedCourseType === 'Marriage Preparation Programme') {
        return 'Payment Status';
      }
      if (isFilteringILP || isFilteringTalksAndSeminar || isFilteringOthers) {
        return 'Registration Status';
      }
      return 'Registration and Payment Status';
    })();

    const paymentMethodDisplayHeader = selectedCourseType === 'NSA'
      ? 'Payment Method (indicated by participant)'
      : 'Payment Method';

    // Helper function to create centered cell style
    const centeredCellStyle = { textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' };

    const columnDefs = [
      {
        headerName: 'S/N',
        field: 'sn',
        width: 100,
        pinned: 'left',
        cellRenderer: SNRenderer,
        cellStyle: centeredCellStyle,
      },
      {
        headerName: 'Name',
        field: 'name',
        width: 300,
        editable: false,
        pinned: 'left',
        cellStyle: centeredCellStyle,
      },
      {
        headerName: 'Contact Number',
        field: 'contactNo',
        width: 250,
        editable: false,
        pinned: 'left',
        cellStyle: centeredCellStyle,
      },
      {
        headerName: 'Course Name',
        field: 'course',
        width: 900,
        editable: false,
        cellStyle: centeredCellStyle,
      },
      {
        headerName: 'Course Mode',
        field: 'courseMode',
        width: 200,
        editable: false,
        cellStyle: centeredCellStyle,
      },
      {
        headerName: 'Course Duration',
        field: 'courseDuration',
        width: 500,
        editable: false,
        cellRenderer: (params) =>
          params.value || params.data?.courseInfo?.courseDuration || '',
        cellStyle: centeredCellStyle,
      },
      {
        headerName: 'Course Time',
        field: 'courseTime',
        width: 500,
        editable: false,
        cellStyle: centeredCellStyle,
      },
      {
        headerName: 'Payment Method (indicated by participant)',
        field: 'paymentMethod',
        cellRenderer: PaymentMethodRenderer,
        editable: (params) => {
          const courseType = String(params.data?.courseInfo?.courseType || params.data?.courseType || '').trim();
          
          // Only editable for NSA courses
          if (courseType !== 'NSA') {
            return false;
          }
          
          // CRITICAL: Check BOTH finalPaymentMethod and paymentMethod as sources of truth
          // finalPaymentMethod represents the latest/approved payment method
          // paymentMethod represents the participant's current choice
          // Use whichever is set (priority: finalPaymentMethod first, then paymentMethod)
          const finalPaymentMethod = String(params.data?.finalPaymentMethod || '').trim();
          const paymentMethod = String(params.data?.paymentMethod || params.data?.course?.payment || '').trim();
          const activePaymentMethod = finalPaymentMethod || paymentMethod;
          
          const paymentStatus = String(params.data?.status || params.data?.paymentStatus || '').trim();
          
          // Lock if payment status is 'Paid' for Cash/PayNow (check both fields)
          const isCashPayNowPaid = (activePaymentMethod === 'Cash' || activePaymentMethod === 'PayNow') && paymentStatus === 'Paid';
          
          if (isCashPayNowPaid) {
            console.log('💳 [Payment Method Indicated Editable] Locked: Payment Method is Cash/PayNow and status is Paid - cannot change payment method');
            return false;
          }
          
          // Check role permission
          const canEditByRole = this._canEditPaymentMethodIndicatedByParticipant(params.data);
          
          // Lock if any payment/refund date/time fields have values
          const hasPaymentDate = !!(params.data?.paymentDate && String(params.data.paymentDate).trim() !== '');
          const hasPaymentTime = !!(params.data?.paymentTime && String(params.data.paymentTime).trim() !== '');
          const hasRefundedDate = !!(params.data?.refundedDate && String(params.data.refundedDate).trim() !== '');
          const hasRefundedTime = !!(params.data?.refundedTime && String(params.data.refundedTime).trim() !== '');
          const isLockedByPaymentData = hasPaymentDate || hasPaymentTime || hasRefundedDate || hasRefundedTime;
          
          const canEdit = canEditByRole && !isLockedByPaymentData;
          console.log('💳 [Payment Method Indicated Editable] Role Can Edit:', canEditByRole, '| Locked by Payment Data:', isLockedByPaymentData, '| Final Payment Method:', finalPaymentMethod, '| Payment Method:', paymentMethod, '| Active Method:', activePaymentMethod, '| Status:', paymentStatus, '| Can Edit:', canEdit, '| Row:', params.data?.name);
          
          return canEdit;
        },
        width: 700,
        hide: false,
        cellStyle: centeredCellStyle,
      },
      {
        headerName: 'Registration Status',
        field: 'registrationStatus',
        width: 750,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: (params) => {
          const courseType = String(params.data?.courseInfo?.courseType || params.data?.courseType || '').trim();
          if (courseType === 'NSA') {
            return { values: ['Submitted', 'Confirmed Slot', 'Cancelled', 'Withdrawn', 'Waiting List'] };
          }
          return { values: ['Pending', 'Confirmed', 'Withdrawn', 'Waiting List'] };
        },
        editable: (params) => {
          const courseType = String(params.data?.courseInfo?.courseType || params.data?.courseType || '').trim();
          const canEditNsaStatus = courseType === 'NSA' ? this._canEditNsaRegistrationStatus() : (canEdit || canSocialWorkerEdit(params) || canSiteInChargeEdit(params));
          console.log('📋 [Registration Status Column] CourseType:', courseType, '| Can Edit:', canEditNsaStatus, '| Row:', params.data?.name);
          if (courseType === 'NSA') return canEditNsaStatus;
          return canEdit || canSocialWorkerEdit(params) || canSiteInChargeEdit(params);
        },
        singleClickEdit: true,
        valueGetter: (params) => params.data?.registrationStatus || '',
        valueSetter: (params) => {
          if (params.newValue && params.newValue !== params.oldValue) {
            params.data.registrationStatus = params.newValue;
            return true;
          }
          return false;
        },
        cellRenderer: RegistrationStatusRenderer,
        cellStyle: centeredCellStyle,
        hide: false,
      },
      {
        headerName: 'Final Payment Method (by Finance)',
        field: 'finalPaymentMethod',
        width: 700,
        cellRenderer: FinalPaymentMethodRenderer,
        editable: false,
        cellStyle: centeredCellStyle,
        valueGetter: (params) => {
          const finalPaymentMethod = params.data?.finalPaymentMethod;
          if (typeof finalPaymentMethod === 'string' && finalPaymentMethod.trim() !== '') {
            return finalPaymentMethod;
          }
          return params.data?.paymentMethod || '';
        },
        hide: false,
      },
      {
        headerName: 'Confirmation Status',
        field: 'confirmed',
        cellRenderer: SlideButtonRenderer,
        editable: (params) => {
          const courseType = String(params.data?.courseInfo?.courseType || params.data?.courseType || '').trim();
          if (courseType === 'NSA') {
            const canEdit = this._canEditNsaConfirmationStatus();
            console.log('📋 [Confirmation Status Editable] CourseType:', courseType, '| Can Edit:', canEdit, '| Row:', params.data?.name);
            return canEdit;
          }
          return false;
        },
        width: 300,
        cellStyle: centeredCellStyle,
        hide: false,
      },
      ...(selectedCourseType === 'NSA'
        ? [
          {
            headerName: 'Payment Status (SkillsFuture)',
            colId: 'paymentStatusSkillsFuture',
            field: 'paymentStatus',
            cellRenderer: PaymentStatusRenderer,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: (params) => ({
              values: this._getNsaPaymentStatusEditorValues(params).values,
            }),
            editable: (params) => {
              const roleCanEdit = this._canEditNsaSkillsFuturePaymentStatus();
              const isActive = this._isActiveNsaPaymentStatusColumn('Payment Status (SkillsFuture)', params.data);
              const canEdit = roleCanEdit && isActive;
              console.log('💳 [Payment Status SkillsFuture Editable] Role Can Edit:', roleCanEdit, '| Is Active Column:', isActive, '| Can Edit:', canEdit, '| Row:', params.data?.name);
              return canEdit;
            },
            valueGetter: (params) => this._getNsaPaymentStatusDisplayValue('Payment Status (SkillsFuture)', params.data),
            valueSetter: (params) => {
              if (params.newValue && params.newValue !== params.oldValue) {
                params.data.paymentStatus = params.newValue;
                return true;
              }
              return false;
            },
            width: 750,
            cellStyle: { ...centeredCellStyle, fontSize: '15px' },
            hide: false,
          },
                    {
            headerName: 'Payment Status (Cash/PayNow)',
            colId: 'paymentStatusCashPayNow',
            field: 'paymentStatus',
            cellRenderer: PaymentStatusRenderer,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: (params) => ({
              values: this._getNsaPaymentStatusEditorValues(params).values,
            }),
            editable: (params) => {
              return this._canEditNsaCashPayNowPaymentStatus() && this._isActiveNsaPaymentStatusColumn('Payment Status (Cash/PayNow)', params.data);
            },
            valueGetter: (params) => this._getNsaPaymentStatusDisplayValue('Payment Status (Cash/PayNow)', params.data),
            valueSetter: (params) => {
              if (params.newValue && params.newValue !== params.oldValue) {
                params.data.paymentStatus = params.newValue;
                return true;
              }
              return false;
            },
            width: 750,
            cellStyle: { ...centeredCellStyle, fontSize: '15px' },
            hide: false,
          }
        ]
        : []),
      {
        headerName: 'Receipt/Invoice Number',
        field: 'recinvNo',
        width: 600,
        cellStyle: centeredCellStyle,
        valueGetter: (params) => {
          // Check both top-level and nested locations
          const topLevel = params.data?.recinvNo;
          const nested = params.data?.official?.receiptNo;
          return topLevel || nested || '';
        },
        hide: false,
      },
      {
        headerName: 'Payment Date',
        field: 'paymentDate',
        width: 350,
        editable: (params) => {
          const courseType = String(params.data?.courseInfo?.courseType || params.data?.courseType || '').trim();
          if (courseType === 'NSA') return this._canEditNsaPaymentDate();
          return canEdit || canSocialWorkerEdit(params) || canSiteInChargeEdit(params);
        },
        cellRenderer: DateTimeFieldRenderer,
        cellStyle: centeredCellStyle,
        valueGetter: (params) => {
          // Only show payment date/time when:
          // 1. SkillsFuture payment method AND status is 'SkillsFuture Done'
          // 2. Cash/PayNow payment method AND status is 'Paid'
          const paymentMethod = String(params.data?.finalPaymentMethod || '').trim();
          const paymentStatus = String(params.data?.status || params.data?.paymentStatus || '').trim();
          
          const isSkillsFutureDone = paymentMethod === 'SkillsFuture' && paymentStatus === 'SkillsFuture Done';
          const isCashPayNowPaid = (paymentMethod === 'Cash' || paymentMethod === 'PayNow') && paymentStatus === 'Paid';
          
          if (!isSkillsFutureDone && !isCashPayNowPaid) {
            return '';
          }
          
          // Check both top-level and nested locations
          const topLevel = params.data?.paymentDate;
          const nested = params.data?.official?.date;
          return topLevel || nested || '';
        },
        hide: false,
      },
      {
        headerName: 'Payment Time',
        field: 'paymentTime',
        width: 300,
        editable: (params) => {
          const courseType = String(params.data?.courseInfo?.courseType || params.data?.courseType || '').trim();
          if (courseType === 'NSA') return this._canEditNsaPaymentTime();
          return false; // Non-NSA courses: not editable
        },
        cellRenderer: DateTimeFieldRenderer,
        cellStyle: centeredCellStyle,
        valueGetter: (params) => {
          // Only show payment date/time when:
          // 1. SkillsFuture payment method AND status is 'SkillsFuture Done'
          // 2. Cash/PayNow payment method AND status is 'Paid'
          const paymentMethod = String(params.data?.finalPaymentMethod || '').trim();
          const paymentStatus = String(params.data?.status || params.data?.paymentStatus || '').trim();
          
          const isSkillsFutureDone = paymentMethod === 'SkillsFuture' && paymentStatus === 'SkillsFuture Done';
          const isCashPayNowPaid = (paymentMethod === 'Cash' || paymentMethod === 'PayNow') && paymentStatus === 'Paid';
          
          if (!isSkillsFutureDone && !isCashPayNowPaid) {
            return '';
          }
          
          // Check both top-level and nested locations
          const topLevel = params.data?.paymentTime;
          const nested = params.data?.official?.time;
          return topLevel || nested || '';
        },
        hide: false,
      },
      {
        headerName: 'Refunded Date',
        field: 'refundedDate',
        width: 350,
        editable: (params) => {
          const courseType = String(params.data?.courseInfo?.courseType || params.data?.courseType || '').trim();
          if (courseType === 'NSA') return this._canEditNsaRefundedDate();
          return canEdit || canSocialWorkerEdit(params) || canSiteInChargeEdit(params);
        },
        cellRenderer: DateTimeFieldRenderer,
        cellStyle: centeredCellStyle,
        hide: false,
      },
      {
        headerName: 'Refunded Time',
        field: 'refundedTime',
        width: 300,
        editable: (params) => {
          const courseType = String(params.data?.courseInfo?.courseType || params.data?.courseType || '').trim();
          if (courseType === 'NSA') return this._canEditNsaRefundedTime();
          return false; // Non-NSA courses: not editable
        },
        cellRenderer: DateTimeFieldRenderer,
        cellStyle: centeredCellStyle,
        hide: false,
      },
      ...(selectedCourseType === 'NSA'
        ? []
        : [
          {
            headerName: paymentStatusHeader,
            field: 'paymentStatus',
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: (params) => {
              const { paymentMethod, courseInfo, paymentStatus } = params.data;
              const courseType  = courseInfo.courseType;
              const coursePrice = courseInfo.coursePrice;
              const price       = parseFloat((coursePrice || '0').replace('$', ''));

              let base;
              if (courseType === 'NSA') {
                base = paymentMethod === 'SkillsFuture'
                  ? ['Pending', 'Generating SkillsFuture Invoice', 'SkillsFuture Done', 'Cancelled', 'Withdrawn', 'Refunded', 'To refund']
                  : ['Pending', 'Paid', 'Cancelled', 'Withdrawn', 'Refunded', 'Waiting List'];
              } else if (
                courseType === 'ILP' ||
                (courseType === 'Talks And Seminar' && price <= 0) ||
                (courseType === 'Others' && price <= 0)
              ) {
                base = ['Pending', 'Confirmed', 'Withdrawn', 'Waiting List'];
              } else if ((courseType === 'Talks And Seminar' || courseType === 'Others') && price > 0) {
                base = ['Pending', 'Paid', 'Cancelled', 'Withdrawn', 'Refunded', 'Waiting List'];
              } else {
                base = ['Pending', 'Paid', 'Withdrawn', 'Refunded', 'Waiting List'];
              }

              let options = base;
              if (paymentStatus === 'Pending') {
                options = base.filter((s) => s !== 'To refund' && s !== 'Withdrawn' && s !== 'Refunded');
              } else if (paymentStatus === 'Paid') {
                options = base.filter((s) => s !== 'Cancelled' && s !== 'Refunded');
              } else if (paymentStatus === 'To refund' || paymentStatus === 'Withdrawn') {
                options = base.filter((s) => s !== 'Cancelled');
              }

              const filtered = options.filter((s) => s !== paymentStatus);
              return { values: [paymentStatus, ...filtered] };
            },
            cellRenderer: PaymentStatusRenderer,
            valueSetter: (params) => {
              if (params.newValue && params.newValue !== params.oldValue) {
                params.data.paymentStatus = params.newValue;
                return true;
              }
              return false;
            },
            editable: true,
            width: 400,
            cellStyle: centeredCellStyle,
          },
        ]),
      {
        headerName: 'Sending Message Details',
        field: 'sendDetails',
        width: 300,
        cellRenderer: (params) => {
          if (params.data?.sendDetails === undefined) return null;
          return (
            <img
              src={
                params.data.sendDetails
                  ? 'https://upload.wikimedia.org/wikipedia/commons/2/29/Tick-green.png'
                  : 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Red_X.svg'
              }
              alt={params.data.sendDetails ? 'Sent' : 'Not Sent'}
              width="30"
              height="30"
            />
          );
        },
        cellStyle: centeredCellStyle,
      },
      {
        headerName: 'Remarks',
        field: 'remarks',
        width: 900,
        valueGetter: (params) => {
          // Check both top-level and nested locations
          const topLevel = params.data?.remarks;
          const nested = params.data?.officialInfo?.remarks || params.data?.official?.remarks;
          const displayValue = topLevel || nested || '';
          // Debug logging for remarks data structure
          if (params.data?.id === '6a17241ccfea0714e2eca9cb') {
            console.log('📝 [Remarks ValueGetter] Participant:', {
              participantName: params.data?.name,
              id: params.data?.id,
              topLevel,
              nested,
              displayValue,
              fullData: { remarks: params.data?.remarks, officialInfo: params.data?.officialInfo }
            });
          }
          return displayValue;
        },
        valueParser: (params) => {
          // Parse the edited value to ensure it's a string
          console.log('📝 [Remarks ValueParser] Parsing value:', {
            newValueType: typeof params.newValue,
            newValue: typeof params.newValue === 'string' ? params.newValue.substring(0, 50) : params.newValue,
          });
          
          // If newValue is a string (the edited text), return it as-is
          if (typeof params.newValue === 'string') {
            return params.newValue;
          }
          
          // If newValue is an object (shouldn't happen), return old value to reject change
          if (typeof params.newValue === 'object' && params.newValue !== null) {
            console.warn('⚠️ [Remarks ValueParser] Received object instead of string, rejecting change');
            return params.oldValue;
          }
          
          return params.newValue;
        },
        valueSetter: (params) => {
          // Set the value in the data object
          // The parsed value should be a string at this point
          const parsedValue = params.newValue;
          
          console.log('📝 [Remarks ValueSetter] Setting value:', {
            parsedValueType: typeof parsedValue,
            parsedValue: typeof parsedValue === 'string' ? parsedValue.substring(0, 50) : parsedValue,
            oldValue: typeof params.oldValue === 'string' ? params.oldValue.substring(0, 50) : params.oldValue,
          });
          
          // Only set if it's a string (the actual edited text)
          if (typeof parsedValue === 'string') {
            // Set in both locations to ensure consistency
            params.data.remarks = parsedValue;
            if (!params.data.officialInfo) params.data.officialInfo = {};
            params.data.officialInfo.remarks = parsedValue;
            if (!params.data.official) params.data.official = {};
            params.data.official.remarks = parsedValue;
            
            console.log('✅ [Remarks ValueSetter] Value successfully set for id:', params.data?.id);
            return true;
          }
          
          console.warn('⚠️ [Remarks ValueSetter] Rejecting non-string value');
          return false;
        },
        editable: (params) => {
          const courseType = String(params.data?.courseInfo?.courseType || params.data?.courseType || '').trim();
          const canEditByRole = courseType === 'NSA' ? this._canEditNsaRemarks() : true;
          
          // Debug logging for this specific record
          if (params.data?.id === '6a17241ccfea0714e2eca9cb') {
            console.log('📝 [Remarks Editable] Participant:', {
              participantName: params.data?.name,
              id: params.data?.id,
              courseType,
              canEditByRole,
              isEditable: canEditByRole
            });
          }
          
          return canEditByRole;
        },
        cellStyle: centeredCellStyle,
      },
    ];

    // Conditionally add Course Location column
    if ((Array.isArray(siteIC) || !siteIC) && !this.state.hideMarriagePrepFields) {
      columnDefs.splice(4, 0, {
        headerName: 'Course Location',
        field: 'location',
        width: 300,
        cellRenderer: (params) => {
          if (!Array.isArray(siteIC)) return params.value;
          return siteIC.includes(params.value) ? params.value : '';
        },
      });
    }

    // Always add checkbox column
    columnDefs.push({
      headerName: '',
      field: 'checkbox',
      checkboxSelection: true,
      width: 50,
      pinned: 'right',
      headerComponent: SelectAllHeader,
    });

    // Conditionally add Marriage Preparation Programme columns
    const isFilteringNSAorILP  = selectedCourseType === 'NSA' || selectedCourseType === 'ILP';
    const isFilteringMarriagePrep = selectedCourseType === 'Marriage Preparation Programme';
    const hasMarriagePrepData  =
      !isFilteringNSAorILP &&
      dataToCheck?.some((row) => row.courseInfo?.courseType === 'Marriage Preparation Programme');

    if (isFilteringMarriagePrep || (hasMarriagePrepData && !this.state.hideMarriagePrepFields)) {
      const checkboxIdx = columnDefs.length - 1;
      columnDefs.splice(
        checkboxIdx,
        0,
        { headerName: 'Spouse Name',         field: 'spouseName',         width: 200  },
        { headerName: 'Marital Status',       field: 'maritalStatus',      width: 150  },
        { headerName: 'Marriage Duration',    field: 'intendedMarriageDate', width: 200 },
        { headerName: 'Housing Type',         field: 'housingType',        width: 350  },
        { headerName: 'Spouse Contact',       field: 'spouseContact',      width: 150  },
        { headerName: 'Gross Monthly Income', field: 'grossMonthlyIncome', width: 180  },
        { headerName: 'Type of Marriage',     field: 'typeOfMarriage',     width: 1000 },
        { headerName: 'Has Children',         field: 'hasChildren',        width: 120  },
        { headerName: 'How Found Out',        field: 'howFoundOut',        width: 550  },
        { headerName: 'Spouse NRIC',          field: 'spouseNric',         width: 150  },
        { headerName: 'Spouse Email',         field: 'spouseEmail',        width: 200  },
        {
          headerName: 'Marriage Prep Consent 1',
          field: 'marriagePrepConsent1',
          width: 1500,
          cellRenderer: (params) =>
            typeof params.value === 'boolean'
              ? (params.value ? 'I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out in the link above' : '')
              : (params.value || ''),
        },
        {
          headerName: 'Marriage Prep Consent 2',
          field: 'marriagePrepConsent2',
          width: 1000,
          cellRenderer: (params) =>
            typeof params.value === 'boolean'
              ? (params.value ? 'I confirm that I have read and understood the Terms of Consent as set out in the link above' : '')
              : (params.value || ''),
        }
      );
    }

    return columnDefs;
  };

  // ── Cell renderers ────────────────────────────────────────────────────────

  // ── Row styles ────────────────────────────────────────────────────────────

  getRowStyle = (params) => {
    const { expandedRowIndex, rowData } = this.state;
    const row = rowData?.[params.rowIndex];

    if (expandedRowIndex !== null && expandedRowIndex === params.rowIndex) {
      return { background: '#f1f1f1', borderBottom: '1px solid #ddd' };
    }

    const courseType = row?.courseInfo?.courseType;
    if (courseType === 'ILP')                          return { background: '#d0f5e8' };
    if (courseType === 'Marriage Preparation Programme') return { background: '#fff9c4' };
    if (courseType === 'Talks And Seminar')            return { background: '#E8D5C4' };

    const anomaly = this.getAnomalyRowStyles(rowData || []);
    return anomaly[params.rowIndex] || null;
  };

  // ── Event handlers ────────────────────────────────────────────────────────

  handleEdit = async (item) => {
    this.props.showEditPopup(item);
  };

  handleDelete = async (id) => {
    await this.props.generateDeleteConfirmationPopup(id);
  };

  handlePortOver = async (id, participantsInfo, courseInfo, status) => {
    await this.props.generatePortOverConfirmationPopup(id, participantsInfo, courseInfo, status);
  };

  toggleRow = (index) => {
    this.setState((prev) => ({
      expandedRow: prev.expandedRow === index ? null : index,
    }));
  };

  toggleHideMarriagePrepFields = () => {
    this.setState(
      (prev) => ({ hideMarriagePrepFields: !prev.hideMarriagePrepFields }),
      () => {
        this.setState({ columnDefs: this.getColumnDefs(this.state.rowData) });
      }
    );
  };

  handleEntriesPerPageChange = (e) => {
    this.setState({ entriesPerPage: parseInt(e.target.value, 10), currentPage: 1 });
  };

  handleParticipantFieldUpdate = async ({ rowId, participantKey, apiField, value }) => {
    if (!rowId || !apiField) return;

    const normalizeDisplayValue = (rawValue) => {
      if (rawValue === null || rawValue === undefined) return '';
      if (typeof rawValue === 'string') {
        const next = rawValue.trim();
        return next === '[object Object]' ? '' : next;
      }
      if (typeof rawValue === 'number' || typeof rawValue === 'boolean') return String(rawValue);

      if (Array.isArray(rawValue)) {
        return rawValue
          .map((item) => normalizeDisplayValue(item))
          .filter(Boolean)
          .join(', ');
      }

      if (typeof rawValue === 'object') {
        const code = rawValue.code ?? rawValue.value ?? '';
        const desc = rawValue.desc ?? rawValue.description ?? rawValue.label ?? '';
        if (code || desc) {
          return `${code}${code && desc ? ' ' : ''}${desc}`.trim();
        }

        const directText =
          rawValue.name ??
          rawValue.fullName ??
          rawValue.text ??
          rawValue.display ??
          rawValue.englishName;
        if (directText !== undefined && directText !== null) {
          return normalizeDisplayValue(directText);
        }

        const firstPrimitive = Object.values(rawValue).find(
          (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
        );
        if (firstPrimitive !== undefined && firstPrimitive !== null) {
          return normalizeDisplayValue(firstPrimitive);
        }
      }

      return '';
    };

    const normalizedValue = normalizeDisplayValue(value);

    const response = await editRegistrationField(rowId, apiField, normalizedValue);
    const result = response?.data?.result;

    const isBackendSuccess = (() => {
      if (result === true) return true;
      if (result?.success === true) return true;

      const hasMatchedCount = typeof result?.matchedCount === 'number';
      const hasModifiedCount = typeof result?.modifiedCount === 'number';

      if (hasMatchedCount || hasModifiedCount) {
        const matched = Number(result?.matchedCount || 0);
        const modified = Number(result?.modifiedCount || 0);
        return matched > 0 || modified > 0;
      }

      return result?.acknowledged === true;
    })();

    if (!isBackendSuccess) {
      throw new Error(
        `Participant update failed for field "${apiField}": ${JSON.stringify(result)}`
      );
    }

    this.setState((prev) => ({
      rowData: (prev.rowData || []).map((row) => {
        if (String(row?.id || '') !== String(rowId)) return row;

        const nextParticipantInfo = {
          ...(row.participantInfo || {}),
          [participantKey]: normalizedValue,
        };

        const nextRow = {
          ...row,
          participantInfo: nextParticipantInfo,
        };

        if (participantKey === 'name') nextRow.name = normalizedValue;
        if (participantKey === 'contactNumber') nextRow.contactNo = normalizedValue;

        return nextRow;
      }),
    }));

    if (this.gridApi && typeof this.gridApi.forEachNode === 'function') {
      this.gridApi.forEachNode((node) => {
        if (String(node?.data?.id || '') !== String(rowId)) return;
        node.setDataValue('participantInfo', {
          ...(node.data?.participantInfo || {}),
          [participantKey]: normalizedValue,
        });

        if (participantKey === 'name') node.setDataValue('name', normalizedValue);
        if (participantKey === 'contactNumber') node.setDataValue('contactNo', normalizedValue);
      });
    }

    // Local state is already updated; skip immediate socket-triggered full reload to avoid viewport jump.
    this._suppressNextSocketRefresh();
  };

  handleValueClick = async (event) => {
    const columnName   = event.colDef.headerName;
    const id           = event.data.id;
    const receiptInvoice = event.data.recinvNo;
    const participantInfo = event.data.participantInfo;
    const courseInfo   = event.data.courseInfo;
    const officialInfo = event.data.officialInfo;
    const rowIndex     = event.rowIndex;
    const { expandedRowIndex } = this.state;

    try {
      if (columnName === 'S/N') {
        if (expandedRowIndex === rowIndex) {
          this.setState({ expandedRowIndex: null });
        } else {
          this.setState({ expandedRowIndex: rowIndex });
        }

      } else if (columnName === 'Receipt/Invoice Number') {
        if (receiptInvoice) {
          await this.receiptShown(participantInfo, courseInfo, receiptInvoice, officialInfo);
        } else {
          const paymentMethod = event.data.paymentMethod || courseInfo?.payment;
          const paymentStatus = event.data.paymentStatus || '';

          // Generate the missing receipt/invoice first, then open it for review.
          const generatedNo = await this.autoReceiptGenerator(
            id,
            participantInfo,
            courseInfo,
            officialInfo,
            paymentMethod,
            paymentStatus
          );

          if (generatedNo) {
            const viewCourse = { ...courseInfo, payment: paymentMethod || courseInfo?.payment };
            event.data.recinvNo = generatedNo;

            // Immediately update recinvNo, paymentDate, and paymentTime in the grid so all
            // three appear at the same time — before refreshChild() fetches from the server.
            // The server uses DD/MM/YYYY and HH:MM:SS, so we mirror that format here.
            const _now = new Date();
            const _paymentDate = `${String(_now.getDate()).padStart(2,'0')}/${String(_now.getMonth()+1).padStart(2,'0')}/${_now.getFullYear()}`;
            const _paymentTime = `${String(_now.getHours()).padStart(2,'0')}:${String(_now.getMinutes()).padStart(2,'0')}:${String(_now.getSeconds()).padStart(2,'0')}`;
            if (this.gridApi && typeof this.gridApi.forEachNode === 'function') {
              this.gridApi.forEachNode((node) => {
                if (String(node?.data?.id || '') === String(id)) {
                  node.setDataValue('recinvNo', generatedNo);
                  node.setDataValue('paymentDate', _paymentDate);
                  node.setDataValue('paymentTime', _paymentTime);
                }
              });
            }
            this.setState((prev) => ({
              rowData: (prev.rowData || []).map((row) =>
                String(row?.id || '') === String(id)
                  ? { ...row, recinvNo: generatedNo, paymentDate: _paymentDate, paymentTime: _paymentTime }
                  : row
              ),
            }));

            await this.receiptShown(participantInfo, viewCourse, generatedNo, officialInfo);
            await this.refreshChild();
          } else {
            console.warn('Unable to auto-generate receipt/invoice for this row. Please ensure payment status/method is valid.');
          }
        }

      } else if (columnName === 'Sending Message Details') {
        let phoneNumber, message, whatsappWebURL;
        const paymentMethod = courseInfo.payment;
        const courseType    = courseInfo.courseType;
        const paymentStatus = event.data.paymentStatus;

        if (participantInfo?.contactNumber && paymentMethod === 'SkillsFuture') {
          phoneNumber = participantInfo.contactNumber.replace(/\D/g, '');
          message = `${participantInfo.name} - ${courseInfo.courseEngName} invoice for your SkillsFuture submission\nHOW TO CLAIM SKILLFUTURE\nPlease ensure that the details are accurate before submission.\n🔴 Please send us a screenshot of your submission once done.\nHOW TO CLAIM SKILLFUTURE: https://ecss.org.sg/wp-content/uploads/2025/07/Step-by-step-guide-on-how-to-do-Skillsfuture-claim-submission.pdf`;
          logMessageSend({ userName: this.props.userName, module: 'Registration And Payment', participantName: participantInfo.name, contactNumber: participantInfo.contactNumber, courseEngName: courseInfo.courseEngName, messageType: 'SkillsFuture Invoice Instructions' });
          whatsappWebURL = `https://web.whatsapp.com/send?phone=+65${phoneNumber}&text=${encodeURIComponent(message)}`;
          window.open(whatsappWebURL, '_blank');

        } else if (participantInfo?.contactNumber && (paymentMethod === 'PayNow' || paymentMethod === 'Cash') && courseType === 'NSA') {
          phoneNumber = participantInfo.contactNumber.replace(/\D/g, '');
          const durationNSA = courseInfo.courseDuration?.includes('–') ? courseInfo.courseDuration.split('–')[0] : courseInfo.courseDuration || '';
          message = `${courseInfo.courseEngName} - ${durationNSA}\nCourse subsidy applies to only Singaporeans and PRs aged 50yrs and above\nHi ${participantInfo.name}, \nThank you for signing up for the above-mentioned class. \nDetails are as follows:\nPrice: ${courseInfo.coursePrice}\nPayment to be made via Paynow to UEN no: T03SS0051L (En Community Services Society) \nUnder the "reference portion", kindly insert your name as per NRIC. \nOnce payment has gone through, take a screenshot of the payment receipt on your phone and send it over to us.\nThank you.`;
          logMessageSend({ userName: this.props.userName, module: 'Registration And Payment', participantName: participantInfo.name, contactNumber: participantInfo.contactNumber, courseEngName: courseInfo.courseEngName, messageType: 'NSA Payment Instructions (PayNow/Cash)' });
          whatsappWebURL = `https://web.whatsapp.com/send?phone=+65${phoneNumber}&text=${encodeURIComponent(message)}`;
          window.open(whatsappWebURL, '_blank');

        } else if (participantInfo?.contactNumber && paymentStatus === 'Confirmed' && courseType === 'ILP') {
          phoneNumber = participantInfo.contactNumber.replace(/\D/g, '');
          const durationILP = courseInfo.courseDuration?.includes('-') ? courseInfo.courseDuration.split('-')[0] : courseInfo.courseDuration || '';
          const timeILP     = courseInfo.courseTime?.includes('–') ? courseInfo.courseTime.split('–')[0] : courseInfo.courseTime || '';
          message = `Hi ${participantInfo.name},\nThank you for your support.\nWe wish to confirm your place for ${courseInfo.courseEngName} on ${durationILP} ${timeILP} at ${courseInfo.courseLocation}.\nPlease contact this number if your require more information.\nThank you.`;
          logMessageSend({ userName: this.props.userName, module: 'Registration And Payment', participantName: participantInfo.name, contactNumber: participantInfo.contactNumber, courseEngName: courseInfo.courseEngName, messageType: 'ILP Confirmation' });
          whatsappWebURL = `https://web.whatsapp.com/send?phone=+65${phoneNumber}&text=${encodeURIComponent(message)}`;
          window.open(whatsappWebURL, '_blank');

        } else if (participantInfo?.contactNumber && paymentStatus === 'Confirmed' && courseType === 'Talks And Seminar') {
          phoneNumber = participantInfo.contactNumber.replace(/\D/g, '');
          const durationTalks = courseInfo.courseDuration?.includes('-') ? courseInfo.courseDuration.split('-')[0] : courseInfo.courseDuration || '';
          const timeTalks     = courseInfo.courseTime?.includes('–') ? courseInfo.courseTime.split('–')[0] : courseInfo.courseTime || '';
          message = `Hi ${participantInfo.name},\nThank you for your support.\nWe wish to confirm your place for ${courseInfo.courseEngName} on ${durationTalks} ${timeTalks} at ${courseInfo.courseLocation}.\nPlease contact this number if your require more information.\nThank you.`;
          logMessageSend({ userName: this.props.userName, module: 'Registration And Payment', participantName: participantInfo.name, contactNumber: participantInfo.contactNumber, courseEngName: courseInfo.courseEngName, messageType: 'Talks And Seminar Confirmation' });
          whatsappWebURL = `https://web.whatsapp.com/send?phone=+65${phoneNumber}&text=${encodeURIComponent(message)}`;
          window.open(whatsappWebURL, '_blank');
        }

        if (!shouldRequireApprovalForCourse(this.props.userEmail, courseType)) await this.sendDetails(id);
      }
    } catch (error) {
      console.error('Error in handleValueClick:', error);
    }
  };

  /**
   * Builds the shared context object forwarded to each column handler.
   */
  _buildCellHandlerContext() {
    return {
      userName:             this.props.userName,
      userRole:             this.props.role,
      showUpdatePopup:      this.props.showUpdatePopup,
      closePopup:           this.props.closePopup,
      progressTracker:      this.props.progressTracker,
      updateWooCommerce:    this.updateWooCommerceForRegistrationPayment,
      autoReceiptGenerator: this.autoReceiptGenerator,
      receiptGenerator:     this.receiptGenerator,
      refreshChild:         this.refreshChild,
      showPaymentRegistrationStatusModal: this.props.showPaymentRegistrationStatusModal,
    };
  }

  _notifyNsaChange = async (event) => {
    if (!event || event.oldValue === event.value) return;

    const row = event.data || {};
    const participantInfo = row.participantInfo || row.participant || {};
    const courseInfo = row.courseInfo || row.course || {};

    const normalize = (v) => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      return String(v);
    };

    const change = {
      _tempId: `${Math.random()}-${Date.now()}`,
      registrationId: row.id || '',
      sn: row.sn || '',
      participantName: participantInfo.name || row.name || '',
      participantEmail: participantInfo.email || '',
      courseName: courseInfo.courseEngName || row.courseName || '',
      courseLocation: courseInfo.courseLocation || row.location || '',
      columnField: event.colDef?.field || '',
      columnName: event.colDef?.headerName || event.colDef?.field || '',
      oldValue: normalize(event.oldValue),
      newValue: normalize(event.value),
      _queuedEvent: this._serializeQueueEvent(event),
    };

    const changeKey = `${change.registrationId || row._id || row.id || event.rowIndex}_${change.columnField || change.columnName}`;

    // Queue only. If same row+field is edited again, replace queued value.
    this.setState(prevState => {
      const existingIndex = prevState.notifierQueue.findIndex((item) => {
        const existingKey = `${item.registrationId || ''}_${item.columnField || item.columnName}`;
        return existingKey === changeKey;
      });

      if (existingIndex >= 0) {
        const next = [...prevState.notifierQueue];
        next[existingIndex] = {
          ...next[existingIndex],
          ...change,
          _tempId: next[existingIndex]._tempId,
        };
        return { notifierQueue: next };
      }

      return { notifierQueue: [...prevState.notifierQueue, change] };
    });
  };

  _revertNotifierEditedCell = (event) => {
    const node = event?.node;
    const field = event?.colDef?.field;
    if (!node || !field) return;

    this._isReverting = true;
    node.setDataValue(field, event.oldValue);
    setTimeout(() => { this._isReverting = false; }, 0);
  };

  _applyNotifierQueueChanges = async (selectedChanges) => {
    const queue = Array.isArray(selectedChanges) ? selectedChanges : [];
    if (!queue.length) return;

    const liveRowsById = new Map();

    const context = {
      ...this._buildCellHandlerContext(),
      showUpdatePopup: () => {},
      closePopup: () => {},
    };

    for (const queued of queue) {
      const event = queued?._queuedEvent;
      if (!event?.colDef) continue;

      const registrationId = queued?.registrationId || event?.data?.id;
      const cachedRow = registrationId ? liveRowsById.get(String(registrationId)) : null;
      const latestRowData = cachedRow || this._getLiveRowSnapshot(registrationId, event.data || {});

      const resolvedField =
        queued?.columnField ||
        event.colDef?.field ||
        this._resolveFieldFromHeader(queued?.columnName || event.colDef?.headerName);

      const rawNextValue = queued?.newValue ?? event.value;
      const shouldUseReasonForRemarks =
        resolvedField === 'remarks' &&
        String(rawNextValue ?? '').trim() === '' &&
        String(queued?.reason || '').trim() !== '';
      const effectiveNextValue = shouldUseReasonForRemarks
        ? String(queued.reason).trim()
        : rawNextValue;

      const appliedEvent = {
        ...event,
        data: latestRowData,
        value: effectiveNextValue,
        newValue: effectiveNextValue,
        forceClearThenAppendReason: shouldUseReasonForRemarks,
        oldValue: queued?.oldValue ?? event.oldValue,
        colDef: {
          ...event.colDef,
          field: resolvedField,
          headerName: queued?.columnName || event.colDef?.headerName,
        },
      };

      const columnName = appliedEvent.colDef.headerName;
      const columnField = appliedEvent.colDef.field;
      try {
        if (columnField === 'confirmed' || columnName === 'Confirmation Status') {
          await handleConfirmationStatusChange(appliedEvent, context);
        } else if (columnField === 'registrationStatus' || columnName === 'Registration Status') {
          await handleRegistrationStatusChange(appliedEvent, context);
        } else if (
          columnField === 'paymentStatus' ||
          columnName === 'Registration and Payment Status' ||
          columnName === 'Payment Status (Cash/PayNow)' ||
          columnName === 'Payment Status (SkillsFuture)' ||
          columnName === 'Payment Status'
        ) {
          await handlePaymentStatusChange(appliedEvent, context);
        } else if (columnField === 'remarks' || columnName === 'Remarks') {
          await handleRemarksChange(appliedEvent, context);
        } else if (columnField === 'refundedDate' || columnName === 'Refunded Date') {
          await handleRefundedDateChange(appliedEvent, context);
        } else {
          await handleGenericFieldChange(appliedEvent);
        }

        if (registrationId) {
          const nextRow = {
            ...(liveRowsById.get(String(registrationId)) || latestRowData || {}),
            [columnField]: appliedEvent?.value,
          };

          // Do not pre-set paymentStatus here; the handler already persists the
          // correct value to the DB and updates event.data directly.

          liveRowsById.set(String(registrationId), nextRow);
        }
      } catch (error) {
        console.error('Error applying notifier queued change:', error);
        throw error;
      }
    }

    await this.refreshChild();
  };

  onCellValueChanged = async (event) => {
    if (this._isReverting) return;

    if (event?.oldValue !== event?.value) {
      // Suppress socket-driven row patching before any backend writes begin.
      // This avoids applying intermediate states (e.g. Pending) mid-transaction.
      this._suppressNextSocketRefresh(12000);
    }

    const rowCourseType = event?.data?.courseInfo?.courseType || event?.data?.course?.courseType || '';
    if (shouldRequireApprovalForCourse(this.props.userEmail, rowCourseType)) {
      // For read-only users: intercept — lift popup to homePage
      this.setState({ pendingChange: event });
      if (this.props.onApprovalRequired) {
        this.props.onApprovalRequired(event, this._commitPendingChange, this._cancelPendingChange);
      }
      return;
    }

    console.log('Cell value changed:', {
      column:   event.colDef.headerName,
      oldValue: event.oldValue,
      newValue: event.value,
      data:     event.data,
    });

    const columnName = event?.colDef?.headerName || event?.column?.getColDef?.()?.headerName || '';
    const columnField = event?.colDef?.field || event?.field || event?.column?.getColDef?.()?.field || '';
    const context    = this._buildCellHandlerContext();
    const isNsaParticipantPaymentMethod = columnField === 'paymentMethod' || columnName === 'Payment Method (indicated by participant)';

    try {
      if (columnField === 'finalPaymentMethod' || columnName === 'Final Payment Method (by Staff)') {
        await handleFinalPaymentMethodChange(event, context);
        this._refreshNsaPaymentStatusCells(event.api, event.node);
      } else if (isNsaParticipantPaymentMethod) {
        await handlePaymentMethodChange(event, context);
      } else if (columnName === 'Confirmation Status') {
        await handleConfirmationStatusChange(event, context);
      } else if (columnName === 'Registration Status') {
        await handleRegistrationStatusChange(event, context);
      } else if (
        columnName === 'Registration and Payment Status' ||
        columnName === 'Payment Status (Cash/PayNow)' ||
        columnName === 'Payment Status (SkillsFuture)' ||
        columnName === 'Payment Status'
      ) {
        await handlePaymentStatusChange(event, context);
      } else if (columnName === 'Remarks') {
        await handleRemarksChange(event, context);
      } else if (columnName === 'Refunded Date') {
        await handleRefundedDateChange(event, context);
      } else {
        await handleGenericFieldChange(event);
      }

      await this._notifyNsaChange(event);
      // Keep edits local-instant without visible full-table refresh.
      this._suppressNextSocketRefresh();
    } catch (error) {
      console.error('Error in onCellValueChanged:', error);
      this.props.closePopup();
      // Also close the progress modal if it was open when the error occurred
      if (this.props.progressTracker) {
        this.props.progressTracker.error();
      }
    }
  };

  _commitPendingChange = (reason = '', overrideNewValue) => {
    const pending = this.state.pendingChange;
    const hasOverride = !(overrideNewValue === undefined || overrideNewValue === null);
    const event = hasOverride
      ? {
        ...pending,
        value: overrideNewValue,
        newValue: overrideNewValue,
      }
      : pending;
    if (!event) return;

    // Deduplicate by row id + field.
    // If the cell is already queued, keep the original queued item (including reason)
    // so queued reasons cannot be edited by reconfirming the same cell.
    const key = `${event.data?.id ?? event.rowIndex}_${event.colDef.field}`;
    const alreadyQueued = this.state.approvalQueue.some(
      (item) => `${item.event.data?.id ?? item.event.rowIndex}_${item.event.colDef.field}` === key
    );
    const nextQueue = alreadyQueued
      ? this.state.approvalQueue
      : [...this.state.approvalQueue, {
        event: this._serializeQueueEvent(event),
        reason,
        approvalKey: this._getApprovalQueueItemKey({ event: this._serializeQueueEvent(event) }),
      }];

    // Queue the change (with reason) but keep old value visible in-grid
    // until the approval is granted.
    this.setState({ pendingChange: null, approvalQueue: nextQueue }, () => {
      const node = event.node;
      const field = event.colDef.field;
      if (node && field) {
        this._isReverting = true;
        node.setDataValue(field, event.oldValue);
        setTimeout(() => { this._isReverting = false; }, 0);
      }
    });
  };

  _cancelPendingChange = () => {
    const event = this.state.pendingChange;
    this.setState({ pendingChange: null });
    if (!event) return;

    // Revert the cell to its old value without re-triggering the approval popup
    const node = event.node;
    const field = event.colDef.field;
    if (node && field) {
      this._isReverting = true;
      node.setDataValue(field, event.oldValue);
      setTimeout(() => { this._isReverting = false; }, 0);
    }
  };

  _openApprovalQueueModal = () => {
    if (this.props.onApprovalQueueRequired) {
      this._publishApprovalQueueToParent(this.state.approvalQueue);
      return;
    }
    this.setState({ showApprovalQueueModal: true });
  };

  _publishApprovalQueueToParent = (queue) => {
    if (this.props.onApprovalQueueRequired) {
      this.props.onApprovalQueueRequired({
        queue,
        onSendEmail: this._sendApprovalEmail,
        onClose: () => this.props.onApprovalQueueRequired(null),
        onRemove: this._removeApprovalQueueItem,
        onUpdateReason: this._updateApprovalQueueReason,
      });
      return;
    }
  };

  _updateApprovalQueueReason = (approvalKeyOrIndex, reason) => {
    this.setState((prev) => {
      const nextQueue = prev.approvalQueue.map((item, i) =>
        (typeof approvalKeyOrIndex === 'string'
          ? (item?.approvalKey || this._getApprovalQueueItemKey(item)) === approvalKeyOrIndex
          : i === approvalKeyOrIndex)
          ? { ...item, reason }
          : item
      );
      if (this.props.onApprovalQueueRequired) {
        this._publishApprovalQueueToParent(nextQueue);
      }
      return { approvalQueue: nextQueue };
    });
  };

  _removeApprovalQueueItem = (index) => {
    this.setState((prev) => {
      const nextQueue = prev.approvalQueue.filter((_, i) => i !== index);
      if (this.props.onApprovalQueueRequired) {
        this._publishApprovalQueueToParent(nextQueue);
      }
      return { approvalQueue: nextQueue };
    });
  };

  _closeApprovalQueueModal = () => {
    if (this.props.onApprovalQueueRequired) {
      this.props.onApprovalQueueRequired(null);
      return;
    }
    this.setState({ showApprovalQueueModal: false });
  };

  _sendApprovalEmail = async () => {
    const queue = this.state.approvalQueue || [];
    if (!queue.length) return;

    const missingReasonIndex = queue.findIndex((item) => !String(item?.reason || '').trim());
    if (missingReasonIndex >= 0) {
      this.props.showUpdatePopup(`Please enter a reason for row ${missingReasonIndex + 1}.`);
      setTimeout(() => this.props.closePopup(), 1500);
      return;
    }

    const formatValue = (value, columnName) => {
      if (value === null || value === undefined || value === '') return '';
      if (columnName === 'Confirmation Status') {
        if (value === true || value === 'true' || value === 1 || value === '1') return 'Confirmed';
        if (value === false || value === 'false' || value === 0 || value === '0') return 'Not Confirmed';
      }
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch (error) {
          return String(value);
        }
      }
      return String(value);
    };

    const now = new Date();
    const currentDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const allChanges = queue.map(({ event, reason }) => {
      const row = event?.data || {};
      return {
        sn: row?.sn || '',
        registrationId: row?.id || row?._id || '',
        participantName: row?.participantInfo?.name || row?.name || '',
        participantEmail: row?.participantInfo?.email || row?.email || '',
        courseName: row?.courseInfo?.courseEngName || row?.course || '',
        courseLocation: row?.courseInfo?.courseLocation || row?.location || '',
        columnName: event?.colDef?.headerName || event?.colDef?.field || '',
        currentValue: formatValue(event?.oldValue, event?.colDef?.headerName),
        newValue: formatValue(event?.value, event?.colDef?.headerName),
        reason: String(reason || '').trim(),
      };
    });

    try {
      this.props.showUpdatePopup('Sending approval email...');

      this.props.showUpdatePopup('Approval request sent to moses_lee@ecss.org.sg.');
      this.setState({ approvalQueue: [] });
      this._closeApprovalQueueModal();
      setTimeout(() => this.props.closePopup(), 1200);
    } catch (error) {
      console.error('Failed to send approval email:', error);
      const message = error?.response?.data?.message || 'Failed to send approval request.';
      this.props.showUpdatePopup(message);
      setTimeout(() => this.props.closePopup(), 1800);
    }
  };

  _openApprovalStatusModal = async () => {
    this._approvalStatusModalOpen = true;
    const latestRequests = await this._refreshApprovalStatusList();
    if (this.props.onApprovalStatusRequired) {
      this._publishApprovalStatusToParent(latestRequests);
      return;
    }
    this.setState({ showApprovalStatusModal: true });
  };

  _closeApprovalStatusModal = () => {
    this._approvalStatusModalOpen = false;
    if (this.props.onApprovalStatusRequired) {
      this.props.onApprovalStatusRequired(null);
      return;
    }
    this.setState({ showApprovalStatusModal: false });
  };

  _publishApprovalStatusToParent = (requests) => {
    if (this.props.onApprovalStatusRequired) {
      this.props.onApprovalStatusRequired({
        requests: requests || [],
        onClose: () => this.props.onApprovalStatusRequired(null),
      });
    }
  };

  _openNotifierModal = () => {
    if (this.props.onNotifierQueueRequired) {
      this.props.onNotifierQueueRequired({
        changes: this.state.notifierQueue,
        userName: this.props.userName || 'Unknown',
        userEmail: this.props.userEmail || '',
        onClearAll: this._clearNotifierQueue,
        onApplyChanges: this._applyNotifierQueueChanges,
      });
      return;
    }
    this.setState({ showNotifierModal: true });
  };

  _closeNotifierModal = () => {
    this.setState({ showNotifierModal: false });
  };

  _removeNotifierQueueItem = (tempId) => {
    this.setState(prevState => ({
      notifierQueue: prevState.notifierQueue.filter(item => item._tempId !== tempId),
    }));
  };

  _clearNotifierQueue = (selectedIndices) => {
    if (selectedIndices && selectedIndices.size > 0) {
      this.setState(prevState => ({
        notifierQueue: prevState.notifierQueue.filter((_, idx) => !selectedIndices.has(idx)),
      }));
      return;
    }

    this.setState({ notifierQueue: [] });
  };

  _commitApprovalQueue = async () => {
    const queue = this.state.approvalQueue;
    if (!queue.length) return;

    this.setState({ approvalQueue: [] });
    const context = this._buildCellHandlerContext();

    for (const { event } of queue) {
      const columnName = event.colDef.headerName;
      try {
        if (columnName === 'Payment Method') {
          await handlePaymentMethodChange(event, context);
        } else if (columnName === 'Confirmation Status') {
          await handleConfirmationStatusChange(event, context);
        } else if (
          columnName === 'Registration and Payment Status' ||
          columnName === 'Payment Status (Cash/PayNow)' ||
          columnName === 'Payment Status (SkillsFuture)' ||
          columnName === 'Registration Status' ||
          columnName === 'Payment Status'
        ) {
          await handlePaymentStatusChange(event, context);
        } else if (columnName === 'Remarks') {
          await handleRemarksChange(event, context);
        } else if (columnName === 'Refunded Date') {
          await handleRefundedDateChange(event, context);
        } else {
          await handleGenericFieldChange(event);
        }
      } catch (error) {
        console.error('Error committing queued change:', error);
      }
    }

    this.refreshChild();
  };

  // ── Grid API hooks ────────────────────────────────────────────────────────

  onGridReady = (params) => {
    this.gridApi       = params.api;
    this.gridColumnApi = params.columnApi;
  };

  onSelectionChanged = (event) => {
    const selectedRows = event.api.getSelectedRows();
    this.setState({ selectedRows });
    setTimeout(() => {
      event.api?.refreshHeader?.();
    }, 10);
  };

  // ── Refresh ───────────────────────────────────────────────────────────────

  refreshChild = async (options = {}) => {
    const { force = false } = options;
    const { language, progressModalOpen } = this.props;
    if (progressModalOpen && !force) {
      this._pendingRefreshChild = true;
      return;
    }

    const gridContainer = document.querySelector('.ag-body-viewport');
    const savedScrollTop = gridContainer ? gridContainer.scrollTop : 0;
    const selectedIds = (this.state.selectedRows || [])
      .map((row) => String(row?.id || ''))
      .filter(Boolean);

    let focusedRowId = '';
    let focusedRowIndex = null;
    if (this.gridApi && typeof this.gridApi.getFocusedCell === 'function') {
      const focusedCell = this.gridApi.getFocusedCell();
      if (focusedCell && typeof focusedCell.rowIndex === 'number') {
        focusedRowIndex = focusedCell.rowIndex;
        const focusedNode = this.gridApi.getDisplayedRowAtIndex(focusedCell.rowIndex);
        focusedRowId = String(focusedNode?.data?.id || '');
      }
    }

    const expandedRowId =
      this.state.expandedRowIndex !== null
        ? String(this.state.rowData?.[this.state.expandedRowIndex]?.id || '')
        : '';

    try {
      const data = await this.fetchCourseRegistrations(language);

      if (data === null) {
        // Fetch failed — keep existing table data intact
        if (!progressModalOpen) this.props.closePopup();
        return;
      }

      this.setState({ originalData: data, registerationDetails: data }, () => {
        this.filterRegistrationDetails();

        requestAnimationFrame(() => {
          if (gridContainer) {
            gridContainer.scrollTop = savedScrollTop;
          }

          if (this.gridApi && typeof this.gridApi.forEachNode === 'function') {
            // Restore previous selections by row id after data refresh.
            this.gridApi.forEachNode((node) => {
              const rowId = String(node?.data?.id || '');
              if (rowId && selectedIds.includes(rowId)) {
                node.setSelected(true);
              }
            });

            // Restore expanded row to the same entry if it still exists.
            if (expandedRowId) {
              let nextExpandedIndex = null;
              this.gridApi.forEachNode((node) => {
                if (nextExpandedIndex === null && String(node?.data?.id || '') === expandedRowId) {
                  nextExpandedIndex = node.rowIndex;
                }
              });

              this.setState({ expandedRowIndex: nextExpandedIndex });
            }

            // Keep focus/viewport anchored to the same entry when possible.
            if (focusedRowId) {
              let targetIndex = null;
              this.gridApi.forEachNode((node) => {
                if (targetIndex === null && String(node?.data?.id || '') === focusedRowId) {
                  targetIndex = node.rowIndex;
                }
              });

              if (typeof targetIndex === 'number') {
                this.gridApi.ensureIndexVisible(targetIndex, 'middle');
              }
            } else if (typeof focusedRowIndex === 'number') {
              this.gridApi.ensureIndexVisible(focusedRowIndex, 'middle');
            }
          }
        });

        setTimeout(() => {
          if (gridContainer) gridContainer.scrollTop = savedScrollTop;
        }, 100);
        if (!progressModalOpen) {
          this.props.closePopup();
        }
      });
    } catch (error) {
      console.error('Error in refreshChild:', error);
      this.props.closePopup();
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  filterRegistrationDetails() {
    const { originalData } = this.state;
    const { selectedCourseType } = this.props;
    
    if (!originalData?.length) {
      this.setState({ registerationDetails: [], rowData: [] });
      return;
    }

    // If no course type is selected, keep table empty with instruction
    if (!selectedCourseType || selectedCourseType === 'All Courses Types') {
      this.setState({
        registerationDetails: [],
        rowData: [],
        columnDefs: this.getColumnDefs([]),
      });
      this._syncFilterDropdownOptions(this.state.originalData || []);
      return;
    }

    const filtered = this._getFilteredRawData(originalData);

    const rowData   = filtered.map((item, index) => mapRegistrationToRowData(item, index));
    const newColDefs = this.getColumnDefs(rowData);

    this._syncFilterDropdownOptions(this.state.originalData || []);

    this.setState(
      { registerationDetails: filtered, rowData, columnDefs: newColDefs },
      () => {
        this.debugMarriagePrepData();
        this.gridApi?.refreshCells?.();
      }
    );
  }

  // ── Bulk update ───────────────────────────────────────────────────────────

  _setShowBulkUpdateModal = (val) => {
    this.setState({ showBulkUpdateModal: val });
    if (!val && this.props.onBulkUpdateModalDismiss) {
      this.props.onBulkUpdateModalDismiss();
    }
  };

  _handleBulkUpdateStatusChange = (val) => {
    const nextRowValues = {};
    (this.state.selectedRows || []).forEach((row, index) => {
      const key = String(row?.id || `row-${index}`);
      nextRowValues[key] = val;
    });

    this.setState({
      bulkUpdateStatus: val,
      bulkUpdateRowValues: nextRowValues,
    });

    if (this.props.onBulkUpdateModalSync) {
      this.props.onBulkUpdateModalSync({
        bulkUpdateStatus: val,
        bulkUpdateRowValues: nextRowValues,
        selectedRows: this.state.selectedRows,
      });
    }
  };

  _handleBulkUpdateFieldChange = (field) => {
    const rowValues = {};
    if (field !== 'paymentStatus' && field !== 'paymentMethod') {
      (this.state.selectedRows || []).forEach((row) => {
        const key = String(row?.id || '');
        if (!key) return;

        let current = '';
        if (field === 'confirmationStatus') {
          const raw = row?.confirmed;
          current = raw === true ? 'Confirmed' : raw === false ? 'Not Confirmed' : '';
        } else if (field === 'paymentDate') {
          current = row?.paymentDate || '';
        } else if (field === 'remarks') {
          current = row?.remarks || '';
        } else if (field === 'contactNo') {
          current = row?.contactNo || row?.participantInfo?.contactNumber || '';
        } else if (field === 'name') {
          current = row?.participantInfo?.name || row?.name || '';
        }

        rowValues[key] = current;
      });
    }

    const nextState = {
      bulkUpdateField: field,
      bulkUpdateStatus: '',
      bulkUpdateMethod: '',
      bulkUpdateValue: '',
      bulkUpdateRowValues: rowValues,
    };
    this.setState(nextState);

    if (this.props.onBulkUpdateModalSync) {
      this.props.onBulkUpdateModalSync({
        ...nextState,
        selectedRows: this.state.selectedRows,
      });
    }
  };

  _handleBulkUpdateMethodChange = (val) => {
    const nextRowValues = {};
    (this.state.selectedRows || []).forEach((row, index) => {
      const key = String(row?.id || `row-${index}`);
      nextRowValues[key] = val;
    });

    this.setState({
      bulkUpdateMethod: val,
      bulkUpdateRowValues: nextRowValues,
    });

    if (this.props.onBulkUpdateModalSync) {
      this.props.onBulkUpdateModalSync({
        bulkUpdateMethod: val,
        bulkUpdateRowValues: nextRowValues,
        selectedRows: this.state.selectedRows,
      });
    }
  };

  _handleBulkUpdateValueChange = (val) => {
    const nextRowValues = {};
    (this.state.selectedRows || []).forEach((row, index) => {
      const key = String(row?.id || `row-${index}`);
      nextRowValues[key] = val;
    });

    this.setState({
      bulkUpdateValue: val,
      bulkUpdateRowValues: nextRowValues,
    });

    if (this.props.onBulkUpdateModalSync) {
      this.props.onBulkUpdateModalSync({
        bulkUpdateValue: val,
        bulkUpdateRowValues: nextRowValues,
        selectedRows: this.state.selectedRows,
      });
    }
  };

  _handleBulkUpdateRowValueChange = (rowId, val) => {
    this.setState((prevState) => {
      const nextRowValues = {
        ...(prevState.bulkUpdateRowValues || {}),
        [String(rowId)]: val,
      };

      if (this.props.onBulkUpdateModalSync) {
        this.props.onBulkUpdateModalSync({
          bulkUpdateRowValues: nextRowValues,
          selectedRows: this.state.selectedRows,
        });
      }

      return { bulkUpdateRowValues: nextRowValues };
    });
  };

  openBulkUpdateModal = () => {
    if (!this.state.selectedRows.length) {
      openBulkUpdateModalFn({
        selectedRows: this.state.selectedRows,
        setShowBulkUpdateModal: this._setShowBulkUpdateModal,
      });
      return;
    }

    openBulkUpdateModalFn({
      selectedRows: this.state.selectedRows,
      setShowBulkUpdateModal: this._setShowBulkUpdateModal,
    });

    if (this.props.onBulkUpdateModalRequired) {
      this.props.onBulkUpdateModalRequired({
        selectedRows: this.state.selectedRows,
        bulkUpdateField: this.state.bulkUpdateField,
        bulkUpdateStatus: this.state.bulkUpdateStatus,
        bulkUpdateMethod: this.state.bulkUpdateMethod,
        bulkUpdateValue: this.state.bulkUpdateValue,
        bulkUpdateRowValues: this.state.bulkUpdateRowValues,
        onFieldChange: this._handleBulkUpdateFieldChange,
        onStatusChange: this._handleBulkUpdateStatusChange,
        onMethodChange: this._handleBulkUpdateMethodChange,
        onValueChange: this._handleBulkUpdateValueChange,
        onRowValueChange: this._handleBulkUpdateRowValueChange,
        onUpdate: this.handleBulkUpdate,
        onClose: this.closeBulkUpdateModal,
      });
    }
  };

  closeBulkUpdateModal = () => closeBulkUpdateModalFn({
    setShowBulkUpdateModal: this._setShowBulkUpdateModal,
    setBulkUpdateFields: (fields) => this.setState(fields),
  });

  handleBulkUpdate = (reason) => {
    handleBulkUpdateFn({
    selectedRows: this.state.selectedRows,
    bulkUpdateField: this.state.bulkUpdateField,
    bulkUpdateStatus: this.state.bulkUpdateStatus,
    bulkUpdateMethod: this.state.bulkUpdateMethod,
    bulkUpdateValue: this.state.bulkUpdateValue,
    bulkUpdateRowValues: this.state.bulkUpdateRowValues,
    userName: this.props.userName,
    showUpdatePopup: this.props.showUpdatePopup,
    closePopup: this.props.closePopup,
    setShowBulkUpdateModal: this._setShowBulkUpdateModal,
    setBulkUpdateFields: (fields) => this.setState(fields),
    updateWooCommerce: this.updateWooCommerceForRegistrationPayment,
    onApprovalQueueRequest: this._enqueueBulkApprovalRequest,
    onNotifierQueueRequest: this._enqueueBulkNotifierRequest,
    reason: reason || '',
    });
  };

  _enqueueBulkApprovalRequest = ({ row, columnName, oldValue, newValue, reason }) => {
    if (!row || !columnName) return;

    const headerName = String(columnName || '').trim();
    const field = this._resolveFieldFromHeader(headerName) || headerName;
    const syntheticEvent = {
      value: newValue,
      newValue,
      oldValue,
      rowIndex: 0,
      data: row,
      colDef: {
        field,
        headerName,
      },
    };

    const queueItem = {
      event: this._serializeQueueEvent(syntheticEvent),
      reason: reason || '',
      approvalKey: this._getApprovalQueueItemKey({ event: this._serializeQueueEvent(syntheticEvent) }),
    };
    const dedupeKey = `${row?.id || row?.sn || ''}_${field}_${String(newValue ?? '')}`;

    this.setState((prev) => {
      const alreadyQueued = (prev.approvalQueue || []).some((item) => {
        const itemKey = `${item?.event?.data?.id || item?.event?.data?.sn || ''}_${item?.event?.colDef?.field || ''}_${String(item?.event?.newValue ?? item?.event?.value ?? '')}`;
        return itemKey === dedupeKey;
      });

      const nextQueue = alreadyQueued ? prev.approvalQueue : [...(prev.approvalQueue || []), queueItem];
      return { approvalQueue: nextQueue };
    }, () => {
      if (this.props.onApprovalQueueRequired) {
        this._publishApprovalQueueToParent(this.state.approvalQueue || []);
      }
    });
  };

  _enqueueBulkNotifierRequest = ({ row, columnName, oldValue, newValue, reason }) => {
    if (!row || !columnName) return;

    const headerName = String(columnName || '').trim();
    const field = this._resolveFieldFromHeader(headerName) || headerName;
    const syntheticEvent = {
      value: newValue,
      newValue,
      oldValue,
      rowIndex: 0,
      data: row,
      colDef: {
        field,
        headerName,
      },
    };

    const queueItem = {
      _tempId: `${Math.random()}-${Date.now()}-${String(row?.id || row?.sn || '')}`,
      registrationId: row?.id || '',
      sn: row?.sn || '',
      participantName: row?.participantInfo?.name || row?.name || '',
      participantEmail: row?.participantInfo?.email || '',
      courseName: row?.courseInfo?.courseEngName || row?.course || '',
      courseLocation: row?.courseInfo?.courseLocation || row?.location || '',
      columnField: field,
      columnName: headerName,
      oldValue: String(oldValue ?? ''),
      newValue: String(newValue ?? ''),
      reason: String(reason || '').trim(),
      _queuedEvent: this._serializeQueueEvent(syntheticEvent),
    };

    const dedupeKey = `${row?.id || row?.sn || ''}_${field}_${String(newValue ?? '')}`;

    this.setState((prev) => {
      const queue = prev.notifierQueue || [];
      const existingIndex = queue.findIndex((item) => {
        const itemKey = `${item?.registrationId || item?.sn || ''}_${item?.columnField || item?.columnName || ''}_${String(item?.newValue ?? '')}`;
        return itemKey === dedupeKey;
      });

      if (existingIndex >= 0) {
        const nextQueue = [...queue];
        nextQueue[existingIndex] = {
          ...nextQueue[existingIndex],
          ...queueItem,
          _tempId: nextQueue[existingIndex]._tempId,
        };
        return { notifierQueue: nextQueue };
      }

      return { notifierQueue: [...queue, queueItem] };
    }, () => {
      if (this.props.onNotifierQueueRequired) {
        this._openNotifierModal();
      }
    });
  };

  // ── Send / misc ───────────────────────────────────────────────────────────

  sendDetails = async (id) => {
    await this.props.generateSendDetailsConfirmationPopup(id);
  };

  // ── Debug helpers ─────────────────────────────────────────────────────────

  debugMarriagePrepData = () => {
    const { rowData } = this.state;
    if (!rowData) return;
    const mp = rowData.filter((r) => r.courseInfo?.courseType === 'Marriage Preparation Programme');
    if (mp.length > 0) {
      console.log(`=== ${mp.length} Marriage Preparation Programme registration(s) in current view ===`);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    const {
      selectedRows,
      bulkUpdateStatus,
      expandedRowIndex,
      pendingChange,
      approvalQueue,
      approvalStatusList,
      notifierQueue,
    } = this.state;

    const { selectedCourseType } = this.props;
    const isCourseTypeSelected = selectedCourseType && selectedCourseType !== 'All Courses Types';
    const hasNoData = !this.state.rowData || this.state.rowData.length === 0;

    return (
      <div className="registration-payment-details-wrapper">
        {/* ── Anomaly Detection button (above heading) ──────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px', width: '90%', marginLeft: 'auto', marginRight: 'auto' }}>
          <button
            className="registration-payment-details-button"
            style={{
              color: this.state.anomalyList.length > 0 ? '#E65100' : '#9E9E9E',
              borderColor: this.state.anomalyList.length > 0 ? '#E65100' : '#9E9E9E',
              fontWeight: 700,
            }}
            onClick={this.props.onOpenAnomalyModal}
          >
            Anomaly Detection
          </button>
        </div>

        <div className="registration-payment-details-heading">
          <h2>Registration &amp; Payment Table</h2>
        </div>

        {/* ── Instruction Message when No Course Type Selected ──── */}
        {!isCourseTypeSelected && (
          <div className="registration-payment-instruction-message">
            <p style={{
              textAlign: 'center',
              padding: '40px 20px',
              fontSize: '16px',
              color: '#666',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              margin: '20px',
            }}>
              📋 Please select a <strong>Course Type</strong> from the filter options above to view registration and payment data.
            </p>
          </div>
        )}

        {isCourseTypeSelected && (
        <div className="registration-payment-details-content-shell">
          {/* ── Action buttons ─────────────────────────────────────── */}
          <ActionButtonsRow
            role={this.props.role}
            userEmail={this.props.userEmail}
            selectedCourseType={this.props.selectedCourseType}
            selectedRowCount={selectedRows.length}
            hasMarriagePrepData={this.state.rowData?.some(
              (r) => r.courseInfo?.courseType === 'Marriage Preparation Programme'
            )}
            hideMarriagePrepFields={this.state.hideMarriagePrepFields}
            onToggleMarriagePrep={this.toggleHideMarriagePrepFields}
            onArchive={this.archiveData}
            onExportLOP={this.exportToLOP}
            onExportAttendance={this.exportAttendance}
            onExportMarriagePrep={this.exportToMarriagePreparationProgramme}
            onOpenBulkUpdate={this.openBulkUpdateModal}
            hideBulkUpdate={true}
            isReadOnly={isReadOnlyUser(this.props.userEmail)}
            approvalQueueCount={approvalQueue.length}
            onOpenApprovalQueue={this._openApprovalQueueModal}
            onOpenApprovalStatus={this._openApprovalStatusModal}
            approvalStatusCount={approvalStatusList.length}
            notifierQueueCount={this.state.notifierQueue.length}
            onOpenNotifierQueue={this._openNotifierModal}
          />

          {/* ── AG-Grid ────────────────────────────────────────────── */}
          <div className="grid-container">
            <AgGridReact
              className="registration-payment-checkbox-size-150"
              ref={this.gridRef}
              rowData={this.state.rowData}
              getRowId={(params) => String(params?.data?.id || params?.data?._id || '')}
              columnDefs={this.state.columnDefs}
              defaultColDef={{
                cellStyle: {
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                },
              }}
              rowSelection="multiple"
              suppressScrollOnNewData={true}
              onGridReady={this.onGridReady}
              onSelectionChanged={this.onSelectionChanged}
              onCellValueChanged={this.onCellValueChanged}
              stopEditingWhenCellsLoseFocus={true}
              onCellEditingStopped={(params) => {
                const columnId = params.column?.getId?.();
                if (
                  columnId === 'paymentStatusCashPayNow' ||
                  columnId === 'paymentStatusSkillsFuture' ||
                  columnId === 'paymentMethod' ||
                  columnId === 'finalPaymentMethod'
                ) {
                  this._refreshNsaPaymentStatusCells(params.api, params.node);
                  return;
                }

                params.api.refreshCells({
                  rowNodes: [params.node],
                  columns: [columnId],
                  force: true,
                });
              }}
              onCellClicked={this.handleValueClick}
              suppressRowClickSelection={true}
              pagination={true}
              paginationPageSize={Math.max(1, Number(this.props.entriesPerPage) || 20)}
              domLayout="normal"
              rowHeight={90}
              getRowStyle={this.getRowStyle}
              context={{
                shouldApplyNsaInChargeStyling: () => this._shouldApplyNsaInChargeStyling(),
                componentInstance: this, 
                isReadOnly: isReadOnlyUser(this.props.userEmail)
              }}
            />
          </div>
        </div>
        )}

        {/* ApprovalPopup and AnomalyModal are rendered in homePage.jsx */}

        {/* ── Expanded Row Detail ────────────────────────────────── */}
        {expandedRowIndex !== null &&
          this.state.rowData?.length > 0 &&
          expandedRowIndex < this.state.rowData.length && (
            <div className="registration-payment-details-expanded-row">
              <ExpandedRowDetail
                rowData={this.state.rowData[expandedRowIndex]}
                onParticipantFieldUpdate={this.handleParticipantFieldUpdate}
              />
            </div>
          )}
      </div>
    );
  }
}

export default RegistrationPaymentSection;
