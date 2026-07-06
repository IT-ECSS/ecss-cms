import axios from 'axios';
import * as XLSX from 'xlsx';

/**
 * Compute autofit column widths for a SheetJS worksheet from the row data.
 * Returns an array suitable for worksheet['!cols'] so each column sizes to its
 * widest cell (header included), with a little padding.
 */
const computeAutoFitColumns = (rows) => {
    if (!rows || rows.length === 0) return [];
    const keys = Object.keys(rows[0]);
    return keys.map(key => {
        let maxLen = String(key).length;
        rows.forEach(row => {
            const val = row[key] == null ? '' : String(row[key]);
            if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: maxLen + 2 }; // +2 padding
    });
};

/**
 * Generate and download receipt PDF
 */
export const generateReceipt = async (record) => {
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

/**
 * Export stock records to Excel
 */
export const exportStockToExcel = (stockRecords) => {
    if (!stockRecords || stockRecords.length === 0) {
        alert('No records to export');
        return;
    }

    // Resolve a single meaningful Location from locationFrom / locationTo.
    // We only surface the known inventory locations and prefer the site over the
    // central Store (e.g. an allocation Store -> CT Hub shows "CT Hub").
    const KNOWN_LOCATIONS = ['Store', 'CT Hub', 'Pasir Ris West Wellness Centre', 'Tampines North Community Centre'];
    const resolveLocation = (r) => {
        const from = (r.locationFrom || '').trim();
        const to = (r.locationTo || '').trim();
        const isKnown = (l) => KNOWN_LOCATIONS.some(k => k.toLowerCase() === l.toLowerCase());
        const candidates = [to, from].filter(l => l && isKnown(l));
        const site = candidates.find(l => l.toLowerCase() !== 'store');
        return site || candidates[0] || (r.location || '').trim() || from || to || '';
    };

    const exportData = stockRecords.map((r, i) => ({
        'S/N': i + 1,
        'Action': r.action || '',
        'Product': r.product || '',
        'Location': resolveLocation(r),
        'Date': r.date || r.orderDate || '',
        'Time': r.time || r.orderTime || '',
        'Quantity': r.quantity || '',
        'Reason': r.reason || '',
        'Updated By': r.updatedBy || r.staffName || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    // Autofit column widths to content and give rows a comfortable height so all
    // characters are fully visible.
    ws['!cols'] = computeAutoFitColumns(exportData);
    ws['!rows'] = [{ hpt: 20 }, ...exportData.map(() => ({ hpt: 18 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Records');
    XLSX.writeFile(wb, `Stock_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Export order records to Excel
 */
export const exportOrderToExcel = (enrichedRecords) => {
    if (!enrichedRecords || enrichedRecords.length === 0) {
        alert('No records to export');
        return;
    }

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
    // Autofit column widths to content and give rows a comfortable height so all
    // characters are fully visible.
    ws['!cols'] = computeAutoFitColumns(exportData);
    ws['!rows'] = [{ hpt: 20 }, ...exportData.map(() => ({ hpt: 18 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Order Records');
    XLSX.writeFile(wb, `Order_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Handle incoming stock adjustment form submission
 */
export const handleIncomingSubmit = async (incomingForm, uploadedFile, onSuccess, onError) => {
    try {
        if (!incomingForm.product || !incomingForm.date || !incomingForm.time || !incomingForm.quantity || !incomingForm.updatedBy) {
            alert('Please fill in all fields.');
            return false;
        }

        // For Initial Stock, locationFrom is not required; for others it is
        if (incomingForm.action !== 'Initial Stock' && !incomingForm.locationFrom) {
            alert('Please select Location From.');
            return false;
        }

        if (!incomingForm.locationTo) {
            alert('Please select Location To.');
            return false;
        }

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
            if (uploadedFile) {
                try {
                    const formData = new FormData();
                    formData.append('file', uploadedFile);
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const safeProduct = (incomingForm.product || 'product').replace(/[^a-zA-Z0-9_\- ]/g, '_');
                    const filename = `${incomingForm.action}_${safeProduct}_${timestamp}_${uploadedFile.name}`;
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
                    // Wait for WooCommerce to fully propagate changes before refreshing frontend
                    console.log('[DEBUG] Waiting for WooCommerce to propagate changes (2 seconds)...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    console.log('[DEBUG] WooCommerce propagation complete');
                } else {
                    console.error('WooCommerce stock update failed:', wooResponse.data.error);
                }
            } catch (wooError) {
                console.error('Error updating WooCommerce stock:', wooError);
            }

            // Call success callback to refresh frontend data
            if (onSuccess) {
                await onSuccess();
            }
            return true;
        } else {
            alert(response.data.error || 'Failed to insert stock record.');
            return false;
        }
    } catch (error) {
        console.error('Error inserting stock record:', error);
        if (onError) {
            onError(error);
        }
        alert('Failed to insert stock record. Please try again.');
        return false;
    }
};
