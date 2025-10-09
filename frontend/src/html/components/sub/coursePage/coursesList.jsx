import React, { Component } from "react";

class CoursesList extends Component {
  constructor(props) {
    super(props);
    // Initialize state for each course's display quantity (separate from cart quantity)
    this.state = {
      displayQuantities: {}, // This is what shows in the UI controls
      inputValues: {}
    };
  }

  componentDidMount() {
    // Initialize display quantities (default to 1 for new items, or cart quantity for existing items)
    this.syncDisplayQuantities();
  }

  componentDidUpdate(prevProps) {
    // Update display quantities when cart items change
    if (prevProps.cartItems !== this.props.cartItems) {
      this.syncDisplayQuantitiesWithCart();
    }
  }

  syncDisplayQuantities = () => {
    const { cartItems, courses } = this.props;
    if (courses) {
      const newDisplayQuantities = {};
      courses.forEach(course => {
        // Only update if we don't already have a display quantity for this course
        if (this.state.displayQuantities[course.id] === undefined) {
          const existingItem = cartItems ? cartItems.find(item => item.course.id === course.id) : null;
          newDisplayQuantities[course.id] = existingItem ? existingItem.quantity : 1;
        }
      });
      
      // Only update state if we have new quantities to add
      if (Object.keys(newDisplayQuantities).length > 0) {
        this.setState(prevState => ({
          displayQuantities: {
            ...prevState.displayQuantities,
            ...newDisplayQuantities
          }
        }));
      }
    }
  };

  // Sync display quantities with actual cart quantities after cart operations
  syncDisplayQuantitiesWithCart = () => {
    const { cartItems, courses } = this.props;
    if (courses) {
      const updatedDisplayQuantities = {};
      courses.forEach(course => {
        const existingItem = cartItems ? cartItems.find(item => item.course.id === course.id) : null;
        // Update display quantity to match cart quantity, or set to 1 if not in cart
        updatedDisplayQuantities[course.id] = existingItem ? existingItem.quantity : 1;
      });
      
      this.setState({
        displayQuantities: updatedDisplayQuantities
      });
    }
  };

  // Update display quantity for a specific course (UI only, doesn't affect cart)
  handleQuantityChange = (courseId, delta) => {
    this.setState(prevState => {
      const currentQuantity = prevState.displayQuantities[courseId] || 1;
      const newQuantity = Math.max(0, currentQuantity + delta);
      return { 
        displayQuantities: {
          ...prevState.displayQuantities,
          [courseId]: newQuantity
        },
        inputValues: {
          ...prevState.inputValues,
          [courseId]: undefined
        }
      };
    });
  };
  // Handle direct input for display quantity (UI only, doesn't affect cart)
  handleInputChange = (courseId, e) => {
    const value = e.target.value;
    this.setState(prevState => ({
      inputValues: {
        ...prevState.inputValues,
        [courseId]: value
      }
    }));
    
    // If empty, don't update the actual quantity yet
    if (value === '') {
      return;
    }
    
    // Only allow positive integers
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue === '') {
      return;
    }
    
    const newQuantity = parseInt(numericValue, 10);
    
    // Check if parsing was successful and number is valid
    if (isNaN(newQuantity) || newQuantity < 0) {
      return;
    }
    
    // Set minimum quantity to 0
    const finalQuantity = Math.max(0, newQuantity);
    this.setState(prevState => ({
      displayQuantities: {
        ...prevState.displayQuantities,
        [courseId]: finalQuantity
      }
    }));
  };

  // Handle input blur event
  handleInputBlur = (courseId, e) => {
    const value = e.target.value;
    
    // Only restore the display quantity if the field is completely empty
    // Otherwise, keep whatever the user typed
    if (value === '') {
      const currentQuantity = this.state.displayQuantities[courseId] || 1;
      this.setState(prevState => ({
        inputValues: {
          ...prevState.inputValues,
          [courseId]: currentQuantity
        }
      }));
    }
    // If there's any value (even if it's 0 or invalid), keep it as-is
  };

  // Handle Enter key press
  handleInputKeyDown = (courseId, e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  // Handle add to cart with quantity - this actually updates the cart
  handleAddToCartWithQuantity = (course) => {
    const { addToCart, addToCartWithQuantity, cartItems } = this.props;
    const displayQuantity = this.state.displayQuantities[course.id] || 1; // Use display quantity
    const existingItem = cartItems ? cartItems.find(item => item.course.id === course.id) : null;
    const isInCart = !!existingItem;
    
    // Use the new method if available, otherwise fall back to the old method
    if (addToCartWithQuantity && typeof addToCartWithQuantity === 'function') {
      // If item is in cart and quantity is 0, remove it; otherwise update with new quantity
      if (isInCart || displayQuantity > 0) {
        addToCartWithQuantity(course, displayQuantity);
        // After successful cart update, sync the display quantity with the new cart state
        // The cart quantity will be updated by the parent component and sync back via componentDidUpdate
      }
    } else {
      // Fallback to old method - only add to cart if quantity is greater than 0
      if (displayQuantity > 0) {
        // Add the course to cart with the specified quantity
        for (let i = 0; i < displayQuantity; i++) {
          addToCart(course);
        }
      }
    }
  };

  render() {
    const { courses, addToCart, showMoreInfo, renderCourseName, cartItems } = this.props;
    const { displayQuantities, inputValues } = this.state;

    return (
      <div className="course-selection-container">
        <h1>Course Selection</h1>
        <ul className="course-list">
          {courses.map((course) => {
            const displayQuantity = displayQuantities[course.id] || 1; // Display quantity (may differ from cart)
            const inputValue = inputValues[course.id];
            
            // Check if this course is already in the cart and get actual cart quantity
            const existingItem = cartItems ? cartItems.find(item => item.course.id === course.id) : null;
            const isInCart = !!existingItem;
            const cartQuantity = existingItem ? existingItem.quantity : 0;

            return (
              <li key={course.id} className="course-item">
                {/* Course Name Rendering */}
                <div className="course-header">
                  <img
                    src={course.images[0].src || "https://via.placeholder.com/150"}
                    alt={course.name}
                    className="course-image"
                  />
                </div>

                {/* Course body with price */}
                <div className="course-body">
                  {renderCourseName(course.name)}
                  <p className="course-price">
                    {course.price ? `$${course.price}` : "Price not available"}
                  </p>
                </div>

                {/* Quantity Selection Section */}
                <div className="quantity-section">
                  <h4>Quantity</h4>
                  <div className="quantity-controls">
                    <button 
                      className="quantity-btn"
                      onClick={() => this.handleQuantityChange(course.id, -1)}
                      disabled={displayQuantity <= 0}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input 
                      type="text"
                      className="quantity-input"
                      value={inputValue !== undefined ? inputValue : displayQuantity}
                      onChange={(e) => this.handleInputChange(course.id, e)}
                      onBlur={(e) => this.handleInputBlur(course.id, e)}
                      onKeyDown={(e) => this.handleInputKeyDown(course.id, e)}
                    />
                    <button 
                      className="quantity-btn"
                      onClick={() => this.handleQuantityChange(course.id, 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Footer with buttons */}
                <div className="course-footer">
                  {/*<button
                      onClick={() => showMoreInfo(course)}
                      className="more-info-btn"
                    >
                    More Info
                  </button>*/}
                  <button
                    onClick={() => this.handleAddToCartWithQuantity(course)}
                    className="btn-add-to-cart-rounded"
                  >
                    {isInCart ? 'Update Cart' : (displayQuantity === 0 ? 'Select Quantity' : 'Add to Cart')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

export default CoursesList;
