/**
 * Action button handlers for the Registration & Payment module.
 *
 * All exported functions receive a `context` object with the relevant
 * state/prop slices and callback functions:
 *
 *   context = {
 *     // From state
 *     selectedRows,            // array – currently selected grid rows
 *     registerationDetails,    // array – all rows currently displayed
 *     bulkUpdateField,         // string
 *     bulkUpdateStatus,        // string
 *     bulkUpdateMethod,        // string
 *     bulkUpdateValue,         // string
 *     // From props
 *     userName,                // string
 *     selectedCourseType,      // string
 *     warningPopUpMessage,     // fn(msg)
 *     closePopup,              // fn()
 *     showUpdatePopup,         // fn(msg)
 *     // State setters
 *     setShowBulkUpdateModal,  // fn(bool)
 *     setBulkUpdateFields,     // fn({ bulkUpdateField, bulkUpdateStatus, bulkUpdateMethod, bulkUpdateValue })
 *     // Other handlers
 *     updateWooCommerce,       // fn(chiName, engName, location, status)
 *   }
 */

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { logExportAction, logRegistrationBulkUpdate } from '../../../../utils/auditLog';
import getEcssCourseCode, { getEcssCanonicalName } from '../constants/courseCodeMapping';

import {
  convertDateFormat1,
  convertDateFormat3,
  convertDateToYYYYMMDD,
  getCurrentDateTime,
  formatDateToDDMMYYYY,
  formatDateToDDMMYYYY1,
  formatDateToDDMMYYYY2,
} from '../utils/dateUtils';

import {
  bulkUpdateRegistrations,
  updateConfirmationStatus,
  editRegistrationField,
  addRefundedDate,
  removeRefundedDate,
} from '../services/registrationApi';

// ── Export to LOP ─────────────────────────────────────────────────────────────

export async function exportToLOP(context) {
  const { selectedRows, userName, warningPopUpMessage } = context;
  try {
    if (!selectedRows.length) {
      return warningPopUpMessage('No rows selected. Please select rows to export.');
    }

    const firstType = selectedRows[0]?.courseInfo?.courseType;
    let filePath, outputFileName;

    const resolveCourseName = (courseInfo = {}) => {
      return (
        courseInfo.courseEngName ||
        courseInfo.courseName ||
        courseInfo.courseChiName ||
        ''
      ).toString().trim();
    };

    const sanitizeForFileName = (value, fallback) => {
      const cleaned = String(value || '')
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return cleaned || fallback;
    };

    if (firstType === 'ILP') {
      const [startDate] = selectedRows[0].courseInfo.courseDuration.split(' - ');
      filePath       = '/external/OSG ILP List of participants (20250401).xlsx';
      outputFileName = `OSG ILP List of participants (20250401) as of ${convertDateFormat3(startDate)}.xlsx`;
    } else {
      filePath       = '/external/OSG NSA List of participants (20250401).xlsx';
      outputFileName = `OSG NSA List of participants (20250401) as of ${getCurrentDateTime()}.xlsx`;
    }

    const response = await fetch(filePath);
    if (!response.ok) return warningPopUpMessage('Error fetching the Excel file.');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await response.arrayBuffer());

    const sourceSheet = workbook.getWorksheet('LOP');
    if (!sourceSheet) return warningPopUpMessage("Sheet 'LOP' not found!");

    const originalRow = sourceSheet.getRow(9);
    const startRow    = 9;

    const filteredRows = selectedRows
      .filter((row) =>
        firstType === 'NSA'
          ? row.paymentStatus === 'Paid' || row.paymentStatus === 'SkillsFuture Done'
          : row.paymentStatus === 'Confirmed'
      )
      .sort((a, b) =>
        a.participantInfo.name.trim().toLowerCase().localeCompare(
          b.participantInfo.name.trim().toLowerCase()
        )
      );

    const locationValues = [...new Set(
      filteredRows
        .map((row) => (row?.courseInfo?.courseLocation || '').toString().trim())
        .filter(Boolean)
    )];

    const courseNameValues = [...new Set(
      filteredRows
        .map((row) => resolveCourseName(row?.courseInfo || {}))
        .filter(Boolean)
    )];

    const locationLabel = sanitizeForFileName(
      locationValues.length === 1 ? locationValues[0] : locationValues.length > 1 ? 'Multiple Locations' : 'Unknown Location',
      'Unknown Location'
    );

    const courseNameLabel = sanitizeForFileName(
      courseNameValues.length === 1 ? courseNameValues[0] : courseNameValues.length > 1 ? 'Multiple Courses' : 'Unknown Course',
      'Unknown Course'
    );

    if (firstType === 'ILP') {
      const [startDate] = selectedRows[0].courseInfo.courseDuration.split(' - ');
      outputFileName = `OSG ILP List of participants (20250401) - ${locationLabel} - ${courseNameLabel} as of ${convertDateFormat3(startDate)}.xlsx`;
    } else {
      outputFileName = `OSG NSA List of participants (20250401) - ${locationLabel} - ${courseNameLabel} as of ${getCurrentDateTime()}.xlsx`;
    }

    for (let index = 0; index < filteredRows.length; index++) {
      const detail     = filteredRows[index];
      const rowIndex   = startRow + index;
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

        const courseEngName = resolveCourseName(detail.courseInfo);
        const price         = parseFloat(detail.courseInfo.coursePrice.replace('$', ''));

        // Course code is returned only when BOTH name and price match the Excel sheet
        const courseCode    = await getEcssCourseCode(courseEngName, price);
        const canonicalName = await getEcssCanonicalName(courseEngName, price);

        sourceSheet.getCell(`O${rowIndex}`).value = courseCode.trim();
        sourceSheet.getCell(`P${rowIndex}`).value = (canonicalName || courseEngName || '').trim();

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
        sourceSheet.getCell(`K${rowIndex}`).value = resolveCourseName(detail.courseInfo);
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
    }

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
      userName,
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
    warningPopUpMessage('An error occurred during export.');
  }
}

// ── Export to Marriage Preparation Programme ──────────────────────────────────

export async function exportToMarriagePreparationProgramme(context) {
  const { selectedRows, userName, warningPopUpMessage } = context;
  try {
    if (!selectedRows.length) {
      return warningPopUpMessage('No rows selected. Please select rows to export.');
    }

    const firstType = selectedRows[0]?.courseInfo?.courseType;
    if (firstType !== 'Marriage Preparation Programme') return;

    const filePath       = '/external/default-template-Marriage_Preparation_Programme.xlsx';
    const outputFileName = `default-template-Marriage_Preparation_Programme as of ${getCurrentDateTime()}.xlsx`;

    const response = await fetch(filePath);
    if (!response.ok) return warningPopUpMessage('Error fetching the Excel file.');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await response.arrayBuffer());

    const sourceSheet = workbook.getWorksheet('Template');
    if (!sourceSheet) return warningPopUpMessage("Sheet 'Template' not found!");

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
      userName,
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
    warningPopUpMessage('An error occurred during export.');
  }
}

// ── Export Attendance ─────────────────────────────────────────────────────────

export async function exportAttendance(context) {
  const { selectedRows, warningPopUpMessage, userName } = context;

  if (!selectedRows.length) {
    return warningPopUpMessage('No rows selected. Please select rows to export.');
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
    return warningPopUpMessage(msg);
  }

  try {
    if (firstType === 'NSA') {
      await _exportAttendanceNSA(filteredRows, userName, warningPopUpMessage);
    } else if (firstType === 'ILP') {
      await _exportAttendanceILP(filteredRows, userName, warningPopUpMessage);
    }
  } catch (error) {
    console.error('Error exporting attendance:', error);
    warningPopUpMessage('An error occurred during export: ' + error.message);
  }
}

async function _exportAttendanceNSA(filteredRows, userName, warningPopUpMessage) {
  const response = await fetch('/external/Attendance.xlsx');
  if (!response.ok) {
    return warningPopUpMessage('Error fetching the Excel file.');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.arrayBuffer());
  const sourceSheet = workbook.getWorksheet('Sheet1');
  if (!sourceSheet) return warningPopUpMessage("Sheet 'Sheet1' not found!");

  const firstRow       = filteredRows[0];
  const courseName     = firstRow.course?.courseEngName     || firstRow.courseInfo?.courseEngName     || 'Unknown Course';
  const courseLocation = firstRow.course?.courseLocation    || firstRow.courseInfo?.courseLocation    || 'Unknown Location';
  const courseDuration = firstRow.course?.courseDuration    || firstRow.courseInfo?.courseDuration    || '';
  const commenceDate   = courseDuration ? courseDuration.split('-')[0].trim() : '';
  const sanitizeForFileName = (value, fallback) => {
    const cleaned = String(value || '')
      .replace(/[\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || fallback;
  };

  const setHeaderCell = (ref, text) => {
    const cell = sourceSheet.getCell(ref);
    cell.value = text;
    cell.font  = { name: 'Calibri', size: 18, bold: true };
  };

  setHeaderCell('A1', `Course Title: ${courseName}`);
  setHeaderCell('A2', `Course Commencement Date: ${commenceDate}`);

  const venueMap = {
    'Tampines 253 Centre':              'Blk 253 Tampines St 21 #01-406 Singapore 521253',
    'CT Hub':                           'En Community Services Society 2 Kallang Avenue CT Hub #06-14 Singapore 339407',
    'Tampines North Community Centre':  'Tampines North Community Club Blk 421 Tampines St 41 #01-132 Singapore 520420',
    'Pasir Ris West Wellness Centre':   'Pasir Ris West Wellness Centre Blk 605 Elias Road #01-200 Singapore 510605',
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

  const headerRow = sourceSheet.getRow(4);
  let weekIndex   = 1;
  let currentDt   = new Date(start);
  for (let col = 4; col <= 42 && currentDt <= end; col += 2) {
    const cell = headerRow.getCell(col);
    cell.value = `L${weekIndex}: ${formatDateToDDMMYYYY(currentDt)}`;
    cell.font  = { name: 'Calibri', size: 16, bold: true };
    currentDt.setDate(currentDt.getDate() + 7);
    weekIndex++;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const safeCourseName = sanitizeForFileName(courseName, 'Unknown Course');
  const safeLocation = sanitizeForFileName(courseLocation, 'Unknown Location');
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Attendance (Course) ECSS${formatDateToDDMMYYYY1(start)} ${safeLocation} ${safeCourseName}.xlsx`
  );

  logExportAction({
    userName,
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
}

async function _exportAttendanceILP(filteredRows, userName, warningPopUpMessage) {
  const response = await fetch('/external/2025 ILP Course Name Site Name Date of event.xlsx');
  if (!response.ok) return warningPopUpMessage('Error fetching the Excel file.');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await response.arrayBuffer());
  const sourceSheet = workbook.getWorksheet('Sheet1');
  if (!sourceSheet) return warningPopUpMessage("Sheet 'Sheet1' not found!");

  const firstRow       = filteredRows[0];
  const courseName     = firstRow.course?.courseEngName     || firstRow.courseInfo?.courseEngName     || 'Unknown Course';
  const courseLocation = firstRow.course?.courseLocation    || firstRow.courseInfo?.courseLocation    || 'Unknown Location';
  const courseDuration = firstRow.course?.courseDuration    || firstRow.courseInfo?.courseDuration    || '';
  const commenceDate   = courseDuration ? courseDuration.split('-')[0].trim() : '';
  const sanitizeForFileName = (value, fallback) => {
    const cleaned = String(value || '')
      .replace(/[\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || fallback;
  };

  sourceSheet.getCell('A1').value = `Course Title: ${courseName}`;
  sourceSheet.getCell('A2').value = `Course Commencement Date: ${commenceDate}`;

  const venueMap = {
    'CT Hub':                          'En Community Services Society 2 Kallang Avenue CT Hub #06-14 Singapore 339407',
    'Tampines North Community Centre': 'Tampines North Community Club Blk 421 Tampines St 41 #01-132 Singapore 520420',
    'Pasir Ris West Wellness Centre':  'Pasir Ris West Wellness Centre Blk 605 Elias Road #01-200 Singapore 510605',
  };
  sourceSheet.getCell('A3').value = `Venue: ${venueMap[courseLocation] || courseLocation}`;
  sourceSheet.getCell('C2').value = 'Tel: 67886625';
  sourceSheet.getCell('C3').value = `Submitted by: ${userName}`;
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
  const safeCourseName = sanitizeForFileName(courseName, 'Unknown Course');
  const safeLocation = sanitizeForFileName(courseLocation, 'Unknown Location');
  const safeCommenceDate = sanitizeForFileName(commenceDate, formatDateToDDMMYYYY2(new Date()));
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `2025 ILP ${safeCourseName} ${safeLocation} ${safeCommenceDate}.xlsx`
  );

  logExportAction({
    userName,
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
}

// ── Archive Data ──────────────────────────────────────────────────────────────

export async function archiveData(context) {
  const { registerationDetails, selectedCourseType, userName, closePopup } = context;

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

    const headers      = includeMarriagePrep ? [...baseHeaders, ...marriagePrepHeaders] : baseHeaders;
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
        detail.spouse?.name                      || '',
        detail.marriageDetails?.maritalStatus    || '',
        detail.marriageDetails?.marriageDuration || '',
        detail.marriageDetails?.housingType      || '',
        detail.marriageDetails?.grossMonthlyIncome || '',
        detail.marriageDetails?.typeOfMarriage   || '',
        detail.marriageDetails?.hasChildren      || '',
        detail.marriageDetails?.howFoundOut      || '',
        detail.marriageDetails?.sourceOfReferral || '',
        detail.spouse?.nric                      || '',
        detail.spouse?.mobile || detail.spouse?.contactNumber || '',
        detail.spouse?.email                     || '',
        detail.spouse?.sex                       || '',
        detail.spouse?.dob                       || '',
        detail.spouse?.ethnicity                 || '',
        detail.spouse?.residentialStatus         || '',
        detail.spouse?.maritalStatus             || '',
        detail.spouse?.education                 || '',
        detail.spouse?.housingType               || '',
        detail.spouse?.postalCode                || '',
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
    const link    = document.createElement('a');
    link.href     = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(link.href);

    const marriagePrepCount = registerationDetails.filter(
      (d) => d.course?.courseType === 'Marriage Preparation Programme'
    ).length;

    await logExportAction({
      userName,
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

    closePopup();
    alert(
      includeMarriagePrep && marriagePrepCount > 0
        ? `Successfully archived ${registerationDetails.length} records (including ${marriagePrepCount} Marriage Prep entries).`
        : `Successfully archived ${registerationDetails.length} records.`
    );
  } catch (error) {
    console.error('Error during archive:', error);
    closePopup();
    alert('Error occurred during archive. Please try again.');
  }
}

// ── Bulk Update ───────────────────────────────────────────────────────────────

export function openBulkUpdateModal(context) {
  const { selectedRows, setShowBulkUpdateModal } = context;
  if (!selectedRows.length) {
    return alert('Please select at least one row to update.');
  }
  setShowBulkUpdateModal(true);
}

export function closeBulkUpdateModal(context) {
  const { setShowBulkUpdateModal, setBulkUpdateFields } = context;
  setShowBulkUpdateModal(false);
  setBulkUpdateFields({
    bulkUpdateField: '',
    bulkUpdateStatus: '',
    bulkUpdateMethod: '',
    bulkUpdateValue: '',
    bulkUpdateRowValues: {},
  });
}

export async function handleBulkUpdate(context) {
  const {
    selectedRows,
    bulkUpdateField,
    bulkUpdateStatus,
    bulkUpdateMethod,
    bulkUpdateValue,
    bulkUpdateRowValues,
    userName,
    showUpdatePopup,
    closePopup,
    setShowBulkUpdateModal,
    setBulkUpdateFields,
    updateWooCommerce,
    onNSAApprovalRequest,
    onApprovalQueueRequest,
    onNotifierQueueRequest,
    isNsaNotifierUser = false,
    reason = '',
  } = context;

  const field = bulkUpdateField || '';
  const fieldLabelMap = {
    paymentStatus: 'Payment Status',
    paymentMethod: 'Payment Method',
    confirmationStatus: 'Confirmation Status',
    paymentDate: 'Payment Date',
    refundedDate: 'Refunded Date',
    remarks: 'Remarks',
    contactNo: 'Contact Number',
    name: 'Name',
  };

  const chosenValue =
    field === 'paymentStatus'
      ? bulkUpdateStatus
      : field === 'paymentMethod'
        ? bulkUpdateMethod
        : bulkUpdateValue;

  const rowValues = bulkUpdateRowValues || {};
  const valueForRow = (row) => rowValues[String(row?.id || '')];
  const reasonPayload = reason && typeof reason === 'object' ? reason : null;
  const reasonByRow = reasonPayload?.reasonsByRow || {};
  const getReasonForRow = (row, fallback = '') => {
    const rowKey = String(row?.id || row?.sn || '');
    const keyed = reasonByRow[String(row?.id || '')] || reasonByRow[rowKey];
    if (keyed && typeof keyed === 'object') {
      return String(keyed.reason || '').trim();
    }
    if (typeof reason === 'string') {
      return String(reason || '').trim();
    }
    return String(fallback || '').trim();
  };
  const resolvedStatusForRow = (row) => {
    const rowValue = String(valueForRow(row) ?? '').trim();
    if (rowValue) return rowValue;
    return String(bulkUpdateStatus || '').trim();
  };
  const resolvedMethodForRow = (row) => {
    const rowValue = String(valueForRow(row) ?? '').trim();
    if (rowValue) return rowValue;
    return String(bulkUpdateMethod || '').trim();
  };
  let targetRows = selectedRows;

  if (!field) {
    return alert('Please select a field to update.');
  }

  if (field === 'paymentStatus') {
    targetRows = selectedRows.filter((row) => String(resolvedStatusForRow(row)).trim() !== '');
    if (!targetRows.length) {
      return alert('Please select at least one payment status (default or per row).');
    }
  } else if (field === 'paymentMethod') {
    targetRows = selectedRows.filter((row) => String(resolvedMethodForRow(row)).trim() !== '');
    if (!targetRows.length) {
      return alert('Please select at least one payment method (default or per row).');
    }
  }

  if (field !== 'paymentStatus' && field !== 'paymentMethod') {
    targetRows = selectedRows.filter((row) => {
      const v = valueForRow(row);
      return String(v ?? '').trim() !== '';
    });

    if (!targetRows.length) {
      return alert('Please enter at least one row value to update.');
    }
  }

  const getCurrentValue = (row) =>
    field === 'paymentStatus' ? (row?.paymentStatus || '') :
    field === 'paymentMethod' ? (row?.paymentMethod || '') :
    field === 'confirmationStatus' ? (row?.confirmed ? 'Confirmed' : 'Not Confirmed') :
    field === 'remarks' ? (row?.remarks || '') :
    field === 'paymentDate' ? (row?.paymentDate || '') :
    field === 'refundedDate' ? (row?.refundedDate || '') :
    field === 'contactNo' ? (row?.contactNo || '') :
    field === 'name' ? (row?.participantInfo?.name || row?.name || '') : '';

  const getNextValue = (row) =>
    field === 'paymentStatus' ? (valueForRow(row) || bulkUpdateStatus || '') :
    field === 'paymentMethod' ? (valueForRow(row) || bulkUpdateMethod || '') :
    field === 'confirmationStatus' ? (valueForRow(row) || bulkUpdateValue) :
    valueForRow(row) || bulkUpdateValue || '';

  const isNsaRow = (row) => {
    const courseType = String(row?.courseInfo?.courseType || row?.courseType || '').trim().toUpperCase();
    return courseType === 'NSA';
  };

  const nsaRows = targetRows.filter(isNsaRow);
  const directRows = targetRows.filter((row) => !isNsaRow(row));

  if (isNsaNotifierUser) {
    const notifierRows = targetRows;

    if (!notifierRows.length) {
      return alert('No effective changes detected for bulk update.');
    }

    const missingReasonRow = notifierRows.find((row) => !getReasonForRow(row));
    if (missingReasonRow) {
      return alert(`Reason is required for S/N ${missingReasonRow.sn || missingReasonRow.id || ''} before queuing notifier bulk updates.`);
    }

    if (typeof onNotifierQueueRequest === 'function') {
      notifierRows.forEach((row) => {
        const currentValue = getCurrentValue(row);
        const nextValue = getNextValue(row);
        const rowReason = getReasonForRow(row);

        onNotifierQueueRequest({
          row,
          columnName: fieldLabelMap[field],
          oldValue: currentValue,
          newValue: nextValue,
          reason: rowReason,
        });
      });
    }

    setShowBulkUpdateModal(false);
    setBulkUpdateFields({
      bulkUpdateField: '',
      bulkUpdateStatus: '',
      bulkUpdateMethod: '',
      bulkUpdateValue: '',
      bulkUpdateRowValues: {},
    });
    closePopup();
    alert(`Queued ${notifierRows.length} record${notifierRows.length !== 1 ? 's' : ''} in NSA Notifier flow.`);
    return;
  }

  if (nsaRows.length) {
    const missingReasonRow = nsaRows.find((row) => !getReasonForRow(row));
    if (missingReasonRow) {
      return alert(`Reason is required for S/N ${missingReasonRow.sn || missingReasonRow.id || ''} before sending NSA bulk updates for approval.`);
    }
  }

  if (nsaRows.length) {
    for (const row of nsaRows) {
      const currentValue = getCurrentValue(row);
      const nextValue = getNextValue(row);
      const rowReason = getReasonForRow(row);

      if (onNSAApprovalRequest && typeof onNSAApprovalRequest === 'function') {
        onNSAApprovalRequest({
          columnName: fieldLabelMap[field],
          currentValue,
          newValue: nextValue,
          reason: rowReason,
          registrationId: row?.id || '',
          sn: row?.sn || '',
          participantName: row?.participantInfo?.name || row?.name || '',
          contactNo: row?.contactNo || row?.participantInfo?.contactNumber || '',
          courseName: row?.courseInfo?.courseEngName || row?.course || '',
          courseLocation: row?.courseInfo?.courseLocation || row?.location || '',
          courseType: row?.courseInfo?.courseType || 'NSA',
          paymentMethod: row?.paymentMethod || '',
          paymentStatus: row?.paymentStatus || '',
          paymentDate: row?.paymentDate || '',
          refundedDate: row?.refundedDate || '',
          remarks: row?.remarks || '',
          confirmed: row?.confirmed ?? null,
        });
      }

      if (onApprovalQueueRequest && typeof onApprovalQueueRequest === 'function') {
        onApprovalQueueRequest({
          row,
          columnName: fieldLabelMap[field],
          oldValue: currentValue,
          newValue: nextValue,
          reason: rowReason,
        });
      }
    }
  }

  if (!directRows.length) {
    setShowBulkUpdateModal(false);
    setBulkUpdateFields({
      bulkUpdateField: '',
      bulkUpdateStatus: '',
      bulkUpdateMethod: '',
      bulkUpdateValue: '',
      bulkUpdateRowValues: {},
    });
    closePopup();
    alert(`Submitted ${nsaRows.length} NSA record${nsaRows.length !== 1 ? 's' : ''} to approval request list.`);
    return;
  }

  targetRows = directRows;

  showUpdatePopup(`Updating ${targetRows.length} records for ${fieldLabelMap[field]}... Please wait...`);

  try {
    if (field === 'paymentStatus' || field === 'paymentMethod') {
      const res = await bulkUpdateRegistrations(
        targetRows.map((row) => ({
          id: row.id,
          paymentStatus: field === 'paymentStatus' ? resolvedStatusForRow(row) : null,
          paymentMethod: field === 'paymentMethod' ? resolvedMethodForRow(row) : null,
        })),
        userName
      );
      if (res.data.result !== true) throw new Error(res.data.message || 'Bulk update failed');
    } else if (field === 'confirmationStatus') {
      for (const row of targetRows) {
        const rowValue = valueForRow(row);
        const newConfirmation = String(rowValue).trim().toLowerCase() === 'confirmed';
        await updateConfirmationStatus(row.id, newConfirmation, userName);
      }
    } else if (field === 'refundedDate') {
      for (const row of targetRows) {
        const rowValue = String(valueForRow(row) || '').trim();
        if (!rowValue) continue;

        // Backward compatibility for older UI action values.
        if (rowValue === 'TODAY') {
          await addRefundedDate(row.id);
          continue;
        }
        if (rowValue === 'CLEAR') {
          await removeRefundedDate(row.id);
          continue;
        }

        await editRegistrationField(row.id, 'refundedDate', rowValue);
      }
    } else {
      const fieldMap = {
        paymentDate: 'paymentDate',
        remarks: 'remarks',
        contactNo: 'contactNo',
        name: 'name',
      };
      const editableField = fieldMap[field];
      if (!editableField) {
        throw new Error(`Unsupported bulk field: ${field}`);
      }
      for (const row of targetRows) {
        const rowValue = valueForRow(row);
        await editRegistrationField(row.id, editableField, rowValue);
      }
    }

    // Close the modal
    setShowBulkUpdateModal(false);
    setBulkUpdateFields({
      bulkUpdateField: '',
      bulkUpdateStatus: '',
      bulkUpdateMethod: '',
      bulkUpdateValue: '',
      bulkUpdateRowValues: {},
    });

    const records = targetRows.map((row) => ({
      sn: row.sn || 'N/A',
      name: row.participantInfo?.name || row.name || 'Unknown',
      contactNumber: row.participantInfo?.contactNumber || 'N/A',
    }));

    await logRegistrationBulkUpdate({
      userName,
      module: 'Registration And Payment',
      columnName: fieldLabelMap[field],
      newValue:
        field === 'paymentMethod'
          ? (bulkUpdateMethod ? `${bulkUpdateMethod} (default) + per-row overrides` : 'Multiple Values')
          : field === 'paymentStatus'
            ? (bulkUpdateStatus ? `${bulkUpdateStatus} (default) + per-row overrides` : 'Multiple Values')
          : 'Multiple Values',
      records,
    });

    if (field === 'paymentStatus') {
      for (let i = 0; i < targetRows.length; i++) {
        const row = targetRows[i];
        const rowStatus = resolvedStatusForRow(row);
        showUpdatePopup(`Updating WooCommerce... Processing record ${i + 1} of ${targetRows.length}`);
        try {
          await updateWooCommerce(
            row.courseChi || row.courseInfo?.courseChiName,
            row.course    || row.courseInfo?.courseEngName,
            row.location  || row.courseInfo?.courseLocation,
            rowStatus
          );
        } catch (e) {
          console.error(`WooCommerce update failed for row ${row.id}:`, e);
        }
      }
      const nsaQueueSuffix = nsaRows.length
        ? ` ${nsaRows.length} NSA record${nsaRows.length !== 1 ? 's were' : ' was'} sent to approval queue.`
        : '';
      showUpdatePopup(`All updates completed! ${targetRows.length} records updated.${nsaQueueSuffix}`);
      setTimeout(() => {
        closePopup();
        alert(`Successfully updated ${targetRows.length} records.${nsaQueueSuffix}`);
      }, 1500);
    } else {
      closePopup();
      const nsaQueueSuffix = nsaRows.length
        ? ` ${nsaRows.length} NSA record${nsaRows.length !== 1 ? 's were' : ' was'} sent to approval queue.`
        : '';
      alert(`Successfully updated ${targetRows.length} records.${nsaQueueSuffix}`);
    }
  } catch (error) {
    console.error('Error during bulk update:', error);
    closePopup();
    alert('Error occurred during bulk update. Please try again.');
  }
}
