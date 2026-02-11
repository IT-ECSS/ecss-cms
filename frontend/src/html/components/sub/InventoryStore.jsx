import React, { Component } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import '../../../css/sub/inventoryModules.css';

class InventoryStore extends Component {
    constructor(props) {
        super(props);
        this.state = {
            inventoryProducts: [],
            inventoryRecords: [],
            isLoading: true,
            error: null
        };
        this.eventSource = null;
        this.socket = null;
    }

    async componentDidMount() {
        await Promise.all([
            this.fetchInventoryProducts(),
            this.fetchInventoryRecords()
        ]);
        await this.setupSSE();
       //await this.setupSocket();
    }

    componentWillUnmount() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    setupSSE = () => {
        return new Promise((resolve) => {
            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";

            this.eventSource = new EventSource(`${baseUrl}/inventory_sse/`);

            this.eventSource.onopen = () => {
                console.log('SSE connection opened');
                resolve();
            };

            this.eventSource.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE inventory update:', data);
                    
                    if (data.type === 'connected') {
                        console.log('SSE connected to inventory updates');
                    } else if (data.type === 'inventory_updated') {
                        // Refetch both products and records instantly
                        //Promise.all([
                            await this.fetchInventoryProducts();
                            await this.fetchInventoryRecords();
                       //]);
                    }
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                // Reconnect after 5 seconds
                if (this.eventSource) {
                    this.eventSource.close();
                }
                setTimeout(() => {
                    if (this.eventSource === null || this.eventSource.readyState === EventSource.CLOSED) {
                        this.setupSSE();
                    }
                }, 5000);
            };
        });
    };

    /*setupSSE = () => {
        return new Promise((resolve) => {
            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";

            this.eventSource = new EventSource(`${baseUrl}/inventory_sse/`);

            this.eventSource.onopen = () => {
                console.log('SSE connection opened');
                resolve();
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE inventory update:', data);
                    
                    if (data.type === 'connected') {
                        console.log('SSE connected to inventory updates');
                    } else if (data.type === 'inventory_updated') {
                        // Refetch the full inventory list (silent, no loading spinner)
                        this.fetchInventoryProducts();
                    }
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                // Reconnect after 5 seconds
                if (this.eventSource) {
                    this.eventSource.close();
                }
                setTimeout(() => {
                    if (this.eventSource === null || this.eventSource.readyState === EventSource.CLOSED) {
                        this.setupSSE();
                    }
                }, 5000);
            };
        });
    };*/


    /*setupSocket = () => {
        return new Promise((resolve) => {
            this.socket = io(
                window.location.hostname === "localhost"
                    ? "http://localhost:3001"
                    : "https://ecss-backend-node.azurewebsites.net"
            );
            this.socket.on('connect', () => {
                console.log('Socket.IO connected');
                resolve();
            });
            this.socket.on('inventory', (data) => {
                console.log("Socket inventory event received", data);
                this.fetchInventoryRecords(true);
            });
        });
    };*/

    fetchInventoryProducts = async () => {
        try {
            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";

            const response = await axios.get(`${baseUrl}/inventory_product_details/`);

            console.log('Inventory products fetched:', response.data);

            if (response.data.success) {
                const allProducts = response.data.inventory_products || [];
                // Filter out products with 0 or no stock
                const products = allProducts.filter(p => {
                    const stock = parseInt(p.stock_quantity) || 0;
                    return stock > 0;
                });
                console.log('Products with stock:', products.length, 'out of', allProducts.length);
                this.setState({
                    inventoryProducts: products,
                    isLoading: false
                });
            } else {
                this.setState({
                    error: 'Failed to fetch inventory products',
                    isLoading: false
                });
            }
        } catch (error) {
            console.error('Error fetching inventory products:', error);
            this.setState({
                error: error.message || 'An error occurred while fetching inventory products',
                isLoading: false
            });
        }
    };

    fetchInventoryRecords = async () => {
        try {
            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, { purpose: "retrieve" });

            if (response.data.success) {
                this.setState({
                    inventoryRecords: response.data.records || []
                });
            }
        } catch (error) {
            console.error('Error fetching inventory records:', error);
        }
    };

    // Calculate sold count for a specific product and location
    getSoldCount = (productName, locationName) => {
        const { inventoryRecords } = this.state;
        return inventoryRecords
            .filter(record => record.product === productName && record.location === locationName)
            .reduce((total, record) => total + (parseInt(record.quantity) || 0), 0);
    };

    // Calculate sold amount (money) for a specific product and location
    getSoldAmount = (productName, locationName) => {
        const { inventoryRecords } = this.state;
        return inventoryRecords
            .filter(record => record.product === productName && record.location === locationName)
            .reduce((total, record) => total + (parseFloat(record.totalPrice) || 0), 0);
    };

    render() {
        const { inventoryProducts, isLoading, error } = this.state;

        if (isLoading) {
            return (
                <>
                    <div className="inventory-heading">
                        <h2>Inventory Store</h2>
                    </div>
                    <div className="inventory-content">
                        <div className="inventory-loading">
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Loading inventory...</p>
                        </div>
                    </div>
                </>
            );
        }

        if (error) {
            return (
                <>
                    <div className="inventory-heading">
                        <h2>Inventory Store</h2>
                    </div>
                    <div className="inventory-content">
                        <div className="inventory-error">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                            <button onClick={this.fetchInventoryProducts} className="retry-btn">
                                <i className="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </div>
                </>
            );
        }

        return (
            <>
                <div className="inventory-heading">
                    <h2>Inventory Store</h2>
                </div>
                <div className="inventory-content">
                {inventoryProducts.length === 0 ? (
                    <div className="inventory-empty-state">
                        <i className="fas fa-boxes"></i>
                        <h3>No Products Found</h3>
                        <p>No products in the Inventory category.</p>
                    </div>
                ) : (
                    <div className="inventory-grid">
                        {inventoryProducts.map((product) => (
                            <div key={product.id} className="inventory-card">
                                <div className="inventory-card-image">
                                    {product.images && product.images.length > 0 ? (
                                        <img src={product.images[0].src} alt={product.name} />
                                    ) : (
                                        <div className="no-image">
                                            <i className="fas fa-image"></i>
                                        </div>
                                    )}
                                </div>
                                <div className="inventory-card-content">
                                    <h1 className="inventory-card-title">{product.name}</h1>
                                    {product.variation_name && (
                                        <div className="inventory-card-variation">
                                            <i className="fas fa-map-marker-alt"></i>
                                            <b>{product.variation_name}</b>
                                        </div>
                                    )}
                                    <div className="inventory-card-details">
                                        <span className={`inventory-stock ${(parseInt(product.stock_quantity) > 0) ? 'in-stock' : 'out-of-stock'}`}>
                                            <b>Inventory Stock: </b> {product.stock_quantity}
                                        </span>
                                        <span className="inventory-sold">
                                            <b>Unit Sold: </b> {this.getSoldCount(product.name, product.variation_name)}
                                        </span>                                    
                                    </div>
                                    <div className="inventory-card-details">                                       
                                        <span className="inventory-amount" style={{flex: 0.45}}>
                                            <b>Sales Revenue: </b> ${this.getSoldAmount(product.name, product.variation_name).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            </>
        );
    }
}

export default InventoryStore;
