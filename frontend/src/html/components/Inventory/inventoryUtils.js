/**
 * Shared utility functions for Inventory components
 */

export const ALL_STOCK_ACTIONS = [
    { label: 'Purchase From Supplier', group: 'Supplier' },
    { label: 'Return to Supplier', group: 'Supplier' },
    { type: 'divider' },
    { label: 'Initial Stock', group: 'Stock' },
    { type: 'divider' },
    { label: 'Allocation To Site', group: 'Stock' },
    { label: 'Return Stock to Store', group: 'Stock' },
];

export const STOCK_IN_ACTIONS = ['Purchase From Supplier', 'Return Stock to Store', 'Initial Stock'];
export const STOCK_OUT_ACTIONS = ['Allocation To Site', 'Return to Supplier'];

/**
 * Parse DD/MM/YYYY date to YYYY-MM-DD for comparison
 */
export const parseDateFilter = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
};

/**
 * Calculate balance for a product or variant (stock in - stock out)
 */
export const calculateBalance = (stockIn, stockOut) => {
    return (stockIn || 0) - (stockOut || 0);
};

/**
 * Format date for display
 */
export const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
};
