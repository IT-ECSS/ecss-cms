import React, { Component } from 'react';

class ProductSummaryCards extends Component {
    /**
     * Calculate balance: stock in - stock out
     */
    calculateBalance = (stockIn, stockOut) => {
        return (stockIn || 0) - (stockOut || 0);
    };

    render() {
        const { cards } = this.props;
        console.log('Cards to render:', cards);
        return (
            <div className="stock-product-cards" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                {cards.map((card, idx) => (
                    <div key={card.name} className={`stock-product-card stock-product-card-${idx % 3}`} style={{ width: 'calc(50% - 10px)', minWidth: '300px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        <div className="stock-product-card-header">
                            <div>
                                <h4>{card.name}</h4>
                            </div>
                        </div>
                        <div className="stock-product-card-divider"></div>
                        
                        {/* Body - Store and Locations in 2-Column Grid */}
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                            {/* Main Sections Grid - 2 Columns (Store + Locations) */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                {/* Store Section - Aggregate Colors from All Locations */}
                                {(() => {
                                    const aggregatedColors = {};
                                    if (card.variations && card.variations.length > 0) {
                                        card.variations.forEach(variation => {
                                            if (variation.colors && variation.colors.length > 0) {
                                                variation.colors.forEach(color => {
                                                    if (!aggregatedColors[color.name]) {
                                                        aggregatedColors[color.name] = { stockIn: 0, stockOut: 0, sales: 0 };
                                                    }
                                                    aggregatedColors[color.name].stockIn += (color.stockIn || 0);
                                                    aggregatedColors[color.name].stockOut += (color.stockOut || 0);
                                                    aggregatedColors[color.name].sales += (color.sales || 0);
                                                });
                                            }
                                        });
                                    }
                                    const colorArray = Object.entries(aggregatedColors).map(([name, data]) => ({ name, ...data }));
                                    
                                    return (
                                        <div style={{ flex: '0 0 calc(50% - 10px)' }}>
                                            <div style={{ fontWeight: '600', color: '#333', marginBottom: '12px', fontSize: '1.8rem' }}>
                                                Store
                                            </div>
                                            
                                            {colorArray.length === 0 ? (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
                                                        <div style={{ color: '#27ae60', fontWeight: '700', fontSize: '1.8rem' }}>
                                                            {this.calculateBalance(card.totalStock || 0, card.totalStockOut || 0)}
                                                        </div>
                                                        <div style={{ color: '#666', fontWeight: '600', fontSize: '1.4rem' }}>Balance</div>
                                                    </div>
                                                    {(card.name !== 'ECSS Picnic Mat' && card.name !== 'ECSS En Ball') && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
                                                            <div style={{ color: '#8e44ad', fontWeight: '700', fontSize: '1.8rem' }}>
                                                                {card.totalSold || 0}
                                                            </div>
                                                            <div style={{ color: '#666', fontWeight: '600', fontSize: '1.4rem' }}>Sold</div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '12px', overflowX: 'auto' }}>
                                                    {colorArray.map((color, cIdx) => (
                                                        <div key={cIdx} style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#f8f9fa', padding: '12px 16px', borderRadius: '6px', border: '1px solid #eee', minWidth: '130px' }}>
                                                            <div style={{ fontSize: '1.4rem', color: '#333', fontWeight: '600', marginBottom: '12px' }}>
                                                                {color.name}
                                                            </div>
                                                            
                                                            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%', justifyContent: 'center' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                    <div style={{ color: '#27ae60', fontWeight: '700', fontSize: '1.6rem' }}>
                                                                        {this.calculateBalance(color.stockIn || 0, color.stockOut || 0)}
                                                                    </div>
                                                                    <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>Balance</div>
                                                                </div>
                                                                {(card.name !== 'ECSS Picnic Mat' && card.name !== 'ECSS En Ball') && (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                        <div style={{ color: '#8e44ad', fontWeight: '700', fontSize: '1.6rem' }}>
                                                                            {color.sales || 0}
                                                                        </div>
                                                                        <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>Sold</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                
                                {/* Locations with Colors */}
                                {card.variations && card.variations.map((variation, vIdx) => (
                                    <div key={vIdx} style={{ flex: '0 0 calc(50% - 10px)' }}>
                                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '12px', fontSize: '1.8rem' }}>
                                            {variation.name}
                                        </div>
                                        
                                        {/* Show all colors with color names */}
                                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '12px', overflowX: 'auto' }}>
                                            {variation.colors && variation.colors.map((color, cIdx) => (
                                                <div key={cIdx} style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#f8f9fa', padding: '12px 16px', borderRadius: '6px', border: '1px solid #eee', minWidth: '130px' }}>
                                                    <div style={{ fontSize: '1.4rem', color: '#333', fontWeight: '600', marginBottom: '12px' }}>
                                                        {color.name}
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', width: '100%', justifyContent: 'center' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                            <div style={{ color: '#27ae60', fontWeight: '700', fontSize: '1.6rem' }}>
                                                                {this.calculateBalance(color.stockIn || 0, color.stockOut || 0)}
                                                            </div>
                                                            <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>Balance</div>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                            <div style={{ color: '#8e44ad', fontWeight: '700', fontSize: '1.6rem' }}>
                                                                {color.sales || 0}
                                                            </div>
                                                            <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>Sold</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Footer - Total Sales */}
                        <div className="stock-product-card-divider"></div>
                        <div style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ color: '#666', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px' }}>Total Sales</div>
                            <div style={{ color: '#8e44ad', fontWeight: '700', fontSize: '2rem' }}>{card.totalSold || 0}</div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
}

export default ProductSummaryCards;
