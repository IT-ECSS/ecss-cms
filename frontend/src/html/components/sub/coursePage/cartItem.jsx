import React, { Component } from 'react';
import { FaTrash, FaPlus, FaMinus } from 'react-icons/fa';
import "../../../../css/sub/coursePage/cartItem.css";

class CartItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      inputQuantity: props.item.quantity.toString(),
      isEditing: false
    };
  }

  componentDidUpdate(prevProps) {
    // Only update input if quantity changed from outside and user is not currently editing
    if (prevProps.item.quantity !== this.props.item.quantity && !this.state.isEditing) {
      this.setState({ inputQuantity: this.props.item.quantity.toString() });
    }
  }

  handleQuantityChange = (e) => {
    const value = e.target.value;
    // Accept any input - no restrictions
    this.setState({ inputQuantity: value });
  }

  handleQuantityFocus = () => {
    this.setState({ isEditing: true });
  }

  handleQuantityBlur = () => {
    const { item, index, onIncreaseQuantity, onDecreaseQuantity, onRemoveItem } = this.props;
    const { inputQuantity } = this.state;
    
    // Set editing to false
    this.setState({ isEditing: false });
    
    // If input is empty or only whitespace, restore previous value
    if (inputQuantity.trim() === '') {
      this.setState({ inputQuantity: item.quantity.toString() });
      return;
    }
    
    let newQuantity = parseInt(inputQuantity, 10);
    
    // Handle invalid input - restore previous value
    if (isNaN(newQuantity) || newQuantity < 1) {
      this.setState({ inputQuantity: item.quantity.toString() });
      return;
    }
    
    // If the value hasn't changed, no need to update
    if (newQuantity === item.quantity) {
      return;
    }
    
    const currentQuantity = item.quantity;
    const difference = newQuantity - currentQuantity;
    
    if (difference > 0) {
      // Increase quantity
      for (let i = 0; i < difference; i++) {
        onIncreaseQuantity(index);
      }
    } else if (difference < 0) {
      // Decrease quantity
      for (let i = 0; i < Math.abs(difference); i++) {
        if (item.quantity === 1) {
          onRemoveItem(index);
          break;
        } else {
          onDecreaseQuantity(index);
        }
      }
    }
    
    // The quantity will be updated via componentDidUpdate when props change
  }

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
    // Allow all default behaviors including backspace
  }

  render() {
    const { 
      item, 
      index, 
      onIncreaseQuantity, 
      onDecreaseQuantity, 
      onRemoveItem, 
      renderCourseName,
      calculateItemTotal 
    } = this.props;
    const { inputQuantity } = this.state;

    return (
      <div className="cart-item">
        <div className="item-image">
          <img src={item.imageUrl} alt={item.name} />
        </div>
                <div className="item-details">
          <div className="item-name">
            {renderCourseName ? renderCourseName(item.name) : item.name}
          </div>
          <i 
            className="fa-solid fa-trash-can"
            onClick={() => onRemoveItem(index)}
            title="Remove item"
          ></i>
          <div className="item-price">${item.price}</div>
        </div>
        <div className="item-quantity">
          <button 
            className="quantity-btn" 
            onClick={() => {
              if (item.quantity === 1) {
                onRemoveItem(index);
              } else {
                onDecreaseQuantity(index);
              }
            }}
          >
            -
          </button>
          <input
            type="text"
            className="quantity"
            value={inputQuantity}
            onChange={this.handleQuantityChange}
            onFocus={this.handleQuantityFocus}
            onBlur={this.handleQuantityBlur}
            onKeyDown={this.handleKeyDown}
          />
          <button 
            className="quantity-btn"
            onClick={() => onIncreaseQuantity(index)}
          >
            +
          </button>
        </div>
        <div className="item-total">${calculateItemTotal(item)}</div>
      </div>
    );
  }
}

export default CartItem;