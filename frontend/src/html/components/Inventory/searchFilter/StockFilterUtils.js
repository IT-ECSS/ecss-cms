/**
 * Stock Filter Utilities
 * Centralized filter and search functions for inventory management
 */

/**
 * Parse date string from DD/MM/YYYY format to YYYY-MM-DD
 * @param {string} dateStr - Date string in DD/MM/YYYY format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const parseDateFilter = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
    }
    return dateStr;
};

/**
 * Check if a product has color/non-location variations
 * @param {string} productName - Name of the product
 * @param {Array} inventoryProducts - List of inventory products
 * @returns {boolean} Whether product has color variations
 */
export const hasColorVariations = (productName, inventoryProducts) => {
    if (!productName) return false;
    const variations = inventoryProducts.filter(
        p => p.name === productName && p.type === 'variation'
    );
    if (variations.length === 0) return false;
    const attrs = variations[0].attributes || [];
    if (attrs.length === 0) return false;
    const attrName = (attrs[0].name || '').toLowerCase();
    return attrName !== 'location';
};

/**
 * Get filtered product names based on query
 * @param {string} query - Search query
 * @param {Array} inventoryProducts - List of inventory products
 * @returns {Array} Filtered product names
 */
export const getFilteredProducts = (query, inventoryProducts) => {
    const queryLower = (query || '').toLowerCase();
    const unique = [...new Set(
        inventoryProducts.map(p => p.name).filter(Boolean)
    )];
    return queryLower ? unique.filter(n => n.toLowerCase().includes(queryLower)) : unique;
};

/**
 * Get product variants for a given product
 * @param {string} productName - Name of the product
 * @param {Array} inventoryProducts - List of inventory products
 * @returns {Array} List of variant names
 */
export const getProductVariants = (productName, inventoryProducts) => {
    if (!productName) return [];
    return inventoryProducts
        .filter(p => p.name === productName && p.type === 'variation')
        .map(p => p.variation_name)
        .filter(Boolean);
};

/**
 * Get filtered location variations
 * @param {Array} inventoryProducts - List of inventory products
 * @returns {Array} Filtered location variations
 */
export const getFilteredLocations = (inventoryProducts) => {
    const locationVariations = inventoryProducts.filter(p => {
        if (p.type !== 'variation') return false;
        const attrs = p.attributes || [];
        if (attrs.length === 0) return true;
        return (attrs[0].name || '').toLowerCase() === 'location';
    });
    const unique = [...new Set(
        locationVariations.map(p => p.variation_name).filter(Boolean)
    )];
    return unique;
};

/**
 * Extract true parent product name (remove color suffix)
 * e.g., "ECSS Picnic Mat - Yellow" -> "ECSS Picnic Mat"
 * @param {string} parentName - The parent name possibly with color suffix
 * @returns {string} True parent name without color
 */
export const extractTrueParent = (parentName) => {
    if (!parentName) return '';
    // If name contains " - ", split and take first part (removes color suffix)
    if (parentName.includes(' - ')) {
        return parentName.split(' - ')[0];
    }
    return parentName;
};

/**
 * Extract color/variant from parent name
 * e.g., "ECSS Picnic Mat - Yellow" -> "Yellow"
 * @param {string} parentName - The parent name possibly with color suffix
 * @returns {string} Color variant or empty string
 */
export const extractColorVariant = (parentName) => {
    if (!parentName) return '';
    if (parentName.includes(' - ')) {
        return parentName.split(' - ')[1] || '';
    }
    return '';
};

/**
 * Single source of truth for "Item Sold" / "Sold" quantity.
 * Computed purely from Node/MongoDB stock records (port 3001) - never mixed with
 * the WooCommerce balance (port 3002). Used by BOTH the Order Records ("Inventory
 * Movement Log") table and the product summary cards so the two views can never
 * diverge.
 *
 * Net Sold = gross `Sales` quantity at this location
 *          - `Refund` quantity credited back to this location (reverses a sale)
 *          - `Duplicate Entry` quantity corrected at this location (cancels an
 *            erroneously double-counted sale)
 * @param {Array} stockRecords - List of stock records
 * @param {Array<string>} productNames - Product name(s) to match (case-insensitive)
 * @param {string} location - Location to match against locationFrom (falls back to legacy `location` field)
 * @returns {number} Net quantity sold
 */
export const calculateItemSold = (stockRecords = [], productNames = [], location = '') => {
    const locationLower = (location || '').toLowerCase();
    const namesLower = productNames.map(n => (n || '').toLowerCase()).filter(Boolean);
    if (namesLower.length === 0 || !locationLower) return 0;

    const matchesProduct = (r) => namesLower.includes((r.product || '').toLowerCase());

    // Gross sales recorded at this location (Sales rows store the site in locationFrom)
    const salesQty = stockRecords
        .filter(r => matchesProduct(r) && (r.action || '').toLowerCase() === 'sales' && (r.locationFrom || r.location || '').toLowerCase() === locationLower)
        .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

    // Refunds credited back to this location (Location To) reverse a previous sale
    const refundQty = stockRecords
        .filter(r => matchesProduct(r) && (r.action || '').toLowerCase() === 'refund' && (r.locationTo || '').toLowerCase() === locationLower)
        .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

    // Duplicate Entry corrections at this location (Location From) cancel out an
    // erroneously double-counted sale
    const duplicateEntryQty = stockRecords
        .filter(r => matchesProduct(r) && (r.action || '').toLowerCase() === 'duplicate entry' && (r.locationFrom || '').toLowerCase() === locationLower)
        .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

    return Math.max(0, salesQty - refundQty - duplicateEntryQty);
};

/**
 * Quantity of `Sales` rows at this location that are still pending confirmation
 * (`confirmed` is not `true`). This is purely informational — it is already
 * included in both the Sold figure (calculateItemSold) and the Balance figure
 * (WooCommerce stock was already decremented when the sale happened), so callers
 * must NOT add/subtract this from either value. It is only used to render the
 * "(pending)" bracket next to Balance/Sold.
 * @param {Array} stockRecords - List of stock records
 * @param {Array<string>} productNames - Product name(s) to match (case-insensitive)
 * @param {string} location - Location to match against locationFrom (falls back to legacy `location` field)
 * @returns {number} Pending (unconfirmed) quantity sold
 */
export const calculatePendingSold = (stockRecords = [], productNames = [], location = '') => {
    const locationLower = (location || '').toLowerCase();
    const namesLower = productNames.map(n => (n || '').toLowerCase()).filter(Boolean);
    if (namesLower.length === 0 || !locationLower) return 0;

    return stockRecords
        .filter(r => {
            const actionMatch = (r.action || '').toLowerCase() === 'sales';
            const prodMatch = namesLower.includes((r.product || '').toLowerCase());
            const locMatch = (r.locationFrom || r.location || '').toLowerCase() === locationLower;
            const isPending = r.confirmed !== true;
            return actionMatch && prodMatch && locMatch && isPending;
        })
        .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
};

/**
 * Generate product summary cards with filtering
 * Groups by true parent product, then by location, with colors as subsections
 * @param {Array} inventoryProducts - List of inventory products
 * @param {Array} stockRecords - List of stock records
 * @param {Object} filterOptions - Filter criteria
 * @returns {Array} Product summary cards
 */
export const generateProductSummaryCards = (inventoryProducts, stockRecords, filterOptions = {}) => {
    const { cardFilterProduct = '', cardFilterLocation = '', cardFilterDateFrom = '', cardFilterDateTo = '' } = filterOptions;
    const trueParentMap = {};
    // when the user types a full variant name like "ECSS Picnic Mat - Yellow",
    // keep the colour portion so we can remove the other colour cards later
    const colourFilter = extractColorVariant(cardFilterProduct).toLowerCase();

    // Filter stock records by date range if set
    let filteredStockRecords = stockRecords;
    if (cardFilterDateFrom || cardFilterDateTo) {
        const fromDate = parseDateFilter(cardFilterDateFrom);
        const toDate = parseDateFilter(cardFilterDateTo);
        filteredStockRecords = stockRecords.filter(r => {
            const recordDate = r.date || r.orderDate || '';
            if (!recordDate) return true;
            if (fromDate && recordDate < fromDate) return false;
            if (toDate && recordDate > toDate) return false;
            return true;
        });
    }

    // Group by true parent product, then by location
    for (const product of inventoryProducts) {
        const trueParent = extractTrueParent(product.parent_name);
        const colorVariant = extractColorVariant(product.parent_name);
        const location = product.variation_name || 'Store';

        if (!trueParentMap[trueParent]) {
            trueParentMap[trueParent] = {
                name: trueParent,
                locationVariants: {}
            };
        }

        // Group by location (primary)
        if (!trueParentMap[trueParent].locationVariants[location]) {
            trueParentMap[trueParent].locationVariants[location] = {
                location: location,
                colorMap: {}
            };
        }

        // Within each location, track colors (secondary)
        const colorKey = colorVariant || 'Standard';
        if (!trueParentMap[trueParent].locationVariants[location].colorMap[colorKey]) {
            trueParentMap[trueParent].locationVariants[location].colorMap[colorKey] = {
                name: colorKey,
                products: []
            };
        }

        trueParentMap[trueParent].locationVariants[location].colorMap[colorKey].products.push(product);
    }

    // Convert to card format with location-based variations
    let results = Object.values(trueParentMap).map(trueParentData => {
        const { name: trueParentName, locationVariants } = trueParentData;
        const trueParentLower = trueParentName.toLowerCase();
        
        console.log(`\n=== Processing card: ${trueParentName} ===`);

        // Calculate totals for the true parent
        const storeInActions = ['purchase from supplier', 'return stock to store', 'refund'];
        const storeOutActions = ['allocation to site', 'return to supplier'];

        // gather every actual product name that belongs to this parent (including color/variant names)
        const variationNames = [];
        Object.values(locationVariants).forEach(locData => {
            Object.values(locData.colorMap).forEach(colorData => {
                colorData.products.forEach(p => {
                    if (p.name) variationNames.push(p.name.toLowerCase());
                });
            });
        });
        // include parent name as fallback
        if (!variationNames.includes(trueParentLower)) {
            variationNames.push(trueParentLower);
        }

        const totalStockIn = filteredStockRecords
            .filter(r => variationNames.includes((r.product || '').toLowerCase()) && storeInActions.includes((r.action || '').toLowerCase()) && (r.locationTo || '').toLowerCase() === 'store')
            .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

        const totalStockOut = filteredStockRecords
            .filter(r => variationNames.includes((r.product || '').toLowerCase()) && storeOutActions.includes((r.action || '').toLowerCase()) && (r.locationFrom || '').toLowerCase() === 'store')
            .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

        // Create variations for each location (with colors as subsections)
        let variations = Object.entries(locationVariants).map(([location, locData]) => {
            const { colorMap } = locData;
            
            // Collect all product IDs and product names for this location
            const productIdsForLocation = [...new Set(
                Object.values(colorMap).flatMap(colorData => 
                    colorData.products.map(p => p.id).filter(Boolean)
                )
            )];
            
            // Collect all product names for this location (for stock record matching)
            const productNamesForLocation = [...new Set(
                Object.values(colorMap).flatMap(colorData => 
                    colorData.products.map(p => p.name).filter(Boolean)
                )
            )];
            
            // For each location, create colors array
            let colors = Object.entries(colorMap).map(([colorKey, colorData]) => {
                // Use the actual product names from this specific location
                const colorProductNames = colorData.products.map(p => p.name).filter(Boolean);
                
                // Get the actual stock_quantity from the variation products (not parent)
                const variationStockQuantity = colorData.products.length > 0 ? (colorData.products[0].stock_quantity || 0) : 0;
                
                // Get the parent product stock quantity
                const parentStockQuantity = colorData.products.length > 0 ? (colorData.products[0].parent_stock_quantity || 0) : 0;
                
                const colorStockIn = filteredStockRecords
                    .filter(r => colorProductNames.some(p => (r.product || '').toLowerCase() === p.toLowerCase()) && storeInActions.includes((r.action || '').toLowerCase()) && (r.locationTo || '').toLowerCase() === 'store')
                    .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

                const colorStockOut = filteredStockRecords
                    .filter(r => colorProductNames.some(p => (r.product || '').toLowerCase() === p.toLowerCase()) && storeOutActions.includes((r.action || '').toLowerCase()) && (r.locationFrom || '').toLowerCase() === 'store')
                    .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

                // Sold comes purely from the Node/MongoDB stock records (port 3001) -
                // the 'Sales' action rows for this location. It must NOT factor in the
                // WooCommerce balance (port 3002); Balance is sourced from WooCommerce
                // separately via variationStockQuantity/parentStockQuantity above.
                const salesProductNames = colorProductNames.includes(trueParentName) ? colorProductNames : [...colorProductNames, trueParentName];
                const colorSales = calculateItemSold(filteredStockRecords, salesProductNames, location);

                // Quantity of Sales at this location still pending confirmation.
                const pendingSold = calculatePendingSold(filteredStockRecords, salesProductNames, location);

                // Sold shown = confirmed sales only (colorSales minus the pending portion).
                // Balance is NOT adjusted here: WooCommerce (port 3002) is only decremented
                // once a Sales entry is confirmed, so a pending sale is already excluded from
                // the real WooCommerce stock_quantity - no need to add it back.
                const confirmedSold = Math.max(0, colorSales - pendingSold);

                return {
                    name: colorKey,
                    stockIn: colorStockIn,
                    stockOut: colorStockOut,
                    sales: confirmedSold,
                    pendingSold: pendingSold,
                    variationStockQuantity: variationStockQuantity,
                    parentStockQuantity: parentStockQuantity
                };
            });

            // if a colour filter is active, remove colours that don't match
            if (colourFilter) {
                colors = colors.filter(c => c.name.toLowerCase() === colourFilter);
            }

            // if there are no colours left after filtering, skip this location entirely
            if (colors.length === 0) {
                return null;
            }

            return {
                name: location,  // Variation is now the location
                productIds: productIdsForLocation,  // Include product IDs for this location
                colors: colors   // Colors are subsections within location
            };
        });
        // remove any null entries caused by empty locations
        variations = variations.filter(v => v !== null);

        // Total Sales is the sum of every site's Sold figure, so the footer always
        // stays internally consistent with the per-site numbers shown above it.
        const totalSales = variations.reduce(
            (sum, v) => sum + v.colors.reduce((cSum, c) => cSum + (c.sales || 0), 0),
            0
        );

        return {
            name: trueParentName,
            totalStock: totalStockIn,
            totalStockOut: totalStockOut,
            totalSold: totalSales,
            variations: variations.sort((a, b) => a.name.localeCompare(b.name))
        };
    });

    // Apply product name filter.  The cards use true parent names (no colour suffix),
    // so strip any '- color' part from the user query before matching.  This ensures a
    // search for "ECSS Picnic Mat - Yellow" still returns the "ECSS Picnic Mat" card.
    if (cardFilterProduct) {
        const normalizedFilter = extractTrueParent(cardFilterProduct).toLowerCase();
        results = results.filter(c => c.name.toLowerCase().includes(normalizedFilter));
    }

    // Apply location filter
    if (cardFilterLocation) {
        results = results.filter(c => c.variations.some(v => v.name.toLowerCase().includes(cardFilterLocation.toLowerCase())));
    }

    return results;
};

/**
 * Get filter product options
 * @param {string} query - Current query
 * @param {Array} inventoryProducts - List of inventory products
 * @returns {Array} Filtered product names
 */
export const getFilterProductOptions = (query, inventoryProducts) => {
    const queryLower = (query || '').toLowerCase();
    const unique = [...new Set(inventoryProducts.map(p => p.name).filter(Boolean))];
    return queryLower ? unique.filter(n => n.toLowerCase().includes(queryLower)) : unique;
};

/**
 * Get filter location options
 * @param {string} query - Current query
 * @param {Array} inventoryProducts - List of inventory products
 * @returns {Array} Filtered location names
 */
export const getFilterLocationOptions = (query, inventoryProducts) => {
    const queryLower = (query || '').toLowerCase();
    const unique = [...new Set(inventoryProducts.map(p => p.variation_name).filter(Boolean))];
    return queryLower ? unique.filter(n => n.toLowerCase().includes(queryLower)) : unique;
};
