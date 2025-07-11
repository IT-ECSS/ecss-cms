import React, { Component } from 'react';
import '../../../../css/sub/registrationForm/agreementDetails.css';

class AgreementDetailsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedChoice: '',
      isSelected: false, // Indicates if user has interacted with the radio button
      // Marriage Preparation Programme consent checkboxes
      marriagePrepConsent1: false,
      marriagePrepConsent2: false,
      marriagePrepInteracted: false,
    };
  }

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
    this.setState(prevState => {
      const newState = {
        ...prevState,
        [consentType]: isChecked,
        marriagePrepInteracted: true
      };

      // Update parent component with both consent values
      this.props.onChange({
        ...this.props.formData,
        marriagePrepConsent1: newState.marriagePrepConsent1,
        marriagePrepConsent2: newState.marriagePrepConsent2
      });

      return newState;
    });
  };

  render() {
    const { selectedChoice, isSelected, marriagePrepConsent1, marriagePrepConsent2, marriagePrepInteracted } = this.state;
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
              <div className="agreement-detail-text-container">
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
            
            {/* Consent Checkboxes Card */}
            <div className="input-group1">
              <label>Select all that applies</label>
              <div className="agreement-options marriage-prep-checkboxes">
                <label>
                  <input
                    type="checkbox"
                    checked={marriagePrepConsent1}
                    onChange={this.handleMarriagePrepConsentChange('marriagePrepConsent1')}
                  />
                  I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out above
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={marriagePrepConsent2}
                    onChange={this.handleMarriagePrepConsentChange('marriagePrepConsent2')}
                  />
                  I confirm that I have read and understood the Terms of Consent as set out above
                </label>
              </div>
              <br/>
              {marriagePrepInteracted && (!marriagePrepConsent1 || !marriagePrepConsent2) && (
                <span className="error-message3">Both consent options must be selected to proceed</span>
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
