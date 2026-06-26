import axios from 'axios';

const getBackendUrl = () => {
    return window.location.hostname === "localhost" 
        ? "http://localhost:3001" 
        : "https://ecss-backend-node.azurewebsites.net";
};

const getDjangoUrl = () => {
    return window.location.hostname === "localhost" 
        ? "http://localhost:3002" 
        : "https://ecss-backend-django.azurewebsites.net";
};

export const fetchInventoryRecords = async () => {
    try {
        const backendUrl = getBackendUrl();
        // Add cache-busting parameter to prevent stale data on page reload
        const timestamp = new Date().getTime();
        const response = await axios.post(`${backendUrl}/inventory?t=${timestamp}`, { purpose: "retrieve" });

        console.log('Inventory records fetched:', response.data);

        if (response.data.success) {
            const allRecords = response.data.records || [];
            // Order records = Sales entries only
            const orderRecords = allRecords.filter(r => r.action === 'Sales');
            return {
                success: true,
                records: orderRecords,
                error: null
            };
        } else {
            return {
                success: false,
                records: [],
                error: response.data.error || 'Failed to fetch inventory records'
            };
        }
    } catch (error) {
        console.error('Error fetching inventory records:', error);
        return {
            success: false,
            records: [],
            error: error.message || 'An error occurred while fetching inventory records'
        };
    }
};

export const fetchInventoryProducts = async () => {
    try {
        const baseUrl = getDjangoUrl();
        // Add cache-busting parameter
        const timestamp = new Date().getTime();
        const url = `${baseUrl}/inventory_product_details/?t=${timestamp}`;
        
        const response = await axios.get(url);

        let products = [];
        
        // Handle different response formats
        if (response.data.success && response.data.inventory_products) {
            products = response.data.inventory_products || [];
        } else if (Array.isArray(response.data)) {
            products = response.data;
        } else if (response.data.inventory_products && Array.isArray(response.data.inventory_products)) {
            products = response.data.inventory_products;
        } else if (response.data.data && Array.isArray(response.data.data)) {
            products = response.data.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
            products = response.data.results;
        }

        console.log("Fetched inventory products:", products);
        
        if (products.length === 0) {
            return {
                success: true,
                inventoryProducts: [],
                error: null
            };
        }
        
        // Transform WooCommerce variation data to include parent product info
        const transformedProducts = products.map(product => ({
            ...product,
            parent_name: product.name || 'Unnamed Product',
            variation_name: product.variation_name || product.name
        }));
        
        return {
            success: true,
            inventoryProducts: transformedProducts,
            error: null
        };
    } catch (error) {
        console.error('Error fetching inventory products:', error);
        return {
            success: false,
            inventoryProducts: [],
            error: error.message || 'An error occurred while fetching inventory products'
        };
    }
};

export const fetchStockRecords = async () => {
    try {
        const backendUrl = getBackendUrl();
        // Add cache-busting parameter to prevent stale data on page reload
        const timestamp = new Date().getTime();
        const response = await axios.post(`${backendUrl}/inventory?t=${timestamp}`, { purpose: "retrieveStock" });

        if (response.data.success) {
            const records = response.data.records || [];
            return {
                success: true,
                stockRecords: records,
                error: null
            };
        } else {
            return {
                success: false,
                stockRecords: [],
                error: 'Failed to fetch stock records'
            };
        }
    } catch (error) {
        console.error('Error fetching stock records:', error);
        return {
            success: false,
            stockRecords: [],
            error: error.message || 'An error occurred while fetching stock records'
        };
    }
}
