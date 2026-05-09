import React from 'react';
import { isNsaNotifier } from '../constants/accessControl';

/**
 * The toolbar row of action buttons displayed above the AG-Grid.
 *
 * Props:
 *   role                      {string}   – user role from props
 *   userEmail                 {string}   – user email for access control
 *   selectedCourseType        {string}   – currently selected course-type filter
 *   hasMarriagePrepData       {boolean}  – true when rowData contains Marriage Prep rows
 *   hideMarriagePrepFields    {boolean}  – current toggle state for Marriage Prep columns
 *   onToggleMarriagePrep      {function} – toggleHideMarriagePrepFields handler
 *   onArchive                 {function} – archiveData handler
 *   onExportLOP               {function} – exportToLOP handler
 *   onExportAttendance        {function} – exportAttendance handler
 *   onExportMarriagePrep      {function} – exportToMarriagePreparationProgramme handler
 *   onOpenBulkUpdate          {function} – openBulkUpdateModal handler
 */
const ActionButtonsRow = ({
  role,
  userEmail,
  selectedCourseType,
  hasMarriagePrepData,
  hideMarriagePrepFields,
  onToggleMarriagePrep,
  onArchive,
  onExportLOP,
  onExportAttendance,
  onExportMarriagePrep,
  onOpenBulkUpdate,
  isReadOnly,
  onOpenApprovalQueue,
  onOpenApprovalStatus,
  approvalStatusCount,
  notifierQueueCount,
  onOpenNotifierQueue,
}) => {
  const showMarriagePrepToggle =
    hasMarriagePrepData && selectedCourseType !== 'Marriage Preparation Programme';

  return (
    <div className="registration-payment-details-button-row">
      {showMarriagePrepToggle && (
        <button
          className="registration-payment-details-button"
          onClick={onToggleMarriagePrep}
          style={{
            backgroundColor: 'transparent',
            color: hideMarriagePrepFields ? '#4CAF50' : '#ff6b6b',
            border: `3.5px solid ${hideMarriagePrepFields ? '#4CAF50' : '#ff6b6b'}`,
            padding: '12.5px 18.75px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px',
            fontSize: '17.5px',
            whiteSpace: 'nowrap',
          }}
        >
          {hideMarriagePrepFields ? 'Show Marriage Prep Fields' : 'Hide Marriage Prep Fields'}
        </button>
      )}

      <button className="registration-payment-details-btn-save" onClick={onArchive}>
        Archive Data
      </button>

      {role !== 'Social Worker' && (
        <>
          <button className="registration-payment-details-btn-export" onClick={onExportLOP}>
            Export to LOP
          </button>
          <button
            className="registration-payment-details-button"
            style={{ color: '#FF0000', borderColor: '#FF0000' }}
            onClick={onExportAttendance}
          >
            Export Attendance
          </button>
        </>
      )}

      {(role === 'Social Worker' || role === 'Admin' || role === 'Sub Admin') && (
        <button
          className="registration-payment-details-button"
          style={{ color: '#808080', borderColor: '#808080' }}
          onClick={onExportMarriagePrep}
        >
          Export to Marriage Preparation Programme
        </button>
      )}

      <button
        className="registration-payment-details-button"
        style={{ color: '#9C27B0', borderColor: '#9C27B0' }}
        onClick={onOpenBulkUpdate}
      >
        Bulk Update
      </button>

      {isReadOnly && (
        <button
          className="registration-payment-details-button"
          style={{ color: '#795548', borderColor: '#795548', fontWeight: 700 }}
          onClick={onOpenApprovalQueue}
        >
          Approval
        </button>
      )}

      {isReadOnly && (
        <button
          className="registration-payment-details-button"
          style={{ color: '#1565C0', borderColor: '#1565C0', fontWeight: 700 }}
          onClick={onOpenApprovalStatus}
        >
          Approval Status
        </button>
      )}

      {isNsaNotifier(userEmail) && (
        <button
          className="registration-payment-details-button"
          style={{ color: '#0d47a1', borderColor: '#0d47a1', fontWeight: 700 }}
          onClick={onOpenNotifierQueue}
        >
          NSA Notifier
        </button>
      )}
    </div>
  );
};

export default ActionButtonsRow;
