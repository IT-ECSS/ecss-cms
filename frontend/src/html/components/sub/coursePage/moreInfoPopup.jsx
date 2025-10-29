import React, { Component } from "react";
import "../../../../css/sub/coursePage/moreInfoPopup.css"; // Import the CartPopup CSS styles here


class MoreInfoPopup extends Component 
{
    constructor(props) {
        super(props);
        this.state = {
            displayQuantity: 1, // Display quantity (separate from cart quantity)
            inputValue: undefined
        };
    }

    componentDidMount() {
        // Initialize display quantity based on existing cart item or default to 1
        const { selectedCourse, cartItems } = this.props;
        if (selectedCourse && cartItems) {
            const existingItem = cartItems.find(item => item.course.id === selectedCourse.id);
            if (existingItem) {
                this.setState({ displayQuantity: existingItem.quantity });
            }
        }
    }

    handleQuantityChange = (delta) => {
        this.setState(prevState => {
            const newQuantity = Math.max(0, prevState.displayQuantity + delta);
            return { displayQuantity: newQuantity, inputValue: undefined };
        });
    };

    handleInputChange = (e) => {
        const value = e.target.value;
        // Only update the input value, don't change displayQuantity
        this.setState({ inputValue: value });
    };

    handleInputBlur = (e) => {
        // Do nothing when leaving the textbox - preserve whatever value is typed
        // The input value will remain exactly as the user typed it
    };

    handleInputKeyDown = (e) => {
        // Handle Enter key to confirm input
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };

    handleAddToCartWithQuantity = () => {
        const { selectedCourse, handleAddToCartWithQuantity, handleAddToCart, cartItems } = this.props;
        const { displayQuantity, inputValue } = this.state;
        
        // Use inputValue if it exists and is valid, otherwise use displayQuantity
        let quantityToUse = displayQuantity;
        if (inputValue !== undefined && inputValue !== '') {
            const numericValue = parseInt(inputValue, 10);
            if (!isNaN(numericValue) && numericValue >= 0) {
                quantityToUse = numericValue;
            }
        }
        
        const existingItem = cartItems ? cartItems.find(item => item.course.id === selectedCourse.id) : null;
        const isInCart = !!existingItem;
        
        // Use the new method if available, otherwise fall back to the old method
        if (handleAddToCartWithQuantity && typeof handleAddToCartWithQuantity === 'function') {
            // Always call the method - it handles adding, updating, and removing based on quantity
            handleAddToCartWithQuantity(selectedCourse, quantityToUse);
        } else {
            // Fallback to old method - only add to cart if quantity is greater than 0
            if (quantityToUse > 0) {
                // Add the course to cart with the specified quantity
                for (let i = 0; i < quantityToUse; i++) {
                    handleAddToCart(selectedCourse);
                }
            }
        }
    };
    
    render() {
        const { selectedCourse, renderCourseName2, renderDescription, renderCourseDetails, handleClose, cartItems } = this.props;
        const { displayQuantity, inputValue } = this.state;

        if (!selectedCourse) return null;
        console.log("Selected Course:", selectedCourse);

        // Check if this course is already in the cart and get actual cart quantity
        const existingItem = cartItems ? cartItems.find(item => item.course.id === selectedCourse.id) : null;
        const isInCart = !!existingItem;
        const cartQuantity = existingItem ? existingItem.quantity : 0;

        // Calculate the quantity that will be used when button is clicked
        let quantityToUse = displayQuantity;
        if (inputValue !== undefined && inputValue !== '') {
            const numericValue = parseInt(inputValue, 10);
            if (!isNaN(numericValue) && numericValue >= 0) {
                quantityToUse = numericValue;
            }
        }

        return (
        <div className="course-popup">
            <div className="popup-overlay1" onClick={handleClose}></div>
            <div className="1">
            <div className="course-details">
                <div className="course-header1">
                <img
                    src={selectedCourse.images[0].src || "https://via.placeholder.com/150"}
                    className="popup-course-image"
                />
                <div className="course-info">
                   {renderCourseName2(selectedCourse.name)}
                </div>
                </div>
                <p className="course-description">{renderDescription(selectedCourse.description)}</p>
                <div className="course-details-section">
                <h3>Course Details</h3>
                <p style={{ display: 'flex' }}><strong style={{ marginRight: '1rem' }}>Contact Number:</strong> {renderCourseDetails(selectedCourse.short_description).contactNumber}</p>
                <p style={{ display: 'flex' }}><strong style={{ marginRight: '1rem' }}>Language: </strong> {renderCourseDetails(selectedCourse.short_description).language}</p>
                <p style={{ display: 'flex' }}><strong style={{ marginRight: '1rem' }}>Location: </strong> {renderCourseDetails(selectedCourse.short_description).location}</p>
                <p style={{ display: 'flex' }}>
                    <strong style={{ marginRight: '1rem' }}>Fee/Lesson/Vacancy:</strong>
                    {renderCourseDetails(selectedCourse.short_description).feeLessonVacancy}
                </p>
                <p style={{ display: 'flex' }}>
                    <strong style={{ marginRight: '1rem' }}>Lesson Schedule:</strong>
                    {renderCourseDetails(selectedCourse.short_description).lessonSchedule}
                </p>
                <p style={{ display: 'flex' }}>
                    <strong style={{ marginRight: '1rem' }}>Course Duration:</strong>
                    {renderCourseDetails(selectedCourse.short_description).courseDateRange}
                </p>
                </div>
                
                {/* Quantity Selection Section */}
                <div className="quantity-section">
                    <h3>Quantity</h3>
                    <div className="quantity-controls">
                        <button 
                            className="quantity-btn"
                            onClick={() => this.handleQuantityChange(-1)}
                            disabled={displayQuantity <= 0}
                            aria-label="Decrease quantity"
                        >
                            −
                        </button>
                        <input 
                            type="text"
                            className="quantity-input"
                            value={inputValue !== undefined ? inputValue : displayQuantity}
                            onChange={this.handleInputChange}
                            onBlur={this.handleInputBlur}
                            onKeyDown={this.handleInputKeyDown}
                        />
                        <button 
                            className="quantity-btn"
                            onClick={() => this.handleQuantityChange(1)}
                            aria-label="Increase quantity"
                        >
                            +
                        </button>
                    </div>
                </div>
                
                <div className="course-reviews">
                    <div className="button-container">
                    <button onClick={handleClose}>Close</button>
                    <button className="btn-add-to-cart-rounded" onClick={this.handleAddToCartWithQuantity}>
                        {isInCart ? 'Update Cart' : (quantityToUse === 0 ? 'Select Quantity' : 'Add to Cart')}
                    </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
        );
    }
}

export default MoreInfoPopup;
