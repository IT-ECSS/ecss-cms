#!/usr/bin/env node

/**
 * Fitness Improvement Analysis - Standalone Analysis Script
 * 
 * Usage:
 *   node fitnessAnalysisScript.js <dataFile.json> [stationThreshold]
 * 
 * Example:
 *   node fitnessAnalysisScript.js fitness_data.json 2
 * 
 * The script expects a JSON file with structure:
 * {
 *   "participantMap": { ... },
 *   "years": ["2024", "2025", "2026"],
 *   "maleCount": 100,
 *   "femaleCount": 150,
 *   ...
 * }
 */

const fs = require('fs');
const path = require('path');

const FITNESS_METRICS = [
  { key: '30 secs Sit & Stand', label: '30 Secs Sit & Stand', unit: 'reps', higherIsBetter: true },
  { key: '30 secs Arm Curl', label: '30 Secs Arm Curl', unit: 'reps', higherIsBetter: true },
  { key: '2 min March on the spot', label: '2 Min March On The Spot', unit: 'steps', higherIsBetter: true },
  { key: 'Sit & Reach', label: 'Sit & Reach', unit: 'cm', higherIsBetter: true },
  { key: 'Back Stretch', label: 'Back Stretch', unit: 'cm', higherIsBetter: true },
  { key: '2.44m speed walk', label: '2.44m Speed Walk', unit: 'sec', higherIsBetter: false },
  { key: 'Grip Test', label: 'Grip Test', unit: 'kg', higherIsBetter: true }
];

const checkYearPairImprovement = (currYearData, nextYearData, stationThreshold = 1) => {
  let improvedCount = 0;
  
  FITNESS_METRICS.forEach(metric => {
    let a = parseFloat(currYearData[metric.key]);
    let b = parseFloat(nextYearData[metric.key]);
    
    if (isNaN(a) || isNaN(b)) return;
    
    // Handle potential unit mismatch: if one value is much smaller than the other for time metrics
    if (metric.key === '2.44m speed walk') {
      const ratio = Math.max(a, b) / Math.min(a, b);
      if (ratio > 100) {
        // Likely milliseconds vs seconds issue - convert smaller value
        if (a < b / 10) {
          a = a * 1000;
        }
        if (b < a / 10) {
          b = b * 1000;
        }
      }
    }
    
    // Use standard comparison logic: check if improvement occurred
    const improved = metric.higherIsBetter ? b > a : b < a;
    if (improved) improvedCount++;
  });
  
  return improvedCount >= stationThreshold;
};

const analyzeConsecutiveYearsImprovement = (participantMap, years, stationThreshold = 1) => {
  const improvedParticipants = new Set();
  const sortedYears = years.slice().sort();
  
  // Filter to only qualified participants who attended ALL years
  const qualifiedParticipants = Object.entries(participantMap).filter(
    ([_, participant]) => Object.keys(participant.years || {}).length === years.length
  );
  
  qualifiedParticipants.forEach(([participantKey, participant]) => {
    // Collect all unique stations improved across all year pairs
    const improvedStationsSet = new Set();
    
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
        
        // Handle potential unit mismatch: if one value is much smaller than the other for time metrics
        if (metric.key === '2.44m speed walk') {
          const ratio = Math.max(a, b) / Math.min(a, b);
          if (ratio > 100) {
            // Likely milliseconds vs seconds issue - convert smaller value
            if (a < b / 10) {
              a = a * 1000;
            }
            if (b < a / 10) {
              b = b * 1000;
            }
          }
        }
        
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
    }
  });
  
  return {
    caseType: 'consecutive_years',
    improvedParticipants: Array.from(improvedParticipants),
    count: improvedParticipants.size,
    yearPairs: generateConsecutiveYearPairs(years)
  };
};

const analyzeSkippedYearsImprovement = (participantMap, years, stationThreshold = 1) => {
  const improvedParticipants = new Set();
  const sortedYears = years.slice().sort();
  
  // Filter to only qualified participants who attended ALL years
  const qualifiedParticipants = Object.entries(participantMap).filter(
    ([_, participant]) => Object.keys(participant.years || {}).length === years.length
  );
  
  qualifiedParticipants.forEach(([participantKey, participant]) => {
    // Collect all unique stations improved across all skipped year pairs
    const improvedStationsSet = new Set();
    
    for (let i = 0; i < sortedYears.length - 1; i++) {
      for (let j = i + 2; j < sortedYears.length; j++) {
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
          
          // Handle potential unit mismatch: if one value is much smaller than the other for time metrics
          if (metric.key === '2.44m speed walk') {
            const ratio = Math.max(a, b) / Math.min(a, b);
            if (ratio > 100) {
              // Likely milliseconds vs seconds issue - convert smaller value
              if (a < b / 10) {
                a = a * 1000;
              }
              if (b < a / 10) {
                b = b * 1000;
              }
            }
          }
          
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
    }
  });
  
  return {
    caseType: 'skipped_years',
    improvedParticipants: Array.from(improvedParticipants),
    count: improvedParticipants.size,
    yearPairs: generateSkippedYearPairs(years)
  };
};

const analyzeOverallImprovement = (participantMap, years, stationThreshold = 1) => {
  // Removed - no longer needed
  return null;
};

const generateConsecutiveYearPairs = (years) => {
  const sorted = years.slice().sort();
  const pairs = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    pairs.push(`${sorted[i]}→${sorted[i + 1]}`);
  }
  return pairs;
};

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

const analyzeParticipantImprovementAllCases = (participantMap, years, stationThreshold = 1) => {
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

  const consecutiveYears = analyzeConsecutiveYearsImprovement(participantMap, years, stationThreshold);
  const skippedYears = analyzeSkippedYearsImprovement(participantMap, years, stationThreshold);

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
      percentageImproved: ((allImprovedSet.size / Object.keys(participantMap).length) * 100).toFixed(2)
    }
  };
};

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ No data file provided');
    console.error('Usage: node fitnessAnalysisScript.js <dataFile.json> [stationThreshold]');
    process.exit(1);
  }

  const dataFile = args[0];
  const stationThreshold = args.length > 1 ? parseInt(args[1]) : 1;

  if (!fs.existsSync(dataFile)) {
    console.error(`❌ File not found: ${dataFile}`);
    process.exit(1);
  }

  try {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    
    if (!data.participantMap || !data.years) {
      console.error('❌ Invalid data format. Expected { participantMap, years, ... }');
      process.exit(1);
    }

    console.log('\n📊 Fitness Improvement Analysis Report');
    console.log('═'.repeat(60));
    console.log(`📁 Data File: ${dataFile}`);
    console.log(`🎯 Station Threshold: ≥ ${stationThreshold} metrics`);
    console.log(`📅 Years Analyzed: ${data.years.sort().join(', ')}`);
    console.log('═'.repeat(60) + '\n');

    const analysis = analyzeParticipantImprovementAllCases(
      data.participantMap,
      data.years,
      stationThreshold
    );

    // Summary Statistics
    console.log('📈 SUMMARY STATISTICS\n');
    console.log(`  Total Participants:        ${analysis.totalParticipants}`);
    console.log(`  Unique Participants Improved: ${analysis.uniqueCount}`);
    console.log(`  Improvement Rate:          ${analysis.summary.percentageImproved}%\n`);

    // Case Breakdown
    console.log('📊 BREAKDOWN BY CASE TYPE\n');
    console.log(`  1️⃣  Consecutive Years: ${analysis.cases.consecutiveYears.count} participants`);
    if (analysis.cases.consecutiveYears.yearPairs.length > 0) {
      console.log(`      Year Pairs: ${analysis.cases.consecutiveYears.yearPairs.join(', ')}`);
    }
    console.log();

    console.log(`  2️⃣  Skipped Years: ${analysis.cases.skippedYears.count} participants`);
    if (analysis.cases.skippedYears.yearPairs.length > 0) {
      const pairs = analysis.cases.skippedYears.yearPairs;
      const displayPairs = pairs.length > 5 
        ? `${pairs.slice(0, 5).join(', ')}, ...${pairs.length - 5} more`
        : pairs.join(', ');
      console.log(`      Year Pairs: ${displayPairs}`);
    }
    console.log();

    // Detailed Participants List
    if (analysis.uniqueImprovedParticipants.length > 0) {
      console.log('✅ UNIQUE PARTICIPANTS IMPROVED\n');
      analysis.uniqueImprovedParticipants.forEach((p, idx) => {
        const cases = [];
        if (p.improvedIn.consecutiveYears) cases.push('Consecutive');
        if (p.improvedIn.skippedYears) cases.push('Skipped');
        
        console.log(`  ${String(idx + 1).padStart(3, ' ')}.  ${p.displayName} (${p.gender})`);
        console.log(`      📍 Improved in: ${cases.join(', ')}`);
      });
      console.log();
    }

    // Export results
    const outputFile = dataFile.replace(/\.json$/, '_analysis_results.json');
    const results = {
      timestamp: new Date().toISOString(),
      dataFile,
      stationThreshold,
      analysis
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n✅ Analysis results saved to: ${outputFile}\n`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
