import React, { Component } from 'react';
import axios from 'axios';
import '../../css/checkoutPage.css';
import PersonalInformationSection from './sub/checkout/PersonalInformationSection';
import PaymentMethodSection from './sub/checkout/PaymentMethodSection';
import CollectionModeSection from './sub/checkout/CollectionModeSection';
import CollectionLocationSection from './sub/checkout/CollectionLocationSection';
import CollectionDateTimeSection from './sub/checkout/CollectionDateTimeSection';
import OrderSummarySection from './sub/checkout/OrderSummarySection';
import CheckoutActions from './sub/checkout/CheckoutActions';
import LanguageModal from './LanguageModal';

class CheckoutPage extends Component {
  constructor(props) {
    super(props);
    
    // Try to restore checkout state from localStorage
    const savedCheckoutState = this.loadCheckoutStateFromLocalStorage();
    
    this.state = {
      personalInfo: savedCheckoutState.personalInfo || {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        // address: '', // Commented out
        // postalCode: '', // Commented out
        location: ''
      },
      paymentMethod: savedCheckoutState.paymentMethod || '', // Default to cash
      collectionMode: savedCheckoutState.collectionMode || '', // Default to Self-Collection
      collectionLocation: savedCheckoutState.collectionLocation || '',
      collectionDate: savedCheckoutState.collectionDate || '',
      collectionTime: savedCheckoutState.collectionTime || '',
      deliveryToAddress: savedCheckoutState.deliveryToAddress || '',
      shipToBillingAddress: savedCheckoutState.shipToBillingAddress || false,
      expandedSections: {
        personalInfo: true,  // Section 1 expanded by default
        paymentMethod: false,
        collectionMode: false,
        collectionLocation: true, // Collection/Delivery Location expanded by default
        collectionDateTime: true, // Collection Date & Time expanded by default
        orderSummary: false,
        ...(savedCheckoutState.expandedSections || {})
      },
      fieldErrors: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        // address: '', // Commented out
        // postalCode: '', // Commented out
        location: '',
        paymentMethod: '',
        collectionMode: '',
        collectionLocation: '',
        collectionDate: '',
        collectionTime: '',
        deliveryToAddress: '',
        shipToBillingAddress: ''
      },
      modal: {
        isVisible: false,
        type: '', // 'success' or 'error'
        title: '',
        message: ''
      },
      languageModal: {
        isVisible: false
      }
    };
  }

  componentDidMount() {
    // Save that we're in checkout mode
    localStorage.setItem('isInCheckoutMode', 'true');
    
    // Check if cart is empty and redirect back if so
    const { cartItems = [] } = this.props;
    if (cartItems.length === 0) {
      console.log('No items in cart, redirecting back...');
      this.handleGoBack();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // Save checkout state whenever it changes (except for errors and modal)
    if (
      prevState.personalInfo !== this.state.personalInfo ||
      prevState.paymentMethod !== this.state.paymentMethod ||
      prevState.collectionMode !== this.state.collectionMode ||
      prevState.collectionLocation !== this.state.collectionLocation ||
      prevState.collectionDate !== this.state.collectionDate ||
      prevState.collectionTime !== this.state.collectionTime ||
      prevState.deliveryToAddress !== this.state.deliveryToAddress ||
      prevState.shipToBillingAddress !== this.state.shipToBillingAddress ||
      prevState.expandedSections !== this.state.expandedSections
    ) {
      this.saveCheckoutStateToLocalStorage();
    }
    
    // Check if cart becomes empty and redirect back
    const { cartItems = [] } = this.props;
    const prevCartItems = prevProps.cartItems || [];
    if (prevCartItems.length > 0 && cartItems.length === 0) {
      console.log('Cart became empty, redirecting back...');
      this.handleGoBack();
    }
  }

  componentWillUnmount() {
    // Clean up checkout mode when leaving the component
    localStorage.removeItem('isInCheckoutMode');
  }

  loadCheckoutStateFromLocalStorage = () => {
    try {
      const savedState = localStorage.getItem('checkoutFormState');
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (error) {
      console.error('Error loading checkout state from localStorage:', error);
    }
    return {};
  }

  saveCheckoutStateToLocalStorage = () => {
    try {
      const stateToSave = {
        personalInfo: this.state.personalInfo,
        paymentMethod: this.state.paymentMethod,
        collectionMode: this.state.collectionMode,
        collectionLocation: this.state.collectionLocation,
        collectionDate: this.state.collectionDate,
        collectionTime: this.state.collectionTime,
        deliveryToAddress: this.state.deliveryToAddress,
        shipToBillingAddress: this.state.shipToBillingAddress,
        expandedSections: this.state.expandedSections
      };
      localStorage.setItem('checkoutFormState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving checkout state to localStorage:', error);
    }
  }

  clearCheckoutStateFromLocalStorage = () => {
    localStorage.removeItem('checkoutFormState');
    localStorage.removeItem('isInCheckoutMode');
  }

  handlePersonalInfoChange = (field, value) => {
    this.setState(prevState => {
      const newPersonalInfo = {
        ...prevState.personalInfo,
        [field]: value
      };
      
      // If shipToBillingAddress is checked and address/postalCode is being updated, 
      // also update the deliveryToAddress
      // Commented out since address and postalCode are no longer used
      // let newDeliveryToAddress = prevState.deliveryToAddress;
      // if (prevState.shipToBillingAddress && (field === 'address' || field === 'postalCode')) {
      //   newDeliveryToAddress = newPersonalInfo.address && newPersonalInfo.postalCode ? 
      //     `${newPersonalInfo.address}, Singapore ${newPersonalInfo.postalCode}` : '';
      // }
      
      return {
        personalInfo: newPersonalInfo,
        // deliveryToAddress: newDeliveryToAddress,
        fieldErrors: {
          ...prevState.fieldErrors,
          [field]: '' // Clear error when user starts typing
        }
      };
    });
  }

  handlePaymentMethodChange = (method) => {
    this.setState({
      paymentMethod: method,
      fieldErrors: {
        ...this.state.fieldErrors,
        paymentMethod: '' // Clear error when user selects
      }
    });
  }

  handleCollectionModeChange = (mode) => {
    this.setState({
      collectionMode: mode,
      collectionLocation: '', // Reset collection location when mode changes
      collectionDate: '', // Reset date when mode changes
      collectionTime: '', // Reset time when mode changes
      deliveryToAddress: '', // Reset delivery address when mode changes
      shipToBillingAddress: false, // Reset checkbox when mode changes
      fieldErrors: {
        ...this.state.fieldErrors,
        collectionMode: '', // Clear error when user selects
        collectionLocation: '', // Clear location error when mode changes
        collectionDate: '', // Clear date error when mode changes
        collectionTime: '', // Clear time error when mode changes
        deliveryToAddress: '', // Clear delivery address error when mode changes
        shipToBillingAddress: '' // Clear checkbox error when mode changes
      }
    });
  }

  handleCollectionLocationChange = (location) => {
    this.setState({
      collectionLocation: location,
      collectionDate: '', // Reset date when location changes
      collectionTime: '', // Reset time when location changes
      fieldErrors: {
        ...this.state.fieldErrors,
        collectionLocation: '', // Clear error when user selects
        collectionDate: '', // Clear date error when location changes
        collectionTime: '' // Clear time error when location changes
      }
    });
  }

  handleCollectionDateChange = (date) => {
    this.setState({
      collectionDate: date,
      collectionTime: '', // Reset time when date changes
      fieldErrors: {
        ...this.state.fieldErrors,
        collectionDate: '', // Clear error when user selects
        collectionTime: '' // Clear time error when date changes
      }
    });
  }

  handleCollectionTimeChange = (time) => {
    this.setState({
      collectionTime: time,
      fieldErrors: {
        ...this.state.fieldErrors,
        collectionTime: '' // Clear error when user selects
      }
    });
  }

  handleDeliveryToAddressChange = (address) => {
    this.setState({
      deliveryToAddress: address,
      fieldErrors: {
        ...this.state.fieldErrors,
        deliveryToAddress: '' // Clear error when user starts typing
      }
    });
  }

  handleShipToBillingAddressChange = (checked) => {
    // const { personalInfo } = this.state; // Commented out since not used
    this.setState({
      shipToBillingAddress: checked,
      // Commented out billing address logic since address and postalCode are no longer used
      // deliveryToAddress: checked ? 
      //   (personalInfo.address && personalInfo.postalCode ? `${personalInfo.address}, Singapore ${personalInfo.postalCode}` : '') : 
      //   '', // Reset to empty when unchecked to allow manual input
      deliveryToAddress: '', // Reset to empty to allow manual input
      fieldErrors: {
        ...this.state.fieldErrors,
        shipToBillingAddress: '',
        deliveryToAddress: '' // Clear error when checkbox changes
      }
    });
  }

  handleUpdateQuantity = (index, newQuantity) => {
    const { onUpdateCartItemQuantity, onRemoveCartItem } = this.props;
    
    if (newQuantity <= 0) {
      // Remove item if quantity goes to 0 or below
      if (onRemoveCartItem) {
        onRemoveCartItem(index);
      }
    } else if (onUpdateCartItemQuantity) {
      onUpdateCartItemQuantity(index, newQuantity);
    }
  }

  handleRemoveItem = (index) => {
    const { onRemoveCartItem } = this.props;
    if (onRemoveCartItem) {
      onRemoveCartItem(index);
    }
  }

  toggleSection = (sectionName) => {
    console.log('toggleSection called with:', sectionName);
    console.log('Current expandedSections:', this.state.expandedSections);
    
    this.setState(prevState => {
      const isCurrentlyExpanded = prevState.expandedSections[sectionName];
      console.log(`Section ${sectionName} is currently expanded:`, isCurrentlyExpanded);
      
      // If the section is currently expanded, collapse it
      if (isCurrentlyExpanded) {
        return {
          expandedSections: {
            ...prevState.expandedSections,
            [sectionName]: false
          }
        };
      } else {
        // If the section is collapsed, expand it and close all others
        return {
          expandedSections: {
            personalInfo: sectionName === 'personalInfo',
            paymentMethod: sectionName === 'paymentMethod',
            collectionMode: sectionName === 'collectionMode',
            collectionLocation: sectionName === 'collectionLocation',
            collectionDateTime: sectionName === 'collectionDateTime',
            orderSummary: sectionName === 'orderSummary'
          }
        };
      }
    });
  }

  showModal = (type, title, message) => {
    this.setState({
      modal: {
        isVisible: true,
        type: type,
        title: title,
        message: message
      }
    });
  }

  hideModal = () => {
    const { modal } = this.state;
    const wasSuccessModal = modal.type === 'success';
    
    this.setState({
      modal: {
        isVisible: false,
        type: '',
        title: '',
        message: ''
      }
    }, () => {
      // After hiding the modal, if it was a success modal, perform cleanup and redirect back
      if (wasSuccessModal) {
        // Clear the cart after user acknowledges successful order
        const { onClearCart } = this.props;
        if (onClearCart) {
          onClearCart();
        }
        // Also clear from localStorage as backup
        localStorage.removeItem('cartItems');
        
        // Clear checkout form state after successful order
        this.clearCheckoutStateFromLocalStorage();
        
        // Then redirect back
        this.handleGoBack();
      }
    });
  }

  // Language selection methods
  handleOpenLanguageModal = () => {
    this.setState({
      languageModal: {
        isVisible: true
      }
    });
  }

  handleCloseLanguageModal = () => {
    this.setState({
      languageModal: {
        isVisible: false
      }
    });
  }

  handleLanguageSelect = (languageCode) => {
    const { onLanguageChange } = this.props;
    if (onLanguageChange) {
      onLanguageChange(languageCode);
    }
    this.handleCloseLanguageModal();
  }

  // Function to get current language display info
  getCurrentLanguageInfo = () => {
    const { selectedLanguage = 'english' } = this.props;
    const languageMap = {
      english: { flag: '🇺🇸', name: 'English' },
      chinese: { flag: '🇨🇳', name: '中文' },
      malay: { flag: '🇲🇾', name: 'Bahasa Melayu' }
    };
    return languageMap[selectedLanguage] || languageMap.english;
  }

  // Function to get translated validation messages
  getValidationTranslations = () => {
    const { selectedLanguage = 'english' } = this.props;
    
    const translations = {
      required: {
        english: 'is required',
        chinese: '是必填项',
        malay: 'diperlukan'
      },
      paymentMethod: {
        english: 'Payment method is required',
        chinese: '付款方式是必填项',
        malay: 'Kaedah pembayaran diperlukan'
      },
      collectionMode: {
        english: 'Collection mode is required',
        chinese: '取货方式是必填项',
        malay: 'Mod pengumpulan diperlukan'
      },
      collectionLocation: {
        english: 'Collection location is required',
        chinese: '取货地点是必填项',
        malay: 'Lokasi pengumpulan diperlukan'
      },
      collectionDate: {
        english: 'Collection date is required',
        chinese: '取货日期是必填项',
        malay: 'Tarikh pengumpulan diperlukan'
      },
      collectionTime: {
        english: 'Collection time is required',
        chinese: '取货时间是必填项',
        malay: 'Masa pengumpulan diperlukan'
      },
      deliveryAddress: {
        english: 'Delivery address is required',
        chinese: '送货地址是必填项',
        malay: 'Alamat penghantaran diperlukan'
      },
      cartEmpty: {
        english: 'Your cart is empty',
        chinese: '您的购物车是空的',
        malay: 'Troli anda kosong'
      },
      fieldDisplayNames: {
        firstName: {
          english: 'First name',
          chinese: '名字',
          malay: 'Nama pertama'
        },
        lastName: {
          english: 'Last name',
          chinese: '姓氏',
          malay: 'Nama keluarga'
        },
        phone: {
          english: 'Phone',
          chinese: '电话',
          malay: 'Telefon'
        },
        location: {
          english: 'Location/Club',
          chinese: '位置/俱乐部',
          malay: 'Lokasi/Kelab'
        }
      }
    };

    return translations;
  }

  // Function to get translated modal messages
  getModalTranslations = (type) => {
    const { selectedLanguage = 'english' } = this.props;
    
    const translations = {
      success: {
        english: 'Order Successfully Placed!',
        chinese: '订单下单成功！',
        malay: 'Pesanan Berjaya Dibuat!'
      },
      error: {
        english: 'Order Failed!',
        chinese: '订单失败！',
        malay: 'Pesanan Gagal!'
      },
      ok: {
        english: 'OK',
        chinese: '好的',
        malay: 'Baik'
      }
    };

    return {
      message: translations[type][selectedLanguage] || translations[type]['english'],
      okButton: translations.ok[selectedLanguage] || translations.ok['english']
    };
  }

  calculateTotal = () => {
    const { cartItems = [] } = this.props;
    return cartItems.reduce((total, item) => total + (item.price * (item.quantity || 0)), 0).toFixed(2);
  }

  getTotalItems = () => {
    const { cartItems = [] } = this.props;
    return cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
  }

  handleClearForm = () => {
    this.setState({
      personalInfo: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        // address: '', // Commented out
        // postalCode: '', // Commented out
        location: ''
      },
      paymentMethod: '',
      collectionMode: '',
      collectionLocation: '',
      collectionDate: '',
      collectionTime: '',
      deliveryToAddress: '',
      shipToBillingAddress: false,
      fieldErrors: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        // address: '', // Commented out
        // postalCode: '', // Commented out
        location: '',
        paymentMethod: '',
        collectionMode: '',
        collectionLocation: '',
        collectionDate: '',
        collectionTime: '',
        deliveryToAddress: '',
        shipToBillingAddress: ''
      }
    });
  }

  handleGoBack = () => {
    // Clear checkout state when going back
    this.clearCheckoutStateFromLocalStorage();
    
    const { onGoBack } = this.props;
    if (onGoBack) {
      onGoBack();
    }
  }

  // Function to clean product names - remove HTML tags and Chinese text
  cleanProductName = (productName) => {
    if (!productName) return '';
    
    // Remove HTML tags like <br>, <div>, etc.
    let cleaned = productName.replace(/<[^>]*>/g, ' ');
    
    // Remove Chinese characters (Unicode range for Chinese) but preserve English text with hyphens
    cleaned = cleaned.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, '');
    
    // Clean up extra spaces and trim, but preserve hyphens and other punctuation
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Remove any trailing separators that might be left after removing Chinese text
    cleaned = cleaned.replace(/\s*[\-\|]\s*$/, '').trim();
    
    console.log(`Product name cleaned: "${productName}" → "${cleaned}"`);
    
    return cleaned;
  }

  // Function to preview and download invoice PDF
  downloadInvoice = (invoiceData) => {
    try {
      console.log('Starting invoice preview and download...');
      
      // Convert base64 to blob
      const byteCharacters = atob(invoiceData.pdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Create object URL for the PDF
      const url = URL.createObjectURL(blob);
      
      // Open PDF in new tab for preview
      const newTab = window.open(url, '_blank');
      if (newTab) {
        newTab.focus();
        console.log('Invoice opened in new tab for preview');
      } else {
        console.warn('Popup blocked - falling back to direct download');
      }
      
      // Also trigger automatic download
      const link = document.createElement('a');
      link.href = url;
      link.download = invoiceData.filename || 'invoice.pdf';
      link.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL after a delay to allow download
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      
      console.log('Invoice preview and download initiated:', invoiceData.filename);
    } catch (error) {
      console.error('Error processing invoice:', error);
    }
  }

  handlePlaceOrder = async () => {
    const { personalInfo, paymentMethod, collectionMode, collectionLocation, collectionDate, collectionTime, deliveryToAddress, shipToBillingAddress } = this.state;
    const { cartItems = [] } = this.props;

    // Clear all errors first
    let newFieldErrors = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      // address: '', // Commented out
      // postalCode: '', // Commented out
      location: '',
      paymentMethod: '',
      collectionMode: '',
      collectionLocation: '',
      collectionDate: '',
      collectionTime: '',
      deliveryToAddress: '',
      shipToBillingAddress: ''
    };

    // Get translations for validation messages
    const validationTranslations = this.getValidationTranslations();
    const { selectedLanguage = 'english' } = this.props;

    // Validate all required fields are filled
    const requiredFields = ['firstName', 'lastName', 'phone', 'location']; // Removed 'address', 'postalCode'
    let hasErrors = false;

    requiredFields.forEach(field => {
      if (!personalInfo[field] || personalInfo[field].trim() === '') {
        const fieldDisplayName = validationTranslations.fieldDisplayNames[field][selectedLanguage] || 
                               validationTranslations.fieldDisplayNames[field]['english'];
        const requiredText = validationTranslations.required[selectedLanguage] || 
                           validationTranslations.required['english'];
        newFieldErrors[field] = `${fieldDisplayName} ${requiredText}`;
        hasErrors = true;
      }
    });

    if (!paymentMethod) {
      newFieldErrors.paymentMethod = validationTranslations.paymentMethod[selectedLanguage] || 
                                   validationTranslations.paymentMethod['english'];
      hasErrors = true;
    }

    if (!collectionMode) {
      newFieldErrors.collectionMode = validationTranslations.collectionMode[selectedLanguage] || 
                                     validationTranslations.collectionMode['english'];
      hasErrors = true;
    }

    // Validate collection location only if Self-Collection is selected
    if (collectionMode === 'Self-Collection' && !collectionLocation) {
      newFieldErrors.collectionLocation = validationTranslations.collectionLocation[selectedLanguage] || 
                                         validationTranslations.collectionLocation['english'];
      hasErrors = true;
    }

    // Validate collection date and time only if Self-Collection is selected and location is chosen
    if (collectionMode === 'Self-Collection' && collectionLocation) {
      if (!collectionDate) {
        newFieldErrors.collectionDate = validationTranslations.collectionDate[selectedLanguage] || 
                                       validationTranslations.collectionDate['english'];
        hasErrors = true;
      }
      if (!collectionTime) {
        newFieldErrors.collectionTime = validationTranslations.collectionTime[selectedLanguage] || 
                                       validationTranslations.collectionTime['english'];
        hasErrors = true;
      }
    }

    // Validate delivery address only if Delivery is selected
    // Commented out since Delivery option is now disabled
    // if (collectionMode === 'Delivery') {
    //   if (!shipToBillingAddress && !deliveryToAddress) {
    //     newFieldErrors.deliveryToAddress = validationTranslations.deliveryAddress[selectedLanguage] || 
    //                                       validationTranslations.deliveryAddress['english'];
    //     hasErrors = true;
    //   }
    //   // If using billing address, check if billing address exists
    //   // Commented out since address and postalCode are no longer required
    //   // if (shipToBillingAddress && (!personalInfo.address || !personalInfo.postalCode)) {
    //   //   newFieldErrors.deliveryToAddress = 'Please ensure your billing address is complete';
    //   //   hasErrors = true;
    //   // }
    // }

    if (cartItems.length === 0) {
      const cartEmptyMessage = validationTranslations.cartEmpty[selectedLanguage] || 
                              validationTranslations.cartEmpty['english'];
      alert(cartEmptyMessage);
      return;
    }

    // Update state with errors
    this.setState({ fieldErrors: newFieldErrors });

    // If there are errors, don't proceed
    if (hasErrors) {
      return;
    }

    // Format the order data as JSON
    const now = new Date();
    const orderDate = now.toLocaleDateString('en-GB'); // dd/mm/yyyy format
    const orderTime = now.toLocaleTimeString('en-GB', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    }); // hh:mm 24-hour format

    // Determine the CollectionDeliveryLocation based on collection mode
    let CollectionDeliveryLocation = null;
    if (collectionMode === 'Self-Collection') {
      CollectionDeliveryLocation = collectionLocation;
    }
    // Commented out since Delivery option is now disabled
    // else if (collectionMode === 'Delivery') {
    //   // Commented out billing address logic since address and postalCode are no longer used
    //   // CollectionDeliveryLocation = shipToBillingAddress ? 
    //   //   `${personalInfo.address}, Singapore ${personalInfo.postalCode}` : 
    //   //   deliveryToAddress;
    //   CollectionDeliveryLocation = deliveryToAddress;
    // }

    const orderData = {
      personalInfo: {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        phone: personalInfo.phone,
        // address: personalInfo.address, // Commented out
        // postalCode: personalInfo.postalCode, // Commented out
        location: personalInfo.location
      },
      paymentDetails: {
        paymentMethod: paymentMethod,
      },
      collectionDetails: {
        collectionMode: collectionMode,
        CollectionDeliveryLocation: CollectionDeliveryLocation,
        collectionDate: collectionDate,
        collectionTime: collectionTime
      },
      orderDetails: {
      orderDate: orderDate,
      orderTime: orderTime,
      totalPrice: parseFloat(this.calculateTotal()), // Add total price
      items: cartItems.map(item => ({
        productName: this.cleanProductName(item.name), // Clean the product name
        quantity: item.quantity,
        price: item.price // Include the individual item price
      }))
      }
    };

    try {
      // Send the orderData to your server
      const baseUrl = window.location.hostname === "localhost" 
        ? "http://localhost:3001" 
        : "https://ecss-backend-node.azurewebsites.net";

      const response = await axios.post(`${baseUrl}/fundraising`, {purpose: "insert", orderData});

      console.log('Order response:', response.data);
      
      // Handle invoice download if available
      if (response.data.invoice && response.data.invoice.pdfData) {
        console.log('Invoice data received:', {
          hasInvoice: !!response.data.invoice,
          hasPdfData: !!response.data.invoice.pdfData,
          pdfDataLength: response.data.invoice.pdfData ? response.data.invoice.pdfData.length : 0,
          filename: response.data.invoice.filename
        });
        console.log('Invoice generated, preparing preview and download...');
        this.downloadInvoice(response.data.invoice);
        
        // Show success modal with invoice info
        const successTranslation = this.getModalTranslations('success');
        this.showModal(
          'success',
          '✓',
          successTranslation.message
        );
      }
      
    } catch (error) {
      console.error('Error placing order:', error);
      
      // Show error modal
      const errorTranslation = this.getModalTranslations('error');
      this.showModal(
        'error',
        '✗',
        errorTranslation.message
      );
 }
  }

  render() {
    const { personalInfo, paymentMethod, collectionMode, collectionLocation, collectionDate, collectionTime, deliveryToAddress, shipToBillingAddress, expandedSections, fieldErrors, modal, languageModal } = this.state;
    const { cartItems = [], selectedLanguage = 'english' } = this.props;
    const currentLanguage = this.getCurrentLanguageInfo();

    return (
      <div className="checkout-page">
        <div className="checkout-container">
          {/* Header Row with Language Selection and Back Button */}
          <div className="checkout-header-row">
            {/* Back button */}
            <CheckoutActions
              onGoBack={this.handleGoBack}
              showTopOnly={true}
              selectedLanguage={selectedLanguage}
            />

            {/* Language Selection Button */}
            <button 
              className="checkout-language-btn"
              onClick={this.handleOpenLanguageModal}
            >
              <span className="language-btn-text">{currentLanguage.name}</span>
            </button>
          </div>

          {/* Personal Information Section */}
          <PersonalInformationSection
            personalInfo={personalInfo}
            expandedSections={expandedSections}
            fieldErrors={fieldErrors}
            onPersonalInfoChange={this.handlePersonalInfoChange}
            onToggleSection={this.toggleSection}
            selectedLanguage={selectedLanguage}
          />

          {/* Payment Method Section */}
          <PaymentMethodSection
            paymentMethod={paymentMethod}
            expandedSections={expandedSections}
            fieldErrors={fieldErrors}
            onPaymentMethodChange={this.handlePaymentMethodChange}
            onToggleSection={this.toggleSection}
            selectedLanguage={selectedLanguage}
          />

          {/* Collection Mode Section */}
          <CollectionModeSection
            collectionMode={collectionMode}
            expandedSections={expandedSections}
            fieldErrors={fieldErrors}
            onCollectionModeChange={this.handleCollectionModeChange}
            onToggleSection={this.toggleSection}
            selectedLanguage={selectedLanguage}
          />

          {/* Collection/Delivery Location Section */}
          <CollectionLocationSection
            collectionLocation={collectionLocation}
            deliveryToAddress={deliveryToAddress}
            shipToBillingAddress={shipToBillingAddress}
            expandedSections={expandedSections}
            fieldErrors={fieldErrors}
            collectionMode={collectionMode}
            personalInfo={personalInfo}
            onCollectionLocationChange={this.handleCollectionLocationChange}
            onDeliveryToAddressChange={this.handleDeliveryToAddressChange}
            onShipToBillingAddressChange={this.handleShipToBillingAddressChange}
            onToggleSection={this.toggleSection}
            selectedLanguage={selectedLanguage}
          />

          {/* Collection Date & Time Section */}
          <CollectionDateTimeSection
            collectionDate={collectionDate}
            collectionTime={collectionTime}
            expandedSections={expandedSections}
            fieldErrors={fieldErrors}
            collectionMode={collectionMode}
            collectionLocation={collectionLocation}
            personalInfoLocation={personalInfo.location}
            onCollectionDateChange={this.handleCollectionDateChange}
            onCollectionTimeChange={this.handleCollectionTimeChange}
            onToggleSection={this.toggleSection}
            selectedLanguage={selectedLanguage}
          />

          {/* Order Summary Section */}
          <OrderSummarySection
            cartItems={cartItems}
            expandedSections={expandedSections}
            onToggleSection={this.toggleSection}
            calculateTotal={this.calculateTotal}
            getTotalItems={this.getTotalItems}
            onUpdateQuantity={this.handleUpdateQuantity}
            onRemoveItem={this.handleRemoveItem}
            selectedLanguage={selectedLanguage}
          />

          {/* Action buttons at the bottom */}
          <CheckoutActions
            cartItems={cartItems}
            onClearForm={this.handleClearForm}
            onGoBack={this.handleGoBack}
            onPlaceOrder={this.handlePlaceOrder}
            selectedLanguage={selectedLanguage}
          />
        </div>

        {/* Modal for success/error messages */}
        {modal.isVisible && (
          <div className="modal-overlay" onClick={this.hideModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={this.hideModal}>×</button>
              <div className={`modal-icon ${modal.type}`}>
                {modal.title}
              </div>
              <div className="modal-message">
                <p className={modal.type}>{modal.message}</p>
              </div>
              <div className="modal-footer3">
                <button className="modal-button" onClick={this.hideModal}>
                  {this.getModalTranslations('ok').okButton}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Language Selection Modal */}
        <LanguageModal
          isOpen={languageModal.isVisible}
          selectedLanguage={selectedLanguage}
          onLanguageSelect={this.handleLanguageSelect}
          onClose={this.handleCloseLanguageModal}
        />
      </div>
    );
  }
}

export default CheckoutPage;