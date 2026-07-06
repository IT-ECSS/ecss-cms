import React, { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

const parseDateValue = (rawValue) => {
  const value = String(rawValue ?? '').trim();
  if (!value) return null;

  const ddmmyyyy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const yyyymmdd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmdd) {
    const [, yyyy, mm, dd] = yyyymmdd;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatDateValue = (dateValue) => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return '';
  return format(dateValue, 'dd/MM/yyyy');
};

const hasDisplayValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Full-detail read-only view rendered below the AG-Grid when a row's S/N cell is clicked.
 *
 * Props:
 *  rowData {Object} - a single grid row produced by mapRegistrationToRowData()
 */
function ExpandedRowDetail({ rowData, onParticipantFieldUpdate }) {
  if (!rowData) return null;

  const toDisplayValue = (rawValue) => {
    if (rawValue === null || rawValue === undefined) return '';
    if (typeof rawValue === 'string') return rawValue;
    if (typeof rawValue === 'number' || typeof rawValue === 'boolean') return String(rawValue);

    if (Array.isArray(rawValue)) {
      return rawValue
        .map((item) => toDisplayValue(item))
        .filter((item) => item)
        .join(', ');
    }

    if (typeof rawValue === 'object') {
      const code = rawValue.code ?? rawValue.value ?? '';
      const desc = rawValue.desc ?? rawValue.description ?? rawValue.label ?? '';
      if (code || desc) {
        return `${code}${code && desc ? ' ' : ''}${desc}`.trim();
      }

      const directValue = rawValue.name ?? rawValue.text ?? rawValue.display ?? rawValue.englishName;
      if (directValue !== undefined && directValue !== null) {
        return String(directValue).trim();
      }

      const firstPrimitive = Object.values(rawValue).find(
        (value) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      );
      if (firstPrimitive !== undefined && firstPrimitive !== null) {
        return String(firstPrimitive).trim();
      }
    }

    return '';
  };

  const [editingKey, setEditingKey] = useState('');
  const [draftValue, setDraftValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const participantFields = useMemo(
    () => [
      { label: 'Name', key: 'name', apiField: 'name' },
      { label: 'NRIC', key: 'nric', apiField: 'nric' },
      { label: 'Contact Number', key: 'contactNumber', apiField: 'contactNumber' },
      { label: 'Email', key: 'email', apiField: 'email' },
      {
        label: 'Gender',
        key: 'gender',
        apiField: 'gender',
        inputType: 'select',
        options: ['M 男', 'F 女'],
      },
      { label: 'Date Of Birth', key: 'dateOfBirth', apiField: 'dateOfBirth', inputType: 'date' },
      {
        label: 'Residential Status',
        key: 'residentialStatus',
        apiField: 'residentialStatus',
        inputType: 'select',
        options: ['SC 新加坡公民', 'PR 永久居民'],
      },
      {
        label: 'Race',
        key: 'race',
        apiField: 'race',
        inputType: 'select',
        options: ['Chinese 华', 'Indian 印', 'Malay 马', 'Others 其他'],
      },
      { label: 'Postal Code', key: 'postalCode', apiField: 'postalCode' },
      {
        label: 'Education Level',
        key: 'educationLevel',
        apiField: 'educationLevel',
        inputType: 'select',
        options: [
          'No Formal Education 无正规教育',
          'Primary 小学',
          'Secondary 中学',
          'Post-Secondary (Junior College/ITE) 专上教育',
          'Diploma 文凭',
          "Bachelor's Degree 学士学位",
          "Master's Degree 硕士",
          'Others 其它',
        ],
      },
      {
        label: 'Work Status',
        key: 'workStatus',
        apiField: 'workStatus',
        inputType: 'select',
        options: [
          'Retired 退休',
          'Employed full-time 全职工作',
          'Self-employed 自雇人',
          'Part-time 兼职',
          'Unemployed 失业',
        ],
      },
    ],
    []
  );

  useEffect(() => {
    setEditingKey('');
    setDraftValue('');
    setIsSaving(false);
  }, [rowData?.id]);

  const {
    id,
    participantInfo,
    courseInfo,
    officialInfo,
    paymentMethod,
    finalPaymentMethod,
    paymentStatus,
    registrationStatus,
    confirmed,
    status,
    marriageDetails,
    spouse,
    consent,
    agreement,
    registrationDate,
    sendDetails,
  } = rowData;

  const normalizedConfirmed = (() => {
    const raw = confirmed ?? officialInfo?.confirmed;
    if (raw === true || raw === false) return raw;
    const v = String(raw ?? '').trim().toLowerCase();
    if (v === 'confirmed' || v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'not confirmed' || v === 'false' || v === '0' || v === 'no') return false;
    return false;
  })();

  const resolvedRegistrationStatus =
    registrationStatus || officialInfo?.registration_status || '';
  const resolvedPaymentStatus = paymentStatus || status || '';
  const resolvedPaymentMethod =
    finalPaymentMethod ||
    courseInfo?.finalPaymentMethod ||
    paymentMethod ||
    courseInfo?.payment ||
    '';
  const originalPaymentMethod = paymentMethod || courseInfo?.payment || '';
  const participantPaymentMethod = originalPaymentMethod;
  const staffPaymentMethod = finalPaymentMethod || courseInfo?.finalPaymentMethod || originalPaymentMethod || '';

  const isMarriagePrep = courseInfo?.courseType === 'Marriage Preparation Programme';
  const isNsaCourse = courseInfo?.courseType === 'NSA';

  const toDateInputValue = (rawValue) => {
    const value = String(rawValue ?? '').trim();
    if (!value) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const ddmmyyyy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, dd, mm, yyyy] = ddmmyyyy;
      return `${yyyy}-${mm}-${dd}`;
    }

    return '';
  };

  const fromDateInputValue = (rawValue) => {
    const value = String(rawValue ?? '').trim();
    if (!value) return '';

    const yyyymmdd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!yyyymmdd) return value;

    const [, yyyy, mm, dd] = yyyymmdd;
    return `${dd}/${mm}/${yyyy}`;
  };

  const startEdit = (fieldConfig, currentValue) => {
    if (isSaving) return;
    setEditingKey(fieldConfig.key);
    const currentDisplayValue = toDisplayValue(currentValue);

    if (fieldConfig.inputType === 'select') {
      const current = currentDisplayValue.trim();
      const options = Array.isArray(fieldConfig.options) ? fieldConfig.options : [];
      setDraftValue(current || options[0] || '');
      return;
    }

    if (fieldConfig.inputType === 'date') {
      setDraftValue(toDateInputValue(currentDisplayValue));
      return;
    }

    setDraftValue(currentDisplayValue);
  };

  const cancelEdit = () => {
    if (isSaving) return;
    setEditingKey('');
    setDraftValue('');
  };

  const commitEdit = async (fieldConfig, overrideRawValue = undefined) => {
    if (!fieldConfig || isSaving) return;
    if (typeof onParticipantFieldUpdate !== 'function') {
      cancelEdit();
      return;
    }

    const currentValue = toDisplayValue(participantInfo?.[fieldConfig.key]);
    const nextRaw = String(
      overrideRawValue !== undefined
        ? overrideRawValue
        : (draftValue ?? '')
    );
    const nextValue =
      fieldConfig.inputType === 'date'
        ? nextRaw
        : nextRaw;

    if (currentValue === nextValue) {
      cancelEdit();
      return;
    }

    try {
      setIsSaving(true);
      await onParticipantFieldUpdate({
        rowId: rowData?.id,
        participantKey: fieldConfig.key,
        apiField: fieldConfig.apiField,
        value: nextValue,
      });
    } catch (error) {
      console.error('Failed to update participant field:', error);
      window.alert('Unable to save participant information. Please try again.');
    } finally {
      setIsSaving(false);
      setEditingKey('');
      setDraftValue('');
    }
  };

  return (
    <div className="registration-payment-details-expanded-content">
      <div className="registration-payment-details-modal-header">
        <h3>Registration Details</h3>
      </div>

      <div className="registration-payment-details-content-section">

        {/* ── Participant ────────────────────────────────────────── */}
        <Section title="Participant Information">
          {participantFields.map((field) => {
            const isEditing = editingKey === field.key;
            return (
              <EditableField
                key={field.key}
                label={field.label}
                value={toDisplayValue(participantInfo?.[field.key])}
                isEditing={isEditing}
                isSaving={isSaving && isEditing}
                draftValue={draftValue}
                inputType={field.inputType || 'text'}
                options={field.options || []}
                onStartEdit={() => startEdit(field, participantInfo?.[field.key])}
                onDraftChange={setDraftValue}
                onCancel={cancelEdit}
                onCommit={(value) => commitEdit(field, value)}
              />
            );
          })}
          <Field
            label="Agreement Status"
            value={
              typeof agreement === 'boolean'
                ? (agreement ? 'Agreed' : 'Not Agreed')
                : agreement
            }
          />
        </Section>

        {/* ── Marriage Details ───────────────────────────────────── */}
        {isMarriagePrep && marriageDetails && (
          <Section title="Marriage Details">
            <Field label="Marital Status"       value={marriageDetails.maritalStatus} />
            <Field label="Housing Type"         value={marriageDetails.housingType} />
            <Field label="Gross Monthly Income" value={marriageDetails.grossMonthlyIncome} />
            <Field label="Marriage Duration"    value={marriageDetails.marriageDuration} />
            <Field label="Type of Marriage"     value={marriageDetails.typeOfMarriage} />
            <Field label="Has Children"         value={marriageDetails.hasChildren} />
            <Field label="How Found Out"        value={marriageDetails.howFoundOut} />
            {marriageDetails.howFoundOutOthers && (
              <Field label="How Found Out (Others)" value={marriageDetails.howFoundOutOthers} />
            )}
            <Field label="Source of Referral" value={marriageDetails.sourceOfReferral} />
          </Section>
        )}

        {/* ── Spouse ────────────────────────────────────────────── */}
        {isMarriagePrep && spouse && (
          <Section title="Spouse Information">
            <Field label="Spouse Name"               value={spouse.name} />
            <Field label="Spouse NRIC"               value={spouse.nric} />
            <Field label="Spouse Contact"            value={spouse.mobile} />
            <Field label="Spouse Email"              value={spouse.email} />
            <Field label="Spouse Sex"                value={spouse.sex} />
            <Field label="Spouse DOB"                value={spouse.dateOfBirth} />
            <Field label="Spouse Ethnicity"          value={spouse.ethnicity} />
            <Field label="Spouse Residential Status" value={spouse.residentialStatus} />
            <Field label="Spouse Marital Status"     value={spouse.maritalStatus} />
            <Field label="Spouse Education"          value={spouse.education} />
            <Field label="Spouse Housing Type"       value={spouse.housingType} />
            <Field label="Spouse Postal Code"        value={spouse.postalCode} />
          </Section>
        )}

        {/* ── Consent ───────────────────────────────────────────── */}
        {isMarriagePrep && consent && (
          <Section title="Consent & Agreements">
            <Field
              label="I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out in the link above"
              value={
                consent.marriagePrepConsent1
                  ? 'I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out in the link above'
                  : ''
              }
            />
            <Field
              label="I confirm that I have read and understood the Terms of Consent as set out in the link above"
              value={
                consent.marriagePrepConsent2
                  ? 'I confirm that I have read and understood the Terms of Consent as set out in the link above'
                  : ''
              }
            />
          </Section>
        )}

        {/* ── Course ────────────────────────────────────────────── */}
        <Section title="Course Information">
          <Field label="Course Type"    value={courseInfo?.courseType} />
          <Field label="English Name"   value={courseInfo?.courseEngName} />
          <Field label="Chinese Name"   value={courseInfo?.courseChiName} />
          <Field label="Course Location"       value={courseInfo?.courseLocation} />
          <Field label="Mode"           value={courseInfo?.courseMode} />
          <Field label="Price"          value={courseInfo?.coursePrice} />
          <Field label="Duration"       value={courseInfo?.courseDuration} />
          <Field label="Course Time"    value={courseInfo?.courseTime} />
        </Section>

        {/* ── Registration Information ──────────────────────────── */}
        <Section title="Registration Information">
          <Field label="Staff Name"      value={officialInfo?.name} />
          <Field label="Registration Status" value={resolvedRegistrationStatus} />
          <Field label={isNsaCourse ? 'Payment Date' : 'Processed Date'} value={officialInfo?.date} />
          <Field label={isNsaCourse ? 'Payment Time' : 'Processed Time'} value={officialInfo?.time} />
          <Field label="Registration Date" value={registrationDate} />
        </Section>

        {/* ── Payment ───────────────────────────────────────────── */}
        <Section title="Payment Information">
          <Field label="Payment Method (Participant)" value={participantPaymentMethod} />
          <Field label="Final Payment Method (Staff)" value={staffPaymentMethod} />
          <Field label="Payment Status"        value={resolvedPaymentStatus} />
          <Field label="Confirmation Status"   value={normalizedConfirmed ? 'Confirmed' : 'Not Confirmed'} />
          <Field label="Receipt/Invoice Number" value={officialInfo?.receiptNo} />
          {officialInfo?.refundedDate && (
            <Field label="Refunded Date" value={officialInfo.refundedDate} />
          )}
          {officialInfo?.refundedTime && (
            <Field label="Refunded Time" value={officialInfo.refundedTime} />
          )}
        </Section>

        {/* ── Official Uses Information ─────────────────────────── */}
        <Section title="Official Uses Information">
          <Field label="Remarks" value={officialInfo?.remarks} />
          <div className="registration-payment-details-field">
            <span className="registration-payment-details-field-label">Whatsapp Message:</span>
            <span
              className="registration-payment-details-field-value"
              style={{ color: sendDetails ? '#4CAF50' : '#f44336', fontWeight: 'bold' }}
            >
              {sendDetails ? 'Sent' : 'Not Sent'}
            </span>
          </div>
        </Section>

      </div>
    </div>
  );
}

/* ── Small helpers ────────────────────────────────────────────────── */

function Section({ title, children }) {
  const visibleChildren = React.Children.toArray(children).filter(Boolean);
  if (!visibleChildren.length) return null;

  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 className="registration-payment-details-section-title">{title}</h4>
      <div className="registration-payment-details-grid">{visibleChildren}</div>
    </div>
  );
}

function Field({ label, value }) {
  if (!hasDisplayValue(value)) return null;

  return (
    <div className="registration-payment-details-field">
      <span className="registration-payment-details-field-label">{label}:</span>
      <span className="registration-payment-details-field-value">{value}</span>
    </div>
  );
}

function EditableField({
  label,
  value,
  isEditing,
  isSaving,
  draftValue,
  inputType,
  options,
  onStartEdit,
  onDraftChange,
  onCancel,
  onCommit,
}) {
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useLayoutEffect(() => {
    if (isEditing && inputType === 'select') {
      setIsDropdownOpen(true);
      window.requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
      setIsDatePickerOpen(false);
    } else if (isEditing && inputType === 'date') {
      setIsDatePickerOpen(true);
      setIsDropdownOpen(false);
    } else {
      setIsDropdownOpen(false);
      setIsDatePickerOpen(false);
    }
  }, [isEditing, inputType]);

  useEffect(() => {
    if (!isEditing || inputType !== 'select') return;

    const handlePointerDown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onCancel();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, inputType, onCancel]);

  const selectOptions = Array.isArray(options) ? options : [];
  const selectValue =
    selectOptions.includes(draftValue)
      ? draftValue
      : (selectOptions[0] || '');
  const filteredSelectOptions =
    String(draftValue ?? '').trim().toLowerCase() === String(selectValue ?? '').trim().toLowerCase()
      ? selectOptions
      : selectOptions.filter((option) =>
          option.toLowerCase().includes(String(draftValue ?? '').toLowerCase())
        );

  const DateFieldInput = forwardRef(function DateFieldInput(props, ref) {
    const { value: inputValue, onClick, onChange, onBlur, placeholder, disabled } = props;
    return (
      <div className="registration-payment-details-field-text-wrapper">
        <input
          ref={ref}
          className="registration-payment-details-field-input registration-payment-details-field-input--date"
          type="text"
          value={inputValue || ''}
          onMouseDown={(event) => {
            event.preventDefault();
            onClick?.(event);
          }}
          onClick={onClick}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
        />
      </div>
    );
  });

  return (
    <div className="registration-payment-details-field">
      <span className="registration-payment-details-field-label">{label}:</span>
      {isEditing ? (
        inputType === 'select' ? (
          <div className="registration-payment-details-field-dropdown" ref={dropdownRef}>
            <div className="registration-payment-details-field-text-wrapper registration-payment-details-field-text-wrapper--select">
              <input
                ref={triggerRef}
                className="registration-payment-details-field-input"
                type="text"
                value={draftValue}
                onChange={(e) => {
                  if (!isDropdownOpen) setIsDropdownOpen(true);
                  onDraftChange(e.target.value);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onClick={() => {
                  setIsDropdownOpen(true);
                }}
                onBlur={() => {
                  window.requestAnimationFrame(() => {
                    if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
                      const exactMatch = selectOptions.find(
                        (option) => option.toLowerCase() === String(draftValue ?? '').trim().toLowerCase()
                      );
                      if (exactMatch) {
                        onCommit(exactMatch);
                      } else {
                        onCancel();
                      }
                    }
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const exactMatch = selectOptions.find(
                      (option) => option.toLowerCase() === String(draftValue ?? '').trim().toLowerCase()
                    );
                    if (exactMatch) {
                      onCommit(exactMatch);
                    } else if (filteredSelectOptions.length === 1) {
                      onDraftChange(filteredSelectOptions[0]);
                      onCommit(filteredSelectOptions[0]);
                    }
                  }
                  if (e.key === 'Escape') onCancel();
                }}
                placeholder={`Type to search ${label}`}
                disabled={isSaving}
                role="combobox"
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
              />
              <span className="registration-payment-details-field-select-trigger-icon">▾</span>
            </div>

            {isDropdownOpen && filteredSelectOptions.length > 0 && (
              <ul className="registration-payment-details-dropdown-list" role="listbox" aria-label={label}>
                {filteredSelectOptions.map((opt) => {
                  const isActive = String(draftValue ?? '').trim().toLowerCase() === opt.toLowerCase();
                  return (
                    <li key={opt} className="registration-payment-details-dropdown-list-item">
                      <button
                        type="button"
                        className={`registration-payment-details-dropdown-option ${isActive ? 'is-active' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onDraftChange(opt);
                          setIsDropdownOpen(false);
                          onCommit(opt);
                        }}
                      >
                        <span>{opt}</span>
                        {isActive && <span className="registration-payment-details-dropdown-option-check">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : inputType === 'date' ? (
          <div className="registration-payment-details-field-date-picker-shell">
            <DatePicker
              selected={parseDateValue(draftValue)}
              onChange={(dateValue) => {
                const nextValue = formatDateValue(dateValue);
                onDraftChange(nextValue);
                onCommit(nextValue);
                setIsDatePickerOpen(false);
              }}
              onCalendarClose={() => {
                if (!draftValue) {
                  onCancel();
                }
              }}
              customInput={<DateFieldInput />}
              dateFormat="dd/MM/yyyy"
              placeholderText="dd/mm/yyyy"
              showPopperArrow={false}
              disabled={isSaving}
              maxDate={new Date()}
              popperPlacement="bottom-start"
              showMonthDropdown={true}
              showYearDropdown={true}
              dropdownMode="select"
              open={isDatePickerOpen}
            />
          </div>
        ) : (
          <div className="registration-payment-details-field-text-wrapper registration-payment-details-field-text-wrapper--text">
            <input
              autoFocus
              className="registration-payment-details-field-input registration-payment-details-field-input--text"
              type="text"
              value={draftValue || ''}
              onChange={(e) => onDraftChange(e.target.value)}
              onBlur={() => onCommit()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCommit();
                if (e.key === 'Escape') onCancel();
              }}
              placeholder={`Enter ${label}`}
              disabled={isSaving}
            />
          </div>
        )
      ) : (
        <button
          type="button"
          className="registration-payment-details-field-value registration-payment-details-field-value-editable"
          onClick={onStartEdit}
          title="Click to edit"
        >
          {value ?? 'N/A'}
        </button>
      )}
    </div>
  );
}

export default ExpandedRowDetail;
