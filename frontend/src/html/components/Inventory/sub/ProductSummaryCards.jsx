import React, { Component } from 'react';

class ProductSummaryCards extends Component {
    constructor(props) {
        super(props);
        this.state = {
            expandedSections: {} // Track which sections are expanded: { "cardName-sectionName": true/false }
        };
    }

    toggleSection = (cardName, sectionName) => {
        const key = `${cardName}-${sectionName}`;
        this.setState(prevState => ({
            expandedSections: {
                ...prevState.expandedSections,
                [key]: !prevState.expandedSections[key]
            }
        }));
    };

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
                        <div 
                            key={card.name} 
                            className="stock-product-card" 
                            style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                flex: '1 1 calc(33.333% - 20px)',
                                minWidth: '300px',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div className="stock-product-card-header" style={{ 
                                padding: '18px 24px',
                                backgroundColor: '#f9f9f9',
                                borderBottom: '1px solid #e0e0e0'
                            }}>
                                <h2 style={{ margin: '0', color: '#2c3e50', fontSize: '1.95rem' }}>
                                    {card.name}
                                </h2>
                            </div>

                            {/* Body - Store and Locations in 2-Column Grid */}
                            <div style={{ 
                                padding: '24px', 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: '27px', 
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
                                            <div 
                                                onClick={() => this.toggleSection(card.name, 'Store')}
                                                style={{ 
                                                    fontWeight: '700', 
                                                    color: '#2c3e50', 
                                                    marginBottom: '15px', 
                                                    fontSize: '1.65rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    transition: 'color 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => e.target.style.color = '#0066cc'}
                                                onMouseLeave={(e) => e.target.style.color = '#2c3e50'}
                                            >
                                                <span style={{ marginRight: '8px' }}>
                                                    {this.state.expandedSections[`${card.name}-Store`] !== false ? '▼' : '▶'}
                                                </span>
                                                Store
                                            </div>
                                            
                                            {this.state.expandedSections[`${card.name}-Store`] !== false && (
                                                <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '10px' }}>
                                                    {filteredColors.map((color, cIdx) => (
                                                    <div key={cIdx} style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '15px 9px', borderRadius: '6px', minWidth: '90px' }}>
                                                        {!(color.name === 'Standard' && filteredColors.length === 1) && (
                                                            <div style={{ fontSize: '1.425rem', color: '#333', fontWeight: '700', marginBottom: '9px' }}>
                                                                {color.name}
                                                            </div>
                                                        )}
                                                        
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', width: '100%' }}>
                                                            <div style={{ color: '#27ae60', fontWeight: '700', fontSize: '1.95rem' }}>
                                                                {this.getBalance(color.parentStockQuantity || 0)}
                                                            </div>
                                                            <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>Balance</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                
                                {/* Locations Grid */}
                                {card.variations && card.variations.map((variation, vIdx) => (
                                    <div key={vIdx} style={{ flex: '1 1 calc(50% - 18px)', minWidth: '260px' }}>
                                        <div 
                                            onClick={() => this.toggleSection(card.name, variation.name)}
                                            style={{ 
                                                fontWeight: '700', 
                                                color: '#2c3e50', 
                                                marginBottom: '15px', 
                                                fontSize: '1.65rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                transition: 'color 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => e.target.style.color = '#0066cc'}
                                            onMouseLeave={(e) => e.target.style.color = '#2c3e50'}
                                        >
                                            <span style={{ marginRight: '8px' }}>
                                                {this.state.expandedSections[`${card.name}-${variation.name}`] !== false ? '▼' : '▶'}
                                            </span>
                                            {variation.name}
                                        </div>
                                        
                                        {this.state.expandedSections[`${card.name}-${variation.name}`] !== false && (
                                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '10px' }}>
                                            {variation.colors && (() => {
                                                const filteredLocColors = variation.colors.length > 1 ? variation.colors.filter(color => color.name !== 'Standard') : variation.colors;
                                                return filteredLocColors.map((color, cIdx) => (
                                                    <div key={cIdx} style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '15px 9px', borderRadius: '6px', minWidth: '90px' }}>
                                                        {!(color.name === 'Standard' && filteredLocColors.length === 1) && (
                                                            <div style={{ fontSize: '1.425rem', color: '#333', fontWeight: '700', marginBottom: '9px' }}>
                                                                {color.name}
                                                            </div>
                                                        )}
                                                        
                                                        <div style={{ display: 'flex', flexDirection: 'row', gap: '15px', width: '100%', justifyContent: 'center' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                                <div style={{ color: '#27ae60', fontWeight: '700', fontSize: '1.95rem' }}>
                                                                    {this.getBalance(color.variationStockQuantity || 0)}
                                                                </div>
                                                                <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>Balance</div>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                                <div style={{ color: '#8e44ad', fontWeight: '700', fontSize: '1.95rem' }}>
                                                                    {color.sales || 0}
                                                                </div>
                                                                <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>Sold</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            {/* Footer - Total Sales */}
                            <div style={{ borderTop: '1px solid #e0e0e0' }}></div>
                            <div style={{ padding: '15px 24px', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                                <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem', marginBottom: '6px' }}>Total Sales</div>
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
