import React from 'react';
import '../../../../css/sub/registrationForm/submitDetails.css';

class SubmitDetailsSection extends React.Component {
  render() {
    return (
      <div className="submit-details-section">
        <div className="input-group2">
          <h1 className="submit-detail-header">Registration Confirmation</h1>
          <h2 className="submit-detail-sub-header">Application Processing</h2>
          <p className="submit-detail-text">
            Thank you for registration! It is currently under review, and we will contact you shortly.
          </p>
          <p className="submit-detail-text">
            感谢您的注册！我们正在审核中，会尽快与您联系。
          </p>
        </div>
      </div>
    );
  }
}

export default SubmitDetailsSection;