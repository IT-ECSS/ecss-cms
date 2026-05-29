import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import ActionButtonRow from './components/ActionButtonRow';
import ColumnTogglePanel from './components/ColumnTogglePanel';
import '../../../../../css/ag-grid-custom-theme.css'; // Import custom AgGrid theme
import '../../../../../css/column-toggle-panel.css'; // Import column toggle panel styles (from src/css)

// ─── Shared filter helpers ─────────────────────────────────────────────────────

/**
 * Get skipped years between two years
 */
const getSkippedYears = (fromYear, toYear) => {
  const from = parseInt(fromYear);
  const to = parseInt(toYear);
  if (to <= from + 1) return [];
  const skipped = [];
  for (let y = from + 1; y < to; y++) {
    skipped.push(y);
  }
  return skipped;
};

/**
 * Format comparison header with skipped years notation
 */
const formatComparisonHeader = (fromYear, toYear) => {
  const skippedYears = getSkippedYears(fromYear, toYear);
  const skippedText = skippedYears.length > 0 ? ` (skipped: ${skippedYears.join(', ')})` : '';
  return `${fromYear} - ${toYear}${skippedText}`;
};

const filterRowsBySearchTerm = (rowData, searchTerm) => {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return rowData;

  return rowData.filter(row => {
    const allValues = Object.values(row)
      .filter(v => v !== null && v !== undefined)
      .map(v => String(v))
      .join(' ')
      .toLowerCase();
    return allValues.includes(query);
  });
};

const filterPivotedRowsBySearchTerm = (rowData, searchTerm) => {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return rowData;

  return rowData.filter(row => {
    // Search fixed fields
    const fixedStr = [row.Name, row['Phone Number'], row.Gender, row.DD, row.MM, row.YYYY]
      .filter(Boolean).map(String).join(' ').toLowerCase();
    if (fixedStr.includes(query)) return true;
    // Search across all year data
    const yearStr = Object.values(row._yearData || {})
      .flatMap(yr => Object.values(yr).filter(Boolean).map(String))
      .join(' ').toLowerCase();
    return yearStr.includes(query);
  });
};


// ─── Single-year layout (original) ────────────────────────────────────────────

const COLUMN_WIDTHS = {
  'S/N': 100,
  'Name': 250,
  'Date of Birth': 200,
  'Contact Number': 250,
  'Gender': 200,
  'Years Attended': 250,
  '30 secs Sit & Stand': 250,
  '30 secs Dumbbell Curl': 250,
  '2 min On-the-spot Marching': 350,
  'Sit & Reach': 150,
  'Back Stretching': 200,
  '2.44m Speed Walk': 250,
  'Grip test': 150,
  'Year': 150,
  'Comparison': 400,
};

const buildColumnDefinitions = (data) => {
  if (!data || data.length === 0) return [];
  const allColumns = Object.keys(data[0]);
  
  const EXCLUDED = ['chinese name', 'year', 'location', 's/n', 'date of test', 'dd', 'mm', 'yyyy', 'improvements', 'remarks', 'height', 'weight', 'bmi', 'age'];
  const filteredColumns = allColumns
    .filter(col => !EXCLUDED.includes(col.toLowerCase()));
  
  const snColumn = {
    headerName: 'S/N',
    sortable: false,
    width: COLUMN_WIDTHS['S/N'],
    pinned: 'left',
    cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    valueGetter: (params) => params.node.rowIndex + 1
  };
  
  const dateOfBirthColumn = {
    headerName: 'Date of Birth',
    field: 'Date of Birth',
    sortable: true,
    width: COLUMN_WIDTHS['Date of Birth'],
    pinned: 'left',
    cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    valueGetter: (params) => {
      const dd = params.data['DD'];
      const mm = params.data['MM'];
      const yyyy = params.data['YYYY'];
      return dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : '';
    }
  };
  
  const columnDefs = [snColumn];
  
  filteredColumns.forEach((col) => {
    const colDef = {
      headerName: col,
      field: col,
      sortable: true,
      width: COLUMN_WIDTHS[col],
      pinned: ['Name', 'Contact Number', 'Gender'].includes(col) ? 'left' : undefined,
      cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
      valueGetter: col === 'Name'
        ? (params) => {
            const name = params.data['Name'] || '';
            const chinese = params.data['Chinese Name'] || '';
            const raw = name || chinese;
            if (!name && chinese) return chinese;
            return raw.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
          }
        : col === 'Gender'
        ? (params) => {
            const g = (params.data['Gender'] || '').trim().toUpperCase();
            if (g === 'M') return 'Male';
            if (g === 'F') return 'Female';
            return params.data['Gender'] || '';
          }
        : (params) => params.data[col]
    };
    if (col === 'Name') {
      columnDefs.push(colDef);
      columnDefs.push(dateOfBirthColumn);
    } else if (col === 'Gender') {
      columnDefs.push(colDef);
      // Add Years Attended column after Gender
      columnDefs.push({
        headerName: 'Years Attended',
        sortable: true,
        width: COLUMN_WIDTHS['Years Attended'],
        pinned: 'left',
        cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        valueGetter: (params) => {
          // For single-year view, count unique years in data
          const uniqueYears = new Set();
          data.forEach(row => {
            if (row.year) uniqueYears.add(String(row.year).trim());
          });
          return uniqueYears.size;
        }
      });
    } else {
      columnDefs.push(colDef);
    }
  });
  
  return columnDefs;
};

// ─── Multi-year layout ─────────────────────────────────────────────────────────

// Stations where a lower value is better
const LOWER_IS_BETTER = new Set(['2.44m Speed Walk']);

// Columns that are shown once (personal info, not year-specific)
const FIXED_COLUMNS = ['Name', 'Contact Number', 'Gender'];

// Measurement columns — hidden in multi-year view
const MEASUREMENT_COLUMNS = [];

// Station columns shown per-year WITH comparison colouring
const STATION_COLUMNS = [
  '30 secs Sit & Stand',
  '30 secs Dumbbell Curl',
  '2 min On-the-spot Marching',
  'Sit & Reach',
  'Back Stretching',
  '2.44m Speed Walk',
  'Grip test'
];

// Case-insensitive field lookup — handles sheets where headers differ in capitalisation year to year
const getField = (row, ...names) => {
  if (!row || typeof row !== 'object') return '';
  const keys = Object.keys(row);
  for (const name of names) {
    const lower = name.toLowerCase();
    const found = keys.find(k => k.toLowerCase() === lower);
    if (found !== undefined && row[found] !== undefined && row[found] !== '') return row[found];
  }
  return '';
};

/**
 * Build a composite identity key from name + phone + DOB + gender.
 * Only fields that are actually present are included, so the key is as
 * specific as the data allows.  Two rows share a key — and are therefore
 * treated as the same person across years — only when EVERY field present
 * in the key agrees.  This prevents phone-only collisions (e.g. "Bggh" and
 * "LEONG CHOY GHEE" sharing the same phone but being different people).
 */
const buildParticipantKey = (row) => {
  const rawName = getField(row, 'Name', 'Full Name', 'Participant Name') || getField(row, 'Chinese Name');
  const normalizedName = rawName.toLowerCase().replace(/\s+/g, ' ').trim();

  const rawPhone = getField(row, 'Phone Number', 'Phone No', 'Phone', 'Contact', 'Contact Number', 'Mobile', 'Mobile Number');
  const cleanPhone = rawPhone.toString().replace(/\D/g, '').trim();
  const hasValidPhone = cleanPhone.length >= 7;

  const dd   = String(getField(row, 'DD')   || '').trim();
  const mm   = String(getField(row, 'MM')   || '').trim();
  const yyyy = String(getField(row, 'YYYY') || '').trim();
  const dob  = dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : '';

  const gender = (getField(row, 'Gender', 'Sex') || '').toString().trim().toUpperCase();

  // Concatenate only the fields that are present
  const parts = [];
  if (normalizedName)  parts.push(`n:${normalizedName}`);
  if (hasValidPhone)   parts.push(`p:${cleanPhone}`);
  if (dob)             parts.push(`d:${dob}`);
  if (gender)          parts.push(`g:${gender}`);

  return parts.length > 0 ? parts.join('||') : null;
};

/**
 * Pivot flat rows into one row per participant.
 * Each row gets a _yearData map: { [year]: rawRow }
 *
 * Identity is determined by a composite key of name + phone + DOB + gender.
 * No fuzzy / word-subset matching and no phone-only fallback — this prevents
 * unrelated people who happen to share a phone number from being merged.
 */
const buildPivotedRowData = (data) => {
  const map = new Map();

  data.forEach(row => {
    const year = String(row.year || '').trim();
    if (!year) return;

    const key = buildParticipantKey(row);
    if (!key) return; // cannot identify this row at all

    if (!map.has(key)) {
      const rawName  = getField(row, 'Name', 'Full Name', 'Participant Name') || getField(row, 'Chinese Name');
      const rawPhone = getField(row, 'Phone Number', 'Phone No', 'Phone', 'Contact', 'Contact Number', 'Mobile', 'Mobile Number');
      map.set(key, {
        Name: rawName,
        'Phone Number': rawPhone,
        Gender: getField(row, 'Gender', 'Sex'),
        DD:   getField(row, 'DD'),
        MM:   getField(row, 'MM'),
        YYYY: getField(row, 'YYYY'),
        _yearData: {}
      });
    }

    const entry = map.get(key);
    if (!entry._yearData[year]) {
      entry._yearData[year] = row;
    }
  });

  return Array.from(map.values());
};

/**
 * Returns "+N.N" / "-N.N" / "" for the difference between two year values.
 */
const calcComparison = (prevRaw, currRaw) => {
  const p = parseFloat(prevRaw);
  const c = parseFloat(currRaw);
  if (isNaN(p) || isNaN(c)) return '';
  const diff = c - p;
  if (diff === 0) return '0';
  return diff > 0 ? `▲  +${diff.toFixed(1)}` : `▼  ${diff.toFixed(1)}`;
};

/**
 * Build AgGrid column defs for multi-year view.
 * Outer groups = Stations. Sub-columns per station = Year1 | Year2 | Y1→Y2 | Year3 | Y2→Y3 | … | Y1→Y3 | …
 * Shows all year combinations including non-consecutive years
 */
const buildMultiYearColumnDefs = (years) => {
  const colDefs = [];

  // S/N (pinned)
  colDefs.push({
    headerName: 'S/N',
    sortable: false,
    width: COLUMN_WIDTHS['S/N'],
    pinned: 'left',
    cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    valueGetter: (params) => params.node.rowIndex + 1
  });

  // Name (pinned) — clicking the cell navigates to the visualization tab
  colDefs.push({
    headerName: 'Name',
    field: 'Name',
    sortable: true,
    width: COLUMN_WIDTHS['Name'],
    pinned: 'left',
    cellStyle: () => ({ cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
    valueGetter: (params) => {
      const name = params.data['Name'] || '';
      let chinese = '';
      const yearData = params.data._yearData;
      if (yearData) {
        const firstYear = Object.values(yearData)[0];
        if (firstYear) chinese = firstYear['Chinese Name'] || '';
      }
      const raw = name || chinese;
      if (!name && chinese) return chinese;
      return raw.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
    }
  });

  // Date of Birth
  colDefs.push({
    headerName: 'Date of Birth',
    sortable: true,
    width: COLUMN_WIDTHS['Date of Birth'],
    pinned: 'left',
    cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    valueGetter: (params) => {
      const { DD, MM, YYYY } = params.data;
      return DD && MM && YYYY ? `${DD}/${MM}/${YYYY}` : '';
    }
  });

  // Contact Number
  colDefs.push({
    headerName: 'Contact Number',
    field: 'Phone Number',
    sortable: true,
    width: COLUMN_WIDTHS['Contact Number'],
    pinned: 'left',
    cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  });

  // Gender
  colDefs.push({
    headerName: 'Gender',
    field: 'Gender',
    sortable: true,
    width: COLUMN_WIDTHS['Gender'],
    pinned: 'left',
    cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    valueGetter: (params) => {
      const g = (params.data.Gender || '').trim().toUpperCase();
      if (g === 'M') return 'Male';
      if (g === 'F') return 'Female';
      return params.data.Gender || '';
    }
  });

  // Years Attended
  colDefs.push({
    headerName: 'Years Attended',
    sortable: true,
    width: COLUMN_WIDTHS['Years Attended'],
    pinned: 'left',
    cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    valueGetter: (params) => {
      const yearData = params.data._yearData || {};
      const attendedYears = Object.keys(yearData).length;
      return attendedYears;
    }
  });

  // Per station: Year columns first, then all comparison combinations
  STATION_COLUMNS.forEach(col => {
    const lowerBetter = LOWER_IS_BETTER.has(col);
    const children = [];

    // Add year columns
    years.forEach(year => {
      children.push({
        headerName: String(year),
        sortable: true,
        width: COLUMN_WIDTHS['Year'],
        cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        valueGetter: (params) => {
          const yd = params.data._yearData[year];
          if (!yd) return '';
          const val = getField(yd, col);
          if (val === '' || val === null || val === undefined) return '';
          const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
          return isNaN(num) ? '' : val;
        }
      });
    });

    // Add all comparison columns (both consecutive and non-consecutive)
    for (let i = 0; i < years.length - 1; i++) {
      for (let j = i + 1; j < years.length; j++) {
        const fromYear = years[i];
        const toYear = years[j];
        const headerText = formatComparisonHeader(fromYear, toYear);
        children.push({
          headerName: headerText,
          sortable: true,
          valueGetter: (params) => {
            const yearData = params.data._yearData;
            if (!yearData) return '';
            const prevRaw = getField(yearData[fromYear], col);
            const currRaw = getField(yearData[toYear], col);
            return calcComparison(prevRaw, currRaw);
          },
          comparator: (a, b) => {
            const parse = v => {
              if (!v || v === '-') return NaN;
              const n = parseFloat(String(v).replace(/[▲▼\s+]/g, ''));
              return isNaN(n) ? NaN : n;
            };
            const na = parse(a), nb = parse(b);
            if (isNaN(na) && isNaN(nb)) return 0;
            if (isNaN(na)) return -1;
            if (isNaN(nb)) return 1;
            return na - nb;
          },
          width: COLUMN_WIDTHS['Comparison'],
          cellStyle: (params) => {
            let baseStyle = { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' };
            const val = parseFloat(String(params.value).replace(/[▲▼\s+]/g, ''));
            if (!params.value || params.value === '' || params.value === '-' || isNaN(val) || val === 0) return baseStyle;
            const improved = lowerBetter ? val < 0 : val > 0;
            return {
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: improved ? '#2e7d32' : '#c62828',
              fontWeight: 'bold',
              backgroundColor: improved ? '#e8f5e9' : '#ffebee'
            };
          }
        });
      }
    }

    colDefs.push({
      headerName: col,
      children
    });
  });

  return colDefs;
};

// ─── Shared row style ──────────────────────────────────────────────────────────

const getRowStyleForEntries = (params) => {
  const gender = params.data.Gender;
  if (gender === 'M') return { background: '#e3f2fd', color: '#1976d2', fontWeight: 'bold' };
  if (gender === 'F') return { background: '#fce4ec', color: '#c2185b', fontWeight: 'bold' };
  return {};
};

// ─── EntriesTable ──────────────────────────────────────────────────────────────

class EntriesTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      quickFilterText: '',
      visibleColumns: ['S/N', 'Name', 'Date of Birth', 'Contact Number', 'Gender', 'Years Attended'], // Initialize with all columns
      allAvailableColumns: ['S/N', 'Name', 'Date of Birth', 'Contact Number', 'Gender', 'Years Attended'],
      phoneNumberHeaderToggle: false // Toggle between "Phone Number" and "Contact Number"
    };
    this.gridRef = React.createRef();
  }

  componentDidMount() {
    // Initialize visible columns with all columns by default
    const { data } = this.props;
    if (data && data.length > 0) {
      const allColumns = this.getAllColumnNames(data);
      this.setState({
        visibleColumns: allColumns,
        allAvailableColumns: allColumns
      });
    }
  }

  getAllColumnNames = (data) => {
    // Return only pinned columns for toggling
    return ['S/N', 'Name', 'Date of Birth', 'Contact Number', 'Gender', 'Years Attended'];
  }

  handleColumnToggle = (columnName) => {
    this.setState((prevState) => {
      const newVisibleColumns = prevState.visibleColumns.includes(columnName)
        ? prevState.visibleColumns.filter(col => col !== columnName)
        : [...prevState.visibleColumns, columnName];
      return { visibleColumns: newVisibleColumns };
    });
  }

  handleSelectAll = () => {
    this.setState((prevState) => ({
      visibleColumns: prevState.allAvailableColumns
    }));
  }

  handleDeselectAll = () => {
    this.setState({
      visibleColumns: []
    });
  }

  filterColumnDefsByVisibility = (columnDefs) => {
    const { visibleColumns } = this.state;
    const pinnedColumns = ['S/N', 'Name', 'Date of Birth', 'Contact Number', 'Gender', 'Years Attended'];
    
    // Filter out hidden pinned columns
    return columnDefs.filter(colDef => {
      const headerName = colDef.headerName || '';
      // If it's a pinned column, check visibility state
      if (pinnedColumns.includes(headerName)) {
        return visibleColumns.includes(headerName);
      }
      // Always show non-pinned columns (station columns)
      return true;
    });
  }

  handleOnFilterTextChange = (e) => {
    this.setState({ quickFilterText: e.target.value });
  }

  handleOnRowClicked = (event) => {
    const { onRowClick } = this.props;
    if (onRowClick) onRowClick(event.data);
  }

  exportToExcel = async () => {
    const { data, yearFrom, yearTo } = this.props;
    const { quickFilterText } = this.state;

    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      // Build year range
      const yearsInData = [...new Set(data.map(r => String(r.year || '').trim()).filter(Boolean))].sort();
      let years = yearsInData;
      if (yearFrom && yearTo && yearFrom !== yearTo) {
        const from = parseInt(yearFrom);
        const to = parseInt(yearTo);
        if (!isNaN(from) && !isNaN(to) && to > from) {
          const fullRange = [];
          for (let y = from; y <= to; y++) fullRange.push(String(y));
          years = fullRange;
        }
      }
      const isMultiYear = years.length > 1;

      // Get filtered data
      let rowData;
      if (isMultiYear) {
        rowData = filterPivotedRowsBySearchTerm(buildPivotedRowData(data), quickFilterText);
      } else {
        rowData = filterRowsBySearchTerm(data, quickFilterText);
      }

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Fitness Results');

      // Define headers based on layout
      const headerRow = [];
      const headerStyle = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'FFFF8C00' } }, // Orange
        font: { bold: true, color: { rgb: 'FFFFFFFF' }, size: 11 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      };
      const cellStyle = {
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      };

      // Build headers
      const headerStructure = [];
      headerStructure.push('S/N', 'Name', 'Date of Birth', 'Contact Number', 'Gender', 'Years Attended');

      if (isMultiYear) {
        // Multi-year layout with all comparisons (consecutive and non-consecutive)
        STATION_COLUMNS.forEach(station => {
          // Add year columns first
          years.forEach(year => {
            headerStructure.push(`${station} (${year})`);
          });
          // Add all comparison columns
          for (let i = 0; i < years.length - 1; i++) {
            for (let j = i + 1; j < years.length; j++) {
              const fromYear = years[i];
              const toYear = years[j];
              const headerText = formatComparisonHeader(fromYear, toYear);
              headerStructure.push(`${station}\nImprovement: ${headerText}`);
            }
          }
        });
      } else {
        // Single year layout
        STATION_COLUMNS.forEach(station => {
          headerStructure.push(station);
        });
      }

      // Add header row
      const headerExcelRow = worksheet.addRow(headerStructure);
      headerExcelRow.height = 40; // Increase height for multi-line headers
      headerExcelRow.eachCell((cell) => {
        Object.assign(cell, headerStyle);
      });

      // Set column widths
      worksheet.columns.forEach((col, idx) => {
        const headerText = headerStructure[idx] || '';
        if (headerText.includes('Date')) col.width = 18;
        else if (headerText.includes('Phone')) col.width = 18;
        else if (headerText.includes('Name')) col.width = 22;
        else if (headerText.includes('Years')) col.width = 20;
        else if (headerText.includes('Improvement')) col.width = 32;
        else col.width = 16;
      });

      // Add data rows
      rowData.forEach((row, idx) => {
        const excelRow = [];
        excelRow.push(idx + 1); // S/N

        // Fixed columns
        excelRow.push(row.Name || '');
        const dd = row.DD || '';
        const mm = row.MM || '';
        const yyyy = row.YYYY || '';
        const dob = dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : '';
        excelRow.push(dob);
        excelRow.push(row['Phone Number'] || '');

        // Gender formatting
        const gender = (row.Gender || '').trim().toUpperCase();
        const genderDisplay = gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : row.Gender || '';
        excelRow.push(genderDisplay);

        // Years Attended
        if (isMultiYear) {
          const yearCount = Object.keys(row._yearData || {}).length;
          excelRow.push(yearCount);
        } else {
          // For single year, count total unique years in data
          const uniqueYears = new Set();
          data.forEach(r => {
            if (r.year) uniqueYears.add(String(r.year).trim());
          });
          excelRow.push(uniqueYears.size);
        }

        // Station data
        if (isMultiYear) {
          STATION_COLUMNS.forEach(col => {
            // Add year data first
            years.forEach(year => {
              const yd = row._yearData?.[year];
              if (yd) {
                const val = getField(yd, col);
                excelRow.push(val || '');
              } else {
                excelRow.push('');
              }
            });
            // Add all comparison columns
            for (let i = 0; i < years.length - 1; i++) {
              for (let j = i + 1; j < years.length; j++) {
                const fromYear = years[i];
                const toYear = years[j];
                const prev = row._yearData?.[fromYear];
                const curr = row._yearData?.[toYear];
                const comparison = calcComparison(
                  prev ? getField(prev, col) : undefined,
                  curr ? getField(curr, col) : undefined
                ) || '';
                excelRow.push(comparison);
              }
            }
          });
        } else {
          STATION_COLUMNS.forEach(col => {
            const val = row[col] || '';
            excelRow.push(val);
          });
        }

        const newRow = worksheet.addRow(excelRow);
        newRow.eachCell((cell) => {
          Object.assign(cell, cellStyle);
          // Color code improvements
          const cellValue = String(cell.value || '').trim();
          if (cellValue.includes('▲') || cellValue.includes('▼')) {
            if (cellValue.includes('▲')) {
              cell.font = { color: { rgb: 'FF2e7d32' }, bold: true }; // Green
            } else {
              cell.font = { color: { rgb: 'FFc62828' }, bold: true }; // Red
            }
          }
        });

        // Color row by gender
        if (gender === 'M') {
          newRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'FFe3f2fd' } }; // Light blue
          });
        } else if (gender === 'F') {
          newRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'FFfce4ec' } }; // Light pink
          });
        }
      });

      // Freeze panes (first 6 columns: S/N, Name, Date of Birth, Contact Number, Gender, Years Attended)
      worksheet.views = [{ state: 'frozen', xSplit: 6, ySplit: 1 }];

      // Generate file
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Fitness_Results_${yearFrom || 'all'}_${yearTo || 'all'}_${dateStr}.xlsx`;
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data: ' + error.message);
    }
  }

  render() {
    const { data, yearFrom, yearTo } = this.props;
    console.log('EntriesTable render', { data: data, yearFrom, yearTo });
    const { quickFilterText, visibleColumns, allAvailableColumns } = this.state;

    if (!data || data.length === 0) {
      return (
        <div className="fft-participants-empty">
          <i className="fas fa-table fft-participants-empty-icon"></i>
          <p>No data available</p>
        </div>
      );
    }

    // Build full year range from yearFrom→yearTo, falling back to years present in data
    const yearsInData = [...new Set(data.map(r => String(r.year || '').trim()).filter(Boolean))].sort();
    let years = yearsInData;
    if (yearFrom && yearTo && yearFrom !== yearTo) {
      const from = parseInt(yearFrom);
      const to = parseInt(yearTo);
      if (!isNaN(from) && !isNaN(to) && to > from) {
        const fullRange = [];
        for (let y = from; y <= to; y++) fullRange.push(String(y));
        years = fullRange;
      }
    }
    const isMultiYear = years.length > 1;

    // Dynamically build rowData and columnDefs based on single vs multi year
    let rowData, columnDefs;
    if (isMultiYear) {
      rowData = filterPivotedRowsBySearchTerm(buildPivotedRowData(data), quickFilterText);
      columnDefs = buildMultiYearColumnDefs(years);
    } else {
      rowData = filterRowsBySearchTerm(data, quickFilterText);
      columnDefs = buildColumnDefinitions(data);
      if (columnDefs.length === 0) {
        return (
          <div className="fft-participants-empty">
            <i className="fas fa-table fft-participants-empty-icon"></i>
            <p>No data available</p>
          </div>
        );
      }
    }

    // Filter columns based on visibility state
    const filteredColumnDefs = this.filterColumnDefsByVisibility(columnDefs);

    return (
      <div className={`fft-entries-table-wrapper${isMultiYear ? ' fft-multi-year-table' : ''}`}>
        {/* Column Toggle Panel */}
        <ColumnTogglePanel
          columns={allAvailableColumns}
          visibleColumns={visibleColumns}
          onColumnToggle={this.handleColumnToggle}
          onSelectAll={this.handleSelectAll}
          onDeselectAll={this.handleDeselectAll}
        />

        <div className="fft-entries-search-bar">
          <div className="fft-entries-search-row">
            <div className="fft-entries-search-icon"><i className="fas fa-search"></i></div>
            <input
              className="fft-entries-search-input"
              type="text"
              value={quickFilterText}
              onChange={this.handleOnFilterTextChange}
              placeholder="Search entries..."
            />
          </div>
        </div>

        <div className="fft-entries-action-bar">
          <ActionButtonRow onExport={this.exportToExcel} />
        </div>

        <div className="grid-container" style={{ width: '100%', marginLeft: '0' }}>
          <AgGridReact
            ref={this.gridRef}
            rowData={rowData}
            columnDefs={filteredColumnDefs}
            domLayout="normal"
            pagination={true}
            paginationPageSize={rowData.length}
            getRowStyle={getRowStyleForEntries}
            onRowClicked={this.handleOnRowClicked}
            onCellClicked={(params) => {
              if (isMultiYear && params.colDef.headerName === 'Name') {
                const { onParticipantClick } = this.props;
                if (onParticipantClick) onParticipantClick(params.data);
              }
            }}
            rowSelection="single"
            animateRows={true}
            suppressCellFocus={true}
          />
        </div>
      </div>
    );
  }
}

// ─── Main export ───────────────────────────────────────────────────────────────

class FitnessParticipantsDetailsTab extends Component {
  render() {
    const { data = [], onRowClick, onParticipantClick, yearFrom, yearTo } = this.props;

    return (
      <div className="fft-participants-subtab-block">
        <div className="fft-participants-subtab-content">
          {data.length === 0 ? (
            <div className="fft-participants-empty">
              <i className="fas fa-users fft-participants-empty-icon"></i>
              <p>No participants found for the selected filters</p>
            </div>
          ) : (
            <EntriesTable
              data={data}
              yearFrom={yearFrom}
              yearTo={yearTo}
              onRowClick={onRowClick}
              onParticipantClick={onParticipantClick}
            />
          )}
        </div>
      </div>
    );
  }
}

export default FitnessParticipantsDetailsTab;
