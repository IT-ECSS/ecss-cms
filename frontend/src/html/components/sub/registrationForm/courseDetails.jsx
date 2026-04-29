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

  // Remove location in parentheses from course name (e.g., "Course Name (CT Hub)" -> "Course Name")
  removeLocationFromCourseName(courseName) {
    if (!courseName) return courseName;
    return courseName.replace(/\s*\([^)]*\)\s*$/, '').trim();
  }

  render() {
    const { selectedPayment, paymentTouched } = this.state;
    const { courseType, courseLocation, courseEnglishName, courseChineseName, isMalayLanguage } = this.props;
    const isNSA = courseType === 'NSA';
    const isILP = courseType === 'ILP';
    const isMarriagePrep = courseType === 'Marriage Preparation Programme';
    const isTalksAndSeminar = courseType === 'Talks And Seminar';
    const numericCoursePrice = parseFloat(this.props.coursePrice?.replace('$', '') || '0');
    const hasDisplayablePrice = numericCoursePrice > 0;
    const talksPrice = numericCoursePrice;
    const isPaidTalks = isTalksAndSeminar && talksPrice > 0;
    const extractedAddress = (this.props.extractedLocation || '')
      .replace(/^(?:地点\s*)?(?:Lokasi\s*)?Location:\s*/i, '')
      .replace(/^(?:地点|Lokasi):\s*/i, '')
      .trim();
    const normalizedCourseLocation = (courseLocation || '').trim().toLowerCase();
    const normalizedExtractedAddress = extractedAddress.toLowerCase();
    const addressHasStreetNumber = /^\d+[a-z]?\s/i.test(extractedAddress);
    const addressAddsMoreThanVenue =
      normalizedExtractedAddress &&
      normalizedExtractedAddress !== normalizedCourseLocation &&
      !normalizedExtractedAddress.startsWith(`${normalizedCourseLocation}, singapore`);
    const shouldShowTalksAddress = isTalksAndSeminar && extractedAddress && (addressHasStreetNumber || addressAddsMoreThanVenue);
    //Marriage Preparation Programme
    console.log('CourseDetailsSection props:', this.props);

    // Helper function to get language-appropriate labels
    const getLabel = (english, chinese, malay) => {
      // Only apply Malay labels for Talks And Seminar courses with Malay language option
      if (isTalksAndSeminar && isMalayLanguage && malay) {
        return `${english} ${malay}`;
      }
      return `${english} ${chinese}`;
    };

    return (
      <div className="course-details-section1">
        {/* Hide title for Talks And Seminar */}
        
        {!isTalksAndSeminar && (
          <div className="input-group1">
            <label htmlFor="courseType">{getLabel('Course Type', '课程类型', 'Jenis Kursus')}</label>
            <span className="course-detail-text" id="courseType">
              {courseType}
            </span>
          </div>
        )}
        <div className="input-group1">
          <label htmlFor="courseName">{getLabel('Course Name', '课程名称', 'Nama Kursus')}</label>
          <span className="course-detail-text" id="courseName">
            {this.decodeHtmlEntities(this.removeLocationFromCourseName(this.props.courseEnglishName))}
          </span>
          <br />
          <span className="course-detail-text" id="courseName">
           {this.decodeHtmlEntities(this.removeLocationFromCourseName(this.props.courseChineseName))}
          </span>
        </div>
        
        <div className="input-group1">
          <label htmlFor="courseLocation">{getLabel('Course Location', '课程地点', 'Lokasi Kursus')}</label>
          <span className="course-detail-text" id="courseLocation">
            {this.props.courseLocation}
          </span>
        </div>
        
        {shouldShowTalksAddress && (
          <div className="input-group1">
            <label htmlFor="courseAddress">{getLabel('Course Address', '课程地址', 'Alamat Kursus')}</label>
            <span className="course-detail-text" id="courseAddress">
              {(() => {
                const address = extractedAddress;

                if (!address) {
                  return '';
                }

                // Check if address contains a 6-digit postal code
                const postalCodeMatch = address.match(/(.+?)\s*(Singapore\s+)?(\d{6})$/i);
                if (postalCodeMatch) {
                  const mainAddress = postalCodeMatch[1].trim();
                  const postalCode = postalCodeMatch[3];
                  return (
                    <>
                      {mainAddress}
                      <br />
                      Singapore {postalCode}
                    </>
                  );
                }
                return address;
              })()}
            </span>
          </div>
        )}
        
        {hasDisplayablePrice && (  
        <div className="input-group1">
          <label htmlFor="coursePrice">{getLabel('Course Price', '价格', 'Harga Kursus')}</label>
          <span className="course-detail-text" id="coursePrice">
            {(() => {
              if (isNSA) {
                // Calculate age from date of birth if available
                if (this.props.age < 50) {
                  // Extract numeric value from coursePrice (remove $ and parse)
                  const basePrice = parseFloat(this.props.coursePrice.replace('$', ''));
                  const adjustedPrice = basePrice * 5;
                  return `$${adjustedPrice.toFixed(2)}`;
                }
                return this.props.coursePrice;
              }
              // For paid Talks and Seminar, show the course price as-is
              return this.props.coursePrice;
            })()}
          </span>
        </div>)}


        <div className="input-group1">
          <label htmlFor="courseDuration">{getLabel('Course Duration', '课程时长', 'Tempoh Kursus')}</label>
          <span className="course-detail-text" id="courseDuration">
            {this.props.courseDuration}
          </span>
        </div>

        {isTalksAndSeminar && (
          <div className="input-group1">
            <label htmlFor="courseTime">{getLabel('Time', '时间', 'Masa')}</label>
            <span className="course-detail-text" id="courseTime">
              {this.props.courseTime || (isMalayLanguage ? 'Masa akan disediakan' : 'Time will be provided')}
            </span>
          </div>
        )}

        {isNSA && (  
        <div className="input-group1">
          <label htmlFor="courseMode">{getLabel('Course Mode', '课程模式', 'Mod Kursus')}</label>
          <span className="course-detail-text" id="courseMode">
            {this.props.courseMode}
          </span>
        </div>)}
  
        {(isNSA || isMarriagePrep || isPaidTalks) && (  // Payment Options Section for NSA, Marriage Preparation Programme, and paid Talks And Seminar (NOT ILP)
          <div className="input-group1">
            <label>{getLabel('I wish to pay by:', '我希望通过以下方式付款：', 'Saya ingin membayar dengan:')}</label>
            <div className="subheading-text">
              {getLabel('Click to select your payment method 点击选择您的付款方式', '点击选择您的付款方式', 'Klik untuk memilih kaedah pembayaran anda')}
            </div>
            <div className="payment-button-group">
              {/* For NSA, keep existing logic. For Marriage Prep and paid Talks, always show Cash option if applicable. */}
              {(isNSA && courseLocation !== 'Pasir Ris West Wellness Centre') || isMarriagePrep || isPaidTalks ? (
                <button
                  type="button"
                  className={`payment-button ${selectedPayment === 'Cash' ? 'payment-button--selected' : ''}`}
                  onClick={() => this.handlePaymentChange({ target: { value: 'Cash' } })}
                >
                  Cash
                </button>
              ) : null}
              <button
                type="button"
                className={`payment-button ${selectedPayment === 'PayNow' ? 'payment-button--selected' : ''}`}
                onClick={() => this.handlePaymentChange({ target: { value: 'PayNow' } })}
              >
                PayNow
              </button>
              {/* NSA: Conditionally render SkillsFuture. Marriage Prep: always show. Paid Talks: exclude SkillsFuture. */}
              {(
                isNSA && (
                  // SkillsFuture not available for Community Ukulele Level 2 per request
                  // so we remove the explicit equality check and only exclude the
                  // mandarin variants and the forbidden chinese name.
                  //!(courseEnglishName === 'Community Ukulele Level 2') &&
                  courseEnglishName !== 'My Story – Mandarin' &&
                  courseEnglishName !== 'Community Ukulele – Mandarin L1' &&
                  courseChineseName !== "音乐祝福社区四弦琴班"
                )
              ) && !isMarriagePrep && !isPaidTalks ? (
                <button
                  type="button"
                  className={`payment-button ${selectedPayment === 'SkillsFuture' ? 'payment-button--selected' : ''}`}
                  onClick={() => this.handlePaymentChange({ target: { value: 'SkillsFuture' } })}
                >
                  SkillsFuture
                </button>
              ) : null}
            </div>
            {/* Display error message if no payment option is selected, paymentTouched is true, and courseType is NSA, Marriage Prep, or paid Talks */}
            {(isNSA || isMarriagePrep || isPaidTalks) && !selectedPayment && paymentTouched && (
              <span className="field-validation-message" id="validation-error-payment">
                {isMalayLanguage ? 'Sila pilih pilihan pembayaran.' : 'Please select a payment option. 请选择付款方式。'}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }  
}

export default CourseDetailsSection;
