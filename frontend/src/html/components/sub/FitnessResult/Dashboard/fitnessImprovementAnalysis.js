/**
 * Fitness Improvement Analysis Utility
 * Analyzes participant improvements across different year comparison types:
 * 1. Consecutive years (e.g., 2024→2025, 2025→2026)
 * 2. Skipped years (e.g., 2024→2026, 2025→2027)
 * 
 * Returns unique participants who improved in at least one case,
 * counting each participant only once regardless of how many cases they improved in.
 */

export const FITNESS_METRICS = [
  { key: '30 secs Sit & Stand', label: '30 Secs Sit & Stand', unit: 'reps', higherIsBetter: true },
  { key: '30 secs Arm Curl', label: '30 Secs Arm Curl', unit: 'reps', higherIsBetter: true },
  { key: '2 min March on the spot', label: '2 Min March On The Spot', unit: 'steps', higherIsBetter: true },
  { key: 'Sit & Reach', label: 'Sit & Reach', unit: 'cm', higherIsBetter: true },
  { key: 'Back Stretch', label: 'Back Stretch', unit: 'cm', higherIsBetter: true },
  { key: '2.44m speed walk', label: '2.44m Speed Walk', unit: 'sec', higherIsBetter: false },
  { key: 'Grip Test', label: 'Grip Test', unit: 'kg', higherIsBetter: true }
];

/**
 * UNIVERSAL: Calculate unique stations improved for a participant across consecutive years
 * Used across entire Fitness Section for consistency
 * 
 * @param {Object} participantYearData - Object with year keys: { '2024': {...}, '2025': {...} }
 * @param {Array} years - Array of years to compare (e.g., ['2024', '2025', '2026'])
 * @returns {Number} Count of unique stations that improved across consecutive year pairs
 * 
 * @example
 * calculateParticipantStationsImproved(
 *   { '2024': { '30 secs Sit & Stand': 25, ... }, '2025': { '30 secs Sit & Stand': 27, ... } },
 *   ['2024', '2025', '2026']
 * ) // returns 3 if 3 unique stations improved across all consecutive pairs
 */
export const calculateParticipantStationsImproved = (participantYearData, years) => {
  if (!participantYearData || !years || years.length < 2) return 0;
  
  const improvedStations = new Set();
  const sortedYears = years.slice().sort();
  
  // Compare only CONSECUTIVE years (matching dashboard behavior)
  for (let i = 0; i < sortedYears.length - 1; i++) {
    const currYear = sortedYears[i];
    const nextYear = sortedYears[i + 1];
    
    const currYearData = participantYearData[currYear];
    const nextYearData = participantYearData[nextYear];
    
    if (!currYearData || !nextYearData) continue;
    
    // Compare each fitness metric
    FITNESS_METRICS.forEach(metric => {
      const currValue = parseFloat(currYearData[metric.key]);
      const nextValue = parseFloat(nextYearData[metric.key]);
      
      // Skip if either value is missing or invalid
      if (isNaN(currValue) || isNaN(nextValue)) return;
      
      // Check if improved (considering higherIsBetter flag)
      const improved = metric.higherIsBetter ? nextValue > currValue : nextValue < currValue;
      
      if (improved) {
        improvedStations.add(metric.key);
      }
    });
  }
  
  return improvedStations.size;
};

/**
 * UNIVERSAL: Get all participants with improvement across Fitness Section
 * Used by Dashboard, Cards, and Export consistently
 * 
 * @param {Object} participantMap - Map of participants with year data
 * @param {Array} years - Array of years to analyze
 * @param {Number} stationThreshold - Minimum stations improved to count (1-7)
 * @returns {Object} { count, participants: [{ displayName, stationsImproved, uniqueImprovedMetrics }] }
 * 
 * KEY BEHAVIOR:
 * - Only includes participants who attended ALL selected years
 * - Counts unique stations improved across ALL consecutive year pairs
 * - Filters by stationThreshold
 * - Returns both count and detailed participant list
 * 
 * @example
 * const result = getParticipantsWithImprovementUniversal(participantMap, ['2024', '2025'], 1);
 * console.log(result.count);           // 10
 * console.log(result.participants[0]); // { displayName: 'John Doe', stationsImproved: 3, uniqueImprovedMetrics: [...] }
 */
export const getParticipantsWithImprovementUniversal = (participantMap, years, stationThreshold = 1) => {
  if (!participantMap || Object.keys(participantMap).length === 0 || !years || years.length < 2) {
    return { count: 0, participants: [] };
  }

  const sortedYears = years.slice().sort();
  const totalYears = sortedYears.length;
  const participantImprovements = {};

  // Process each participant
  Object.entries(participantMap).forEach(([key, participant]) => {
    // CRITICAL: Only count participants who attended ALL years
    const participantYears = Object.keys(participant.years || {});
    if (participantYears.length !== totalYears) {
      return; // Skip participants missing any year
    }

    // Track unique improved metrics across all consecutive year pairs
    const improvedMetricsSet = new Set();

    // Compare only CONSECUTIVE years (matching ParticipantsBlock.jsx and export logic)
    for (let i = 0; i < sortedYears.length - 1; i++) {
      const currYear = sortedYears[i];
      const nextYear = sortedYears[i + 1];

      const currData = participant.years[currYear];
      const nextData = participant.years[nextYear];

      if (!currData || !nextData) continue;

      // Check each fitness metric
      FITNESS_METRICS.forEach(metric => {
        const a = parseFloat(currData[metric.key]);
        const b = parseFloat(nextData[metric.key]);

        if (isNaN(a) || isNaN(b)) return; // Skip if missing data

        // Check if improved (considering higherIsBetter flag)
        const improved = metric.higherIsBetter ? b > a : b < a;
        if (improved) {
          improvedMetricsSet.add(metric.key);
        }
      });
    }

    // Store participant if they have data
    if (improvedMetricsSet.size > 0 || participantYears.length === totalYears) {
      participantImprovements[key] = {
        displayName: participant.displayName,
        stationsImproved: improvedMetricsSet.size,
        uniqueImprovedMetrics: Array.from(improvedMetricsSet),
        participantKey: key
      };
    }
  });

  // Filter by station threshold and sort
  const resultParticipants = Object.values(participantImprovements)
    .filter(item => item.stationsImproved >= stationThreshold)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));

  return {
    count: resultParticipants.length,
    participants: resultParticipants,
    totalAttendedAllYears: Object.keys(participantImprovements).length
  };
};

/**
 * UNIVERSAL: Get all participations with improvement across Fitness Section
 * "Participations" = unique individuals who improved in ANY consecutive year pair (not restricted to all years)
 * Used by Dashboard, Cards, and Export consistently
 * 
 * @param {Object} participantMap - Map of participants with year data
 * @param {Array} years - Array of years to analyze
 * @param {Number} stationThreshold - Minimum stations improved to count (1-7)
 * @returns {Object} { count, participants: [{ displayName, stationsImproved, uniqueImprovedMetrics }] }
 * 
 * KEY BEHAVIOR:
 * - Includes ALL participants who improved in ANY consecutive year pair
 * - Does NOT require attendance in all years (more inclusive than "Participants")
 * - Counts TOTAL UNIQUE stations improved across consecutive year comparisons
 * - Filters by stationThreshold
 * - Each participant counted once, with metrics accumulated from all year pairs they appear in
 * 
 * @example
 * const result = getParticipationsWithImprovementUniversal(participantMap, ['2024', '2025', '2026'], 1);
 * console.log(result.count);           // 20 (includes anyone who improved 2024→2025 OR 2025→2026)
 */
export const getParticipationsWithImprovementUniversal = (participantMap, years, stationThreshold = 1) => {
  if (!participantMap || Object.keys(participantMap).length === 0 || !years || years.length < 2) {
    return { count: 0, participants: [] };
  }

  const sortedYears = years.slice().sort();
  const improvedSet = new Set(); // Track unique participants who improved
  const participantDetails = {}; // Store details for participants who improved (accumulate metrics)

  // Compare only CONSECUTIVE years
  for (let i = 0; i < sortedYears.length - 1; i++) {
    const currYear = sortedYears[i];
    const nextYear = sortedYears[i + 1];

    // Check each participant for this year pair
    Object.entries(participantMap).forEach(([key, participant]) => {
      const currData = participant.years[currYear];
      const nextData = participant.years[nextYear];

      if (!currData || !nextData) return; // No data for this year pair

      // Track improved metrics for this comparison
      const improvedMetrics = new Set();

      FITNESS_METRICS.forEach(metric => {
        const a = parseFloat(currData[metric.key]);
        const b = parseFloat(nextData[metric.key]);

        if (isNaN(a) || isNaN(b)) return; // Skip if missing data

        const improved = metric.higherIsBetter ? b > a : b < a;
        if (improved) {
          improvedMetrics.add(metric.key);
        }
      });

      // If improved in this year pair, accumulate metrics
      if (improvedMetrics.size > 0) {
        if (!improvedSet.has(key)) {
          improvedSet.add(key);
          // Initialize with current metrics
          participantDetails[key] = {
            displayName: participant.displayName,
            metricsSet: new Set(improvedMetrics)
          };
        } else {
          // Accumulate metrics from this year pair
          improvedMetrics.forEach(m => participantDetails[key].metricsSet.add(m));
        }
      }
    });
  }

  // Convert to sorted array, filtering by threshold
  const resultParticipants = Array.from(improvedSet)
    .map(key => {
      const metrics = Array.from(participantDetails[key].metricsSet);
      return {
        displayName: participantDetails[key].displayName,
        stationsImproved: metrics.length,
        uniqueImprovedMetrics: metrics
      };
    })
    .filter(item => item.stationsImproved >= stationThreshold)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));

  return {
    count: resultParticipants.length,
    participants: resultParticipants
  };
};


/**
 * Check if participant improved in a specific year comparison
 * @param {Object} currYearData - Participant data for current year
 * @param {Object} nextYearData - Participant data for next year
 * @param {Number} stationThreshold - Minimum number of stations to count as improved
 * @returns {Boolean} True if improved in >= stationThreshold stations
 */
export const checkYearPairImprovement = (currYearData, nextYearData, stationThreshold = 1, debugName = '') => {
  let improvedCount = 0;
  let improvedMetrics = [];
  
  FITNESS_METRICS.forEach(metric => {
    let a = parseFloat(currYearData[metric.key]);
    let b = parseFloat(nextYearData[metric.key]);
    
    if (isNaN(a) || isNaN(b)) return;
    
    // Handle potential unit mismatch: if one value is much smaller than the other for time metrics
    // (2.44m speed walk: higherIsBetter = false, so it's a time metric)
    if (metric.key === '2.44m speed walk') {
      // If there's a massive discrepancy (>100x), likely a unit conversion issue
      const ratio = Math.max(a, b) / Math.min(a, b);
      if (ratio > 100) {
        // Likely milliseconds vs seconds issue - convert milliseconds to seconds
        if (a < b / 10) {
          a = a * 1000; // Convert from seconds to milliseconds for comparison
        }
        if (b < a / 10) {
          b = b * 1000; // Convert from seconds to milliseconds for comparison
        }
      }
    }
    
    // Use standard comparison logic: check if improvement occurred
    const improved = metric.higherIsBetter ? b > a : b < a;
    if (improved) {
      improvedCount++;
      improvedMetrics.push(metric.key);
    }
  });
  
  const result = improvedCount >= stationThreshold;
  if (debugName && result) {
    console.log(`[IMPROVED] ${debugName}: ${improvedMetrics.length} stations improved (${improvedMetrics.join(', ')})`);
  }
  if (debugName && !result) {
    console.log(`[NOT IMPROVED] ${debugName}: ${improvedCount}/${FITNESS_METRICS.length} stations improved`);
  }
  
  return result;
};

/**
 * Analyze improvements for consecutive years
 * e.g., 2024→2025, 2025→2026
 * Only includes participants with data in multiple years
 * Counts TOTAL UNIQUE stations improved across all year pairs
 */
export const analyzeConsecutiveYearsImprovement = (participantMap, years, stationThreshold = 1) => {
  const improvedParticipants = new Set();
  const sortedYears = years.slice().sort();
  
  // Filter to only qualified participants who attended ALL years
  const qualifiedParticipants = Object.entries(participantMap).filter(
    ([_, participant]) => Object.keys(participant.years || {}).length === years.length
  );
  
  const notImprovedInConsecutive = [];
  
  qualifiedParticipants.forEach(([participantKey, participant]) => {
    // Collect all unique stations improved across all year pairs
    const improvedStationsSet = new Set();
    
    // Check only consecutive year pairs
    for (let i = 0; i < sortedYears.length - 1; i++) {
      const currYear = sortedYears[i];
      const nextYear = sortedYears[i + 1];
      
      const currData = participant.years[currYear];
      const nextData = participant.years[nextYear];
      
      if (!currData || !nextData) continue;
      
      // Check each metric to see if it improved
      FITNESS_METRICS.forEach(metric => {
        let a = parseFloat(currData[metric.key]);
        let b = parseFloat(nextData[metric.key]);
        
        if (isNaN(a) || isNaN(b)) return;
        
        // Use standard comparison logic
        const improved = metric.higherIsBetter ? b > a : b < a;
        if (improved) {
          improvedStationsSet.add(metric.key);
        }
      });
    }
    
    // Only count participant if they improved in >= stationThreshold unique stations
    if (improvedStationsSet.size >= stationThreshold) {
      improvedParticipants.add(participantKey);
    } else {
      notImprovedInConsecutive.push(participantMap[participantKey].displayName);
    }
  });
  
  console.log(`[DEBUG CONSECUTIVE] Participants NOT improved (need ${stationThreshold}+ stations): ${notImprovedInConsecutive.length}`);
  if (notImprovedInConsecutive.length > 0 && notImprovedInConsecutive.length <= 5) {
    console.log(`  → ${JSON.stringify(notImprovedInConsecutive)}`);
  }
  
  return {
    caseType: 'consecutive_years',
    improvedParticipants: Array.from(improvedParticipants),
    count: improvedParticipants.size,
    yearPairs: generateConsecutiveYearPairs(years)
  };
};

/**
 * Analyze improvements for skipped years
 * e.g., 2024→2026 (skipping 2025)
 * Only includes participants with data in multiple years
 * Counts TOTAL UNIQUE stations improved across all year pairs
 */
export const analyzeSkippedYearsImprovement = (participantMap, years, stationThreshold = 1) => {
  const improvedParticipants = new Set();
  const sortedYears = years.slice().sort();
  
  // Filter to only qualified participants who attended ALL years
  const qualifiedParticipants = Object.entries(participantMap).filter(
    ([_, participant]) => Object.keys(participant.years || {}).length === years.length
  );
  
  const notImprovedInSkipped = [];
  
  qualifiedParticipants.forEach(([participantKey, participant]) => {
    // Collect all unique stations improved across all skipped year pairs
    const improvedStationsSet = new Set();
    
    // Check all non-consecutive year pairs (skipped years)
    for (let i = 0; i < sortedYears.length - 1; i++) {
      for (let j = i + 2; j < sortedYears.length; j++) { // j = i + 2 ensures skipped years
        const currYear = sortedYears[i];
        const nextYear = sortedYears[j];
        
        const currData = participant.years[currYear];
        const nextData = participant.years[nextYear];
        
        if (!currData || !nextData) continue;
        
        // Check each metric to see if it improved
        FITNESS_METRICS.forEach(metric => {
          let a = parseFloat(currData[metric.key]);
          let b = parseFloat(nextData[metric.key]);
          
          if (isNaN(a) || isNaN(b)) return;
          
          // Use standard comparison logic
          const improved = metric.higherIsBetter ? b > a : b < a;
          if (improved) {
            improvedStationsSet.add(metric.key);
          }
        });
      }
    }
    
    // Only count participant if they improved in >= stationThreshold unique stations
    if (improvedStationsSet.size >= stationThreshold) {
      improvedParticipants.add(participantKey);
    } else {
      notImprovedInSkipped.push(participantMap[participantKey].displayName);
    }
  });
  
  console.log(`[DEBUG SKIPPED] Participants NOT improved (need ${stationThreshold}+ stations): ${notImprovedInSkipped.length}`);
  if (notImprovedInSkipped.length > 0 && notImprovedInSkipped.length <= 5) {
    console.log(`  → ${JSON.stringify(notImprovedInSkipped)}`);
  }
  
  return {
    caseType: 'skipped_years',
    improvedParticipants: Array.from(improvedParticipants),
    count: improvedParticipants.size,
    yearPairs: generateSkippedYearPairs(years)
  };
};

/**
 * MAIN ANALYSIS FUNCTION
 * Calculates unique participants who improved across consecutive and skipped years cases
 * Each participant counted only once even if they improved in both cases
 */
export const analyzeParticipantImprovementAllCases = (participantMap, years, stationThreshold = 1) => {
  if (!participantMap || Object.keys(participantMap).length === 0 || !years || years.length < 2) {
    return {
      totalParticipants: 0,
      uniqueImprovedParticipants: [],
      uniqueCount: 0,
      cases: {
        consecutiveYears: { count: 0, participants: [] },
        skippedYears: { count: 0, participants: [] }
      },
      summary: {
        stationThreshold,
        totalUnique: 0
      }
    };
  }

  // Get qualified participants
  const qualifiedParticipants = Object.entries(participantMap).filter(
    ([_, participant]) => Object.keys(participant.years || {}).length === years.length
  );

  console.log(`[DEBUG] ========================================`);
  console.log(`[DEBUG] ANALYSIS STARTED - Station threshold: ${stationThreshold}`);
  console.log(`[DEBUG] Total participants in map: ${Object.keys(participantMap).length}`);
  console.log(`[DEBUG] Qualified (2+ years): ${qualifiedParticipants.length}`);
  console.log(`[DEBUG] Years available: ${JSON.stringify(years)}`);
  console.log(`[DEBUG] ========================================`);

  // Analyze each case type
  const consecutiveYears = analyzeConsecutiveYearsImprovement(participantMap, years, stationThreshold);
  const skippedYears = analyzeSkippedYearsImprovement(participantMap, years, stationThreshold);

  console.log(`[DEBUG] Consecutive years improved: ${consecutiveYears.count}`);
  console.log(`[DEBUG] Skipped years improved: ${skippedYears.count}`);

  // Combine all improved participants (unique set)
  const allImprovedSet = new Set([
    ...consecutiveYears.improvedParticipants,
    ...skippedYears.improvedParticipants
  ]);

  const uniqueImprovedList = Array.from(allImprovedSet).map(participantKey => ({
    participantKey,
    displayName: participantMap[participantKey].displayName,
    gender: participantMap[participantKey].gender,
    improvedIn: {
      consecutiveYears: consecutiveYears.improvedParticipants.includes(participantKey),
      skippedYears: skippedYears.improvedParticipants.includes(participantKey)
    }
  }));

  // Find who didn't improve
  const notImprovedParticipants = qualifiedParticipants
    .filter(([key]) => !allImprovedSet.has(key))
    .map(([key, p]) => ({
      name: p.displayName,
      key: key,
      yearsCount: Object.keys(p.years).length
    }));
  
  if (notImprovedParticipants.length > 0) {
    console.log(`[DEBUG] ⚠️ Participants NOT counted as improved (${notImprovedParticipants.length}):`);
    notImprovedParticipants.forEach(p => {
      console.log(`  → ${p.name} (key: ${p.key}, years: ${p.yearsCount})`);
    });
  } else {
    console.log(`[DEBUG] ✅ ALL qualified participants ARE improved`);
  }

  console.log(`[DEBUG] ✅ TOTAL IMPROVED (unique): ${allImprovedSet.size}/${qualifiedParticipants.length}`);
  console.log(`[DEBUG] 📊 Breakdown:`);
  console.log(`       Consecutive years: ${consecutiveYears.count}`);
  console.log(`       Skipped years: ${skippedYears.count}`);
  console.log(`       Union (unique): ${allImprovedSet.size}`);
  console.log(`[DEBUG] ========================================`);
  
  if (notImprovedParticipants.length === 1) {
    const missing = notImprovedParticipants[0];
    console.log(`\n🔴 🔴 🔴 MISSING PARTICIPANT: "${missing.name}" 🔴 🔴 🔴\n`);
  }

  return {
    totalParticipants: Object.keys(participantMap).length,
    uniqueImprovedParticipants: uniqueImprovedList,
    uniqueCount: allImprovedSet.size,
    cases: {
      consecutiveYears: {
        count: consecutiveYears.count,
        participants: consecutiveYears.improvedParticipants,
        yearPairs: consecutiveYears.yearPairs
      },
      skippedYears: {
        count: skippedYears.count,
        participants: skippedYears.improvedParticipants,
        yearPairs: skippedYears.yearPairs
      }
    },
    summary: {
      stationThreshold,
      totalUnique: allImprovedSet.size,
      percentageImproved: ((allImprovedSet.size / qualifiedParticipants.length) * 100).toFixed(2)
    }
  };
};

/**
 * Helper: Generate consecutive year pairs
 */
const generateConsecutiveYearPairs = (years) => {
  const sorted = years.slice().sort();
  const pairs = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    pairs.push(`${sorted[i]}→${sorted[i + 1]}`);
  }
  return pairs;
};

/**
 * Helper: Generate skipped year pairs
 */
const generateSkippedYearPairs = (years) => {
  const sorted = years.slice().sort();
  const pairs = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 2; j < sorted.length; j++) {
      pairs.push(`${sorted[i]}→${sorted[j]}`);
    }
  }
  return pairs;
};

/**
 * Format analysis results for display or logging
 */
export const formatImprovementAnalysisReport = (analysis) => {
  const report = {
    title: 'Participant Improvement Analysis Report',
    date: new Date().toISOString(),
    stationThreshold: analysis.summary.stationThreshold,
    statistics: {
      totalParticipants: analysis.totalParticipants,
      uniqueImprovedParticipants: analysis.uniqueCount,
      improvementPercentage: `${analysis.summary.percentageImproved}%`
    },
    caseBreakdown: {
      'Consecutive Years': {
        count: analysis.cases.consecutiveYears.count,
        yearPairs: analysis.cases.consecutiveYears.yearPairs,
        participants: analysis.cases.consecutiveYears.participants
      },
      'Skipped Years': {
        count: analysis.cases.skippedYears.count,
        yearPairs: analysis.cases.skippedYears.yearPairs,
        participants: analysis.cases.skippedYears.participants
      }
    },
    uniqueImprovedList: analysis.uniqueImprovedParticipants.map(p => ({
      name: p.displayName,
      gender: p.gender,
      improvedIn: Object.entries(p.improvedIn)
        .filter(([_, value]) => value)
        .map(([key]) => key)
    }))
  };

  return report;
};

/**
 * Export as JSON for external analysis
 */
export const exportAnalysisAsJSON = (analysis) => {
  return JSON.stringify(formatImprovementAnalysisReport(analysis), null, 2);
};
