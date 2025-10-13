import React, { Component } from 'react';

class CollectionModeSection extends Component {
  render() {
    const { collectionMode, expandedSections, fieldErrors = {}, onCollectionModeChange, onToggleSection } = this.props;

    return (
      <div className="checkout-section">
        <div 
          className={`section-header ${expandedSections.collectionMode ? 'expanded' : 'collapsed'}`}
          onClick={() => onToggleSection('collectionMode')}
        >
          <h2 className="section-title">Collection Mode</h2>
          <span className="section-toggle-icon">
            {expandedSections.collectionMode ? '▼' : '▶'}
          </span>
        </div>
        <div className={`section-content ${expandedSections.collectionMode ? 'expanded' : 'collapsed'}`}>
          <div className="collection-mode-form">
            <div className="form-group">
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="collectionMode"
                    value="Self-Collection"
                    checked={collectionMode === 'Self-Collection'}
                    onChange={(e) => onCollectionModeChange(e.target.value)}
                  />
                  <span className="radio-label">Self-Collection</span>
                </label>
                
                <label className="radio-option">
                  <input
                    type="radio"
                    name="collectionMode"
                    value="Delivery"
                    checked={collectionMode === 'Delivery'}
                    onChange={(e) => onCollectionModeChange(e.target.value)}
                  />
                  <span className="radio-label">Delivery</span>
                </label>
              </div>
              {fieldErrors.collectionMode && <div className="field-error-message">{fieldErrors.collectionMode}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default CollectionModeSection;