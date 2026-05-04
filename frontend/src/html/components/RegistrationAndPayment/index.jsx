import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import '../../../css/sub/registrationPaymentDetails.css';
import '../../../css/ag-grid-custom-theme.css';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { io } from 'socket.io-client';

// Audit logging
import {
  logRegistrationUpdate,
  logRegistrationBulkUpdate,
  logExportAction,
  logReceiptGeneration,
  logMessageSend,
} from '../../../utils/auditLog';

// Constants / helpers
import getCourseReferenceCode from '../../constants/courseReferenceMap';

// Sub-components
import BulkUpdateModal        from './components/BulkUpdateModal';
import ExpandedRowDetail      from './components/ExpandedRowDetail';
import SlideButtonRenderer    from './components/SlideButtonRenderer';
import PaymentMethodRenderer  from './components/PaymentMethodRenderer';
import PaymentStatusRenderer  from './components/PaymentStatusRenderer';
import SelectAllHeader        from './components/SelectAllHeader';
import ActionButtonsRow       from './components/ActionButtonsRow';

// Utilities
import {
  convertDateFormat1,
  convertDateFormat3,
  convertDateToYYYYMMDD,
  getCurrentDateTime,
  formatDateToDDMMYYYY,
  formatDateToDDMMYYYY1,
  formatDateToDDMMYYYY2,
} from './utils/dateUtils';
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
  bulkUpdateRegistrations,
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

// ─────────────────────────────────────────────────────────────────────────────

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
      bulkUpdateStatus: '',
      bulkUpdateMethod: '',
    };
    this.tableRef = React.createRef();
    this.gridRef  = React.createRef();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async componentDidMount() {
    await this.fetchAndSetRegistrationData();

    this.socket = io(NODE_BASE_URL);
    this.socket.on('registration', () => {
      console.log('Socket: registration event received – refreshing data');
      this.fetchAndSetRegistrationData();
    });
  }

  componentWillUnmount() {
    if (this.socket) this.socket.disconnect();
  }

  componentDidUpdate(prevProps) {
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
    const data = Array.from(unique.values());

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

  exportToLOP = async () => {
    try {
      const { selectedRows } = this.state;
      if (!selectedRows.length) {
        return this.props.warningPopUpMessage('No rows selected. Please select rows to export.');
      }

      const firstType = selectedRows[0]?.courseInfo?.courseType;
      let filePath, outputFileName;

      if (firstType === 'ILP') {
        const [startDate] = selectedRows[0].courseInfo.courseDuration.split(' - ');
        filePath       = '/external/OSG ILP List of participants (20250401).xlsx';
        outputFileName = `OSG ILP List of participants (20250401) as of ${convertDateFormat3(startDate)}.xlsx`;
      } else {
        filePath       = '/external/OSG NSA List of participants (20250401).xlsx';
        outputFileName = `OSG NSA List of participants (20250401) as of ${getCurrentDateTime()}.xlsx`;
      }

      const response = await fetch(filePath);
      if (!response.ok) return this.props.warningPopUpMessage('Error fetching the Excel file.');

      const workbook   = new ExcelJS.Workbook();
      await workbook.xlsx.load(await response.arrayBuffer());

      const sourceSheet = workbook.getWorksheet('LOP');
      if (!sourceSheet) return this.props.warningPopUpMessage("Sheet 'LOP' not found!");

      const originalRow = sourceSheet.getRow(9);
      const startRow    = 9;

      const filteredRows = selectedRows
        .filter((row) =>
          firstType === 'NSA'
            ? row.paymentStatus === 'Paid'
            : row.paymentStatus === 'Confirmed'
        )
        .sort((a, b) =>
          a.participantInfo.name.trim().toLowerCase().localeCompare(
            b.participantInfo.name.trim().toLowerCase()
          )
        );

      filteredRows.forEach((detail, index) => {
        const rowIndex  = startRow + index;
        const newDataRow = sourceSheet.getRow(rowIndex);
        newDataRow.height = originalRow.height;

        if (firstType === 'NSA') {
          sourceSheet.getCell(`A${rowIndex}`).value = index + 1;
          sourceSheet.getCell(`B${rowIndex}`).value = detail.participantInfo.name;
          sourceSheet.getCell(`C${rowIndex}`).value = detail.participantInfo.nric;
          sourceSheet.getCell(`D${rowIndex}`).value = detail.participantInfo.residentialStatus.substring(0, 2);

          const dob = detail.participantInfo.dateOfBirth;
          if (dob) {
            const [d, m, y] = dob.split('/');
            sourceSheet.getCell(`E${rowIndex}`).value = d?.trim();
            sourceSheet.getCell(`F${rowIndex}`).value = m?.trim();
            sourceSheet.getCell(`G${rowIndex}`).value = y?.trim();
          }

          sourceSheet.getCell(`H${rowIndex}`).value = detail.participantInfo.gender.split(' ')[0];
          sourceSheet.getCell(`I${rowIndex}`).value = detail.participantInfo.race.split(' ')[0][0];
          sourceSheet.getCell(`J${rowIndex}`).value = detail.participantInfo.contactNumber;
          sourceSheet.getCell(`K${rowIndex}`).value = detail.participantInfo.email;
          sourceSheet.getCell(`L${rowIndex}`).value = detail.participantInfo.postalCode;

          const educationValue = detail.participantInfo.educationLevel
            .replace(/[\u4e00-\u9fa5]+/g, '')
            .replace(/No Formal Education.*/, 'No formal education')
            .replace(/Primary.*/, 'Primary')
            .replace(/Secondary.*/, 'Secondary')
            .replace(/Post-Secondary.*|Post Secondary.*/, 'Post Secondary')
            .replace(/Diploma.*/, 'Diploma')
            .replace(/Bachelor'?s Degree.*/, "Bachelor's Degree")
            .replace(/Master'?s Degree.*/, 'Masters/Doctorate')
            .replace(/Masters.*/, 'Masters/Doctorate')
            .replace(/Others?.*/, 'Others')
            .trim();
          sourceSheet.getCell(`M${rowIndex}`).value = educationValue;

          const workParts = detail.participantInfo.workStatus.split(' ');
          sourceSheet.getCell(`N${rowIndex}`).value =
            workParts.length === 3 ? workParts[0] + ' ' + workParts[1] : workParts[0];

          const courseEngName  = detail.courseInfo.courseEngName;
          const courseCode     = getCourseReferenceCode(courseEngName);
          sourceSheet.getCell(`O${rowIndex}`).value = courseCode.trim();

          const languageSuffixes = ['Mandarin', 'English', 'Malay'];
          let courseNameForP = courseEngName;
          for (const sep of [' – ', ' - ']) {
            if (courseEngName.includes(sep)) {
              const parts    = courseEngName.split(sep);
              const lastPart = parts[parts.length - 1].trim();
              if (languageSuffixes.includes(lastPart)) {
                courseNameForP = parts.slice(0, -1).join(sep);
              }
              break;
            }
          }
          sourceSheet.getCell(`P${rowIndex}`).value = courseNameForP;

          const price = parseFloat(detail.courseInfo.coursePrice.replace('$', ''));
          sourceSheet.getCell(`Q${rowIndex}`).value = `$${(price * 5).toFixed(2)}`;
          sourceSheet.getCell(`R${rowIndex}`).value = `$${(price * 4).toFixed(2)}`;

          const [sd, ed] = detail.courseInfo.courseDuration.split(' - ');
          sourceSheet.getCell(`S${rowIndex}`).value = convertDateFormat1(sd);
          sourceSheet.getCell(`T${rowIndex}`).value = convertDateFormat1(ed);
          sourceSheet.getCell(`U${rowIndex}`).value =
            detail.courseInfo.courseMode === 'Face-to-Face' ? 'F2F' : detail.courseInfo.courseMode;
          sourceSheet.getCell(`W${rowIndex}`).value = detail.courseInfo.coursePrice;
          sourceSheet.getCell(`X${rowIndex}`).value = detail.courseInfo.payment;
          sourceSheet.getCell(`AD${rowIndex}`).value = detail.officialInfo.receiptNo;
          sourceSheet.getCell(`V${rowIndex}`).value =
            detail.courseInfo.courseLocation === 'Pasir Ris West Wellness Centre' ? '510605,' : '';

          originalRow.eachCell({ includeEmpty: true }, (cell, col) => {
            newDataRow.getCell(col).style = cell.style;
          });

        } else if (firstType === 'ILP') {
          sourceSheet.getCell(`A${rowIndex}`).value = rowIndex - startRow + 1;
          sourceSheet.getCell(`B${rowIndex}`).value = detail.participantInfo.name;
          sourceSheet.getCell(`C${rowIndex}`).value = detail.participantInfo.nric;
          sourceSheet.getCell(`D${rowIndex}`).value = detail.participantInfo.residentialStatus.substring(0, 2);

          const dob = detail.participantInfo.dateOfBirth;
          if (dob) {
            const [, , y] = dob.split('/');
            sourceSheet.getCell(`E${rowIndex}`).value = y?.trim();
          }

          sourceSheet.getCell(`F${rowIndex}`).value = detail.participantInfo.gender.split(' ')[0];
          sourceSheet.getCell(`G${rowIndex}`).value = detail.participantInfo.race.split(' ')[0][0];
          sourceSheet.getCell(`H${rowIndex}`).value = detail.participantInfo.contactNumber;
          sourceSheet.getCell(`I${rowIndex}`).value = detail.participantInfo.email;

          const educationValue = detail.participantInfo.educationLevel
            .replace(/[\u4e00-\u9fa5]+/g, '')
            .replace(/No Formal Education.*/, 'No formal education')
            .replace(/Primary.*/, 'Primary')
            .replace(/Secondary.*/, 'Secondary')
            .replace(/Post-Secondary.*|Post Secondary.*/, 'Post Secondary')
            .replace(/Diploma.*/, 'Diploma')
            .replace(/Bachelor'?s Degree.*/, "Bachelor's Degree")
            .replace(/Master'?s Degree.*/, 'Masters/Doctorate')
            .replace(/Masters.*/, 'Masters/Doctorate')
            .replace(/Others?.*/, 'Others')
            .trim();
          sourceSheet.getCell(`J${rowIndex}`).value = educationValue;
          sourceSheet.getCell(`K${rowIndex}`).value = detail.courseInfo.courseEngName;
          sourceSheet.getCell(`L${rowIndex}`).value = '';

          const [sd, ed] = detail.courseInfo.courseDuration.split(' - ');
          sourceSheet.getCell(`M${rowIndex}`).value = convertDateFormat1(sd);
          sourceSheet.getCell(`N${rowIndex}`).value = convertDateFormat1(ed);
          sourceSheet.getCell(`O${rowIndex}`).value =
            detail.courseInfo.courseMode === 'Face-to-Face' ? 'F2F' : detail.courseInfo.courseMode;

          originalRow.eachCell({ includeEmpty: true }, (cell, col) => {
            newDataRow.getCell(col).style = cell.style;
          });
        }
      });

      if (firstType === 'NSA') {
        const total = filteredRows.reduce((sum, item) => {
          const numeric = parseFloat((item.courseInfo.coursePrice || '$0').replace('$', ''));
          return sum + (isNaN(numeric) ? 0 : numeric);
        }, 0);
        sourceSheet.getCell('R5').value = `$${total.toFixed(2)}`;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        outputFileName
      );

      await logExportAction({
        userName: this.props.userName,
        module: 'Registration And Payment',
        actionType: 'Export to LOP',
        recordCount: filteredRows.length,
        additionalInfo: `Course Type: ${firstType}`,
        records: filteredRows.map((row, idx) => ({
          sn: row.sn || idx + 1,
          name: row.participantInfo?.name || 'Unknown',
          contactNumber: row.participantInfo?.contactNumber || 'N/A',
          courseName: row.courseInfo?.courseEngName || 'N/A',
        })),
      });
    } catch (error) {
      console.error('Error exporting LOP:', error);
      this.props.warningPopUpMessage('An error occurred during export.');
    }
  };

  exportToMarriagePreparationProgramme = async () => {
    try {
      const { selectedRows } = this.state;
      if (!selectedRows.length) {
        return this.props.warningPopUpMessage('No rows selected. Please select rows to export.');
      }

      const firstType = selectedRows[0]?.courseInfo?.courseType;
      if (firstType !== 'Marriage Preparation Programme') return;

      const filePath       = '/external/default-template-Marriage_Preparation_Programme.xlsx';
      const outputFileName = `default-template-Marriage_Preparation_Programme as of ${getCurrentDateTime()}.xlsx`;

      const response = await fetch(filePath);
      if (!response.ok) return this.props.warningPopUpMessage('Error fetching the Excel file.');

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await response.arrayBuffer());

      const sourceSheet = workbook.getWorksheet('Template');
      if (!sourceSheet) return this.props.warningPopUpMessage("Sheet 'Template' not found!");

      const originalRow = sourceSheet.getRow(4);
      const startRow    = 4;

      const filteredRows = selectedRows
        .filter((row) => row.paymentStatus === 'Paid')
        .sort((a, b) =>
          a.participantInfo.name.trim().toLowerCase().localeCompare(
            b.participantInfo.name.trim().toLowerCase()
          )
        );

      filteredRows.forEach((detail, index) => {
        const rowIndex   = startRow + index;
        const newDataRow = sourceSheet.getRow(rowIndex);
        newDataRow.height = originalRow.height;

        sourceSheet.getCell(`C${rowIndex}`).value = detail.participantInfo.nric;
        sourceSheet.getCell(`D${rowIndex}`).value = detail.participantInfo.name;
        sourceSheet.getCell(`E${rowIndex}`).value = detail.participantInfo.email;
        sourceSheet.getCell(`F${rowIndex}`).value = detail.participantInfo.contactNumber;
        sourceSheet.getCell(`G${rowIndex}`).value = detail.courseInfo.courseEngName;
        sourceSheet.getCell(`J${rowIndex}`).value = convertDateToYYYYMMDD(detail.participantInfo.dateOfBirth);
        sourceSheet.getCell(`K${rowIndex}`).value = detail.participantInfo.residentialStatus;
        sourceSheet.getCell(`L${rowIndex}`).value = detail.participantInfo.gender;
        sourceSheet.getCell(`M${rowIndex}`).value = detail.participantInfo.race;
        sourceSheet.getCell(`N${rowIndex}`).value = detail.marriageDetails?.maritalStatus;
        sourceSheet.getCell(`O${rowIndex}`).value = detail.participantInfo.postalCode;
        sourceSheet.getCell(`P${rowIndex}`).value = detail.participantInfo.educationLevel;
        sourceSheet.getCell(`Q${rowIndex}`).value = detail.marriageDetails?.housingType;
        sourceSheet.getCell(`R${rowIndex}`).value = detail.marriageDetails?.grossMonthlyIncome;
        sourceSheet.getCell(`S${rowIndex}`).value = detail.marriageDetails?.marriageDuration;
        sourceSheet.getCell(`T${rowIndex}`).value = detail.marriageDetails?.typeOfMarriage;
        sourceSheet.getCell(`U${rowIndex}`).value = detail.marriageDetails?.hasChildren;
        sourceSheet.getCell(`V${rowIndex}`).value = detail.spouse?.name;
        sourceSheet.getCell(`W${rowIndex}`).value = detail.spouse?.nric;
        sourceSheet.getCell(`X${rowIndex}`).value = convertDateToYYYYMMDD(detail.spouse?.dateOfBirth);
        sourceSheet.getCell(`Y${rowIndex}`).value = detail.spouse?.residentialStatus;
        sourceSheet.getCell(`Z${rowIndex}`).value = detail.spouse?.sex;
        sourceSheet.getCell(`AA${rowIndex}`).value = detail.spouse?.ethnicity;
        sourceSheet.getCell(`AB${rowIndex}`).value = detail.spouse?.maritalStatus;
        sourceSheet.getCell(`AC${rowIndex}`).value = detail.spouse?.postalCode;
        sourceSheet.getCell(`AD${rowIndex}`).value = detail.spouse?.mobile;
        sourceSheet.getCell(`AE${rowIndex}`).value = detail.spouse?.email;
        sourceSheet.getCell(`AF${rowIndex}`).value = detail.spouse?.education;
        sourceSheet.getCell(`AG${rowIndex}`).value = detail.spouse?.housingType;
        sourceSheet.getCell(`AH${rowIndex}`).value = detail.marriageDetails?.howFoundOut;
        sourceSheet.getCell(`AI${rowIndex}`).value = detail.marriageDetails?.howFoundOutOthers;
        sourceSheet.getCell(`AJ${rowIndex}`).value = detail.marriageDetails?.sourceOfReferral;
        sourceSheet.getCell(`AK${rowIndex}`).value = detail.consent?.marriagePrepConsent1
          ? 'I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out in the link above'
          : '';
        sourceSheet.getCell(`AL${rowIndex}`).value = detail.consent?.marriagePrepConsent2
          ? 'I confirm that I have read and understood the Terms of Consent as set out in the link above'
          : '';
      });

      // Auto-fit column widths, capped for consent columns
      sourceSheet.columns.forEach((col) => {
        let max = 0;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 0;
          if (len > max) max = len;
        });
        col.width = Math.min(Math.max(max + 2, 10), 100);
      });
      if (sourceSheet.getColumn('AK')) sourceSheet.getColumn('AK').width = 150;
      if (sourceSheet.getColumn('AL')) sourceSheet.getColumn('AL').width = 150;

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        outputFileName
      );

      await logExportAction({
        userName: this.props.userName,
        module: 'Registration And Payment',
        actionType: 'Export to Marriage Preparation Programme',
        recordCount: filteredRows.length,
        additionalInfo: '',
        records: filteredRows.map((row, idx) => ({
          sn: row.sn || idx + 1,
          name: row.participantInfo?.name || 'Unknown',
          contactNumber: row.participantInfo?.contactNumber || 'N/A',
          courseName: row.courseInfo?.courseEngName || 'N/A',
        })),
      });
    } catch (error) {
      console.error('Error exporting Marriage Preparation Programme:', error);
      this.props.warningPopUpMessage('An error occurred during export.');
    }
  };

  exportAttendance = async () => {
    const { selectedRows } = this.state;

    if (!selectedRows.length) {
      return this.props.warningPopUpMessage('No rows selected. Please select rows to export.');
    }

    const firstType = selectedRows[0]?.courseInfo?.courseType;

    const filteredRows = selectedRows.filter((row) => {
      const s = row.paymentStatus;
      if (firstType === 'NSA') return s === 'Paid' || s === 'SkillsFuture Done';
      return s === 'Confirmed';
    });

    if (!filteredRows.length) {
      const msg =
        firstType === 'NSA'
          ? "No rows with payment status 'Paid' found."
          : "No rows with payment status 'Confirmed' found.";
      return this.props.warningPopUpMessage(msg);
    }

    try {
      if (firstType === 'NSA') {
        await this._exportAttendanceNSA(filteredRows);
      } else if (firstType === 'ILP') {
        await this._exportAttendanceILP(filteredRows);
      }
    } catch (error) {
      console.error('Error exporting attendance:', error);
      this.props.warningPopUpMessage('An error occurred during export: ' + error.message);
    }
  };

  _exportAttendanceNSA = async (filteredRows) => {
    const response = await fetch('/external/Attendance.xlsx');
    if (!response.ok) {
      return this.props.warningPopUpMessage('Error fetching the Excel file.');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await response.arrayBuffer());
    const sourceSheet = workbook.getWorksheet('Sheet1');
    if (!sourceSheet) return this.props.warningPopUpMessage("Sheet 'Sheet1' not found!");

    const firstRow     = filteredRows[0];
    const courseName   = firstRow.course?.courseEngName   || firstRow.courseInfo?.courseEngName   || 'Unknown Course';
    const courseLocation = firstRow.course?.courseLocation || firstRow.courseInfo?.courseLocation || 'Unknown Location';
    const courseDuration = firstRow.course?.courseDuration || firstRow.courseInfo?.courseDuration || '';
    const commenceDate   = courseDuration ? courseDuration.split('-')[0].trim() : '';

    const setHeaderCell = (ref, text) => {
      const cell = sourceSheet.getCell(ref);
      cell.value = text;
      cell.font  = { name: 'Calibri', size: 18, bold: true };
    };

    setHeaderCell('A1', `Course Title: ${courseName}`);
    setHeaderCell('A2', `Course Commencement Date: ${commenceDate}`);

    const venueMap = {
      'Tampines 253 Centre': 'Blk 253 Tampines St 21 #01-406 Singapore 521253',
      'CT Hub': 'En Community Services Society 2 Kallang Avenue CT Hub #06-14 Singapore 339407',
      'Tampines North Community Centre': 'Tampines North Community Club Blk 421 Tampines St 41 #01-132 Singapore 520420',
      'Pasir Ris West Wellness Centre': 'Pasir Ris West Wellness Centre Blk 605 Elias Road #01-200 Singapore 510605',
    };
    setHeaderCell('A3', `Venue: ${venueMap[courseLocation] || courseLocation}`);

    const sorted = [...filteredRows].sort((a, b) =>
      (a.participant?.name || a.participantInfo?.name || '').trim().toLowerCase().localeCompare(
        (b.participant?.name || b.participantInfo?.name || '').trim().toLowerCase()
      )
    );

    sorted.forEach((item, i) => {
      const rowIndex = 6 + i;
      const cellA = sourceSheet.getCell(`A${rowIndex}`);
      const cellB = sourceSheet.getCell(`B${rowIndex}`);
      cellA.value = i + 1;
      cellB.value = item.participant?.name || item.participantInfo?.name || 'Unknown';
      cellA.font  = { name: 'Calibri', size: 18, bold: true };
      cellB.font  = { name: 'Calibri', size: 18, bold: true };
    });

    // Weekly lesson columns from row 4
    const [startDateStr, endDateStr] = (courseDuration || '').split(' - ');
    let start = startDateStr ? new Date(startDateStr) : new Date();
    let end   = endDateStr   ? new Date(endDateStr)   : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      start = new Date();
      end   = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const headerRow  = sourceSheet.getRow(4);
    let   weekIndex  = 1;
    let   currentDt  = new Date(start);
    for (let col = 4; col <= 42 && currentDt <= end; col += 2) {
      const cell = headerRow.getCell(col);
      cell.value = `L${weekIndex}: ${formatDateToDDMMYYYY(currentDt)}`;
      cell.font  = { name: 'Calibri', size: 16, bold: true };
      currentDt.setDate(currentDt.getDate() + 7);
      weekIndex++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Attendance (Course) ECSS${formatDateToDDMMYYYY1(start)} ${courseName}.xlsx`
    );

    logExportAction({
      userName: this.props.userName,
      module: 'Registration And Payment',
      actionType: 'Export Attendance (NSA)',
      recordCount: filteredRows.length,
      additionalInfo: `Course: ${courseName}`,
      records: filteredRows.map((row, idx) => ({
        sn: row.sn || idx + 1,
        name: row.participantInfo?.name || 'Unknown',
        contactNumber: row.participantInfo?.contactNumber || 'N/A',
        courseName: row.courseInfo?.courseEngName || 'N/A',
      })),
    });
  };

  _exportAttendanceILP = async (filteredRows) => {
    const response = await fetch('/external/2025 ILP Course Name Site Name Date of event.xlsx');
    if (!response.ok) return this.props.warningPopUpMessage('Error fetching the Excel file.');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await response.arrayBuffer());
    const sourceSheet = workbook.getWorksheet('Sheet1');
    if (!sourceSheet) return this.props.warningPopUpMessage("Sheet 'Sheet1' not found!");

    const firstRow     = filteredRows[0];
    const courseName   = firstRow.course?.courseEngName   || firstRow.courseInfo?.courseEngName   || 'Unknown Course';
    const courseLocation = firstRow.course?.courseLocation || firstRow.courseInfo?.courseLocation || 'Unknown Location';
    const courseDuration = firstRow.course?.courseDuration || firstRow.courseInfo?.courseDuration || '';
    const commenceDate   = courseDuration ? courseDuration.split('-')[0].trim() : '';

    sourceSheet.getCell('A1').value = `Course Title: ${courseName}`;
    sourceSheet.getCell('A2').value = `Course Commencement Date: ${commenceDate}`;

    const venueMap = {
      'CT Hub': 'En Community Services Society 2 Kallang Avenue CT Hub #06-14 Singapore 339407',
      'Tampines North Community Centre': 'Tampines North Community Club Blk 421 Tampines St 41 #01-132 Singapore 520420',
      'Pasir Ris West Wellness Centre': 'Pasir Ris West Wellness Centre Blk 605 Elias Road #01-200 Singapore 510605',
    };
    sourceSheet.getCell('A3').value = `Venue: ${venueMap[courseLocation] || courseLocation}`;
    sourceSheet.getCell('C2').value = 'Tel: 67886625';
    sourceSheet.getCell('C3').value = `Submitted by: ${this.props.userName}`;
    sourceSheet.getCell('C4').value = `Date: ${formatDateToDDMMYYYY2(new Date())}`;

    const sorted = [...filteredRows].sort((a, b) =>
      (a.participant?.name || a.participantInfo?.name || '').trim().toLowerCase().localeCompare(
        (b.participant?.name || b.participantInfo?.name || '').trim().toLowerCase()
      )
    );

    sorted.forEach((item, i) => {
      const rowIndex = 6 + i;
      sourceSheet.getCell(`A${rowIndex}`).value = i + 1;
      sourceSheet.getCell(`B${rowIndex}`).value = item.participant?.name || item.participantInfo?.name || '';
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `2025 ILP ${courseName} ${courseLocation} ${commenceDate}.xlsx`
    );

    logExportAction({
      userName: this.props.userName,
      module: 'Registration And Payment',
      actionType: 'Export Attendance (ILP)',
      recordCount: filteredRows.length,
      additionalInfo: `Course: ${courseName}, Location: ${courseLocation}, Date: ${commenceDate}`,
      records: filteredRows.map((row, idx) => ({
        sn: row.sn || idx + 1,
        name: row.participantInfo?.name || 'Unknown',
        contactNumber: row.participantInfo?.contactNumber || 'N/A',
        courseName: row.courseInfo?.courseEngName || 'N/A',
      })),
    });
  };

  archiveData = async () => {
    const { registerationDetails } = this.state;
    const { selectedCourseType }   = this.props;

    if (!registerationDetails.length) {
      return alert('No data available to archive.');
    }

    try {
      const hasMarriagePrepData = registerationDetails.some(
        (d) => d.course?.courseType === 'Marriage Preparation Programme'
      );
      const includeMarriagePrep =
        (selectedCourseType === 'All Courses Types' && hasMarriagePrepData) ||
        selectedCourseType === 'Marriage Preparation Programme'                ||
        (!selectedCourseType && hasMarriagePrepData);

      const baseHeaders = [
        'S/N', 'Participant Name', 'Participant NRIC', 'Participant Residential Status',
        'Participant Race', 'Participant Gender', 'Participant Date of Birth',
        'Participant Contact Number', 'Participant Email', 'Participant Postal Code',
        'Participant Education Level', 'Participant Work Status',
        'Course Type', 'Course English Name', 'Course Chinese Name', 'Course Location',
        'Course Mode', 'Course Price', 'Course Duration', 'Payment Method',
        'Registration Date', 'Agreement', 'Payment Status', 'Confirmation Status',
        'Refunded Date', 'WhatsApp Message Sent',
        'Staff Name', 'Received Date', 'Received Time', 'Receipt/Invoice Number', 'Remarks',
      ];
      const marriagePrepHeaders = [
        'Spouse Name', 'Marital Status', 'Marriage Duration', 'Housing Type',
        'Gross Monthly Income', 'Type of Marriage', 'Has Children', 'How Found Out',
        'Source of Referral', 'Spouse NRIC', 'Spouse Contact', 'Spouse Email',
        'Spouse Sex', 'Spouse DOB', 'Spouse Ethnicity', 'Spouse Residential Status',
        'Spouse Marital Status', 'Spouse Education', 'Spouse Housing Type', 'Spouse Postal Code',
        'I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out in the link above',
        'I confirm that I have read and understood the Terms of Consent as set out in the link above',
      ];

      const headers = includeMarriagePrep
        ? [...baseHeaders, ...marriagePrepHeaders]
        : baseHeaders;

      const preparedData = [headers];

      registerationDetails.forEach((detail, index) => {
        const base = [
          index + 1,
          detail.participant.name,
          detail.participant.nric,
          detail.participant.residentialStatus,
          detail.participant.race,
          detail.participant.gender,
          detail.participant.dateOfBirth,
          detail.participant.contactNumber,
          detail.participant.email,
          detail.participant.postalCode,
          detail.participant.educationLevel,
          detail.participant.workStatus,
          detail.course.courseType,
          detail.course.courseEngName,
          detail.course.courseChiName,
          detail.course.courseLocation,
          detail.course.courseMode,
          detail.course.coursePrice,
          detail.course.courseDuration,
          detail.course.payment,
          detail.registrationDate,
          detail.agreement,
          detail.status,
          detail.official?.confirmed || false,
          detail.official?.refundedDate || '',
          detail.sendingWhatsappMessage || false,
          detail.official?.name || '',
          detail.official?.date || '',
          detail.official?.time || '',
          detail.official?.receiptNo || '',
          detail.official?.remarks || '',
        ];

        const extra = includeMarriagePrep ? [
          detail.spouse?.name            || '',
          detail.marriageDetails?.maritalStatus  || '',
          detail.marriageDetails?.marriageDuration || '',
          detail.marriageDetails?.housingType    || '',
          detail.marriageDetails?.grossMonthlyIncome || '',
          detail.marriageDetails?.typeOfMarriage || '',
          detail.marriageDetails?.hasChildren    || '',
          detail.marriageDetails?.howFoundOut    || '',
          detail.marriageDetails?.sourceOfReferral || '',
          detail.spouse?.nric            || '',
          detail.spouse?.mobile || detail.spouse?.contactNumber || '',
          detail.spouse?.email           || '',
          detail.spouse?.sex             || '',
          detail.spouse?.dob             || '',
          detail.spouse?.ethnicity       || '',
          detail.spouse?.residentialStatus || '',
          detail.spouse?.maritalStatus   || '',
          detail.spouse?.education       || '',
          detail.spouse?.housingType     || '',
          detail.spouse?.postalCode      || '',
          (detail.consent?.marriagePrepConsent1 || detail.marriagePrepConsent1)
            ? 'I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out in the link above'
            : '',
          (detail.consent?.marriagePrepConsent2 || detail.marriagePrepConsent2)
            ? 'I confirm that I have read and understood the Terms of Consent as set out in the link above'
            : '',
        ] : [];

        preparedData.push([...base, ...extra]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(preparedData);
      const wb        = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, worksheet, 'Archived Data');

      const date          = new Date();
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
      const mpSuffix      = includeMarriagePrep ? '_with_marriage_prep' : '';
      const typeSuffix    = selectedCourseType && selectedCourseType !== 'All Courses Types'
        ? `_${selectedCourseType.replace(/\s+/g, '_')}`
        : '';
      const fileName = `archived_data_${formattedDate}${mpSuffix}${typeSuffix}.xlsx`;

      const blob = new Blob(
        [XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      const link  = document.createElement('a');
      link.href   = window.URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(link.href);

      const marriagePrepCount = registerationDetails.filter(
        (d) => d.course?.courseType === 'Marriage Preparation Programme'
      ).length;

      await logExportAction({
        userName: this.props.userName,
        module: 'Registration And Payment',
        actionType: 'Archive Data',
        recordCount: registerationDetails.length,
        additionalInfo: includeMarriagePrep
          ? `Including ${marriagePrepCount} Marriage Prep records`
          : '',
        records: registerationDetails.map((row, idx) => ({
          sn: row.sn || idx + 1,
          name: row.participantInfo?.name || 'Unknown',
          contactNumber: row.participantInfo?.contactNumber || 'N/A',
          courseName: row.courseInfo?.courseEngName || row.course?.courseEngName || 'N/A',
        })),
      });

      this.props.closePopup();
      alert(
        includeMarriagePrep && marriagePrepCount > 0
          ? `Successfully archived ${registerationDetails.length} records (including ${marriagePrepCount} Marriage Prep entries).`
          : `Successfully archived ${registerationDetails.length} records.`
      );
    } catch (error) {
      console.error('Error during archive:', error);
      this.props.closePopup();
      alert('Error occurred during archive. Please try again.');
    }
  };

  // ── AG-Grid column definitions ────────────────────────────────────────────

  getColumnDefs = (optionalRowData = null) => {
    const { role, siteIC, selectedCourseType } = this.props;
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
        width: 700,
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
          params.data.paymentMethod !== 'SkillsFuture' ? { display: 'none' } : {},
        hide: shouldHidePaymentColumns,
      },
      {
        headerName: 'Receipt/Invoice Number',
        field: 'recinvNo',
        width: 300,
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
        if (receiptInvoice) {
          this.props.showUpdatePopup('In Progress... Please wait...');
          await this.receiptShown(participantInfo, courseInfo, receiptInvoice, officialInfo);
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

        await this.sendDetails(id);
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

  onCellValueChanged = async (event) => {
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

      this.refreshChild();
    } catch (error) {
      console.error('Error in onCellValueChanged:', error);
      this.props.closePopup();
    }
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

    let filtered = [...originalData];

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

    // Keep dropdown options from full dataset to avoid options disappearing mid-filter
    const base          = this.state.originalData || [];
    const allTypes      = getAllTypes(base);
    const allLocations  = getAllLocations(base);
    const allNames      = getAllNames(base);
    const allQuarters   = getAllQuarters(base);
    this.props.passDataToParent(allLocations, allTypes, allNames, allQuarters);

    this.setState(
      { registerationDetails: filtered, rowData, columnDefs: newColDefs },
      () => {
        this.debugMarriagePrepData();
        this.gridApi?.refreshCells?.();
      }
    );
  }

  // ── Bulk update ───────────────────────────────────────────────────────────

  openBulkUpdateModal = () => {
    if (!this.state.selectedRows.length) {
      return alert('Please select at least one row to update.');
    }
    this.setState({ showBulkUpdateModal: true });
  };

  closeBulkUpdateModal = () => {
    this.setState({ showBulkUpdateModal: false, bulkUpdateStatus: '', bulkUpdateMethod: '' });
  };

  handleBulkUpdate = async () => {
    const { selectedRows, bulkUpdateStatus, bulkUpdateMethod } = this.state;

    if (!bulkUpdateStatus && !bulkUpdateMethod) {
      return alert('Please select a status or payment method to update.');
    }

    this.props.showUpdatePopup(`Updating ${selectedRows.length} records... Please wait...`);

    try {
      const res = await bulkUpdateRegistrations(
        selectedRows.map((row) => ({
          id: row.id,
          paymentStatus: bulkUpdateStatus || null,
          paymentMethod: bulkUpdateMethod || null,
        })),
        this.props.userName
      );

      if (res.data.result !== true) throw new Error(res.data.message || 'Bulk update failed');

      this.closeBulkUpdateModal();

      const records = selectedRows.map((row) => ({
        sn: row.sn || 'N/A',
        name: row.participantInfo?.name || row.name || 'Unknown',
        contactNumber: row.participantInfo?.contactNumber || 'N/A',
      }));

      if (bulkUpdateStatus) {
        await logRegistrationBulkUpdate({
          userName: this.props.userName,
          module: 'Registration And Payment',
          columnName: 'Payment Status',
          newValue: bulkUpdateStatus,
          records,
        });
      }
      if (bulkUpdateMethod) {
        await logRegistrationBulkUpdate({
          userName: this.props.userName,
          module: 'Registration And Payment',
          columnName: 'Payment Method',
          newValue: bulkUpdateMethod,
          records,
        });
      }

      if (bulkUpdateStatus) {
        for (let i = 0; i < selectedRows.length; i++) {
          const row = selectedRows[i];
          this.props.showUpdatePopup(`Updating WooCommerce... Processing record ${i + 1} of ${selectedRows.length}`);
          try {
            await this.updateWooCommerceForRegistrationPayment(
              row.courseChi || row.courseInfo?.courseChiName,
              row.course    || row.courseInfo?.courseEngName,
              row.location  || row.courseInfo?.courseLocation,
              bulkUpdateStatus
            );
          } catch (e) {
            console.error(`WooCommerce update failed for row ${row.id}:`, e);
          }
        }
        this.props.showUpdatePopup(`All updates completed! ${selectedRows.length} records updated.`);
        setTimeout(() => {
          this.props.closePopup();
          alert(`Successfully updated ${selectedRows.length} records.`);
        }, 1500);
      } else {
        this.props.closePopup();
        alert(`Successfully updated ${selectedRows.length} records.`);
      }
    } catch (error) {
      console.error('Error during bulk update:', error);
      this.props.closePopup();
      alert('Error occurred during bulk update. Please try again.');
    }
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
      Confirmation: rowData?.confirmed ? 'Yes' : 'No',
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
    const { selectedRows, showBulkUpdateModal, bulkUpdateStatus, expandedRowIndex } = this.state;

    return (
      <div className="registration-payment-details-wrapper">
        <div className="registration-payment-details-heading">
          <h2>Registration &amp; Payment Table</h2>
        </div>

        {/* ── Action buttons ─────────────────────────────────────── */}
        <ActionButtonsRow
          role={this.props.role}
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
            context={{ componentInstance: this }}
          />
        </div>

        {/* ── Bulk Update Modal ──────────────────────────────────── */}
        {showBulkUpdateModal && (
          <BulkUpdateModal
            selectedRows={selectedRows}
            bulkUpdateStatus={bulkUpdateStatus}
            onStatusChange={(val) => this.setState({ bulkUpdateStatus: val })}
            onUpdate={this.handleBulkUpdate}
            onClose={this.closeBulkUpdateModal}
          />
        )}

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
