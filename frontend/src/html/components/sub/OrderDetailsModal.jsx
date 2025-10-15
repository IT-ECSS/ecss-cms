import React from 'react';
import '../../../css/sub/fundraising.css';

const OrderDetailsModal = ({ 
  showModal, 
  selectedItems, 
  onClose 
}) => {
  if (!showModal || !selectedItems) return null;

  return (
    <div className="professional-modal" onClick={(e) => e.stopPropagation()}>
      <div className="professional-header">
        <h3>Order List</h3>
        <button className="modal-close-btn" onClick={onClose}>
          ×
        </button>
      </div>
        
      <div className="professional-body">
        <div className="list-header">
          <div className="header-item">ITEM</div>
          <div className="header-qty">QTY</div>
        </div>
        <div className="items-list-professional">
          {selectedItems.map((item, index) => {
            const itemName = item.productName || item.name || item.itemName || 'Unknown Item';
            const quantity = item.quantity || 1;
            
            return (
              <div key={index} className="item-name-horizontal">
                <div className="item-name">{itemName}</div>
                <div className="quantity-text">{quantity}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;