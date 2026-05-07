/**
 * Maps a raw registration record (from the API) to a flat AG-Grid row object.
 * Used in both getRowData() and filterRegistrationDetails() to avoid duplication.
 *
 * @param {Object} item  - raw registration document from the backend
 * @param {number} index - 0-based position in the displayed list (used for S/N)
 * @returns {Object} flat row data object for AG-Grid
 */
export function mapRegistrationToRowData(item, index) {
  const normalizeConfirmed = (value) => {
    if (value === true || value === false) return value;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'confirmed' || normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'not confirmed' || normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') return false;
    return false;
  };

  const confirmedValue = normalizeConfirmed(item.official?.confirmed);

  return {
    // Identity
    id:               item._id,
    sn:               index + 1,

    // Participant display fields (also kept in participantInfo for renderers)
    name:             item.participant?.name             || '',
    contactNo:        item.participant?.contactNumber    || '',
    participantInfo:  item.participant                   || {},

    // Course display fields (also kept in courseInfo for renderers)
    course:           item.course?.courseEngName         || '',
    courseChi:        item.course?.courseChiName         || '',
    location:         item.course?.courseLocation        || '',
    courseMode:       item.course?.courseMode === 'Face-to-Face' ? 'F2F' : (item.course?.courseMode || ''),
    courseDuration:   item.course?.courseDuration        || '',
    courseTime:       item.course?.courseTime            || '',
    courseInfo:       item.course                        || {},

    // Payment / status
    paymentMethod:    item.course?.payment               || '',
    paymentStatus:    item.status                        || '',
    status:           item.status                        || '',
    confirmed:        confirmedValue,
    recinvNo:         item.official?.receiptNo           || '',
    paymentDate:      item.official?.date                || '',
    refundedDate:     item.official?.refundedDate        || '',
    remarks:          item.official?.remarks             || '',
    officialInfo:     { ...(item.official || {}), confirmed: confirmedValue },

    // Registration metadata
    agreement:        item.agreement                     || '',
    registrationDate: item.registrationDate              || '',
    sendDetails:      item.sendingWhatsappMessage        || false,

    // Marriage Preparation Programme — nested objects (for renderDetailView)
    marriageDetails:  item.marriageDetails               || null,
    spouse:           item.spouse                        || null,
    consent:          item.consent                       || null,
    marriagePrepConsent: item.marriagePrepConsent        || null,

    // Marriage Preparation Programme — quick-access flat fields (for column renderers)
    spouseName:            item.spouse?.name                              || item.spouseName              || '',
    maritalStatus:         item.marriageDetails?.maritalStatus            || item.maritalStatus            || '',
    intendedMarriageDate:  item.marriageDetails?.marriageDuration         || item.intendedMarriageDate     || '',
    housingType:           item.marriageDetails?.housingType              || item.housingType              || '',
    grossMonthlyIncome:    item.marriageDetails?.grossMonthlyIncome       || item.grossMonthlyIncome       || '',
    typeOfMarriage:        item.marriageDetails?.typeOfMarriage           || item.typeOfMarriage           || '',
    hasChildren:           item.marriageDetails?.hasChildren              || item.hasChildren              || '',
    howFoundOut:           item.marriageDetails?.howFoundOut              || item.howFoundOut              || '',
    sourceOfReferral:      item.marriageDetails?.sourceOfReferral        || item.sourceOfReferral         || '',
    spouseNric:            item.spouse?.nric                              || item.spouseNric               || '',
    spouseContact:         item.spouse?.mobile || item.spouse?.contactNumber || item.spouseContact        || '',
    spouseEmail:           item.spouse?.email                             || item.spouseEmail              || '',
    marriagePrepConsent1:  item.consent?.marriagePrepConsent1             || item.marriagePrepConsent1     || false,
    marriagePrepConsent2:  item.consent?.marriagePrepConsent2             || item.marriagePrepConsent2     || false,
  };
}
