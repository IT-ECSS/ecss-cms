const normalizePaymentMethod = (value) => String(value ?? '').trim();

export function resolveEffectivePaymentMethod(rowOrCourse = {}) {
  const candidates = [
    rowOrCourse?.finalPaymentMethod,
    rowOrCourse?.paymentMethod,
    rowOrCourse?.payment,
    rowOrCourse?.course?.finalPaymentMethod,
    rowOrCourse?.course?.paymentMethod,
    rowOrCourse?.course?.payment,
    rowOrCourse?.officialInfo?.paymentMethod,
    rowOrCourse?.official?.paymentMethod,
  ];

  for (const candidate of candidates) {
    const normalized = normalizePaymentMethod(candidate);
    if (normalized) return normalized;
  }

  return '';
}

export function getDocumentKindForPaymentMethod(rowOrCourse = {}) {
  const paymentMethod = resolveEffectivePaymentMethod(rowOrCourse);
  return paymentMethod === 'SkillsFuture' ? 'invoice' : 'receipt';
}
