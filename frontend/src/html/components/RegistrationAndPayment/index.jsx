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
import PaymentMethodRenderer  from './components/PaymentMethodRenderer';
import PaymentStatusRenderer  from './components/PaymentStatusRenderer';
import SelectAllHeader        from './components/SelectAllHeader';
import ActionButtonsRow       from './components/ActionButtonsRow';

// Approval popup

// Access control
import { isReadOnlyUser } from './constants/accessControl';
import { shouldRequireApprovalForCourse } from './constants/accessControl';
import { isNsaNotifier } from './constants/accessControl';

// Utilities
import {
  languageDatabase,
  getAllLocations,
  getAllTypes,
  getAllNames,
  getAllQuarters,
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
  handlePaymentMethodChange,
  handleConfirmationStatusChange,
  handlePaymentStatusChange,
  handleRemarksChange,
  handleRefundedDateChange,
  handleGenericFieldChange,
} from './handlers/cellValueChangedHandlers';

// API service layer
import {
  fetchCourseRegistrations as apiFetchCourseRegistrations,
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
  sendNsaApprovalEmail,
  fetchNsaApprovalStatusList,
  NODE_BASE_URL,
} from './services/registrationApi';

// Register AG-Grid community modules once at module level
ModuleRegistry.registerModules([AllCommunityModule]);

const APPROVAL_QUEUE_STORAGE_KEY_PREFIX = 'registrationApprovalQueue';
const APPROVAL_STATUS_STORAGE_KEY_PREFIX = 'registrationApprovalStatus';
const APPROVAL_STATUS_CLEAR_MARKER_PREFIX = 'registrationApprovalStatusCleared';

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
    };
    this.tableRef = React.createRef();
    this.gridRef  = React.createRef();
    this._isReverting = false;
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
      'Payment Method': 'paymentMethod',
      'Confirmation Status': 'confirmed',
      'Registration and Payment Status': 'paymentStatus',
      'Registration Status': 'paymentStatus',
      'Payment Status': 'paymentStatus',
      'Payment Date': 'paymentDate',
      'Refunded Date': 'refundedDate',
      'Remarks': 'remarks',
    };
    return map[headerName] || '';
  }

  _applyLiveNotifierRowUpdate = ({ registrationId, field, value, resetRemarks = false }) => {
    if (!registrationId || !field) return;

    const appendNumberedRemark = (existingRemarks, incomingRemark) => {
      const incoming = String(incomingRemark ?? '').trim();
      if (!incoming) return '';

      const existing = resetRemarks ? '' : String(existingRemarks || '').trim();
      if (!existing) return `1) ${incoming}`;

      const lines = existing.split(/\r?\n/).map((l) => String(l || '').trim()).filter(Boolean);
      let maxNo = 0;
      lines.forEach((line) => {
        const m = line.match(/^(\d+)\)\s+/);
        if (m) maxNo = Math.max(maxNo, parseInt(m[1], 10) || 0);
      });

      // If incoming is already fully numbered text, keep it as-is.
      if (/^\d+\)\s+/.test(incoming)) return incoming;
      return `${existing}\n${maxNo + 1}) ${incoming}`;
    };

    if (this.gridApi && typeof this.gridApi.forEachNode === 'function') {
      this.gridApi.forEachNode((node) => {
        if (String(node?.data?.id || '') === String(registrationId)) {
          const nextValue =
            field === 'remarks'
              ? appendNumberedRemark(node?.data?.remarks, value)
              : value;
          node.setDataValue(field, nextValue);
        }
      });
    }

    this.setState((prev) => ({
      rowData: (prev.rowData || []).map((row) =>
        String(row?.id || '') === String(registrationId)
          ? {
            ...row,
            [field]: field === 'remarks'
              ? appendNumberedRemark(row?.remarks, value)
              : value,
          }
          : row
      ),
    }));
  }

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

  _refreshApprovalStatusList = async () => {
    try {
      const response = await fetchNsaApprovalStatusList({
        requesterEmail: this.props.userEmail || '',
        requesterName: this.props.userName || '',
      });
      const mapped = this._mapApprovalStatusRows(response?.data?.requests || []);
      this.setState({ approvalStatusList: mapped });
      return mapped;
    } catch (error) {
      console.error('Failed to load approval status list:', error);
      return this.state.approvalStatusList || [];
    }
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

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async componentDidMount() {
    await this.fetchAndSetRegistrationData();

    // One-time reset requested: clear existing status history now.
    this._clearApprovalStatusOnce();

    const persistedQueue = this._loadPersistedApprovalQueue();
    const persistedStatusList = this._loadPersistedApprovalStatusList();
    if (persistedQueue.length) {
      this.setState({ approvalQueue: persistedQueue });
    }
    if (persistedStatusList.length) {
      this.setState({ approvalStatusList: persistedStatusList });
    }

    await this._refreshApprovalStatusList();

    // Auto-open queue modal if shouldAutoOpenQueue flag is set
    if (this.props.shouldAutoOpenQueue) {
      setTimeout(() => {
        if (persistedQueue.length > 0) {
          this._openApprovalQueueModal();
        }
      }, 500); // Small delay to ensure state is ready
    }

    this.socket = io(NODE_BASE_URL);
    this.socket.on('registration', () => {
      console.log('Socket: registration event received – refreshing data');
      this.fetchAndSetRegistrationData();
      this._refreshApprovalStatusList();
    });
    // Targeted event: refresh approval status list, and if modal is open push fresh data to parent
    this.socket.on('nsa-status-update', async () => {
      console.log('Socket: nsa-status-update event received – refreshing approval status list');
      const fresh = await this._refreshApprovalStatusList();
      if (this._approvalStatusModalOpen) {
        this._publishApprovalStatusToParent(fresh);
      }
    });
  }

  componentWillUnmount() {
    if (this.socket) this.socket.disconnect();
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

    const {
      selectedLocation, selectedCourseType, searchQuery,
      selectedCourseName, selectedQuarter,
    } = this.props;

    const changed =
      selectedLocation   !== prevProps.selectedLocation   ||
      selectedCourseType !== prevProps.selectedCourseType ||
      selectedCourseName !== prevProps.selectedCourseName ||
      selectedQuarter    !== prevProps.selectedQuarter    ||
      searchQuery        !== prevProps.searchQuery;

    if (!changed) return;

    if (selectedCourseType !== prevProps.selectedCourseType) {
      this.setState(
        { columnDefs: this.getColumnDefs(this.state.rowData) },
        () => this.filterRegistrationDetails()
      );
    } else {
      this.filterRegistrationDetails();
    }
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  fetchCourseRegistrations = async (language) => {
    try {
      const { siteIC, role } = this.props;
      const response = await apiFetchCourseRegistrations(siteIC, role);
      return languageDatabase(response.data.result, language);
    } catch (error) {
      console.error('Error fetching course registrations:', error.response?.data || error.message);
      return [];
    }
  };

  async fetchAndSetRegistrationData() {
    const gridContainer = document.querySelector('.ag-body-viewport');
    const savedScrollTop = gridContainer ? gridContainer.scrollTop : 0;
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
        await this.getRowData(data);
        this.filterRegistrationDetails();

        if (gridContainer) gridContainer.scrollTop = savedScrollTop;
        if (this.gridApi && typeof this.gridApi.paginationGoToPage === 'function') {
          try { this.gridApi.paginationGoToPage(savedPage); } catch (_) {}
        }

        if (!this.state.isAlertShown) {
          await this.anomalitiesAlert(data);
          this.setState({ isAlertShown: true });
        }
        this.props.closePopup();
      }
    );
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

  anomalitiesAlert = (data) => {
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

    if (anomalies.length === 0) return;

    const seen = new Set();
    const unique = anomalies.filter((a) => {
      const key = `${a.name}-${a.course}-${a.locations}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let msg = 'Anomalies detected:\n\n';
    unique.forEach((a, idx) => {
      msg += `S/N: ${idx + 1}\nName: ${a.name}, Course: ${a.course}\nLocations: ${a.locations}\nAnomaly Type: ${a.type}\n\n`;
    });
    alert(msg);
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
    showReceipt(participant, course, receiptNo, officialInfo, this.props.userName);

  receiptGenerator = (id, participant, course, official, value) =>
    receiptGeneratorFn(id, participant, course, official, value, this.props.userName);

  autoReceiptGenerator = (id, participant, course, official, newMethod, value) =>
    autoReceiptGeneratorFn(id, participant, course, official, newMethod, value, this.props.userName);

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

  // ── AG-Grid column definitions ────────────────────────────────────────────

  getColumnDefs = (optionalRowData = null) => {
    const { role, siteIC, selectedCourseType, userEmail } = this.props;
    const isReadOnly          = isReadOnlyUser(userEmail);
    const canEdit             = true;
    const canSocialWorkerEdit = () => true;
    const canSiteInChargeEdit = () => true;

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

    const columnDefs = [
      {
        headerName: 'S/N',
        field: 'sn',
        width: 100,
        pinned: 'left',
        cellRenderer: SNRenderer,
      },
      {
        headerName: 'Name',
        field: 'name',
        width: 300,
        editable: (params) => canEdit || canSocialWorkerEdit(params) || canSiteInChargeEdit(params),
        pinned: 'left',
      },
      {
        headerName: 'Contact Number',
        field: 'contactNo',
        width: 250,
        editable: (params) => canEdit || canSocialWorkerEdit(params) || canSiteInChargeEdit(params),
        pinned: 'left',
      },
      {
        headerName: 'Course Name',
        field: 'course',
        minWidth: 1200,
        flex: 4,
      },
      {
        headerName: 'Course Mode',
        field: 'courseMode',
        width: 200,
      },
      {
        headerName: 'Course Duration',
        field: 'courseDuration',
        width: 500,
        cellRenderer: (params) =>
          params.value || params.data?.courseInfo?.courseDuration || '',
      },
      {
        headerName: 'Course Time',
        field: 'courseTime',
        width: 500,
      },
      {
        headerName: 'Payment Method',
        field: 'paymentMethod',
        cellRenderer: PaymentMethodRenderer,
        editable: false,
        width: 500,
        hide: shouldHidePaymentColumns,
      },
      {
        headerName: 'Confirmation Status',
        field: 'confirmed',
        cellRenderer: SlideButtonRenderer,
        editable: false,
        width: 300,
        cellStyle: (params) =>
          params.data.paymentMethod !== 'SkillsFuture'
            ? { pointerEvents: 'none', opacity: 0 }
            : {},
        hide: shouldHidePaymentColumns,
      },
      {
        headerName: 'Receipt/Invoice Number',
        field: 'recinvNo',
        width: 600,
        hide: shouldHidePaymentColumns,
      },
      {
        headerName: 'Payment Date',
        field: 'paymentDate',
        width: 350,
        editable: (params) => canEdit || canSocialWorkerEdit(params) || canSiteInChargeEdit(params),
        hide: shouldHidePaymentColumns,
      },
      {
        headerName: 'Refunded Date',
        field: 'refundedDate',
        width: 350,
        editable: (params) => canEdit || canSocialWorkerEdit(params) || canSiteInChargeEdit(params),
        hide: shouldHidePaymentColumns,
      },
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
              ? ['Pending', 'Generating SkillsFuture Invoice', 'SkillsFuture Done', 'Cancelled', 'Withdrawn', 'Refunded']
              : ['Pending', 'Paid', 'Cancelled', 'Withdrawn', 'Refunded', 'Not Successful'];
          } else if (
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
            options = base.filter((s) => s !== 'Withdrawn' && s !== 'Refunded');
          } else if (paymentStatus === 'Paid') {
            options = base.filter((s) => s !== 'Cancelled' && s !== 'Refunded');
          } else if (paymentStatus === 'Withdrawn') {
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
      },
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
      },
      {
        headerName: 'Remarks',
        field: 'remarks',
        width: 900,
        editable: true,
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
        this.props.showUpdatePopup('In Progress... Please wait...');

        if (receiptInvoice) {
          await this.receiptShown(participantInfo, courseInfo, receiptInvoice, officialInfo);
          this.props.closePopup();
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
            await this.receiptShown(participantInfo, viewCourse, generatedNo, officialInfo);
            await this.refreshChild();
          } else {
            this.props.showUpdatePopup('Unable to auto-generate receipt/invoice for this row. Please ensure payment status/method is valid.');
          }

          this.props.closePopup();
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
      showUpdatePopup:      this.props.showUpdatePopup,
      closePopup:           this.props.closePopup,
      updateWooCommerce:    this.updateWooCommerceForRegistrationPayment,
      autoReceiptGenerator: this.autoReceiptGenerator,
      receiptGenerator:     this.receiptGenerator,
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
        if (columnField === 'paymentMethod' || columnName === 'Payment Method') {
          await handlePaymentMethodChange(appliedEvent, context);
        } else if (columnField === 'confirmed' || columnName === 'Confirmation Status') {
          await handleConfirmationStatusChange(appliedEvent, context);
        } else if (
          columnField === 'paymentStatus' ||
          columnName === 'Registration and Payment Status' ||
          columnName === 'Registration Status' ||
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

        this._applyLiveNotifierRowUpdate({
          registrationId,
          field: columnField,
          value: appliedEvent?.value,
          resetRemarks: shouldUseReasonForRemarks,
        });

        if (registrationId) {
          const nextRow = {
            ...(liveRowsById.get(String(registrationId)) || latestRowData || {}),
            [columnField]: appliedEvent?.value,
          };

          if (columnField === 'paymentMethod' && (appliedEvent?.value === 'Cash' || appliedEvent?.value === 'PayNow')) {
            nextRow.paymentStatus = 'Paid';
            this._applyLiveNotifierRowUpdate({
              registrationId,
              field: 'paymentStatus',
              value: 'Paid',
            });
          }

          if (columnField === 'confirmed' && nextRow.paymentMethod === 'SkillsFuture') {
            nextRow.paymentStatus = 'Generating SkillsFuture Invoice';
            this._applyLiveNotifierRowUpdate({
              registrationId,
              field: 'paymentStatus',
              value: 'Generating SkillsFuture Invoice',
            });
          }

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

    const rowCourseType = event?.data?.courseInfo?.courseType || event?.data?.course?.courseType || '';
    if (shouldRequireApprovalForCourse(this.props.userEmail, rowCourseType)) {
      // For read-only users: intercept — lift popup to homePage
      this.setState({ pendingChange: event });
      if (this.props.onApprovalRequired) {
        this.props.onApprovalRequired(event, this._commitPendingChange, this._cancelPendingChange);
      }
      return;
    }

    if (isNsaNotifier(this.props.userEmail)) {
      await this._notifyNsaChange(event);
      this._revertNotifierEditedCell(event);
      return;
    }

    console.log('Cell value changed:', {
      column:   event.colDef.headerName,
      oldValue: event.oldValue,
      newValue: event.value,
      data:     event.data,
    });

    const columnName = event.colDef.headerName;
    const context    = this._buildCellHandlerContext();

    try {
      if (columnName === 'Payment Method') {
        await handlePaymentMethodChange(event, context);
      } else if (columnName === 'Confirmation Status') {
        await handleConfirmationStatusChange(event, context);
      } else if (
        columnName === 'Registration and Payment Status' ||
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

      await this._notifyNsaChange(event);
      this.refreshChild();
    } catch (error) {
      console.error('Error in onCellValueChanged:', error);
      this.props.closePopup();
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
      await sendNsaApprovalEmail({
        fromName: this.props.userName || 'Unknown',
        fromEmail: this.props.userEmail || '',
        currentDate,
        currentTime,
        allChanges,
        additionalNotes: '',
      });

      await this._refreshApprovalStatusList();

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

  refreshChild = async () => {
    const { language } = this.props;
    const gridContainer = document.querySelector('.ag-body-viewport');
    const savedScrollTop = gridContainer ? gridContainer.scrollTop : 0;

    try {
      const data = await this.fetchCourseRegistrations(language);
      this.setState({ originalData: data || [], registerationDetails: data || [] }, () => {
        this.getRowData(data || []);
        this.filterRegistrationDetails();
        setTimeout(() => {
          if (gridContainer) gridContainer.scrollTop = savedScrollTop;
        }, 100);
        this.props.closePopup();
      });
    } catch (error) {
      console.error('Error in refreshChild:', error);
      this.props.closePopup();
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  filterRegistrationDetails() {
    const {
      section, selectedLocation, selectedCourseType,
      selectedCourseName, searchQuery, selectedQuarter,
    } = this.props;

    if (section && section !== 'registration') return;

    const { originalData } = this.state;
    if (!originalData?.length) {
      this.setState({ registerationDetails: [], rowData: [] });
      return;
    }

    const q = (searchQuery || '').toLowerCase().trim();

    let filtered = this._filterByRoleCourseAccess([...(originalData || [])]);

    if (selectedLocation && selectedLocation !== 'All Locations') {
      filtered = filtered.filter((d) => d.course?.courseLocation === selectedLocation);
    }
    if (selectedCourseType && selectedCourseType !== 'All Courses Types') {
      const expected = selectedCourseType.toLowerCase().trim();
      filtered = filtered.filter(
        (d) => (d.course?.courseType || '').toLowerCase().trim() === expected
      );
    }
    if (selectedCourseName && selectedCourseName !== 'All Courses Name') {
      filtered = filtered.filter((d) => d.course?.courseEngName === selectedCourseName);
    }
    if (selectedQuarter && selectedQuarter !== 'All Quarters') {
      filtered = filtered.filter(
        (d) => getQuarterFromDuration(d.course?.courseDuration) === selectedQuarter
      );
    }
    if (q) {
      filtered = filtered.filter((d) => {
        const fields = [
          d.participant?.name, d.participant?.nric, d.participant?.contactNumber,
          d.participant?.email, d.course?.courseLocation, d.course?.courseType,
          d.course?.courseEngName, d.course?.courseChiName, d.course?.courseDuration,
          d.course?.payment, d.status, d.official?.receiptNo,
          d.spouse?.name, d.marriageDetails?.maritalStatus, d.marriageDetails?.marriageDuration,
          d.marriageDetails?.housingType, d.marriageDetails?.typeOfMarriage,
          d.spouse?.nric, d.spouse?.mobile, d.spouse?.email,
          d.marriageDetails?.grossMonthlyIncome, d.marriageDetails?.hasChildren,
          d.marriageDetails?.howFoundOut, d.marriageDetails?.sourceOfReferral,
        ];
        return fields.some((f) => (f || '').toString().toLowerCase().includes(q));
      });
    }

    const rowData   = filtered.map((item, index) => mapRegistrationToRowData(item, index));
    const newColDefs = this.getColumnDefs(rowData);

    // Keep dropdown options cascading by selection order:
    // Type -> Location -> Quarter -> Course
    const base = this._filterByRoleCourseAccess(this.state.originalData || []);
    const types = getAllTypes(base);
    const byType = this._filterByCourseType(base, selectedCourseType);
    const locations = getAllLocations(byType);
    const byLoc = this._filterByLocation(byType, selectedLocation);
    const quarters = getAllQuarters(byLoc);
    const byQtr = this._filterByQuarter(byLoc, selectedQuarter);
    const names = getAllNames(byQtr);
    this.props.passDataToParent(locations, types, names, quarters);

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
    isNsaNotifierUser: isNsaNotifier(this.props.userEmail),
    onNSAApprovalRequest: this.props.onNSAApprovalRequest,
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

  requestNSAApproval = (rowData, columnName) => {
    const now  = new Date();
    const pad  = (n) => String(n).padStart(2, '0');
    const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const valueMap = {
      Name: rowData?.participantInfo?.name || rowData?.name || '',
      'Contact Number': rowData?.contactNo || rowData?.participantInfo?.contactNumber || '',
      'Payment Date': rowData?.paymentDate || '',
      'Refunded Date': rowData?.refundedDate || '',
      Remarks: rowData?.remarks || '',
      'Payment Status': rowData?.paymentStatus || '',
      'Registration Status': rowData?.paymentStatus || '',
      'Registration and Payment Status': rowData?.paymentStatus || '',
      Confirmation: rowData?.confirmed ? 'Confirmed' : 'Not Confirmed',
      'Confirmation Status': rowData?.confirmed ? 'Confirmed' : 'Not Confirmed',
      'Payment Method': rowData?.paymentMethod || '',
    };

    this.props.onNSAApprovalRequest({
      columnName,
      currentValue: valueMap[columnName] || '',
      currentDate: date,
      currentTime: time,
      registrationId: rowData?.id || '',
      sn: rowData?.sn || '',
      participantName: rowData?.participantInfo?.name || rowData?.name || '',
      contactNo: rowData?.contactNo || rowData?.participantInfo?.contactNumber || '',
      courseName: rowData?.courseInfo?.courseEngName || rowData?.course || '',
      courseLocation: rowData?.courseInfo?.courseLocation || rowData?.location || '',
      courseType: rowData?.courseInfo?.courseType || 'NSA',
      paymentMethod: rowData?.paymentMethod || '',
      paymentStatus: rowData?.paymentStatus || '',
      paymentDate: rowData?.paymentDate || '',
      refundedDate: rowData?.refundedDate || '',
      remarks: rowData?.remarks || '',
      confirmed: rowData?.confirmed ?? null,
    });
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

    return (
      <div className="registration-payment-details-wrapper">
        <div className="registration-payment-details-heading">
          <h2>Registration &amp; Payment Table</h2>
        </div>

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
              ref={this.gridRef}
              rowData={this.state.rowData}
              columnDefs={this.state.columnDefs}
              rowSelection="multiple"
              onGridReady={this.onGridReady}
              onSelectionChanged={this.onSelectionChanged}
              onCellValueChanged={this.onCellValueChanged}
              stopEditingWhenCellsLoseFocus={true}
              onCellEditingStopped={(params) => {
                params.api.refreshCells({
                  rowNodes: [params.node],
                  columns: [params.column.getId()],
                  force: true,
                });
              }}
              onCellClicked={this.handleValueClick}
              suppressRowClickSelection={true}
              pagination={true}
              paginationPageSize={this.state.rowData.length}
              domLayout="normal"
              rowHeight={90}
              getRowStyle={this.getRowStyle}
              context={{ 
                componentInstance: this, 
                isReadOnly: isReadOnlyUser(this.props.userEmail)
              }}
            />
          </div>
        </div>

        {/* ApprovalPopup is rendered in homePage.jsx */}

        {/* ── Expanded Row Detail ────────────────────────────────── */}
        {expandedRowIndex !== null &&
          this.state.rowData?.length > 0 &&
          expandedRowIndex < this.state.rowData.length && (
            <div className="registration-payment-details-expanded-row">
              <ExpandedRowDetail rowData={this.state.rowData[expandedRowIndex]} />
            </div>
          )}
      </div>
    );
  }
}

export default RegistrationPaymentSection;
