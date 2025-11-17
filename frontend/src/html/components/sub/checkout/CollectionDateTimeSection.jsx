import React, { Component } from 'react';

class CollectionDateTimeSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedDate: null
    };
  }

  componentDidMount() {
    // Set default collection time if none is selected
    this.setDefaultTimeIfNeeded();
  }

  componentDidUpdate(prevProps) {
    // Set default time when collection location is selected for the first time
    const { collectionLocation } = this.props;
    if (collectionLocation && !prevProps.collectionLocation) {
      this.setDefaultTimeIfNeeded();
    }
  }

  setDefaultTimeIfNeeded = () => {
    const { collectionTime, onCollectionTimeChange, collectionLocation } = this.props;
    if (collectionLocation && !collectionTime) {
      const defaultTime = '10:00-16:00'; // Default to the main time slot
      onCollectionTimeChange(defaultTime);
    }
  }
  getTranslation(key) {
    const { selectedLanguage } = this.props;
    
    const translations = {
      'Collection Date & Time': {
        'english': 'Collection Date & Time',
        'chinese': '取货日期与时间',
        'malay': 'Tarikh & Masa Pengumpulan'
      },
      'Select Collection Date': {
        'english': 'Select Collection Date',
        'chinese': '选择取货日期',
        'malay': 'Pilih Tarikh Pengumpulan'
      },
      'Select Collection Time': {
        'english': 'Select Collection Time',
        'chinese': '选择取货时间',
        'malay': 'Pilih Masa Pengumpulan'
      },
      'Collection Date': {
        'english': 'Collection Date',
        'chinese': '取货日期',
        'malay': 'Tarikh Pengumpulan'
      },
      'Collection Time': {
        'english': 'Collection Time',
        'chinese': '取货时间',
        'malay': 'Masa Pengumpulan'
      },
      'Select a date': {
        'english': 'Select a date',
        'chinese': '选择日期',
        'malay': 'Pilih tarikh'
      },
      'Please select a collection location first': {
        'english': 'Please select a collection location first',
        'chinese': '请先选择取货地点',
        'malay': 'Sila pilih lokasi pengambilan dahulu'
      },
      'Close': {
        'english': 'Close',
        'chinese': '关闭',
        'malay': 'Tutup'
      },
      // Time slot translations
      '10:00 AM - 4:00 PM': {
        'english': '10:00 AM - 4:00 PM',
        'chinese': '上午10:00 - 下午4:00',
        'malay': '10:00 PAGI - 4:00 PETANG'
      },
      // Day names
      'Sunday': {
        'english': 'Sunday',
        'chinese': '星期日',
        'malay': 'Ahad'
      },
      'Monday': {
        'english': 'Monday',
        'chinese': '星期一',
        'malay': 'Isnin'
      },
      'Tuesday': {
        'english': 'Tuesday',
        'chinese': '星期二',
        'malay': 'Selasa'
      },
      'Wednesday': {
        'english': 'Wednesday',
        'chinese': '星期三',
        'malay': 'Rabu'
      },
      'Thursday': {
        'english': 'Thursday',
        'chinese': '星期四',
        'malay': 'Khamis'
      },
      'Friday': {
        'english': 'Friday',
        'chinese': '星期五',
        'malay': 'Jumaat'
      },
      'Saturday': {
        'english': 'Saturday',
        'chinese': '星期六',
        'malay': 'Sabtu'
      },
      // Month names
      'January': {
        'english': 'January',
        'chinese': '一月',
        'malay': 'Januari'
      },
      'February': {
        'english': 'February',
        'chinese': '二月',
        'malay': 'Februari'
      },
      'March': {
        'english': 'March',
        'chinese': '三月',
        'malay': 'Mac'
      },
      'April': {
        'english': 'April',
        'chinese': '四月',
        'malay': 'April'
      },
      'May': {
        'english': 'May',
        'chinese': '五月',
        'malay': 'Mei'
      },
      'June': {
        'english': 'June',
        'chinese': '六月',
        'malay': 'Jun'
      },
      'July': {
        'english': 'July',
        'chinese': '七月',
        'malay': 'Julai'
      },
      'August': {
        'english': 'August',
        'chinese': '八月',
        'malay': 'Ogos'
      },
      'September': {
        'english': 'September',
        'chinese': '九月',
        'malay': 'September'
      },
      'October': {
        'english': 'October',
        'chinese': '十月',
        'malay': 'Oktober'
      },
      'November': {
        'english': 'November',
        'chinese': '十一月',
        'malay': 'November'
      },
      'December': {
        'english': 'December',
        'chinese': '十二月',
        'malay': 'Disember'
      }
    };

    return translations[key] ? translations[key][selectedLanguage] || translations[key]['english'] : key;
  }

  // Format date for button display
  formatDateForButton = (dateString) => {
    // Parse the date string directly as Singapore time (UTC+8)
    const [year, month, day] = dateString.split('-');
    const date = new Date(`${year}-${month}-${day}T12:00:00+08:00`);
    
    // Get day of week in Singapore timezone
    const formatter = new Intl.DateTimeFormat('en-US', { 
      weekday: 'long',
      timeZone: 'Asia/Singapore' 
    });
    const dayName = this.getTranslation(formatter.format(date));
    
    // Format: "Sunday, 24/11/2025"
    return `${dayName}, ${day}/${month}/${year}`;
  }

  // Format date for display (dd/mm/yyyy format)
  formatDateForDisplay = (dateString) => {
    if (!dateString) {
      return this.getTranslation('Select a date');
    }
    
    // Create date with Singapore timezone context
    const date = new Date(dateString + 'T12:00:00+08:00');
    const sgDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    
    const day = sgDate.getDate().toString().padStart(2, '0');
    const month = (sgDate.getMonth() + 1).toString().padStart(2, '0');
    const year = sgDate.getFullYear();
    
    // Always use dd/mm/yyyy format regardless of language
    return `${day}/${month}/${year}`;
  }

  // Get translated time label but keep English value for backend
  getTranslatedTimeSlots = () => {
    return [
      { 
        value: '10:00-16:00', // English value for backend
        label: this.getTranslation('10:00 AM - 4:00 PM') // Translated label for display
      }
    ];
  }

  // Custom date input component for translated display
  // Get available dates for selected location
  getAvailableDatesForLocation = () => {
    const { collectionLocation, personalInfoLocation } = this.props;
    const baseDates = {
      'CT Hub': [
        '2025-11-24', // Monday
        '2025-12-01', // Monday
        '2025-12-04', // Thursday
        '2025-12-08', // Monday
        '2025-12-11', // Thursday
        '2025-12-15', // Monday 
        '2025-12-18', // Thursday
        '2025-11-30', // Sunday
        '2025-12-07', // Sunday
        '2025-12-14' // Sunday
      ],
      'Pasir Ris West Wellness Centre': [
        '2025-12-02', // Week 2: Dec 2
        '2025-12-09', // Week 3: Dec 9
        '2025-12-16'  // Week 4: Dec 16
      ],
      'Tampines North Community Club': [
        '2025-12-03', // Week 3: Dec 3
        '2025-12-10', // Week 4: Dec 10
        '2025-12-17'  // Week 5: Dec 17
      ]
    };
    
    const dates = baseDates[collectionLocation] || [];
    return dates.sort((dateA, dateB) => {
      const dA = new Date(dateA + "T12:00:00+08:00");
      const dB = new Date(dateB + "T12:00:00+08:00");
      return dA - dB;
    });
  }

  sortBaseDates(baseDates) {
      // Sort the date arrays within each location, not the location keys
      const sortedDates = {};
      Object.entries(baseDates).forEach(([location, dates]) => {
        sortedDates[location] = dates.sort((dateA, dateB) => {
          // Parse dates with UTC+8 to avoid timezone drift
          const dA = new Date(dateA + "T12:00:00+08:00");
          const dB = new Date(dateB + "T12:00:00+08:00");
          return dA - dB;
        });
      });
      return sortedDates;
  }

  // Collection location date mapping
  getCollectionLocationDates = (personalInfoLocation) => {
    // Base dates for all locations
    const baseDates = {
      'CT Hub': [
        // Week 2: Nov 20 & 27 (from table)
        '2025-11-24', // Monday
        
        // Week 3: Dec 1 & 4 (from table)  
        '2025-12-01', // Monday
        '2025-12-04', // Thursday
        
        // Week 4: Dec 8 & 11 (from table)
        '2025-12-08', // Monday
        '2025-12-11', // Thursday
        
        // Week 5: Dec 15 & 18 (from table)
        '2025-12-15', // Monday 
        '2025-12-18', // Thursday
        
        // Sundays for CT Hub (Singapore timezone)
        '2025-11-30', // Sunday
        '2025-12-07', // Sunday
        '2025-12-14' // Sunday
      ],
      'Pasir Ris West Wellness Centre': [
        '2025-12-02', // Week 2: Dec 2
        '2025-12-09', // Week 3: Dec 9
        '2025-12-16'  // Week 4: Dec 16
      ],
      'Tampines North Community Club': [
        '2025-12-03', // Week 3: Dec 3
        '2025-12-10', // Week 4: Dec 10
        '2025-12-17'  // Week 5: Dec 17
      ]
    };


    if(personalInfoLocation === "En Community Church")
    {
      personalInfoLocation = "CT Hub";
    }

    const sorted = this.sortBaseDates(baseDates);
    console.log("Sorted Date:", sorted[personalInfoLocation])
  
    return sorted[personalInfoLocation];
    // If personal info location is En Community Church, ONLY allow Sundays
   /* if (personalInfoLocation === 'En Community Church') {
      const result = { ...baseDates };
      
      if (result['CT Hub']) {
        result['CT Hub'] = result['CT Hub'].filter(dateString => {
          // Parse date with Singapore timezone context
          const date = new Date(dateString + 'T12:00:00+08:00');
          const sgDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
          const dayOfWeek = sgDate.getDay();
          return dayOfWeek === 0; // Keep only Sunday dates
        });
      }
      
      return result;
    } else {
      // Other locations at CT Hub: Exclude Sundays
      const result = { ...baseDates };
      
      if (result['CT Hub']) {
        result['CT Hub'] = result['CT Hub'].filter(dateString => {
          // Parse date with Singapore timezone context
          const date = new Date(dateString + 'T12:00:00+08:00');
          const sgDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
          const dayOfWeek = sgDate.getDay();
          return dayOfWeek !== 0; // Keep non-Sunday dates
        });
      }
      
      return result;
    }*/
  }

  // Check if date should be excluded based on collection location
  isDateDisabled = (date) => {
    const { collectionLocation, personalInfoLocation } = this.props;
    
    // If no collection location is selected, disable all dates
    if (!collectionLocation) {
      return true;
    }
    
    const locationDates = this.getCollectionLocationDates(personalInfoLocation);
    const availableDates = locationDates[collectionLocation];
    
    // If location not found, disable all dates
    if (!availableDates) {
      return true;
    }
    
    // Convert date to YYYY-MM-DD format for comparison using Singapore timezone
    const sgDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    const year = sgDate.getFullYear();
    const month = (sgDate.getMonth() + 1).toString().padStart(2, '0');
    const day = sgDate.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Enable date only if it's in the available dates for this location
    return !availableDates.includes(dateString);
  }

  // Get the selected date from props
  getSelectedDate = () => {
    const { collectionDate } = this.props;
    if (collectionDate) {
      // Parse date with Singapore timezone context
      const date = new Date(collectionDate + 'T12:00:00+08:00');
      return new Date(date.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    }
    return this.state.selectedDate;
  }

  // Generate available time slots
  generateAvailableTimeSlots = () => {
    return this.getTranslatedTimeSlots();
  }

  render() {
    const { 
      collectionDate,
      collectionTime,
      expandedSections, 
      fieldErrors = {}, 
      onCollectionDateChange,
      onCollectionTimeChange,
      onToggleSection,
      collectionMode,
      collectionLocation,
      personalInfoLocation,
      selectedLanguage
    } = this.props;

    // Only show this section if Self-Collection is selected and a location is chosen
    if (collectionMode !== 'Self-Collection' || !collectionLocation) {
      return null;
    }

    // Ensure default time is set immediately when location is available
    if (collectionLocation && !collectionTime) {
      setTimeout(() => {
        const defaultTime = '10:00-16:00';
        onCollectionTimeChange(defaultTime);
      }, 0);
    }

    const availableTimeSlots = this.generateAvailableTimeSlots();
    const selectedDate = this.getSelectedDate();
    const availableDates = this.getAvailableDatesForLocation();

    return (
      <div className="checkout-section">
        <div 
          className={`section-header ${expandedSections.collectionDateTime ? 'expanded' : 'collapsed'}`}
          onClick={() => onToggleSection('collectionDateTime')}
        >
          <h2 className="section-title">{this.getTranslation('Collection Date & Time')}</h2>
          <span className="section-toggle-icon">
            {expandedSections.collectionDateTime ? '▼' : '▶'}
          </span>
        </div>
        <div className={`section-content ${expandedSections.collectionDateTime ? 'expanded' : 'collapsed'}`}>
          <div className="collection-datetime-form">
            <div className="form-group">
              {/* Collection Date Selection with Date Buttons */}
              <div className="collection-date-options">
                <label>{this.getTranslation('Select Collection Date')}</label>
                
                {!collectionLocation && (
                  <div className="info-message">
                    {this.getTranslation('Please select a collection location first')}
                  </div>
                )}
                
                {collectionLocation && (
                  <div className="date-buttons">
                    {availableDates.map((dateString) => (
                      <button
                        key={dateString}
                        type="button"
                        className={`date-button ${collectionDate === dateString ? 'selected' : ''}`}
                        onClick={() => onCollectionDateChange(dateString)}
                      >
                        {this.formatDateForButton(dateString)}
                      </button>
                    ))}
                  </div>
                )}
                
                {fieldErrors.collectionDate && (
                  <div className="field-error-message">{fieldErrors.collectionDate}</div>
                )}
              </div>

              {/* Collection Time Selection - Always show when location is selected */}
              {collectionLocation && (
                <div className="collection-time-options">
                  <label>{this.getTranslation('Select Collection Time')}</label>
                  <div className="time-buttons">
                    {availableTimeSlots.map((timeSlot) => (
                      <button
                        key={timeSlot.value}
                        type="button"
                        className={`time-button ${collectionTime === timeSlot.value ? 'selected' : ''}`}
                        onClick={() => onCollectionTimeChange(timeSlot.value)}
                      >
                        {timeSlot.label}
                      </button>
                    ))}
                  </div>
                  {fieldErrors.collectionTime && (
                    <div className="field-error-message">{fieldErrors.collectionTime}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default CollectionDateTimeSection;