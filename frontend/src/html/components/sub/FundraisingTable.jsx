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

class FundraisingTable extends Component {
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
        isLoadingProductDetails: false  // Loading state for product details
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
          purpose: 'retrieve'
        });

        console.log('Fundraising data fetched:', response);
        
        // Check if the response has the expected structure
        if (response.data.result && response.data.result.success && response.data.result.data) {
          return response.data.result.data;
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
      // Check if filter props have changed and apply filtering
      if (
        prevProps.paymentMethod !== this.props.paymentMethod ||
        prevProps.collectionMode !== this.props.collectionMode ||
        prevProps.status !== this.props.status ||
        prevProps.searchQuery !== this.props.searchQuery
      ) {
        this.applyFilters();
      }
    }

    // Method to apply filters based on current props
    applyFilters = () => {
      const { paymentMethod, collectionMode, status, searchQuery } = this.props;
      const { originalData } = this.state;

      console.log("FundraisingTable - applyFilters called with props:", { 
        paymentMethod, 
        collectionMode, 
        status, 
        searchQuery,
        originalDataLength: originalData ? originalData.length : 0
      });

      if (!originalData || originalData.length === 0) {
        console.log("FundraisingTable - No original data available for filtering");
        return;
      }

      let filteredData = [...originalData];

      // Apply payment method filter
      if (paymentMethod && paymentMethod !== 'All Payment Methods' && paymentMethod !== '') {
        filteredData = filteredData.filter(record => 
          record.paymentMethod && record.paymentMethod.toLowerCase().includes(paymentMethod.toLowerCase())
        );
      }

      // Apply collection mode filter
      if (collectionMode && collectionMode !== 'All Collection Modes' && collectionMode !== '') {
        filteredData = filteredData.filter(record => 
          record.collectionMode && record.collectionMode.toLowerCase().includes(collectionMode.toLowerCase())
        );
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

      console.log("Applied filters:", { paymentMethod, collectionMode, status, searchQuery });
      console.log("Filtered data length:", filteredData.length);

      this.setState({
        fundraisingData: filteredData
      }, () => {
        this.getRowData(filteredData);
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
      const uniquePaymentMethods = ['All Payment Methods', ...new Set(enrichedData.map(record => record.paymentMethod).filter(Boolean))];
      const uniqueCollectionModes = ['All Collection Modes', ...new Set(enrichedData.map(record => record.collectionMode).filter(Boolean))];
      const uniqueStatuses = ['All Statuses', ...new Set(enrichedData.map(record => record.status).filter(Boolean))];

      console.log("Unique payment methods:", uniquePaymentMethods);
      console.log("Unique collection modes:", uniqueCollectionModes);
      console.log("Unique statuses:", uniqueStatuses);

      this.setState({
        originalData: enrichedData,
        fundraisingData: enrichedData,
        isLoading: false
      }, () => {
        console.log("Enhanced data loaded with product details, originalData length:", enrichedData || 0);
        this.getRowData(enrichedData);

        // Pass filter options to parent component if callback is provided
        if (this.props.onFiltersLoaded) {
          this.props.onFiltersLoaded(uniquePaymentMethods, uniqueCollectionModes, uniqueStatuses);
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

    getRowData = (fundraisingData) => 
    {
      console.log('Processing enriched fundraising data in getRowData:', fundraisingData);
      
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
          donationAmount: displayAmount,
          donationDate: item.orderDate,
          receiptNumber: item.fundraisingKey || item.receiptNumber || '',
          items: item.items, // This now contains enriched items with WooCommerce details
          status: item.status || 'Pending',
          address: item.personalInfo?.address || item.address || '',
          postalCode: item.personalInfo?.postalCode || item.postalCode || '',
          paymentMethod: item.paymentMethod || '',
          collectionMode: item.collectionMode || '',
          // Add enriched data for easy access
          enrichedTotalPrice: item.enrichedTotalPrice || 0,
          originalTotalPrice: item.originalTotalPrice || 0
        };
      });
      
      console.log('Processed enriched row data:', rowData);
      
      this.setState({ 
        rowData,
        columnDefs: this.getColumnDefs()
      });
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
          editable: true,
          pinned: "left",
        },
        {
          headerName: "Last Name",
          field: "lastName",
          width: 150,
          editable: true,
          pinned: "left",
        },
        {
          headerName: "Contact Number",
          field: "contactNumber",
          width: 150,
          editable: true,
        },
        {
          headerName: "Email",
          field: "email",
          width: 250,
          editable: true,
        },
        {
          headerName: "Total Price",
          field: "donationAmount",
          width: 150,
          editable: true,
          cellRenderer: (params) => {
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
            return amount || '$0.00';
          }
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
          headerName: "Items",
          field: "items",
          width: 200,
          cellRenderer: (params) => {
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
            return (
              <span className="fundraising-no-items">
                No items
              </span>
            );
          }
        },
        {
          headerName: "Collection Mode",
          field: "collectionMode",
          width: 150,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: {
            values: ["Delivery", "Self-Collection"]
          },
          editable: true,
        },
        {
          headerName: "Status",
          field: "status",
           width: 220,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: (params) => {
            // Dynamic status values based on collection mode
            const collectionMode = params.data.collectionMode;
            if (collectionMode === "Delivery") {
              return { values: ["Pending", "Paid", "Delivered", "Refunded"] };
            } else if (collectionMode === "Self-Collection") {
              return { values: ["Pending", "Paid", "Collected", "Refunded"] };
            } else {
              // Default values if collection mode is not set
              return { values: ["Pending", "Paid", "Completed", "Refunded"] };
            }
          },
          cellRenderer: (params) => {
            const statusText = params.value;
            const statusClass = statusText ? statusText.toLowerCase() : 'default';

            return (
              <div className="fundraising-status-container">
                <span className={`fundraising-status-badge ${statusClass}`}>
                  {statusText}
                </span>
              </div>
            );
          },
          editable: true,
        },
        {
          headerName: "Receipt Number",
          field: "receiptNumber",
          width: 200,
          cellRenderer: (params) => {
            const receiptNumber = params.value;
            if (receiptNumber && receiptNumber.trim() !== '') {
              return (
                <button
                  className="fundraising-receipt-link"
                  onClick={() => this.generateReceiptFromNumber(params.data)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'black',
                    textDecoration: 'unone',
                    padding: '0',
                    font: 'inherit'
                  }}
                >
                  {receiptNumber}
                </button>
              );
            }
          }
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
                <div className="detail-field">
                  <span className="detail-label">Receipt Number:</span>
                  <span className="detail-value">{rowData.receiptNumber || 'N/A'}</span>
                </div>
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

    // Handle cell value changes
    onCellValueChanged = async (params) => {
      console.log('Cell value changed:', params);
      
      // Update the status in the backend first
      if (params.colDef.field === 'status') {
        const result = await this.updateOrderStatus(params.data.id, params.newValue);
        
        // Log the subtotal information that was sent/processed
        if (result && result.success && result.subtotalInfo) {
          console.log('Status update completed with subtotal info:', result.subtotalInfo);
          
          // You can use the subtotal information here for any additional processing
          // For example, updating local state, triggering other actions, etc.
          const { totalSubtotal, items, enrichedTotalPrice } = result.subtotalInfo;
          console.log(`Order total: $${totalSubtotal.toFixed(2)}, Items: ${items.length}, Enriched total: $${enrichedTotalPrice.toFixed(2)}`);
        }

        // Check if the status field was changed to "Paid"
        if (params.newValue === 'Paid' && params.oldValue !== 'Paid') {
          await this.handleStatusChangeToPaid(params.data);
        }
        
        // Check if the status field was changed to "Refunded"
        if (params.newValue === 'Refunded' && params.oldValue !== 'Refunded') {
          await this.handleStatusChangeToRefunded(params.data);
        }
      }
      
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
        const processedItems = (rowData.items || []).map(item => {
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
            // Final fallback to item's own price
            unitPrice = item.price || item.unitPrice || 0;
            subtotal = unitPrice * quantity;
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
          status: rowData.status,
          fundraisingKey: rowData.receiptNumber
        };
        
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
          alert('Failed to generate receipt. Please try again.');
        }
      } catch (error) {
        console.error('Error generating receipt:', error);
      }
    };

    // Update order status using _id
    updateOrderStatus = async (orderId, newStatus) => {
      try {
        console.log(`Updating order ${orderId} status to: ${newStatus}`);
        
        // Find the order data to get subtotal information
        const orderData = this.state.fundraisingData.find(order => order._id === orderId);
        let subtotalInfo = null;
        
        if (orderData) {
          // Calculate subtotal from enriched data
          const itemSubtotals = orderData.items ? orderData.items.map(item => {
            const itemName = item.productName || item.name || item.itemName;
            const quantity = item.quantity || 1;
            
            // Use enriched data if available
            if (item.enrichedData && item.enrichedData.subtotal > 0) {
              return {
                productName: itemName,
                quantity: quantity,
                unitPrice: item.enrichedData.finalPrice,
                subtotal: item.enrichedData.subtotal,
                matchType: item.enrichedData.matchType
              };
            }
            
            // Fallback calculation using WooCommerce details
            const wooCommerceDetails = item.wooCommerceDetails;
            const unitPrice = wooCommerceDetails ? parseFloat(wooCommerceDetails.price) : (item.price || item.unitPrice || 0);
            const subtotal = unitPrice * quantity;
            
            return {
              productName: itemName,
              quantity: quantity,
              unitPrice: unitPrice,
              subtotal: subtotal,
              matchType: wooCommerceDetails ? 'woocommerce' : 'fallback'
            };
          }) : [];
          
          const totalSubtotal = itemSubtotals.reduce((total, item) => total + item.subtotal, 0);
          
          subtotalInfo = {
            items: itemSubtotals,
            totalSubtotal: totalSubtotal,
            enrichedTotalPrice: orderData.enrichedTotalPrice || 0,
            originalTotalPrice: orderData.originalTotalPrice || orderData.totalPrice || orderData.donationAmount || 0
          };
          
          console.log(`Order ${orderId} subtotal information:`, subtotalInfo);
        }
        
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
          {
            purpose: "update",
            _id: orderId,
            newStatus: newStatus,
            subtotalInfo: subtotalInfo // Include subtotal information in the request
          }
        );
        
        if (response.data.result && response.data.result.success) {
          console.log('Order status updated successfully:', response.data.result);
          console.log('Subtotal information sent:', subtotalInfo);
          
          // Handle PDF generation if it was successful
          if (response.data.result.pdfGenerated && response.data.result.pdfData) {
            if(newStatus === "Paid") {
              this.handlePdfResponse(response.data.result);
            }
          } else if (response.data.result.pdfError) {
            console.error('PDF generation failed:', response.data.result.pdfError);
          }
          
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

    // Handle PDF response from backend
    handlePdfResponse = (result) => {
      try {
        const { pdfData, pdfFilename } = result;
        
        if (!pdfData) {
          console.error('No PDF data received');
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
        
        console.log('PDF handled successfully:', pdfFilename);
        
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

    // Reduce stock in WooCommerce
    reduceWooCommerceStock = async (item, orderData) => {
      try {
        const quantity = item.quantity || 1;
        const originalProductName = item.productName || item.name || item.itemName;
        
        if (!originalProductName) {
          console.warn('No product name found for item:', item);
          return;
        }
        
        console.log(`Attempting to reduce stock for "${originalProductName}" by ${quantity}`);
        
        // Get the best available product information for matching
        let productData = {
          productName: originalProductName,
          type: "fundraising"
        };
        
        // If we have enriched data with matched product info, use that for better matching
        if (item.enrichedData && item.enrichedData.matchedProductName && item.enrichedData.matchedProductId) {
          productData = {
            productName: item.enrichedData.matchedProductName, // Use the matched WooCommerce product name
            originalProductName: originalProductName, // Keep original for reference
            productId: item.enrichedData.matchedProductId, // Include product ID if available
            matchType: item.enrichedData.matchType,
            type: "fundraising"
          };
          
          console.log(`Using enriched product data for stock reduction:`, {
            original: originalProductName,
            matched: item.enrichedData.matchedProductName,
            id: item.enrichedData.matchedProductId,
            matchType: item.enrichedData.matchType
          });
        } else if (item.wooCommerceDetails) {
          // Fallback to wooCommerceDetails if available
          productData = {
            productName: item.wooCommerceDetails.name,
            originalProductName: originalProductName,
            productId: item.wooCommerceDetails.id,
            type: "fundraising"
          };
          
          console.log(`Using WooCommerce details for stock reduction:`, {
            original: originalProductName,
            wooCommerce: item.wooCommerceDetails.name,
            id: item.wooCommerceDetails.id
          });
        }
        
        const requestPayload = {
          page: productData,
          status: "Paid", // Indicate we want to reduce stock
          quantity: quantity // Amount to reduce
        };
        
        console.log('Stock reduction request payload:', requestPayload);
        
        // Use your existing Django endpoint for stock updates
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/update_stock/`,
          requestPayload
        );
        
        console.log('Stock reduction response:', response.data);
        
        if (response.data.success) 
        {
          // Check if the response contains stock information
          const stockInfo = response.data.success;
          let message = `Stock reduced successfully for "${productData.productName}" (Quantity: ${quantity})`;
          
          if (typeof stockInfo === 'object' && stockInfo.previous_stock !== undefined) {
            message += `\nPrevious stock: ${stockInfo.previous_stock}, New stock: ${stockInfo.new_stock}`;
          }
          
          console.log(message);
        } else {
          console.error(`Failed to reduce stock for product "${productData.productName}":`, response.data.error || response.data);
        }
        
      } catch (error) {
        console.error('Error calling WooCommerce stock reduction API:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          item: item,
          productName: item.productName || item.name || item.itemName
        });
        
        let errorMessage = `Error reducing stock for "${item.productName || item.name || item.itemName || 'Unknown product'}"`;
        
        if (error.response && error.response.data && error.response.data.error) {
          errorMessage += `: ${error.response.data.error}`;
        } else {
          errorMessage += `: ${error.message}`;
        }
        
        // Don't throw the error to prevent breaking the entire process
        console.error(errorMessage);
      }
    };

    // Increase stock in WooCommerce for refunded orders
    increaseWooCommerceStock = async (item, orderData) => {
      try {
        const quantity = item.quantity || 1;
        const originalProductName = item.productName || item.name || item.itemName;
        
        if (!originalProductName) {
          console.warn('No product name found for item:', item);
          return;
        }
        
        console.log(`Attempting to increase stock for "${originalProductName}" by ${quantity}`);
        
        // Get the best available product information for matching
        let productData = {
          productName: originalProductName,
          type: "fundraising"
        };
        
        // If we have enriched data with matched product info, use that for better matching
        if (item.enrichedData && item.enrichedData.matchedProductName && item.enrichedData.matchedProductId) {
          productData = {
            productName: item.enrichedData.matchedProductName, // Use the matched WooCommerce product name
            originalProductName: originalProductName, // Keep original for reference
            productId: item.enrichedData.matchedProductId, // Include product ID if available
            matchType: item.enrichedData.matchType,
            type: "fundraising"
          };
          
          console.log(`Using enriched product data for stock increase:`, {
            original: originalProductName,
            matched: item.enrichedData.matchedProductName,
            id: item.enrichedData.matchedProductId,
            matchType: item.enrichedData.matchType
          });
        } else if (item.wooCommerceDetails) {
          // Fallback to wooCommerceDetails if available
          productData = {
            productName: item.wooCommerceDetails.name,
            originalProductName: originalProductName,
            productId: item.wooCommerceDetails.id,
            type: "fundraising"
          };
          
          console.log(`Using WooCommerce details for stock increase:`, {
            original: originalProductName,
            wooCommerce: item.wooCommerceDetails.name,
            id: item.wooCommerceDetails.id
          });
        }
        
        const requestPayload = {
          page: productData,
          status: "Refunded", // Indicate we want to increase stock
          quantity: quantity // Amount to increase
        };
        
        console.log('Stock increase request payload:', requestPayload);
        
        // Use your existing Django endpoint for stock updates
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/update_stock/`,
          requestPayload
        );
        
        console.log('Stock increase response:', response.data);
        
        if (response.data.success) 
        {
          // Check if the response contains stock information
          const stockInfo = response.data.success;
          let message = `Stock increased successfully for "${productData.productName}" (Quantity: ${quantity})`;
          
          if (typeof stockInfo === 'object' && stockInfo.previous_stock !== undefined) {
            message += `\nPrevious stock: ${stockInfo.previous_stock}, New stock: ${stockInfo.new_stock}`;
          }
          
          console.log(message);
        } else {
          console.error(`Failed to increase stock for product "${productData.productName}":`, response.data.error || response.data);
        }
        
      } catch (error) {
        console.error('Error calling WooCommerce stock increase API:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          item: item,
          productName: item.productName || item.name || item.itemName
        });
        
        let errorMessage = `Error increasing stock for "${item.productName || item.name || item.itemName || 'Unknown product'}"`;
        
        if (error.response && error.response.data && error.response.data.error) {
          errorMessage += `: ${error.response.data.error}`;
        } else {
          errorMessage += `: ${error.message}`;
        }
        
        // Don't throw the error to prevent breaking the entire process
        console.error(errorMessage);
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
      // Add any specific cell click handling logic here if needed
    };

    // Grid API initialization
    onGridReady = (params) => {
      this.gridApi = params.api;
      this.gridColumnApi = params.columnApi;
      
      console.log("Grid API initialized successfully");
    };

    // Export table data to Excel
    exportToExcel = async () => {
      try {
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Fundraising Orders Archive');

        // Define headers based on visible columns
        const headers = [
          'S/N',
          'First Name',
          'Last Name',
          'Contact Number',
          'Email',
          'Total Price',
          'Payment Method',
          'Items Summary',
          'Collection Mode',
          'Status',
          'Receipt Number',
          'Order Date',
          'Items Detail'
        ];

        // Add headers to worksheet
        worksheet.addRow(headers);

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };

        // Process each row of data
        this.state.rowData.forEach((row, index) => {
          // Format items for summary
          let itemsSummary = '';
          let itemsDetail = '';
          
          if (row.items && row.items.length > 0) {
            itemsSummary = row.items.map(item => {
              const name = item.productName || item.name || item.itemName || 'Unknown Item';
              const quantity = item.quantity || 1;
              return `${name} (x${quantity})`;
            }).join(', ');

            // Detailed items information
            itemsDetail = row.items.map(item => {
              const name = item.productName || item.name || item.itemName || 'Unknown Item';
              const quantity = item.quantity || 1;
              const price = item.price || item.unitPrice || 0;
              const subtotal = (price * quantity).toFixed(2);
              return `${name}: Qty ${quantity} @ $${price} = $${subtotal}`;
            }).join('; ');
          }

          // Format total price
          let totalPrice = row.donationAmount;
          if (row.enrichedTotalPrice > 0) {
            totalPrice = `$${row.enrichedTotalPrice.toFixed(2)}`;
          } else if (totalPrice && !isNaN(totalPrice)) {
            totalPrice = `$${parseFloat(totalPrice).toFixed(2)}`;
          } else {
            totalPrice = '$0.00';
          }

          // Format order date if available
          let orderDate = '';
          if (row.createdAt || row.orderDate || row.timestamp) {
            const date = new Date(row.createdAt || row.orderDate || row.timestamp);
            if (!isNaN(date.getTime())) {
              orderDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            }
          }

          const rowData = [
            row.sn || index + 1,
            row.firstName || '',
            row.lastName || '',
            row.contactNumber || '',
            row.email || '',
            totalPrice,
            row.paymentMethod || '',
            itemsSummary,
            row.collectionMode || '',
            row.status || '',
            row.receiptNumber || '',
            orderDate,
            itemsDetail
          ];

          worksheet.addRow(rowData);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
          let maxLength = 10;
          column.eachCell({ includeEmpty: true }, (cell) => {
            const cellValue = cell.value ? cell.value.toString() : '';
            maxLength = Math.max(maxLength, cellValue.length);
          });
          column.width = Math.min(maxLength + 2, 50); // Cap at 50 characters
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
        
        // Optional: Show success message
        alert(`Excel file "${filename}" has been downloaded successfully!`);

      } catch (error) {
        console.error('Error exporting to Excel:', error);
        alert('Failed to export data to Excel. Please try again.');
      }
    };

    // Generate Payment Report with Total
    generatePaymentReport = async () => {
      try {
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Payment Report');

        // Define headers for payment report
        const headers = [
          'S/N',
          'First Name',
          'Last Name',
          'Contact Number',
          'Email',
          'Total Price',
          'Payment Method',
          'Collection Mode',
          'Status',
          'Receipt Number',
          'Order Date'
        ];

        // Add headers to worksheet
        worksheet.addRow(headers);

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };

        let grandTotal = 0;

        // Process each row of data and calculate total
        this.state.rowData.forEach((row, index) => {
          // Calculate numerical total price for summation
          let totalPriceValue = 0;
          let totalPriceDisplay = '';

          if (row.enrichedTotalPrice > 0) {
            totalPriceValue = row.enrichedTotalPrice;
            totalPriceDisplay = `$${row.enrichedTotalPrice.toFixed(2)}`;
          } else if (row.donationAmount) {
            // Extract numerical value from donation amount
            const cleanAmount = row.donationAmount.toString().replace(/[^0-9.-]/g, '');
            if (!isNaN(cleanAmount) && cleanAmount !== '' && cleanAmount !== '-') {
              totalPriceValue = parseFloat(cleanAmount);
              totalPriceDisplay = `$${totalPriceValue.toFixed(2)}`;
            } else {
              totalPriceValue = 0;
              totalPriceDisplay = '$0.00';
            }
          } else {
            totalPriceValue = 0;
            totalPriceDisplay = '$0.00';
          }

          // Only add to grand total if the value is positive
          if (totalPriceValue > 0) {
            grandTotal += totalPriceValue;
          }

          // Format order date if available
          let orderDate = '';
          if (row.createdAt || row.orderDate || row.timestamp) {
            const date = new Date(row.createdAt || row.orderDate || row.timestamp);
            if (!isNaN(date.getTime())) {
              orderDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            }
          }

          const rowData = [
            row.sn || index + 1,
            row.firstName || '',
            row.lastName || '',
            row.contactNumber || '',
            row.email || '',
            totalPriceDisplay,
            row.paymentMethod || '',
            row.collectionMode || '',
            row.status || '',
            row.receiptNumber || '',
            orderDate
          ];

          worksheet.addRow(rowData);
        });

        // Add empty row after data
        worksheet.addRow([]);

        // Add total row
        const totalRowData = [
          '', '', '', '', '', // Empty cells
          `$${grandTotal.toFixed(2)}`, // Total price in the Total Price column
          '', '', '', '', '' // Empty cells for remaining columns
        ];
        const totalRow = worksheet.addRow(totalRowData);

        // Style the total row
        totalRow.font = { bold: true };
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCC00' } // Light yellow background
        };

        // Add "TOTAL:" label in the previous cell
        const labelCell = worksheet.getCell(totalRow.number, 5); // Column E (Email column)
        labelCell.value = 'TOTAL:';
        labelCell.font = { bold: true };
        labelCell.alignment = { horizontal: 'right' };

        // Auto-fit columns
        worksheet.columns.forEach(column => {
          let maxLength = 10;
          column.eachCell({ includeEmpty: true }, (cell) => {
            const cellValue = cell.value ? cell.value.toString() : '';
            maxLength = Math.max(maxLength, cellValue.length);
          });
          column.width = Math.min(maxLength + 2, 50); // Cap at 50 characters
        });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `Payment_Report_${timestamp}.xlsx`;

        // Save the file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        saveAs(blob, filename);

        console.log('Payment report export completed successfully');
        console.log('Grand Total:', grandTotal.toFixed(2));
        
        // Show success message with total
        alert(`Payment report "${filename}" has been downloaded successfully!\nTotal Amount: $${grandTotal.toFixed(2)}`);

      } catch (error) {
        console.error('Error generating payment report:', error);
        alert('Failed to generate payment report. Please try again.');
      }
    };

    render() 
    {
      return (
        <div className="fundraising-container">
          <div className="fundraising-heading">
            <h2>Fundraising Table</h2>
             <div className="button-row"> 
              <button 
                className="fundraising-export-btn"
                onClick={this.exportToExcel}
                title="Export all fundraising orders to Excel file"
              >
              Archive Data
              </button>
              <button 
                className="fundraising-payment-report-btn"
                onClick={this.generatePaymentReport}
                title="Generate payment report with total amount"
              >
              Generate Payment Report
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
              paginationPageSize={10}
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

export default FundraisingTable;