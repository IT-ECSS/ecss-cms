import React, { Component } from 'react';
import '../../../css/sub/inventoryModules.css';
import InventoryStore from './InventoryStore';
import InventoryForm from './InventoryForm';
import InventoryRecords from './InventoryRecords';

class InventoryModules extends Component {
    render() {
        const activeTab = this.props.activeTab || this.props.initialTab || 'store';

        return (
            <>
                {/* Tab Content */}
                {activeTab === 'store' && (
                    <InventoryStore 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                    />
                )}
                {activeTab === 'form' && (
                    <InventoryForm 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                    />
                )}
                {activeTab === 'records' && (
                    <InventoryRecords 
                        userName={this.props.userName}
                        role={this.props.role}
                        siteIC={this.props.siteIC}
                        language={this.props.language}
                    />
                )}
            </>
        );
    }
}

export default InventoryModules;
