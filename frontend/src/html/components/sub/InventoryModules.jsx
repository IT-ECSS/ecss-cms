import React, { Component } from 'react';
import '../../../css/sub/inventoryModules.css';
import InventoryStore from './InventoryStore';
import InventoryForm from './InventoryForm';
import InventoryRecords from './InventoryRecords';
import InventoryInvoices from './InventoryInvoices';

class InventoryModules extends Component {
    render() {
        const activeTab = this.props.activeTab || this.props.initialTab || 'store';

        return (
            <>
                {/* Tab Content - all tabs stay mounted so SSE connections persist */}
                <div style={{ display: activeTab === 'store' ? 'block' : 'none' }}>
                    <InventoryStore 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                    />
                </div>
                <div style={{ display: activeTab === 'form' ? 'block' : 'none' }}>
                    <InventoryForm 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                    />
                </div>
                <div style={{ display: activeTab === 'records' ? 'block' : 'none' }}>
                    <InventoryRecords 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                    />
                </div>
                <div style={{ display: activeTab === 'invoices' ? 'block' : 'none' }}>
                    <InventoryInvoices 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                    />
                </div>
            </>
        );
    }
}

export default InventoryModules;
