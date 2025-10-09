import {React, Component} from 'react';
import CartItem from './cartItem'; // Import the new CartItem component
import "../../../../css/sub/coursePage/cartPopup.css"; // Import the CartPopup CSS styles here

class CartPopup extends Component 
{
  constructor(props) {
    super(props);
    this.state = {
      cartItems: this.initializeCartItems(props.cartItems)
    };
  }

  // Initialize cart items with quantity if not present
  initializeCartItems = (items) => {
    return items.map(item => ({
      ...item,
      quantity: item.quantity || 1
    }));
  };

  // Update cart items when props change
  componentDidUpdate(prevProps) {
    if (prevProps.cartItems !== this.props.cartItems) {
      this.setState({
        cartItems: this.initializeCartItems(this.props.cartItems)
      });
    }
  }

  // Handle quantity increase
  increaseQuantity = (index) => {
    this.setState(prevState => {
      const updatedItems = prevState.cartItems.map((item, i) => 
        i === index ? { ...item, quantity: item.quantity + 1 } : item
      );
      
      // Notify parent component of changes
      if (this.props.onCartUpdate) {
        this.props.onCartUpdate(updatedItems);
      }
      
      return { cartItems: updatedItems };
    });
  };

  // Handle quantity decrease
  decreaseQuantity = (index) => {
    this.setState(prevState => {
      const updatedItems = prevState.cartItems.map((item, i) => 
        i === index && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item
      );
      
      // Notify parent component of changes
      if (this.props.onCartUpdate) {
        this.props.onCartUpdate(updatedItems);
      }
      
      return { cartItems: updatedItems };
    });
  };

  // Handle item removal
  removeItem = (index) => {
    this.setState(prevState => {
      const updatedItems = prevState.cartItems.filter((_, i) => i !== index);
      
      // Notify parent component of changes
      if (this.props.onCartUpdate) {
        this.props.onCartUpdate(updatedItems);
      }
      
      return { cartItems: updatedItems };
    });
  };

  // Calculate total price for an item
  calculateItemTotal = (item) => {
    return (parseFloat(item.price) * item.quantity).toFixed(2);
  };

  // Calculate grand total
  calculateGrandTotal = () => {
    return this.state.cartItems.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0).toFixed(2);
  };

  render() {
    const { onClose, renderCourseName1, handleCheckout } = this.props;
    const { cartItems } = this.state;

    console.log("Cart Items:", cartItems);

    return (
      <div className="cart-popup-overlay">
        <div className="cart-popup">
          <h2>Shopping Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</h2>

          {cartItems.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <div className="cart-items-list">
              {cartItems.map((item, index) => (
                <CartItem
                  key={index}
                  item={item}
                  index={index}
                  onIncreaseQuantity={this.increaseQuantity}
                  onDecreaseQuantity={this.decreaseQuantity}
                  onRemoveItem={this.removeItem}
                  renderCourseName={renderCourseName1}
                  calculateItemTotal={this.calculateItemTotal}
                />
              ))}
              
              {/* Grand Total */}
              <div className="cart-grand-total">
                <strong>Grand Total: ${this.calculateGrandTotal()}</strong>
              </div>
            </div>
          )}
          
          <div className="button-container">
            <button onClick={onClose}>Close</button>
            <button onClick={() => handleCheckout(cartItems)}>Checkout</button>
          </div>      
        </div>
      </div>
    );
  }
}

export default CartPopup;
