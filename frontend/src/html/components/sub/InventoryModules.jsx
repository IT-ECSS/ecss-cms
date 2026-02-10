import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/inventoryModules.css';
import InventoryForm from './InventoryForm';
import InventoryStore from './InventoryStore';
import InventoryRecords from './InventoryRecords';

class InventoryModules extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: props.initialTab || 'store', // 'store', 'form', or 'records'
            inventoryProducts: [],
            inventoryRecords: [],
            isLoading: true,
            isRecordsLoading: true,
            error: null,
            recordsError: null
        };
    }

    async componentDidMount() {
        await this.fetchInventoryProducts();
        await this.fetchInventoryRecords();
    }

    componentDidUpdate(prevProps) {
        // Update activeTab when initialTab prop changes
        if (prevProps.initialTab !== this.props.initialTab) {
            this.setState({ activeTab: this.props.initialTab || 'store' });
            
            // Always refetch data when switching tabs
            this.fetchInventoryProducts();
            this.fetchInventoryRecords();
        }
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    fetchInventoryProducts = async (silent = false) => {
        try {
            // Only show loading indicator if not a silent refresh
            if (!silent) {
                this.setState({ isLoading: true, error: null });
            }

            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";

            const response = await axios.get(`${baseUrl}/inventory_product_details/`);

            console.log('Inventory products fetched:', response.data);

            if (response.data.success) {
                const products = response.data.inventory_products || [];
                this.setState({
                    inventoryProducts: products,
                    isLoading: false
                }, () => {
                    // Close loading popup after state is updated (only for initial load)
                    // Only close popup for 'store' tab - 'form' tab handles its own popup closing
                    if (!silent && this.state.activeTab === 'store') {
                        if (this.props.closePopup1) {
                            this.props.closePopup1();
                        }
                        if (this.props.onDataLoaded) {
                            this.props.onDataLoaded();
                        }
                    }
                });
            } else {
                this.setState({
                    error: 'Failed to fetch inventory products',
                    isLoading: false
                }, () => {
                    if (!silent && this.props.closePopup1) {
                        this.props.closePopup1();
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching inventory products:', error);
            this.setState({
                error: error.message || 'An error occurred while fetching inventory products',
                isLoading: false
            }, () => {
                if (!silent && this.props.closePopup1) {
                    this.props.closePopup1();
                }
            });
        }
    };

    fetchInventoryRecords = async () => {
        try {
            this.setState({ isRecordsLoading: true, recordsError: null });

            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, { purpose: "retrieve" });

            console.log('Inventory records fetched:', response.data);

            if (response.data.success) {
                this.setState({
                    inventoryRecords: response.data.records || [],
                    isRecordsLoading: false
                }, () => {
                    // Only close popup for 'records' tab - 'form' tab handles its own popup closing
                    if (this.state.activeTab === 'records') {
                        if (this.props.closePopup1) {
                            this.props.closePopup1();
                        }
                        if (this.props.onDataLoaded) {
                            this.props.onDataLoaded();
                        }
                    }
                });
            } else {
                this.setState({
                    recordsError: response.data.error || 'Failed to fetch inventory records',
                    isRecordsLoading: false
                }, () => {
                    if (this.state.activeTab === 'records' && this.props.closePopup1) {
                        this.props.closePopup1();
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching inventory records:', error);
            this.setState({
                recordsError: error.message || 'An error occurred while fetching inventory records',
                isRecordsLoading: false
            }, () => {
                if (this.state.activeTab === 'records' && this.props.closePopup1) {
                    this.props.closePopup1();
                }
            });
        }
    };

    render() {
        const { activeTab, inventoryProducts, inventoryRecords, isLoading, isRecordsLoading, error, recordsError } = this.state;

        return (
            <>
                {/* Tab Content */}
                {activeTab === 'store' && (
                    <InventoryStore 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                        inventoryProducts={inventoryProducts}
                        isLoading={isLoading}
                        error={error}
                        onRetry={this.fetchInventoryProducts}
                    />
                )}
                {activeTab === 'form' && (
                    <InventoryForm 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                        closePopup1={this.props.closePopup1}
                        onDataLoaded={this.props.onDataLoaded}
                        inventoryProducts={inventoryProducts}
                    />
                )}
                {activeTab === 'records' && (
                    <InventoryRecords 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                        records={inventoryRecords}
                        isLoading={isRecordsLoading}
                        error={recordsError}
                        onRetry={this.fetchInventoryRecords}
                        closePopup1={this.props.closePopup1}
                        onDataLoaded={this.props.onDataLoaded}
                    />
                )}
            </>
        );
    }
}

export default InventoryModules;
