import React, { Component } from 'react';

class ColumnTogglePanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isExpanded: false,
      allColumns: []
    };
  }

  componentDidMount() {
    const { columns } = this.props;
    if (columns) {
      this.setState({ allColumns: columns });
    }
  }

  componentDidUpdate(prevProps) {
    const { columns } = this.props;
    if (columns && prevProps.columns !== columns) {
      this.setState({ allColumns: columns });
    }
  }

  toggleExpandCollapse = () => {
    this.setState((prevState) => ({
      isExpanded: !prevState.isExpanded
    }));
  }

  handleColumnToggle = (columnName) => {
    const { onColumnToggle } = this.props;
    if (onColumnToggle) {
      onColumnToggle(columnName);
    }
  }

  handleSelectAll = () => {
    const { onSelectAll } = this.props;
    if (onSelectAll) {
      onSelectAll();
    }
  }

  handleDeselectAll = () => {
    const { onDeselectAll } = this.props;
    if (onDeselectAll) {
      onDeselectAll();
    }
  }

  render() {
    const { isExpanded } = this.state;
    const { columns = [], visibleColumns = [] } = this.props;

    return (
      <div className="fft-column-toggle-wrapper">
        <div className="fft-column-toggle-panel">
          <div className="fft-column-toggle-header">
            <h3 className="fft-column-toggle-title">
              <i className="fas fa-columns"></i>
              Show / Hide Columns
            </h3>
            <div className="fft-column-toggle-buttons">
              <button
                className={`fft-toggle-btn ${visibleColumns.length === columns.length ? 'active' : ''}`}
                onClick={this.handleSelectAll}
                title="Show all columns"
              >
                <i className="fas fa-check"></i> Show All
              </button>
              <button
                className={`fft-toggle-btn ${visibleColumns.length === 0 ? 'active' : ''}`}
                onClick={this.handleDeselectAll}
                title="Hide all columns"
              >
                <i className="fas fa-times"></i> Hide All
              </button>
            </div>
          </div>

          <div className={`fft-column-toggle-content ${isExpanded ? 'collapsed' : ''}`}>
            {columns.map((column, idx) => (
              <div 
                key={idx} 
                className="fft-column-toggle-item"
                onClick={() => this.handleColumnToggle(column)}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  id={`col-toggle-${column}`}
                  checked={visibleColumns.includes(column)}
                  onChange={(e) => {
                    e.stopPropagation();
                    this.handleColumnToggle(column);
                  }}
                />
                <label 
                  htmlFor={`col-toggle-${column}`} 
                  className="fft-column-toggle-label"
                >
                  {column}
                </label>
              </div>
            ))}
          </div>

          <button
            className={`fft-column-toggle-expand ${isExpanded ? 'collapsed' : ''}`}
            onClick={this.toggleExpandCollapse}
          >
            <span>{isExpanded ? 'Expand' : 'Collapse'}</span>
            <i className="fas fa-chevron-down"></i>
          </button>
        </div>
      </div>
    );
  }
}

export default ColumnTogglePanel;
