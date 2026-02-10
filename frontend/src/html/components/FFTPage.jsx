import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import '../../css/fftPage.css';
import FFTHome from './Fitness/FFTHome';
import FFTParticipants from './Fitness/FFTParticipants';
import FFTVolunteers from './Fitness/FFTVolunteers';
import FFTAdmin from './Fitness/FFTAdmin';

class FFTPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeSection: 'home' // 'home', 'participants', 'volunteers', or 'admin'
    };
  }

  handleSectionChange = (section) => {
    this.setState({ activeSection: section });
  };

  render() {
    const { activeSection } = this.state;

    return (
      <div className="fft-page-container">
        <div className="fft-page-main">
          <div className="fft-page-body">
            {activeSection === 'home' && (
              <FFTHome onNavigate={this.handleSectionChange} />
            )}
            {activeSection === 'participants' && (
              <FFTParticipants onBack={() => this.handleSectionChange('home')} />
            )}
            {activeSection === 'volunteers' && (
              <FFTVolunteers onBack={() => this.handleSectionChange('home')} />
            )}
            {activeSection === 'admin' && (
              <FFTAdmin onBack={() => this.handleSectionChange('home')} />
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default withRouter(FFTPage);
