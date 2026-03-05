import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as pdfjsLib from 'pdfjs-dist';
import ProductSummaryCards from '../sub/ProductSummaryCards';
import StockAdjustmentModal from '../modal/StockAdjustmentModal';
import StockFilter from '../searchFilter/StockFilter';
import { stockColumnDefs } from '../inventoryColumnDefs';
import { exportStockToExcel, handleIncomingSubmit } from '../inventoryServiceHelpers';
import { 
    generateProductSummaryCards 
} from '../searchFilter/StockFilterUtils';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

import { parseDateFilter } from '../searchFilter/StockFilterUtils';

class StockRecords extends Component {
    constructor(props) {
        super(props);
        this.stockGridApi = null;

        this.state = {
            // Stock Adjustment modal
            showIncomingModal: false,
            isSubmitting: false,
            incomingForm: {
                action: '',
                product: '',
                locationFrom: '',
                locationTo: '',
                date: '',
                time: '',
                quantity: '',
                reason: '',
                updatedBy: props.userName || '',
                variant: ''
            },
            toolbarReady: false,  // Show toolbar after cards render
            // Stock filter state (passed from StockFilter component)
            cardFilterProduct: '',
            cardFilterLocation: '',
            cardFilterDateFrom: '',
            cardFilterDateTo: ''
        };
    }

    columnDefs = stockColumnDefs;

    componentDidMount() {
        // Show toolbar asynchronously after cards render
        setTimeout(() => {
            this.setState({ toolbarReady: true });
        }, 300);
    }

    /**
     * Return a filtered subset of stockRecords based on the card filter state.
     * This mirrors the behaviour used for the summary cards so that the table
     * and export button respect the same criteria.
     */
    getFilteredStockRecords = () => {
        const { stockRecords = [] } = this.props;
        const {
            cardFilterProduct,
            cardFilterLocation,
            cardFilterDateFrom,
            cardFilterDateTo
        } = this.state;

        let filtered = stockRecords;

        if (cardFilterProduct) {
            const prodLower = cardFilterProduct.toLowerCase();
            filtered = filtered.filter(r => (r.product || '').toLowerCase().includes(prodLower));
        }
        if (cardFilterLocation) {
            const locLower = cardFilterLocation.toLowerCase();
            filtered = filtered.filter(r => {
                const from = (r.locationFrom || r.location || '').toLowerCase();
                const to = (r.locationTo || '').toLowerCase();
                return from.includes(locLower) || to.includes(locLower);
            });
        }
        if (cardFilterDateFrom) {
            const fromDate = parseDateFilter(cardFilterDateFrom);
            filtered = filtered.filter(r => {
                const d = r.date || r.orderDate || '';
                return !d || d >= fromDate;
            });
        }
        if (cardFilterDateTo) {
            const toDate = parseDateFilter(cardFilterDateTo);
            filtered = filtered.filter(r => {
                const d = r.date || r.orderDate || '';
                return !d || d <= toDate;
            });
        }
        return filtered;
    };

    componentWillUnmount() {
        // Cleanup if needed
    }

    handleFilterChange = (filterState) => {
        this.setState({
            cardFilterProduct: filterState.cardFilterProduct,
            cardFilterLocation: filterState.cardFilterLocation,
            cardFilterDateFrom: filterState.cardFilterDateFrom,
            cardFilterDateTo: filterState.cardFilterDateTo
        });
    };

    getProductSummaryCards = () => {
        const { inventoryProducts, stockRecords } = this.props;
        const { cardFilterProduct, cardFilterLocation, cardFilterDateFrom, cardFilterDateTo } = this.state;
        
        const cards = generateProductSummaryCards(
            inventoryProducts,
            stockRecords,
            {
                cardFilterProduct,
                cardFilterLocation,
                cardFilterDateFrom,
                cardFilterDateTo
            }
        );
        
        return cards;
    };

    openIncomingModal = () => {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].substring(0, 5);
        this.setState({
            showIncomingModal: true,
            incomingForm: {
                action: '',
                product: '',
                locationFrom: '',
                locationTo: '',
                date,
                time,
                quantity: '',
                reason: '',
                updatedBy: this.props.userName || '',
                variant: ''
            }
        });
    };

    closeIncomingModal = () => {
        this.setState({ 
            showIncomingModal: false
        });
    };

    handleIncomingFormChange = (field, value) => {
        this.setState(prevState => ({
            incomingForm: {
                ...prevState.incomingForm,
                [field]: value
            }
        }));
    };

    selectProduct = (name) => {
        this.handleIncomingFormChange('product', name);
        this.handleIncomingFormChange('variant', '');
        this.setState({ productDropdownOpen: false });
    };

    handleActionSelect = (opt) => {
        this.handleIncomingFormChange('action', opt);
        this.handleIncomingFormChange('reason', '');
        this.handleIncomingFormChange('variant', '');
    };

    handleFileSelected = (file) => {
        this.extractPdfData(file);
    };

    extractPdfData = async (file) => {
        if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
            const fileDate = new Date(file.lastModified);
            const date = fileDate.toISOString().split('T')[0];
            const time = fileDate.toTimeString().split(' ')[0].substring(0, 5);
            this.handleIncomingFormChange('date', date);
            this.handleIncomingFormChange('time', time);
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let allItems = [];
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                textContent.items.forEach(item => {
                    if (item.str && item.str.trim()) {
                        allItems.push({
                            str: item.str.trim(),
                            x: Math.round(item.transform[4]),
                            y: Math.round(item.transform[5]),
                            page: i
                        });
                    }
                });
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }

            const monthMap = {
                jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
                january: '01', february: '02', march: '03', april: '04',
                june: '06', july: '07', august: '08', september: '09',
                october: '10', november: '11', december: '12'
            };

            const resolveYear = (y) => {
                const s = y.replace(/\D/g, '');
                if (s.length === 4) return s;
                const num = parseInt(s);
                return num >= 0 && num <= 49 ? `20${s.padStart(2, '0')}` : `19${s}`;
            };

            const tryParseDate = (text) => {
                let m = text.match(/(\d{1,2})[\s\-\/\.](Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s\-\/\.,]*(\d{2,4})/i);
                if (m) {
                    const mon = monthMap[m[2].toLowerCase().substring(0, 3)];
                    return `${resolveYear(m[3])}-${mon}-${m[1].padStart(2, '0')}`;
                }
                m = text.match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})[,\s]+(\d{2,4})/i);
                if (m) {
                    const mon = monthMap[m[1].toLowerCase().substring(0, 3)];
                    return `${resolveYear(m[3])}-${mon}-${m[2].padStart(2, '0')}`;
                }
                m = text.match(/(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/);
                if (m) {
                    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
                }
                m = text.match(/(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})/);
                if (m) {
                    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
                }
                m = text.match(/(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{2})(?!\d)/);
                if (m) {
                    return `${resolveYear(m[3])}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
                }
                return null;
            };

            let extractedDate = '';
            const dateLabelPatterns = [
                /(?:invoice\s*date|inv\.?\s*date|inv\s*dt|bill\s*date|order\s*date|po\s*date|purchase\s*date|delivery\s*date|do\s*date|doc(?:ument)?\s*date|issued?\s*(?:on|date)|dated?)\s*[:\-\s]\s*(.+)/gi
            ];

            for (const pattern of dateLabelPatterns) {
                let labelMatch;
                pattern.lastIndex = 0;
                while ((labelMatch = pattern.exec(fullText)) !== null) {
                    const candidate = labelMatch[1].substring(0, 30).trim();
                    const parsed = tryParseDate(candidate);
                    if (parsed) {
                        extractedDate = parsed;
                        break;
                    }
                }
                if (extractedDate) break;
            }

            if (!extractedDate) {
                const monthNameDate = fullText.match(/\b(\d{1,2})[\s\-\/\.](Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s\-\/\.,]*(\d{2,4})\b/i);
                if (monthNameDate) {
                    extractedDate = tryParseDate(monthNameDate[0]);
                }
            }
            if (!extractedDate) {
                const monthFirstDate = fullText.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})[,\s]+(\d{2,4})\b/i);
                if (monthFirstDate) {
                    extractedDate = tryParseDate(monthFirstDate[0]);
                }
            }
            if (!extractedDate) {
                const isoDate = fullText.match(/\b(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})\b/);
                if (isoDate) {
                    extractedDate = tryParseDate(isoDate[0]);
                }
            }
            if (!extractedDate) {
                const numDate = fullText.match(/\b(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{2,4})\b/);
                if (numDate) {
                    extractedDate = tryParseDate(numDate[0]);
                }
            }

            let extractedTime = '';
            const timeLabelMatch = fullText.match(/(?:time|created\s*at|issued\s*at)\s*[:\-]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i);
            const generalTimeMatch = fullText.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?\b/);
            const timeMatch = timeLabelMatch || generalTimeMatch;
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2];
                const ampm = timeMatch[4];
                if (ampm) {
                    if (ampm.toLowerCase() === 'pm' && hours < 12) hours += 12;
                    if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
                }
                extractedTime = `${String(hours).padStart(2, '0')}:${minutes}`;
            }

            let extractedQuantity = '';
            const qtyHeaderItem = allItems.find(item =>
                /^(qty\.?|quantity|qty:|quantity:)$/i.test(item.str.replace(/\s/g, ''))
            );

            if (qtyHeaderItem) {
                const tolerance = 50;
                const candidates = allItems.filter(item =>
                    item.page === qtyHeaderItem.page &&
                    Math.abs(item.x - qtyHeaderItem.x) < tolerance &&
                    item.y < qtyHeaderItem.y &&
                    /^\d+$/.test(item.str.replace(/,/g, ''))
                ).sort((a, b) => b.y - a.y);

                if (candidates.length > 0) {
                    extractedQuantity = candidates[0].str.replace(/,/g, '');
                }
            }

            if (!extractedQuantity) {
                const qtyPatterns = [
                    /(?:qty|quantity|qty\.|qty:|quantity:|total\s*qty|total\s*quantity)\s*[:\s]*(\d[\d,]*)/i,
                    /\b(\d[\d,]*)\s*(?:pcs|units?|pieces?|items?|nos?|ea|sets?|boxes?|cartons?|rolls?|btls?|bottles?|bags?|packs?|pairs?)\b/i,
                    /\bx\s*(\d[\d,]*)\b/i,
                    /\b(\d{1,5})\s*x\b/i,
                ];
                for (const pattern of qtyPatterns) {
                    const match = fullText.match(pattern);
                    if (match) {
                        extractedQuantity = match[1].replace(/,/g, '');
                        break;
                    }
                }
            }

            if (!extractedQuantity && qtyHeaderItem) {
                const nearbyNums = allItems.filter(item =>
                    item.page === qtyHeaderItem.page &&
                    Math.abs(item.y - qtyHeaderItem.y) < 30 &&
                    item.x !== qtyHeaderItem.x &&
                    /^\d+$/.test(item.str.replace(/,/g, ''))
                );
                if (nearbyNums.length > 0) {
                    extractedQuantity = nearbyNums[0].str.replace(/,/g, '');
                }
            }

            if (extractedDate) {
                this.handleIncomingFormChange('date', extractedDate);
            } else {
                const fileDate = new Date(file.lastModified);
                this.handleIncomingFormChange('date', fileDate.toISOString().split('T')[0]);
            }

            if (extractedTime) {
                this.handleIncomingFormChange('time', extractedTime);
            } else {
                const fileDate = new Date(file.lastModified);
                this.handleIncomingFormChange('time', fileDate.toTimeString().split(' ')[0].substring(0, 5));
            }

            if (extractedQuantity) {
                this.handleIncomingFormChange('quantity', extractedQuantity);
            }

        } catch (error) {
            console.error('Error extracting PDF data:', error);
            const fileDate = new Date(file.lastModified);
            const date = fileDate.toISOString().split('T')[0];
            const time = fileDate.toTimeString().split(' ')[0].substring(0, 5);
            this.handleIncomingFormChange('date', date);
            this.handleIncomingFormChange('time', time);
        }
    };

    handleIncomingSubmit = async (e) => {
        e.preventDefault();
        const { incomingForm, uploadedFile } = this.state;

        this.setState({ isSubmitting: true });

        const onSuccess = async () => {
            // Wait for parent to refresh data before closing modal
            console.log("[DEBUG] Stock adjustment successful, refreshing dashboard...");
            if (this.props.onStockAdjustmentSubmit) {
                await this.props.onStockAdjustmentSubmit();
                console.log("[DEBUG] Dashboard refresh complete, waiting for UI update...");
                // Additional wait to ensure UI has time to render the updated data
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            // Close modal only after data refresh is complete and UI is updated
            this.closeIncomingModal();
            this.setState({ isSubmitting: false });
        };

        const onError = (error) => {
            console.error("[ERROR] Stock adjustment failed:", error);
            this.setState({ isSubmitting: false });
        };

        await handleIncomingSubmit(incomingForm, uploadedFile, onSuccess, onError);
    };

    onStockGridReady = (params) => {
        this.stockGridApi = params.api;
    };

    render() {
        const {
            toolbarReady: toolbarReadyState,
            showIncomingModal,
            isSubmitting,
            incomingForm,
            cardFilterProduct,
            cardFilterLocation,
            cardFilterDateFrom,
            cardFilterDateTo
        } = this.state;
        const { stockRecords, isLoading, isRestricted, role, inventoryProducts } = this.props;

        return (
            <>
                {/* Product Summary Cards */}
                <div className="inventory-content">
                    {/* Stock Filter Component */}
                    <StockFilter
                        inventoryProducts={this.props.inventoryProducts || []}
                        cardFilterProduct={cardFilterProduct}
                        cardFilterLocation={cardFilterLocation}
                        cardFilterDateFrom={cardFilterDateFrom}
                        cardFilterDateTo={cardFilterDateTo}
                        onFilterChange={this.handleFilterChange}
                    />

                    <ProductSummaryCards
                        cards={this.getProductSummaryCards()}
                        isLoading={isLoading}
                    />

                    {toolbarReadyState && (
                        <div className="stock-records-toolbar" style={{ animation: 'fadeIn 0.3s ease-in', marginTop: '24px' }}>
                            {!isRestricted && (
                                <button className="stock-incoming-btn" onClick={this.openIncomingModal}>
                                    Stock Adjustment
                                </button>
                            )}
                            {this.getFilteredStockRecords().length > 0 && (
                                <button className="stock-export-btn" onClick={() => exportStockToExcel(this.getFilteredStockRecords())}>
                                    Export
                                </button>
                            )}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="inventory-loading">
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Loading records...</p>
                        </div>
                    ) : stockRecords.length === 0 ? (
                        <div className="inventory-empty-state">
                            <i className="fas fa-clipboard-list"></i>
                            <h3>No Records Found</h3>
                            <p>No stock records have been recorded yet.</p>
                        </div>
                    ) : (
                        <div className="inventory-records-grid-container ag-theme-inventory" style={{ height: '500px', width: '100%' }}>
                            <AgGridReact
                                columnDefs={this.columnDefs}
                                rowData={this.getFilteredStockRecords()}
                                pagination={true}
                                paginationPageSize={50}
                                paginationPageSizeSelector={[25, 50, 100, 200]}
                                domLayout="normal"
                                onGridReady={this.onStockGridReady}
                                headerHeight={40}
                                rowHeight={36}
                            />
                        </div>
                    )}
                </div>

                {/* Stock Adjustment Modal */}
                <StockAdjustmentModal
                    isOpen={showIncomingModal}
                    onClose={this.closeIncomingModal}
                    onSubmit={this.handleIncomingSubmit}
                    formData={incomingForm}
                    onFormChange={this.handleIncomingFormChange}
                    isSubmitting={isSubmitting}
                    inventoryProducts={inventoryProducts}
                    onFileSelected={this.handleFileSelected}
                />
            </>
        );
    }
}

export default StockRecords;
