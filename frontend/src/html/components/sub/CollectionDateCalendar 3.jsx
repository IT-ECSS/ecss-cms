import React, { Component } from 'react';
import 'react-datepicker/dist/react-datepicker.css';

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
    // Format date in Singapore timezone to avoid timezone conversion issues
    const sgDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    const dateString = `${sgDate.getFullYear()}-${(sgDate.getMonth() + 1).toString().padStart(2, '0')}-${sgDate.getDate().toString().padStart(2, '0')}`;
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
    const { isOpen, onClose } = this.props;
    const { currentMonth, currentYear } = this.state;
    
    if (!isOpen) return null;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const daysInMonth = this.getDaysInMonth(currentMonth, currentYear);
    const firstDayOfMonth = this.getFirstDayOfMonth(currentMonth, currentYear);
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div 
          key={`empty-${i}`} 
          className="calendar-day2 empty"
          style={{
            padding: '10px',
            textAlign: 'center'
          }}
        ></div>
      );
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
          style={{
            padding: '10px',
            textAlign: 'center',
            cursor: isAvailable ? 'pointer' : 'default',
            backgroundColor: isAvailable ? '#e3f2fd' : '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        >
          {day}
        </div>
      );
    }

    return (
      <div 
        className="calendar-modal-overlay1" 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
      >
        <div 
          className="calendar-modal" 
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxWidth: '400px',
            width: '90%'
          }}
        >
          <div className="calendar-header">
            <div 
              className="calendar-year-display"
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: '10px'
              }}
            >
              {currentYear}
            </div>
            <div 
              className="calendar-month-navigation"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '15px'
              }}
            >
              <button 
                className="calendar-nav-btn" 
                onClick={() => this.navigateMonth(-1)}
                style={{
                  background: 'none',
                  padding: '5px 10px',
                  cursor: 'pointer'
                }}
              >
                ‹
              </button>
              <h3 
                className="calendar-month-year"
                style={{
                  margin: 0,
                  fontSize: '18px'
                }}
              >
                {monthNames[currentMonth]}
              </h3>
              <button 
                className="calendar-nav-btn" 
                onClick={() => this.navigateMonth(1)}
                style={{
                  background: 'none',
                  padding: '5px 10px',
                  cursor: 'pointer'
                }}
              >
                ›
              </button>
            </div>
          </div>
          
          <div 
            className="calendar-weekdays"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '5px',
              marginBottom: '10px'
            }}
          >
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div 
                key={day} 
                className="calendar-weekday"
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  padding: '5px'
                }}
              >
                {day}
              </div>
            ))}
          </div>
          
          <div 
            className="calendar-days-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '5px'
            }}
          >
            {days}
          </div>
        </div>
      </div>
    );
  }
}

class CollectionDateCalendar extends Component {
  static collectionSchedule = {
    'CT Hub': [
      // Week 2: Nov 20 & 27 (from table)
      { date: '2025-11-24', timeSlots: ['10:00-16:00'] }, // Monday
      
      // Week 3: Dec 1 & 4 (from table)  
      { date: '2025-12-01', timeSlots: ['10:00-16:00'] }, // Monday
      { date: '2025-12-04', timeSlots: ['10:00-16:00'] }, // Thursday
      
      // Week 4: Dec 8 & 11 (from table)
      { date: '2025-12-08', timeSlots: ['10:00-16:00'] }, // Monday
      { date: '2025-12-11', timeSlots: ['10:00-16:00'] }, // Thursday
      
      // Week 5: Dec 15 & 18 (from table)
      { date: '2025-12-15', timeSlots: ['10:00-16:00'] }, // Monday 
      { date: '2025-12-18', timeSlots: ['10:00-16:00'] }, // Thursday
    ],
    'Pasir Ris West Wellness Centre': [
      { date: '2025-12-02', timeSlots: ['10:00-16:00'] }, // Week 2: Dec 2
      { date: '2025-12-09', timeSlots: ['10:00-16:00'] }, // Week 3: Dec 9
      { date: '2025-12-16', timeSlots: ['10:00-16:00'] }  // Week 4: Dec 16
    ],
    'Tampines North Community Club': [
      { date: '2025-12-03', timeSlots: ['10:00-16:00'] }, // Week 3: Dec 3
      { date: '2025-12-10', timeSlots: ['10:00-16:00'] }, // Week 4: Dec 10
      { date: '2025-12-17', timeSlots: ['10:00-16:00'] }  // Week 5: Dec 17
    ]
  };

  render() {
    const {
      showCalendarModal,
      selectedOrderForCalendar,
      collectionSchedule,
      onDateSelect,
      onClose
    } = this.props;

    if (!showCalendarModal || !selectedOrderForCalendar) {
      console.log('CollectionDateCalendar returning null');
      return null;
    }


    // Get the current collection location from the order
    const currentLocation = selectedOrderForCalendar.collectionDeliveryLocation || 'CT Hub';
    const scheduleToUse = collectionSchedule || CollectionDateCalendar.collectionSchedule;
    const availableDates = scheduleToUse[currentLocation] || scheduleToUse['CT Hub'];
    
    // Convert schedule data to simple date strings
    const availableDateStrings = availableDates.map(dateInfo => dateInfo.date);

    // Handle date selection
    const handleDateSelect = (date) => {
      if (!date) return;
      
      // Format date in Singapore timezone to avoid timezone conversion issues
      const sgDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
      const year = sgDate.getFullYear();
      const month = String(sgDate.getMonth() + 1).padStart(2, '0');
      const day = String(sgDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      onDateSelect(selectedOrderForCalendar.id, dateString);
    };

    return (
      <CalendarModal
        isOpen={showCalendarModal}
        onClose={onClose}
        onDateSelect={handleDateSelect}
        availableDates={availableDateStrings}
      />
    );
  }
}

export default CollectionDateCalendar;