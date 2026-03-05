import React, { Component } from "react";
import '../../../css/sub/filterControls.css';

class FilterControls extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedCentre: this.props.centre || '',
      yearFrom: this.props.yearFrom || '',
      yearTo: this.props.yearTo || ''
    };
  }

  handleCentreChange = (e) => {
    const selectedCentre = e.target.value;
    this.setState({ selectedCentre });
    this.props.onCentreChange && this.props.onCentreChange(selectedCentre);
  }

  handleYearFromChange = (e) => {
    const yearFrom = e.target.value;
    this.setState({ yearFrom });
    this.props.onYearFromChange && this.props.onYearFromChange(yearFrom);
  }

  handleYearToChange = (e) => {
    const yearTo = e.target.value;
    this.setState({ yearTo });
    this.props.onYearToChange && this.props.onYearToChange(yearTo);
  }

  render() {
    const { selectedCentre, yearFrom, yearTo } = this.state;
    const { centres = [], years = [] } = this.props;
    const isCentreSelected = selectedCentre !== '';

    return (
      <div className="filter-controls-container">
        <h3 className="filter-title">
          <i className="fas fa-filter"></i> Filter by Year & Centre
        </h3>
        
        <div className="filter-controls">
          {/* Centre Dropdown */}
          <div className="filter-group">
            <label htmlFor="centre-select" className="filter-label">
              <i className="fas fa-map-marker-alt"></i> Centre
            </label>
            <select 
              id="centre-select" 
              value={selectedCentre} 
              onChange={this.handleCentreChange}
              className="custom-dropdown"
            >
              <option value="">Select Centre</option>
              {centres.map((centre) => (
                <option key={centre} value={centre}>
                  {centre}
                </option>
              ))}
            </select>
          </div>

          {/* Year From Dropdown */}
          <div className="filter-group">
            <label htmlFor="year-from-select" className="filter-label">
              <i className="fas fa-calendar"></i> Year From
            </label>
            <select 
              id="year-from-select" 
              value={yearFrom} 
              onChange={this.handleYearFromChange}
              className="custom-dropdown"
              disabled={!isCentreSelected}
            >
              <option value="">
                {isCentreSelected ? 'Select Year' : 'Select Centre First'}
              </option>
              {years.map((year) => (
                <option key={`from-${year}`} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Year To Dropdown */}
          <div className="filter-group">
            <label htmlFor="year-to-select" className="filter-label">
              <i className="fas fa-calendar"></i> Year To
            </label>
            <select 
              id="year-to-select" 
              value={yearTo} 
              onChange={this.handleYearToChange}
              className="custom-dropdown"
              disabled={!isCentreSelected}
            >
              <option value="">
                {isCentreSelected ? 'Select Year' : 'Select Centre First'}
              </option>
              {years.map((year) => (
                <option key={`to-${year}`} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }
}

export default FilterControls;
