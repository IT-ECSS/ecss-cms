import React, { Component } from 'react';

class CollectionLocationSection extends Component {
  render() {
    const { 
      collectionLocation, 
      deliveryToAddress,
      shipToBillingAddress,
      expandedSections, 
      fieldErrors = {}, 
      onCollectionLocationChange, 
      onDeliveryToAddressChange,
      onShipToBillingAddressChange,
      onToggleSection,
      collectionMode,
      personalInfo 
    } = this.props;

    const locations = [
      'Tampines North Community Club',
      'Pasir Ris West Wellness Centre',
      'CT Hub'
    ];

    return (
      <div className="checkout-section">
        <div 
          className={`section-header ${expandedSections.collectionLocation ? 'expanded' : 'collapsed'}`}
          onClick={() => onToggleSection('collectionLocation')}
        >
          <h2 className="section-title">Collection/Delivery Location</h2>
          <span className="section-toggle-icon">
            {expandedSections.collectionLocation ? '▼' : '▶'}
          </span>
        </div>
        <div className={`section-content ${expandedSections.collectionLocation ? 'expanded' : 'collapsed'}`}>
          <div className="collection-location-form">
            <div className="form-group">
              {collectionMode === 'Self-Collection' && (
                <div className="collection-location-options">
                  <label>Select Collection Location</label>
                  <div className="location-buttons">
                    {locations.map((location) => (
                      <button
                        key={location}
                        type="button"
                        className={`location-button ${collectionLocation === location ? 'selected' : ''}`}
                        onClick={() => onCollectionLocationChange(location)}
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                  {fieldErrors.collectionLocation && (
                    <div className="field-error-message">{fieldErrors.collectionLocation}</div>
                  )}
                </div>
              )}
              
              {collectionMode === 'Delivery' && (
                <div className="delivery-options">
                  <div className="checkbox-option">
                    <input
                      type="checkbox"
                      id="shipToBilling"
                      checked={shipToBillingAddress}
                      onChange={(e) => onShipToBillingAddressChange(e.target.checked)}
                    />
                    <label htmlFor="shipToBilling" className="checkbox-label">Ship to billing address</label>
                  </div>
                  
                  <div className="delivery-address-input">
                    <label htmlFor="deliveryAddress">Delivery Address</label>
                    <input
                      type="text"
                      id="deliveryAddress"
                      className="form-input-field"
                      placeholder={shipToBillingAddress ? "Billing address will be used" : "Enter delivery address"}
                      value={shipToBillingAddress && personalInfo?.address && personalInfo?.postalCode ? 
                        `${personalInfo.address}, Singapore ${personalInfo.postalCode}` : 
                        deliveryToAddress}
                      onChange={(e) => onDeliveryToAddressChange(e.target.value)}
                      readOnly={shipToBillingAddress}
                    />
                    {fieldErrors.deliveryToAddress && (
                      <div className="field-error-message">{fieldErrors.deliveryToAddress}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default CollectionLocationSection;