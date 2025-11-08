import React, { Component } from 'react';

class CollectionLocationSection extends Component {
  getTranslation(key) {
    const { selectedLanguage } = this.props;
    
    const translations = {
      'Collection Location Header': {
        'english': 'Collection Location',
        'chinese': '取货地点',
        'malay': 'Lokasi Pengumpulan'
      },
      'Collection Location': {
        'english': 'Collection Location',
        'chinese': '取货地点',
        'malay': 'Lokasi Pengumpulan'
      },
      'Select Collection Location': {
        'english': 'Select Collection Location',
        'chinese': '选择取货地点',
        'malay': 'Pilih Lokasi Pengumpulan'
      },
      'Ship to billing address': {
        'english': 'Ship to billing address',
        'chinese': '运送到账单地址',
        'malay': 'Hantar ke alamat bil'
      },
      'Delivery Address': {
        'english': 'Delivery Address',
        'chinese': '送货地址',
        'malay': 'Alamat Penghantaran'
      },
      'Billing address will be used': {
        'english': 'Billing address will be used',
        'chinese': '将使用账单地址',
        'malay': 'Alamat bil akan digunakan'
      },
      'Enter delivery address': {
        'english': 'Enter delivery address',
        'chinese': '输入送货地址',
        'malay': 'Masukkan alamat penghantaran'
      }
    };

    return translations[key] ? translations[key][selectedLanguage] || translations[key]['english'] : key;
  }

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
      personalInfo,
      selectedLanguage
    } = this.props;

    const locations = [
      'Tampines North Community Club',
      'Pasir Ris West Wellness Centre',
      'CT Hub'
    ];

    // Only show this section if a collection mode is selected
    if (!collectionMode || (collectionMode !== 'Self-Collection' && collectionMode !== 'Delivery')) {
      return null;
    }

    return (
      <div className="checkout-section">
        <div 
          className={`section-header ${expandedSections.collectionLocation ? 'expanded' : 'collapsed'}`}
          onClick={() => onToggleSection('collectionLocation')}
        >
          <h2 className="section-title">{this.getTranslation('Collection Location Header')}</h2>
          <span className="section-toggle-icon">
            {expandedSections.collectionLocation ? '▼' : '▶'}
          </span>
        </div>
        <div className={`section-content ${expandedSections.collectionLocation ? 'expanded' : 'collapsed'}`}>
          <div className="collection-location-form">
            <div className="form-group">
              {collectionMode === 'Self-Collection' && (
                <div className="collection-location-options">
                  <label>{this.getTranslation('Select Collection Location')}</label>
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
              
              {/* {collectionMode === 'Delivery' && (
                <div className="delivery-options">
                  <div className="checkbox-option">
                    <input
                      type="checkbox"
                      id="shipToBilling"
                      checked={shipToBillingAddress}
                      onChange={(e) => onShipToBillingAddressChange(e.target.checked)}
                    />
                    <label htmlFor="shipToBilling" className="checkbox-label">{this.getTranslation('Ship to billing address')}</label>
                  </div>
                  
                  <div className="delivery-address-input">
                    <label htmlFor="deliveryAddress">{this.getTranslation('Delivery Address')}</label>
                    <input
                      type="text"
                      id="deliveryAddress"
                      className="form-input-field111"
                      placeholder={shipToBillingAddress ? this.getTranslation("Billing address will be used") : this.getTranslation("Enter delivery address")}
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
              )} */}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default CollectionLocationSection;