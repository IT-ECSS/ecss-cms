import React, { Component } from 'react';
import '../../../../css/sub/registrationForm/agreementDetails.css';

class AgreementDetailsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedChoice: '',
      isSelected: false, // Indicates if user has interacted with the radio button
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

  render() {
    const { selectedChoice, isSelected } = this.state;
    const { agreement, errors, courseType } = this.props;
    const isMarriagePrep = courseType === 'Marriage Preparation Programme';
    console.log("AgreementDetailsSection - courseType:", isMarriagePrep);

    return (
      <>
      <div className="agreement-details-section">
        {/* Hide consent/description for Marriage Preparation Programme */}
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
         {isMarriagePrep && (
          <div className="input-group1">
            <label>Consent for use of Personal Data</label>
            <span className="agreement-detail-text">
             
              <br />
             
            </span>
          </div>
        )}
      </div>
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
      </>
    );
  }
}

export default AgreementDetailsSection;
