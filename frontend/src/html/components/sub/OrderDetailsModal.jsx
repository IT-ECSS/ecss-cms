import React from 'react';
import '../../../css/sub/fundraising.css';

const OrderDetailsModal = ({ 
  showModal, 
  selectedItems, 
  onClose,
  wooCommerceProductDetails = [],
  selectedLanguage = 'english'
}) => {
  if (!showModal || !selectedItems) return null;

  const getTranslation = (key) => {
    const translations = {
      orderList: {
        english: 'Order List',
        chinese: '订单列表',
        malay: 'Senarai Pesanan'
      },
      item: {
        english: 'ITEM',
        chinese: '物品',
        malay: 'ITEM'
      },
      qty: {
        english: 'QTY',
        chinese: '数量',
        malay: 'KUANTITI'
      },
      subtotal: {
        english: 'SUBTOTAL',
        chinese: '小计',
        malay: 'SUBJUMLAH'
      },
      totalAmount: {
        english: 'Total Amount:',
        chinese: '总金额：',
        malay: 'Jumlah Keseluruhan:'
      }
    };

    return translations[key][selectedLanguage] || translations[key]['english'];
  };

  // Create a map for quick product lookup
  const productDetailsMap = {};
  wooCommerceProductDetails.forEach(product => {
    productDetailsMap[product.name] = product;
  });

  // Calculate total amount
  const totalAmount = selectedItems.reduce((total, item) => {
    const itemName = item.productName || item.name || item.itemName || 'Unknown Item';
    const quantity = item.quantity || 1;
    const wooProduct = productDetailsMap[itemName];
    const itemPrice = wooProduct ? parseFloat(wooProduct.price) : (item.price || item.unitPrice || 0);
    return total + (itemPrice * quantity);
  }, 0);

  return (
    <div className="professional-modal" onClick={(e) => e.stopPropagation()}>
      <div className="professional-header">
        <h3>{getTranslation('orderList')}</h3>
        <button className="modal-close-btn" onClick={onClose}>
          ×
        </button>
      </div>
        
      <div className="professional-body">
        <div className="list-header enhanced">
          <div className="header-item">{getTranslation('item')}</div>
          <div className="header-qty">{getTranslation('qty')}</div>
          <div className="header-subtotal">{getTranslation('subtotal')}</div>
        </div>
        <div className="items-list-professional">
          {selectedItems.map((item, index) => {
            const itemName = item.productName || item.name || item.itemName || 'Unknown Item';
            const quantity = item.quantity || 1;
            const wooProduct = productDetailsMap[itemName];
            const itemPrice = wooProduct ? parseFloat(wooProduct.price) : (item.price || item.unitPrice || 0);
            const subtotal = itemPrice * quantity;
            
            return (
              <div key={index} className="item-name-horizontal enhanced">
                <div className="item-name">{itemName}</div>
                <div className="quantity-text">{quantity}</div>
                <div className="subtotal-text">${subtotal.toFixed(2)}</div>
              </div>
            );
          })}
        </div>
        
        {/* Order Total Section */}
        {totalAmount > 0 && (
          <div className="order-total-section">
            <div className="total-line">
              <span className="total-label">{getTranslation('totalAmount')}</span>
              <span className="total-amount">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsModal;