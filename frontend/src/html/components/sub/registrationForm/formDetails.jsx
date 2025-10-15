import React, { Component } from 'react';
import '../../../../css/sub/registrationForm/formDetails.css';
//Try again if the import fails 

class FormDetailsSection extends Component {
  render() {
    const { courseType } = this.props;
    const isMarriagePrep = courseType === 'Marriage Preparation Programme';
    const isTalksAndSeminar = courseType === 'Talks And Seminar';
    return (
      <div className="form-details-section">
        {/* Hide intro, description, and image if Marriage Preparation Programme */}
        {!isMarriagePrep && !isTalksAndSeminar && (
          <>
            <div className="introduction">
              <h1>ECSS Course Registration Page</h1>
              <p className="description">
                The Council for Third Age (C3A), set up in May 2007, is an agency which promotes active ageing in Singapore through public education, outreach, and partnerships. As an umbrella body in the active ageing landscape, with its focus on senior learning and volunteerism, as well as positive ageing, C3A works with and through partners to help third agers age well. In conjunction with the National Silver Academy (NSA), C3A has been appointed to oversee the administration of course subsidies for eligible participants.
              </p>
              <p className="description">
                活跃乐龄理事会，简称（C3A）成立于2007年5月，本理事会提倡活跃乐龄的理念，让我国的乐龄人士过积极与正面的晚年生活。活跃乐龄理事会把终身学习，活跃乐龄和强化乐龄义工会理念三大领域作为重任，理事会在乐龄工作上起了引领带动的作用。活跃乐龄理事会（C3A）被委任为全国乐龄学苑课程的行政机构。
              </p>
              <p className="description">
                  By submitting this form, I agree that En Community Services Society and AIC may collect, use and disclose my personal data, as provided in this form, in accordance with En Community Services Society’s Data Protection Policy and AIC’s Data Protection Policy (<a href="https://www.aic.sg/data-protection-policy">https://www.aic.sg/data-protection-policy</a>).
              </p>
              <p className="description">
                  Do note that photographs and videos may be taken during the course for publicity purposes
              </p>
              {courseType === 'NSA' && (
                <>
                  <h5 className="description">
                    *50 岁以上的新加坡公民及永久居民享有津贴
                  </h5>
                  <h5 className="description">
                    *NSA subsidy applicable for Singaporean and PR age 50 and above
                  </h5>
                  <h5 className="notification" style={{color: "red"}}>
                    *No refunds within 2 weeks before the course starts.
                  </h5>
                  <h5 className="notification" style={{color: "red"}}>
                    *课程开始前两周内不予退款。
                  </h5>
                </>
              )}
            </div>
            <div className="image-container">
              <img src={"https://ecss.org.sg/wp-content/uploads/2024/09/NSA-En.jpg"} alt="Description of the image" className="registration-image" />
            </div>
          </>
        )}
        {isTalksAndSeminar && (
          <>
            <div className="introduction">
              <h1>ECSS Talks And Seminar Registration Page</h1>
              <p className="description">
                By submitting this form, I consent to En Community Services Society (ECSS) in collecting, using, and disclosing my personal data for purposes related to programme administration, communications, and publicity, in accordance with the Personal Data Protection Act 2012 and our data protection policy, which is available upon request.
              </p>
              <p className="description">
                I understand that photographs, audio, and videos which include me may be taken during ECSS events and activities, and I consent to the use of such media for publicity and promotional purposes, which include but is not limited to printed publications, websites, and official social media channels. ECSS, its affiliates, employees, representatives and agents are released from any and all claims, demands, costs, and liability that may arise from the use of such media as described above.
              </p>
            </div>
            <div className="image-container" style={{textAlign: "center"}}>
              <img src={"https://ecss.org.sg/wp-content/uploads/2023/07/En_logo_Final_Large_RGB.png"} alt="Talks And Seminar" className="registration-image" style={{width: "25%", height: "auto"}} />
            </div>
          </>
        )}
        {isMarriagePrep && (
          <>
            <div className="introduction">
              <h1>ECSS Marriage Preparation Course Registration Page</h1>
              <p className="description">
                
              </p>
              <p className="description">
                
              </p>
              <p className="description">
                  
              </p>
              <p className="description">
                  
              </p>
            </div>
            <div className="image-container">
              <img src={""} alt="Marriage Preparation Course Logo" className="registration-image" />
            </div>
          </>
        )}
      </div>
    );
  }
}

export default FormDetailsSection;
