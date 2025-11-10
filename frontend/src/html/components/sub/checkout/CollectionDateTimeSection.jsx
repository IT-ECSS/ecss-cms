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
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    // Get day name using our translation system
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = date.getDay();
    const dayName = this.getTranslation(dayNames[dayOfWeek]);
    
    // Return formatted string: "Sunday, 17/11/2025"
    return `${dayName}, ${day}/${month}/${year}`;
  }

  // Format date for display (dd/mm/yyyy format)
  formatDateForDisplay = (dateString) => {
    if (!dateString) {
      return this.getTranslation('Select a date');
    }
    
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
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
    const locationDates = this.getCollectionLocationDates(personalInfoLocation);
    return locationDates[collectionLocation] || [];
  }

  // Collection location date mapping
  getCollectionLocationDates = (personalInfoLocation) => {
    // Base dates for all locations
    const baseDates = {
      'CT Hub': [
        '2025-11-16', '2025-11-17', 
        '2025-11-20', '2025-11-23', '2025-11-24', '2025-11-27',
        '2025-11-30', '2025-12-01', '2025-12-04', '2025-12-07',
        '2025-12-08', '2025-12-11', '2025-12-14', '2025-12-15', 
        '2025-12-18', '2025-12-22', '2025-12-29'
      ],
      'Pasir Ris West Wellness Centre': [
        '2025-12-02',
        '2025-12-09',
        '2025-12-16'
      ],
      'Tampines North Community Club': [
        '2025-11-26',
        '2025-12-03',
        '2025-12-10',
        '2025-12-17'
      ]
    };

    // If personal info location is En Community Church, ONLY allow Sundays
    if (personalInfoLocation === 'En Community Church') {
      const result = { ...baseDates };
      
      if (result['CT Hub']) {
        result['CT Hub'] = result['CT Hub'].filter(dateString => {
          const date = new Date(dateString);
          const dayOfWeek = date.getDay();
          return dayOfWeek === 0; // Keep only Sunday dates
        });
      }
      
      return result;
    } else {
      // Other locations at CT Hub: Exclude Sundays
      const result = { ...baseDates };
      
      if (result['CT Hub']) {
        result['CT Hub'] = result['CT Hub'].filter(dateString => {
          const date = new Date(dateString);
          const dayOfWeek = date.getDay();
          return dayOfWeek !== 0; // Keep non-Sunday dates
        });
      }
      
      return result;
    }
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
    
    // Convert date to YYYY-MM-DD format for comparison, using local timezone
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Enable date only if it's in the available dates for this location
    return !availableDates.includes(dateString);
  }

  // Get the selected date from props
  getSelectedDate = () => {
    const { collectionDate } = this.props;
    if (collectionDate) {
      return new Date(collectionDate);
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