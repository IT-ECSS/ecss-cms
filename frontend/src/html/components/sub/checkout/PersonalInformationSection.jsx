import React, { Component } from 'react';

class PersonalInformationSection extends Component {
  render() {
    const { personalInfo, expandedSections, fieldErrors = {}, onPersonalInfoChange, onToggleSection } = this.props;

    return (
      <div className="checkout-section">
        <div 
          className={`section-header ${expandedSections.personalInfo ? 'expanded' : 'collapsed'}`}
          onClick={() => onToggleSection('personalInfo')}
        >
          <h2 className="section-title">Personal Information</h2>
          <span className="section-toggle-icon">
            {expandedSections.personalInfo ? '▼' : '▶'}
          </span>
        </div>
        <div className={`section-content ${expandedSections.personalInfo ? 'expanded' : 'collapsed'}`}>
          <div className="personal-info-form">
            <div className="form-row">
              <div className="form-group111">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  className="form-input-field"
                  value={personalInfo.firstName}
                  onChange={(e) => onPersonalInfoChange('firstName', e.target.value)}
                />
                {fieldErrors.firstName && <div className="field-error-message">{fieldErrors.firstName}</div>}
              </div>
              <div className="form-group111">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  className="form-input-field"
                  value={personalInfo.lastName}
                  onChange={(e) => onPersonalInfoChange('lastName', e.target.value)}
                />
                {fieldErrors.lastName && <div className="field-error-message">{fieldErrors.lastName}</div>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group111">
                <label htmlFor="email">Email Address (Optional)</label>
                <input
                  type="text"
                  id="email"
                  className="form-input-field"
                  value={personalInfo.email}
                  onChange={(e) => onPersonalInfoChange('email', e.target.value)}
                />
                {fieldErrors.email && <div className="field-error-message">{fieldErrors.email}</div>}
              </div>
              <div className="form-group111">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="text"
                  id="phone"
                  className="form-input-field"
                  value={personalInfo.phone}
                  onChange={(e) => onPersonalInfoChange('phone', e.target.value)}
                />
                {fieldErrors.phone && <div className="field-error-message">{fieldErrors.phone}</div>}
              </div>
            </div>
            
            {/* <div className="form-group111">
              <label htmlFor="address">Address</label>
              <input
                type="text"
                id="address"
                className="form-input-field"
                value={personalInfo.address}
                onChange={(e) => onPersonalInfoChange('address', e.target.value)}
              />
              {fieldErrors.address && <div className="field-error-message">{fieldErrors.address}</div>}
            </div>
            
            <div className="form-group111">
              <label htmlFor="postalCode">Postal Code</label>
              <input
                type="text"
                id="postalCode"
                className="form-input-field"
                value={personalInfo.postalCode}
                onChange={(e) => onPersonalInfoChange('postalCode', e.target.value)}
              />
              {fieldErrors.postalCode && <div className="field-error-message">{fieldErrors.postalCode}</div>}
            </div> */}
            
            <div className="form-group">
              <label htmlFor="location">Location</label>
              <div className="location-buttons-container">
                <div className="location-buttons">
                  {['Tampines North Community Club', 'Pasir Ris West Wellness Centre', 'CT Hub'].map((location) => (
                    <button
                      key={location}
                      type="button"
                      className={`location-button ${personalInfo.location === location ? 'selected' : ''}`}
                      onClick={() => onPersonalInfoChange('location', location)}
                    >
                      {location}
                    </button>
                  ))}
                </div>
                <div className="location-buttons">
                  {['En Community Church', 'Others'].map((location) => (
                    <button
                      key={location}
                      type="button"
                      className={`location-button ${personalInfo.location === location ? 'selected' : ''}`}
                      onClick={() => onPersonalInfoChange('location', location)}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
              {fieldErrors.location && <div className="field-error-message">{fieldErrors.location}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default PersonalInformationSection;