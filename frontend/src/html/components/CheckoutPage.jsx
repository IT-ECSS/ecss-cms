import React, { Component } from 'react';
import axios from 'axios';
import '../../css/checkoutPage.css';
import PersonalInformationSection from './sub/checkout/PersonalInformationSection';
import PaymentMethodSection from './sub/checkout/PaymentMethodSection';
import CollectionModeSection from './sub/checkout/CollectionModeSection';
import CollectionLocationSection from './sub/checkout/CollectionLocationSection';
import OrderSummarySection from './sub/checkout/OrderSummarySection';
import CheckoutActions from './sub/checkout/CheckoutActions';

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
        address: '',
        postalCode: ''
      },
      paymentMethod: savedCheckoutState.paymentMethod || '', // Default to cash
      collectionMode: savedCheckoutState.collectionMode || '', // Default to Self-Collection
      collectionLocation: savedCheckoutState.collectionLocation || '',
      deliveryToAddress: savedCheckoutState.deliveryToAddress || '',
      shipToBillingAddress: savedCheckoutState.shipToBillingAddress || false,
      expandedSections: savedCheckoutState.expandedSections || {
        personalInfo: true,  // Section 1 expanded by default
        paymentMethod: false,
        collectionMode: false,
        collectionLocation: true, // Collection/Delivery Location expanded by default
        orderSummary: false
      },
      fieldErrors: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        postalCode: '',
        paymentMethod: '',
        collectionMode: '',
        collectionLocation: '',
        deliveryToAddress: '',
        shipToBillingAddress: ''
      },
      modal: {
        isVisible: false,
        type: '', // 'success' or 'error'
        title: '',
        message: ''
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
      let newDeliveryToAddress = prevState.deliveryToAddress;
      if (prevState.shipToBillingAddress && (field === 'address' || field === 'postalCode')) {
        newDeliveryToAddress = newPersonalInfo.address && newPersonalInfo.postalCode ? 
          `${newPersonalInfo.address}, Singapore ${newPersonalInfo.postalCode}` : '';
      }
      
      return {
        personalInfo: newPersonalInfo,
        deliveryToAddress: newDeliveryToAddress,
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
      deliveryToAddress: '', // Reset delivery address when mode changes
      shipToBillingAddress: false, // Reset checkbox when mode changes
      fieldErrors: {
        ...this.state.fieldErrors,
        collectionMode: '', // Clear error when user selects
        collectionLocation: '', // Clear location error when mode changes
        deliveryToAddress: '', // Clear delivery address error when mode changes
        shipToBillingAddress: '' // Clear checkbox error when mode changes
      }
    });
  }

  handleCollectionLocationChange = (location) => {
    this.setState({
      collectionLocation: location,
      fieldErrors: {
        ...this.state.fieldErrors,
        collectionLocation: '' // Clear error when user selects
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
    const { personalInfo } = this.state;
    this.setState({
      shipToBillingAddress: checked,
      deliveryToAddress: checked ? 
        (personalInfo.address && personalInfo.postalCode ? `${personalInfo.address}, Singapore ${personalInfo.postalCode}` : '') : 
        '', // Reset to empty when unchecked to allow manual input
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
    this.setState(prevState => {
      const isCurrentlyExpanded = prevState.expandedSections[sectionName];
      
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
        address: '',
        postalCode: ''
      },
      paymentMethod: '',
      collectionMode: '',
      collectionLocation: '',
      deliveryToAddress: '',
      shipToBillingAddress: false,
      fieldErrors: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        postalCode: '',
        paymentMethod: '',
        collectionMode: '',
        collectionLocation: '',
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

  handlePlaceOrder = async () => {
    const { personalInfo, paymentMethod, collectionMode, collectionLocation, deliveryToAddress, shipToBillingAddress } = this.state;
    const { cartItems = [] } = this.props;

    // Clear all errors first
    let newFieldErrors = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      postalCode: '',
      paymentMethod: '',
      collectionMode: '',
      collectionLocation: '',
      deliveryToAddress: '',
      shipToBillingAddress: ''
    };

    // Validate all required fields are filled
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'postalCode'];
    let hasErrors = false;

    requiredFields.forEach(field => {
      if (!personalInfo[field] || personalInfo[field].trim() === '') {
        const fieldDisplayNames = {
          firstName: 'First name',
          lastName: 'Last name',
          email: 'Email',
          phone: 'Phone',
          address: 'Address',
          postalCode: 'Postal code'
        };
        newFieldErrors[field] = `${fieldDisplayNames[field]} is required`;
        hasErrors = true;
      }
    });

    if (!paymentMethod) {
      newFieldErrors.paymentMethod = 'Payment method is required';
      hasErrors = true;
    }

    if (!collectionMode) {
      newFieldErrors.collectionMode = 'Collection mode is required';
      hasErrors = true;
    }

    // Validate collection location only if Self-Collection is selected
    if (collectionMode === 'Self-Collection' && !collectionLocation) {
      newFieldErrors.collectionLocation = 'Collection location is required';
      hasErrors = true;
    }

    // Validate delivery address only if Delivery is selected
    if (collectionMode === 'Delivery') {
      if (!shipToBillingAddress && !deliveryToAddress) {
        newFieldErrors.deliveryToAddress = 'Delivery address is required';
        hasErrors = true;
      }
      // If using billing address, check if billing address exists
      if (shipToBillingAddress && (!personalInfo.address || !personalInfo.postalCode)) {
        newFieldErrors.deliveryToAddress = 'Please ensure your billing address is complete';
        hasErrors = true;
      }
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty');
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
    } else if (collectionMode === 'Delivery') {
      CollectionDeliveryLocation = shipToBillingAddress ? 
        `${personalInfo.address}, Singapore ${personalInfo.postalCode}` : 
        deliveryToAddress;
    }

    const orderData = {
      personalInfo: {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        phone: personalInfo.phone,
        address: personalInfo.address,
        postalCode: personalInfo.postalCode
      },
      paymentDetails: {
        paymentMethod: paymentMethod,
      },
      collectionDetails: {
        collectionMode: collectionMode,
        CollectionDeliveryLocation: CollectionDeliveryLocation
      },
      orderDetails: {
      orderDate: orderDate,
      orderTime: orderTime,
      totalPrice: parseFloat(this.calculateTotal()), // Add total price
      items: cartItems.map(item => ({
        productName: this.cleanProductName(item.name), // Clean the product name
        quantity: item.quantity
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
      
      // Show success modal (cart will be cleared when user clicks OK)
      this.showModal(
        'success',
        '✓',
        'Order Successfully Placed!'
      );
      
    } catch (error) {
      console.error('Error placing order:', error);
      
      // Show error modal
      this.showModal(
        'error',
        '✗',
        'Order Failed!'
      );
 }
  }

  render() {
    const { personalInfo, paymentMethod, collectionMode, collectionLocation, deliveryToAddress, shipToBillingAddress, expandedSections, fieldErrors, modal } = this.state;
    const { cartItems = [] } = this.props;

    return (
      <div className="checkout-page">
        <div className="checkout-container">
          {/* Back button at the top */}
          <CheckoutActions
            onGoBack={this.handleGoBack}
            showTopOnly={true}
          />

          {/* Personal Information Section */}
          <PersonalInformationSection
            personalInfo={personalInfo}
            expandedSections={expandedSections}
            fieldErrors={fieldErrors}
            onPersonalInfoChange={this.handlePersonalInfoChange}
            onToggleSection={this.toggleSection}
          />

          {/* Payment Method Section */}
          <PaymentMethodSection
            paymentMethod={paymentMethod}
            expandedSections={expandedSections}
            fieldErrors={fieldErrors}
            onPaymentMethodChange={this.handlePaymentMethodChange}
            onToggleSection={this.toggleSection}
          />

          {/* Collection Mode Section */}
          <CollectionModeSection
            collectionMode={collectionMode}
            expandedSections={expandedSections}
            fieldErrors={fieldErrors}
            onCollectionModeChange={this.handleCollectionModeChange}
            onToggleSection={this.toggleSection}
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
          />

          {/* Action buttons at the bottom */}
          <CheckoutActions
            cartItems={cartItems}
            onClearForm={this.handleClearForm}
            onGoBack={this.handleGoBack}
            onPlaceOrder={this.handlePlaceOrder}
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
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default CheckoutPage;