import React, { Component } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

// Custom Calendar Modal Component
class CalendarModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentMonth: new Date().getMonth(),
      currentYear: new Date().getFullYear()
    };
  }

  getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  }

  getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  }

  isDateAvailable = (date) => {
    const { availableDates } = this.props;
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return availableDates.includes(dateString);
  }

  handleDateClick = (day) => {
    const { onDateSelect, onClose } = this.props;
    const selectedDate = new Date(this.state.currentYear, this.state.currentMonth, day);
    
    if (this.isDateAvailable(selectedDate)) {
      onDateSelect(selectedDate);
      onClose();
    }
  }

  navigateMonth = (direction) => {
    this.setState(prevState => {
      let newMonth = prevState.currentMonth + direction;
      let newYear = prevState.currentYear;
      
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
      
      return { currentMonth: newMonth, currentYear: newYear };
    });
  }

  render() {
    const { isOpen, onClose, getTranslation } = this.props;
    const { currentMonth, currentYear } = this.state;
    
    if (!isOpen) return null;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const daysInMonth = this.getDaysInMonth(currentMonth, currentYear);
    const firstDayOfMonth = this.getFirstDayOfMonth(currentMonth, currentYear);
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day2 empty"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isAvailable = this.isDateAvailable(date);
      const isToday = new Date().toDateString() === date.toDateString();
      
      days.push(
        <div
          key={day}
          className={`calendar-day2 ${isAvailable ? 'available' : 'disabled'} ${isToday ? 'today' : ''}`}
          onClick={() => this.handleDateClick(day)}
        >
          {day}
        </div>
      );
    }

    return (
      <div className="calendar-modal-overlay" onClick={onClose}>
        <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
          <div className="calendar-header">
            <div className="calendar-year-display">
              {currentYear}
            </div>
            <div className="calendar-month-navigation">
              <button className="calendar-nav-btn" onClick={() => this.navigateMonth(-1)}>
                ‹
              </button>
              <h3 className="calendar-month-year">
                {getTranslation(monthNames[currentMonth])}
              </h3>
              <button className="calendar-nav-btn" onClick={() => this.navigateMonth(1)}>
                ›
              </button>
            </div>
          </div>
          
          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
          </div>
          
          <div className="calendar-days-grid">
            {days}
          </div>
        </div>
      </div>
    );
  }
}

class CollectionDateTimeSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedDate: null,
      isCalendarModalOpen: false
    };
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
  CustomDateInput = React.forwardRef(({ value, onClick, placeholder }, ref) => {
    const { collectionDate } = this.props;
    
    // Use translated format for display
    const displayValue = collectionDate ? 
      this.formatDateForDisplay(collectionDate) : 
      placeholder;
    
    return (
      <input
        ref={ref}
        value={displayValue}
        onClick={onClick}
        placeholder={placeholder}
        readOnly
        className="datepicker-input"
      />
    );
  });

  // Handle date change from Modal Calendar
  handleDateSelect = (date) => {
    const { onCollectionDateChange } = this.props;
    
    if (date) {
      // Convert to YYYY-MM-DD format using local timezone
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const dateValue = `${year}-${month}-${day}`;
      
      this.setState({ selectedDate: date });
      onCollectionDateChange(dateValue);
    }
  }

  // Open calendar modal
  openCalendarModal = () => {
    this.setState({ isCalendarModalOpen: true });
  }

  // Close calendar modal
  closeCalendarModal = () => {
    this.setState({ isCalendarModalOpen: false });
  }

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
        '2025-11-10', '2025-11-13', '2025-11-16', '2025-11-17', 
        '2025-11-20', '2025-11-23', '2025-11-24', '2025-11-27',
        '2025-11-30', '2025-12-01', '2025-12-04', '2025-12-07',
        '2025-12-08', '2025-12-11', '2025-12-14', '2025-12-15', 
        '2025-12-18', '2025-12-22'
      ],
      'Pasir Ris West Wellness Centre': [
        '2025-11-18',
        '2025-12-02',
        '2025-12-09',
        '2025-12-16'
      ],
      'Tampines North Community Club': [
        '2025-11-19',
        '2025-11-26',
        '2025-12-03',
        '2025-12-10',
        '2025-12-17'
      ]
    };

    // If personal info location is En Community Church, allow ALL days including Sundays
    if (personalInfoLocation === 'En Community Church') {
      return baseDates;
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

    const { isCalendarModalOpen } = this.state;

    // Only show this section if Self-Collection is selected and a location is chosen
    if (collectionMode !== 'Self-Collection' || !collectionLocation) {
      return null;
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
              {/* Collection Date Selection with Custom Modal Calendar */}
              <div className="collection-date-options">
                <label>{this.getTranslation('Select Collection Date')}</label>
                
                {!collectionLocation && (
                  <div className="info-message">
                    {this.getTranslation('Please select a collection location first')}
                  </div>
                )}
                
                <div className="datepicker-container">
                  <input
                    type="text"
                    value={collectionDate ? this.formatDateForDisplay(collectionDate) : ''}
                    placeholder={this.getTranslation('Select a date')}
                    onClick={this.openCalendarModal}
                    readOnly
                    className="datepicker-input"
                    style={{ cursor: 'pointer' }}
                  />
                </div>
                
                {fieldErrors.collectionDate && (
                  <div className="field-error-message">{fieldErrors.collectionDate}</div>
                )}
              </div>

              {/* Collection Time Selection - Only show if date is selected */}
              {collectionDate && (
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

        {/* Custom Calendar Modal */}
        <CalendarModal
          isOpen={isCalendarModalOpen}
          onClose={this.closeCalendarModal}
          onDateSelect={this.handleDateSelect}
          availableDates={availableDates}
          getTranslation={this.getTranslation.bind(this)}
        />
      </div>
    );
  }
}

export default CollectionDateTimeSection;