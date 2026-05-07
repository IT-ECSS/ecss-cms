import React from 'react';

/**
 * Full-detail read-only view rendered below the AG-Grid when a row's S/N cell is clicked.
 *
 * Props:
 *  rowData {Object} - a single grid row produced by mapRegistrationToRowData()
 */
function ExpandedRowDetail({ rowData }) {
  if (!rowData) return null;

  const {
    participantInfo,
    courseInfo,
    officialInfo,
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

  const isMarriagePrep = courseInfo?.courseType === 'Marriage Preparation Programme';

  return (
    <div className="registration-payment-details-expanded-content">
      <div className="registration-payment-details-modal-header">
        <h3>Registration Details</h3>
      </div>

      <div className="registration-payment-details-content-section">

        {/* ── Participant ────────────────────────────────────────── */}
        <Section title="Participant Information">
          <Field label="Name"               value={participantInfo?.name} />
          <Field label="NRIC"               value={participantInfo?.nric} />
          <Field label="Contact"            value={participantInfo?.contactNumber} />
          <Field label="Email"              value={participantInfo?.email} />
          <Field label="Gender"             value={participantInfo?.gender} />
          <Field label="DOB"                value={participantInfo?.dateOfBirth} />
          <Field label="Residential Status" value={participantInfo?.residentialStatus} />
          <Field label="Race"               value={participantInfo?.race} />
          <Field label="Postal Code"        value={participantInfo?.postalCode} />
          <Field label="Education Level"    value={participantInfo?.educationLevel} />
          <Field label="Work Status"        value={participantInfo?.workStatus} />
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
          <Field label="Location"       value={courseInfo?.courseLocation} />
          <Field label="Mode"           value={courseInfo?.courseMode} />
          <Field label="Price"          value={courseInfo?.coursePrice} />
          <Field label="Duration"       value={courseInfo?.courseDuration} />
          <Field label="Course Time"    value={courseInfo?.courseTime} />
        </Section>

        {/* ── Payment ───────────────────────────────────────────── */}
        <Section title="Payment Information">
          <Field label="Payment Method"        value={courseInfo?.payment} />
          <Field label="Payment Status"        value={status} />
          <Field label="Confirmation Status"   value={normalizedConfirmed ? 'Confirmed' : 'Not Confirmed'} />
          <Field label="Receipt/Invoice Number" value={officialInfo?.receiptNo} />
          {officialInfo?.refundedDate && (
            <Field label="Refunded Date" value={officialInfo.refundedDate} />
          )}
          <Field label="Staff Name"     value={officialInfo?.name} />
          <Field label="Received Date"  value={officialInfo?.date} />
          <Field label="Received Time"  value={officialInfo?.time} />
          <Field label="Remarks"        value={officialInfo?.remarks} />
        </Section>

        {/* ── Official Use ──────────────────────────────────────── */}
        <Section title="Official Use">
          <Field label="Staff Name"      value={officialInfo?.name} />
          <Field label="Processed Date"  value={officialInfo?.date} />
          <Field label="Processed Time"  value={officialInfo?.time} />
        </Section>

        {/* ── Other ─────────────────────────────────────────────── */}
        <Section title="Other">
          <Field
            label="Agreement Status"
            value={
              typeof agreement === 'boolean'
                ? (agreement ? 'Agreed' : 'Not Agreed')
                : agreement
            }
          />
          <Field label="Registration Date" value={registrationDate} />
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
  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 className="registration-payment-details-section-title">{title}</h4>
      <div className="registration-payment-details-grid">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="registration-payment-details-field">
      <span className="registration-payment-details-field-label">{label}:</span>
      <span className="registration-payment-details-field-value">
        {value ?? 'N/A'}
      </span>
    </div>
  );
}

export default ExpandedRowDetail;
