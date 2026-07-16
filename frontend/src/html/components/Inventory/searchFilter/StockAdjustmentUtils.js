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
// locations that represent the three current site destinations
export const SITE_LOCATIONS = ['CT Hub', 'Tampines North Community Centre', 'Pasir Ris West Wellness Centre'];

export const getActionLocationConfig = (action, currentProduct, inventoryProducts = []) => {
    // note: for site-related actions the dropdown will later be restricted
    // to the values in SITE_LOCATIONS; we no longer auto‑populate based on
    // colour variants.
    switch (action) {
        case 'Purchase From Supplier':
            return { locationFrom: 'Supplier', locationTo: 'Store' };
        case 'Return to Supplier':
            return { locationFrom: 'Store', locationTo: 'Supplier' };
        case 'Allocation To Site':
            return {
                locationFrom: 'Store',
                locationTo: '' // user picks one of SITE_LOCATIONS
            };
        case 'Return Stock to Store':
            return {
                locationTo: 'Store',
                locationFrom: '' // user picks one of SITE_LOCATIONS
            };
        case 'Initial Stock':
            return {
                locationFrom: '',
                locationTo: '' // user picks either Store or one of SITE_LOCATIONS
            };
        case 'Refund':
            return {
                locationFrom: '', // free-text note (e.g. customer/source), not used for WooCommerce location resolution
                locationTo: '' // user picks Store or one of SITE_LOCATIONS - stock is increased here
            };
        case 'Duplicate Entry':
            return {
                locationFrom: '', // user picks one of SITE_LOCATIONS (CT Hub, Pasir Ris West Wellness Centre, Tampines North Community Centre)
                locationTo: '' // not needed; correction is applied directly at the chosen site
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
        // leave locationTo blank so user can choose one of SITE_LOCATIONS
    } else if (currentAction === 'Return Stock to Store') {
        updates.locationTo = 'Store';
        // leave locationFrom blank for the same reason
    }

    return updates;
};
