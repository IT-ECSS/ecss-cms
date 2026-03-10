import React, { Component } from "react";
import '../../../css/sub/fitnessFilterSection.css';

class FitnessFilterSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedLocations: props.selectedLocations || [],
      yearFrom: props.yearFrom || '',
      yearTo: props.yearTo || '',
      selectedYear: props.selectedYear || '',
      openDropdown: null // 'location', 'yearFrom', 'yearTo', or null
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  }

  handleClickOutside = (e) => {
    if (!e.target.closest('.fft-custom-dropdown')) {
      this.setState({ openDropdown: null });
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.yearFrom !== this.props.yearFrom || 
        prevProps.yearTo !== this.props.yearTo ||
        JSON.stringify(prevProps.selectedLocations) !== JSON.stringify(this.props.selectedLocations) ||
        prevProps.selectedYear !== this.props.selectedYear) {
      this.setState({
        selectedLocations: this.props.selectedLocations || [],
        yearFrom: this.props.yearFrom || '',
        yearTo: this.props.yearTo || '',
        selectedYear: this.props.selectedYear || ''
      });
    }
  }

  handleLocationChange = (value) => {
    let updatedLocations;
    if (value === '') {
      // Clear all if 'Clear All' is clicked
      updatedLocations = [];
    } else if (this.state.selectedLocations.includes(value)) {
      // Remove if already selected
      updatedLocations = this.state.selectedLocations.filter(loc => loc !== value);
    } else {
      // Add if not selected
      updatedLocations = [...this.state.selectedLocations, value];
    }
    
    // Update state and call parent callback
    this.setState({ selectedLocations: updatedLocations }, () => {
      if (this.props.onLocationChange) {
        this.props.onLocationChange(updatedLocations);
      }
    });
  }

  handleSelectAllLocations = () => {
    const { availableLocations = [] } = this.props;
    
    // Update state with all available locations
    this.setState({ selectedLocations: availableLocations }, () => {
      if (this.props.onLocationChange) {
        this.props.onLocationChange(availableLocations);
      }
    });
  }

  handleYearFromChange = (value) => {
    this.setState({ yearFrom: value, openDropdown: null });
    if (this.props.onYearFromChange) {
      this.props.onYearFromChange(value);
    }
  }

  handleYearToChange = (value) => {
    this.setState({ yearTo: value, openDropdown: null });
    if (this.props.onYearToChange) {
      this.props.onYearToChange(value);
    }
  }

  toggleDropdown = (dropdownName) => {
    this.setState(prevState => ({
      openDropdown: prevState.openDropdown === dropdownName ? null : dropdownName
    }));
  }

  handleClearFilters = () => {
    this.setState({
      selectedLocations: [],
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
    
    const { selectedLocations, yearFrom, yearTo, selectedYear, openDropdown } = this.state;

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
                <div className="fft-custom-dropdown fft-multiselect-dropdown">
                  <button 
                    className="fft-dropdown-button"
                    onClick={() => this.toggleDropdown('location')}
                  >
                    <span className="fft-dropdown-value">
                      {selectedLocations.length === 0 ? (
                        'Select Centre'
                      ) : (
                        <span className="fft-selected-badges">
                          {selectedLocations.map(location => (
                            <span key={location} className="fft-badge">
                              {location}
                              <i 
                                className="fas fa-times" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  this.handleLocationChange(location);
                                }}
                              ></i>
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                    <i className={`fas fa-chevron-down ${openDropdown === 'location' ? 'open' : ''}`}></i>
                  </button>
                  {openDropdown === 'location' && (
                    <div className="fft-dropdown-menu">
                      <div 
                        className="fft-dropdown-item"
                        onClick={() => this.handleLocationChange('')}
                      >
                        <i className="fas fa-times"></i>
                        Clear All
                      </div>
                      <div 
                        className="fft-dropdown-item"
                        onClick={() => this.handleSelectAllLocations()}
                      >
                        <i className="fas fa-check-double"></i>
                        Select All
                      </div>
                      <div className="fft-dropdown-divider"></div>
                      {availableLocations.map(location => (
                        <div
                          key={location}
                          className={`fft-dropdown-item ${selectedLocations.includes(location) ? 'active' : ''}`}
                          onClick={() => this.handleLocationChange(location)}
                        >
                          <i className={`fas ${selectedLocations.includes(location) ? 'fa-check' : 'fa-plus'}`}></i>
                          {location}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {showYearRange && (
              <>
                <div className="fft-filter-section-group">
                  <label className="fft-filter-section-label">
                    <i className="fas fa-calendar-alt"></i>
                    Year From
                  </label>
                  <div className="fft-custom-dropdown">
                    <button 
                      className="fft-dropdown-button"
                      onClick={() => selectedLocations.length > 0 && this.toggleDropdown('yearFrom')}
                      disabled={selectedLocations.length === 0}
                    >
                      <span>{yearFrom || (selectedLocations.length > 0 ? 'Select Year' : 'Select Centre First')}</span>
                      <i className={`fas fa-chevron-down ${openDropdown === 'yearFrom' ? 'open' : ''}`}></i>
                    </button>
                    {openDropdown === 'yearFrom' && selectedLocations.length > 0 && (
                      <div className="fft-dropdown-menu">
                        <div 
                          className="fft-dropdown-item"
                          onClick={() => this.handleYearFromChange('')}
                        >
                          Select Year
                        </div>
                        {availableYears.map(year => (
                          <div
                            key={`from-${year}`}
                            className={`fft-dropdown-item ${yearFrom === year ? 'active' : ''}`}
                            onClick={() => this.handleYearFromChange(year)}
                          >
                            {year}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="fft-filter-section-group">
                  <label className="fft-filter-section-label">
                    <i className="fas fa-calendar-check"></i>
                    Year To
                  </label>
                  <div className="fft-custom-dropdown">
                    <button 
                      className="fft-dropdown-button"
                      onClick={() => selectedLocations.length > 0 && this.toggleDropdown('yearTo')}
                      disabled={selectedLocations.length === 0}
                    >
                      <span>{yearTo || (selectedLocations.length > 0 ? 'Select Year' : 'Select Centre First')}</span>
                      <i className={`fas fa-chevron-down ${openDropdown === 'yearTo' ? 'open' : ''}`}></i>
                    </button>
                    {openDropdown === 'yearTo' && selectedLocations.length > 0 && (
                      <div className="fft-dropdown-menu">
                        <div 
                          className="fft-dropdown-item"
                          onClick={() => this.handleYearToChange('')}
                        >
                          Select Year
                        </div>
                        {availableYears.map(year => (
                          <div
                            key={`to-${year}`}
                            className={`fft-dropdown-item ${yearTo === year ? 'active' : ''}`}
                            onClick={() => this.handleYearToChange(year)}
                          >
                            {year}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
            {selectedLocations.map(location => (
              <span key={location} className="fft-filter-section-tag">
                <i className="fas fa-map-marker-alt"></i>
                {location}
              </span>
            ))}
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
