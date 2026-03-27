import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import axios from 'axios';
import '../../css/fftPage.css';
import FFTHome from './Fitness/FFTHome';
import FFTParticipants from './Fitness/FFTParticipants';
import FFTVolunteers from './Fitness/FFTVolunteers';
import FFTAdmin from './Fitness/FFTAdmin';
import FFTStaff from './Fitness/FFTStaff';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class FFTPage extends Component {
  constructor(props) {
    super(props);
    // Check for section parameter immediately in constructor
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    this.state = {
      activeSection: section || 'home',
      selectedFile: null,
      trainersView: null,
      trainersEvent: null,
      trainersEntryNumber: null,
    };
  }

  componentDidMount() {
    document.title = 'ECSS FFT';

    // Check if redirected from SingPass with section parameter
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    if (section) {
      this.setState({ activeSection: section });
    }


  }

  handleSectionChange = (section) => {
    this.setState({ activeSection: section });
  };

  handleFileSelected = (file) => {
    this.setState({ selectedFile: file, activeSection: 'participants' });
  };

  render() {
    const { activeSection, selectedFile, trainersView, trainersEvent, trainersEntryNumber } = this.state;

    return (
      <div className="fft-page-container">
            {activeSection === 'home' && (
              <FFTHome onNavigate={this.handleSectionChange} />
            )}
            {activeSection === 'participants' && (
              <FFTParticipants
                onBack={() => this.handleSectionChange('home')}
                onAdmin={() => this.handleSectionChange('admin')}
                selectedFile={selectedFile}
              />
            )}
            {activeSection === 'volunteers' && (
              <FFTVolunteers
                onBack={() => this.handleSectionChange('home')}
                selectedFile={selectedFile}
              />
            )}
            {activeSection === 'admin' && (
              <FFTAdmin
                onBack={() => this.handleSectionChange('home')}
                onFileSelected={this.handleFileSelected}
                selectedFile={selectedFile}
              />
            )}
            {/* Always mounted to preserve EditParticipants state when navigating home */}
            <div style={{ display: activeSection === 'trainers' ? 'block' : 'none' }}>
              <FFTStaff
                onBack={() => this.handleSectionChange('home')}
                selectedFile={selectedFile}
                initialView={trainersView}
                initialEvent={trainersEvent}
                initialEntryNumber={trainersEntryNumber}
                onStateChange={(view, event, entryNumber) => this.setState({ trainersView: view, trainersEvent: event, trainersEntryNumber: entryNumber })}
              />
            </div>
      </div>
    );
  }
}

export default withRouter(FFTPage);
