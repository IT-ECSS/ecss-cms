import React, { Component } from 'react';
import axios from 'axios';
import '../../css/checkoutPage.css';
import PersonalInformationSection from './sub/checkout/PersonalInformationSection';
import PaymentMethodSection from './sub/checkout/PaymentMethodSection';
import CollectionModeSection from './sub/checkout/CollectionModeSection';
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
      expandedSections: savedCheckoutState.expandedSections || {
        personalInfo: true,  // Section 1 expanded by default
        paymentMethod: false,
        collectionMode: false,
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
        collectionMode: ''
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
    this.setState(prevState => ({
      personalInfo: {
        ...prevState.personalInfo,
        [field]: value
      },
      fieldErrors: {
        ...prevState.fieldErrors,
        [field]: '' // Clear error when user starts typing
      }
    }));
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
      fieldErrors: {
        ...this.state.fieldErrors,
        collectionMode: '' // Clear error when user selects
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
      fieldErrors: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        postalCode: '',
        paymentMethod: '',
        collectionMode: ''
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

  handlePlaceOrder = async () => {
    const { personalInfo, paymentMethod, collectionMode } = this.state;
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
      collectionMode: ''
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

    const orderData = {
      personalInfo: {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        phone: personalInfo.phone,
        address: personalInfo.address,
        postalCode: personalInfo.postalCode
      },
      paymentMethod: paymentMethod,
      collectionMode: collectionMode,
      orderDate: orderDate,
      orderTime: orderTime,
      totalPrice: parseFloat(this.calculateTotal()), // Add total price
      items: cartItems.map(item => ({
        productName: item.name,
        quantity: item.quantity
      }))
    };    try {
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
    const { personalInfo, paymentMethod, collectionMode, expandedSections, fieldErrors, modal } = this.state;
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
              <div className="modal-footer">
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