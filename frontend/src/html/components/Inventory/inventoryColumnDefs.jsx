import { generateReceipt, confirmStockRecord } from './inventoryServiceHelpers';

// Parse a stored date string into a comparable timestamp. Records use two
// formats: ISO "YYYY-MM-DD" and localised "D/M/Y" (e.g. "30/4/26"). Returns a
// numeric epoch value so sorting is always chronological regardless of format.
const parseRecordDate = (value) => {
    if (!value) return null;
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
    if (iso) {
        return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
    }
    const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(value);
    if (dmy) {
        let year = Number(dmy[3]);
        if (year < 100) year += 2000; // "26" -> 2026
        return new Date(year, Number(dmy[2]) - 1, Number(dmy[1])).getTime();
    }
    const fallback = Date.parse(value);
    return Number.isNaN(fallback) ? null : fallback;
};

// AG Grid comparator that sorts Date columns by actual chronological order.
const dateComparator = (a, b) => {
    const ta = parseRecordDate(a);
    const tb = parseRecordDate(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return -1;
    if (tb === null) return 1;
    return ta - tb;
};

export const orderColumnDefs = [
    { 
        headerName: 'S/N', 
        valueGetter: (params) => params.node.rowIndex + 1,  
        width: 100, 
        pinned: 'left',
    },
    { 
        headerName: 'Status',
        width: 120,
        valueGetter: (params) => params.data?.receiptNumber ? 'Sold' : 'Balance',
        pinned: 'left'
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
        headerName: 'Location', 
        field: 'location', 
        width: 400,
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
        comparator: dateComparator,
        valueFormatter: (params) => {
            if (!params.value) return '';
            const parts = params.value.split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return params.value;
        }
    },
    { 
        headerName: 'Time', 
        valueGetter: (params) => params.data?.time || params.data?.orderTime || '',
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
        valueGetter: (params) => params.data?.updatedBy || params.data?.staffName || '',
    },
    { 
        headerName: 'Receipt Number', 
        field: 'receiptNumber', 
        width: 400,
        pinned: 'right',
        cellRenderer: (params) => {
            return (
                <span
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        generateReceipt(params.data);
                    }}
                >
                    {params.data.receiptNumber}
                </span>
            );
        }
    }
];

export const stockColumnDefs = [
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
        headerName: 'Location From', 
        field: 'locationFrom', 
        width: 500,
        valueGetter: (params) => params.data?.locationFrom || '',
    },
    { 
        headerName: 'Location To', 
        field: 'locationTo', 
        width: 500,
        valueGetter: (params) => params.data?.locationTo || params.data?.location || '',
    },
    { 
        headerName: 'Date', 
        width: 150,
        valueGetter: (params) => params.data?.date || params.data?.orderDate || '',
        comparator: dateComparator,
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
    {
        headerName: 'Confirm',
        field: 'confirmed',
        width: 180,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params) => {
            // Confirm button only applies to Sales entries
            if (params.data?.action !== 'Sales') {
                return null;
            }
            if (params.data?.confirmed) {
                return (
                    <span className="stock-confirmed-badge">
                        Confirmed
                    </span>
                );
            }
            return (
                <button
                    type="button"
                    className="stock-confirm-btn"
                    disabled={params.data?.__confirming}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        if (params.data?.__confirming) return;
                        params.data.__confirming = true;
                        params.api.refreshCells({ rowNodes: [params.node], force: true, columns: ['confirmed'] });
                        if (params.context?.showSuccessPopup) {
                            params.context.showSuccessPopup('Confirming sale...');
                        }
                        confirmStockRecord(params.data, (success) => {
                            params.data.__confirming = false;
                            if (success) {
                                params.data.confirmed = true;
                                if (params.context?.showSuccessPopup) {
                                    params.context.showSuccessPopup('Sales confirmed successfully. WooCommerce stock updated.');
                                }
                            } else if (params.context?.showErrorPopup) {
                                params.context.showErrorPopup('Failed to confirm sale. Please try again.');
                            }
                            params.api.refreshCells({ rowNodes: [params.node], force: true, columns: ['confirmed'] });
                            // Refresh stock records + WooCommerce products so the
                            // product summary cards (Balance/Sold/pending bracket)
                            // update immediately, not just this grid cell.
                            if (success && params.context?.onConfirmed) {
                                params.context.onConfirmed();
                            }
                        });
                    }}
                >
                    {params.data?.__confirming ? 'Confirming...' : 'Confirm'}
                </button>
            );
        }
    },
];
