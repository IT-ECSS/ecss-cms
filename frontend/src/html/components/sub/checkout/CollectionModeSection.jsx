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
              <div className="collection-mode-buttons">
                <button
                  type="button"
                  className={`collection-mode-button ${collectionMode === 'Self-Collection' ? 'selected' : ''}`}
                  onClick={() => onCollectionModeChange('Self-Collection')}
                >
                  Self-Collection
                </button>
                
                <button
                  type="button"
                  className={`collection-mode-button ${collectionMode === 'Delivery' ? 'selected' : ''}`}
                  onClick={() => onCollectionModeChange('Delivery')}
                >
                  Delivery
                </button>
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