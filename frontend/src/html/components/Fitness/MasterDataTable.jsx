import React, { Component } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import '../../../css/ag-grid-custom-theme.css';
import '../../../css/fftStaff.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class MasterDataTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      rowData: [],
      columnDefs: [],
      loading: false,
      error: null,
    };
    this.gridRef = React.createRef();
  }

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.event?.id !== this.props.event?.id) {
      this.fetchData();
    }
  }

  fetchData = async () => {
    const { event } = this.props;
    const fileId = event?.id || '';
    if (!fileId) return;

    this.setState({ loading: true, error: null, rowData: [], columnDefs: [] });
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/getParticipants`, { fileId });
      const raw = Array.isArray(res.data) ? res.data : [];
      if (raw.length === 0) {
        this.setState({ loading: false, rowData: [], columnDefs: [] });
        return;
      }
      const columnDefs = Object.keys(raw[0]).map(key => ({
        field: key,
        headerName: key,
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 100,
      }));
      this.setState({ loading: false, rowData: raw, columnDefs });
    } catch (err) {
      this.setState({ loading: false, error: 'Failed to load data. Please try again.' });
    }
  };

  render() {
    const { event } = this.props;
    const { rowData, columnDefs, loading, error } = this.state;

    return (
      <div className="fft-participants-section">
        <div className="fft-participants-section-header">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#212121', margin: 0, whiteSpace: 'nowrap' }}>Access Master Data (View Only)</h3>
          <hr style={{ margin: '12px 0' }} />
          <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
            Viewing read-only participant data for this event.
          </div>
        </div>

        {loading && <p style={{ color: '#555', padding: '16px 0' }}>Loading data…</p>}
        {error   && <p style={{ color: '#d32f2f', padding: '16px 0' }}>{error}</p>}

        {!loading && !error && rowData.length === 0 && (
          <p style={{ color: '#888', padding: '16px 0' }}>No data found for this event.</p>
        )}

        {!loading && rowData.length > 0 && (
          <div
            className="grid-container fft-upload-grid"
            style={{ width: '100%', maxWidth: '100%', height: '500px', marginLeft: 0 }}
          >
            <AgGridReact
              ref={this.gridRef}
              columnDefs={columnDefs}
              rowData={rowData}
              domLayout="normal"
              pagination={true}
              paginationPageSize={20}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              suppressCellFocus={true}
            />
          </div>
        )}
      </div>
    );
  }
}

export default MasterDataTable;
