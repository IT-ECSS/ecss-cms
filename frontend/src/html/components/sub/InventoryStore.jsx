import React, { Component } from 'react';
import '../../../css/sub/inventoryModules.css';

class InventoryStore extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { inventoryProducts = [], isLoading = false, error = null, onRetry } = this.props;

        if (isLoading) {
            return (
                <>
                    <div className="inventory-heading">
                        <h2>Inventory Store</h2>
                    </div>
                    <div className="inventory-content">
                        <div className="inventory-loading">
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Loading inventory...</p>
                        </div>
                    </div>
                </>
            );
        }

        if (error) {
            return (
                <>
                    <div className="inventory-heading">
                        <h2>Inventory Store</h2>
                    </div>
                    <div className="inventory-content">
                        <div className="inventory-error">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                            <button onClick={onRetry} className="retry-btn">
                                <i className="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </div>
                </>
            );
        }

        return (
            <>
                <div className="inventory-heading">
                    <h2>Inventory Store</h2>
                </div>
                <div className="inventory-content">
                {inventoryProducts.length === 0 ? (
                    <div className="inventory-empty-state">
                        <i className="fas fa-boxes"></i>
                        <h3>No Products Found</h3>
                        <p>No products in the Inventory category.</p>
                    </div>
                ) : (
                    <div className="inventory-grid">
                        {inventoryProducts.map((product) => (
                            <div key={product.id} className="inventory-card">
                                <div className="inventory-card-image">
                                    {product.images && product.images.length > 0 ? (
                                        <img src={product.images[0].src} alt={product.name} />
                                    ) : (
                                        <div className="no-image">
                                            <i className="fas fa-image"></i>
                                        </div>
                                    )}
                                </div>
                                <div className="inventory-card-content">
                                    <h3 className="inventory-card-title">{product.name}</h3>
                                    {product.variation_name && (
                                        <div className="inventory-card-variation">
                                            <i className="fas fa-map-marker-alt"></i>
                                            {product.variation_name}
                                        </div>
                                    )}
                                    <div className="inventory-card-details">
                                        <span className={`inventory-stock ${(parseInt(product.stock_quantity) || 0) > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                            Stock: {product.stock_quantity || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            </>
        );
    }
}

export default InventoryStore;
