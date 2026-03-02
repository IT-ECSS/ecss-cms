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
        const storeInActions = ['purchase from supplier', 'return stock to store'];
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

        // compute overall sales for the parent product (sum of all variations)
        const totalSales = filteredStockRecords
            .filter(r => variationNames.includes((r.product || '').toLowerCase()) && (r.action || '').toLowerCase() === 'sales')
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

                // sales for this color/location – records only include parent name, so match on parent as fallback
                // restrict sales by the current location as well
                const locationLower = location.toLowerCase();
                // compute sales attributable to this specific colour/variation
                const colorSales = filteredStockRecords
                    .filter(r => {
                        const actionMatch = (r.action || '').toLowerCase() === 'sales';
                        const locFromMatch = (r.locationFrom || r.location || '').toLowerCase() === locationLower;
                        const locToMatch = (r.locationTo || '').toLowerCase() === locationLower;
                        // match either the parent product or the actual variation name(s)
                        const prodLower = (r.product || '').toLowerCase();
                        const matchesColor = colorProductNames.some(p => prodLower === p.toLowerCase());
                        const matchesParent = prodLower === trueParentLower;
                        return actionMatch && (locFromMatch || locToMatch) && (matchesColor || matchesParent);
                    })
                    .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

                return {
                    name: colorKey,
                    stockIn: colorStockIn,
                    stockOut: colorStockOut,
                    sales: colorSales,
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


        return {
            name: trueParentName,
            totalStock: totalStockIn,
            totalStockOut: totalStockOut,
            // use precomputed totalSales directly (matches backend table)
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
