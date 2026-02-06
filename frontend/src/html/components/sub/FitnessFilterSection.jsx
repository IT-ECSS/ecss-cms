import React, { Component } from "react";
import '../../../css/sub/fitnessFilterSection.css';

class FitnessFilterSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedLocation: props.selectedLocation || '',
      yearFrom: props.yearFrom || '',
      yearTo: props.yearTo || '',
      selectedYear: props.selectedYear || ''
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.yearFrom !== this.props.yearFrom || 
        prevProps.yearTo !== this.props.yearTo ||
        prevProps.selectedLocation !== this.props.selectedLocation ||
        prevProps.selectedYear !== this.props.selectedYear) {
      this.setState({
        selectedLocation: this.props.selectedLocation || '',
        yearFrom: this.props.yearFrom || '',
        yearTo: this.props.yearTo || '',
        selectedYear: this.props.selectedYear || ''
      });
    }
  }

  handleLocationChange = (e) => {
    const value = e.target.value;
    this.setState({ selectedLocation: value });
    if (this.props.onLocationChange) {
      this.props.onLocationChange(value);
    }
  }

  handleYearFromChange = (e) => {
    const value = e.target.value;
    this.setState({ yearFrom: value });
    if (this.props.onYearFromChange) {
      this.props.onYearFromChange(value);
    }
  }

  handleYearToChange = (e) => {
    const value = e.target.value;
    this.setState({ yearTo: value });
    if (this.props.onYearToChange) {
      this.props.onYearToChange(value);
    }
  }

  handleSingleYearChange = (e) => {
    const value = e.target.value;
    this.setState({ selectedYear: value });
    if (this.props.onSingleYearChange) {
      this.props.onSingleYearChange(value);
    }
  }

  handleClearFilters = () => {
    this.setState({
      selectedLocation: '',
      yearFrom: '',
      yearTo: '',
      selectedYear: ''
    });
    
    if (this.props.onClearFilters) {
      this.props.onClearFilters();
    }
  }

  render() {
    const { 
      availableLocations = [], 
      availableYears = [], 
      showYearRange = true,
      showSingleYear = false,
      showLocation = true,
      title = 'Filter Options'
    } = this.props;
    
    const { selectedLocation, yearFrom, yearTo, selectedYear } = this.state;

    return (
      <div className="fft-filter-section-wrapper">
        <div className="fft-filter-section-container">
          <div className="fft-filter-section-header">
            <h3 className="fft-filter-section-title">{title}</h3>
          </div>
          
          <div className="fft-filter-section-grid">
            {showLocation && (
              <div className="fft-filter-section-group">
                <label className="fft-filter-section-label">
                  <i className="fas fa-building"></i>
                  Centre
                </label>
                <select 
                  className="fft-filter-section-select"
                  value={selectedLocation} 
                  onChange={this.handleLocationChange}
                >
                  <option value="">Select Centre</option>
                  <option value="CT Hub">CT Hub</option>
                  <option value="Pasir Ris">Pasir Ris</option>
                  <option value="Tampines">Tampines</option>
                </select>
              </div>
            )}
            
            {showYearRange && (
              <>
                <div className="fft-filter-section-group">
                  <label className="fft-filter-section-label">
                    <i className="fas fa-calendar-alt"></i>
                    Year From
                  </label>
                  <select 
                    className="fft-filter-section-select"
                    value={yearFrom} 
                    onChange={this.handleYearFromChange}
                    disabled={!selectedLocation}
                  >
                    <option value="">{selectedLocation ? 'Select Year' : 'Select Centre First'}</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                <div className="fft-filter-section-group">
                  <label className="fft-filter-section-label">
                    <i className="fas fa-calendar-check"></i>
                    Year To
                  </label>
                  <select 
                    className="fft-filter-section-select"
                    value={yearTo} 
                    onChange={this.handleYearToChange}
                    disabled={!selectedLocation}
                  >
                    <option value="">{selectedLocation ? 'Select Year' : 'Select Centre First'}</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {showSingleYear && (
              <div className="fft-filter-section-group">
                <label className="fft-filter-section-label">
                  <i className="fas fa-calendar"></i>
                  Select Year
                </label>
                <select 
                  className="fft-filter-section-select"
                  value={selectedYear} 
                  onChange={this.handleSingleYearChange}
                >
                  <option value="">All Years</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          <div className="fft-filter-section-active">
            {selectedLocation && (
              <span className="fft-filter-section-tag">
                <i className="fas fa-map-marker-alt"></i>
                {selectedLocation}
              </span>
            )}
            {showYearRange && yearFrom && yearTo && yearFrom !== yearTo && (
              <span className="fft-filter-section-tag fft-filter-section-tag-year">
                <i className="fas fa-calendar-alt"></i>
                {yearFrom} - {yearTo}
              </span>
            )}
            {showYearRange && yearFrom && yearTo && yearFrom === yearTo && (
              <span className="fft-filter-section-tag fft-filter-section-tag-year">
                <i className="fas fa-calendar"></i>
                {yearFrom}
              </span>
            )}
            {showYearRange && yearFrom && !yearTo && (
              <span className="fft-filter-section-tag fft-filter-section-tag-year">
                <i className="fas fa-calendar"></i>
                {yearFrom}
              </span>
            )}
            {showYearRange && !yearFrom && yearTo && (
              <span className="fft-filter-section-tag fft-filter-section-tag-year">
                <i className="fas fa-calendar"></i>
                {yearTo}
              </span>
            )}
            {showSingleYear && selectedYear && (
              <span className="fft-filter-section-tag fft-filter-section-tag-year">
                <i className="fas fa-calendar"></i>
                {selectedYear}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default FitnessFilterSection;
