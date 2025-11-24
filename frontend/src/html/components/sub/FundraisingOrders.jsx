import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import '../../../css/sub/fundraising.css';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 
import JSZip from 'jszip';
import io from 'socket.io-client';

// Register the community modules
ModuleRegistry.registerModules([AllCommunityModule]);

class FundraisingOrders extends Component {
    constructor(props) {
      super(props);
      this.state = {
        fundraisingData: [],
        isLoading: true,
        focusedInputIndex: null,
        originalData: [],
        currentPage: 1,
        entriesPerPage: 100,
        remarks: "",
        paginatedDetails: [],
        columnDefs: [],
        rowData: [],
        expandedRowIndex: null,
        editedRowIndex: "",
        aiSearchQuery: '',
        aiSuggestions: [],
        anomalyThreshold: 0.8,
        phoneNumber: '',
        message: '',
        status: '',
        isAlertShown: false,
        showItemsModal: false,
        selectedItems: [],
        selectedRowData: null,
        wooCommerceProductDetails: [], // Store WooCommerce product details
        isLoadingProductDetails: false,  // Loading state for product details
        showCalendarModal: false, // Show collection date calendar modal
        selectedOrderForCalendar: null,
        isApplyingFilters: false // Flag to prevent infinite loops in filter application
      };
      this.tableRef = React.createRef();
      this.gridRef = React.createRef();
    }

    toggleRow = (index) => {
      this.setState((prevState) => ({
        expandedRow: prevState.expandedRow === index ? null : index,
      }));
    };  

    handleEntriesPerPageChange = (e) => {
      this.setState({
        entriesPerPage: parseInt(e.target.value, 100),
        currentPage: 1
      });
    }

    fetchFundraisingData = async () => 
    {
      try 
      {
        const response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`, { 
          purpose: 'retrieveAll'
        });

        console.log('Fundraising data fetched:', response.data.result);
        
        // Check if access was denied
        if (response.data.result && response.data.result.success === false) {
          console.error('Access denied:', response.data.result.message);
          // Set error state or show no access message
          this.setState({
            isLoading: false,
            accessDenied: true,
            accessDeniedMessage: response.data.result.message || 'Access denied to Fundraising Orders'
          });
          return [];
        }
        
        // Check if the response has the expected structure
        if (response.data.result) {
          return response.data.result;
        } else {
          console.error('Unexpected response structure:', response.data);
          return [];
        }
    
      } catch (error) {
        console.error('Error fetching fundraising data:', error);
        return [];
      }
    };

    // Enrich fundraising data with WooCommerce product details (images, prices, subtotals)
    enrichFundraisingDataWithProductDetails = (fundraisingData) => {
      const { wooCommerceProductDetails } = this.state;
      
      if (!wooCommerceProductDetails || wooCommerceProductDetails.length === 0) {
        console.log("No WooCommerce product details available for enrichment");
        return fundraisingData;
      }

      // Create a comprehensive product lookup map for flexible matching
      const productDetailsMap = {};
      const productSearchMap = {}; // For substring/partial matching
      
      wooCommerceProductDetails.forEach(product => {
        const productName = product.name;
        
        // Exact match mapping
        productDetailsMap[productName] = product;
        
        // Create substring search mapping
        const normalizedName = productName.toLowerCase().trim();
        const words = normalizedName.split(/\s+/);
        
        // Map individual words and combinations for flexible matching
        words.forEach(word => {
          if (word.length > 2) { // Only consider meaningful words
            if (!productSearchMap[word]) {
              productSearchMap[word] = [];
            }
            productSearchMap[word].push(product);
          }
        });
        
        // Map the full normalized name
        productSearchMap[normalizedName] = [product];
      });

      console.log("Created product lookup maps:", {
        exactMatches: Object.keys(productDetailsMap).length,
        searchableTerms: Object.keys(productSearchMap).length
      });

      // Enrich each fundraising order with WooCommerce data
      const enrichedData = fundraisingData.map(order => {
        if (!order.items || !Array.isArray(order.items)) {
          return order;
        }

        // Enrich each item with WooCommerce details
        const enrichedItems = order.items.map(item => {
          const itemName = item.productName || item.name || item.itemName;
          
          if (!itemName) {
            return { ...item, wooCommerceDetails: null };
          }

          // Try exact match first
          let matchedProduct = productDetailsMap[itemName];
          let matchType = 'no_match';
          
          // If no exact match, try flexible substring matching
          if (!matchedProduct) {
            const normalizedItemName = itemName.toLowerCase().trim();
            
            // Try full name match
            if (productSearchMap[normalizedItemName]) {
              matchedProduct = productSearchMap[normalizedItemName][0];
              matchType = 'exact_normalized';
            }
            
            // Try substring matching - check if item name is contained in any product name
            if (!matchedProduct) {
              for (const product of wooCommerceProductDetails) {
                const productNameLower = product.name.toLowerCase();
                const itemNameLower = normalizedItemName;
                
                // Check if the item name is a substring of the product name
                if (productNameLower.includes(itemNameLower)) {
                  matchedProduct = product;
                  matchType = 'substring_in_product';
                  break;
                }
                
                // Check if the product name is a substring of the item name
                if (itemNameLower.includes(productNameLower)) {
                  matchedProduct = product;
                  matchType = 'product_in_substring';
                  break;
                }
              }
            }
            
            // Try word-by-word matching if still no match
            if (!matchedProduct) {
              const itemWords = normalizedItemName.split(/\s+/).filter(word => word.length > 2);
              let bestMatch = null;
              let maxMatches = 0;
              let bestMatchType = 'word_match';
              
              for (const product of wooCommerceProductDetails) {
                const productNameLower = product.name.toLowerCase();
                const productWords = productNameLower.split(/\s+/);
                
                // Count matching words
                const matchCount = itemWords.filter(itemWord => 
                  productWords.some(productWord => 
                    productWord.includes(itemWord) || itemWord.includes(productWord)
                  )
                ).length;
                
                // Also check for partial word matches
                const partialMatches = itemWords.filter(itemWord => 
                  productNameLower.includes(itemWord)
                ).length;
                
                const totalScore = matchCount + (partialMatches * 0.5);
                
                if (totalScore > maxMatches && totalScore >= 1) {
                  maxMatches = totalScore;
                  bestMatch = product;
                  bestMatchType = matchCount >= 2 ? 'multi_word_match' : 'partial_word_match';
                }
              }
              
              if (bestMatch) {
                matchedProduct = bestMatch;
                matchType = bestMatchType;
              }
            }
          } else {
            matchType = 'exact';
          }

          // Calculate enriched item data
          const quantity = item.quantity || 1;
          const wooCommercePrice = matchedProduct ? parseFloat(matchedProduct.price) || 0 : 0;
          const originalPrice = item.price || item.unitPrice || 0;
          const finalPrice = wooCommercePrice > 0 ? wooCommercePrice : originalPrice;
          const subtotal = finalPrice * quantity;
          
          const enrichedItem = {
            ...item,
            wooCommerceDetails: matchedProduct ? {
              id: matchedProduct.id,
              name: matchedProduct.name,
              price: matchedProduct.price,
              images: matchedProduct.images || [],
              primaryImage: matchedProduct.images && matchedProduct.images.length > 0 
                ? matchedProduct.images[0].src 
                : null,
              stock_quantity: matchedProduct.stock_quantity,
              categories: matchedProduct.categories
            } : null,
            enrichedData: {
              quantity: quantity,
              wooCommercePrice: wooCommercePrice,
              originalPrice: originalPrice,
              finalPrice: finalPrice,
              subtotal: subtotal,
              matchType: matchType,
              // Add the matched product info for better backend processing
              matchedProductId: matchedProduct ? matchedProduct.id : null,
              matchedProductName: matchedProduct ? matchedProduct.name : null
            }
          };

          console.log(`Item enrichment for "${itemName}":`, {
            originalItem: item,
            matchedProduct: matchedProduct?.name || 'No match',
            matchedProductId: matchedProduct?.id || 'No ID',
            matchType: matchType,
            finalPrice: finalPrice,
            subtotal: subtotal
          });

          return enrichedItem;
        });

        // Calculate total order value from enriched items
        const enrichedTotalPrice = enrichedItems.reduce((total, item) => {
          return total + (item.enrichedData?.subtotal || 0);
        }, 0);

        const enrichedOrder = {
          ...order,
          items: enrichedItems,
          enrichedTotalPrice: enrichedTotalPrice,
          // Keep original total for comparison
          originalTotalPrice: order.totalPrice || order.donationAmount || 0
        };

        console.log(`Order enrichment for order ${order._id}:`, {
          itemsProcessed: enrichedItems.length,
          enrichedTotal: enrichedTotalPrice,
          originalTotal: enrichedOrder.originalTotalPrice
        });

        return enrichedOrder;
      });

      console.log("Fundraising data enrichment completed:", {
        totalOrders: enrichedData.length,
        ordersWithItems: enrichedData.filter(order => order.items && order.items.length > 0).length
      });

      return enrichedData;
    };

    async componentDidMount() 
    {
      // Preload product details for all fundraising orders
      await this.preloadAllProductDetails();
      
      // Close any loading popup from parent component
      if (this.props.closePopup1) {
        this.props.closePopup1();
      }
      if (this.props.onDataLoaded) {
        this.props.onDataLoaded();
      }
      
      // --- Live update via Socket.IO ---
      this.socket = io(
        window.location.hostname === "localhost"
          ? "http://localhost:3001"
          : "https://ecss-backend-node.azurewebsites.net"
      );
      this.socket.on('fundraising', (data) => {
        console.log("Socket event received", data);
        this.fetchAndSetFundraisingData();
      });
    }

    componentWillUnmount() {
      if (this.socket) {
        this.socket.disconnect();
      }
    }

    componentDidUpdate(prevProps) {
      console.log("FundraisingTable - componentDidUpdate called with props:", {
        prev: {
          paymentMethod: prevProps.paymentMethod,
          collectionLocation: prevProps.collectionLocation,
          status: prevProps.status,
          searchQuery: prevProps.searchQuery
        },
        current: {
          paymentMethod: this.props.paymentMethod,
          collectionLocation: this.props.collectionLocation,
          status: this.props.status,
          searchQuery: this.props.searchQuery
        }
      });
      
      // Prevent applying filters if we're already in the process or if original data is not ready
      if (this.state.isApplyingFilters || !this.state.originalData || this.state.originalData.length === 0) {
        console.log("FundraisingTable - Skipping filter application:", {
          isApplyingFilters: this.state.isApplyingFilters,
          hasOriginalData: !!(this.state.originalData && this.state.originalData.length > 0)
        });
        return;
      }
      
      // Check if filter props have changed and apply filtering
      if (
        prevProps.paymentMethod !== this.props.paymentMethod ||
        prevProps.collectionMode !== this.props.collectionMode ||
        prevProps.collectionLocation !== this.props.collectionLocation ||
        prevProps.status !== this.props.status ||
        prevProps.searchQuery !== this.props.searchQuery
      ) {
        console.log("FundraisingTable - Filter props changed, calling applyFilters");
        this.applyFilters();
      }
    }

    // Method to apply filters based on current props
    applyFilters = () => {
      const { paymentMethod, collectionLocation, status, searchQuery } = this.props;
      const { originalData, isApplyingFilters } = this.state;

      // Prevent recursive calls
      if (isApplyingFilters) {
        console.log("FundraisingTable - applyFilters already in progress, skipping");
        return;
      }

      console.log("FundraisingTable - applyFilters called with props:", { 
        paymentMethod, 
        collectionLocation, 
        status, 
        searchQuery,
        originalDataLength: originalData ? originalData.length : 0
      });
      
      console.log("FundraisingTable - Collection location from props:", collectionLocation);

      if (!originalData || originalData.length === 0) {
        console.log("FundraisingTable - No original data available for filtering");
        return;
      }

      // Set flag to prevent recursive calls
      this.setState({ isApplyingFilters: true }, () => {
        let filteredData = [...originalData];

      // Apply payment method filter
      if (paymentMethod && paymentMethod !== 'All Payment Methods' && paymentMethod !== '') {
        filteredData = filteredData.filter(record => 
          record.paymentDetails?.paymentMethod && record.paymentDetails.paymentMethod.toLowerCase().includes(paymentMethod.toLowerCase())
        );
      }

      /*
      // Apply collection mode filter
      if (collectionMode && collectionMode !== 'All Collection Modes' && collectionMode !== '') {
        filteredData = filteredData.filter(record => 
          record.collectionDetails?.collectionMode && record.collectionDetails.collectionMode.toLowerCase().includes(collectionMode.toLowerCase())
        );
      }
      */

      // Apply collection location filter
      if (collectionLocation && collectionLocation !== 'All Collection Locations' && collectionLocation !== '') {
        console.log("FundraisingTable - Applying collection location filter:", collectionLocation);
        const beforeFilterLength = filteredData.length;
        filteredData = filteredData.filter(record => {
          const recordLocation = record.collectionDetails?.CollectionDeliveryLocation;
          const match = recordLocation && recordLocation.toLowerCase().includes(collectionLocation.toLowerCase());
          if (!match) {
            console.log("FundraisingTable - Filtering out record with location:", recordLocation);
          }
          return match;
        });
        console.log("FundraisingTable - Collection location filter applied. Before:", beforeFilterLength, "After:", filteredData.length);
      }

      // Apply status filter
      if (status && status !== 'All Statuses' && status !== '') {
        filteredData = filteredData.filter(record => 
          record.status && record.status.toLowerCase().includes(status.toLowerCase())
        );
      }

      // Apply search query filter
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        console.log("FundraisingTable - Applying search filter with query:", query);
        const beforeSearchLength = filteredData.length;
        
        filteredData = filteredData.filter(record => {
          // Helper function to recursively search through nested objects
          const searchInObject = (obj) => {
            if (obj === null || obj === undefined) return false;
            
            if (typeof obj === 'string' || typeof obj === 'number') {
              return obj.toString().toLowerCase().includes(query);
            }
            
            if (Array.isArray(obj)) {
              return obj.some(item => searchInObject(item));
            }
            
            if (typeof obj === 'object') {
              return Object.values(obj).some(value => searchInObject(value));
            }
            
            return false;
          };

          // Search in the main record fields
          const mainFieldsMatch = [
            record.firstName,
            record.lastName, 
            record.contactNumber,
            record.email,
            record.receiptNumber,
            record.paymentMethod,
            record.collectionMode,
            record.status,
            record.donationAmount,
            record.totalPrice,
            record.fundraisingKey
          ].some(field => field && field.toString().toLowerCase().includes(query));

          // Search in personalInfo if it exists
          const personalInfoMatch = record.personalInfo ? searchInObject(record.personalInfo) : false;

          // Search in items array if it exists
          const itemsMatch = record.items ? searchInObject(record.items) : false;

          return mainFieldsMatch || personalInfoMatch || itemsMatch;
        });
        
        console.log("FundraisingTable - Search results:", {
          searchQuery: query,
          beforeSearch: beforeSearchLength,
          afterSearch: filteredData.length
        });
      }

      console.log("Applied filters:", { paymentMethod, /*collectionMode,*/ status, searchQuery });
      console.log("Filtered data length:", filteredData.length);

      // Process row data before setting state to avoid multiple setState calls
      const processedRowData = this.processRowData(filteredData);
      
      this.setState({
        fundraisingData: filteredData,
        rowData: processedRowData.rowData,
        columnDefs: processedRowData.columnDefs,
        isApplyingFilters: false // Reset the flag
      });
      });
    };

    // Preload product details for all fundraising orders
    preloadAllProductDetails = async () => {
      try {

        const baseUrl = window.location.hostname === "localhost" 
          ? "http://localhost:3002" 
          : "https://ecss-backend-django.azurewebsites.net";

        const response = await axios.get(`${baseUrl}/fundraising_product_details/`)

        console.log('Preloaded WooCommerce product details response:', response.data);

        if (response.data.success) {
          this.setState(
            {
              wooCommerceProductDetails: response.data.fundraising_products
            },
            async () => {
              await this.fetchAndSetFundraisingData();
            }
          );
        } else {
          console.error('Failed to preload product details:', response.data);
        }

      } catch (error) {
        console.error('Error preloading product details:', error);
      }
    };

    async fetchAndSetFundraisingData() {
      // Save current scroll position and page
      const gridContainer = document.querySelector('.ag-body-viewport');
      const currentScrollTop = gridContainer ? gridContainer.scrollTop : 0;
      const currentPage = (this.gridApi && typeof this.gridApi.paginationGetCurrentPage === 'function') 
        ? this.gridApi.paginationGetCurrentPage() : 0;

      const data = await this.fetchFundraisingData();
      
      // Ensure data is an array, fallback to empty array if not
      const safeData = Array.isArray(data) ? data : [];

      // Enhanced data processing: Enrich fundraising data with WooCommerce product details
      const enrichedData = this.enrichFundraisingDataWithProductDetails(safeData);

      // Extract unique values for filters
      const uniquePaymentMethods = ['All Payment Methods', ...new Set(enrichedData.map(record => record.paymentDetails?.paymentMethod).filter(Boolean))];
      // const uniqueCollectionModes = ['All Collection Modes', ...new Set(enrichedData.map(record => record.collectionDetails?.collectionMode).filter(Boolean))];
      const uniqueCollectionLocations = ['All Collection Locations', ...new Set(enrichedData.map(record => record.collectionDetails?.CollectionDeliveryLocation).filter(Boolean))];
      const uniqueStatuses = ['All Statuses', ...new Set(enrichedData.map(record => record.status).filter(Boolean))];

      console.log("Unique payment methods:", uniquePaymentMethods);
      // console.log("Unique collection modes:", uniqueCollectionModes);
      console.log("Unique collection locations:", uniqueCollectionLocations);
      console.log("Unique statuses:", uniqueStatuses);

      // Process row data before setting state to avoid multiple setState calls
      const processedRowData = this.processRowData(enrichedData);
      
      this.setState({
        originalData: enrichedData,
        fundraisingData: enrichedData,
        isLoading: false,
        rowData: processedRowData.rowData,
        columnDefs: processedRowData.columnDefs
      }, () => {
        console.log("Enhanced data loaded with product details, originalData length:", enrichedData || 0);

        // Pass filter options to parent component if callback is provided
        if (this.props.onFiltersLoaded) {
          // this.props.onFiltersLoaded(uniquePaymentMethods, uniqueCollectionModes, uniqueStatuses);
          this.props.onFiltersLoaded(uniquePaymentMethods, uniqueCollectionLocations, uniqueStatuses);
        }

        // Restore scroll position and page after data is set
        if (gridContainer) {
          gridContainer.scrollTop = currentScrollTop;
        }
        if (this.gridApi && typeof this.gridApi.paginationGoToPage === 'function') {
          try {
            this.gridApi.paginationGoToPage(currentPage);
          } catch (error) {
            console.warn("Error setting pagination page:", error);
          }
        }

        // Call onDataLoaded if it exists
        if (this.props.onDataLoaded && typeof this.props.onDataLoaded === 'function') {
          this.props.onDataLoaded();
        }
      });
    }

    // Generate a new receipt number based on product name and database records
    generateReceiptNumber = (fundraisingData, currentIndex) => {
      const currentYear = new Date().getFullYear().toString().slice(-2); // Get last 2 digits of year
      
      // Use the current index (position in database) + 1 for the receipt number
      const receiptNumber = currentIndex + 1;
      
      // Format as 3-digit number with leading zeros
      const formattedNumber = receiptNumber.toString().padStart(3, '0');
      
      // Check if any item contains "Panettone" substring
      const currentOrder = fundraisingData[currentIndex];
      let containsPanettone = false;
      
      if (currentOrder) {
        // Check both possible locations for items
        const itemsArray = currentOrder.items || currentOrder.orderDetails?.items || [];
        
        if (Array.isArray(itemsArray) && itemsArray.length > 0) {
          containsPanettone = itemsArray.some(item => {
            const itemName = item.productName || item.name || item.itemName || '';
            return itemName.toLowerCase().includes('panettone');
          });
        }
      }
      
      // Return appropriate format based on product content
      if (containsPanettone) {
        return `ECSS/Panettone/${formattedNumber}/${currentYear}`;
      } else {
        return `ECSS/FR/${formattedNumber}/${currentYear}`;
      }
    };

    processRowData = (fundraisingData) => 
    {
      console.log('Processing enriched fundraising data in processRowData:', fundraisingData);
      
      // Ensure fundraisingData is an array
      if (!Array.isArray(fundraisingData)) {
        console.error('fundraisingData is not an array:', fundraisingData);
        return [];
      }
      
      const rowData = fundraisingData.map((item, index) => {
        // Use enriched total price if available, fallback to original
        const displayAmount = item.enrichedTotalPrice > 0 
          ? `$${item.enrichedTotalPrice.toFixed(2)}` 
          : (item.totalPrice || item.donationAmount || '');

        return {
          id: item._id,
          sn: index + 1,
          firstName: item.personalInfo?.firstName || item.firstName || '',
          lastName: item.personalInfo?.lastName || item.lastName || '',
          contactNumber: item.personalInfo?.phone || item.contactNumber || '',
          email: item.personalInfo?.email || item.email || '',
          address: item.personalInfo?.address || item.address || '',
          postalCode: item.personalInfo?.postalCode || item.postalCode || '',
          donationAmount: displayAmount,
          invoiceNumber: item.invoiceNumber || item.paymentDetails?.invoiceNumber || '',
          paymentMethod: item.paymentDetails?.paymentMethod || '',
          items: item.orderDetails?.items, // This now contains enriched items with WooCommerce details
          collectionMode: item.collectionDetails?.collectionMode || '',
          collectionDeliveryLocation: item.collectionDetails?.CollectionDeliveryLocation || '',
          location: item.personalInfo?.location || item.collectionDetails?.CollectionDeliveryLocation || '',
          orderDateTime: (() => {
            // Helper function to format dates to dd/mm/yyyy hh:mm
            const formatDate = (dateValue) => {
              if (!dateValue) return '';
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${day}/${month}/${year} ${hours}:${minutes}`;
              }
              return '';
            };

            const orderDate = item.orderDetails?.orderDate || item.orderDate || '';
            const orderTime = item.orderDetails?.orderTime || item.orderTime || '';
            const createdAt = formatDate(item.createdAt || item._id?.getTimestamp?.());

            // Combine order date and time with proper formatting
            if (orderDate && orderTime) {
              // If both date and time are available, try to parse and format them
              const combinedDateTime = new Date(`${orderDate} ${orderTime}`);
              if (!isNaN(combinedDateTime.getTime())) {
                return formatDate(combinedDateTime);
              } else {
                return `${orderDate} at ${orderTime}`;
              }
            } else if (orderDate) {
              // Try to parse just the date
              const dateOnly = new Date(orderDate);
              if (!isNaN(dateOnly.getTime())) {
                const day = String(dateOnly.getDate()).padStart(2, '0');
                const month = String(dateOnly.getMonth() + 1).padStart(2, '0');
                const year = dateOnly.getFullYear();
                return `${day}/${month}/${year}`;
              } else {
                return orderDate;
              }
            } else if (orderTime) {
              return orderTime;
            } else if (createdAt) {
              return createdAt;
            } else {
              return 'Date not available';
            }
          })(),
          status: item.status || 'Pending',
          donationDate: item.orderDate,
          receiptNumber: (() => {
            // Preserve existing receipt number if it exists
            if (item.receiptNumber && item.receiptNumber.trim() !== '') {
              return item.receiptNumber;
            }
            // Only generate new receipt number for Paid status if none exists
            if (item.status === 'Paid') {
              return this.generateReceiptNumber(fundraisingData, index);
            }
            // Return empty string for Pending and Cancelled statuses without existing receipt numbers
            return '';
          })(),
          collectionDetails: item.collectionDetails || {},
          collectionDate: item.collectionDetails?.collectionDate || '',
          collectionTime: item.collectionDetails?.collectionTime || '',
          orderDate: item.orderDetails?.orderDate || item.orderDate || '',
          orderTime: item.orderDetails?.orderTime || item.orderTime || '',
          // Add enriched data for easy access
          enrichedTotalPrice: item.enrichedTotalPrice || 0,
          originalTotalPrice: item.originalTotalPrice || 0
        };
      });
      
      console.log('Processed enriched row data:', rowData);
      
      return {
        rowData,
        columnDefs: this.getColumnDefs()
      };
    };

    // Cell renderer methods to maintain stable function references
    contactNumberRenderer = (params) => {
      return params.value;
    };

    itemsRenderer = (params) => {
      const items = params.value;
      if (items && items.length > 0) {
        return (
          <button
            onClick={() => this.viewItems(items, params.data)}
            className="fundraising-view-items-btn"
          >
            View items
          </button>
        );
      }
    };

    totalPriceRenderer = (params) => {
      let amount = params.value;
      
      // Use enriched total price if available and greater than 0
      if (params.data.enrichedTotalPrice > 0) {
        amount = `$${params.data.enrichedTotalPrice.toFixed(2)}`;
        
        // Show comparison tooltip if enriched price differs from original
        if (params.data.originalTotalPrice > 0 && 
            Math.abs(params.data.enrichedTotalPrice - params.data.originalTotalPrice) > 0.01) {
          const difference = params.data.enrichedTotalPrice - params.data.originalTotalPrice;
          const diffText = difference > 0 ? `+$${difference.toFixed(2)}` : `-$${Math.abs(difference).toFixed(2)}`;
          
          return (
            <div title={`WooCommerce calculated: ${amount}\nOriginal: $${params.data.originalTotalPrice.toFixed(2)}\nDifference: ${diffText}`}>
              <span style={{ color: 'black' }}>{amount}</span>
              <span style={{ fontSize: '0.8em', color: 'black', marginLeft: '4px' }}>*</span>
            </div>
          );
        }
        
        return (
          <span style={{ color: 'black' }} title="Calculated from WooCommerce prices">
            {amount}
          </span>
        );
      }
      
      // Fallback: Calculate from items using enriched WooCommerce data if amount is 0 or empty
      if ((!amount || amount === 0) && params.data.items && params.data.items.length > 0) {
        const calculatedTotal = params.data.items.reduce((total, item) => {
          if (item.enrichedData && item.enrichedData.subtotal) {
            return total + item.enrichedData.subtotal;
          }
          
          // Fallback to original calculation if no enriched data
          const { wooCommerceProductDetails } = this.state;
          const productDetailsMap = {};
          if (wooCommerceProductDetails) {
            wooCommerceProductDetails.forEach(product => {
              productDetailsMap[product.name] = product;
            });
          }
          
          const itemName = item.productName || item.name || item.itemName;
          const quantity = item.quantity || 1;
          const wooProduct = productDetailsMap[itemName];
          const itemPrice = wooProduct ? parseFloat(wooProduct.price) : (item.price || item.unitPrice || 0);
          
          return total + (itemPrice * quantity);
        }, 0);
        
        if (calculatedTotal > 0) {
          amount = `$${calculatedTotal.toFixed(2)}`;
        }
      }
      
      // Format amount if it's a string with $ or a number
      if (amount && typeof amount === 'string' && amount.includes('$')) {
        return amount;
      } else if (amount && !isNaN(amount)) {
        return `$${parseFloat(amount).toFixed(2)}`;
      }
      return amount;
    };

    invoiceNumberRenderer = (params) => {
      const invoiceNumber = params.value;
      // Make invoice number clickable if it exists
      if (invoiceNumber) {
        return (
          <button
            className="fundraising-invoice-link"
            onClick={() => this.generateInvoiceFromNumber(params.data)}
            style={{
              background: 'none',
              border: 'none',
              color: '#000000',
              cursor: 'pointer',
            }}
          >
            {invoiceNumber}
          </button>
        );
      }
      return invoiceNumber || '';
    };

    orderDateTimeRenderer = (params) => {
      const orderDateTime = params.value;
      if (orderDateTime && orderDateTime !== 'Date not available') {
        return orderDateTime;
      }
    };

    statusRenderer = (params) => {
      const statusText = params.value;
      const statusClass = statusText ? statusText.toLowerCase() : 'default';

      return (
        <div className="fundraising-status-container">
          <span className={`fundraising-status-badge ${statusClass}`}>
            {statusText}
          </span>
        </div>
      );
    };

    collectionDetailsRenderer = (params) => {
      const collectionDetails = params.value;
      
      // Create display text for collection details
      let displayText = "Click to set collection date";
      
      if (collectionDetails && (collectionDetails.collectionDate || collectionDetails.collectionTime)) {
        // Format date to dd/mm/yyyy
        let formattedDate = "TBD";
        if (collectionDetails.collectionDate) {
          const date = new Date(collectionDetails.collectionDate);
          if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
          } else {
            formattedDate = collectionDetails.collectionDate;
          }
        }
        
        // Keep the original time format (preserve time ranges like "10:00-16:00")
        let formattedTime = "TBD";
        if (collectionDetails.collectionTime) {
          // Use the original time format as-is to preserve ranges
          formattedTime = collectionDetails.collectionTime;
        }
        
        displayText = `${formattedDate} ${formattedTime}`;
      }
      
      // Make the collection details clickable
      return (
        <button
          onClick={() => this.openCalendarModal(params.data)}
          style={{
            background: 'none',
            border: 'none',
            color: '#000000',
            cursor: 'pointer'
          }}
        >
          {displayText}
        </button>
      );
    };

    receiptNumberRenderer = (params) => {
      const receiptNumber = params.value;
      const status = params.data.status;
      // Make receipt number clickable for "Paid", "Cancelled", and "Refunded" statuses 
      if (receiptNumber && (status === "Paid" || status === "Cancelled" || status === "Refunded" || status === "Collected")) {
        return (
          <button
            className="fundraising-receipt-link"
            onClick={() => this.generateReceiptFromNumber(params.data)}
            style={{
              background: 'none',
              border: 'none',
              color: '#000000',
              cursor: 'pointer',
              width: '100%',
              height: '100%'
            }}
          >
            {receiptNumber}
          </button>
        );
      }
      return receiptNumber || '';
    };

    getColumnDefs = () => {
      const columnDefs = [
        {
          headerName: "S/N",
          field: "sn",
          width: 100,
          pinned: "left",
        },
        {
          headerName: "First Name",
          field: "firstName",
          width: 150, 
          pinned: "left",
        },
        {
          headerName: "Last Name",
          field: "lastName",
          width: 150,
          pinned: "left",
        },
        {
          headerName: "Email",
          field: "email",
          width: 300,
        },
        {
          headerName: "Contact Number",
          field: "contactNumber",
          width: 150,
          pinned: "left",
          cellRenderer: this.contactNumberRenderer,
        },
        {
          headerName: "Station Location",
          field: "location",
          width: 250,
          editable: true,
        },
        {
          headerName: "Items",
          field: "items",
          width: 200,
          cellRenderer: this.itemsRenderer
        },
        // {
        //   headerName: "Address",
        //   field: "address",
        //   width: 250,
        //   editable: true,
        // },
        // {
        //   headerName: "Postal Code",
        //   field: "postalCode",
        //   width: 120,
        //   editable: true,
        // },
        {
          headerName: "Total Price",
          field: "donationAmount",
          width: 150,
          editable: true,
          cellRenderer: this.totalPriceRenderer
        },
        {
          headerName: "Payment Method",
          field: "paymentMethod",
          width: 200,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: {
            values: ["Cash", "PayNow"]
          },
          editable: true,
        },
        {
          headerName: "Invoice Number",
          field: "invoiceNumber",
          width: 200,
          cellRenderer: this.invoiceNumberRenderer
        },
        {
          headerName: "Order Details",
          field: "orderDateTime",
          width: 300,
          cellRenderer: this.orderDateTimeRenderer,
          editable: false,
        },
        {
          headerName: "Order Status",
          field: "status",
           width: 220,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: (params) => {
            // Dynamic status values based on current status and collection mode
            const currentStatus = params.data.status;
            const collectionMode = params.data.collectionMode;
            
            let statusOptions = [];
            
            if (currentStatus === "Pending") {
              // From Pending: can go to Paid or Cancelled
              statusOptions = ["Pending", "Paid", "Cancelled"];
            } else if (currentStatus === "Paid") {
              // From Paid: can go to Cancelled or Delivered/Collected (based on collection mode)
              if (collectionMode === "Delivery") {
                statusOptions = ["Pending", "Paid", "Delivered", "Cancelled"];
              } else if (collectionMode === "Self-Collection") {
                statusOptions = ["Pending", "Paid", "Collected", "Cancelled"];
              } 
            }
            else if (currentStatus === "Collected") {
                statusOptions = ["Pending", "Paid", "Delivered", "Cancelled"];
            }
            else if (currentStatus === "Delivered") {
               statusOptions = ["Pending", "Paid", "Collected", "Cancelled"];
            }
            else if (currentStatus === "Cancelled") {
               statusOptions = ["Pending", "Paid", "Cancelled", "Refunded"];
            }
            // Store valid options for validation
            params.column.statusOptions = statusOptions;
            
            return { values: statusOptions };
          },
          cellRenderer: this.statusRenderer,
          editable: true,
          onCellEditingStarted: (params) => {
            // Only allow editing if the click target is the status badge
            const event = params.event;
            if (event && event.target) {
              const clickedElement = event.target;
              const isBadgeClick = clickedElement.closest('.fundraising-status-badge') !== null;
              
              if (!isBadgeClick) {
                // Prevent editing if clicked outside the badge
                params.api.stopEditing(true);
              }
            }
          },
          onCellValueChanged: (params) => {
            // Validate that the new value is in the allowed options
            const validOptions = params.column.statusOptions || [];
            if (params.newValue && !validOptions.includes(params.newValue)) {
              // Restore old value if selection is invalid
              params.data.status = params.oldValue;
              this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
            } else if (!params.newValue || params.newValue === '') {
              // Restore old value if nothing was selected
              params.data.status = params.oldValue;
              this.gridApi.refreshCells({ rowNodes: [params.node], force: true });
            }
          }
        },
        {
          headerName: "Collection Mode",
          field: "collectionMode",
          width: 150
        },
        {
          headerName: "Collection Location",
          field: "collectionDeliveryLocation",
          width: 250,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: {
            values: ["CT Hub", "Pasir Ris West Wellness Centre", "Tampines North Community Club"]
          },
          editable: true,
        },
        {
          headerName: "Collection Details",
          field: "collectionDetails",
          width: 300,
          cellRenderer: this.collectionDetailsRenderer,
        },
        // Commented out the duplicate Collection Location column since we already have Location
        // {
        //   headerName: "Collection Location",
        //   field: "collectionDetails",
        //   width: 300
        // },
        {
          headerName: "Receipt Number",
          field: "receiptNumber",
          width: 200,
          cellRenderer: this.receiptNumberRenderer
        }
      ];

      return columnDefs;
    };

    // Method to view items in a modal popup
    viewItems = async (items, rowData) => {
      console.log('Viewing items for:', rowData);
      console.log('Items from database (fetchFundraisingData):', items);
      
      // Extract product names from items to filter preloaded data
      const itemProductNames = items.map(item => 
        item.productName || item.name || item.itemName
      ).filter(name => name);

      // Filter ALL preloaded WooCommerce product details for these specific items
      const relevantProductDetails = this.state.wooCommerceProductDetails.filter(product =>
        itemProductNames.includes(product.name)
      );

      console.log('WooCommerce product details found:', relevantProductDetails);
      console.log('Using both data sources:', {
        backendItems: items,
        wooCommerceDetails: relevantProductDetails,
        originalData: this.state.originalData,
        fundraisingData: this.state.fundraisingData
      });

      this.setState({
        showItemsModal: true,
        selectedItems: items, // Backend database items from fetchFundraisingData
        selectedRowData: rowData, // Full row data from originalData/fundraisingData
        isLoadingProductDetails: false, // Always false since we preload
        // Keep ALL WooCommerce details available for the modal
        wooCommerceProductDetails: this.state.wooCommerceProductDetails
      });
    };

    // Fetch WooCommerce product details for fundraising items
    fetchWooCommerceProductDetails = async (items) => {
      try {
        // Extract unique product names from the items
        const productNames = items.map(item => 
          item.productName || item.name || item.itemName
        ).filter(name => name); // Filter out undefined/null names

        if (productNames.length === 0) {
          this.setState({ isLoadingProductDetails: false });
          return;
        }

        const baseUrl = window.location.hostname === "localhost" 
          ? "http://localhost:3002" 
          : "https://ecss-backend-django.azurewebsites.net";

        const response = await axios.post(`${baseUrl}/fundraising_product_details/`, {
          product_names: productNames
        });

        console.log('WooCommerce product details response:', response.data);

        if (response.data.success) {
          this.setState({
            wooCommerceProductDetails: response.data.product_details,
            isLoadingProductDetails: false
          });
        } else {
          console.error('Failed to fetch product details:', response.data);
          this.setState({ isLoadingProductDetails: false });
        }

      } catch (error) {
        console.error('Error fetching WooCommerce product details:', error);
        this.setState({ isLoadingProductDetails: false });
      }
    };

    // Close the items modal
    closeItemsModal = () => {
      this.setState({
        showItemsModal: false,
        selectedItems: [],
        selectedRowData: null
      });
    };

    // Open calendar modal for collection details
    openCalendarModal = (orderData) => {
      console.log('Opening calendar modal for order:', orderData);
      
      // Use parent's calendar modal if available
      if (this.props.openCalendarModal) {
        this.props.openCalendarModal(orderData, this.state.collectionSchedule);
      } else {
        // Fallback to local state if parent method not available
        this.setState({
          showCalendarModal: true,
          selectedOrderForCalendar: orderData
        });
      }
    };

    // Close calendar modal
    closeCalendarModal = () => {
      this.setState({
        showCalendarModal: false,
        selectedOrderForCalendar: null
      });
    };

    // Update collection details for an order
    updateCollectionDetails = async (orderId, collectionDate, collectionTime, location) => {
      try {
        console.log('Updating collection date:', { orderId, collectionDate });
        
        // Find the current order from fundraising data to preserve existing collection details
        const currentOrder = this.state.fundraisingData.find(order => order._id === orderId);
        const existingCollectionDetails = currentOrder?.collectionDetails || {};
        
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
          {
            purpose: "updateCollectionDetails",
            _id: orderId,
            collectionDetails: {
              ...existingCollectionDetails, // Preserve all existing keys
              collectionDate: collectionDate // Only update the collection date
            }
          }
        );
        
        if (response.data.result && response.data.result.success) {
          console.log('Collection date updated successfully');
          
          // Refresh table data to show updated collection details
          await this.fetchAndSetFundraisingData();
          
          return { success: true };
        } else {
          console.error('Failed to update collection details:', response.data);
          return { success: false };
        }
        
      } catch (error) {
        console.error('Error updating collection details:', error);
        return { success: false, error: error.message };
      }
    };

    // Update collection location for an order
    updateCollectionLocation = async (orderId, newCollectionLocation) => {
      try {
        console.log(`Updating order ${orderId} collection location to: ${newCollectionLocation}`);
        
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
          {
            purpose: "updateCollectionLocation",
            _id: orderId,
            newCollectionLocation: newCollectionLocation
          }
        );
        
        if (response.data.result && response.data.result.success) {
          console.log('Collection location update response from backend:', response.data.result);
          
          // Emit Socket.IO event for real-time updates if available
          if (this.socket) {
            this.socket.emit('fundraising', {
              action: 'updateCollectionLocation',
              orderId: orderId,
              newCollectionLocation: newCollectionLocation
            });
          }
          
          return { success: true };
        } else {
          console.error('Failed to update collection location:', response.data);
          return { success: false };
        }
        
      } catch (error) {
        console.error('Error updating collection location:', error);
        return { success: false, error: error.message };
      }
    };

    // Render the items modal
    renderItemsModal = () => {
      const { 
        showItemsModal, 
        selectedItems, 
        selectedRowData, 
        wooCommerceProductDetails, 
        isLoadingProductDetails,
        originalData,
        fundraisingData
      } = this.state;
      
      if (!showItemsModal || !selectedRowData) return null;

      // Create a map of WooCommerce product details for easy lookup
      const productDetailsMap = {};
      wooCommerceProductDetails.forEach(product => {
        productDetailsMap[product.name] = product;
      });

      console.log('Data sources in modal:', {
        selectedItemsFromBackend: selectedItems,
        wooCommerceProductDetails: wooCommerceProductDetails,
        originalData: originalData,
        fundraisingData: fundraisingData,
        selectedRowData: selectedRowData
      });

      // Calculate totals using enriched data if available
      const calculatedTotal = selectedItems.reduce((total, item) => {
        // Use enriched data if available (this includes flexible product matching)
        if (item.enrichedData && item.enrichedData.subtotal > 0) {
          console.log(`Using enriched subtotal for ${item.productName}: $${item.enrichedData.subtotal}`);
          return total + item.enrichedData.subtotal;
        }
        
        // Fallback to original calculation
        const itemName = item.productName;
        const quantity = item.quantity || 1;
        
        console.log(`Fallback calculation for: ${itemName}, quantity: ${quantity}`);
        
        const wooProduct = productDetailsMap[itemName];
        const itemPrice = wooProduct ? parseFloat(wooProduct.price) : (item.price || item.unitPrice || 0);
        
        console.log(`WooCommerce price: ${wooProduct ? wooProduct.price : 'Not found'}, fallback price: ${item.price || item.unitPrice || 0}`);
        
        return total + (itemPrice * quantity);
      }, 0);

      return (
        <div className="modal-overlay" onClick={this.closeItemsModal}>
          <div className="modal-content professional-modal woocommerce-enhanced" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header professional-header">
              <h3>Order List</h3>
              <button className="modal-close-btn" onClick={this.closeItemsModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body professional-body">
              <div className="items-section">
                <div className="list-header enhanced">
                  <span className="header-product">Product</span>
                  <span className="header-subtotal">Subtotal</span>
                </div>
                
                <div className="items-list-professional enhanced">
                  {selectedItems.map((item, index) => {
                    // Get item name and quantity from backend data
                    const itemName = item.productName;
                    const quantity = item.quantity || 1;
                    
                    console.log(`Rendering item ${index + 1}:`, {
                      productName: item.productName,
                      quantity: item.quantity,
                      hasEnrichedData: !!item.enrichedData,
                      hasWooCommerceDetails: !!item.wooCommerceDetails,
                      rawItem: item
                    });
                    
                    // Use enriched WooCommerce details if available (better matching)
                    let wooProduct = null;
                    let productImage = null;
                    let currentPrice = 0;
                    let subtotal = 0;
                    let matchInfo = '';
                    
                    if (item.wooCommerceDetails) {
                      // Use the enriched WooCommerce details (supports flexible matching)
                      wooProduct = item.wooCommerceDetails;
                      productImage = item.wooCommerceDetails.primaryImage;
                      currentPrice = item.enrichedData?.finalPrice || parseFloat(item.wooCommerceDetails.price) || 0;
                      subtotal = item.enrichedData?.subtotal || (currentPrice * quantity);
                      matchInfo = `Match type: ${item.enrichedData?.matchType || 'unknown'}`;
                      
                      console.log(`Using enriched WooCommerce details for ${itemName}:`, {
                        matchType: item.enrichedData?.matchType,
                        price: currentPrice,
                        subtotal: subtotal,
                        image: productImage
                      });
                    } else {
                      // Fallback to original productDetailsMap lookup
                      wooProduct = productDetailsMap[itemName];
                      productImage = wooProduct && wooProduct.images && wooProduct.images.length > 0 
                        ? wooProduct.images[0].src 
                        : null;
                      currentPrice = wooProduct ? parseFloat(wooProduct.price) : (item.price || item.unitPrice || 0);
                      subtotal = currentPrice * quantity;
                      matchInfo = wooProduct ? 'Exact match' : 'No WooCommerce match';
                      
                      console.log(`Using fallback lookup for ${itemName}:`, {
                        foundInWooCommerce: !!wooProduct,
                        price: currentPrice,
                        subtotal: subtotal
                      });
                    }
                    
                    return (
                      <div key={index} className="professional-item-row enhanced">
                        {/* Product Column with Image and Details */}
                        <div className="item-product">
                          <div className="product-row">
                            {/* Product Image from WooCommerce */}
                            <div className="product-image-container">
                              {productImage ? (
                                <img 
                                  src={productImage} 
                                  alt={itemName}
                                  className="product-image"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className="image-placeholder" 
                                style={{ display: productImage ? 'none' : 'flex' }}
                              >
                                No Image
                              </div>
                            </div>
                            
                            {/* Product Details */}
                            <div className="product-details">
                              <div className="product-name" title={`${itemName} (${matchInfo})`}>
                                {itemName}
                              </div>
                              <div className="product-quantity" title={`Quantity from backend: ${quantity}`}>
                                Qty: {quantity}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Subtotal Column */}
                        <div className="item-subtotal">
                          <span className="subtotal-value" title={`Price: $${currentPrice} × Qty: ${quantity} = $${subtotal.toFixed(2)}`}>
                            ${subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {calculatedTotal > 0 && (
                  <div className="order-total-section enhanced">
                    <div className="total-line">
                      <span className="total-label">Total Amount:</span>
                      <span className="total-amount">${calculatedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };



    getRowStyle = (params) => {
      const { expandedRowIndex, rowData } = this.state;
      const rowIndex = params.rowIndex;
    
      if (expandedRowIndex !== null && expandedRowIndex === rowIndex) {
        return {
          background: '#f1f1f1',
          borderBottom: '1px solid #ddd'
        };
      }
    
      return null;
    };

    // Render the detailed view of a row when expanded
    renderDetailView = (rowData) => {
      console.log('Rendering detail view for row data:', rowData);
      if (!rowData) return null;
      
      return (
        <div className="detail-view-container">
          <div className="detail-view-header">
            <h3>Fundraising Details</h3>
          </div>
          
          <div className="detail-view-content">
            <div className="detail-view-section">
              <h4>Donor Information</h4>
              <div className="detail-view-grid">
                <div className="detail-field">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{`${rowData.firstName} ${rowData.lastName}`.trim()}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Contact:</span>
                  <span className="detail-value">{rowData.contactNumber}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{rowData.email}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">{rowData.address}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Postal Code:</span>
                  <span className="detail-value">{rowData.postalCode}</span>
                </div>
              </div>
            </div>
            
            <div className="detail-view-section">
              <h4>Donation Information</h4>
              <div className="detail-view-grid">
                <div className="detail-field">
                  <span className="detail-label">Total Price:</span>
                  <span className="detail-value">{rowData.donationAmount}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{rowData.donationDate}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Payment Method:</span>
                  <span className="detail-value">{rowData.paymentMethod}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Collection Mode:</span>
                  <span className="detail-value">{rowData.collectionMode}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">{rowData.status}</span>
                </div>
                {rowData.receiptNumber && rowData.receiptNumber.trim() !== '' && (
                  <div className="detail-field">
                    <span className="detail-label">Receipt Number:</span>
                    <span className="detail-value">{rowData.receiptNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {rowData.items && rowData.items.length > 0 && (
              <div className="detail-view-section">
                <h4>Donated Items</h4>
                <div className="items-list">
                  {rowData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-details">
                        <strong>{item.name || item.productName || item.itemName}</strong>
                        <span className="item-quantity">Quantity: {item.quantity || 1}</span>
                        {item.description && <span>{item.description}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Handle cell value changes - preserves scroll position and filters
    onCellValueChanged = async (params) => {
      console.log('Cell value changed:', params);
      console.log('Field changed:', params.colDef.field);
      console.log('Old value:', params.oldValue);
      console.log('New value:', params.newValue);
      
      // Store current scroll and focus position BEFORE any updates
      const gridContainer = document.querySelector('.ag-body-viewport');
      const currentScrollTop = gridContainer ? gridContainer.scrollTop : 0;
      const currentScrollLeft = gridContainer ? gridContainer.scrollLeft : 0;
      const focusedRowIndex = params.rowIndex;
      const focusedColField = params.colDef.field;
      
      console.log('Storing position:', { currentScrollTop, currentScrollLeft, focusedRowIndex, focusedColField });
      
      // Update the status in the backend first
      if (params.colDef.field === 'status') {
        console.log(`Status changing from "${params.oldValue}" to "${params.newValue}" for order ID: ${params.data.id}`);
        
        const result = await this.updateOrderStatus(params.data.id, params.newValue);
        
        console.log('updateOrderStatus result:', result);
        
        // Log the subtotal information that was sent/processed
        if (result && result.success && result.subtotalInfo) {
          console.log('Status update completed with subtotal info:', result.subtotalInfo);
          
          // You can use the subtotal information here for any additional processing
          // For example, updating local state, triggering other actions, etc.
          const { totalSubtotal, items, enrichedTotalPrice } = result.subtotalInfo;
          console.log(`Order total: $${totalSubtotal.toFixed(2)}, Items: ${items.length}, Enriched total: $${enrichedTotalPrice.toFixed(2)}`);
        } else {
          console.log('No subtotal info returned or update failed');
        }

        // Check if the status field was changed to "Paid"
        if (params.newValue === 'Paid') {
          console.log('Processing status change to Paid - handling stock reduction...');
          await this.handleStatusChangeToPaid(params.data);
        }
        
        // Check if the status field was changed to "Refunded"
        if (params.newValue === 'Refunded' && params.oldValue !== 'Refunded') {
          console.log('Processing status change to Refunded - handling stock increase...');
          await this.handleStatusChangeToRefunded(params.data);
        }
        
        // Check if the status field was changed to "Cancelled"
        if (params.newValue === 'Cancelled' && params.oldValue !== 'Cancelled') {
          console.log('Processing status change to Cancelled - handling stock update if needed...');
          await this.handleStatusChangeToCancelled(params.data, params.oldValue);
        }

        // Refresh only the changed row locally without resetting view
        this.refreshRowLocally(params.data, currentScrollTop, currentScrollLeft, focusedRowIndex, focusedColField);
      }
      
      // Handle payment method changes
      if (params.colDef.field === 'paymentMethod') {
        console.log(`Payment method changing from "${params.oldValue}" to "${params.newValue}" for order ID: ${params.data.id}`);
        
        const result = await this.updatePaymentMethod(params.data.id, params.newValue);
        
        console.log('updatePaymentMethod result:', result);
        
        if (result && result.success) {
          console.log('Payment method update completed successfully');
          
          // Refresh locally instead of fetching all data
          this.updateRowLocally(params.data, currentScrollTop, currentScrollLeft, focusedRowIndex, focusedColField);
        } else {
          console.log('Payment method update failed');
        }
      }

      // Handle collection delivery location changes
      if (params.colDef.field === 'collectionDeliveryLocation') {
        console.log(`Collection delivery location changing from "${params.oldValue}" to "${params.newValue}" for order ID: ${params.data.id}`);
        
        const result = await this.updateCollectionLocation(params.data.id, params.newValue);
        
        console.log('updateCollectionLocation result:', result);
        
        if (result && result.success) {
          console.log('Collection delivery location update completed successfully');
          
          // Refresh locally instead of fetching all data
          this.updateRowLocally(params.data, currentScrollTop, currentScrollLeft, focusedRowIndex, focusedColField);
        } else {
          console.log('Collection delivery location update failed');
        }
      }
      
    };

    // New helper method: Refresh a single row locally and preserve scroll position
    refreshRowLocally = (updatedRowData, scrollTop, scrollLeft, rowIndex, focusedColField) => {
      const { originalData, fundraisingData, rowData } = this.state;
      
      console.log('Refreshing row locally while preserving position:', { scrollTop, scrollLeft, rowIndex, focusedColField });
      
      // Update the row in originalData
      const originalIndex = originalData.findIndex(item => item._id === updatedRowData.id);
      if (originalIndex !== -1) {
        originalData[originalIndex] = {
          ...originalData[originalIndex],
          status: updatedRowData.status,
          fundraisingKey: updatedRowData.receiptNumber
        };
      }
      
      // Update the row in fundraisingData (filtered data)
      const fundraisingIndex = fundraisingData.findIndex(item => item._id === updatedRowData.id);
      if (fundraisingIndex !== -1) {
        fundraisingData[fundraisingIndex] = {
          ...fundraisingData[fundraisingIndex],
          status: updatedRowData.status,
          fundraisingKey: updatedRowData.receiptNumber
        };
      }
      
      // Update the row in rowData (display data)
      const rowIndexDisplay = rowData.findIndex(item => item.id === updatedRowData.id);
      if (rowIndexDisplay !== -1) {
        rowData[rowIndexDisplay] = {
          ...rowData[rowIndexDisplay],
          status: updatedRowData.status,
          receiptNumber: updatedRowData.receiptNumber
        };
      }
      
      // Update state without resetting filters
      this.setState({
        originalData: [...originalData],
        fundraisingData: [...fundraisingData],
        rowData: [...rowData]
      }, () => {
        // Restore scroll position after state update
        const gridContainer = document.querySelector('.ag-body-viewport');
        if (gridContainer) {
          gridContainer.scrollTop = scrollTop;
          gridContainer.scrollLeft = scrollLeft;
          console.log('Scroll position restored:', { scrollTop, scrollLeft });
        }
        
        // Refresh the specific grid cell
        if (this.gridApi) {
          const node = this.gridApi.getRowNode(updatedRowData.id);
          if (node) {
            this.gridApi.refreshCells({ rowNodes: [node], force: true });
            console.log('Grid cell refreshed for row:', updatedRowData.id);
            
            // Focus back on the updated row
            setTimeout(() => {
              this.gridApi.ensureIndexVisible(rowIndex, 'middle');
              console.log('Row focused and visible at index:', rowIndex);
            }, 100);
          }
        }
      });
    };

    // New helper method: Update single row locally and preserve scroll position
    updateRowLocally = (updatedRowData, scrollTop, scrollLeft, rowIndex, focusedColField) => {
      const { originalData, fundraisingData, rowData } = this.state;
      
      console.log('Updating row locally while preserving position:', { scrollTop, scrollLeft, rowIndex, focusedColField });
      
      // Update the row in originalData
      const originalIndex = originalData.findIndex(item => item._id === updatedRowData.id);
      if (originalIndex !== -1) {
        originalData[originalIndex] = {
          ...originalData[originalIndex],
          paymentDetails: {
            ...originalData[originalIndex].paymentDetails,
            paymentMethod: updatedRowData.paymentMethod
          },
          collectionDetails: {
            ...originalData[originalIndex].collectionDetails,
            CollectionDeliveryLocation: updatedRowData.collectionDeliveryLocation
          }
        };
      }
      
      // Update the row in fundraisingData (filtered data)
      const fundraisingIndex = fundraisingData.findIndex(item => item._id === updatedRowData.id);
      if (fundraisingIndex !== -1) {
        fundraisingData[fundraisingIndex] = {
          ...fundraisingData[fundraisingIndex],
          paymentDetails: {
            ...fundraisingData[fundraisingIndex].paymentDetails,
            paymentMethod: updatedRowData.paymentMethod
          },
          collectionDetails: {
            ...fundraisingData[fundraisingIndex].collectionDetails,
            CollectionDeliveryLocation: updatedRowData.collectionDeliveryLocation
          }
        };
      }
      
      // Update the row in rowData (display data)
      const rowIndexDisplay = rowData.findIndex(item => item.id === updatedRowData.id);
      if (rowIndexDisplay !== -1) {
        rowData[rowIndexDisplay] = {
          ...rowData[rowIndexDisplay],
          paymentMethod: updatedRowData.paymentMethod,
          collectionDeliveryLocation: updatedRowData.collectionDeliveryLocation
        };
      }
      
      // Update state without resetting filters
      this.setState({
        originalData: [...originalData],
        fundraisingData: [...fundraisingData],
        rowData: [...rowData]
      }, () => {
        // Restore scroll position after state update
        const gridContainer = document.querySelector('.ag-body-viewport');
        if (gridContainer) {
          gridContainer.scrollTop = scrollTop;
          gridContainer.scrollLeft = scrollLeft;
          console.log('Scroll position restored:', { scrollTop, scrollLeft });
        }
        
        // Refresh the specific grid cell
        if (this.gridApi) {
          const node = this.gridApi.getRowNode(updatedRowData.id);
          if (node) {
            this.gridApi.refreshCells({ rowNodes: [node], force: true });
            console.log('Grid cell refreshed for row:', updatedRowData.id);
            
            // Focus back on the updated row
            setTimeout(() => {
              this.gridApi.ensureIndexVisible(rowIndex, 'middle');
              console.log('Row focused and visible at index:', rowIndex);
            }, 100);
          }
        }
      });
    };

    // Generate receipt when clicking on receipt number
    generateReceiptFromNumber = async (rowData) => {
      try {
        console.log('Generating receipt for order:', rowData);
        
        // Check if receipt number exists
        if (!rowData.receiptNumber || rowData.receiptNumber.trim() === '') {
          return;
        }
        
        // Extract numeric value from donation amount (remove $ and convert to number)
        let totalAmount = 0;
        if (rowData.donationAmount) {
          // Handle both string formats like "$25.00" and numeric values
          const amountStr = rowData.donationAmount.toString().replace(/[\$,]/g, '');
          totalAmount = parseFloat(amountStr) || 0;
        }
        
        console.log('Extracted total amount:', totalAmount, 'from:', rowData.donationAmount);
        
        // Process items to include pricing information for PDF generation
        const processedItems = (rowData.items || []).map((item, index) => {
          const itemName = item.productName || item.name || item.itemName;
          const quantity = item.quantity || 1;
          
          // Extract price information from enriched data or fallback
          let unitPrice = 0;
          let subtotal = 0;
          
          if (item.enrichedData && item.enrichedData.subtotal > 0) {
            // Use enriched data if available
            unitPrice = item.enrichedData.finalPrice || 0;
            subtotal = item.enrichedData.subtotal;

          } else if (item.wooCommerceDetails) {
            // Use WooCommerce details as fallback
            unitPrice = parseFloat(item.wooCommerceDetails.price) || 0;
            subtotal = unitPrice * quantity;

          } else {
            // Try to get pricing from WooCommerce product details state
            const { wooCommerceProductDetails } = this.state;
            let foundProduct = null;
            
            if (wooCommerceProductDetails && wooCommerceProductDetails.length > 0) {
              // Look for exact match first
              foundProduct = wooCommerceProductDetails.find(product => product.name === itemName);
              
              // If no exact match, try partial matching
              if (!foundProduct) {
                foundProduct = wooCommerceProductDetails.find(product => 
                  product.name.toLowerCase().includes(itemName.toLowerCase()) ||
                  itemName.toLowerCase().includes(product.name.toLowerCase())
                );
              }
            }
            
            if (foundProduct) {
              unitPrice = parseFloat(foundProduct.price) || 0;
              subtotal = unitPrice * quantity;

            } else {
              // Final fallback to item's own price
              unitPrice = item.price || item.unitPrice || 0;
              subtotal = unitPrice * quantity;

            }
          }
          
          console.log(`Processing item "${itemName}": price=${unitPrice}, qty=${quantity}, subtotal=${subtotal}`);
          
          return {
            ...item,
            productName: itemName,
            quantity: quantity,
            price: unitPrice,
            unitPrice: unitPrice,
            subtotal: subtotal
          };
        });
        
        // Calculate total from processed items if totalAmount is 0
        if (totalAmount === 0 && processedItems.length > 0) {
          totalAmount = processedItems.reduce((total, item) => total + (item.subtotal || 0), 0);
          console.log('Calculated total from items:', totalAmount);
        }
        
        // Create subtotal information structure that the backend expects
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



        // Use the row data directly from the table
        const orderData = {
          _id: rowData.id,
          personalInfo: {
            firstName: rowData.firstName,
            lastName: rowData.lastName,
            phone: rowData.contactNumber,
            email: rowData.email,
            address: rowData.address,
            postalCode: rowData.postalCode
          },
          items: processedItems,
          totalPrice: totalAmount,
          donationAmount: totalAmount,
          paymentMethod: rowData.paymentMethod,
          collectionMode: rowData.collectionMode,
          collectionDeliveryLocation: rowData.collectionDeliveryLocation,
          collectionDate: rowData.collectionDate,
          collectionTime: rowData.collectionTime,
          collectionDetails: rowData.collectionDetails || {},
          status: rowData.status,
          receiptNumber: rowData.receiptNumber,
          subtotalInfo: subtotalInfo
        };

        console.log('Receipt number being sent to backend:', rowData.receiptNumber);
        console.log('Full order data being sent:', orderData);
        
        // Call backend to generate receipt
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
          {
            purpose: "generateReceipt",
            ...orderData
          }
        );

        console.log('Receipt generation response:', response.data);
        
        // Handle the PDF response
        if (response.data.result && response.data.result.success && response.data.result.pdfGenerated) {
          this.handlePdfResponse(response.data.result);
        } else {
          console.error('Failed to generate receipt:', response.data);
        }
      } catch (error) {
        console.error('Error generating receipt:', error);
      }
    };

    // Generate invoice when clicking on invoice number
    generateInvoiceFromNumber = async (rowData) => {
      try {
        console.log('Generating invoice for order:', rowData);
        
        // Check if invoice number exists
        if (!rowData.invoiceNumber || rowData.invoiceNumber.trim() === '') {
          console.warn('No invoice number found for this order');
          return;
        }
        
        // Extract numeric value from donation amount (remove $ and convert to number)
        let totalAmount = 0;
        if (rowData.donationAmount) {
          // Handle both string formats like "$25.00" and numeric values
          const amountStr = rowData.donationAmount.toString().replace(/[\$,]/g, '');
          totalAmount = parseFloat(amountStr) || 0;
        }
        
        console.log('Extracted total amount:', totalAmount, 'from:', rowData.donationAmount);
        console.log('Collection details from rowData:', {
          collectionDetails: rowData.collectionDetails,
          collectionDate: rowData.collectionDate,
          collectionTime: rowData.collectionTime,
          collectionMode: rowData.collectionMode,
          collectionDeliveryLocation: rowData.collectionDeliveryLocation
        });
        
        // Process items to include pricing information for invoice generation
        const processedItems = (rowData.items || []).map((item, index) => {
          const itemName = item.productName || item.name || item.itemName;
          const quantity = item.quantity || 1;
          
          // Extract price information from enriched data or fallback
          let unitPrice = 0;
          let subtotal = 0;
          
          if (item.enrichedData && item.enrichedData.subtotal > 0) {
            // Use enriched data if available
            unitPrice = item.enrichedData.finalPrice || 0;
            subtotal = item.enrichedData.subtotal;

          } else if (item.wooCommerceDetails) {
            // Use WooCommerce details as fallback
            unitPrice = parseFloat(item.wooCommerceDetails.price) || 0;
            subtotal = unitPrice * quantity;

          } else {
            // Try to get pricing from WooCommerce product details state
            const { wooCommerceProductDetails } = this.state;
            let foundProduct = null;
            
            if (wooCommerceProductDetails && wooCommerceProductDetails.length > 0) {
              // Look for exact match first
              foundProduct = wooCommerceProductDetails.find(product => product.name === itemName);
              
              // If no exact match, try partial matching
              if (!foundProduct) {
                foundProduct = wooCommerceProductDetails.find(product => 
                  product.name.toLowerCase().includes(itemName.toLowerCase()) ||
                  itemName.toLowerCase().includes(product.name.toLowerCase())
                );
              }
            }
            
            if (foundProduct) {
              unitPrice = parseFloat(foundProduct.price) || 0;
              subtotal = unitPrice * quantity;

            } else {
              // Final fallback to item's own price
              unitPrice = item.price || item.unitPrice || 0;
              subtotal = unitPrice * quantity;
            }
          }
          
          console.log(`Processing item "${itemName}": price=${unitPrice}, qty=${quantity}, subtotal=${subtotal}`);
          
          return {
            ...item,
            productName: itemName,
            quantity: quantity,
            price: unitPrice,
            unitPrice: unitPrice,
            subtotal: subtotal
          };
        });
        
        // Calculate total from processed items if totalAmount is 0
        if (totalAmount === 0 && processedItems.length > 0) {
          totalAmount = processedItems.reduce((total, item) => total + (item.subtotal || 0), 0);
          console.log('Calculated total from items:', totalAmount);
        }
        
        // Create order data structure for invoice generation
        const orderData = {
          _id: rowData.id,
          personalInfo: {
            firstName: rowData.firstName,
            lastName: rowData.lastName,
            phone: rowData.contactNumber,
            email: rowData.email,
            address: rowData.address,
            postalCode: rowData.postalCode
          },
          orderDetails: {
            items: processedItems,
            totalPrice: totalAmount,
            orderDate: rowData.donationDate || rowData.orderDate || new Date().toLocaleDateString(),
            orderTime: rowData.orderTime || new Date().toLocaleTimeString()
          },
          paymentDetails: {
            paymentMethod: rowData.paymentMethod
          },
          collectionDetails: {
            collectionMode: rowData.collectionMode,
            CollectionDeliveryLocation: rowData.collectionDeliveryLocation,
            collectionDate: rowData.collectionDetails?.collectionDate,
            collectionTime: rowData.collectionDetails?.collectionTime
          },
          totalPrice: totalAmount,
          donationAmount: totalAmount,
          status: rowData.status,
          invoiceNumber: rowData.invoiceNumber
        };

        console.log('Invoice number being sent to backend:', rowData.invoiceNumber);
        console.log('Full order data being sent for invoice:', orderData);
        console.log('Collection details being sent to backend:', orderData.collectionDetails);
        console.log('Order details being sent to backend:', orderData.orderDetails);
        
        // Call backend to generate checkout invoice
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
          {
            purpose: "generateCheckoutInvoice",
            orderData: orderData,
            invoiceNumber: rowData.invoiceNumber
          }
        );

        console.log('Invoice generation response:', response.data);
        
        // Handle the PDF response
        if (response.data.result && response.data.result.success && response.data.result.pdfGenerated) {
          this.handlePdfResponse(response.data.result);
        } else {
          console.error('Failed to generate invoice:', response.data);
        }
      } catch (error) {
        console.error('Error generating invoice:', error);
      }
    };

    // Update order status using _id
    updateOrderStatus = async (orderId, newStatus) => {
      try {
        console.log(`Updating order ${orderId} status to: ${newStatus}`);
        console.log('Current state:', {
          fundraisingData: this.state.fundraisingData,
          fundraisingDataLength: this.state.fundraisingData?.length || 0,
          originalData: this.state.originalData,
          originalDataLength: this.state.originalData?.length || 0,
          isLoading: this.state.isLoading
        });
        
        // Check if fundraisingData exists
        if (!this.state.fundraisingData || !Array.isArray(this.state.fundraisingData)) {
          console.error('fundraisingData is not available or not an array:', this.state.fundraisingData);
          return { success: false, error: 'fundraisingData not available' };
        }
        
        // Find the order data to get subtotal information
        let orderData = this.state.fundraisingData.find(order => order._id === orderId);
        
        // If not found in fundraisingData, try originalData as fallback
        if (!orderData && this.state.originalData && Array.isArray(this.state.originalData)) {
          console.log('Order not found in fundraisingData, searching in originalData...');
          orderData = this.state.originalData.find(order => order._id === orderId);
        }
        
        console.log('Found orderData for pricing:', orderData);
        
        let subtotalInfo = null;
        let processedItems = [];
        let processedItemsForBackend = [];
        
        if (orderData) {
          console.log('Order data found, processing items for pricing...');
          console.log('WooCommerce product details available:', this.state.wooCommerceProductDetails?.length || 0);
          
          // Get items from the correct location - could be in orderDetails.items or directly in items
          const itemsArray = orderData.orderDetails?.items || orderData.items || [];
          console.log('Items found in orderData:', itemsArray);
          
          // Use the same item processing logic as generateReceiptFromNumber
          processedItems = itemsArray.map((item, index) => {
            const itemName = item.productName || item.name || item.itemName;
            const quantity = item.quantity || 1;
            
            console.log(`Processing item ${index + 1}: "${itemName}", quantity: ${quantity}`);
            console.log('Item enriched data:', item.enrichedData);
            console.log('Item wooCommerce details:', item.wooCommerceDetails);
            
            // Extract price information from enriched data or fallback (same logic as generateReceiptFromNumber)
            let unitPrice = 0;
            let subtotal = 0;
            let priceSource = 'none';
            
            if (item.enrichedData && item.enrichedData.subtotal > 0) {
              // Use enriched data if available
              unitPrice = item.enrichedData.finalPrice || 0;
              subtotal = item.enrichedData.subtotal;
              priceSource = 'enrichedData';
              console.log(`Using enriched data: price=${unitPrice}, subtotal=${subtotal}`);
            } else if (item.wooCommerceDetails) {
              // Use WooCommerce details as fallback
              unitPrice = parseFloat(item.wooCommerceDetails.price) || 0;
              subtotal = unitPrice * quantity;
              priceSource = 'wooCommerceDetails';
              console.log(`Using wooCommerce details: price=${unitPrice}, subtotal=${subtotal}`);
            } else {
              // Try to get pricing from WooCommerce product details state
              const { wooCommerceProductDetails } = this.state;
              let foundProduct = null;
              
              if (wooCommerceProductDetails && wooCommerceProductDetails.length > 0) {
                // Look for exact match first
                foundProduct = wooCommerceProductDetails.find(product => product.name === itemName);
                
                // If no exact match, try partial matching
                if (!foundProduct) {
                  foundProduct = wooCommerceProductDetails.find(product => 
                    product.name.toLowerCase().includes(itemName.toLowerCase()) ||
                    itemName.toLowerCase().includes(product.name.toLowerCase())
                  );
                }
              }
              
              if (foundProduct) {
                unitPrice = parseFloat(foundProduct.price) || 0;
                subtotal = unitPrice * quantity;
                priceSource = 'wooCommerceProductDetails';
                console.log(`Found in WooCommerce details: ${foundProduct.name}, price=${unitPrice}, subtotal=${subtotal}`);
              } else {
                // Final fallback to item's own price
                unitPrice = item.price || item.unitPrice || 0;
                subtotal = unitPrice * quantity;
                priceSource = 'itemPrice';
                console.log(`Using item's own price: price=${unitPrice}, subtotal=${subtotal}`);
              }
            }
            
            console.log(`Final pricing for "${itemName}": unitPrice=${unitPrice}, subtotal=${subtotal}, source=${priceSource}`);
            
            return {
              productName: itemName,
              quantity: quantity,
              unitPrice: unitPrice,
              subtotal: subtotal,
              matchType: item.enrichedData ? item.enrichedData.matchType : (item.wooCommerceDetails ? 'woocommerce' : 'fallback'),
              priceSource: priceSource
            };
          });
          
          // Convert to the format expected by the rest of the function
          const itemSubtotals = processedItems;
          
          const totalSubtotal = itemSubtotals.reduce((total, item) => total + item.subtotal, 0);
          console.log('Calculated total subtotal:', totalSubtotal);
          console.log('Processed items with pricing:', processedItems);
          
          subtotalInfo = {
            items: itemSubtotals,
            totalSubtotal: totalSubtotal,
            enrichedTotalPrice: orderData.enrichedTotalPrice || 0,
            originalTotalPrice: orderData.originalTotalPrice || orderData.totalPrice || orderData.donationAmount || 0
          };
          
          // Also prepare the processed items for the backend (same as generateReceiptFromNumber)
          processedItemsForBackend = processedItems.map((item, index) => {
            // Find the original item from orderData.items (with null checking)
            const orderItems = orderData.items || [];
            const originalItem = orderItems.find(originalItem => 
              (originalItem.productName || originalItem.name || originalItem.itemName) === item.productName
            ) || orderItems[index] || {}; // Fallback to index-based matching or empty object
            
            const backendItem = {
              ...originalItem,
              productName: item.productName,
              quantity: item.quantity,
              price: item.unitPrice,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal
            };
            
            console.log(`Backend item ${index + 1}:`, backendItem);
            return backendItem;
          });
          
          console.log('Items prepared for backend:', processedItemsForBackend);
          console.log('Subtotal info being sent:', subtotalInfo);
        }
        
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
          {
            purpose: "update",
            _id: orderId,
            newStatus: newStatus,
            clearFundraisingKey: newStatus === "Pending", // Clear fundraisingKey when status is Pending
            subtotalInfo: subtotalInfo, // Include subtotal information in the request
            // Include processed items with pricing (same as generateReceiptFromNumber)
            items: processedItemsForBackend
          }
        );
        
        if (response.data.result && response.data.result.success) {
          console.log('Update response from backend:', response.data.result);
          console.log('PDF Generation flags:', {
            pdfGenerated: response.data.result.pdfGenerated,
            pdfData: !!response.data.result.pdfData,
            pdfFilename: response.data.result.pdfFilename,
            pdfSkipped: response.data.result.pdfSkipped,
            pdfError: response.data.result.pdfError
          });
          
          // Handle PDF generation if the status was changed to "Paid"
          if (newStatus === "Paid") {
            console.log('Status changed to Paid, checking for PDF generation...');
            
            // Check if PDF was generated by the backend
            if (response.data.result.pdfGenerated === true && response.data.result.pdfData) {
              console.log('PDF was generated by backend, handling PDF response...');
              this.handlePdfResponse(response.data.result);
            } else {
              console.log('PDF not generated by backend:', {
                pdfGenerated: response.data.result.pdfGenerated,
                hasPdfData: !!response.data.result.pdfData,
                pdfError: response.data.result.pdfError,
                pdfSkipped: response.data.result.pdfSkipped,
                pdfSkipReason: response.data.result.pdfSkipReason
              });
              console.log('Attempting manual generation...');
              
              // If backend didn't generate PDF, try to generate it manually
              try {
                // Find the updated order data
                const updatedOrderData = this.state.fundraisingData.find(order => order._id === orderId);
                if (updatedOrderData) {
                  await this.generateReceiptFromOrderData(updatedOrderData, subtotalInfo, processedItemsForBackend);
                } else {
                  console.log('Could not find updated order data for manual generation');
                }
              } catch (pdfError) {
                console.error('Error generating PDF manually:', pdfError);
              }
            }
          }
          
          // Table refresh removed - status and receipt number changes will be reflected locally
          // await this.fetchAndSetFundraisingData();
          
          // Return subtotal information for further use if needed
          return { success: true, subtotalInfo };
        } else {
          console.error('Failed to update order status:', response.data);
          return { success: false };
        }
        
      } catch (error) {
        console.error('Error updating order status:', error);
        return { success: false, error: error.message };
      }
    };

    // Update payment method using _id
    updatePaymentMethod = async (orderId, newPaymentMethod) => {
      try {
        console.log(`Updating order ${orderId} payment method to: ${newPaymentMethod}`);
        
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
          {
            purpose: "updatePaymentMethod",
            _id: orderId,
            newPaymentMethod: newPaymentMethod
          }
        );
        
        if (response.data.result && response.data.result.success) {
          console.log('Payment method update response from backend:', response.data.result);
          
          // Emit Socket.IO event for real-time updates if available
          if (this.socket) {
            this.socket.emit('fundraising', {
              action: 'updatePaymentMethod',
              orderId: orderId,
              newPaymentMethod: newPaymentMethod
            });
          }
          
          return { success: true };
        } else {
          console.error('Failed to update payment method:', response.data);
          return { success: false };
        }
        
      } catch (error) {
        console.error('Error updating payment method:', error);
        return { success: false, error: error.message };
      }
    };

    // Generate receipt manually when backend doesn't generate it
    generateReceiptFromOrderData = async (orderData, subtotalInfo, processedItems) => {
      try {
        console.log('Generating receipt manually for order:', orderData._id);
        
        // Calculate total amount from subtotalInfo or processedItems
        let totalAmount = subtotalInfo?.totalSubtotal || 0;
        
        if (totalAmount === 0 && processedItems && processedItems.length > 0) {
          totalAmount = processedItems.reduce((total, item) => total + (item.subtotal || 0), 0);
        }
        
        // Construct order data for receipt generation
        const receiptOrderData = {
          _id: orderData._id,
          personalInfo: {
            firstName: orderData.personalInfo?.firstName || orderData.firstName,
            lastName: orderData.personalInfo?.lastName || orderData.lastName,
            phone: orderData.personalInfo?.phone || orderData.contactNumber,
            email: orderData.personalInfo?.email || orderData.email,
            address: orderData.personalInfo?.address || orderData.address,
            postalCode: orderData.personalInfo?.postalCode || orderData.postalCode
          },
          items: processedItems || orderData.items || [],
          totalPrice: totalAmount,
          donationAmount: totalAmount,
          paymentMethod: orderData.paymentDetails?.paymentMethod || orderData.paymentMethod,
          collectionMode: orderData.collectionDetails?.collectionMode || orderData.collectionMode,
          collectionDeliveryLocation: orderData.collectionDetails?.CollectionDeliveryLocation || orderData.collectionDeliveryLocation,
          collectionDate: orderData.collectionDetails?.collectionDate || orderData.collectionDate,
          collectionTime: orderData.collectionDetails?.collectionTime || orderData.collectionTime,
          collectionDetails: orderData.collectionDetails || {},
          status: "Paid",
          receiptNumber: orderData.fundraisingKey || orderData.receiptNumber,
          subtotalInfo: subtotalInfo
        };
        
        console.log('Sending manual receipt generation request:', receiptOrderData);
        
        // Call backend to generate receipt
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
          {
            purpose: "generateReceipt",
            ...receiptOrderData
          }
        );

        console.log('Manual receipt generation response:', response.data);
        
        // Handle the PDF response
        if (response.data.result && response.data.result.success && response.data.result.pdfGenerated) {
          this.handlePdfResponse(response.data.result);
        } else {
          console.error('Failed to generate receipt manually:', response.data);
        }
      } catch (error) {
        console.error('Error in manual receipt generation:', error);
      }
    };

    // Handle PDF response from backend
    handlePdfResponse = (result) => {
      try {
        const { pdfData, pdfFilename } = result;
        
        if (!pdfData) {
          return;
        }
        
        // Convert base64 to binary data
        const binaryString = atob(pdfData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create a Blob from the binary data
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        // Create a Blob URL
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Open PDF in a new tab for viewing
        const pdfWindow = window.open(blobUrl, '_blank');
        
        
        // Auto download the PDF with the custom filename
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = pdfFilename || 'fundraising_receipt.pdf';
        downloadLink.click();
        
        window.URL.revokeObjectURL(blobUrl);
        
      } catch (error) {
        console.error('Error handling PDF response:', error);
      }
    };

    // Handle stock reduction when status changes to Paid
    handleStatusChangeToPaid = async (rowData) => {
      console.log('Status changed to Paid for order:', rowData);
      
      if (!rowData.items || rowData.items.length === 0) {
        console.log('No items found for this order');
        return;
      }
      
      try {
        // Reduce stock for each item in WooCommerce
        for (const item of rowData.items) {
          await this.reduceWooCommerceStock(item, rowData);
        }
        
      } catch (error) {
        console.error('Error reducing stock:', error);
      }
    };

    // Handle stock increase when status changes to Refunded
    handleStatusChangeToRefunded = async (rowData) => {
      console.log('Status changed to Refunded for order:', rowData);
      
      if (!rowData.items || rowData.items.length === 0) {
        console.log('No items found for this order');
        return;
      }
      
      try {
        // Increase stock for each item in WooCommerce
        for (const item of rowData.items) {
          await this.increaseWooCommerceStock(item, rowData);
        }
        
        console.log('Stock increase completed for order:', rowData.id);
      } catch (error) {
        console.error('Error increasing stock:', error);
      }
    };

    // Handle stock increase when status changes to Cancelled (only if previous status was Paid)
    handleStatusChangeToCancelled = async (rowData, previousStatus) => {
      console.log('Status changed to Cancelled for order:', rowData);
      console.log('Previous status was:', previousStatus);
      
      // Only increase stock if the previous status was "Paid"
      // If it was "Pending", no stock reduction occurred, so no need to increase stock
      if (previousStatus !== 'Paid') {
        console.log('Previous status was not Paid, no stock adjustment needed');
        return;
      }
      
      if (!rowData.items || rowData.items.length === 0) {
        console.log('No items found for this order');
        return;
      }
      
      try {
        // Increase stock for each item in WooCommerce (same as refunded)
        for (const item of rowData.items) {
          await this.increaseWooCommerceStock(item, rowData);
        }
        
        console.log('Stock increase completed for cancelled order:', rowData.id);
      } catch (error) {
        console.error('Error increasing stock for cancelled order:', error);
      }
    };

    // Reduce stock in WooCommerce
    reduceWooCommerceStock = async (item, orderData) => 
    {
      try {
        const quantity = item.quantity || 1;
        const originalProductName = item.productName;
        
        // Get product ID from available data
        let productId = null;
        
        // Search in wooCommerceProductDetails state
        const { wooCommerceProductDetails } = this.state;
        console.log('WooCommerceProductDetails:', wooCommerceProductDetails);

        // Try exact match first
        let foundProduct = wooCommerceProductDetails.find(product => 
          //console.log("Product Name: ", product.name, "Original Product Name: ", originalProductName, product.name === originalProductName)
          product.name === originalProductName
        );
        
        if (foundProduct) {
          productId = foundProduct.id;
      }
    
      const requestPayload = {
        product_id: productId,
        method: "reduce",
        stock_quantity: quantity // Amount to reduce
      };
        
      // Use your existing Django endpoint for stock updates
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/update_fundraising_product_stock/`,
        requestPayload
      );
      
      console.log('Stock reduction response:', response.data);
      
      if (response.data.success) {
        console.log(`Stock reduced successfully for "${originalProductName}" (Quantity: ${quantity})`);
      } else {
        console.error(`Failed to reduce stock for product "${originalProductName}":`, response.data.error || response.data);
      }
        
      } catch (error) {
        console.error('Error calling WooCommerce stock reduction API:', error);
        console.error(`Error reducing stock for "${item.productName || item.name || item.itemName || 'Unknown product'}":`, error.message);
      }
    };

    // Increase stock in WooCommerce for refunded orders
    increaseWooCommerceStock = async (item, orderData) => {
      try {
        const quantity = item.quantity || 1;
        const originalProductName = item.productName;
        
        // Get product ID from available data
        let productId = null;
        
        // Search in wooCommerceProductDetails state
        const { wooCommerceProductDetails } = this.state;
        console.log('WooCommerceProductDetails:', wooCommerceProductDetails);

        // Try exact match first
        let foundProduct = wooCommerceProductDetails.find(product => 
          product.name === originalProductName
        );
        
        if (foundProduct) {
          productId = foundProduct.id;
        }
    
        const requestPayload = {
          product_id: productId,
          method: "increase", // Use "increase" to add stock back
          stock_quantity: quantity // Amount to increase
        };
        
        // Use your existing Django endpoint for stock updates
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/update_fundraising_product_stock/`,
          requestPayload
        );
        
        console.log('Stock increase response:', response.data);
        
        if (response.data.success) {
          console.log(`Stock increased successfully for "${originalProductName}" (Quantity: ${quantity})`);
        } else {
          console.error(`Failed to increase stock for product "${originalProductName}":`, response.data.error || response.data);
        }
        
      } catch (error) {
        console.error('Error calling WooCommerce stock increase API:', error);
        console.error(`Error increasing stock for "${item.productName || item.name || item.itemName || 'Unknown product'}":`, error.message);
      }
    };

    // Update fundraising record in backend
    updateFundraisingRecord = async (rowData) => {
      try {
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
          {
            purpose: 'update',
            id: rowData.id,
            data: {
              firstName: rowData.firstName,
              lastName: rowData.lastName,
              contactNumber: rowData.contactNumber,
              email: rowData.email,
              donationAmount: rowData.donationAmount,
              paymentMethod: rowData.paymentMethod,
              collectionMode: rowData.collectionMode,
              status: rowData.status
            }
          }
        );
        
        if (response.data.result && response.data.result.success) {
          console.log('Fundraising record updated successfully');
        } else {
          console.error('Failed to update fundraising record:', response.data);
        }
        
      } catch (error) {
        console.error('Error updating fundraising record:', error);
      }
    };

    // Handle cell clicks
    handleValueClick = (params) => {
      console.log('Cell clicked:', params);
      
      // Check if the clicked cell is the contact number field
      if (params.colDef.field === 'contactNumber' && params.value) {
        this.handleContactNumberClick(params);
      }
    };

    // Handle contact number cell clicks for WhatsApp integration
    handleContactNumberClick = (params) => {
      console.log('Data Row clicked:', params.data);
      
      const phoneNumber = this.formatPhoneNumber(params.value);
      const customerName = this.getCustomerName(params.data);
      const paymentMethod = params.data.paymentMethod || '';
      
      if (paymentMethod.toLowerCase() === 'paynow') {
        this.openWhatsAppPayNowMessage(phoneNumber, customerName, params.data);
      } else if (paymentMethod.toLowerCase() === 'cash') {
        this.openWhatsAppCashPaymentMessage(phoneNumber, customerName, params.data);
      }
      // Add other payment methods here if needed
    };

    // Format phone number for Singapore (+65)
    formatPhoneNumber = (phoneValue) => {
      let phoneNumber = phoneValue.toString().replace(/\s+/g, '').replace(/[-()]/g, '');
      
      // Ensure phone number starts with country code (assuming Singapore +65 if no country code)
      if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('65') && phoneNumber.length === 8) {
        phoneNumber = '65' + phoneNumber;
      }
      
      return phoneNumber;
    };

    // Get customer name from data
    getCustomerName = (data) => {
      const firstName = data.firstName || '';
      const lastName = data.lastName || '';
      return firstName && lastName ? `${firstName} ${lastName}` : (firstName || lastName || 'Customer');
    };

    // Calculate order amount from multiple sources
    calculateOrderAmount = (data) => {
      console.log('Available data fields:', {
        donationAmount: data.donationAmount,
        enrichedTotalPrice: data.enrichedTotalPrice,
        originalTotalPrice: data.originalTotalPrice,
        items: data.items
      });
      
      // Try multiple sources for order amount
      let orderAmount = data.donationAmount || data.enrichedTotalPrice || data.originalTotalPrice;
      
      // If still no amount, calculate from items
      if (!orderAmount || orderAmount === '' || orderAmount === 0) {
        orderAmount = this.calculateAmountFromItems(data.items || []);
      }
      
      return orderAmount;
    };

    // Calculate total amount from items array
    calculateAmountFromItems = (items) => {
      console.log('No direct amount found, calculating from items...');
      let calculatedTotal = 0;
      
      items.forEach((item, index) => {
        const itemPrice = item.price || item.unitPrice || 0;
        const quantity = item.quantity || 1;
        const itemSubtotal = itemPrice * quantity;
        calculatedTotal += itemSubtotal;
        console.log(`Item ${index + 1}: ${item.productName || 'Unknown'} - $${itemPrice} x ${quantity} = $${itemSubtotal}`);
      });
      
      console.log('Calculated total from items:', calculatedTotal);
      return calculatedTotal;
    };

    // Format amount as currency string
    formatOrderAmount = (orderAmount) => {
      console.log('Final order amount before formatting:', orderAmount);
      
      if (!orderAmount || orderAmount === '' || orderAmount === null || orderAmount === undefined || orderAmount === 0) {
        console.log('Order amount was still empty, using default: $0.00');
        return '$0.00';
      }
      
      const numericAmount = parseFloat(orderAmount.toString().replace(/[\$,]/g, ''));
      if (isNaN(numericAmount)) {
        console.log('Could not parse order amount, using default: $0.00');
        return '$0.00';
      }
      
      const formattedAmount = `$${numericAmount.toFixed(2)}`;
      console.log('Successfully formatted order amount:', formattedAmount);
      return formattedAmount;
    };

    // Create PayNow WhatsApp message
    createPayNowMessage = (customerName, orderReference, orderAmount) => {
      return `Hello ${customerName}, thank you for your support!
Please complete your payment using PayNow.
UEN: T03SS0051L
Payment Reference: ${orderReference} (please key in this reference in your PayNow transaction)
Amount: ${orderAmount}
After you have made the payment, please screenshot your successful transaction and send it to this number.

---

Hai ${customerName}, terima kasih atas sokongan anda!
Sila lengkapkan pembayaran menggunakan PayNow.
UEN: T03SS0051L
Rujukan Pembayaran: ${orderReference} (sila masukkan rujukan ini semasa transaksi PayNow anda)
Jumlah: ${orderAmount}
Selepas membuat pembayaran, sila tangkap skrin transaksi yang berjaya dan hantar ke nombor ini.

---

您好 ${customerName}，感谢您的支持！
请通过 PayNow 完成付款。
UEN: T03SS0051L
付款参考: ${orderReference}（请在您的 PayNow 交易中填写此参考号码）
金额: ${orderAmount}
付款完成后，请截屏成功交易并发送至此号码。`;
    };

    // Create Cash payment WhatsApp message
    createCashPaymentMessage = (customerName, orderAmount, paymentLocation) => {
      return `Hello ${customerName}, thank you for your support!
Amount: ${orderAmount}
Payment Location: ${paymentLocation}
Please make your payment at the aforementioned location to confirm your order.

---

Hai ${customerName}, terima kasih atas sokongan anda!
Jumlah: ${orderAmount}
Lokasi Pembayaran: ${paymentLocation}
Sila buat pembayaran anda di lokasi tersebut untuk mengesahkan pesanan anda.

---

您好 ${customerName}，感谢您的支持！
金额: ${orderAmount}
付款地点: ${paymentLocation}
请在上述地点进行付款以确认您的订单。`;
    };

    // Open WhatsApp with PayNow payment message
    openWhatsAppPayNowMessage = (phoneNumber, customerName, data) => {
      console.log('Processing PayNow payment for:', customerName);
      
      const orderAmount = this.calculateOrderAmount(data);
      const formattedAmount = this.formatOrderAmount(orderAmount);
      const orderReference = data.invoiceNumber || data.receiptNumber || data.id || 'Order Reference';
      
      const message = this.createPayNowMessage(customerName, orderReference, formattedAmount);
      const whatsappWebURL = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
      
      window.open(whatsappWebURL, "_blank");
    };

    // Open WhatsApp with Cash payment message
    openWhatsAppCashPaymentMessage = (phoneNumber, customerName, data) => {
      console.log('Processing Cash payment for:', customerName);
      
      const orderAmount = this.calculateOrderAmount(data);
      const formattedAmount = this.formatOrderAmount(orderAmount);
      
      // Get station location and normalize it
      let stationLocation = data.stationLocation;
      if (stationLocation === 'Others' || stationLocation === 'En Community Church') {
        stationLocation = 'CT Hub';
      }
      
      const message = this.createCashPaymentMessage(customerName, formattedAmount, stationLocation);
      const whatsappWebURL = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
      
      window.open(whatsappWebURL, "_blank");
    };

    // Grid API initialization
    onGridReady = (params) => {
      this.gridApi = params.api;
      this.gridColumnApi = params.columnApi;
      
      console.log("Grid API initialized successfully");
    };

    // Helper method: Get Excel export headers
    getExcelHeaders = () => {
      const headers = [
        'S/N',
        'First Name',
        'Last Name',
        'Email',
        'Contact Number',
        'Station Location',
        'Items Summary',
        'Total Price',
        'Payment Method',
        'Invoice Number',
        'Order Details',
        'Status',
        'Collection Mode',
        'Collection Location',
        'Collection Details',
        'Receipt Number',
      ];

      return headers.filter(header => typeof header === 'string' && header.trim() !== '');
    };

    // Helper method: Format items summary
    formatItemsSummary = (items) => {
      if (!items || items.length === 0) return '';
      
      return items.map(itemDetail => {
        const name = itemDetail.productName || itemDetail.name || itemDetail.itemName || 'Unknown Item';
        const quantity = itemDetail.quantity || 1;
        return `${name} (x${quantity})`;
      }).join(', ');
    };

    // Helper method: Format price display
    formatPriceDisplay = (item, row) => {
      const originalPrice = item.orderDetails?.totalPrice || item.totalPrice || item.donationAmount;
      const enrichedPrice = item.enrichedTotalPrice || row.enrichedTotalPrice || 0;
      
      if (enrichedPrice > 0) {
        return `$${enrichedPrice.toFixed(2)}`;
      } else if (originalPrice && !isNaN(originalPrice)) {
        return `$${parseFloat(originalPrice).toFixed(2)}`;
      } else {
        return '$0.00';
      }
    };

    // Helper method: Get collection location
    getCollectionLocation = (item, row) => {
      return item.collectionDetails?.CollectionDeliveryLocation || 
             item.collectionDetails || 
             row.collectionDetails || 
             'Unknown Location';
    };

    // Helper method: Get order details
    getOrderDetails = (item) => {
      const orderDate = item.orderDetails?.orderDate || item.orderDate || '';
      const orderTime = item.orderDetails?.orderTime || item.orderTime || '';
      
      // Format date to dd/mm/yyyy hh:mm
      const formatDate = (dateValue) => {
        if (!dateValue) return '';
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
        return '';
      };

      const createdAt = formatDate(item.createdAt || item._id?.getTimestamp?.());

      // Combine order date and time with proper formatting
      if (orderDate && orderTime) {
        // If both date and time are available, try to parse and format them
        const combinedDateTime = new Date(`${orderDate} ${orderTime}`);
        if (!isNaN(combinedDateTime.getTime())) {
          return formatDate(combinedDateTime);
        } else {
          return `${orderDate} at ${orderTime}`;
        }
      } else if (orderDate) {
        // Try to parse just the date
        const dateOnly = new Date(orderDate);
        if (!isNaN(dateOnly.getTime())) {
          const day = String(dateOnly.getDate()).padStart(2, '0');
          const month = String(dateOnly.getMonth() + 1).padStart(2, '0');
          const year = dateOnly.getFullYear();
          return `${day}/${month}/${year}`;
        } else {
          return orderDate;
        }
      } else if (orderTime) {
        return orderTime;
      } else if (createdAt) {
        return createdAt;
      } else {
        return 'Date not available';
      }
    };

    // Helper method: Get collection details
    getCollectionDetails = (item) => {
      const collectionDetails = item.collectionDetails;
      if (collectionDetails && (collectionDetails.collectionDate || collectionDetails.collectionTime)) {
        // Format date to dd/mm/yyyy
        let formattedDate = "TBD";
        if (collectionDetails.collectionDate) {
          const date = new Date(collectionDetails.collectionDate);
          if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
          } else {
            formattedDate = collectionDetails.collectionDate;
          }
        }
        
        // Keep the original time format (preserve time ranges like "10:00-16:00")
        let formattedTime = "TBD";
        if (collectionDetails.collectionTime) {
          // Use the original time format as-is to preserve ranges
          formattedTime = collectionDetails.collectionTime;
        }
        
        return `${formattedDate} ${formattedTime}`;
      }
      return "Not set";
    };

    // Helper method: Build row data for export
    buildExportRowData = (item, row, index, headers) => {
      const items = item.orderDetails?.items || item.items || row.items || [];
      const itemsSummary = this.formatItemsSummary(items);
      const displayPrice = this.formatPriceDisplay(item, row);
      const stationLocation = item.personalInfo?.location;
      const collectionLocation = this.getCollectionLocation(item, row);
      const orderDetails = this.getOrderDetails(item);
      const collectionDetails = this.getCollectionDetails(item);

      const completeRowData = [
        row.sn || index + 1, // S/N
        item.personalInfo?.firstName || item.firstName || row.firstName || '', // First Name
        item.personalInfo?.lastName || item.lastName || row.lastName || '', // Last Name
        item.personalInfo?.email || item.email || row.email || '', // Email
        item.personalInfo?.phone || item.contactNumber || row.contactNumber || '', // Contact Number
        stationLocation, // Station Location
        itemsSummary, // Items Summary
        displayPrice, // Total Price
        item.paymentDetails?.paymentMethod || item.paymentMethod || row.paymentMethod || '', // Payment Method
        item.invoiceNumber || item.paymentDetails?.invoiceNumber || row.invoiceNumber || '', // Invoice Number
        orderDetails, // Order Details
        item.status || row.status || 'Pending', // Status
        item.collectionDetails?.collectionMode || item.collectionMode || row.collectionMode || '', // Collection Mode
        collectionLocation, // Collection Location
        collectionDetails, // Collection Details
        item.receiptNumber || row.receiptNumber || '', // Receipt Number
      ];

      // Filter data to match only active headers (non-commented)
      return completeRowData.filter((_, index) => {
        const header = headers[index];
        return typeof header === 'string' && header.trim() !== '';
      });
    };

    // Helper method: Get background color for location
    getLocationBackgroundColor = (location, isStationLocation = false) => {
      const locationKey = isStationLocation ? 
        (location?.includes('CT Hub') ? 'CT Hub' :
         location?.includes('Pasir Ris West Wellness Centre') ? 'Pasir Ris West Wellness Centre' :
         location?.includes('Tampines North Community Club') ? 'Tampines North Community Club' : null) :
        location;

      switch (locationKey) {
        case 'CT Hub':
          return 'FFE8F5E8'; // Soft pastel green
        case 'Pasir Ris West Wellness Centre':
          return 'FFE6F3FF'; // Soft pastel blue
        case 'Tampines North Community Club':
          return 'FFFFFACD'; // Soft pastel yellow
        default:
          return null;
      }
    };

    // Helper method: Get tab color for location
    getLocationTabColor = (location) => {
      switch (location) {
        case 'CT Hub':
          return 'FFE8F5E8'; // Soft pastel green (with FF prefix for tab color)
        case 'Pasir Ris West Wellness Centre':
          return 'FFE6F3FF'; // Soft pastel blue (with FF prefix for tab color)
        case 'Tampines North Community Club':
          return 'FFFFFF99'; // Soft pastel yellow (with FF prefix for tab color)
        default:
          return null;
      }
    };

    // Helper method: Apply header styling
    applyHeaderStyling = (headerRow) => {
      headerRow.font = { bold: true };
      
      headerRow.eachCell((cell, colNumber) => {
        const hasHeader = cell.value && cell.value.toString().trim() !== '';
        
        if (hasHeader) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
          };
        }
      });
    };

    // Helper method: Apply row styling with background color
    applyRowStyling = (excelRow, headerRow, backgroundColor) => {
      if (!backgroundColor) return;

      excelRow.eachCell((cell, colNumber) => {
        // Only apply background color to cells under valid headers (regardless of content)
        const headerCell = headerRow.getCell(colNumber);
        const hasHeader = headerCell.value && headerCell.value.toString().trim() !== '';
        
        if (hasHeader) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: backgroundColor }
          };
        }
      });
    };

    // Helper method: Auto-fit worksheet columns
    autoFitColumns = (worksheet) => {
      worksheet.columns.forEach((column, columnIndex) => {
        let maxLength = 10;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value ? cell.value.toString() : '';
          maxLength = Math.max(maxLength, cellValue.length);
        });
        
        // Get the header value for this column
        const headerCell = worksheet.getRow(1).getCell(columnIndex + 1);
        const headerValue = headerCell.value ? headerCell.value.toString() : '';
        
        // Apply different width limits based on column type
        if (headerValue === 'Items Summary') {
          // Allow Items Summary to be much wider to show full content
          column.width = Math.min(maxLength + 2, 120); // Cap at 120 characters for Items Summary
        } else {
          // Standard cap for other columns
          column.width = Math.min(maxLength + 2, 50); // Cap at 50 characters
        }
      });
    };

    // Helper method: Group data by collection location
    groupDataByLocation = (dataToExport) => {
      const locationGroups = {};
      
      dataToExport.forEach((item, index) => {
        const row = this.state.rowData[index] || {};
        const collectionLocation = this.getCollectionLocation(item, row);
        
        if (!locationGroups[collectionLocation]) {
          locationGroups[collectionLocation] = [];
        }
        
        locationGroups[collectionLocation].push({ item, row, originalIndex: index });
      });

      return locationGroups;
    };

    // Helper method: Create and populate worksheet
    createWorksheet = (workbook, sheetName, activeHeaders, originalLocationName = null, isAllDataSheet = false) => {
      const worksheet = workbook.addWorksheet(sheetName);
      
      // Set tab color for location-specific sheets
      if (!isAllDataSheet && originalLocationName) {
        const tabColor = this.getLocationTabColor(originalLocationName);
        if (tabColor) {
          worksheet.properties.tabColor = { argb: tabColor };
        }
      }

      // Add headers
      worksheet.addRow(activeHeaders);
      const headerRow = worksheet.getRow(1);
      this.applyHeaderStyling(headerRow);

      return { worksheet, headerRow };
    };

    // Helper method: Add data to worksheet
    addDataToWorksheet = (worksheet, headerRow, dataToProcess, activeHeaders, allHeaders) => {
      dataToProcess.forEach(({ item, row, originalIndex }) => {
        const exportRowData = this.buildExportRowData(item, row, originalIndex || row.sn - 1 || 0, allHeaders);
        const excelRow = worksheet.addRow(exportRowData);
        
        // Apply color coding based on collection location
        const collectionLocation = this.getCollectionLocation(item, row);
        const backgroundColor = this.getLocationBackgroundColor(collectionLocation, false);
        this.applyRowStyling(excelRow, headerRow, backgroundColor);
      });
    };

    // Main Export method: Export table data to Excel
    exportToExcel = async () => {
      try {
        console.log('Starting Excel export...');
        console.log('Original data length:', this.state.originalData?.length || 0);
        console.log('Row data length:', this.state.rowData?.length || 0);
        console.log('Sample original data:', this.state.originalData?.[0]);
        console.log('Sample row data:', this.state.rowData?.[0]);
        
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        
        // Get headers and data
        const allHeaders = [
          'S/N', 'First Name', 'Last Name', 'Email', 'Contact Number',
          'Station Location', 'Items Summary', 'Total Price',
          'Payment Method', 'Invoice Number', 'Order Details', 'Status',
          'Collection Mode', 'Collection Location', 'Collection Details', 'Receipt Number'
        ];
        const activeHeaders = this.getExcelHeaders();
        const dataToExport = this.state.originalData || this.state.rowData;
        
        // Group data by collection location
        const locationGroups = this.groupDataByLocation(dataToExport);
        console.log('Location groups:', Object.keys(locationGroups));

        // Create "All Locations" worksheet
        const { worksheet: allDataWorksheet, headerRow: allDataHeaderRow } = 
          this.createWorksheet(workbook, 'All Locations', activeHeaders, null, true);

        // Add all data to the first worksheet
        const allDataFormatted = dataToExport.map((item, index) => ({
          item,
          row: this.state.rowData[index] || {},
          originalIndex: index
        }));
        
        this.addDataToWorksheet(allDataWorksheet, allDataHeaderRow, allDataFormatted, activeHeaders, allHeaders);
        this.autoFitColumns(allDataWorksheet);

        // Create worksheets for each location
        Object.entries(locationGroups).forEach(([location, locationData]) => {
          // Clean up location name for sheet name (Excel sheet names have restrictions)
          const sheetName = location.replace(/[\\\/\?\*\[\]]/g, '_').substring(0, 31);
          
          const { worksheet, headerRow } = this.createWorksheet(workbook, sheetName, activeHeaders, location);
          this.addDataToWorksheet(worksheet, headerRow, locationData, activeHeaders, allHeaders);
          this.autoFitColumns(worksheet);
        });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `Fundraising_Orders_Archive_${timestamp}.xlsx`;

        // Save the file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        saveAs(blob, filename);

        console.log('Excel export completed successfully');

      } catch (error) {
        console.error('Error exporting to Excel:', error);
      }
    };

    // Generate Sales Report with Total
    generateSalesReport = () => {
      // Call parent component's openSalesReportModal method
      if (this.props.openSalesReportModal) {
        this.props.openSalesReportModal();
      } else {
        console.warn('openSalesReportModal method not available from parent component');
      }
    };

    // Helper method: Add payment data to worksheet and return total
    addPaymentDataToWorksheet = (worksheet, headerRow, dataToProcess, activeHeaders, allHeaders) => {
      let total = 0;
      
      dataToProcess.forEach(({ item, row, originalIndex }) => {
        // Calculate pricing
        const originalPrice = item.orderDetails?.totalPrice || item.totalPrice || item.donationAmount;
        const enrichedPrice = item.enrichedTotalPrice || row.enrichedTotalPrice || 0;
        
        let totalPriceValue = 0;
        let totalPriceDisplay = '';
        
        if (enrichedPrice > 0) {
          totalPriceValue = enrichedPrice;
          totalPriceDisplay = `$${enrichedPrice.toFixed(2)}`;
        } else if (originalPrice && !isNaN(originalPrice)) {
          totalPriceValue = parseFloat(originalPrice);
          totalPriceDisplay = `$${totalPriceValue.toFixed(2)}`;
        } else {
          totalPriceValue = 0;
          totalPriceDisplay = '$0.00';
        }

        // Add to total only if status is "Paid" or "Collected" and amount is positive
        const status = item.status || row.status || 'Pending';
        if ((status === 'Paid' || status === 'Collected') && totalPriceValue > 0) {
          total += totalPriceValue;
        }

        // Format items summary
        const items = item.orderDetails?.items || item.items || row.items || [];
        const itemsSummary = this.formatItemsSummary(items);
        
        // Get order details
        const orderDetails = this.getOrderDetails(item);
        
        // Get collection details
        const collectionDetails = this.getCollectionDetails(item);
        
        // Get collection location
        const collectionLocation = this.getCollectionLocation(item, row);

        // Build sales report row data
        const completeRowData = [
          row.sn || originalIndex + 1, // S/N
          item.personalInfo?.firstName || item.firstName || row.firstName || '', // First Name
          item.personalInfo?.lastName || item.lastName || row.lastName || '', // Last Name
          item.personalInfo?.email || item.email || row.email || '', // Email
          item.personalInfo?.phone || item.contactNumber || row.contactNumber || '', // Contact Number
          item.personalInfo?.location, // Station Location
          itemsSummary, // Items Summary
          totalPriceDisplay, // Total Price
          item.paymentDetails?.paymentMethod || item.paymentMethod || row.paymentMethod || '', // Payment Method
          item.invoiceNumber || item.paymentDetails?.invoiceNumber || row.invoiceNumber || '', // Invoice Number
          orderDetails, // Order Details
          item.status || row.status || 'Pending', // Status
          item.collectionDetails?.collectionMode || item.collectionMode || row.collectionMode || '', // Collection Mode
          collectionLocation, // Collection Location
          collectionDetails, // Collection Details
          item.receiptNumber || row.receiptNumber || '', // Receipt Number
        ];

        // Filter data to match only active headers
        const paymentRowData = completeRowData.filter((_, index) => {
          const header = allHeaders[index];
          return typeof header === 'string' && header.trim() !== '';
        });

        const excelRow = worksheet.addRow(paymentRowData);
        
        // Apply color coding based on collection location
        const backgroundColor = this.getLocationBackgroundColor(collectionLocation, false);
        this.applyRowStyling(excelRow, headerRow, backgroundColor);
      });
      
      return total;
    };

    // Helper method: Add total row to sales report
    addPaymentTotalRow = (worksheet, total, headerCount) => {
      // Add empty row after data
      worksheet.addRow([]);

      // Create total row data array
      const totalRowData = new Array(headerCount).fill('');
      totalRowData[6] = 'TOTAL:'; // Items Summary column (column before Total Price)
      totalRowData[7] = `$${total.toFixed(2)}`; // Total Price column (correct index)

      // Filter to match active headers
      const filteredTotalRowData = totalRowData.filter((_, index) => {
        // This should match the same filtering logic as the data rows
        return index < headerCount;
      });

      const totalRow = worksheet.addRow(filteredTotalRowData);
      const headerRow = worksheet.getRow(1);

      // Apply soft pastel pink background color only to cells with valid headers
      totalRow.eachCell((cell, colNumber) => {
        const headerCell = headerRow.getCell(colNumber);
        const hasHeader = headerCell.value && headerCell.value.toString().trim() !== '';
        
        if (hasHeader) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFE0F0' } // Soft pastel pink background
          };
          cell.font = { bold: true };
        }
      });

      // Style the total label cell with right alignment
      const labelCell = worksheet.getCell(totalRow.number, 5); // Email column (since Address and Postal Code are commented out)
      labelCell.alignment = { horizontal: 'right' };
    };

    // Export confirmed (Paid status) items sales to Excel by location
    render() 
    {
      const { isLoading, rowData, fundraisingData } = this.state;

      return (
        <div className="fundraising-container">
          <div className="fundraising-heading">
            <h2>Fundraising Orders</h2>
             <div className="button-row"> 
              <button 
                className="fundraising-export-btn"
                onClick={this.exportToExcel}
              >
              Archive Data
              </button>
              <button 
                className="fundraising-sales-report-btn"
                onClick={this.generateSalesReport}
              >
              Sales Report
              </button>

            </div>
          </div>

          <div className="grid-container">
            <AgGridReact
              ref={this.gridRef}
              rowData={this.state.rowData}
              columnDefs={this.getColumnDefs()}
              onGridReady={this.onGridReady}
              onCellValueChanged={this.onCellValueChanged}
              onCellClicked={this.handleValueClick}
              suppressRowClickSelection={true}
              pagination={true}
              paginationPageSize={this.state.rowData.length}
              domLayout="normal"
              getRowStyle={this.getRowStyle}
              defaultColDef={{
                resizable: true,
                sortable: true
              }}
            />
          </div>
          
          {/* Items Modal */}
          {this.renderItemsModal()}
        </div>
      );
    }
}

export default FundraisingOrders;