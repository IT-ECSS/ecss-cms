import React from 'react';
import axios from 'axios';
import '../../../css/sub/bulkUpdateModalForFundraising.css';

class BulkUpdateModalForFundraising extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isProcessing: false,
      processingStatus: {
        downloading: false,
        uploading: false,
        updating: false
      },
      downloadCount: 0,
      uploadCount: 0,
      downloadSuccess: false,
      uploadSuccess: false,
      errorMessage: '',
      isFinished: false,
      showStatusDropdown: false,
      statusOptions: ['Pending', 'Paid', 'Collected', 'Delivered', 'Cancelled', 'Refunded'],
      processingType: 'receipts', // 'receipts' or 'invoices' or 'status'
      currentStatus: '',
      selectedStatusValue: '',
      wooCommerceProductDetails: props.wooCommerceProductDetails || []
    };
  }

  // Update state when props change
  componentDidUpdate(prevProps) {
    if (prevProps.wooCommerceProductDetails !== this.props.wooCommerceProductDetails) {
      this.setState({
        wooCommerceProductDetails: this.props.wooCommerceProductDetails || []
      });
    }
  }

  // Prepare enriched receipt data with all details
  prepareReceiptData = (row) => {
    // Process items with pricing information
    const processedItems = (row.items || []).map((item) => {
      const itemName = item.productName || item.name || item.itemName;
      const quantity = item.quantity || 1;
      
      let unitPrice = 0;
      let subtotal = 0;
      
      if (item.enrichedData && item.enrichedData.subtotal > 0) {
        unitPrice = item.enrichedData.finalPrice || 0;
        subtotal = item.enrichedData.subtotal;
      } else if (item.wooCommerceDetails) {
        unitPrice = parseFloat(item.wooCommerceDetails.price) || 0;
        subtotal = unitPrice * quantity;
      } else {
        unitPrice = item.price || item.unitPrice || 0;
        subtotal = unitPrice * quantity;
      }
      
      return {
        ...item,
        productName: itemName,
        quantity: quantity,
        price: unitPrice,
        unitPrice: unitPrice,
        subtotal: subtotal
      };
    });

    // Calculate total amount
    let totalAmount = 0;
    if (row.enrichedTotalPrice && row.enrichedTotalPrice > 0) {
      totalAmount = row.enrichedTotalPrice;
    } else if (row.donationAmount) {
      const amountStr = row.donationAmount.toString().replace(/[\$,]/g, '');
      totalAmount = parseFloat(amountStr) || 0;
    } else if (processedItems.length > 0) {
      totalAmount = processedItems.reduce((total, item) => total + (item.subtotal || 0), 0);
    }

    // Create subtotal information structure
    const subtotalInfo = {
      items: processedItems.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice || item.price || 0,
        subtotal: item.subtotal || 0,
        matchType: item.enrichedData?.matchType || 'manual'
      })),
      totalSubtotal: totalAmount,
      enrichedTotalPrice: totalAmount,
      originalTotalPrice: totalAmount
    };

    return {
      _id: row.id,
      personalInfo: {
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.contactNumber,
        email: row.email,
        address: row.address,
        postalCode: row.postalCode
      },
      items: processedItems,
      totalPrice: totalAmount,
      donationAmount: totalAmount,
      paymentMethod: row.paymentMethod,
      paymentDetails: {
        paymentMethod: row.paymentMethod
      },
      collectionMode: row.collectionMode,
      collectionDeliveryLocation: row.collectionDeliveryLocation,
      collectionDate: row.collectionDate,
      collectionTime: row.collectionTime,
      collectionDetails: {
        collectionMode: row.collectionMode,
        CollectionDeliveryLocation: row.collectionDeliveryLocation,
        collectionDate: row.collectionDate,
        collectionTime: row.collectionTime,
        ...(row.collectionDetails || {})
      },
      status: row.status,
      receiptNumber: row.receiptNumber,
      subtotalInfo: subtotalInfo
    };
  };

  // New function: Download receipts as zipped file from backend
  downloadReceiptsAsZip = async (selectedRows) => {
    try {
      // Filter rows that have receipt numbers
      const validRows = selectedRows.filter(row => row.receiptNumber);
      
      if (validRows.length === 0) {
        this.setState({ errorMessage: 'No rows with valid receipt numbers found' });
        return;
      }

      console.log('Preparing to download receipts as zip for rows:', validRows);
      
      // Update state - downloading started
      this.setState((prevState) => ({
        processingStatus: { ...prevState.processingStatus, downloading: true },
        downloadCount: validRows.length
      }));

      // Prepare data to send to backend with enriched information
      const receiptsData = validRows.map(row => this.prepareReceiptData(row));

      // Send to backend to generate and zip receipts
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
        {
          purpose: 'bulkDownloadReceipts',
          receipts: receiptsData
        },
        {
          responseType: 'blob'
        }
      );

      // Create blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipts-${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('Receipts downloaded successfully as zip');
      
      // Update state - download complete
      this.setState((prevState) => ({
        processingStatus: { ...prevState.processingStatus, downloading: false },
        downloadSuccess: true
      }));
    } catch (error) {
      console.error('Error downloading receipts as zip:', error);
      this.setState({ 
        errorMessage: 'Error downloading receipts. Please try again.',
        processingStatus: { downloading: false, uploading: false }
      });
    }
  };

  // Preview single receipt in new tab
  previewReceipt = async (row) => {
    try {
      if (!row.receiptNumber) {
        alert('Receipt number not found');
        return;
      }

      console.log('Previewing receipt for row:', row);

      // Prepare enriched receipt data
      const orderData = this.prepareReceiptData(row);
      console.log('Prepared order data for receipt:', orderData);

      // Call backend to generate receipt
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
        {
          purpose: "generateReceipt",
          ...orderData
        }
      );

      console.log('Receipt preview response:', response.data);

      if (response.data.result && response.data.result.pdfData) {
        const pdfData = response.data.result.pdfData;
        const pdfFilename = response.data.result.pdfFilename || `receipt-${row.receiptNumber}.pdf`;
        
        // Convert base64 to binary data
        const binaryString = atob(pdfData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create a Blob from the binary data
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        // Create a Blob URL and open in new tab
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        
        // Auto download the PDF with the custom filename
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = pdfFilename;
        downloadLink.click();
      } else {
        console.error('Invalid response structure:', response.data);
        alert('Failed to generate receipt preview: Invalid response from server');
      }
    } catch (error) {
      console.error('Error previewing receipt:', error);
      alert('Error previewing receipt: ' + (error.response?.data?.message || error.message));
    }
  };

  handleDownloadReceipts = async () => {
    const { onClose, selectedRows } = this.props;
    console.log('handleDownloadReceipts called with selectedRows:', selectedRows);
    if (!selectedRows || selectedRows.length === 0) {
      alert('No receipts selected');
      return;
    }
    
    // Set processing state
    this.setState({
      isProcessing: true,
      processingStatus: { downloading: true, uploading: false },
      downloadCount: 0,
      uploadCount: 0,
      downloadSuccess: false,
      uploadSuccess: false,
      errorMessage: '',
      isFinished: false,
      processingType: 'receipts'
    });
    
    try {
      // Download and upload in parallel
      await Promise.all([
        this.downloadReceiptsAsZip(selectedRows),
        this.uploadReceiptsToGoogleDrive(selectedRows)
      ]);
      
      // Mark as completed
      this.setState({
        isProcessing: false,
        processingStatus: { downloading: false, uploading: false },
        isFinished: true
      });
    } catch (error) {
      console.error('Error in handleDownloadReceipts:', error);
      this.setState({
        isProcessing: false,
        errorMessage: error.message || 'An error occurred',
        isFinished: true
      });
    }
  };

  uploadReceiptsToGoogleDrive = async (selectedRows) => {
    try {
      const validRows = selectedRows.filter(r => r.receiptNumber);
      
      if (validRows.length === 0) {
        this.setState({ errorMessage: 'No receipts available to upload' });
        return;
      }

      console.log(`Uploading ${validRows.length} receipts to Google Drive...`);
      
      // Update state - uploading started
      this.setState((prevState) => ({
        processingStatus: { ...prevState.processingStatus, uploading: true },
        uploadCount: validRows.length
      }));

      let successCount = 0;
      let failureCount = 0;

      // Upload each receipt individually
      for (const row of validRows) {
        try {
          // Generate receipt PDF
          const orderData = this.prepareReceiptData(row);
          const response = await axios.post(
            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
            {
              purpose: "generateReceipt",
              ...orderData
            }
          );

          if (response.data.result && response.data.result.pdfData) {
            const pdfData = response.data.result.pdfData;
            let pdfFilename = response.data.result.pdfFilename || `receipt-${row.receiptNumber}.pdf`;
            
            // Keep the original filename from backend (which includes the receipt number with slashes)
            // The backend will use the receipt number as-is: ECSS/Panettone/001/25
            
            // Convert base64 to binary
            const binaryString = atob(pdfData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: 'application/pdf' });
            
            // Upload to Google Drive
            const uploadFormData = new FormData();
            uploadFormData.append('file', blob, pdfFilename);
            uploadFormData.append('purpose', 'upload-to-google-drive');
            uploadFormData.append('filename', pdfFilename);
            uploadFormData.append('fileType', 'receipt');
            
            const uploadResponse = await axios.post(
              `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
              uploadFormData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data'
                }
              }
            );
            
            if (uploadResponse.data.success) {
              console.log(`✓ Uploaded: ${pdfFilename}`);
              successCount++;
            } else {
              console.warn(`✗ Failed to upload: ${pdfFilename}`);
              failureCount++;
            }
          }
        } catch (receiptError) {
          console.error(`Error uploading receipt ${row.receiptNumber}:`, receiptError);
          failureCount++;
        }
      }

      console.log(`Bulk upload complete: ${successCount} succeeded, ${failureCount} failed`);
      
      // Update state - upload complete
      this.setState((prevState) => ({
        processingStatus: { ...prevState.processingStatus, uploading: false },
        uploadSuccess: true
      }));
    } catch (error) {
      console.error('Error uploading receipts to Google Drive:', error);
      this.setState({ 
        errorMessage: 'Error uploading receipts. Please try again.',
        processingStatus: { downloading: false, uploading: false }
      });
    }
  };

  downloadInvoicesAsZip = async (selectedRows) => {
    try {
      // Filter rows that have invoice numbers
      const validRows = selectedRows.filter(row => row.invoiceNumber);
      
      if (validRows.length === 0) {
        this.setState({ errorMessage: 'No rows with valid invoice numbers found' });
        return;
      }

      console.log('Preparing to download invoices as zip for rows:', validRows);
      
      // Update state - downloading started
      this.setState((prevState) => ({
        processingStatus: { ...prevState.processingStatus, downloading: true },
        downloadCount: validRows.length
      }));

      // Prepare data to send to backend with enriched information
      const invoicesData = validRows.map(row => ({
        ...this.prepareReceiptData(row),
        invoiceNumber: row.invoiceNumber
      }));

      // Send to backend to generate and zip invoices
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
        {
          purpose: 'bulkDownloadInvoices',
          invoices: invoicesData
        },
        {
          responseType: 'blob'
        }
      );

      // Create blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('Invoices downloaded successfully as zip');
      
      // Update state - download complete
      this.setState((prevState) => ({
        processingStatus: { ...prevState.processingStatus, downloading: false },
        downloadSuccess: true
      }));
    } catch (error) {
      console.error('Error downloading invoices as zip:', error);
      this.setState({ 
        errorMessage: 'Error downloading invoices. Please try again.',
        processingStatus: { downloading: false, uploading: false }
      });
    }
  };

  uploadInvoicesToGoogleDrive = async (selectedRows) => {
    try {
      const validRows = selectedRows.filter(r => r.invoiceNumber);
      
      if (validRows.length === 0) {
        this.setState({ errorMessage: 'No invoices available to upload' });
        return;
      }

      console.log(`Uploading ${validRows.length} invoices to Google Drive...`);
      
      // Update state - uploading started
      this.setState((prevState) => ({
        processingStatus: { ...prevState.processingStatus, uploading: true },
        uploadCount: validRows.length
      }));

      let successCount = 0;
      let failureCount = 0;

      // Upload each invoice individually
      for (const row of validRows) {
        try {
          // Generate invoice PDF
          const orderData = {
            ...this.prepareReceiptData(row),
            invoiceNumber: row.invoiceNumber
          };
          const response = await axios.post(
            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
            {
              purpose: "generateInvoice",
              ...orderData
            }
          );

          if (response.data.result && response.data.result.pdfData) {
            const pdfData = response.data.result.pdfData;
            let pdfFilename = response.data.result.pdfFilename || `invoice-${row.invoiceNumber}.pdf`;
            
            // Convert base64 to binary
            const binaryString = atob(pdfData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: 'application/pdf' });
            
            // Upload to Google Drive
            const uploadFormData = new FormData();
            uploadFormData.append('file', blob, pdfFilename);
            uploadFormData.append('purpose', 'upload-to-google-drive');
            uploadFormData.append('filename', pdfFilename);
            uploadFormData.append('fileType', 'invoice');
            
            const uploadResponse = await axios.post(
              `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
              uploadFormData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data'
                }
              }
            );
            
            if (uploadResponse.data.success) {
              console.log(`✓ Uploaded: ${pdfFilename}`);
              successCount++;
            } else {
              console.warn(`✗ Failed to upload: ${pdfFilename}`);
              failureCount++;
            }
          }
        } catch (invoiceError) {
          console.error(`Error uploading invoice ${row.invoiceNumber}:`, invoiceError);
          failureCount++;
        }
      }

      console.log(`Bulk upload complete: ${successCount} succeeded, ${failureCount} failed`);
      
      // Update state - upload complete
      this.setState((prevState) => ({
        processingStatus: { ...prevState.processingStatus, uploading: false },
        uploadSuccess: true
      }));
    } catch (error) {
      console.error('Error uploading invoices to Google Drive:', error);
      this.setState({ 
        errorMessage: 'Error uploading invoices. Please try again.',
        processingStatus: { downloading: false, uploading: false }
      });
    }
  };

  handleUploadToGoogleDrive = async () => {
    const { onClose, selectedRows } = this.props;
    if (!selectedRows || selectedRows.length === 0) {
      alert('No receipts selected');
      return;
    }
    await this.uploadReceiptsToGoogleDrive(selectedRows);
    onClose();
  };

  handleDownloadInvoices = async () => {
    const { onClose, selectedRows } = this.props;
    console.log('handleDownloadInvoices called with selectedRows:', selectedRows);
    if (!selectedRows || selectedRows.length === 0) {
      alert('No invoices selected');
      return;
    }
    
    // Set processing state
    this.setState({
      isProcessing: true,
      processingStatus: { downloading: true, uploading: false },
      downloadCount: 0,
      uploadCount: 0,
      downloadSuccess: false,
      uploadSuccess: false,
      errorMessage: '',
      isFinished: false,
      processingType: 'invoices'
    });
    
    try {
      // Download and upload in parallel
      await Promise.all([
        this.downloadInvoicesAsZip(selectedRows),
        this.uploadInvoicesToGoogleDrive(selectedRows)
      ]);
      
      // Mark as completed
      this.setState({
        isProcessing: false,
        processingStatus: { downloading: false, uploading: false },
        isFinished: true
      });
    } catch (error) {
      console.error('Error in handleDownloadInvoices:', error);
      this.setState({
        isProcessing: false,
        errorMessage: error.message || 'An error occurred',
        isFinished: true
      });
    }
  };

  handleStatusUpdate = async (newStatus) => {
    const { selectedRows } = this.props;
    
    console.log(`Updating status to ${newStatus} for ${selectedRows.length} rows`);
    
    if (!selectedRows || selectedRows.length === 0) {
      alert('No rows selected');
      return;
    }

    // Close dropdown
    this.setState({ showStatusDropdown: false });

    // Set processing state
    this.setState({
      isProcessing: true,
      processingStatus: { downloading: false, uploading: false, updating: true },
      errorMessage: '',
      isFinished: false,
      processingType: 'status',
      currentStatus: newStatus
    });

    try {
      let successCount = 0;
      let failureCount = 0;

      // Update status for each selected row
      for (const row of selectedRows) {
        try {
          // Get previous status for Cancelled status handler
          const previousStatus = row.status;

          // Handle stock changes based on status transition
          if (newStatus === 'Paid' && row.items && row.items.length > 0) {
            // Reduce stock when status changes to Paid
            for (const item of row.items) {
              await this.reduceWooCommerceStock(item, row);
            }
          }

          if (newStatus === 'Refunded' && row.items && row.items.length > 0) {
            // Increase stock when status changes to Refunded
            for (const item of row.items) {
              await this.increaseWooCommerceStock(item, row);
            }
          }

          if (newStatus === 'Cancelled' && previousStatus === 'Paid' && row.items && row.items.length > 0) {
            // Only increase stock if previous status was Paid
            for (const item of row.items) {
              await this.increaseWooCommerceStock(item, row);
            }
          }

          // Update the fundraising record in backend
          const response = await axios.post(
            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
            {
              purpose: 'update',
              _id: row.id,
              newStatus: newStatus,
              subtotalInfo: row.subtotalInfo || {}
            }
          );

          if (response.data.result && response.data.result.success) {
            console.log(`✓ Updated: ${row.id} to ${newStatus}`);
            
            // Generate receipt if status changed to "Paid"
            if (newStatus === 'Paid' && row.receiptNumber) {
              try {
                console.log(`Generating receipt for: ${row.id} with receipt number: ${row.receiptNumber}`);
                const orderData = this.prepareReceiptData(row);
                console.log('Order data prepared for receipt:', orderData);
                
                const receiptResponse = await axios.post(
                  `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
                  {
                    purpose: "generateReceipt",
                    ...orderData
                  }
                );

                console.log('Receipt response:', receiptResponse.data);
                
                if (receiptResponse.data.result && receiptResponse.data.result.pdfData) {
                  console.log(`✓ Receipt generated for: ${row.receiptNumber}`);
                } else if (receiptResponse.data.success) {
                  console.log(`✓ Receipt generated for: ${row.receiptNumber}`);
                } else {
                  console.warn(`✗ Failed to generate receipt for: ${row.receiptNumber}`);
                  console.warn('Receipt response:', receiptResponse.data);
                }
              } catch (receiptError) {
                console.error(`Error generating receipt for ${row.receiptNumber}:`, receiptError);
                console.error('Receipt error details:', receiptError.response?.data || receiptError.message);
              }
            } else if (newStatus === 'Paid') {
              console.warn(`Skipping receipt generation - receiptNumber not found for row: ${row.id}`);
            }
            
            successCount++;
          } else {
            console.warn(`✗ Failed to update: ${row.id}`);
            failureCount++;
          }
        } catch (updateError) {
          console.error(`Error updating row ${row.id}:`, updateError);
          failureCount++;
        }
      }

      console.log(`Bulk status update complete: ${successCount} succeeded, ${failureCount} failed`);

      // If status changed to "Paid", download receipts and upload to Google Drive
      if (newStatus === 'Paid') {
        console.log('Status changed to Paid - downloading receipts and uploading to Google Drive...');
        try {
          const paidRows = selectedRows.filter(row => row.receiptNumber);
          
          if (paidRows.length > 0) {
            // Download receipts as zip
            await this.downloadReceiptsAsZip(paidRows);
            
            // Upload receipts to Google Drive
            await this.uploadReceiptsToGoogleDrive(paidRows);
            
            console.log('✓ Receipts downloaded and uploaded successfully');
          }
        } catch (receiptError) {
          console.error('Error downloading/uploading receipts:', receiptError);
          failureCount++;
        }
      }

      console.log(`Bulk status update complete: ${successCount} succeeded, ${failureCount} failed`);

      // Mark as completed
      this.setState({
        isProcessing: false,
        isFinished: true,
        selectedStatusValue: '',
        showStatusDropdown: false,
        errorMessage: failureCount > 0 ? `${successCount} updated, ${failureCount} failed` : `All ${successCount} rows updated to ${newStatus}`
      });
    } catch (error) {
      console.error('Error in handleStatusUpdate:', error);
      this.setState({
        isProcessing: false,
        errorMessage: error.message || 'An error occurred',
        isFinished: true
      });
    }
  };

  // Reduce stock in WooCommerce for bulk operations
  reduceWooCommerceStock = async (item, orderData) => {
    try {
      const quantity = item.quantity || 1;
      const originalProductName = item.productName;
      
      // Get product ID from available data
      let productId = null;
      
      // Search in wooCommerceProductDetails state
      const { wooCommerceProductDetails } = this.state;
      console.log('WooCommerceProductDetails:', wooCommerceProductDetails);

      // Try exact match first - with null/undefined check
      let foundProduct = wooCommerceProductDetails && wooCommerceProductDetails.length > 0 
        ? wooCommerceProductDetails.find(product => 
            product.name === originalProductName
          )
        : null;
      
      if (foundProduct) {
        productId = foundProduct.id;
      }
  
      const requestPayload = {
        product_id: productId,
        method: "reduce",
        stock_quantity: quantity // Amount to reduce
      };
        
      console.log(`Reducing stock for "${originalProductName}" (Quantity: ${quantity})`);
      
      // Use Django endpoint for stock updates
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/update_fundraising_product_stock/`,
        requestPayload
      );
      
      console.log('Stock reduction response:', response.data);
      
      if (response.data.success) {
        console.log(`✓ Stock reduced successfully for "${originalProductName}" (Quantity: ${quantity})`);
      } else {
        console.error(`✗ Failed to reduce stock for product "${originalProductName}":`, response.data.error || response.data);
      }
        
    } catch (error) {
      console.error('Error calling stock reduction API:', error);
      console.error(`Error reducing stock for "${item.productName || item.name || item.itemName || 'Unknown product'}":`, error.message);
    }
  };

  // Increase stock in WooCommerce for bulk operations (refunded/cancelled orders)
  increaseWooCommerceStock = async (item, orderData) => {
    try {
      const quantity = item.quantity || 1;
      const originalProductName = item.productName;
      
      // Get product ID from available data
      let productId = null;
      
      // Search in wooCommerceProductDetails state
      const { wooCommerceProductDetails } = this.state;
      console.log('WooCommerceProductDetails:', wooCommerceProductDetails);

      // Try exact match first - with null/undefined check
      let foundProduct = wooCommerceProductDetails && wooCommerceProductDetails.length > 0 
        ? wooCommerceProductDetails.find(product => 
            product.name === originalProductName
          )
        : null;
      
      if (foundProduct) {
        productId = foundProduct.id;
      }
  
      const requestPayload = {
        product_id: productId,
        method: "increase", // Use "increase" to add stock back
        stock_quantity: quantity // Amount to increase
      };
      
      console.log(`Increasing stock for "${originalProductName}" (Quantity: ${quantity})`);
      
      // Use Django endpoint for stock updates
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/update_fundraising_product_stock/`,
        requestPayload
      );
      
      console.log('Stock increase response:', response.data);
      
      if (response.data.success) {
        console.log(`✓ Stock increased successfully for "${originalProductName}" (Quantity: ${quantity})`);
      } else {
        console.error(`✗ Failed to increase stock for product "${originalProductName}":`, response.data.error || response.data);
      }
        
    } catch (error) {
      console.error('Error calling stock increase API:', error);
      console.error(`Error increasing stock for "${item.productName || item.name || item.itemName || 'Unknown product'}":`, error.message);
    }
  };

  // Preview single invoice in new tab
  previewInvoice = async (row) => {
    try {
      if (!row.invoiceNumber) {
        alert('Invoice number not found');
        return;
      }

      console.log('Previewing invoice for row:', row);

      // Prepare enriched invoice data with same structure as receipt
      const orderData = this.prepareReceiptData(row);
      console.log('Prepared order data for invoice:', orderData);

      // Call backend to generate invoice
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
        {
          purpose: "generateInvoice",
          ...orderData
        }
      );

      console.log('Invoice preview response:', response.data);

      if (response.data.result && response.data.result.pdfData) {
        const pdfData = response.data.result.pdfData;
        const pdfFilename = response.data.result.pdfFilename || `invoice-${row.invoiceNumber}.pdf`;
        
        // Convert base64 to binary data
        const binaryString = atob(pdfData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create a Blob from the binary data
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        // Create a Blob URL and open in new tab
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        
        // Auto download the PDF with the custom filename
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = pdfFilename;
        downloadLink.click();
      } else {
        console.error('Invalid response structure:', response.data);
        alert('Failed to generate invoice preview: Invalid response from server');
      }
    } catch (error) {
      console.error('Error previewing invoice:', error);
      alert('Error previewing invoice: ' + (error.response?.data?.message || error.message));
    }
  };

  render() {
    const { 
      show, 
      selectedCount, 
      onClose, 
      selectedRows,
      onDownloadInvoices 
    } = this.props;
    
    const { isProcessing, processingStatus, downloadSuccess, uploadSuccess, errorMessage, isFinished, showStatusDropdown, statusOptions, processingType, currentStatus } = this.state;

    if (!show) return null;

    const documentType = processingType === 'invoices' ? 'Invoices' : 'Receipts';

    return (
      <div className="bulk-update-modal-overlay" onClick={isProcessing ? null : onClose}>
        <div 
          className="bulk-update-modal-content" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Title and Close Button */}
          <div className="bulk-update-modal-header-top">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
              <div>
                <h2 style={{ margin: '0', fontSize: '1.5rem' }}>Bulk Actions</h2>
              </div>
              <button 
                className="bulk-update-modal-close-btn" 
                onClick={onClose}
                title="Close modal"
                disabled={isProcessing}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  color: isProcessing ? '#ccc' : '#666',
                  padding: '0 4px',
                  opacity: isProcessing ? 0 : 1,
                  visibility: isProcessing ? 'hidden' : 'visible',
                  pointerEvents: isProcessing ? 'none' : 'auto'
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="bulk-update-modal-body">
            {isProcessing ? (
              // Loading/Processing State
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <h3>Processing...</h3>
                
                {/* Download Status */}
                {processingStatus.downloading !== undefined && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '18px' }}>
                      {downloadSuccess ? '✓' : processingStatus.downloading ? '⏳' : '○'}
                    </span>
                    <span>Downloading {documentType} as ZIP</span>
                  </div>
                )}
                
                {/* Upload Status */}
                {processingStatus.uploading !== undefined && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '18px' }}>
                      {uploadSuccess ? '✓' : processingStatus.uploading ? '⏳' : '○'}
                    </span>
                    <span>Uploading to Google Drive</span>
                  </div>
                )}
                
                {/* Status Update */}
                {processingStatus.updating && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '18px' }}>
                      {processingStatus.updating ? '⏳' : '✓'}
                    </span>
                    <span>Updating {selectedCount} rows to status: <strong>{currentStatus}</strong></span>
                  </div>
                )}
                
                {errorMessage && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#fee',
                    color: '#c00',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                  }}>
                    {errorMessage}
                  </div>
                )}
              </div>
            ) : (
              // Normal State
              <>
                {!showStatusDropdown && (
                  <p className="bulk-update-instructions">
                    Select an action to perform on the selected rows:
                  </p>
                )}
                
                {!showStatusDropdown ? (
                  // Show all three buttons
                  <div className="bulk-update-action-buttons">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      {/* Row 1: Download Receipts and Download Invoices */}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          className="bulk-update-action-btn download-receipts-btn"
                          onClick={this.handleDownloadReceipts}
                          title="Download all receipts as ZIP and upload to Google Drive"
                          style={{ flex: 1 }}
                        >
                          <span className="action-btn-icon">📦</span>
                          <span className="action-btn-text">Download Receipts</span>
                        </button>

                        <button 
                          className="bulk-update-action-btn download-invoices-btn"
                          onClick={this.handleDownloadInvoices}
                          title="Download all invoices as ZIP and upload to Google Drive"
                          style={{ flex: 1 }}
                        >
                          <span className="action-btn-icon">📄</span>
                          <span className="action-btn-text">Download Invoices</span>
                        </button>
                      </div>

                      {/* Row 2: Bulk Update */}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          className="bulk-update-action-btn update-status-btn"
                          onClick={() => this.setState({ showStatusDropdown: true })}
                          title="Update payment status for selected rows"
                          style={{ flex: 1 }}
                        >
                          <span className="action-btn-icon">✏️</span>
                          <span className="action-btn-text">Bulk Update</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Show centered dropdown
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '20px'
                  }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: '500' }}>
                      Select New Payment Status:
                    </p>
                    <select
                      value={this.state.selectedStatusValue}
                      onChange={(e) => this.setState({ selectedStatusValue: e.target.value })}
                      style={{
                        minWidth: '250px',
                        padding: '12px 16px',
                        fontSize: '1rem',
                        color: '#000',
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        boxShadow: 'none',
                        cursor: 'pointer',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="">-- Select Status --</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    {/* Footer with Back and Confirm buttons */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '10px'
                    }}>
                      <button
                        onClick={() => this.setState({ showStatusDropdown: false, selectedStatusValue: '' })}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#f0f0f0',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: '500',
                          color: '#333',
                          transition: 'background-color 0.2s',
                          width: 'fit-content'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#e0e0e0'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          if (this.state.selectedStatusValue) {
                            this.handleStatusUpdate(this.state.selectedStatusValue);
                          }
                        }}
                        disabled={!this.state.selectedStatusValue}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: this.state.selectedStatusValue ? '#4CAF50' : '#ccc',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: this.state.selectedStatusValue ? 'pointer' : 'not-allowed',
                          fontSize: '0.95rem',
                          fontWeight: '500',
                          color: '#fff',
                          transition: 'background-color 0.2s',
                          width: 'fit-content'
                        }}
                        onMouseOver={(e) => {
                          if (this.state.selectedStatusValue) {
                            e.target.style.backgroundColor = '#45a049';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (this.state.selectedStatusValue) {
                            e.target.style.backgroundColor = '#4CAF50';
                          }
                        }}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer with OK Button */}
        </div>
      </div>
    );
  }
}

export default BulkUpdateModalForFundraising;
