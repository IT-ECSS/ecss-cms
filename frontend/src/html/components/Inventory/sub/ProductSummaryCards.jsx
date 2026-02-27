import React, { Component } from 'react';

class ProductSummaryCards extends Component {
    /**
     * Return stock quantity from WooCommerce (not calculated from records)
     */
    getBalance = (variationStockQuantity) => {
        return variationStockQuantity || 0;
    };

    render() {
        const { cards } = this.props;

        return (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* All Cards */}
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '20px' }}>
                    {cards.map((card, idx) => (
                        <div key={card.name} className="stock-product-card" style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flex: '1 1 calc(33.333% - 20px)',
                            minWidth: '300px'
                        }}>
                            <div className="stock-product-card-header" style={{ 
                                padding: '12px 16px',
                                backgroundColor: '#f9f9f9',
                                borderBottom: '1px solid #e0e0e0'
                            }}>
                                <h2 style={{ margin: '0', color: '#2c3e50', fontSize: '1.95rem' }}>
                                    {card.name}
                                </h2>
                            </div>

                            {/* Body - Store and Locations in 2-Column Grid */}
                            <div style={{ 
                                padding: '16px', 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: '18px', 
                                flex: 1 
                            }}>
                                {/* Store Section */}
                                {(() => {
                                    const aggregatedData = {};
                                    
                                    if (card.variations && card.variations.length > 0) {
                                        card.variations.forEach(variation => {
                                            if (variation.colors && variation.colors.length > 0) {
                                                variation.colors.forEach(color => {
                                                    if (!aggregatedData[color.name]) {
                                                        aggregatedData[color.name] = { 
                                                            sales: 0,
                                                            parentStockQuantity: color.parentStockQuantity || 0
                                                        };
                                                    }
                                                    aggregatedData[color.name].sales += (color.sales || 0);
                                                });
                                            }
                                        });
                                    }
                                    const colorArray = Object.entries(aggregatedData).map(([name, data]) => ({ name, ...data }));
                                    const filteredColors = colorArray.length > 1 ? colorArray.filter(color => color.name !== 'Standard') : colorArray;
                                    
                                    return (
                                        <div style={{ flex: '1 1 calc(50% - 18px)', minWidth: '260px' }}>
                                            <div style={{ fontWeight: '700', color: '#2c3e50', marginBottom: '10px', fontSize: '1.65rem' }}>
                                                Store
                                            </div>
                                            
                                            <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '10px' }}>
                                                {filteredColors.map((color, cIdx) => (
                                                    <div key={cIdx} style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 6px', borderRadius: '6px', minWidth: '90px' }}>
                                                        <div style={{ fontSize: '1.425rem', color: '#333', fontWeight: '700', marginBottom: '6px' }}>
                                                            {color.name}
                                                        </div>
                                                        
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
                                                            <div style={{ color: '#27ae60', fontWeight: '700', fontSize: '1.95rem' }}>
                                                                {this.getBalance(color.parentStockQuantity || 0)}
                                                            </div>
                                                            <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>Balance</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                {/* Locations Grid */}
                                {card.variations && card.variations.map((variation, vIdx) => {
                                    // Filter out 'Standard' if there are multiple colors
                                    const filteredLocColors = variation.colors && variation.colors.length > 1 
                                        ? variation.colors.filter(color => color.name !== 'Standard') 
                                        : (variation.colors || []);
                                    
                                    return (
                                    <div key={vIdx} style={{ flex: '1 1 calc(50% - 18px)', minWidth: '260px' }}>
                                        <div style={{ fontWeight: '700', color: '#2c3e50', marginBottom: '10px', fontSize: '1.65rem' }}>
                                            {variation.name}
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '10px' }}>
                                            {filteredLocColors && filteredLocColors.length > 0 ? (
                                                filteredLocColors.map((color, cIdx) => (
                                                    <div key={cIdx} style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 6px', borderRadius: '6px', minWidth: '90px' }}>
                                                        <div style={{ fontSize: '1.425rem', color: '#333', fontWeight: '700', marginBottom: '6px' }}>
                                                            {color.name}
                                                        </div>
                                                        
                                                        <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', width: '100%', justifyContent: 'center' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                <div style={{ color: '#27ae60', fontWeight: '700', fontSize: '1.95rem' }}>
                                                                    {this.getBalance(color.variationStockQuantity || 0)}
                                                                </div>
                                                                <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>Balance</div>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                <div style={{ color: '#8e44ad', fontWeight: '700', fontSize: '1.95rem' }}>
                                                                    {color.sales || 0}
                                                                </div>
                                                                <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>Sold</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                // If no colors, show variation's stock balance
                                                <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 6px', borderRadius: '6px', minWidth: '90px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                        <div style={{ color: '#27ae60', fontWeight: '700', fontSize: '1.95rem' }}>
                                                            {this.getBalance(variation.variationStockQuantity || 0)}
                                                        </div>
                                                        <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>Balance</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                            
                            {/* Footer - Total Sales */}
                            <div style={{ borderTop: '1px solid #e0e0e0' }}></div>
                            <div style={{ padding: '10px 16px', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                                <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem', marginBottom: '4px' }}>Total Sales</div>
                                <div style={{ color: '#8e44ad', fontWeight: '700', fontSize: '1.95rem' }}>{card.totalSold || 0}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}

export default ProductSummaryCards;
