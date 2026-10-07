import React, { Component } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import ProductSummaryCards from '../sub/ProductSummaryCards';
import StockAdjustmentModal from '../modal/StockAdjustmentModal';
import StockFilter from '../searchFilter/StockFilter';
import { stockColumnDefs } from '../inventoryColumnDefs';
import { exportStockToExcel, handleIncomingSubmit } from '../inventoryServiceHelpers';
import { 
    generateProductSummaryCards 
} from '../searchFilter/StockFilterUtils';
import { parseInvoiceFields } from '../invoiceExtraction';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

import { parseDateFilter } from '../searchFilter/StockFilterUtils';

class StockRecords extends Component {
    constructor(props) {
        super(props);
        this.stockGridApi = null;
        this.invoiceExtractionRun = 0;

        this.state = {
            // Stock Adjustment modal
            showIncomingModal: false,
            isSubmitting: false,
            isExtractingInvoice: false,
            invoiceExtractionMessage: '',
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
        this.invoiceExtractionRun += 1;
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].substring(0, 5);
        this.setState({
            showIncomingModal: true,
            isExtractingInvoice: false,
            invoiceExtractionMessage: '',
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
        this.invoiceExtractionRun += 1;
        this.setState({ 
            showIncomingModal: false,
            isExtractingInvoice: false,
            invoiceExtractionMessage: ''
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
        this.invoiceExtractionRun += 1;
        if (file) {
            this.extractPdfData(file, this.invoiceExtractionRun);
        } else {
            this.setState({
                isExtractingInvoice: false,
                invoiceExtractionMessage: ''
            });
        }
    };

    recognizeInvoiceText = async (file, pdf = null, runId) => {
        const worker = await createWorker('eng');
        const allItems = [];
        const textPages = [];

        try {
            const pageCount = pdf ? pdf.numPages : 1;
            for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
                if (runId !== this.invoiceExtractionRun) return { fullText: '', allItems: [] };

                let source = file;
                if (pdf) {
                    const page = await pdf.getPage(pageNumber);
                    const viewport = page.getViewport({ scale: 2 });
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.ceil(viewport.width);
                    canvas.height = Math.ceil(viewport.height);
                    const context = canvas.getContext('2d');
                    if (!context) {
                        throw new Error('Could not create a canvas to read the scanned invoice.');
                    }
                    await page.render({ canvasContext: context, viewport }).promise;
                    source = canvas;
                }

                const { data } = await worker.recognize(source, {}, { tsv: true });
                textPages.push(data.text);
                data.tsv.split(/\r?\n/).slice(1).forEach(line => {
                    const columns = line.split('\t');
                    if (columns[0] === '5' && columns.length >= 12 && columns[11].trim()) {
                        allItems.push({
                            str: columns.slice(11).join('\t').trim(),
                            x: Number(columns[6]),
                            y: -Number(columns[7]),
                            page: pageNumber
                        });
                    }
                });
            }
        } finally {
            await worker.terminate();
        }

        return { fullText: textPages.join('\n'), allItems };
    };

    extractPdfData = async (file, runId) => {
        this.setState({ isExtractingInvoice: true, invoiceExtractionMessage: '' });

        if (!file) {
            if (runId === this.invoiceExtractionRun) {
                this.setState({ isExtractingInvoice: false });
            }
            return;
        }

        try {
            const extension = file.name.split('.').pop().toLowerCase();
            const supportedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx'];
            if (!supportedExtensions.includes(extension)) {
                this.setState({ invoiceExtractionMessage: 'This file type is not supported for invoice extraction.' });
                return;
            }

            let fullText = '';
            let allItems = [];
            let pdf = null;

            if (extension === 'pdf') {
                const arrayBuffer = await file.arrayBuffer();
                pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                    const page = await pdf.getPage(pageNumber);
                    const textContent = await page.getTextContent();
                    textContent.items.forEach(item => {
                        if (item.str && item.str.trim()) {
                            allItems.push({
                                str: item.str.trim(),
                                x: Math.round(item.transform[4]),
                                y: Math.round(item.transform[5]),
                                page: pageNumber
                            });
                        }
                    });
                    fullText += `${textContent.items.map(item => item.str).join(' ')}\n`;
                }
            } else if (['png', 'jpg', 'jpeg'].includes(extension)) {
                ({ fullText, allItems } = await this.recognizeInvoiceText(file, null, runId));
            } else if (extension === 'docx') {
                const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
                fullText = value;
            } else if (['xls', 'xlsx'].includes(extension)) {
                const workbook = XLSX.read(await file.arrayBuffer(), {
                    type: 'array',
                    cellDates: true,
                    dateNF: 'yyyy-mm-dd'
                });
                fullText = workbook.SheetNames
                    .map(name => XLSX.utils.sheet_to_csv(workbook.Sheets[name], {
                        FS: ' ',
                        RS: '\n',
                        dateNF: 'yyyy-mm-dd'
                    }))
                    .join('\n');
            } else if (extension === 'doc') {
                const formData = new FormData();
                formData.append('file', file);
                const backendUrl = window.location.hostname === 'localhost'
                    ? 'http://localhost:3001'
                    : 'https://ecss-backend-node.azurewebsites.net';
                const response = await axios.post(`${backendUrl}/inventory/extractLegacyWordText`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                fullText = response.data.text || '';
            }

            if (runId !== this.invoiceExtractionRun) return;

            let extracted = parseInvoiceFields(fullText, allItems);
            if (extension === 'pdf' && (!extracted.date || !extracted.time || !extracted.quantity)) {
                const ocrResult = await this.recognizeInvoiceText(file, pdf, runId);
                if (runId !== this.invoiceExtractionRun) return;
                const ocrFields = parseInvoiceFields(ocrResult.fullText, ocrResult.allItems);
                extracted = {
                    date: extracted.date || ocrFields.date,
                    time: extracted.time || ocrFields.time,
                    quantity: extracted.quantity || ocrFields.quantity
                };
            }

            if (runId !== this.invoiceExtractionRun) return;
            const fileDate = new Date(file.lastModified);
            const extractedDate = extracted.date || fileDate.toISOString().split('T')[0];
            const extractedTime = extracted.time || fileDate.toTimeString().split(' ')[0].substring(0, 5);
            this.handleIncomingFormChange('date', extractedDate);
            this.handleIncomingFormChange('time', extractedTime);
            if (extracted.quantity) this.handleIncomingFormChange('quantity', extracted.quantity);

            const missingFields = [
                !extracted.date && 'Date',
                !extracted.time && 'Time',
                !extracted.quantity && 'Quantity'
            ].filter(Boolean);
            this.setState({
                invoiceExtractionMessage: missingFields.length
                    ? `Check the ${missingFields.join(', ')} field${missingFields.length > 1 ? 's' : ''}; automatic extraction may be incomplete.`
                    : 'Date, time, and quantity extracted. Please verify the values before submitting.'
            });
        } catch (error) {
            if (runId !== this.invoiceExtractionRun) return;
            console.error('Error extracting PDF data:', error);
            this.setState({
                invoiceExtractionMessage: 'Could not read this invoice automatically. Enter Date, Time, and Quantity manually.'
            });
        } finally {
            if (runId === this.invoiceExtractionRun) {
                this.setState({ isExtractingInvoice: false });
            }
        }
    };

    handleIncomingSubmit = async (e) => {
        e.preventDefault();
        const { incomingForm, uploadedFile } = this.state;

        this.setState({ isSubmitting: true });

        const onSuccess = async () => {
            console.log("[DEBUG] Stock adjustment successful, refreshing dashboard...");
            if (this.props.onStockAdjustmentSubmit) {
                await this.props.onStockAdjustmentSubmit();
                console.log("[DEBUG] Dashboard refresh complete; closing modal after the card data has been refreshed.");
            }
            if (this.props.showSuccessPopup) {
                this.props.showSuccessPopup('Stock adjustment saved successfully.');
            }
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

    // Called after a Sales row is successfully confirmed, so the cards (Balance/Sold
    // and the pending bracket) refresh with fresh data from the server instead of
    // only updating the grid cell.
    handleConfirmed = async () => {
        if (this.props.onConfirmed) {
            await this.props.onConfirmed();
        }
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
            cardFilterDateTo,
            isExtractingInvoice,
            invoiceExtractionMessage
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
                                paginationPageSize={this.getFilteredStockRecords().length}
                                paginationPageSizeSelector={[25, 50, 100, 200, this.getFilteredStockRecords().length]}
                                domLayout="normal"
                                onGridReady={this.onStockGridReady}
                                headerHeight={40}
                                rowHeight={36}
                                context={{
                                    onConfirmed: this.handleConfirmed,
                                    showSuccessPopup: this.props.showSuccessPopup,
                                    showErrorPopup: this.props.showErrorPopup
                                }}
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
                    isExtractingInvoice={isExtractingInvoice}
                    invoiceExtractionMessage={invoiceExtractionMessage}
                />
            </>
        );
    }
}

export default StockRecords;
