/**
 * Fitness Dashboard Calculation Utilities
 * Contains all data processing and calculation logic for the fitness dashboard
 */

// Extract years from raw data
export const extractYearsFromData = (mapData) => {
  const yearsSet = new Set();
  mapData.forEach(row => {
    const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
    if (yearKey && row[yearKey]) yearsSet.add(row[yearKey].toString());
  });
  return [...yearsSet].sort();
};

// Create normalization and matching helper functions
export const createNormalizationHelpers = () => {
  const normalize = (val) => (val || '').toString().trim().toLowerCase();
  const normalizePhone = (val) => {
    const digits = (val || '').toString().replace(/\D/g, '');
    return digits.startsWith('65') ? digits.slice(2) : digits;
  };
  const normalizeId = (val) => (val || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const matchNameKey = (k) => {
    if (k.includes('user')) return false;
    return k === 'name' || k.includes(' name') || k.startsWith('name');
  };
  const matchChineseKey = (k) => k.includes('chinese') && k.includes('name');
  const matchPhoneKey = (k) => k.includes('phone') || k.includes('tel') || k.includes('mobile');
  const matchIdKey = (k) => {
    return k.includes('ic') || k.includes('nric') || k.includes('uinfin') || k.includes('id');
  };

  return { normalize, normalizePhone, normalizeId, matchNameKey, matchChineseKey, matchPhoneKey, matchIdKey };
};

// Create function to resolve participant key with deduplication
export const createParticipantKeyResolver = (helpers, findKey) => {
  const { normalize, normalizePhone, normalizeId, matchNameKey, matchChineseKey, matchPhoneKey, matchIdKey } = helpers;
  const participantKeyMap = new Map();

  return (row) => {
    const nameKey = findKey(row, matchNameKey);
    const cnKey = findKey(row, matchChineseKey);
    const phoneKey = findKey(row, matchPhoneKey);
    const idKey = findKey(row, matchIdKey);

    const name = nameKey ? normalize(row[nameKey]) : '';
    const chineseName = cnKey ? normalize(row[cnKey]) : '';
    const phone = phoneKey ? normalizePhone(row[phoneKey]) : '';
    const id = idKey ? normalizeId(row[idKey]) : '';

    const keys = [name, chineseName, phone, id].filter(Boolean);
    if (!keys.length) return null;

    // If any key already is known, use the existing canonical key
    for (const k of keys) {
      if (participantKeyMap.has(k)) {
        const canonical = participantKeyMap.get(k);
        keys.forEach((kk) => participantKeyMap.set(kk, canonical));
        return canonical;
      }
    }

    // New participant; choose first key as canonical
    const canonical = keys[0];
    keys.forEach((k) => participantKeyMap.set(k, canonical));
    return canonical;
  };
};

// Build participant map with metrics
export const buildParticipantMap = (mapData, getParticipantKey, fitnessMetrics, getParticipantGender, getParticipantName, findMetricKey) => {
  const participantMap = {};
  let maleCount = 0;
  let femaleCount = 0;
  let maleParticipations = 0;
  let femaleParticipations = 0;

  mapData.forEach(row => {
    const participantKey = getParticipantKey(row);
    const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
    const year = yearKey ? row[yearKey]?.toString() : null;
    if (!participantKey || !year) return;

    const gender = getParticipantGender(row);
    if (gender === 'Male') maleParticipations++;
    else femaleParticipations++;

    if (!participantMap[participantKey]) {
      participantMap[participantKey] = {
        displayName: getParticipantName(row),
        gender,
        years: {}
      };
      if (gender === 'Male') maleCount++;
      else femaleCount++;
    }

    if (!participantMap[participantKey].years[year]) {
      participantMap[participantKey].years[year] = {};
    }

    fitnessMetrics.forEach(metric => {
      const metricKey = findMetricKey(row, metric.key);
      const val = metricKey ? row[metricKey] : null;
      if (val !== null && val !== undefined && val !== '') {
        participantMap[participantKey].years[year][metric.key] = parseFloat(val);
      }
    });
  });

  return {
    participantMap,
    totalParticipants: Object.keys(participantMap).length,
    maleCount,
    femaleCount,
    maleParticipations,
    femaleParticipations
  };
};

// Get previous year participants set
export const getPreviousYearsParticipants = (participantMap, years, yearIndex) => {
  const previousSet = new Set();
  for (let i = 0; i < yearIndex; i++) {
    Object.entries(participantMap).forEach(([name, data]) => {
      if (data.years[years[i]]) previousSet.add(name);
    });
  }
  return previousSet;
};

// Calculate statistics for a single year
export const calculateYearStats = (mapData, getParticipantKey, participantMap, year, previousYearsParticipants) => {
  const uniqueNames = new Set();
  const countedNames = new Set();
  const participantEntryCount = {};
  const newParticipantNames = new Set();
  let totalEntries = 0;
  let maleInYear = 0;
  let femaleInYear = 0;
  let maleParticipationsInYear = 0;
  let femaleParticipationsInYear = 0;

  mapData.forEach(row => {
    const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
    if ((yearKey ? row[yearKey]?.toString() : null) !== year) return;

    const participantKey = getParticipantKey(row);
    if (!participantKey) return;

    uniqueNames.add(participantKey);
    totalEntries++;
    participantEntryCount[participantKey] = (participantEntryCount[participantKey] || 0) + 1;

    if (!previousYearsParticipants.has(participantKey)) {
      newParticipantNames.add(participantKey);
    }

    const storedGender = participantMap[participantKey].gender;
    if (storedGender === 'Male') maleParticipationsInYear++;
    else femaleParticipationsInYear++;

    if (!countedNames.has(participantKey)) {
      countedNames.add(participantKey);
      if (storedGender === 'Male') maleInYear++;
      else femaleInYear++;
    }
  });

  const repeatParticipants = Object.values(participantEntryCount).filter(count => count > 1).length;

  return {
    unique: uniqueNames.size,
    newUnique: newParticipantNames.size,
    repeat: repeatParticipants,
    total: totalEntries,
    maleParticipations: maleParticipationsInYear,
    femaleParticipations: femaleParticipationsInYear,
    maleUnique: maleInYear,
    femaleUnique: femaleInYear,
    maleGender: maleInYear,
    femaleGender: femaleInYear
  };
};

// Calculate yearly statistics for all years
export const calculateYearlyStats = (mapData, getParticipantKey, participantMap, years) => {
  const yearlyParticipants = {};
  const yearlyGender = {};
  const yearlyParticipationGender = {};

  years.forEach((year, yearIndex) => {
    const previousYearsParticipants = getPreviousYearsParticipants(participantMap, years, yearIndex);
    const yearStats = calculateYearStats(mapData, getParticipantKey, participantMap, year, previousYearsParticipants);

    yearlyParticipants[year] = {
      unique: yearStats.unique,
      newUnique: yearStats.newUnique,
      repeat: yearStats.repeat,
      total: yearStats.total,
      maleParticipations: yearStats.maleParticipations,
      femaleParticipations: yearStats.femaleParticipations,
      maleUnique: yearStats.maleUnique,
      femaleUnique: yearStats.femaleUnique
    };
    yearlyGender[year] = { male: yearStats.maleGender, female: yearStats.femaleGender };
    yearlyParticipationGender[year] = { male: yearStats.maleParticipations, female: yearStats.femaleParticipations };
  });

  return { yearlyParticipants, yearlyGender, yearlyParticipationGender };
};

// Calculate metric values for a specific metric and year
export const getMetricValuesForYear = (mapData, metric, year, findMetricKey) => {
  const values = [];
  mapData.forEach(row => {
    const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
    if ((yearKey ? row[yearKey]?.toString() : null) !== year) return;
    const metricKey = findMetricKey(row, metric.key);
    const val = metricKey ? parseFloat(row[metricKey]) : null;
    if (val !== null && !isNaN(val)) values.push(val);
  });
  return values;
};

// Calculate year-pair improvements for a metric
export const calculateMetricYearPairProgress = (participantMap, metric, years) => {
  const yearPairProgress = {};
  let overallImproved = 0, overallDeclined = 0, overallNoChange = 0;

  // Initialize year pairs
  for (let i = 0; i < years.length - 1; i++) {
    yearPairProgress[`${years[i]}-${years[i+1]}`] = { improved: 0, declined: 0, noChange: 0, total: 0 };
  }

  Object.values(participantMap).forEach(p => {
    const pYears = Object.keys(p.years).sort();
    if (pYears.length < 2) return;

    // Calculate for each consecutive year pair
    for (let i = 0; i < pYears.length - 1; i++) {
      const yearA = pYears[i];
      const yearB = pYears[i + 1];
      const pairKey = `${yearA}-${yearB}`;

      if (!yearPairProgress[pairKey]) continue;

      const valA = p.years[yearA]?.[metric.key];
      const valB = p.years[yearB]?.[metric.key];

      if (valA === undefined || valB === undefined || isNaN(valA) || isNaN(valB)) continue;

      const diff = valB - valA;
      yearPairProgress[pairKey].total++;
      if (diff === 0) yearPairProgress[pairKey].noChange++;
      else if (metric.higherIsBetter ? diff > 0 : diff < 0) yearPairProgress[pairKey].improved++;
      else yearPairProgress[pairKey].declined++;
    }

    // Overall first to last
    const first = p.years[pYears[0]]?.[metric.key];
    const last = p.years[pYears[pYears.length - 1]]?.[metric.key];
    if (first === undefined || last === undefined || isNaN(first) || isNaN(last)) return;
    const diff = last - first;
    if (diff === 0) overallNoChange++;
    else if (metric.higherIsBetter ? diff > 0 : diff < 0) overallImproved++;
    else overallDeclined++;
  });

  return {
    yearPairProgress,
    overall: { improved: overallImproved, declined: overallDeclined, noChange: overallNoChange }
  };
};

// Calculate all metrics data
export const calculateMetricsData = (mapData, participantMap, years, fitnessMetrics, findMetricKey) => {
  const metricsData = {};

  fitnessMetrics.forEach(metric => {
    const yearlyData = {};
    years.forEach(year => {
      const values = getMetricValuesForYear(mapData, metric, year, findMetricKey);
      if (values.length > 0) {
        yearlyData[year] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          count: values.length
        };
      }
    });

    const { yearPairProgress, overall } = calculateMetricYearPairProgress(participantMap, metric, years);

    metricsData[metric.key] = {
      ...metric,
      yearlyData,
      improved: overall.improved,
      declined: overall.declined,
      noChange: overall.noChange,
      participantsCompared: overall.improved + overall.declined + overall.noChange,
      yearPairProgress
    };
  });

  return metricsData;
};

// Get participants for a specific year
export const getParticipantsForYear = (participantMap, year) => {
  const participants = new Set();
  Object.entries(participantMap).forEach(([name, data]) => {
    if (data.years[year]) participants.add(name);
  });
  return participants;
};

// Calculate year-to-year comparison data
export const calculateYearComparison = (participantMap, years) => {
  const yearComparisonData = {};

  for (let i = 0; i < years.length - 1; i++) {
    const currentYear = years[i];
    const nextYear = years[i + 1];
    const pairKey = `${currentYear}-${nextYear}`;

    const currentYearParticipants = getParticipantsForYear(participantMap, currentYear);
    const nextYearParticipants = getParticipantsForYear(participantMap, nextYear);

    const returning = [...nextYearParticipants].filter(p => currentYearParticipants.has(p)).length;
    const newParticipants = [...nextYearParticipants].filter(p => !currentYearParticipants.has(p)).length;
    const left = [...currentYearParticipants].filter(p => !nextYearParticipants.has(p)).length;

    yearComparisonData[pairKey] = { returning, new: newParticipants, left };
  }

  return yearComparisonData;
};

// Main orchestrator function to calculate all dashboard data
export const calculateDashboardData = (
  mapData,
  fitnessMetrics,
  getParticipantGender,
  getParticipantName,
  findKey,
  findMetricKey
) => {
  if (!mapData || mapData.length === 0) return null;

  // Step 1: Extract years
  const years = extractYearsFromData(mapData);

  // Step 2: Create helpers and participant key resolver
  const helpers = createNormalizationHelpers();
  const getParticipantKey = createParticipantKeyResolver(helpers, findKey);

  // Step 3: Build participant map
  const {
    participantMap,
    totalParticipants,
    maleCount,
    femaleCount,
    maleParticipations,
    femaleParticipations
  } = buildParticipantMap(mapData, getParticipantKey, fitnessMetrics, getParticipantGender, getParticipantName, findMetricKey);

  // Step 4: Calculate yearly statistics
  const { yearlyParticipants, yearlyGender, yearlyParticipationGender } = calculateYearlyStats(
    mapData,
    getParticipantKey,
    participantMap,
    years
  );

  // Step 5: Calculate metrics data
  const metricsData = calculateMetricsData(mapData, participantMap, years, fitnessMetrics, findMetricKey);

  // Step 6: Calculate year comparison
  const yearComparisonData = calculateYearComparison(participantMap, years);

  return {
    years,
    totalParticipants,
    maleCount,
    femaleCount,
    totalParticipations: maleParticipations + femaleParticipations,
    maleParticipations,
    femaleParticipations,
    metricsData,
    participantMap,
    yearlyParticipants,
    yearlyGender,
    yearlyParticipationGender,
    yearComparisonData
  };
};
