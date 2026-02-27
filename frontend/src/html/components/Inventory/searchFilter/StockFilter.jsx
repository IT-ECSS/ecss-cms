import React, { Component } from 'react';
import { getFilterProductOptions, getFilterLocationOptions } from './StockFilterUtils';

/**
 * StockFilter Component
 * Handles search and filtering for stock records
 */
class StockFilter extends Component {
    constructor(props) {
        super(props);
        
        this.filterProductDropdownRef = React.createRef();
        this.filterLocationDropdownRef = React.createRef();

        this.state = {
            cardFilterProduct: props.cardFilterProduct || '',
            cardFilterLocation: props.cardFilterLocation || '',
            cardFilterDateFrom: props.cardFilterDateFrom || '',
            cardFilterDateTo: props.cardFilterDateTo || '',
            filterProductDropdownOpen: false,
            filterLocationDropdownOpen: false
        };
    }

    componentDidMount() {
        document.addEventListener('mousedown', this.handleDocumentClick);
    }

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleDocumentClick);
    }

    handleDocumentClick = (e) => {
        if (this.filterProductDropdownRef.current && !this.filterProductDropdownRef.current.contains(e.target)) {
            this.setState({ filterProductDropdownOpen: false });
        }
        if (this.filterLocationDropdownRef.current && !this.filterLocationDropdownRef.current.contains(e.target)) {
            this.setState({ filterLocationDropdownOpen: false });
        }
    };

    selectFilterProduct = (name) => {
        this.setState({ 
            cardFilterProduct: name, 
            filterProductDropdownOpen: false 
        });
        if (this.props.onFilterChange) {
            this.props.onFilterChange({
                cardFilterProduct: name,
                cardFilterLocation: this.state.cardFilterLocation,
                cardFilterDateFrom: this.state.cardFilterDateFrom,
                cardFilterDateTo: this.state.cardFilterDateTo
            });
        }
    };

    selectFilterLocation = (loc) => {
        this.setState({ 
            cardFilterLocation: loc, 
            filterLocationDropdownOpen: false 
        });
        if (this.props.onFilterChange) {
            this.props.onFilterChange({
                cardFilterProduct: this.state.cardFilterProduct,
                cardFilterLocation: loc,
                cardFilterDateFrom: this.state.cardFilterDateFrom,
                cardFilterDateTo: this.state.cardFilterDateTo
            });
        }
    };

    handleProductInputChange = (value) => {
        this.setState({ 
            cardFilterProduct: value, 
            filterProductDropdownOpen: true 
        });
        if (this.props.onFilterChange) {
            this.props.onFilterChange({
                cardFilterProduct: value,
                cardFilterLocation: this.state.cardFilterLocation,
                cardFilterDateFrom: this.state.cardFilterDateFrom,
                cardFilterDateTo: this.state.cardFilterDateTo
            });
        }
    };

    handleLocationInputChange = (value) => {
        this.setState({ 
            cardFilterLocation: value, 
            filterLocationDropdownOpen: true 
        });
        if (this.props.onFilterChange) {
            this.props.onFilterChange({
                cardFilterProduct: this.state.cardFilterProduct,
                cardFilterLocation: value,
                cardFilterDateFrom: this.state.cardFilterDateFrom,
                cardFilterDateTo: this.state.cardFilterDateTo
            });
        }
    };

    handleDateFromChange = (value) => {
        this.setState({ cardFilterDateFrom: value });
        if (this.props.onFilterChange) {
            this.props.onFilterChange({
                cardFilterProduct: this.state.cardFilterProduct,
                cardFilterLocation: this.state.cardFilterLocation,
                cardFilterDateFrom: value,
                cardFilterDateTo: this.state.cardFilterDateTo
            });
        }
    };

    handleDateToChange = (value) => {
        this.setState({ cardFilterDateTo: value });
        if (this.props.onFilterChange) {
            this.props.onFilterChange({
                cardFilterProduct: this.state.cardFilterProduct,
                cardFilterLocation: this.state.cardFilterLocation,
                cardFilterDateFrom: this.state.cardFilterDateFrom,
                cardFilterDateTo: value
            });
        }
    };

    render() {
        const {
            cardFilterProduct,
            cardFilterLocation,
            cardFilterDateFrom,
            cardFilterDateTo,
            filterProductDropdownOpen,
            filterLocationDropdownOpen
        } = this.state;
        
        const { inventoryProducts } = this.props;

        return (
            <div className="stock-filter-bar">
                <div className="stock-filter-row">
                    <div className="stock-filter-field">
                        <label>Product</label>
                        <div className="stock-filter-dropdown" ref={this.filterProductDropdownRef}>
                            <input
                                type="text"
                                placeholder="Search product..."
                                value={cardFilterProduct}
                                onChange={e => this.handleProductInputChange(e.target.value)}
                                onFocus={() => this.setState({ filterProductDropdownOpen: true })}
                            />
                            {filterProductDropdownOpen && getFilterProductOptions(cardFilterProduct, inventoryProducts).length > 0 && (
                                <ul className="stock-filter-dropdown-list">
                                    {getFilterProductOptions(cardFilterProduct, inventoryProducts).map((name, idx) => (
                                        <li key={idx} className="stock-filter-dropdown-item" onClick={() => this.selectFilterProduct(name)}>
                                            {name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="stock-filter-field">
                        <label>Location</label>
                        <div className="stock-filter-dropdown" ref={this.filterLocationDropdownRef}>
                            <input
                                type="text"
                                placeholder="Search location..."
                                value={cardFilterLocation}
                                onChange={e => this.handleLocationInputChange(e.target.value)}
                                onFocus={() => this.setState({ filterLocationDropdownOpen: true })}
                            />
                            {filterLocationDropdownOpen && getFilterLocationOptions(cardFilterLocation, inventoryProducts).length > 0 && (
                                <ul className="stock-filter-dropdown-list">
                                    {getFilterLocationOptions(cardFilterLocation, inventoryProducts).map((loc, idx) => (
                                        <li key={idx} className="stock-filter-dropdown-item" onClick={() => this.selectFilterLocation(loc)}>
                                            {loc}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="stock-filter-field">
                        <label>Date From</label>
                        <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            value={cardFilterDateFrom}
                            onChange={e => this.handleDateFromChange(e.target.value)}
                        />
                    </div>
                    <div className="stock-filter-field">
                        <label>Date To</label>
                        <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            value={cardFilterDateTo}
                            onChange={e => this.handleDateToChange(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default StockFilter;
