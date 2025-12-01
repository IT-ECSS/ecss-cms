import React, { Component } from 'react';
import '../../../css/sub/fundraisingOrderItemsModal.css';

class FundraisingOrderItemsModal extends Component {
  render() {
    const { 
      isOpen, 
      onClose, 
      selectedItems, 
      selectedRowData, 
      wooCommerceProductDetails 
    } = this.props;
    
    if (!isOpen || !selectedRowData) {
      return null;
    }

    // Create a map of WooCommerce product details for easy lookup
    const productDetailsMap = {};
    wooCommerceProductDetails.forEach(product => {
      productDetailsMap[product.name] = product;
    });

    // Calculate totals using enriched data if available
    const calculatedTotal = selectedItems.reduce((total, item) => {
      // Use enriched data if available (this includes flexible product matching)
      if (item.enrichedData && item.enrichedData.subtotal > 0) {
        return total + item.enrichedData.subtotal;
      }
      
      // Fallback to original calculation
      const itemName = item.productName;
      const quantity = item.quantity || 1;
      
      const wooProduct = productDetailsMap[itemName];
      const itemPrice = wooProduct ? parseFloat(wooProduct.price) : (item.price || item.unitPrice || 0);
      
      return total + (itemPrice * quantity);
    }, 0);

    return (
      <div className="items-modal-overlay" onClick={onClose}>
        <div className="items-modal-content professional-modal woocommerce-enhanced" onClick={(e) => e.stopPropagation()}>
          <div className="items-modal-header professional-header">
            <h3>Order Items</h3>
            <button className="items-modal-close-btn" onClick={onClose}>
              ×
            </button>
          </div>
          
          <div className="items-modal-body professional-body">
                  {selectedItems.map((item, index) => {
                    // Get item name and quantity from backend data
                    const itemName = item.productName;
                    const quantity = item.quantity || 1;
                    
                    // Use enriched WooCommerce details if available (better matching)
                    let wooProduct = null;
                    let productImage = null;
                    let currentPrice = 0;
                    let subtotal = 0;
                    let matchInfo = '';
                    
                    if (item.wooCommerceDetails) {
                      // Use the enriched WooCommerce details (supports flexible matching)
                      wooProduct = item.wooCommerceDetails;
                      productImage = item.wooCommerceDetails.primaryImage;
                      currentPrice = item.enrichedData?.finalPrice || parseFloat(item.wooCommerceDetails.price) || 0;
                      subtotal = item.enrichedData?.subtotal || (currentPrice * quantity);
                      matchInfo = `Match type: ${item.enrichedData?.matchType || 'unknown'}`;
                      
                      console.log(`Using enriched WooCommerce details for ${itemName}:`, {
                        matchType: item.enrichedData?.matchType,
                        price: currentPrice,
                        subtotal: subtotal,
                        image: productImage
                      });
                    } else {
                      // Fallback to original productDetailsMap lookup
                      wooProduct = productDetailsMap[itemName];
                      productImage = wooProduct && wooProduct.images && wooProduct.images.length > 0 
                        ? wooProduct.images[0].src 
                        : null;
                      currentPrice = wooProduct ? parseFloat(wooProduct.price) : (item.price || item.unitPrice || 0);
                      subtotal = currentPrice * quantity;
                      matchInfo = wooProduct ? 'Exact match' : 'No WooCommerce match';
                    }
                    
                    return (
                      <div key={index} className="table-row">
                        {/* Product Column */}
                        <div className="table-cell product-cell">
                          <div className="product-image-wrapper">
                            {productImage ? (
                              <img 
                                src={productImage} 
                                alt={itemName}
                                className="product-image"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="product-image-placeholder" 
                              style={{ display: productImage ? 'none' : 'flex' }}
                            >
                              No Image
                            </div>
                          </div>
                          <div className="product-details">
                            <div className="product-name" title={`${itemName} (${matchInfo})`}>
                              {itemName}
                            </div>
                            <div className="product-quantity">
                              Qty: {quantity}
                            </div>
                          </div>
                        </div>
                        
                        {/* Subtotal Column */}
                        <div className="table-cell subtotal-cell">
                          <span className="subtotal-value" title={`Price: $${currentPrice} × Qty: ${quantity} = $${subtotal.toFixed(2)}`}>
                            ${subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
          </div>
        </div>
      </div>
    );
  }
}

export default FundraisingOrderItemsModal;
