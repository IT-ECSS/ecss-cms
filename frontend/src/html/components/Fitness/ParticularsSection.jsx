import React, { Component } from 'react';
import '../../../css/fftCreateEvent.css';
import fftTranslations from './fftTranslations';

class ParticularsSection extends Component {
  state = {
    formData: {
      name: '',
      dateOfBirth: '',
      gender: '',
      age: '',
      phone: '',
    },
    errors: {},
  };

  storageKey = 'fftParticularsSectionData';

  componentDidMount() {
    // Initialize with passed formData if available
    if (this.props.formData) {
      this.setState({ formData: { ...this.state.formData, ...this.props.formData } });
    }
    // Load additional saved data
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.setState((prevState) => ({
          formData: { ...prevState.formData, ...parsed.formData },
          errors: parsed.errors || {},
        }));
      }
    } catch (e) {}
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.formData !== this.state.formData || prevState.errors !== this.state.errors) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify({
          formData: this.state.formData,
          errors: this.state.errors,
        }));
      } catch (e) {}
    }
  }

  handleInputChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === 'name') {
      value = value.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    const updatedFormData = { [name]: value };
    
    // Auto-calculate age if dateOfBirth is being updated and is valid
    if (name === 'dateOfBirth' && this.validateDateOfBirth(value)) {
      updatedFormData.age = this.calculateAge(value);
    }
    
    this.setState((prevState) => ({
      formData: {
        ...prevState.formData,
        ...updatedFormData,
      },
      errors: {
        ...prevState.errors,
        [name]: false,
      },
    }));
  };

  handleGenderChange = (gender) => {
    this.setState((prevState) => ({
      formData: {
        ...prevState.formData,
        gender,
      },
      errors: {
        ...prevState.errors,
        gender: false,
      },
    }));
  };

  validateDateOfBirth = (dateString) => {
    // Check if format is dd/mm/yyyy with valid day and month
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(\d{4})$/;
    return dateRegex.test(dateString);
  };

  validatePhone = (phoneString) => {
    // Check if phone starts with 8 or 9 and is 8 digits long (Singapore phone format)
    const phoneRegex = /^[89][0-9]{7}$/;
    return phoneRegex.test(phoneString);
  };

  handlePhoneChange = (e) => {
    let { value } = e.target;

    // Remove all non-digit characters
    value = value.replace(/[^\d]/g, '');

    // Limit to 8 digits
    if (value.length > 8) {
      value = value.slice(0, 8);
    }

    const updatedFormData = { phone: value };

    this.setState((prevState) => ({
      formData: {
        ...prevState.formData,
        ...updatedFormData,
      },
      errors: {
        ...prevState.errors,
        phone: false,
      },
    }));
  };

  handleDateOfBirthKeyDown = (e) => {
    if (e.key !== 'Backspace') return;

    const input = e.target;
    const { value, selectionStart, selectionEnd } = input;

    // Let browser handle selection deletion normally
    if (selectionStart !== selectionEnd) return;

    const cursorPos = selectionStart;
    if (cursorPos === 0) return;

    e.preventDefault();

    const charBefore = value[cursorPos - 1];

    if (charBefore === '/') {
      // Just move cursor back past the slash without deleting it
      input.setSelectionRange(cursorPos - 1, cursorPos - 1);
      return;
    }

    // Delete the digit, then rebuild preserving slash positions
    const newRaw = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
    const newCursorPos = cursorPos - 1;

    const parts = newRaw.split('/');
    const dd = (parts[0] || '').replace(/[^\d]/g, '').slice(0, 2);
    const mm = parts.length > 1 ? parts[1].replace(/[^\d]/g, '').slice(0, 2) : null;
    const yyyy = parts.length > 2 ? parts[2].replace(/[^\d]/g, '').slice(0, 4) : null;

    let formattedValue = dd;
    if (mm !== null) formattedValue += '/' + mm;
    if (yyyy !== null) formattedValue += '/' + yyyy;

    const updatedFormData = { dateOfBirth: formattedValue };
    if (this.validateDateOfBirth(formattedValue)) {
      updatedFormData.age = this.calculateAge(formattedValue);
    } else {
      updatedFormData.age = '';
    }

    this.setState((prevState) => ({
      formData: {
        ...prevState.formData,
        ...updatedFormData,
      },
      errors: {
        ...prevState.errors,
        dateOfBirth: false,
      },
    }), () => {
      input.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  handleDateOfBirthChange = (e) => {
    const input = e.target;
    let { value } = input;
    const cursorPos = input.selectionStart;
    
    // If value is empty, just clear it
    if (!value) {
      this.setState((prevState) => ({
        formData: {
          ...prevState.formData,
          dateOfBirth: '',
          age: '',
        },
        errors: {
          ...prevState.errors,
          dateOfBirth: false,
        },
      }));
      return;
    }
    
    // Count digits before cursor in the raw input value
    const digitsBeforeCursor = value.slice(0, cursorPos).replace(/[^\d]/g, '').length;
    
    // Extract only digits
    const digitsOnly = value.replace(/[^\d]/g, '');
    
    // Build formatted value with intelligent slash placement
    let formattedValue = '';
    if (digitsOnly.length > 0) {
      formattedValue = digitsOnly.slice(0, 2);
      if (digitsOnly.length > 2) {
        formattedValue += '/' + digitsOnly.slice(2, 4);
      }
      if (digitsOnly.length > 4) {
        formattedValue += '/' + digitsOnly.slice(4, 8);
      }
    }
    
    // Calculate new cursor position by counting digits in formatted value
    let newCursorPos = 0;
    let digitsCounted = 0;
    for (let i = 0; i < formattedValue.length && digitsCounted < digitsBeforeCursor; i++) {
      newCursorPos = i + 1;
      if (formattedValue[i] !== '/') {
        digitsCounted++;
      }
    }
    
    const updatedFormData = { dateOfBirth: formattedValue };
    
    // Auto-calculate age if dateOfBirth is being updated and is valid
    if (this.validateDateOfBirth(formattedValue)) {
      updatedFormData.age = this.calculateAge(formattedValue);
    } else {
      updatedFormData.age = '';
    }
    
    this.setState((prevState) => ({
      formData: {
        ...prevState.formData,
        ...updatedFormData,
      },
      errors: {
        ...prevState.errors,
        dateOfBirth: false,
      },
    }), () => {
      // Restore cursor position after React re-renders
      input.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  calculateAge = (dateString) => {
    // Parse dd/mm/yyyy format
    const [day, month, year] = dateString.split('/');
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 0 ? age.toString() : '';
  };

  validateForm = () => {
    const { formData } = this.state;
    const errors = {};

    if (!formData.name.trim()) errors.name = this.getTrans('errNameRequired');
    if (!formData.dateOfBirth.trim()) {
      errors.dateOfBirth = this.getTrans('errDobRequired');
    } else if (!this.validateDateOfBirth(formData.dateOfBirth)) {
      errors.dateOfBirth = this.getTrans('errDobRequired');
    }
    if (!formData.gender) errors.gender = this.getTrans('errGenderRequired');
    if (!formData.phone.trim()) {
      errors.phone = this.getTrans('errPhoneRequired');
    } else {
      const startsWithValid = /^[89]/.test(formData.phone);
      const isEightDigits = formData.phone.length === 8;

      if (startsWithValid && !isEightDigits) {
        errors.phone = this.getTrans('errPhoneInvalidLength');
      } else if (!startsWithValid && isEightDigits) {
        errors.phone = this.getTrans('errPhoneInvalidStart');
      } else if (!startsWithValid && !isEightDigits) {
        errors.phone = this.getTrans('errPhoneInvalidBoth');
      }
    }

    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  handleSubmit = () => {
    if (this.validateForm()) {
      this.props.onSubmit?.(this.state.formData);
    }
  };

  handleClear = () => {
    this.setState({
      formData: {
        name: '',
        dateOfBirth: '',
        gender: '',
        age: '',
        phone: '',
      },
      errors: {},
    });
  };

  getTrans = (key) => {
    const { language } = this.props;
    const translations = fftTranslations[key];
    if (!translations) return key;
    return translations[language] || translations.en || key;
  };

  getHeaderTrans = (key) => {
    const { language } = this.props;
    const translations = {
      back: {
        en: 'Back',
        zh: '返回',
        ms: 'Kembali',
      },
      home: {
        en: 'Home',
        zh: '主页',
        ms: 'Rumah',
      },
    };
    if (!translations[key]) return key;
    return translations[key][language] || translations[key].en || key;
  };

  render() {
    const { formData, errors } = this.state;
    const { language, onBack, onHome, singpassLocked = false } = this.props;
    const lockedStyle = { backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' };

    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          <div className="fft-participants-section">
            {/* Section header */}
            <div className="fft-participants-section-header">
              <h2 style={{ margin: 0, fontWeight: 700 }}>{this.getTrans('sectionParticulars')}</h2>
              <hr style={{ margin: '12px 0 12px 0', borderColor: '#ddd', border: 'none', borderTop: '1px solid #ddd' }} />
              <div style={{ margin: '0', color: '#444', fontSize: '1em' }}>
                {language === 'zh' && '请填写您的个人资料'}
                {language === 'ms' && 'Sila isi maklumat peribadi anda'}
                {language === 'en' && 'Please fill in your personal details'}
              </div>
            </div>

            {/* Name Field - Full width */}
            <div className="fft-create-event-field" style={{ marginTop: '32px' }}>
              <label className="fft-create-event-label">
                {this.getTrans('labelName')}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={this.handleInputChange}
                placeholder={this.getTrans('placeholderName')}
                className="fft-create-event-input"
                disabled={singpassLocked}
                style={singpassLocked ? lockedStyle : {}}
              />
              {errors.name && (
                <div className="fft-create-event-error" style={{ marginTop: '8px', marginBottom: '0', whiteSpace: 'nowrap' }}>
                  {errors.name}
                </div>
              )}
            </div>

            {/* Date of Birth and Gender - Two columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '35px' }}>
              <div>
                <label className="fft-create-event-label">
                  {this.getTrans('labelDob')}
                </label>
                <input
                  type="text"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={this.handleDateOfBirthChange}
                  onKeyDown={this.handleDateOfBirthKeyDown}
                  placeholder="e.g. 31/01/1965"
                  className="fft-create-event-input"
                  disabled={singpassLocked}
                  style={singpassLocked ? lockedStyle : {}}
                />
                {errors.dateOfBirth && (
                  <div className="fft-create-event-error" style={{ marginTop: '8px', marginBottom: '0', whiteSpace: 'nowrap' }}>
                    {errors.dateOfBirth}
                  </div>
                )}
              </div>

              <div>
                <label className="fft-create-event-label">
                  {this.getTrans('labelGender')}
                </label>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => !singpassLocked && this.handleGenderChange('M')}
                    disabled={singpassLocked}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: formData.gender === 'M' ? '2px solid #1565c0' : 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      color: formData.gender === 'M' ? '#1565c0' : '#333',
                      fontSize: '20px',
                      fontWeight: formData.gender === 'M' ? '700' : '600',
                      cursor: singpassLocked ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={() => !singpassLocked && this.handleGenderChange('F')}
                    disabled={singpassLocked}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: formData.gender === 'F' ? '2px solid #e91e8c' : 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      color: formData.gender === 'F' ? '#e91e8c' : '#333',
                      fontSize: '20px',
                      fontWeight: formData.gender === 'F' ? '700' : '600',
                      cursor: singpassLocked ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    F
                  </button>
                </div>
                {errors.gender && (
                  <div className="fft-create-event-error" style={{ marginTop: '8px', marginBottom: '0', whiteSpace: 'nowrap' }}>
                    {errors.gender}
                  </div>
                )}
              </div>
            </div>

            {/* Age and Phone Number - Two columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '35px', marginTop: '35px' }}>
              <div>
                <label className="fft-create-event-label">{this.getTrans('labelAge')}</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  disabled
                  placeholder={this.getTrans('placeholderAge')}
                  className="fft-create-event-input"
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <label className="fft-create-event-label">{this.getTrans('labelContactNumber')}</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={this.handlePhoneChange}
                  placeholder={this.getTrans('placeholderPhone')}
                  className="fft-create-event-input"
                />
                {errors.phone && (
                  <div className="fft-create-event-error" style={{ marginTop: '8px', marginBottom: '0', whiteSpace: 'nowrap' }}>
                    {errors.phone}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }
}

export default ParticularsSection;
