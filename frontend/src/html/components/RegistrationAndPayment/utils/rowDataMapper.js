/**
 * Maps a raw registration record (from the API) to a flat AG-Grid row object.
 * Used in both getRowData() and filterRegistrationDetails() to avoid duplication.
 *
 * @param {Object} item  - raw registration document from the backend
 * @param {number} index - 0-based position in the displayed list (used for S/N)
 * @returns {Object} flat row data object for AG-Grid
 */
export function mapRegistrationToRowData(item, index) {
  const resolveRegistrationId = (rawItem) => {
    const candidate =
      rawItem?._id?._id ??
      rawItem?._id?.$oid ??
      rawItem?._id ??
      rawItem?.id?._id ??
      rawItem?.id?.$oid ??
      rawItem?.id ??
      '';

    if (typeof candidate === 'object' && candidate !== null) {
      return String(candidate.$oid ?? candidate._id ?? candidate.id ?? '').trim();
    }

    return String(candidate || '').trim();
  };

  const rawOfficialInfo =
    item.official && typeof item.official === 'object'
      ? item.official
      : (item.officialInfo && typeof item.officialInfo === 'object' ? item.officialInfo : {});

  const normalizeDisplayValue = (rawValue) => {
    if (rawValue === null || rawValue === undefined) return '';
    if (typeof rawValue === 'string') {
      const value = rawValue.trim();
      return value === '[object Object]' ? '' : value;
    }
    if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      return String(rawValue);
    }

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
        (value) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      );
      if (firstPrimitive !== undefined && firstPrimitive !== null) {
        return normalizeDisplayValue(firstPrimitive);
      }
    }

    return '';
  };

  const normalizeParticipantInfo = (participant) => {
    const source = participant && typeof participant === 'object' ? participant : {};
    const normalized = { ...source };

    const firstAvailable = (...values) => values.find((value) => value !== undefined && value !== null);

    normalized.name = normalizeDisplayValue(
      firstAvailable(source.name, source.pName, source.fullName, source.participantName)
    );
    normalized.nric = normalizeDisplayValue(
      firstAvailable(source.nric, source.nRIC, source.uinfin)
    );
    normalized.contactNumber = normalizeDisplayValue(
      firstAvailable(source.contactNumber, source.cNO, source.mobile, source.phoneNumber)
    );
    normalized.email = normalizeDisplayValue(
      firstAvailable(source.email, source.eMAIL)
    );
    normalized.gender = normalizeDisplayValue(
      firstAvailable(source.gender, source.gENDER, source.sex)
    );
    normalized.dateOfBirth = normalizeDisplayValue(
      firstAvailable(source.dateOfBirth, source.dOB, source.dob)
    );
    normalized.residentialStatus = normalizeDisplayValue(
      firstAvailable(source.residentialStatus, source.rESIDENTIALSTATUS)
    );
    normalized.race = normalizeDisplayValue(
      firstAvailable(source.race, source.rACE, source.ethnicity)
    );
    normalized.postalCode = normalizeDisplayValue(
      firstAvailable(source.postalCode, source.postal, source.zip)
    );
    normalized.educationLevel = normalizeDisplayValue(
      firstAvailable(source.educationLevel, source.eDUCATION, source.education)
    );
    normalized.workStatus = normalizeDisplayValue(
      firstAvailable(source.workStatus, source.wORKING, source.workingStatus)
    );

    return normalized;
  };

  const normalizeConfirmed = (value) => {
    if (value === true || value === false) return value;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'confirmed' || normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'not confirmed' || normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') return false;
    return false;
  };

  const confirmedValue = normalizeConfirmed(rawOfficialInfo?.confirmed);
  const participantInfo = normalizeParticipantInfo(item.participant);
  const receiptInvoiceNo = normalizeDisplayValue(
    item.official?.receiptNo ??
    item.officialInfo?.receiptNo ??
    item.receiptNo ??
    item.recinvNo
  );

  return {
    // Identity
    id:               resolveRegistrationId(item),
    sn:               item.sn ?? item.sN ?? index + 1,
    // Participant display fields (also kept in participantInfo for renderers)
    name:             participantInfo.name               || '',
    contactNo:        participantInfo.contactNumber      || '',
    participantInfo,

    // Course display fields (also kept in courseInfo for renderers)
    course:           item.course?.courseEngName         || '',
    courseChi:        item.course?.courseChiName         || '',
    location:         item.course?.courseLocation        || '',
    courseMode:       item.course?.courseMode === 'Face-to-Face' ? 'F2F' : (item.course?.courseMode || ''),
    courseDuration:   item.course?.courseDuration        || '',
    courseTime:       item.course?.courseTime            || '',
    courseInfo:       item.course                        || {},

    // Payment / status
    paymentMethod:    item.paymentMethod || item.participant?.paymentMethod || item.course?.payment || '',
    paymentStatus:    item.status                        || '',
    status:           item.status                        || '',
    registrationStatus: rawOfficialInfo?.registration_status || item.registrationStatus || '',
    finalPaymentMethod: item.finalPaymentMethod || item.course?.finalPaymentMethod || '',
    confirmed:        confirmedValue,
    recinvNo:         receiptInvoiceNo,
    paymentDate:      rawOfficialInfo?.date              || '',
    paymentTime:      rawOfficialInfo?.time              || '',
    refundedDate:     rawOfficialInfo?.refundedDate      || '',
    remarks:          rawOfficialInfo?.remarks           || '',
    officialInfo:     { ...rawOfficialInfo, confirmed: confirmedValue },

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
