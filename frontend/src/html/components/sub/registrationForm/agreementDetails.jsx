import React, { Component } from 'react';
import '../../../../css/sub/registrationForm/agreementDetails.css';

class AgreementDetailsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedChoice: '',
      isSelected: false, // Indicates if user has interacted with the radio button
      // Marriage Preparation Programme consent checkboxes - sync with props
      marriagePrepConsent1: props.marriagePrepConsent1 || false,
      marriagePrepConsent2: props.marriagePrepConsent2 || false,
      marriagePrepInteracted: false,
      // Scroll tracking for auto-consent
      hasReadTerms: false,
      isScrolling: false,
      autoSelected: false,
      showAutoSelectMessage: false,
    };
    
    // Create refs for scroll containers
    this.termsContainerRef = React.createRef();
    this.scrollTimeout = null;
    this.scrollListenerAttached = false;
  }

  componentDidMount() {
    // Add scroll listener to terms container if it exists
    this.setupScrollListener();
  }

  componentDidUpdate(prevProps) {
    // Sync state with props if they change
    if (prevProps.marriagePrepConsent1 !== this.props.marriagePrepConsent1 || 
        prevProps.marriagePrepConsent2 !== this.props.marriagePrepConsent2) {
      this.setState({
        marriagePrepConsent1: this.props.marriagePrepConsent1 || false,
        marriagePrepConsent2: this.props.marriagePrepConsent2 || false
      });
    }
    
    // Ensure scroll listener is attached after updates
    this.setupScrollListener();
  }

  setupScrollListener = () => {
    if (this.termsContainerRef.current && !this.scrollListenerAttached && this.props.courseType === 'Marriage Preparation Programme') {
      console.log('Attaching scroll listener to terms container for Marriage Prep Programme');
      const container = this.termsContainerRef.current;
      
      // Log container dimensions for debugging
      console.log('Container dimensions:', {
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        isScrollable: container.scrollHeight > container.clientHeight
      });
      
      container.addEventListener('scroll', this.handleTermsScroll);
      this.scrollListenerAttached = true;
      
      // If content is not scrollable, auto-select immediately after a short delay
      if (container.scrollHeight <= container.clientHeight + 10) { // Add 10px tolerance
        console.log('Content is not scrollable, auto-selecting IMMEDIATELY');
        setTimeout(() => {
          if (!this.state.autoSelected && !this.state.marriagePrepConsent1 && !this.state.marriagePrepConsent2) {
            this.autoSelectConsents();
          }
        }, 1000); // 1 second delay to allow reading the visible content
      }
    }
  };

  componentWillUnmount() {
    // Clean up scroll listener
    if (this.termsContainerRef.current && this.scrollListenerAttached) {
      this.termsContainerRef.current.removeEventListener('scroll', this.handleTermsScroll);
      this.scrollListenerAttached = false;
    }
    // Clear timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  // Reset scroll detection state - useful for testing
  resetScrollDetection = () => {
    this.setState({
      hasReadTerms: false,
      isScrolling: false,
      autoSelected: false,
      showAutoSelectMessage: false
    });
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  };

  // Handle scroll detection in terms container
  handleTermsScroll = () => {
    const container = this.termsContainerRef.current;
    if (!container || this.props.courseType !== 'Marriage Preparation Programme') {
      console.log('No container found or not Marriage Prep Programme');
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    const pixelsFromBottom = scrollHeight - (scrollTop + clientHeight);
    
    console.log('Scroll event detected:', {
      scrollTop,
      scrollHeight,
      clientHeight,
      scrollPercentage: Math.round(scrollPercentage * 100) + '%',
      pixelsFromBottom,
      hasReadTerms: this.state.hasReadTerms,
      autoSelected: this.state.autoSelected,
      alreadySelected: this.state.marriagePrepConsent1 && this.state.marriagePrepConsent2
    });

    // Don't auto-select if user has already manually selected both
    if (this.state.marriagePrepConsent1 && this.state.marriagePrepConsent2) {
      console.log('Both consents already selected manually, skipping auto-select');
      return;
    }

    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.setState({ isScrolling: true });

    // Set timeout to detect when user stops scrolling
    this.scrollTimeout = setTimeout(() => {
      this.setState({ isScrolling: false });
      
      // Check if user has scrolled to the very bottom - immediate detection
      const isAtBottom = pixelsFromBottom <= 10; // Within 10 pixels of bottom
      const hasScrolledCompletely = scrollPercentage >= 1.0; // Scrolled 100% of the way
      
      if ((isAtBottom || hasScrolledCompletely) && !this.state.hasReadTerms && !this.state.autoSelected) {
        console.log('User has scrolled to bottom or 100% - auto-selecting consents IMMEDIATELY');
        console.log('Triggering auto-select with:', { isAtBottom, hasScrolledCompletely, pixelsFromBottom });
        
        this.setState({ hasReadTerms: true });
        
        // Auto-select both consents IMMEDIATELY - no delay
        this.autoSelectConsents();
      }
    }, 150); // Reduced wait time for more responsive detection
  };

  // Auto-select both consents
  autoSelectConsents = () => {
    console.log('autoSelectConsents called for Marriage Prep Programme');
    console.log('Current state:', {
      marriagePrepConsent1: this.state.marriagePrepConsent1,
      marriagePrepConsent2: this.state.marriagePrepConsent2,
      autoSelected: this.state.autoSelected
    });
    
    // Only auto-select if not already selected
    if (!this.state.marriagePrepConsent1 || !this.state.marriagePrepConsent2) {
      console.log('Auto-selecting consent checkboxes for Marriage Prep Programme');
      
      const newState = {
        marriagePrepConsent1: true,
        marriagePrepConsent2: true,
        marriagePrepInteracted: true,
        autoSelected: true,
        showAutoSelectMessage: true
      };
      
      this.setState(newState);

      // Update parent component with new consent values
      if (this.props.onChange) {
        this.props.onChange({
          marriagePrepConsent1: true,
          marriagePrepConsent2: true
        });
      }

      console.log('Auto-select completed - checkboxes should now be checked');

      // Hide the auto-select message after 3 seconds
      setTimeout(() => {
        this.setState({ showAutoSelectMessage: false });
      }, 3000);
    } else {
      console.log('Consents already selected, not auto-selecting');
    }
  };

  // Handle payment selection and call onChange prop
  handleAgreementChange = (event) => {
    const selectedChoice = event.target.value;
    this.setState({ 
      selectedChoice,
      isSelected: true // Update to true when user interacts
    });

    // Pass the selected payment option back to the parent
    this.props.onChange({
      ...this.props.formData,
      agreement: selectedChoice 
    });
  };

  // Handle Marriage Preparation Programme consent checkboxes
  handleMarriagePrepConsentChange = (consentType) => (event) => {
    const isChecked = event.target.checked;
    console.log(`${consentType} changed to:`, isChecked);
    
    this.setState(prevState => {
      const newState = {
        ...prevState,
        [consentType]: isChecked,
        marriagePrepInteracted: true
      };

      // Update parent component with new consent values
      if (this.props.onChange) {
        const updateData = {};
        updateData[consentType] = isChecked;
        // Also send the other consent value to maintain state
        if (consentType === 'marriagePrepConsent1') {
          updateData.marriagePrepConsent2 = newState.marriagePrepConsent2;
        } else {
          updateData.marriagePrepConsent1 = newState.marriagePrepConsent1;
        }
        
        console.log('Updating parent with:', updateData);
        this.props.onChange(updateData);
      }

      return newState;
    });
  };

  render() {
    const { selectedChoice, isSelected, marriagePrepConsent1, marriagePrepConsent2, marriagePrepInteracted, hasReadTerms, showAutoSelectMessage } = this.state;
    const { agreement, errors, courseType } = this.props;
    const isMarriagePrep = courseType === 'Marriage Preparation Programme';
    console.log("AgreementDetailsSection - courseType:", isMarriagePrep);

    return (
      <>
      <div className="agreement-details-section">
        {/* Standard consent for NSA/ILP courses */}
        {!isMarriagePrep && (
          <div className="input-group1">
            <label>Consent for use of Personal Data</label>
            <span className="agreement-detail-text">
              By submitting this form, I consent to my Personal Data being collected, used and disclosed to C3A and relevant partners for course administration purposes and to be informed of relevant information on programmes, research and publicity relating to active ageing. Do note that photographs and videos may be taken during the course for publicity purposes. 
              I agree to C3A’s privacy policy which may be viewed at <a href="https://www.c3a.org.sg">www.c3a.org.sg</a>. I understand that I may update my personal data or withdraw my consent at any time by emailing <a href="mailto:dataprotection@c3a.org.sg">dataprotection@c3a.org.sg</a>.
              <br />
              通过提交本表格，我同意让活跃乐龄理事会(C3A)及有关机构拥有我的个人资料，并且通过简讯，邮件或其他通讯管道：无论电子传递或其他方式）接受关于乐龄人士活跃乐龄的节目，调查，促销和其他讯息，我也同意主办单位和C3A在节目，活动中拍照和录像作为宣传用途。
              我了解我可以随时通过发送电子邮件至<a href="mailto:dataprotection@c3a.org.sg">dataprotection@c3a.org.sg</a>更新我的个人资料或撤销我的同意，活跃乐龄理事会的隐私条款可在 <a href="https://www.c3a.org.sg">www.c3a.org.sg</a>网站上查阅。
            </span>
          </div>
        )}
        {/* Marriage Preparation Programme specific consent */}
        {isMarriagePrep && (
          <>
            {/* Terms and Conditions Card */}
            <div className="input-group1">
              <label>Consent for Collection, Use and Disclosure of Personal Information</label>
              <div className="agreement-detail-text-container" ref={this.termsContainerRef}>
                <span className="agreement-detail-text">
                  <strong>TERMS AND CONDITIONS FOR COLLECTION, USE AND DISCLOSURE OF PERSONAL INFORMATION FOR FAMILIES FOR LIFE MARRIAGE PREPARATION PROGRAMME</strong>
                  <br /><br />
                  
                  <strong>1. INTRODUCTION</strong>
                  <br />
                  1.1 This document sets out the terms and conditions ("Terms") governing the collection, use and disclosure of your personal data by the Government of Singapore in relation to the Families for Life Marriage Preparation Programme ("Programme").
                  <br /><br />
                  
                  1.2 By participating in the Programme, you agree to be bound by these Terms.
                  <br /><br />
                  
                  <strong>2. COLLECTION OF PERSONAL DATA</strong>
                  <br />
                  2.1 The Government may collect the following categories of personal data from you:
                  <br />
                  (a) Personal particulars (including but not limited to your name, NRIC/FIN/passport number, date of birth, gender, race, nationality, residential status, contact details, educational level, employment details, marital status, housing type, and income level);
                  <br />
                  (b) Information about your spouse/partner (including but not limited to name, NRIC/FIN/passport number, date of birth, gender, race, nationality, residential status, contact details, educational level, employment details, marital status, housing type);
                  <br />
                  (c) Information about your relationship (including but not limited to duration of marriage/relationship, type of marriage, whether you have children);
                  <br />
                  (d) Programme-related information (including but not limited to your participation, attendance, feedback, and assessment results);
                  <br />
                  (e) Photos and videos taken during the Programme; and
                  <br />
                  (f) Any other information that you provide to us.
                  <br /><br />
                  
                  <strong>3. PURPOSES OF COLLECTION, USE AND DISCLOSURE</strong>
                  <br />
                  3.1 Your personal data may be collected, used and disclosed for the following purposes:
                  <br />
                  (a) To administer your participation in the Programme;
                  <br />
                  (b) To conduct research and analysis to improve the Programme and develop new programmes;
                  <br />
                  (c) To monitor and evaluate the effectiveness of the Programme;
                  <br />
                  (d) To contact you for follow-up surveys or research;
                  <br />
                  (e) To provide you with information about other relevant programmes and services;
                  <br />
                  (f) To compile statistics and conduct research for policy formulation and review;
                  <br />
                  (g) To verify your identity and eligibility for the Programme;
                  <br />
                  (h) To process your application and manage your participation;
                  <br />
                  (i) For publicity and promotional purposes, including the use of photos and videos;
                  <br />
                  (j) To comply with legal and regulatory requirements; and
                  <br />
                  (k) For any other purposes related to the above.
                  <br /><br />
                  
                  <strong>4. DISCLOSURE OF PERSONAL DATA</strong>
                  <br />
                  4.1 Your personal data may be disclosed to:
                  <br />
                  (a) Government agencies and statutory boards;
                  <br />
                  (b) Service providers and contractors engaged by the Government;
                  <br />
                  (c) Research institutions and academic organizations;
                  <br />
                  (d) Programme facilitators and trainers;
                  <br />
                  (e) Other participants in the Programme (for contact and networking purposes);
                  <br />
                  (f) Media organizations (for publicity purposes); and
                  <br />
                  (g) Any other parties as required by law or for the purposes stated above.
                  <br /><br />
                  
                  <strong>5. RETENTION OF PERSONAL DATA</strong>
                  <br />
                  5.1 Your personal data will be retained for as long as necessary to fulfill the purposes for which it was collected, or as required by law.
                  <br /><br />
                  
                  <strong>6. ACCESS AND CORRECTION</strong>
                  <br />
                  6.1 You may request access to or correction of your personal data by contacting us at the details provided below.
                  <br /><br />
                  
                  <strong>7. WITHDRAWAL OF CONSENT</strong>
                  <br />
                  7.1 You may withdraw your consent to the collection, use and disclosure of your personal data at any time by giving notice to us. However, please note that withdrawal of consent may affect your ability to participate in the Programme.
                  <br /><br />
                  
                  <strong>8. CONTACT INFORMATION</strong>
                  <br />
                  8.1 If you have any questions about these Terms or wish to exercise your rights regarding your personal data, please contact:
                  <br />
                  Ministry of Social and Family Development
                  <br />
                  Email: <a href="mailto:MSF_info@msf.gov.sg">MSF_info@msf.gov.sg</a>
                  <br />
                  Phone: 6355 2200
                  <br /><br />
                  
                  <strong>9. UPDATES TO THESE TERMS</strong>
                  <br />
                  9.1 These Terms may be updated from time to time. The updated Terms will be made available at <a href="https://go.gov.sg/fflmarriage-tnc" target="_blank" rel="noopener noreferrer">https://go.gov.sg/fflmarriage-tnc</a>.
                  <br /><br />
                  
                  <strong>10. GOVERNING LAW</strong>
                  <br />
                  10.1 These Terms shall be governed by and construed in accordance with the laws of Singapore.
                </span>
              </div>
            </div>
            
            {/* First Consent Section - Data Collection and Use */}
            <div className="input-group1">
              <div className="agreement-options marriage-prep-checkboxes">
                <label>
                  <input
                    type="checkbox"
                    checked={marriagePrepConsent1}
                    onChange={this.handleMarriagePrepConsentChange('marriagePrepConsent1')}
                  />
                  I confirm that my spouse/spouse-to-be and I understand and agree to the collection and use of our Personal Information for programme administration, research, evaluation, and improvement purposes as set out above
                </label>
              </div>
              {marriagePrepInteracted && !marriagePrepConsent1 && (
                <span className="error-message3">This consent must be selected to proceed</span>
              )}
            </div>

            {/* Second Consent Section - Disclosure and Publicity */}
            <div className="input-group1">
              <div className="agreement-options marriage-prep-checkboxes">
                <label>
                  <input
                    type="checkbox"
                    checked={marriagePrepConsent2}
                    onChange={this.handleMarriagePrepConsentChange('marriagePrepConsent2')}
                  />
                  I confirm that my spouse/spouse-to-be and I agree to the disclosure of our Personal Information to relevant parties and the use of photos/videos taken during the programme for publicity and promotional purposes as set out above
                </label>
              </div>
              {marriagePrepInteracted && !marriagePrepConsent2 && (
                <span className="error-message3">This consent must be selected to proceed</span>
              )}
            </div>
          </>
        )}
      </div>

      
      {/* Standard agreement radio button for NSA/ILP courses only */}
      {!isMarriagePrep && (
        <div className="input-group1">
          <label>I agree to privacy policy</label>
          <div className="agreement-options">
            <label>
              <input
                type="radio"
                value="Agree 我同意"
                checked={selectedChoice === 'Agree 我同意'}
                onChange={this.handleAgreementChange}
              />
              Agree 我同意
            </label>
          </div>
          <br/>
          {!selectedChoice && isSelected && (
            <>
              <span className="error-message3">Please select the declaration</span>
              <span className="error-message3">请选择声明</span>
            </>
          )}
        </div>
      )}
      </>
    );
  }
}

export default AgreementDetailsSection;
