import { generateReceipt } from './inventoryServiceHelpers';

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
        valueGetter: (params) => params.data?.receiptNumber ? 'Sold' : 'Balance'
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
        headerName: 'Variant', 
        field: 'variant', 
        width: 150,
        valueGetter: (params) => params.data?.variant || '',
    },
    { 
        headerName: 'Location From', 
        field: 'locationFrom', 
        width: 400,
        valueGetter: (params) => params.data?.locationFrom || '',
    },
    { 
        headerName: 'Location To', 
        field: 'locationTo', 
        width: 400,
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
