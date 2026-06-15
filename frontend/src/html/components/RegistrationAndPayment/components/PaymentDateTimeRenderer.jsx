import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './PaymentDateTimeRenderer.css';

/**
 * Custom renderer for Payment Date and Payment Time fields
 * Supports both date/time picker and manual text input
 * Formats: Date as DD/MM/YYYY, Time as HH:MM:SS
 */
export const PaymentDateTimeRenderer = (props) => {
  const { value, isDateField = true, onEditingStarted, onEditingStopped } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [textInput, setTextInput] = useState(value || '');
  const inputRef = useRef(null);
  const pickerRef = useRef(null);

  // Parse DD/MM/YYYY to Date object
  const parseDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return null;
    const parts = dateString.trim().split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    const date = new Date(`${yyyy}-${mm}-${dd}`);
    return isNaN(date.getTime()) ? null : date;
  };

  // Format Date object to DD/MM/YYYY
  const formatDate = (date) => {
    if (!date) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Format time as HH:MM:SS
  const formatTime = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return '';
    const trimmed = timeString.trim();
    // If already in HH:MM:SS format, return as-is
    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
    // If in HH:MM format, add :00
    if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
    return trimmed;
  };

  useEffect(() => {
    if (isDateField && value) {
      const parsed = parseDate(value);
      setSelectedDate(parsed);
    }
    setTextInput(value || '');
  }, [value, isDateField]);

  const handleDateChange = (date) => {
    if (!date) return;
    const formatted = formatDate(date);
    setSelectedDate(date);
    setTextInput(formatted);
    // Notify AG-Grid of the change
    if (props.api && props.node) {
      props.data[props.colDef.field] = formatted;
      props.api.refreshCells({ rowNodes: [props.node], columns: [props.colDef.field], force: true });
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setTextInput(newText);

    // Try to parse and validate the input
    if (isDateField) {
      const parsed = parseDate(newText);
      if (parsed) {
        setSelectedDate(parsed);
      }
    } else if (newText) {
      // For time, just ensure it's in valid format
      const formatted = formatTime(newText);
      setTextInput(formatted);
    }
  };

  const handleBlur = () => {
    // When editing stops, update the value in AG-Grid
    const finalValue = isDateField ? textInput : formatTime(textInput);
    if (props.api && props.node && props.colDef) {
      props.data[props.colDef.field] = finalValue;
      props.api.refreshCells({ rowNodes: [props.node], columns: [props.colDef.field], force: true });
    }
    setIsEditing(false);
    if (onEditingStopped) onEditingStopped();
  };

  const handleFocus = () => {
    setIsEditing(true);
    if (onEditingStarted) onEditingStarted();
  };

  return (
    <div className="payment-datetime-renderer">
      <div className="picker-input-container">
        {isDateField ? (
          <DatePicker
            ref={pickerRef}
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="dd/MM/yyyy"
            placeholderText="DD/MM/YYYY"
            className="datetime-picker-input"
            onFocus={handleFocus}
            onBlur={handleBlur}
            inline={false}
          />
        ) : null}
        
        <input
          ref={inputRef}
          type="text"
          value={textInput}
          onChange={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isDateField ? 'DD/MM/YYYY' : 'HH:MM:SS'}
          className="datetime-text-input"
        />
      </div>
    </div>
  );
};

export default PaymentDateTimeRenderer;
