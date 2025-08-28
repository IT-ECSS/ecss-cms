import React, { Component } from 'react';
import '../../../../css/sub/registrationForm/courseDetails.css';

class CourseDetailsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPayment: '',
      paymentTouched: false,
    };
  }

   // Handle payment selection and call onChange prop
   handlePaymentChange = (event) => {
    const selectedPayment = event.target.value;
    this.setState({ 
      selectedPayment,
      paymentTouched: true,
    });

    // Pass the selected payment option back to the parent
    this.props.onChange({
      ...this.props.formData,
      payment: selectedPayment,
    });
  };
  
  decodeHtmlEntities(text) 
  {
    const parser = new DOMParser();
    const decodedString = parser.parseFromString(`<!doctype html><body>${text}`, "text/html").body.textContent;
    return decodedString;
  }

  render() {
    const { selectedPayment, paymentTouched } = this.state;
    const { courseType, courseLocation, courseEnglishName, courseChineseName } = this.props;
    const isNSA = courseType === 'NSA';
    const isILP = courseType === 'ILP';
    const isMarriagePrep = courseType === 'Marriage Preparation Programme';
    //Marriage Preparation Programme
    console.log('CourseDetailsSection props:', this.props);

    return (
      <div className="course-details-section">
        <div className="input-group1">
          <label htmlFor="courseType">Course Type 课程类型</label>
          <span className="course-detail-text" id="courseType">
            {courseType}
          </span>
        </div>
        <div className="input-group1">
          <label htmlFor="courseName">Course Name 课程名称</label>
          <span className="course-detail-text" id="courseName">
            English Name: {this.decodeHtmlEntities(this.props.courseEnglishName)}
          </span>
          <br />
          <span className="course-detail-text" id="courseName">
            中文名: {this.decodeHtmlEntities(this.props.courseChineseName)}
          </span>
        </div>
        <div className="input-group1">
          <label htmlFor="courseLocation">Course Location 课程地点</label>
          <span className="course-detail-text" id="courseLocation">
            {this.props.courseLocation}
          </span>
        </div>
        {isNSA && (  
        <div className="input-group1">
          <label htmlFor="coursePrice">Course Price 价格</label>
          <span className="course-detail-text" id="coursePrice">
            {(() => {
              // Calculate age from date of birth if available
              if (this.props.age < 50) {
                // Extract numeric value from coursePrice (remove $ and parse)
                const basePrice = parseFloat(this.props.coursePrice.replace('$', ''));
                const adjustedPrice = basePrice * 5;
                return `$${adjustedPrice.toFixed(2)}`;
              }
              return this.props.coursePrice;
            })()}
          </span>
        </div>)}


        <div className="input-group1">
          <label htmlFor="courseDuration">Course Duration 课程时长</label>
          <span className="course-detail-text" id="courseDuration">
            {this.props.courseDuration}
          </span>
        </div>

        {isNSA && (  
        <div className="input-group1">
          <label htmlFor="courseMode">Course Mode 课程模式</label>
          <span className="course-detail-text" id="courseMode">
            {this.props.courseMode}
          </span>
        </div>)}
  
        {(isNSA || isMarriagePrep) && (  // Payment Options Section for NSA and Marriage Preparation Programme
          <div className="input-group1">
            <label>I wish to pay by:</label>
            <label>我希望通过以下方式付款：</label>
            <div className="payment-options">
              {/* For NSA, keep existing logic. For Marriage Prep, always show all three options. */}
              {(isNSA && courseLocation !== 'Pasir Ris West Wellness Centre') || isMarriagePrep ? (
                <label>
                  <input
                    type="radio"
                    value="Cash"
                    checked={selectedPayment === 'Cash'}
                    onChange={this.handlePaymentChange}
                  />
                  Cash
                </label>
              ) : null}
              <label>
                <input
                  type="radio"
                  value="PayNow"
                  checked={selectedPayment === 'PayNow'}
                  onChange={this.handlePaymentChange}
                />
                PayNow
              </label>
              {/* NSA: Conditionally render SkillsFuture. Marriage Prep: always show. */}
              {(
                isNSA && (
                  courseEnglishName === 'Community Ukulele – Mandarin L2A' ||
                  courseEnglishName === 'Community Ukulele – Mandarin L2B' ||
                  (courseEnglishName !== 'My Story – Mandarin' &&
                  courseEnglishName !== 'Community Ukulele – Mandarin L1' && courseChineseName !== "音乐祝福社区四弦琴班")
                )
              ) && !isMarriagePrep ? (
                <label>
                  <input
                    type="radio"
                    value="SkillsFuture"
                    checked={selectedPayment === 'SkillsFuture'}
                    onChange={this.handlePaymentChange}
                  />
                  SkillsFuture
                </label>
              ) : null}
              
            </div>
            {/* Display error message if no payment option is selected, paymentTouched is true, and courseType is NSA or Marriage Prep */}
            {(isNSA || isMarriagePrep) && !selectedPayment && paymentTouched && (
              <>
                <span className="error-message3">Please select a payment option.</span>
                <span className="error-message3">请选择付款方式。</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  }  
}

export default CourseDetailsSection;
