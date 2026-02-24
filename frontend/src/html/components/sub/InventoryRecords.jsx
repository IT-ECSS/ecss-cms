import React, { Component } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { io } from 'socket.io-client';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import '../../../css/sub/inventoryModules.css';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const STOCK_IN_ACTIONS = ['Purchase From Supplier', 'Allocation To Site', 'Return Stock to Store'];
const STOCK_OUT_ACTIONS = ['Return to Supplier'];
// Grouped pairs: Purchase/Return to Supplier, Allocation/Return Stock to Store
const ALL_STOCK_ACTIONS = [
    { label: 'Purchase From Supplier', group: 'Supplier' },
    { label: 'Return to Supplier', group: 'Supplier' },
    { type: 'divider' },
    { label: 'Allocation To Site', group: 'Stock' },
    { label: 'Return Stock to Store', group: 'Stock' },
];

class InventoryRecords extends Component {
    constructor(props) {
        super(props);
        const restrictedRoles = ['Site in-charge', 'NSA in-charge', 'Fitness Trainer'];
        const isRestricted = restrictedRoles.includes(props.role);
        this.state = {
            activeTab: isRestricted ? 'orders' : 'stock', // 'stock' or 'orders'
            records: [],
            stockRecords: [],
            isLoading: true,
            error: null,
            // Stock Adjustment modal
            showIncomingModal: false,
            isSubmitting: false,
            inventoryProducts: [],
            productDropdownOpen: false,
            locationDropdownOpen: false,
            actionDropdownOpen: false,
            reasonDropdownOpen: false,
            variantDropdownOpen: false,
            incomingForm: {
                action: '',
                product: '',
                location: '',
                date: '',
                time: '',
                quantity: '',
                reason: '',
                updatedBy: '',
                variant: ''
            },
            uploadedFile: null,
            isDragging: false,
            selectedProduct: null,
            showCards: false,
            toolbarReady: false,
            // Filters for cards
            cardFilterProduct: '',
            cardFilterLocation: '',
            cardFilterDateFrom: '',
            cardFilterDateTo: '',
            filterProductDropdownOpen: false,
            filterLocationDropdownOpen: false,
            // Order Records filters
            orderFilterProduct: '',
            orderFilterLocation: '',
            orderFilterDateFrom: '',
            orderFilterDateTo: '',
            orderFilterProductDropdownOpen: false,
            orderFilterLocationDropdownOpen: false
        };
        this.gridApi = null;
        this.gridColumnApi = null;
        this.stockGridApi = null;
        this.productDropdownRef = React.createRef();
        this.locationFromDropdownRef = React.createRef();
        this.locationToDropdownRef = React.createRef();
        this.actionDropdownRef = React.createRef();
        this.reasonDropdownRef = React.createRef();
        this.variantDropdownRef = React.createRef();
        this.filterProductDropdownRef = React.createRef();
        this.filterLocationDropdownRef = React.createRef();
        this.orderFilterProductDropdownRef = React.createRef();
        this.orderFilterLocationDropdownRef = React.createRef();
        this.socket = null;
    }

    async componentDidMount() {
        console.log("InventoryRecords - componentDidMount called");
        document.addEventListener('mousedown', this.handleDocumentClick);
        await Promise.all([
            this.fetchInventoryRecords(),
            this.fetchStockRecords(),
            this.fetchInventoryProducts()
        ]);

        // Show toolbar asynchronously after cards render
        setTimeout(() => this.setState({ toolbarReady: true }), 300);
        
        // --- Live update via Socket.IO ---
        this.socket = io(
            window.location.hostname === "localhost"
                ? "http://localhost:3001"
                : "https://ecss-backend-node.azurewebsites.net"
        );
        this.socket.on('inventory', (data) => {
            console.log("Socket inventory event received", data);
            this.fetchInventoryRecords();
            this.fetchStockRecords();
            this.fetchInventoryProducts();
        });
    }

    fetchInventoryRecords = async () => {
        try {
            this.setState({ isLoading: true, error: null });

            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, { purpose: "retrieve" });

            console.log('Inventory records fetched:', response.data);

            if (response.data.success) {
                const allRecords = response.data.records || [];
                // Order records = Sales entries only
                const orderRecords = allRecords.filter(r => r.action === 'Sales');
                this.setState({
                    records: orderRecords,
                    isLoading: false
                });
            } else {
                this.setState({
                    error: response.data.error || 'Failed to fetch inventory records',
                    isLoading: false
                });
            }
        } catch (error) {
            console.error('Error fetching inventory records:', error);
            this.setState({
                error: error.message || 'An error occurred while fetching inventory records',
                isLoading: false
            });
        }
    };

    fetchInventoryProducts = async () => {
        try {
            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";

            const response = await axios.get(`${baseUrl}/inventory_product_details/`);

            if (response.data.success) {
                this.setState({
                    inventoryProducts: response.data.inventory_products || []
                });
            }
        } catch (error) {
            console.error('Error fetching inventory products:', error);
        }
    };

    fetchStockRecords = async () => {
        try {
            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, { purpose: "retrieveStock" });

            if (response.data.success) {
                this.setState({
                    stockRecords: response.data.records || []
                });
            }
        } catch (error) {
            console.error('Error fetching stock records:', error);
        }
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
        this.setState({ showIncomingModal: false, productDropdownOpen: false, locationFromDropdownOpen: false, locationToDropdownOpen: false, actionDropdownOpen: false, reasonDropdownOpen: false, variantDropdownOpen: false, uploadedFile: null, isDragging: false });
    };

    handleFileDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ isDragging: false });
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            this.setState({ uploadedFile: file });
            this.extractPdfData(file);
        }
    };

    handleFileSelect = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            this.setState({ uploadedFile: file });
            this.extractPdfData(file);
        }
    };

    extractPdfData = async (file) => {
        if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
            // Non-PDF: fallback to file's last modified date
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

            // ── Extract text with position info for table-aware parsing ──
            let allItems = []; // { str, x, y, page }
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

            console.log('Extracted PDF text:', fullText);
            console.log('Positioned items:', allItems.length);

            const monthMap = {
                jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
                january: '01', february: '02', march: '03', april: '04',
                june: '06', july: '07', august: '08', september: '09',
                october: '10', november: '11', december: '12'
            };

            // Helper to resolve 2-digit year to 4-digit
            const resolveYear = (y) => {
                const s = y.replace(/\D/g, '');
                if (s.length === 4) return s;
                const num = parseInt(s);
                return num >= 0 && num <= 49 ? `20${s.padStart(2, '0')}` : `19${s}`;
            };

            // ── DATE EXTRACTION ──
            // Try to parse any date string into YYYY-MM-DD
            const tryParseDate = (text) => {
                // DD-Mon-YY / DD-Mon-YYYY / DD Mon YY / DD Mon YYYY
                let m = text.match(/(\d{1,2})[\s\-\/\.](Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s\-\/\.,]*(\d{2,4})/i);
                if (m) {
                    const mon = monthMap[m[2].toLowerCase().substring(0, 3)];
                    return `${resolveYear(m[3])}-${mon}-${m[1].padStart(2, '0')}`;
                }
                // Mon DD, YYYY / Month DD YYYY
                m = text.match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})[,\s]+(\d{2,4})/i);
                if (m) {
                    const mon = monthMap[m[1].toLowerCase().substring(0, 3)];
                    return `${resolveYear(m[3])}-${mon}-${m[2].padStart(2, '0')}`;
                }
                // YYYY-MM-DD or YYYY/MM/DD
                m = text.match(/(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/);
                if (m) {
                    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
                }
                // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
                m = text.match(/(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})/);
                if (m) {
                    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
                }
                // DD/MM/YY or DD-MM-YY or DD.MM.YY (2-digit year)
                m = text.match(/(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{2})(?!\d)/);
                if (m) {
                    return `${resolveYear(m[3])}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
                }
                return null;
            };

            let extractedDate = '';

            // Priority 1: Labeled date fields (high confidence)
            const dateLabelPatterns = [
                // Various label names suppliers use
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
                        console.log('Date extracted from label:', extractedDate, '(from:', labelMatch[0].trim(), ')');
                        break;
                    }
                }
                if (extractedDate) break;
            }

            // Priority 2: Find any date-like string in the full text
            if (!extractedDate) {
                // Look for month-name dates first (less ambiguous)
                const monthNameDate = fullText.match(/\b(\d{1,2})[\s\-\/\.](Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s\-\/\.,]*(\d{2,4})\b/i);
                if (monthNameDate) {
                    extractedDate = tryParseDate(monthNameDate[0]);
                    console.log('Date extracted (month-name):', extractedDate);
                }
            }
            if (!extractedDate) {
                const monthFirstDate = fullText.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})[,\s]+(\d{2,4})\b/i);
                if (monthFirstDate) {
                    extractedDate = tryParseDate(monthFirstDate[0]);
                    console.log('Date extracted (month-first):', extractedDate);
                }
            }
            if (!extractedDate) {
                // Numeric dates — try YYYY-MM-DD first (unambiguous), then DD/MM/YYYY
                const isoDate = fullText.match(/\b(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})\b/);
                if (isoDate) {
                    extractedDate = tryParseDate(isoDate[0]);
                    console.log('Date extracted (ISO):', extractedDate);
                }
            }
            if (!extractedDate) {
                const numDate = fullText.match(/\b(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{2,4})\b/);
                if (numDate) {
                    extractedDate = tryParseDate(numDate[0]);
                    console.log('Date extracted (numeric):', extractedDate);
                }
            }

            // ── TIME EXTRACTION ──
            let extractedTime = '';
            // Try labeled time first
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

            // ── QUANTITY EXTRACTION (position-aware) ──
            let extractedQuantity = '';

            // Strategy 1: Use positioned text to find the value under/near a "Quantity" column header
            const qtyHeaderItem = allItems.find(item =>
                /^(qty\.?|quantity|qty:|quantity:)$/i.test(item.str.replace(/\s/g, ''))
            );

            if (qtyHeaderItem) {
                // Find numeric items below the header (same x-region, lower y or next row)
                const tolerance = 50; // pixels tolerance for column alignment
                const candidates = allItems.filter(item =>
                    item.page === qtyHeaderItem.page &&
                    Math.abs(item.x - qtyHeaderItem.x) < tolerance &&
                    item.y < qtyHeaderItem.y && // PDF y-axis: top is higher value
                    /^\d+$/.test(item.str.replace(/,/g, ''))
                ).sort((a, b) => b.y - a.y); // closest to header first

                if (candidates.length > 0) {
                    extractedQuantity = candidates[0].str.replace(/,/g, '');
                    console.log('Quantity extracted (positional, below header):', extractedQuantity);
                }
            }

            // Strategy 2: Regex patterns on full text
            if (!extractedQuantity) {
                const qtyPatterns = [
                    // "Qty: 10", "Quantity: 350", "QTY 10", "Qty. 10"
                    /(?:qty|quantity|qty\.|qty:|quantity:|total\s*qty|total\s*quantity)\s*[:\s]*(\d[\d,]*)/i,
                    // "10 pcs", "350 units", "10 pieces", "100 nos", "50 ea", "10 sets"
                    /\b(\d[\d,]*)\s*(?:pcs|units?|pieces?|items?|nos?|ea|sets?|boxes?|cartons?|rolls?|btls?|bottles?|bags?|packs?|pairs?)\b/i,
                    // "x10", "x 350"
                    /\bx\s*(\d[\d,]*)\b/i,
                    // "10x", "350 x" (but not price-like "3,500")
                    /\b(\d{1,5})\s*x\b/i,
                ];
                for (const pattern of qtyPatterns) {
                    const match = fullText.match(pattern);
                    if (match) {
                        extractedQuantity = match[1].replace(/,/g, '');
                        console.log('Quantity extracted (regex):', extractedQuantity, 'from:', pattern.source);
                        break;
                    }
                }
            }

            // Strategy 3: If still nothing, look for numbers near "Quantity" in positioned items
            if (!extractedQuantity && qtyHeaderItem) {
                // Broaden search: look at items on the same horizontal line or nearby
                const nearbyNums = allItems.filter(item =>
                    item.page === qtyHeaderItem.page &&
                    Math.abs(item.y - qtyHeaderItem.y) < 30 &&
                    item.x !== qtyHeaderItem.x &&
                    /^\d+$/.test(item.str.replace(/,/g, ''))
                );
                if (nearbyNums.length > 0) {
                    extractedQuantity = nearbyNums[0].str.replace(/,/g, '');
                    console.log('Quantity extracted (nearby):', extractedQuantity);
                }
            }

            // Apply extracted values
            if (extractedDate) {
                this.handleIncomingFormChange('date', extractedDate);
            } else {
                // Fallback to file modified date
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
            // Fallback to file modified date
            const fileDate = new Date(file.lastModified);
            const date = fileDate.toISOString().split('T')[0];
            const time = fileDate.toTimeString().split(' ')[0].substring(0, 5);
            this.handleIncomingFormChange('date', date);
            this.handleIncomingFormChange('time', time);
        }
    };

    handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ isDragging: true });
    };

    handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ isDragging: false });
    };

    handleDocumentClick = (e) => {
        if (this.productDropdownRef.current && !this.productDropdownRef.current.contains(e.target)) {
            this.setState({ productDropdownOpen: false });
        }
        if (this.locationFromDropdownRef.current && !this.locationFromDropdownRef.current.contains(e.target)) {
            this.setState({ locationFromDropdownOpen: false });
        }
        if (this.locationToDropdownRef.current && !this.locationToDropdownRef.current.contains(e.target)) {
            this.setState({ locationToDropdownOpen: false });
        }
        if (this.actionDropdownRef.current && !this.actionDropdownRef.current.contains(e.target)) {
            this.setState({ actionDropdownOpen: false });
        }
        if (this.reasonDropdownRef.current && !this.reasonDropdownRef.current.contains(e.target)) {
            this.setState({ reasonDropdownOpen: false });
        }
        if (this.variantDropdownRef.current && !this.variantDropdownRef.current.contains(e.target)) {
            this.setState({ variantDropdownOpen: false });
        }
        if (this.filterProductDropdownRef.current && !this.filterProductDropdownRef.current.contains(e.target)) {
            this.setState({ filterProductDropdownOpen: false });
        }
        if (this.filterLocationDropdownRef.current && !this.filterLocationDropdownRef.current.contains(e.target)) {
            this.setState({ filterLocationDropdownOpen: false });
        }
        if (this.orderFilterProductDropdownRef.current && !this.orderFilterProductDropdownRef.current.contains(e.target)) {
            this.setState({ orderFilterProductDropdownOpen: false });
        }
        if (this.orderFilterLocationDropdownRef.current && !this.orderFilterLocationDropdownRef.current.contains(e.target)) {
            this.setState({ orderFilterLocationDropdownOpen: false });
        }
    };

    selectProduct = (name) => {
        this.handleIncomingFormChange('product', name);
        this.handleIncomingFormChange('variant', '');
        this.setState({ productDropdownOpen: false });

        // Auto-set locations based on current action
        const action = this.state.incomingForm.action;
        if (action === 'Allocation To Site') {
            this.handleIncomingFormChange('locationFrom', 'Store');
            if (this.isColorBasedProduct(name)) {
                this.handleIncomingFormChange('locationTo', 'CT Hub');
            }
        } else if (action === 'Return Stock to Store') {
            this.handleIncomingFormChange('locationTo', 'Store');
            if (this.isColorBasedProduct(name)) {
                this.handleIncomingFormChange('locationFrom', 'CT Hub');
            }
        }
    };

    selectLocation = (loc) => {
        this.handleIncomingFormChange('location', loc);
        this.setState({ locationDropdownOpen: false });
    };

    getFilteredProducts = () => {
        const query = this.state.incomingForm.product.toLowerCase();
        const unique = [...new Set(
            this.state.inventoryProducts.map(p => p.name).filter(Boolean)
        )];
        return unique;
    };

    getFilteredLocations = () => {
        // Only return location-type variations (not color/size variants)
        const locationVariations = this.state.inventoryProducts.filter(p => {
            if (p.type !== 'variation') return false;
            const attrs = p.attributes || [];
            if (attrs.length === 0) return true;
            return (attrs[0].name || '').toLowerCase() === 'location';
        });
        const unique = [...new Set(
            locationVariations.map(p => p.variation_name).filter(Boolean)
        )];
        return unique;
    };

    // Check if a product has colour/non-location variations (e.g. ECSS Picnic Mat with Red, Blue, etc.)
    hasColorVariations = (productName) => {
        if (!productName) return false;
        const variations = this.state.inventoryProducts.filter(
            p => p.name === productName && p.type === 'variation'
        );
        if (variations.length === 0) return false;
        const attrs = variations[0].attributes || [];
        if (attrs.length === 0) return false;
        const attrName = (attrs[0].name || '').toLowerCase();
        return attrName !== 'location';
    };

    // All products use location-based drill-down cards
    isColorBasedProduct = (productName) => {
        return false;
    };

    // Get variant options (e.g., color names) for a color-based product
    getProductVariants = (productName) => {
        if (!productName) return [];
        return this.state.inventoryProducts
            .filter(p => p.name === productName && p.type === 'variation')
            .map(p => p.variation_name)
            .filter(Boolean);
    };

    // Convert DD/MM/YYYY to YYYY-MM-DD for comparison
    parseDateFilter = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
    };

    getProductSummaryCards = () => {
        const { inventoryProducts, stockRecords, cardFilterProduct, cardFilterLocation, cardFilterDateFrom, cardFilterDateTo } = this.state;
        const productMap = {};

        // Filter stock records by date range if set
        let filteredStockRecords = stockRecords;
        if (cardFilterDateFrom || cardFilterDateTo) {
            const fromDate = this.parseDateFilter(cardFilterDateFrom);
            const toDate = this.parseDateFilter(cardFilterDateTo);
            filteredStockRecords = stockRecords.filter(r => {
                const recordDate = r.date || r.orderDate || '';
                if (!recordDate) return true;
                if (fromDate && recordDate < fromDate) return false;
                if (toDate && recordDate > toDate) return false;
                return true;
            });
        }

        // Get unique product names from inventory products
        const productNames = [...new Set(inventoryProducts.map(p => p.name).filter(Boolean))];

        for (const name of productNames) {
            productMap[name] = { name, locations: [] };

            // Action-based stock calculations using action + locationFrom + locationTo
            const nameLower = name.toLowerCase();
            const storeInActions = ['purchase from supplier', 'return stock to store'];
            const storeOutActions = ['allocation to site', 'return to supplier'];

            // Total Stock In for this product - stock arriving at Store (Purchase From Supplier + Return Stock to Store)
            const totalStockIn = filteredStockRecords
                .filter(r => (r.product || '').toLowerCase() === nameLower && storeInActions.includes((r.action || '').toLowerCase()) && (r.locationTo || '').toLowerCase() === 'store')
                .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

            // Total Stock Out for this product - stock leaving Store (Allocation To Site + Return to Supplier)
            const totalStockOut = filteredStockRecords
                .filter(r => (r.product || '').toLowerCase() === nameLower && storeOutActions.includes((r.action || '').toLowerCase()) && (r.locationFrom || '').toLowerCase() === 'store')
                .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

            // Total Sales for this product across ALL locations
            const totalSales = filteredStockRecords
                .filter(r => (r.product || '').toLowerCase() === nameLower && r.action === 'Sales')
                .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

            // All products get Store as a location first
            const hasColors = this.hasColorVariations(name);

            // Add Store location
            const storeStockIn = totalStockIn;
            const storeStockOut = totalStockOut;
            // Sales originating from Store only (locationFrom === 'Store')
            const storeSales = filteredStockRecords
                .filter(r => (r.product || '').toLowerCase() === nameLower && r.action === 'Sales' && (r.locationFrom || '').toLowerCase() === 'store')
                .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
            let storeVariants = [];
            if (hasColors) {
                const variantProducts = inventoryProducts.filter(p => p.name === name && p.type === 'variation');
                for (const vp of variantProducts) {
                    const variantName = vp.variation_name || '';
                    const variantLower = variantName.toLowerCase();
                    const varStockIn = filteredStockRecords
                        .filter(r => (r.product || '').toLowerCase() === nameLower && (r.variant || '').toLowerCase() === variantLower && storeInActions.includes((r.action || '').toLowerCase()) && (r.locationTo || '').toLowerCase() === 'store')
                        .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                    const varStockOut = filteredStockRecords
                        .filter(r => (r.product || '').toLowerCase() === nameLower && (r.variant || '').toLowerCase() === variantLower && storeOutActions.includes((r.action || '').toLowerCase()) && (r.locationFrom || '').toLowerCase() === 'store')
                        .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                    const varSales = filteredStockRecords
                        .filter(r => (r.product || '').toLowerCase() === nameLower && (r.variant || '').toLowerCase() === variantLower && r.action === 'Sales' && (r.locationFrom || '').toLowerCase() === 'store')
                        .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                    storeVariants.push({ name: variantName, stockIn: varStockIn, stockOut: varStockOut, sales: varSales });
                }
            }
            productMap[name].locations.push({ location: 'Store', stockIn: storeStockIn, stockOut: storeStockOut, sales: storeSales, variants: storeVariants });

            // Add site locations
            const fixedLocations = hasColors
                ? ['CT Hub']
                : ['CT Hub', 'Pasir Ris West Wellness Centre', 'Tampines North Community Club'];
            for (const loc of fixedLocations) {
                const locLower = loc.toLowerCase();
                // Stock In = Allocation To Site where locationTo matches this site
                const stockIn = filteredStockRecords
                    .filter(r => (r.product || '').toLowerCase() === nameLower && (r.action || '').toLowerCase() === 'allocation to site' && (r.locationTo || '').toLowerCase() === locLower)
                    .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                // Stock Out = Return Stock to Store where locationFrom matches this site
                const stockOut = filteredStockRecords
                    .filter(r => (r.product || '').toLowerCase() === nameLower && (r.action || '').toLowerCase() === 'return stock to store' && (r.locationFrom || '').toLowerCase() === locLower)
                    .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                // Sales at this site
                const sales = filteredStockRecords
                    .filter(r => (r.product || '').toLowerCase() === nameLower && (r.locationFrom || '').toLowerCase() === locLower && r.action === 'Sales')
                    .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

                // Build colour variant breakdown if product has colour variations
                let variants = [];
                if (hasColors) {
                    const variantProducts = inventoryProducts.filter(p => p.name === name && p.type === 'variation');
                    for (const vp of variantProducts) {
                        const variantName = vp.variation_name || '';
                        const variantLower = variantName.toLowerCase();
                        const varStockIn = filteredStockRecords
                            .filter(r => (r.product || '').toLowerCase() === nameLower && (r.action || '').toLowerCase() === 'allocation to site' && (r.locationTo || '').toLowerCase() === locLower && (r.variant || '').toLowerCase() === variantLower)
                            .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                        const varStockOut = filteredStockRecords
                            .filter(r => (r.product || '').toLowerCase() === nameLower && (r.action || '').toLowerCase() === 'return stock to store' && (r.locationFrom || '').toLowerCase() === locLower && (r.variant || '').toLowerCase() === variantLower)
                            .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                        const varSales = filteredStockRecords
                            .filter(r => (r.product || '').toLowerCase() === nameLower && (r.locationFrom || '').toLowerCase() === locLower && (r.variant || '').toLowerCase() === variantLower && r.action === 'Sales')
                            .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                        variants.push({ name: variantName, stockIn: varStockIn, stockOut: varStockOut, sales: varSales });
                    }
                }
                productMap[name].locations.push({ location: loc, stockIn, stockOut, sales, variants });
            }

            // Store product-level totals
            productMap[name].totalStockIn = totalStockIn;
            productMap[name].totalStockOut = totalStockOut;
            productMap[name].totalSales = totalSales;
        }

        let results = Object.values(productMap).map(product => {
            const hasColors = this.hasColorVariations(product.name);
            let variants = [];
            if (hasColors) {
                const variantProducts = inventoryProducts.filter(p => p.name === product.name && p.type === 'variation');
                for (const vp of variantProducts) {
                    const variantName = vp.variation_name || '';
                    const variantLower = variantName.toLowerCase();
                    const nameLower = product.name.toLowerCase();
                    const storeInActs = ['purchase from supplier', 'return stock to store'];
                    const storeOutActs = ['allocation to site', 'return to supplier'];
                    const varStockIn = filteredStockRecords
                        .filter(r => (r.product || '').toLowerCase() === nameLower && (r.variant || '').toLowerCase() === variantLower && storeInActs.includes((r.action || '').toLowerCase()) && (r.locationTo || '').toLowerCase() === 'store')
                        .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                    const varStockOut = filteredStockRecords
                        .filter(r => (r.product || '').toLowerCase() === nameLower && (r.variant || '').toLowerCase() === variantLower && storeOutActs.includes((r.action || '').toLowerCase()) && (r.locationFrom || '').toLowerCase() === 'store')
                        .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                    const varSales = filteredStockRecords
                        .filter(r => (r.product || '').toLowerCase() === nameLower && (r.variant || '').toLowerCase() === variantLower && r.action === 'Sales' && (r.locationFrom || '').toLowerCase() === 'store')
                        .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                    variants.push({ name: variantName, stockIn: varStockIn, stockOut: varStockOut, sales: varSales });
                }
            }
            return {
                name: product.name,
                totalStock: product.totalStockIn,
                totalStockOut: product.totalStockOut,
                totalSold: product.totalSales,
                locations: product.locations,
                isColorBased: this.isColorBasedProduct(product.name),
                hasColors,
                variants
            };
        });

        // Apply product name filter
        if (cardFilterProduct) {
            results = results.filter(c => c.name.toLowerCase().includes(cardFilterProduct.toLowerCase()));
        }

        // Apply location filter
        if (cardFilterLocation) {
            results = results.filter(c => c.locations.some(l => l.location.toLowerCase().includes(cardFilterLocation.toLowerCase())));
        }

        return results;
    };

    clearCardFilters = () => {
        this.setState({ cardFilterProduct: '', cardFilterLocation: '', cardFilterDateFrom: '', cardFilterDateTo: '', filterProductDropdownOpen: false, filterLocationDropdownOpen: false });
    };

    selectFilterProduct = (name) => {
        this.setState({ cardFilterProduct: name, filterProductDropdownOpen: false });
    };

    selectFilterLocation = (loc) => {
        this.setState({ cardFilterLocation: loc, filterLocationDropdownOpen: false });
    };

    getFilterProductOptions = () => {
        const query = this.state.cardFilterProduct.toLowerCase();
        const unique = [...new Set(this.state.inventoryProducts.map(p => p.name).filter(Boolean))];
        return query ? unique.filter(n => n.toLowerCase().includes(query)) : unique;
    };

    getFilterLocationOptions = () => {
        const query = this.state.cardFilterLocation.toLowerCase();
        const unique = [...new Set(this.state.inventoryProducts.map(p => p.variation_name).filter(Boolean))];
        return query ? unique.filter(n => n.toLowerCase().includes(query)) : unique;
    };

    toggleCards = () => {
        this.setState(prev => ({ showCards: !prev.showCards }));
    };

    // Order Records location summary cards (from location's point of view)
    getOrderLocationSummaryCards = () => {
        const { inventoryProducts, stockRecords, orderFilterProduct, orderFilterLocation, orderFilterDateFrom, orderFilterDateTo } = this.state;
        const locations = ['CT Hub', 'Tampines North Community Club', 'Pasir Ris West Wellness Centre'];

        // Filter stock records by date range if set
        let filteredStockRecords = stockRecords;
        if (orderFilterDateFrom || orderFilterDateTo) {
            const fromDate = this.parseDateFilter(orderFilterDateFrom);
            const toDate = this.parseDateFilter(orderFilterDateTo);
            filteredStockRecords = stockRecords.filter(r => {
                const recordDate = r.date || r.orderDate || '';
                if (!recordDate) return true;
                if (fromDate && recordDate < fromDate) return false;
                if (toDate && recordDate > toDate) return false;
                return true;
            });
        }

        // Get unique product names
        let productNames = [...new Set(inventoryProducts.map(p => p.name).filter(Boolean))];

        // Filter by product if set
        if (orderFilterProduct) {
            productNames = productNames.filter(n => n.toLowerCase().includes(orderFilterProduct.toLowerCase()));
        }

        // Filter locations if set
        let filteredLocations = locations;
        if (orderFilterLocation) {
            filteredLocations = locations.filter(l => l.toLowerCase().includes(orderFilterLocation.toLowerCase()));
        }

        return filteredLocations.map(loc => {
            const locLower = loc.toLowerCase();
            const products = productNames.map(name => {
                const nameLower = name.toLowerCase();
                const hasColors = this.hasColorVariations(name);

                // Items received at this location (Allocation To Site where locationTo = this site)
                const received = filteredStockRecords
                    .filter(r => (r.product || '').toLowerCase() === nameLower && (r.action || '').toLowerCase() === 'allocation to site' && (r.locationTo || '').toLowerCase() === locLower)
                    .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

                // Items returned from this location (Return Stock to Store where locationFrom = this site)
                const returned = filteredStockRecords
                    .filter(r => (r.product || '').toLowerCase() === nameLower && (r.action || '').toLowerCase() === 'return stock to store' && (r.locationFrom || '').toLowerCase() === locLower)
                    .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

                // Items sold at this location
                const itemSold = filteredStockRecords
                    .filter(r => (r.product || '').toLowerCase() === nameLower && (r.locationFrom || '').toLowerCase() === locLower && r.action === 'Sales')
                    .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

                // Balance = received - returned - sold
                const balance = received - returned - itemSold;

                // Variant breakdown if product has colors
                let variants = [];
                if (hasColors) {
                    const variantProducts = inventoryProducts.filter(p => p.name === name && p.type === 'variation');
                    for (const vp of variantProducts) {
                        const variantName = vp.variation_name || '';
                        const variantLower = variantName.toLowerCase();
                        const varReceived = filteredStockRecords
                            .filter(r => (r.product || '').toLowerCase() === nameLower && (r.action || '').toLowerCase() === 'allocation to site' && (r.locationTo || '').toLowerCase() === locLower && (r.variant || '').toLowerCase() === variantLower)
                            .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                        const varReturned = filteredStockRecords
                            .filter(r => (r.product || '').toLowerCase() === nameLower && (r.action || '').toLowerCase() === 'return stock to store' && (r.locationFrom || '').toLowerCase() === locLower && (r.variant || '').toLowerCase() === variantLower)
                            .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                        const varSold = filteredStockRecords
                            .filter(r => (r.product || '').toLowerCase() === nameLower && (r.locationFrom || '').toLowerCase() === locLower && (r.variant || '').toLowerCase() === variantLower && r.action === 'Sales')
                            .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
                        variants.push({ name: variantName, itemSold: varSold, balance: varReceived - varReturned - varSold });
                    }
                }

                return { name, itemSold, balance, variants, hasColors };
            }).filter(p => p.itemSold > 0 || p.balance !== 0 || p.variants.some(v => v.itemSold > 0 || v.balance !== 0));

            const totalItemSold = products.reduce((sum, p) => sum + p.itemSold, 0);
            const totalBalance = products.reduce((sum, p) => sum + p.balance, 0);

            return { location: loc, products, totalItemSold, totalBalance };
        });
    };

    // Order Records filter methods
    selectOrderFilterProduct = (name) => {
        this.setState({ orderFilterProduct: name, orderFilterProductDropdownOpen: false });
    };

    selectOrderFilterLocation = (loc) => {
        this.setState({ orderFilterLocation: loc, orderFilterLocationDropdownOpen: false });
    };

    getOrderFilterProductOptions = () => {
        const query = this.state.orderFilterProduct.toLowerCase();
        const locationRecords = this.getLocationStockRecords();
        const unique = [...new Set(locationRecords.map(r => r.product).filter(Boolean))];
        return query ? unique.filter(n => n.toLowerCase().includes(query)) : unique;
    };

    getOrderFilterLocationOptions = () => {
        const query = this.state.orderFilterLocation.toLowerCase();
        const locations = ['CT Hub', 'Tampines North Community Club', 'Pasir Ris West Wellness Centre'];
        return query ? locations.filter(n => n.toLowerCase().includes(query)) : locations;
    };

    // Get all stock records relevant to the 3 site locations
    getLocationStockRecords = () => {
        const { stockRecords } = this.state;
        const siteLocations = ['ct hub', 'tampines north community club', 'pasir ris west wellness centre'];
        return stockRecords.filter(r => {
            const locTo = (r.locationTo || '').toLowerCase();
            const locFrom = (r.locationFrom || r.location || '').toLowerCase();
            return siteLocations.includes(locTo) || siteLocations.includes(locFrom);
        });
    };

    clearOrderFilters = () => {
        this.setState({ orderFilterProduct: '', orderFilterLocation: '', orderFilterDateFrom: '', orderFilterDateTo: '', orderFilterProductDropdownOpen: false, orderFilterLocationDropdownOpen: false });
    };

    getFilteredOrderRecords = () => {
        const { stockRecords, orderFilterProduct, orderFilterLocation, orderFilterDateFrom, orderFilterDateTo } = this.state;
        const siteLocations = ['ct hub', 'tampines north community club', 'pasir ris west wellness centre'];

        // Get all stock records relevant to site locations and relabel action from location's POV
        let filtered = stockRecords.filter(r => {
            const locTo = (r.locationTo || '').toLowerCase();
            const locFrom = (r.locationFrom || r.location || '').toLowerCase();
            return siteLocations.includes(locTo) || siteLocations.includes(locFrom);
        }).map(r => {
            const action = (r.action || '').toLowerCase();
            let location = '';
            let locationAction = '';

            if (action === 'allocation to site') {
                location = r.locationTo || '';
                locationAction = 'Stock In (received from Store)';
            } else if (action === 'return stock to store') {
                location = r.locationFrom || '';
                locationAction = 'Stock Out (returned to Store)';
            } else if (action === 'sales') {
                location = r.locationFrom || r.location || '';
                locationAction = 'Item Sold';
            } else {
                location = r.locationFrom || r.locationTo || r.location || '';
                locationAction = r.action || '';
            }

            return { ...r, location, locationAction };
        });

        if (orderFilterProduct) {
            filtered = filtered.filter(r => r.product && r.product.toLowerCase().includes(orderFilterProduct.toLowerCase()));
        }
        if (orderFilterLocation) {
            filtered = filtered.filter(r => r.location && r.location.toLowerCase().includes(orderFilterLocation.toLowerCase()));
        }
        if (orderFilterDateFrom) {
            const fromDate = this.parseDateFilter(orderFilterDateFrom);
            filtered = filtered.filter(r => {
                const d = r.date || r.orderDate || '';
                return d >= fromDate;
            });
        }
        if (orderFilterDateTo) {
            const toDate = this.parseDateFilter(orderFilterDateTo);
            filtered = filtered.filter(r => {
                const d = r.date || r.orderDate || '';
                return d <= toDate;
            });
        }

        // Enrich each record with cumulative Item Sold and Balance for that product+location
        return filtered.map(r => {
            const product = (r.product || '').toLowerCase();
            const loc = (r.location || '').toLowerCase();
            if (!product || !loc) return { ...r, itemSold: 0, balance: 0 };

            // Item Sold = total Sales quantity for this product at this location
            const itemSold = stockRecords
                .filter(sr => (sr.product || '').toLowerCase() === product && (sr.locationFrom || sr.location || '').toLowerCase() === loc && sr.action === 'Sales')
                .reduce((sum, sr) => sum + (parseInt(sr.quantity) || 0), 0);

            // Received = Allocation To Site where locationTo matches this location
            const received = stockRecords
                .filter(sr => (sr.product || '').toLowerCase() === product && (sr.action || '').toLowerCase() === 'allocation to site' && (sr.locationTo || '').toLowerCase() === loc)
                .reduce((sum, sr) => sum + (parseInt(sr.quantity) || 0), 0);

            // Returned = Return Stock to Store where locationFrom matches this location
            const returned = stockRecords
                .filter(sr => (sr.product || '').toLowerCase() === product && (sr.action || '').toLowerCase() === 'return stock to store' && (sr.locationFrom || '').toLowerCase() === loc)
                .reduce((sum, sr) => sum + (parseInt(sr.quantity) || 0), 0);

            const balance = received - returned - itemSold;

            return { ...r, itemSold, balance };
        });
    };

    toggleCardExpand = (name) => {
        this.setState(prevState => ({
            selectedProduct: prevState.selectedProduct === name ? null : name
        }));
    };

    backToProducts = () => {
        this.setState({ selectedProduct: null });
    };

    handleIncomingFormChange = (field, value) => {
        this.setState(prevState => ({
            incomingForm: {
                ...prevState.incomingForm,
                [field]: value
            }
        }));
    };

    handleIncomingSubmit = async (e) => {
        e.preventDefault();
        const { incomingForm } = this.state;

        if (!incomingForm.product || !incomingForm.date || !incomingForm.time || !incomingForm.quantity || !incomingForm.updatedBy) {
            alert('Please fill in all fields.');
            return;
        }

        this.setState({ isSubmitting: true });

        try {
            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, {
                purpose: "insertStock",
                payload: {
                    action: incomingForm.action,
                    product: incomingForm.product,
                    locationFrom: incomingForm.locationFrom,
                    locationTo: incomingForm.locationTo,
                    date: incomingForm.date,
                    time: incomingForm.time,
                    quantity: incomingForm.quantity,
                    reason: incomingForm.reason || '',
                    updatedBy: incomingForm.updatedBy,
                    variant: incomingForm.variant || ''
                }
            });

            if (response.data.success) {
                console.log('Stock record inserted:', response.data);

                // Upload file to Google Drive if present
                if (this.state.uploadedFile) {
                    try {
                        const formData = new FormData();
                        formData.append('file', this.state.uploadedFile);
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const safeProduct = (incomingForm.product || 'product').replace(/[^a-zA-Z0-9_\- ]/g, '_');
                        const filename = `${incomingForm.action}_${safeProduct}_${timestamp}_${this.state.uploadedFile.name}`;
                        formData.append('filename', filename);

                        await axios.post(`${backendUrl}/inventory/uploadStockFile`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        console.log('File uploaded to Google Drive successfully');
                    } catch (uploadErr) {
                        console.error('Error uploading file to Google Drive:', uploadErr);
                    }
                }

                // Update WooCommerce stock via Django backend
                try {
                    const djangoUrl = window.location.hostname === "localhost"
                        ? "http://localhost:3002"
                        : "https://ecss-backend-django.azurewebsites.net";

                    const wooResponse = await axios.post(`${djangoUrl}/inventory_stock_adjustment/`, {
                        action: incomingForm.action,
                        product: incomingForm.product,
                        quantity: incomingForm.quantity,
                        locationFrom: incomingForm.locationFrom,
                        locationTo: incomingForm.locationTo,
                        reason: incomingForm.action,
                        variant: incomingForm.variant || ''
                    });

                    if (wooResponse.data.success) {
                        console.log('WooCommerce stock updated:', wooResponse.data);
                    } else {
                        console.error('WooCommerce stock update failed:', wooResponse.data.error);
                    }
                } catch (wooError) {
                    console.error('Error updating WooCommerce stock:', wooError);
                }

                // Close modal and refresh after WooCommerce update completes
                this.closeIncomingModal();
                await this.fetchStockRecords();
            } else {
                alert(response.data.error || 'Failed to insert stock record.');
            }
        } catch (error) {
            console.error('Error inserting stock record:', error);
            alert('Failed to insert stock record. Please try again.');
        } finally {
            this.setState({ isSubmitting: false });
        }
    };

    handleValueClick = (params) => {
        if (params.colDef.field === 'receiptNumber' && params.data?.receiptNumber) {
            this.generateReceipt(params.data);
        }
    };

    generateReceipt = async (record) => {
        console.log('Generating receipt for record:', record);
        // Open new tab immediately (before async) to avoid popup blocker
        const newTab = window.open('', '_blank');
        try {
            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, {
                purpose: "downloadReceipt",
                customerName: record.customerName,
                paymentMethod: record.paymentMethod,
                receiptNumber: record.receiptNumber,
                product: record.product,
                location: record.location,
                quantity: record.quantity,
                orderDate: record.orderDate,
                orderTime: record.orderTime,
                staffName: record.staffName,
                unitPrice: record.unitPrice,
                totalPrice: record.totalPrice
            });

            // Download and open PDF in new tab
            if (response.data.result?.pdfGenerated && response.data.result?.pdfData) {
                const pdfBlob = new Blob(
                    [Uint8Array.from(atob(response.data.result.pdfData), c => c.charCodeAt(0))],
                    { type: 'application/pdf' }
                );
                const pdfUrl = URL.createObjectURL(pdfBlob);
                // Navigate the pre-opened tab to the PDF
                if (newTab) {
                    newTab.location.href = pdfUrl;
                }
                // Also trigger download
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = response.data.result.pdfFilename || 'receipt.pdf';
                link.click();
                setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
            } else {
                if (newTab) newTab.close();
                alert('Failed to generate receipt PDF.');
            }
        } catch (error) {
            if (newTab) newTab.close();
            console.error('Error generating receipt:', error);
            alert('Failed to generate receipt. Please try again.');
        }
    };

    // Column definitions for the AG Grid
    exportStockToExcel = () => {
        const { stockRecords } = this.state;
        if (!stockRecords || stockRecords.length === 0) return;

        const exportData = stockRecords.map((r, i) => ({
            'S/N': i + 1,
            'Action': r.action || '',
            'Product': r.product || '',
            'Location': r.location || '',
            'Date': r.date || r.orderDate || '',
            'Time': r.time || r.orderTime || '',
            'Quantity': r.quantity || '',
            'Reason': r.reason || '',
            'Updated By': r.updatedBy || r.staffName || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stock Records');
        XLSX.writeFile(wb, `Stock_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    exportToExcel = () => {
        const enrichedRecords = this.getFilteredOrderRecords();
        if (!enrichedRecords || enrichedRecords.length === 0) return;

        const exportData = enrichedRecords.map((r, i) => ({
            'S/N': i + 1,
            'Action': r.locationAction || '',
            'Product': r.product || '',
            'Variant': r.variant || '',
            'Location': r.location || '',
            'Quantity': r.quantity || '',
            'Date': r.date || r.orderDate || '',
            'Time': r.time || r.orderTime || '',
            'Customer Name': r.customerName || '',
            'Payment Method': r.paymentMethod || '',
            'Total Price': r.totalPrice ? `$${parseFloat(r.totalPrice).toFixed(2)}` : '',
            'Updated By': r.updatedBy || r.staffName || '',
            'Item Sold': r.itemSold || 0,
            'Balance': r.balance || 0,
            'Receipt Number': r.receiptNumber || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Order Records');
        XLSX.writeFile(wb, `Order_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    columnDefs = [
        { 
            headerName: 'S/N', 
            valueGetter: (params) => params.node.rowIndex + 1,  
            width: 100, 
            pinned: 'left',
        },
        { 
            headerName: 'Customer Name', 
            field: 'customerName', 
            width: 200,
        },
        { 
            headerName: 'Payment Method', 
            field: 'paymentMethod', 
            width: 250,
        },
        { 
            headerName: 'Product', 
            field: 'product', 
            width: 400, 
        },
        {
            headerName: 'Variant',
            field: 'variant',
            width: 150,
        },
        { 
            headerName: 'Location', 
            field: 'location', 
            width: 280,
        },
        { 
            headerName: 'Quantity', 
            field: 'quantity', 
            width: 120, 
            cellStyle: { textAlign: 'center' },
        },
        { 
            headerName: 'Date', 
            width: 130,
            valueGetter: (params) => params.data?.date || params.data?.orderDate || '',
            valueFormatter: (params) => {
                if (!params.value) return '';
                const parts = params.value.split('-');
                if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                return params.value;
            }
        },
        { 
            headerName: 'Time', 
            width: 100,
        },
        { 
            headerName: 'Total Price', 
            field: 'totalPrice', 
            width: 200,
            valueGetter: (params) => {
                const val = params.data?.totalPrice;
                if (!val && val !== 0) return '';
                return `$${parseFloat(val).toFixed(2)}`;
            },
            cellStyle: { textAlign: 'right' },
        },
        { 
            headerName: 'Updated By', 
            width: 200,
        },
        { 
            headerName: 'Receipt Number', 
            field: 'receiptNumber', 
            width: 250,
            pinned: 'right',
            cellRenderer: (params) => {
                return (
                    <span
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            this.generateReceipt(params.data);
                        }}
                    >
                        {params.data.receiptNumber}
                    </span>
                );
            }
        }
    ];

    // Stock Records column definitions
    stockColumnDefs = [
        { 
            headerName: 'S/N', 
            valueGetter: (params) => params.node.rowIndex + 1,  
            width: 100, 
            pinned: 'left',
        },
        { 
            headerName: 'Action', 
            field: 'action', 
            width: 300,
            pinned: 'left',
            valueGetter: (params) => params.data?.action || '',
        },
        { 
            headerName: 'Product', 
            field: 'product', 
            width: 500,
        },
        { 
            headerName: 'Variant', 
            field: 'variant', 
            width: 150,
            valueGetter: (params) => params.data?.variant || '',
        },
        { 
            headerName: 'Location From', 
            field: 'locationFrom', 
            width: 250,
            valueGetter: (params) => params.data?.locationFrom || '',
        },
        { 
            headerName: 'Location To', 
            field: 'locationTo', 
            width: 250,
            valueGetter: (params) => params.data?.locationTo || params.data?.location || '',
        },
        { 
            headerName: 'Date', 
            width: 150,
            valueGetter: (params) => params.data?.date || params.data?.orderDate || '',
            valueFormatter: (params) => {
                if (!params.value) return '';
                const parts = params.value.split('-');
                if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                return params.value;
            }
        },
        { 
            headerName: 'Time', 
            width: 150,
            valueGetter: (params) => params.data?.time || params.data?.orderTime || '',
        },
        { 
            headerName: 'Quantity', 
            field: 'quantity', 
            width: 150,
            cellStyle: { textAlign: 'center' },
        },
        { 
            headerName: 'Updated By', 
            width: 200,
            valueGetter: (params) => params.data?.updatedBy || params.data?.staffName || '',
        },
        { 
            headerName: 'Reason', 
            field: 'reason', 
            width: 500,
            valueGetter: (params) => params.data?.reason || '',
        },
    ];

    onGridReady = (params) => {
        this.gridApi = params.api;
        this.gridColumnApi = params.columnApi;
    };

    onStockGridReady = (params) => {
        this.stockGridApi = params.api;
    };

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleDocumentClick);
        // Remove resize event listener
        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
        }
        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    render() {
        const { activeTab, records, isLoading, error } = this.state;
        const restrictedRoles = ['Site in-charge', 'NSA in-charge', 'Fitness Trainer'];
        const isRestricted = restrictedRoles.includes(this.props.role);

        return (
            <>
                {/* Loading Modal Overlay - closes once Stock Adjustment button (toolbarReady) is displayed */}
                {!this.state.toolbarReady && (
                    <div className="stock-modal-overlay" style={{ zIndex: 9999 }}>
                        <div className="stock-modal" style={{ maxWidth: '320px', textAlign: 'center', padding: '40px 30px' }} onClick={e => e.stopPropagation()}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#3498db', marginBottom: '16px' }}></i>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#2c3e50' }}>Loading</h3>
                            <p style={{ margin: 0, color: '#7f8c8d', fontSize: '0.9rem' }}>Fetching inventory records...</p>
                        </div>
                    </div>
                )}

                <div className="inventory-heading">
                    <h2>Inventory Records</h2>
                </div>

                {/* Sub-tabs */}
                {!isRestricted && (
                <div className="records-sub-tabs">
                    <button
                        className={`records-sub-tab${activeTab === 'stock' ? ' active' : ''}`}
                        onClick={() => this.setState({ activeTab: 'stock' })}
                    >
                        Stock Records
                    </button>
                    <button
                        className={`records-sub-tab${activeTab === 'orders' ? ' active' : ''}`}
                        onClick={() => this.setState({ activeTab: 'orders' })}
                    >
                        Order Records
                    </button>
                </div>
                )}

                {/* Tab content */}
                {activeTab === 'stock' && (
                    <div className="inventory-content">
                        {/* Search & Filter Bar */}
                        <div className="stock-filter-bar">
                            <div className="stock-filter-row">
                                <div className="stock-filter-field">
                                    <label>Product</label>
                                    <div className="stock-filter-dropdown" ref={this.filterProductDropdownRef}>
                                        <input
                                            type="text"
                                            placeholder="Search product..."
                                            value={this.state.cardFilterProduct}
                                            onChange={e => this.setState({ cardFilterProduct: e.target.value, filterProductDropdownOpen: true })}
                                            onFocus={() => this.setState({ filterProductDropdownOpen: true })}
                                        />
                                        {this.state.filterProductDropdownOpen && this.getFilterProductOptions().length > 0 && (
                                            <ul className="stock-filter-dropdown-list">
                                                {this.getFilterProductOptions().map((name, idx) => (
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
                                            value={this.state.cardFilterLocation}
                                            onChange={e => this.setState({ cardFilterLocation: e.target.value, filterLocationDropdownOpen: true })}
                                            onFocus={() => this.setState({ filterLocationDropdownOpen: true })}
                                        />
                                        {this.state.filterLocationDropdownOpen && this.getFilterLocationOptions().length > 0 && (
                                            <ul className="stock-filter-dropdown-list">
                                                {this.getFilterLocationOptions().map((loc, idx) => (
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
                                        value={this.state.cardFilterDateFrom}
                                        onChange={e => this.setState({ cardFilterDateFrom: e.target.value })}
                                    />
                                </div>
                                <div className="stock-filter-field">
                                    <label>Date To</label>
                                    <input
                                        type="text"
                                        placeholder="DD/MM/YYYY"
                                        value={this.state.cardFilterDateTo}
                                        onChange={e => this.setState({ cardFilterDateTo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Product Summary Cards */}
                        <div className="stock-product-cards" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                            {this.getProductSummaryCards().map((card, idx) => (
                                <div key={card.name} className={`stock-product-card stock-product-card-${idx % 3}`} style={{ width: 'calc(50% - 10px)', minWidth: '300px', boxSizing: 'border-box' }}>
                                    <div className="stock-product-card-header">
                                        <div>
                                            <h4>{card.name}</h4>
                                        </div>
                                    </div>
                                    <div className="stock-product-card-divider"></div>
                                    {/* Location columns - all in one row */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0' }}>
                                    {card.locations.map((loc, locIdx) => {
                                        const colorMap = {
                                            red: '#e74c3c', blue: '#3498db', green: '#2ecc71', yellow: '#f1c40f',
                                            black: '#2c3e50', white: '#bdc3c7', pink: '#e91e63', purple: '#9b59b6',
                                            orange: '#e67e22'
                                        };
                                        return (
                                            <div key={locIdx} style={{
                                                flex: '1 1 calc(50% - 1px)',
                                                maxWidth: '50%',
                                                minWidth: '0',
                                                padding: '12px 16px',
                                                borderRight: locIdx % 2 === 0 ? '1px solid #f0f0f0' : 'none',
                                                borderTop: locIdx >= 2 ? '1px solid #f0f0f0' : 'none',
                                                boxSizing: 'border-box'
                                            }}>
                                                <div style={{ fontWeight: '600', fontSize: '1.7rem', color: '#555', marginBottom: '8px' }}>
                                                    <i className={loc.location === 'Store' ? 'fas fa-store' : 'fas fa-map-marker-alt'} style={{
                                                        color: '#667eea',
                                                        fontSize: '1.5rem',
                                                        marginRight: '8px'
                                                    }}></i>
                                                    {loc.location}
                                                </div>
                                                {loc.variants && loc.variants.length > 0 ? (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0' }}>
                                                        {loc.variants.map((v, vIdx) => (
                                                            <div key={vIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', paddingLeft: vIdx > 0 ? '16px' : '0', paddingRight: vIdx < loc.variants.length - 1 ? '16px' : '0', borderRight: vIdx < loc.variants.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                                                                <span style={{ fontSize: '1.7rem', fontWeight: '500' }}>
                                                                    <i className="fas fa-circle" style={{
                                                                        color: colorMap[v.name.toLowerCase()] || '#95a5a6',
                                                                        fontSize: '1rem',
                                                                        marginRight: '6px',
                                                                        verticalAlign: 'middle'
                                                                    }}></i>
                                                                    {v.name}
                                                                </span>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                        <span style={{ color: '#27ae60', fontWeight: '700', fontSize: '2.6rem' }}>{v.stockIn - v.stockOut - v.sales}</span>
                                                                        <span style={{ color: '#95a5a6', fontSize: '1.2rem', textTransform: 'uppercase' }}>Balance</span>
                                                                    </div>
                                                                    {loc.location !== 'Store' && (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                        <span style={{ color: '#e74c3c', fontWeight: '700', fontSize: '2.6rem' }}>{v.sales}</span>
                                                                        <span style={{ color: '#95a5a6', fontSize: '1.2rem', textTransform: 'uppercase' }}>Sold</span>
                                                                    </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            <span style={{ color: '#27ae60', fontWeight: '700', fontSize: '2.6rem' }}>{loc.stockIn - loc.stockOut - loc.sales}</span>
                                                            <span style={{ color: '#95a5a6', fontSize: '1.2rem', textTransform: 'uppercase' }}>Balance</span>
                                                        </div>
                                                        {loc.location !== 'Store' && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            <span style={{ color: '#e74c3c', fontWeight: '700', fontSize: '2.6rem' }}>{loc.sales}</span>
                                                            <span style={{ color: '#95a5a6', fontSize: '1.2rem', textTransform: 'uppercase' }}>Sold</span>
                                                        </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    </div>
                                    <div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                        <span style={{ color: '#8e44ad', fontWeight: '700', fontSize: '1.6rem' }}>Total Sales:</span>
                                        <span style={{ color: '#8e44ad', fontWeight: '700', fontSize: '2rem' }}>{card.locations.reduce((sum, loc) => sum + (loc.sales || 0), 0)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {this.state.toolbarReady && (
                        <div className="stock-records-toolbar" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                            {!isRestricted && (
                            <button className="stock-incoming-btn" onClick={this.openIncomingModal}>
                                Stock Adjustment
                            </button>
                            )}
                            {this.state.stockRecords.length > 0 && (
                                <button className="stock-export-btn" onClick={this.exportStockToExcel}>
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
                        ) : this.state.stockRecords.length === 0 ? (
                            <div className="inventory-empty-state">
                                <i className="fas fa-clipboard-list"></i>
                                <h3>No Records Found</h3>
                                <p>No stock records have been recorded yet.</p>
                            </div>
                        ) : (
                            <div className="inventory-records-grid-container ag-theme-inventory" style={{ height: '500px', width: '100%' }}>
                                <AgGridReact
                                    columnDefs={this.stockColumnDefs}
                                    rowData={this.state.stockRecords}
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
                )}

                {activeTab === 'orders' && (
                    <div className="inventory-content">
                        {/* Order Records Search & Filter Bar */}
                        <div className="stock-filter-bar">
                            <div className="stock-filter-row">
                                <div className="stock-filter-field">
                                    <label>Product</label>
                                    <div className="stock-filter-dropdown" ref={this.orderFilterProductDropdownRef}>
                                        <input
                                            type="text"
                                            placeholder="Search product..."
                                            value={this.state.orderFilterProduct}
                                            onChange={e => this.setState({ orderFilterProduct: e.target.value, orderFilterProductDropdownOpen: true })}
                                            onFocus={() => this.setState({ orderFilterProductDropdownOpen: true })}
                                        />
                                        {this.state.orderFilterProductDropdownOpen && this.getOrderFilterProductOptions().length > 0 && (
                                            <ul className="stock-filter-dropdown-list">
                                                {this.getOrderFilterProductOptions().map((name, idx) => (
                                                    <li key={idx} className="stock-filter-dropdown-item" onClick={() => this.selectOrderFilterProduct(name)}>
                                                        {name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="stock-filter-field">
                                    <label>Location</label>
                                    <div className="stock-filter-dropdown" ref={this.orderFilterLocationDropdownRef}>
                                        <input
                                            type="text"
                                            placeholder="Search location..."
                                            value={this.state.orderFilterLocation}
                                            onChange={e => this.setState({ orderFilterLocation: e.target.value, orderFilterLocationDropdownOpen: true })}
                                            onFocus={() => this.setState({ orderFilterLocationDropdownOpen: true })}
                                        />
                                        {this.state.orderFilterLocationDropdownOpen && this.getOrderFilterLocationOptions().length > 0 && (
                                            <ul className="stock-filter-dropdown-list">
                                                {this.getOrderFilterLocationOptions().map((loc, idx) => (
                                                    <li key={idx} className="stock-filter-dropdown-item" onClick={() => this.selectOrderFilterLocation(loc)}>
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
                                        value={this.state.orderFilterDateFrom}
                                        onChange={e => this.setState({ orderFilterDateFrom: e.target.value })}
                                    />
                                </div>
                                <div className="stock-filter-field">
                                    <label>Date To</label>
                                    <input
                                        type="text"
                                        placeholder="DD/MM/YYYY"
                                        value={this.state.orderFilterDateTo}
                                        onChange={e => this.setState({ orderFilterDateTo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {this.getLocationStockRecords().length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                                <button className="stock-export-btn" onClick={this.exportToExcel}>
                                    Export
                                </button>
                            </div>
                        )}
                        {isLoading ? (
                            <div className="inventory-loading">
                                <i className="fas fa-spinner fa-spin"></i>
                                <p>Loading records...</p>
                            </div>
                        ) : this.getLocationStockRecords().length === 0 ? (
                            <div className="inventory-empty-state">
                                <i className="fas fa-clipboard-list"></i>
                                <h3>No Records Found</h3>
                                <p>No order records have been recorded for any location yet.</p>
                            </div>
                        ) : (
                            <div className="inventory-records-grid-container ag-theme-inventory" style={{ height: '500px', width: '100%' }}>
                                <AgGridReact
                                    columnDefs={this.columnDefs}
                                    rowData={this.getFilteredOrderRecords()}
                                    pagination={true}
                                    paginationPageSize={this.getFilteredOrderRecords().length}
                                    paginationPageSizeSelector={[25, 50, 100, 200, this.getFilteredOrderRecords().length]}
                                    domLayout="normal"
                                    onGridReady={this.onGridReady}
                                    headerHeight={40}
                                    rowHeight={36}
                                />
                            </div>
                        )}
                    </div>
                )}
                {/* Stock Adjustment Modal */}
                {this.state.showIncomingModal && (
                    <div className="stock-modal-overlay" onClick={this.closeIncomingModal}>
                        <div className="stock-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="stock-modal-header">
                                <h3>Stock Adjustment</h3>
                            </div>
                            <div className="stock-modal-body">
                                <form id="incoming-stock-form" className="stock-modal-form" onSubmit={this.handleIncomingSubmit}>
                                    <div className="stock-modal-field">
                                        <label>Action</label>
                                        <div className="incoming-dropdown" ref={this.actionDropdownRef}>
                                            <input
                                                type="text"
                                                className="incoming-dropdown-input"
                                                value={this.state.incomingForm.action}
                                                onFocus={() => this.setState({ actionDropdownOpen: true })}
                                                readOnly
                                                required
                                                style={{ cursor: 'pointer' }}
                                                placeholder="Please select one"
                                            />
                                            {this.state.actionDropdownOpen && (
                                                <ul className="incoming-dropdown-list">
                                                    {ALL_STOCK_ACTIONS.map((item, idx) => {
                                                        if (item.type === 'divider') {
                                                            return <li key={`div-${idx}`} className="incoming-dropdown-divider" />;
                                                        }
                                                        const opt = item.label;
                                                        return (
                                                            <li key={idx} className="incoming-dropdown-item" onClick={() => {
                                                                this.handleIncomingFormChange('action', opt);
                                                                this.handleIncomingFormChange('reason', '');
                                                                this.handleIncomingFormChange('variant', '');
                                                                // Auto-set locations for specific actions
                                                                const isColorProduct = this.hasColorVariations(this.state.incomingForm.product);
                                                                if (opt === 'Purchase From Supplier') {
                                                                    this.handleIncomingFormChange('locationFrom', 'Supplier');
                                                                    this.handleIncomingFormChange('locationTo', 'Store');
                                                                } else if (opt === 'Return to Supplier') {
                                                                    this.handleIncomingFormChange('locationFrom', 'Store');
                                                                    this.handleIncomingFormChange('locationTo', 'Supplier');
                                                                } else if (opt === 'Allocation To Site') {
                                                                    this.handleIncomingFormChange('locationFrom', 'Store');
                                                                    if (isColorProduct) {
                                                                        this.handleIncomingFormChange('locationTo', 'CT Hub');
                                                                    } else {
                                                                        this.handleIncomingFormChange('locationTo', '');
                                                                    }
                                                                } else if (opt === 'Return Stock to Store') {
                                                                    this.handleIncomingFormChange('locationTo', 'Store');
                                                                    if (isColorProduct) {
                                                                        this.handleIncomingFormChange('locationFrom', 'CT Hub');
                                                                    } else {
                                                                        this.handleIncomingFormChange('locationFrom', '');
                                                                    }
                                                                } else {
                                                                    this.handleIncomingFormChange('locationFrom', '');
                                                                    this.handleIncomingFormChange('locationTo', '');
                                                                }
                                                                this.setState({ actionDropdownOpen: false, uploadedFile: null });
                                                            }}>
                                                                {opt}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    {this.state.incomingForm.action === 'Purchase From Supplier' && (
                                        <div className="stock-modal-field">
                                            <label>Upload Document</label>
                                            <div
                                                className={`stock-upload-dropzone${this.state.isDragging ? ' dragging' : ''}`}
                                                onDrop={this.handleFileDrop}
                                                onDragOver={this.handleDragOver}
                                                onDragLeave={this.handleDragLeave}
                                                onClick={() => this.fileInputRef && this.fileInputRef.click()}
                                                style={{
                                                    border: '2px dashed #ccc',
                                                    borderRadius: '8px',
                                                    padding: '20px',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    backgroundColor: this.state.isDragging ? '#e8f4fd' : '#fafafa',
                                                    transition: 'background-color 0.2s',
                                                    borderColor: this.state.isDragging ? '#2196F3' : '#ccc'
                                                }}
                                            >
                                                <input
                                                    type="file"
                                                    ref={(ref) => this.fileInputRef = ref}
                                                    onChange={this.handleFileSelect}
                                                    style={{ display: 'none' }}
                                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                                                />
                                                {this.state.uploadedFile ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                                        <i className="fas fa-file" style={{ color: '#2196F3', fontSize: '1.2rem' }}></i>
                                                        <span style={{ fontWeight: '500' }}>{this.state.uploadedFile.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                this.setState({ uploadedFile: null });
                                                            }}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#e74c3c',
                                                                cursor: 'pointer',
                                                                fontSize: '1.1rem',
                                                                padding: '2px 6px'
                                                            }}
                                                        >
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', color: '#aaa', marginBottom: '8px' }}></i>
                                                        <p style={{ margin: '0', color: '#888', fontSize: '0.9rem' }}>Drag & drop a file here, or click to browse</p>
                                                        <p style={{ margin: '4px 0 0', color: '#bbb', fontSize: '0.8rem' }}>PDF, Images, Word, Excel</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="stock-modal-field">
                                        <label>Product</label>
                                        <div className="incoming-dropdown" ref={this.productDropdownRef}>
                                            <input
                                                type="text"
                                                className="incoming-dropdown-input"
                                                value={this.state.incomingForm.product}
                                                onChange={(e) => {
                                                    this.handleIncomingFormChange('product', e.target.value);
                                                    this.setState({ productDropdownOpen: true });
                                                }}
                                                onFocus={() => this.setState({ productDropdownOpen: true })}
                                                placeholder="Enter product"
                                                required
                                            />
                                            {this.state.productDropdownOpen && this.getFilteredProducts().length > 0 && (
                                                <ul className="incoming-dropdown-list">
                                                    {this.getFilteredProducts().map((name, idx) => (
                                                        <li key={idx} className="incoming-dropdown-item" onClick={() => this.selectProduct(name)}>
                                                            {name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    {/* Variant dropdown for color-based products */}
                                    {this.hasColorVariations(this.state.incomingForm.product) && (
                                        <div className="stock-modal-field">
                                            <label>Variant</label>
                                            <div className="incoming-dropdown" ref={this.variantDropdownRef}>
                                                <input
                                                    type="text"
                                                    className="incoming-dropdown-input"
                                                    value={this.state.incomingForm.variant}
                                                    onFocus={() => this.setState({ variantDropdownOpen: true })}
                                                    readOnly
                                                    required
                                                    style={{ cursor: 'pointer' }}
                                                    placeholder="Select variant"
                                                />
                                                {this.state.variantDropdownOpen && (
                                                    <ul className="incoming-dropdown-list">
                                                        {this.getProductVariants(this.state.incomingForm.product).map((v, idx) => (
                                                            <li key={idx} className="incoming-dropdown-item" onClick={() => {
                                                                this.handleIncomingFormChange('variant', v);
                                                                this.setState({ variantDropdownOpen: false });
                                                            }}>
                                                                {v}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="stock-modal-field">
                                        <label>Location From</label>
                                        <div className="incoming-dropdown" ref={this.locationFromDropdownRef}>
                                            <input
                                                type="text"
                                                className="incoming-dropdown-input"
                                                value={this.state.incomingForm.locationFrom}
                                                onFocus={() => this.setState({ locationFromDropdownOpen: true })}
                                                readOnly
                                                required
                                                style={{ cursor: 'pointer' }}
                                                placeholder="Select location"
                                            />
                                            {this.state.locationFromDropdownOpen && (
                                                <ul className="incoming-dropdown-list">
                                                    {['Supplier', 'Store', ...this.getFilteredLocations().filter(l => l !== 'Supplier' && l !== 'Store')].map((loc, idx) => (
                                                        <li key={idx} className="incoming-dropdown-item" onClick={() => {
                                                            this.handleIncomingFormChange('locationFrom', loc);
                                                            this.setState({ locationFromDropdownOpen: false });
                                                        }}>
                                                            {loc}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Location To</label>
                                        <div className="incoming-dropdown" ref={this.locationToDropdownRef}>
                                            <input
                                                type="text"
                                                className="incoming-dropdown-input"
                                                value={this.state.incomingForm.locationTo}
                                                onFocus={() => this.setState({ locationToDropdownOpen: true })}
                                                readOnly
                                                required
                                                style={{ cursor: 'pointer' }}
                                                placeholder="Select location"
                                            />
                                            {this.state.locationToDropdownOpen && (
                                                <ul className="incoming-dropdown-list">
                                                    {['Supplier', 'Store', ...this.getFilteredLocations().filter(l => l !== 'Supplier' && l !== 'Store')].map((loc, idx) => (
                                                        <li key={idx} className="incoming-dropdown-item" onClick={() => {
                                                            this.handleIncomingFormChange('locationTo', loc);
                                                            this.setState({ locationToDropdownOpen: false });
                                                        }}>
                                                            {loc}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            value={this.state.incomingForm.date}
                                            onChange={(e) => this.handleIncomingFormChange('date', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Time</label>
                                        <input
                                            type="time"
                                            value={this.state.incomingForm.time}
                                            onChange={(e) => this.handleIncomingFormChange('time', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Quantity</label>
                                        <input
                                            type="text"
                                            value={this.state.incomingForm.quantity}
                                            onChange={(e) => this.handleIncomingFormChange('quantity', e.target.value)}
                                            placeholder="Enter quantity"
                                            required
                                        />
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Updated By</label>
                                        <input
                                            type="text"
                                            value={this.state.incomingForm.updatedBy}
                                            onChange={(e) => this.handleIncomingFormChange('updatedBy', e.target.value)}
                                            placeholder="Enter name"
                                            required
                                        />
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Reason</label>
                                        <input
                                            type="text"
                                            className="incoming-dropdown-input"
                                            value={this.state.incomingForm.reason}
                                            onChange={(e) => this.handleIncomingFormChange('reason', e.target.value)}
                                            placeholder="Enter reason"
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="stock-modal-footer">
                                <button type="button" className="stock-modal-cancel" onClick={this.closeIncomingModal} disabled={this.state.isSubmitting}>Cancel</button>
                                <button type="submit" form="incoming-stock-form" className="stock-modal-submit" disabled={this.state.isSubmitting}>
                                    {this.state.isSubmitting ? (
                                        <><span className="spinner" style={{
                                            display: 'inline-block',
                                            width: '14px',
                                            height: '14px',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTop: '2px solid #fff',
                                            borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite',
                                            marginRight: '8px',
                                            verticalAlign: 'middle'
                                        }} /> Submitting...</>
                                    ) : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }
}

export default InventoryRecords;
