import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import '../../../../../css/ag-grid-custom-theme.css'; // Import custom AgGrid theme

// ─── Shared filter helpers ─────────────────────────────────────────────────────

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
  'Phone Number': 250,
  'Gender': 200,
  '30 secs Sit & Stand': 250,
  '30 secs Dumbbell Curl': 250,
  '2 min On-the-spot Marching': 350,
  'Sit & Reach': 150,
  'Back Stretching': 200,
  '2.44m Speed Walk': 250,
  'Grip test': 150,
  'Year': 150,
  'Comparison': 150,
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
    valueGetter: (params) => params.node.rowIndex + 1
  };
  
  const dateOfBirthColumn = {
    headerName: 'Date of Birth',
    field: 'Date of Birth',
    sortable: true,
    width: COLUMN_WIDTHS['Date of Birth'],
    pinned: 'left',
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
      pinned: ['Name', 'Phone Number', 'Gender'].includes(col) ? 'left' : undefined,
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
const FIXED_COLUMNS = ['Name', 'Phone Number', 'Gender'];

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
 * Outer groups = Stations. Sub-columns per station = Year1 | Year2 | Y1→Y2 | Year3 | Y2→Y3 | …
 */
const buildMultiYearColumnDefs = (years) => {
  const colDefs = [];

  // S/N (pinned)
  colDefs.push({
    headerName: 'S/N',
    sortable: false,
    width: COLUMN_WIDTHS['S/N'],
    pinned: 'left',
    valueGetter: (params) => params.node.rowIndex + 1
  });

  // Name (pinned) — clicking the cell navigates to the visualization tab
  colDefs.push({
    headerName: 'Name',
    field: 'Name',
    sortable: true,
    width: COLUMN_WIDTHS['Name'],
    pinned: 'left',
    cellStyle: () => ({ cursor: 'pointer' }),
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
    valueGetter: (params) => {
      const { DD, MM, YYYY } = params.data;
      return DD && MM && YYYY ? `${DD}/${MM}/${YYYY}` : '';
    }
  });

  // Phone Number
  colDefs.push({
    headerName: 'Contact Number',
    field: 'Phone Number',
    sortable: true,
    width: COLUMN_WIDTHS['Phone Number'],
    pinned: 'left'
  });

  // Gender
  colDefs.push({
    headerName: 'Gender',
    field: 'Gender',
    sortable: true,
    width: COLUMN_WIDTHS['Gender'],
    pinned: 'left',
    valueGetter: (params) => {
      const g = (params.data.Gender || '').trim().toUpperCase();
      if (g === 'M') return 'Male';
      if (g === 'F') return 'Female';
      return params.data.Gender || '';
    }
  });

  // Per station: Year1 | Year2 | Y1→Y2 | Year3 | Y2→Y3 | …
  STATION_COLUMNS.forEach(col => {
    const lowerBetter = LOWER_IS_BETTER.has(col);
    const children = [];

    years.forEach((year, idx) => {
      // Year result column
      children.push({
        headerName: String(year),
        sortable: true,
        width: COLUMN_WIDTHS['Year'],
        valueGetter: (params) => {
          const yd = params.data._yearData[year];
          if (!yd) return '';
          const val = getField(yd, col);
          if (val === '' || val === null || val === undefined) return '';
          const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
          return isNaN(num) ? '' : val;
        }
      });

      // Comparison column after each year (except the first)
      if (idx > 0) {
        const prevYear = years[idx - 1];
        children.push({
          headerName: `${prevYear} - ${year}`,
          sortable: true,
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
          valueGetter: (params) => {
            const prev = params.data._yearData[prevYear];
            const curr = params.data._yearData[year];
            return calcComparison(
              prev ? getField(prev, col) : undefined,
              curr ? getField(curr, col) : undefined
            ) || '-';
          },
          cellStyle: (params) => {
            const val = parseFloat(String(params.value).replace(/[▲▼\s+]/g, ''));
            if (!params.value || params.value === '' || params.value === '-' || isNaN(val) || val === 0) return {};
            const improved = lowerBetter ? val < 0 : val > 0;
            return {
              color: improved ? '#2e7d32' : '#c62828',
              fontWeight: 'bold',
              backgroundColor: improved ? '#e8f5e9' : '#ffebee'
            };
          }
        });
      }
    });

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
    this.state = { quickFilterText: '' };
    this.gridRef = React.createRef();
  }

  handleOnFilterTextChange = (e) => {
    this.setState({ quickFilterText: e.target.value });
  }

  handleOnRowClicked = (event) => {
    const { onRowClick } = this.props;
    if (onRowClick) onRowClick(event.data);
  }

  render() {
    const { data, yearFrom, yearTo } = this.props;
    console.log('EntriesTable render', { data: data, yearFrom, yearTo });
    const { quickFilterText } = this.state;

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

    return (
      <div className={`fft-entries-table-wrapper${isMultiYear ? ' fft-multi-year-table' : ''}`}>
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

        <div className="grid-container" style={{ width: '100%', marginLeft: '0' }}>
          <AgGridReact
            ref={this.gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            domLayout="normal"
            pagination={true}
            paginationPageSize={Math.max(rowData.length, 1)}
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
