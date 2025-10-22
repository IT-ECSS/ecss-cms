import React from 'react';
import '../../../../css/sub/registrationForm/submitDetails.css';

class SubmitDetailsSection extends React.Component 
{
  render() {
    const { courseType, isMalayLanguage } = this.props;
    const isTalksAndSeminar = courseType === 'Talks And Seminar';
    
    // Helper function to get language-appropriate text for Talks And Seminar
    const getText = (english, chinese, malay) => {
      // For Talks And Seminar courses with Malay language option, show English and Malay together
      if (isTalksAndSeminar && isMalayLanguage && malay) {
        return `${english} ${malay}`;
      }
      return { english, chinese };
    };

    // Get the appropriate text content
    const headerText = getText(
      'Your registration has been received and is currently being processed.',
      '我们已收到您的报名，目前正在处理中。',
      'Pendaftaran anda telah diterima dan sedang diproses.'
    );

    const contactText = getText(
      'Our team will contact you within 3 working days once your slot is confirmed.',
      '一旦名额确认，我们的工作人员将在3个工作日内与您联系。',
      'Pasukan kami akan menghubungi anda dalam tempoh 3 hari bekerja sebaik sahaja slot anda disahkan.'
    );

    const pendingText = getText(
      'If you do not hear from us, it means your registration is still pending.',
      '若未收到我们的通知，表示您的报名尚未确认。',
      'Jika anda tidak mendengar daripada kami, ini bermakna pendaftaran anda masih belum selesai.'
    );

    const thankYouText = getText(
      'Thank you for your patience!',
      '感谢您的耐心等候！',
      'Terima kasih atas kesabaran anda!'
    );

    return (
      <div className="submit-details-section">
        <div className="input-group2">
          {/* Display bilingual English+Malay text for Talks And Seminar with Malay language, or English/Chinese for others */}
          {isTalksAndSeminar && isMalayLanguage ? (
            <>
              <h1 className="submit-detail-header">{headerText}</h1>
              
              <p className="submit-detail-text">
                {contactText}
              </p>
              
              <p className="submit-detail-text">
                <b>{pendingText}</b>
              </p>
              
              <p className="submit-detail-text">
                {thankYouText}
              </p>
            </>
          ) : (
            <>
              <h1 className="submit-detail-header">{headerText.english}</h1>
              <h2 className="submit-detail-sub-header">{headerText.chinese}</h2>
              
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
            </>
          )}
        </div>
      </div>
    );
  }
}

export default SubmitDetailsSection;