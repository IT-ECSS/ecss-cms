import React, { Component } from 'react';
import '../../../css/sub/inventoryModules.css';
import InventoryStore from '../Inventory/InventoryStore';
import InventoryForm from '../Inventory/InventoryForm';
import InventoryRecords from '../Inventory/InventoryRecords';
import InventoryInvoices from '../Inventory/InventoryInvoices';

class InventoryModules extends Component {
    render() {
        const activeTab = this.props.activeTab || this.props.initialTab || 'store';

        return (
            <>
                {activeTab === 'store' && (
                    <InventoryStore 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                        activeTab={activeTab}
                        inventoryRefreshCounter={this.props.inventoryRefreshCounter}
                        showSuccessPopup={this.props.showSuccessPopup}
                        showErrorPopup={this.props.showErrorPopup}
                    />
                )}
                {activeTab === 'form' && (
                    <InventoryForm 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                        activeTab={activeTab}
                        inventoryRefreshCounter={this.props.inventoryRefreshCounter}
                        showSuccessPopup={this.props.showSuccessPopup}
                        showErrorPopup={this.props.showErrorPopup}
                    />
                )}
                {activeTab === 'records' && (
                    <InventoryRecords 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                        activeTab={activeTab}
                        inventoryRefreshCounter={this.props.inventoryRefreshCounter}
                        showSuccessPopup={this.props.showSuccessPopup}
                        showErrorPopup={this.props.showErrorPopup}
                    />
                )}
                {activeTab === 'invoices' && (
                    <InventoryInvoices 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                        activeTab={activeTab}
                        inventoryRefreshCounter={this.props.inventoryRefreshCounter}
                    />
                )}
            </>
        );
    }
}

export default InventoryModules;
