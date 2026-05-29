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
 * Check if participant improved in a specific year comparison
 * @param {Object} currYearData - Participant data for current year
 * @param {Object} nextYearData - Participant data for next year
 * @param {Number} stationThreshold - Minimum number of stations to count as improved
 * @returns {Boolean} True if improved in >= stationThreshold stations
 */
export const checkYearPairImprovement = (currYearData, nextYearData, stationThreshold = 1) => {
  let improvedCount = 0;
  
  FITNESS_METRICS.forEach(metric => {
    const a = parseFloat(currYearData[metric.key]);
    const b = parseFloat(nextYearData[metric.key]);
    
    if (isNaN(a) || isNaN(b)) return;
    
    // Use standard comparison logic: check if improvement occurred
    const improved = metric.higherIsBetter ? b > a : b < a;
    if (improved) improvedCount++;
  });
  
  return improvedCount >= stationThreshold;
};

/**
 * Analyze improvements for consecutive years
 * e.g., 2024→2025, 2025→2026
 * Only includes participants with data in multiple years
 */
export const analyzeConsecutiveYearsImprovement = (participantMap, years, stationThreshold = 1) => {
  const improvedParticipants = new Set();
  const sortedYears = years.slice().sort();
  
  // Filter to only qualified participants with data in multiple years
  const qualifiedParticipants = Object.entries(participantMap).filter(
    ([_, participant]) => Object.keys(participant.years || {}).length > 1
  );
  
  const notImprovedInConsecutive = [];
  
  qualifiedParticipants.forEach(([participantKey, participant]) => {
    let improved = false;
    // Check only consecutive year pairs
    for (let i = 0; i < sortedYears.length - 1; i++) {
      const currYear = sortedYears[i];
      const nextYear = sortedYears[i + 1];
      
      const currData = participant.years[currYear];
      const nextData = participant.years[nextYear];
      
      if (!currData || !nextData) continue;
      
      if (checkYearPairImprovement(currData, nextData, stationThreshold)) {
        improvedParticipants.add(participantKey);
        improved = true;
        break; // Mark as improved and move to next participant
      }
    }
    if (!improved) {
      notImprovedInConsecutive.push(participantMap[participantKey].displayName);
    }
  });
  
  console.log(`[DEBUG CONSECUTIVE] Participants NOT improved: ${notImprovedInConsecutive.length}`);
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
 */
export const analyzeSkippedYearsImprovement = (participantMap, years, stationThreshold = 1) => {
  const improvedParticipants = new Set();
  const sortedYears = years.slice().sort();
  
  // Filter to only qualified participants with data in multiple years
  const qualifiedParticipants = Object.entries(participantMap).filter(
    ([_, participant]) => Object.keys(participant.years || {}).length > 1
  );
  
  const notImprovedInSkipped = [];
  
  qualifiedParticipants.forEach(([participantKey, participant]) => {
    let improved = false;
    // Check all non-consecutive year pairs (skipped years)
    for (let i = 0; i < sortedYears.length - 1; i++) {
      for (let j = i + 2; j < sortedYears.length; j++) { // j = i + 2 ensures skipped years
        const currYear = sortedYears[i];
        const nextYear = sortedYears[j];
        
        const currData = participant.years[currYear];
        const nextData = participant.years[nextYear];
        
        if (!currData || !nextData) continue;
        
        if (checkYearPairImprovement(currData, nextData, stationThreshold)) {
          improvedParticipants.add(participantKey);
          improved = true;
          break; // Mark as improved and move to next participant
        }
      }
      if (improved) break;
    }
    if (!improved) {
      notImprovedInSkipped.push(participantMap[participantKey].displayName);
    }
  });
  
  console.log(`[DEBUG SKIPPED] Participants NOT improved: ${notImprovedInSkipped.length}`);
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
    ([_, participant]) => Object.keys(participant.years || {}).length > 1
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
