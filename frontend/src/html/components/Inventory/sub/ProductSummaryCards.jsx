import React, { Component } from 'react';

class ProductSummaryCards extends Component {
    constructor(props) {
        super(props);
        this.state = {
            mongoRecords: [],
            mongoLoading: true,
            mongoError: null,
            selectedMongoProduct: 'ECSS Resistance Band 2026'
        };
    }

    getBackendUrl = () => {
        return window.location.hostname === 'localhost'
            ? 'http://localhost:3001'
            : 'https://ecss-backend-node.azurewebsites.net';
    };

    async componentDidMount() {
        await this.fetchMongoRecords();
    }

    // Fetch all inventory stock records (all products, all locations) from the backend.
    fetchMongoRecords = async () => {
        try {
            this.setState({ mongoLoading: true, mongoError: null });
            const timestamp = new Date().getTime();
            const response = await fetch(`${this.getBackendUrl()}/inventory?t=${timestamp}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purpose: 'retrieveStock' })
            });
            const data = await response.json();
            if (data && data.success) {
                this.setState({ mongoRecords: data.records || [], mongoLoading: false });
            } else {
                this.setState({
                    mongoError: (data && data.error) || 'Failed to fetch records',
                    mongoLoading: false
                });
            }
        } catch (error) {
            this.setState({ mongoError: error.message || 'An error occurred', mongoLoading: false });
        }
    };

    // Look up the authoritative Store balance from the WooCommerce table (`cards`
    // prop) for a given product/variant. WooCommerce's parent stock quantity is the
    // source of truth for what physically remains at the Store, so the MongoDB card
    // mirrors it instead of deriving Store balance purely from stock records
    // (purchases − allocations), which can drift from the table.
    getTableStoreBalance = (config, variant) => {
        const cards = this.props.cards || [];
        const card = cards.find(c => (c.name || '').trim() === (config.title || '').trim());
        if (!card) return null;
        const label = (variant.label || '').trim().toLowerCase();
        let balance = null;
        (card.variations || []).forEach(v => {
            (v.colors || []).forEach(col => {
                const colName = (col.name || '').trim().toLowerCase();
                if (label) {
                    if (colName === label) balance = col.parentStockQuantity || 0;
                } else {
                    balance = col.parentStockQuantity || 0;
                }
            });
        });
        return balance;
    };

    // Aggregate MongoDB records for a product (optionally split into colour variants)
    // into per-location Balance / Sold, mirroring the WooCommerce product cards.
    computeMongoAggregate = (allRecords, config) => {
        const variants = config.variants;
        const SITES = config.sites || ['CT Hub', 'Pasir Ris West Wellness Centre', 'Tampines North Community Centre'];
        const perVariant = variants.map(v => {
            const recs = allRecords.filter(r => String(r.product || '') === v.product);
            const sold = {};
            const allocIn = {};
            let storeIn = 0;
            let storeOut = 0;
            recs.forEach(r => {
                const from = r.locationFrom || '';
                const to = r.locationTo || '';
                const qty = Number(r.quantity) || 0;
                if (r.action === 'Sales') {
                    sold[from] = (sold[from] || 0) + qty;
                } else if (r.action === 'Allocation To Site') {
                    allocIn[to] = (allocIn[to] || 0) + qty;
                    if (from === 'Store') storeOut += qty;
                } else if (r.action === 'Purchase From Supplier') {
                    if (to === 'Store') storeIn += qty;
                }
            });
            // Prefer the authoritative Store balance from the WooCommerce table.
            const tableStoreBalance = this.getTableStoreBalance(config, v);
            const storeBalance = tableStoreBalance !== null ? tableStoreBalance : storeIn - storeOut;
            return { label: v.label, sold, allocIn, storeBalance };
        });
        const totalSales = perVariant.reduce(
            (sum, pv) => sum + Object.values(pv.sold).reduce((a, b) => a + b, 0),
            0
        );
        return { SITES, perVariant, totalSales };
    };

    /**
     * Return stock quantity from WooCommerce (not calculated from records).
     * Balance should match the value reported by WooCommerce exactly.
     */
    getBalance = (variationStockQuantity) => {
        return variationStockQuantity || 0;
    };

    render() {
        const { cards } = this.props;
        const { mongoRecords, mongoLoading, mongoError, selectedMongoProduct } = this.state;

        const renderStat = (label, value, color) => (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{ color, fontWeight: '700', fontSize: '1.95rem' }}>{value}</div>
                <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem' }}>{label}</div>
            </div>
        );

        // MongoDB-derived cards configuration. Each product may have colour variants.
        const MONGO_PRODUCTS = [
            { title: 'ECSS Resistance Band 2026', variants: [{ label: '', product: 'ECSS Resistance Band 2026' }] },
            { title: 'ECSS En Ball', variants: [{ label: '', product: 'ECSS En Ball' }] },
            { title: 'ECSS Picnic Mat', sites: ['CT Hub'], variants: [
                { label: 'Yellow', product: 'ECSS Picnic Mat - Yellow' },
                { label: 'Red', product: 'ECSS Picnic Mat - Red' }
            ] }
        ];

        // Render a single product's aggregate section (used inside the combined card).
        const buildMongoSection = (config, isLast, showTitle = true) => {
            const { SITES, perVariant, totalSales } = this.computeMongoAggregate(mongoRecords, config);
            return (
                <div key={config.title} style={{ display: 'flex', flexDirection: 'column', height: '100%', borderBottom: isLast ? 'none' : '1px solid #e0e0e0' }}>
                    {showTitle && (
                        <div style={{ padding: '10px 16px', backgroundColor: '#fafafa', borderBottom: '1px solid #eee' }}>
                            <div style={{ fontWeight: '700', color: '#2c3e50', fontSize: '1.5rem' }}>{config.title}</div>
                        </div>
                    )}
                    <div style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '18px', flex: 1 }}>
                        {/* Store */}
                        <div style={{ flex: '1 1 calc(50% - 18px)', minWidth: '200px' }}>
                            <div style={{ fontWeight: '700', color: '#2c3e50', marginBottom: '10px', fontSize: '1.65rem' }}>Store</div>
                            <div style={{ display: 'flex', gap: '18px' }}>
                                {perVariant.map((pv, i) => (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        {pv.label && (
                                            <div style={{ fontSize: '1.425rem', color: '#333', fontWeight: '700' }}>{pv.label}</div>
                                        )}
                                        {renderStat('Balance', pv.storeBalance, '#27ae60')}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Each site */}
                        {SITES.map((site) => (
                            <div key={site} style={{ flex: '1 1 calc(50% - 18px)', minWidth: '200px' }}>
                                <div style={{ fontWeight: '700', color: '#2c3e50', marginBottom: '10px', fontSize: '1.65rem' }}>{site}</div>
                                <div style={{ display: 'flex', gap: '18px' }}>
                                    {perVariant.map((pv, i) => (
                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                            {pv.label && (
                                                <div style={{ fontSize: '1.425rem', color: '#333', fontWeight: '700' }}>{pv.label}</div>
                                            )}
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {renderStat('Balance', (pv.allocIn[site] || 0) - (pv.sold[site] || 0), '#27ae60')}
                                                {renderStat('Sold', pv.sold[site] || 0, '#8e44ad')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Section Total Sales */}
                    <div style={{ borderTop: '1px solid #e0e0e0' }}></div>
                    <div style={{ padding: '10px 16px', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                        <div style={{ color: '#666', fontWeight: '600', fontSize: '1.2rem', marginBottom: '4px' }}>Total Sales</div>
                        <div style={{ color: '#8e44ad', fontWeight: '700', fontSize: '1.95rem' }}>{totalSales}</div>
                    </div>
                </div>
            );
        };

        // All three products in ONE card; header is a dropdown to pick which item to view.
        const selectedConfig = MONGO_PRODUCTS.find(p => p.title === selectedMongoProduct) || MONGO_PRODUCTS[0];
        const combinedMongoCard = (
            <div key="records-from-mongodb" className="stock-product-card" style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div className="stock-product-card-header" style={{
                    padding: '12px 16px',
                    backgroundColor: '#f9f9f9',
                    borderBottom: '1px solid #e0e0e0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <select
                            value={selectedConfig.title}
                            onChange={(e) => this.setState({ selectedMongoProduct: e.target.value })}
                            style={{
                                flex: 1,
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#2c3e50',
                                padding: '6px 8px',
                                border: '1px solid #ccc',
                                borderRadius: '6px',
                                backgroundColor: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            {MONGO_PRODUCTS.map((p) => (
                                <option key={p.title} value={p.title}>{p.title}</option>
                            ))}
                        </select>
                        <span style={{ fontSize: '28px', fontWeight: '700', color: '#202124', lineHeight: '1.3', whiteSpace: 'nowrap' }}>
                            (From MongoDB)
                        </span>
                    </div>
                </div>

                {mongoLoading ? (
                    <div style={{ padding: '16px', flex: 1, color: '#666', fontSize: '1.2rem' }}>Loading from backend…</div>
                ) : mongoError ? (
                    <div style={{ padding: '16px', flex: 1, color: '#c0392b', fontSize: '1.2rem' }}>Error: {mongoError}</div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {buildMongoSection(selectedConfig, true, false)}
                    </div>
                )}
            </div>
        );

        const renderedCards = cards.map((card, idx) => (
                    <div key={card.name} className="stock-product-card" style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <div className="stock-product-card-header" style={{ 
                                padding: '12px 16px',
                                backgroundColor: '#f9f9f9',
                                borderBottom: '1px solid #e0e0e0'
                            }}>
                                <h4 style={{ margin: '0' }}>
                                    {card.name}
                                </h4>
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
                                                        {/* hide label text when it is just "Standard" */}
                                                        {color.name && color.name !== 'Standard' && (
                                                            <div style={{ fontSize: '1.425rem', color: '#333', fontWeight: '700', marginBottom: '6px' }}>
                                                                {color.name}
                                                            </div>
                                                        )}
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
                                            {variation.name && variation.name !== 'Standard' ? variation.name : ''}
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '10px' }}>
                                            {filteredLocColors && filteredLocColors.length > 0 ? (
                                                filteredLocColors.map((color, cIdx) => (
                                                    <div key={cIdx} style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 6px', borderRadius: '6px', minWidth: '90px' }}>
                                                        {/* hide 'Standard' label entirely */}
                                                        {color.name && color.name !== 'Standard' && (
                                                            <div style={{ fontSize: '1.425rem', color: '#333', fontWeight: '700', marginBottom: '6px' }}>
                                                                {color.name}
                                                            </div>
                                                        )}
                                                        
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
        ));

        // Append the combined MongoDB card (Resistance Band + En Ball + Picnic Mat) at the end.
        renderedCards.push(combinedMongoCard);

        return (
            <div className="stock-product-cards">
                {renderedCards}
                </div>
        );
    }
}

export default ProductSummaryCards;
