/**
 * Utility functions for Stock Adjustment modal
 * Extracted from component logic for reusability and testability
 */

import { hasColorVariations } from './StockFilterUtils';

/**
 * Get filtered product names based on query input
 * @param {string} query - Search query
 * @param {array} inventoryProducts - All inventory products
 * @returns {array} - Filtered unique product names
 */
export const getFilteredProducts = (query, inventoryProducts = []) => {
    const normalizedQuery = (query || '').toLowerCase();
    const unique = [...new Set(
        inventoryProducts.map(p => p.name).filter(Boolean)
    )];
    return normalizedQuery 
        ? unique.filter(n => n.toLowerCase().includes(normalizedQuery)) 
        : unique;
};

/**
 * Get variant options for a product
 * @param {string} productName - Product name
 * @param {array} inventoryProducts - All inventory products
 * @returns {array} - Variant names
 */
export const getProductVariants = (productName, inventoryProducts = []) => {
    if (!productName) return [];
    return inventoryProducts
        .filter(p => p.name === productName && p.type === 'variation')
        .map(p => p.variation_name)
        .filter(Boolean);
};

/**
 * Get filtered location variations
 * @param {array} inventoryProducts - All inventory products
 * @returns {array} - Unique location names
 */
export const getFilteredLocations = (inventoryProducts = []) => {
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
 * Configure form fields based on selected action
 * @param {string} action - Selected action
 * @param {string} currentProduct - Current product name
 * @param {array} inventoryProducts - All inventory products
 * @returns {object} - Form field updates {locationFrom, locationTo}
 */
export const getActionLocationConfig = (action, currentProduct, inventoryProducts = []) => {
    const isColorProduct = hasColorVariations(currentProduct, inventoryProducts);
    
    switch (action) {
        case 'Purchase From Supplier':
            return { locationFrom: 'Supplier', locationTo: 'Store' };
        case 'Return to Supplier':
            return { locationFrom: 'Store', locationTo: 'Supplier' };
        case 'Allocation To Site':
            return {
                locationFrom: 'Store',
                locationTo: isColorProduct ? 'CT Hub' : ''
            };
        case 'Return Stock to Store':
            return {
                locationTo: 'Store',
                locationFrom: isColorProduct ? 'CT Hub' : ''
            };
        default:
            return { locationFrom: '', locationTo: '' };
    }
};

/**
 * Configure form fields based on selected product
 * @param {string} productName - Selected product name
 * @param {string} currentAction - Current action
 * @param {array} inventoryProducts - All inventory products
 * @returns {object} - Form field updates {locationFrom, locationTo}
 */
export const getProductLocationConfig = (productName, currentAction, inventoryProducts = []) => {
    const updates = {};
    
    if (currentAction === 'Allocation To Site') {
        updates.locationFrom = 'Store';
        if (hasColorVariations(productName, inventoryProducts)) {
            updates.locationTo = 'CT Hub';
        }
    } else if (currentAction === 'Return Stock to Store') {
        updates.locationTo = 'Store';
        if (hasColorVariations(productName, inventoryProducts)) {
            updates.locationFrom = 'CT Hub';
        }
    }
    
    return updates;
};
