import React from 'react';
import '../../../../css/sub/registrationForm/submitDetails.css';

class SubmitDetailsSection extends React.Component 
{
  render() {
    return (
      <div className="submit-details-section">
        <div className="input-group2">
          <h1 className="submit-detail-header">Your registration has been received and is currently being processed.</h1>
          <h2 className="submit-detail-sub-header">我们已收到您的报名，目前正在处理中。</h2>
          
          <p className="submit-detail-text">
            Our team will contact you within <b>3 working days</b> once your slot is confirmed.
          </p>
          
          <p className="submit-detail-text">
            <b>If you do not hear from us, it means your registration is still pending.</b>
          </p>
          
          <p className="submit-detail-text">
            Thank you for your patience!
          </p>
          
          <div className="divider">————</div>
          
          <p className="submit-detail-text">
            一旦名额确认，我们的工作人员将在<b>3个工作日内</b>与您联系。
          </p>
          
          <p className="submit-detail-text">
            若未收到我们的通知，表示您的报名尚未确认。
          </p>
          
          <p className="submit-detail-text">
            感谢您的耐心等候！
          </p>
          </div>
      </div>
    );
  }
}

export default SubmitDetailsSection;