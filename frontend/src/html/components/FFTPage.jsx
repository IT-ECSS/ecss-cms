import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import axios from 'axios';
import '../../css/fftPage.css';
import FFTHome from './Fitness/FFTHome';
import FFTLoginModal from './Fitness/FFTLoginModal';
import FFTParticipants from './Fitness/FFTParticipants';
import FFTVolunteers from './Fitness/FFTVolunteers';
import FFTAdmin from './Fitness/FFTAdmin';
import FFTStaff from './Fitness/FFTStaff';
import FFTFitnessTrainers from './Fitness/FFTFitnessTrainers';
import FFTRegistration from './Fitness/FFTRegistration';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class FFTPage extends Component {
  constructor(props) {
    super(props);
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    // Detect SingPass return: fft_singpass_return_state is saved just before the SingPass
    // redirect and consumed by FFTParticipants on mount — its presence means we are mid-flow.
    const isSingpassReturn = !!(sessionStorage.getItem('fft_singpass_return_state'));
    this.state = {
      // If returning from SingPass, go straight to participants section (no URL param needed)
      activeSection: isSingpassReturn ? 'participants' : (section || 'home'),
      loggedInRole: null,
      singpassSession: isSingpassReturn,
      selectedFile: null,
      trainersView: null,
      trainersEvent: null,
      trainersEntryNumber: null,
    };
  }

  componentDidMount() {
    document.title = 'ECSS FFT';
  }

  handleSectionChange = (section) => {
    this.setState({ activeSection: section });
  };

  handleLoginSuccess = (role) => {
    this.setState({ loggedInRole: role, singpassSession: false });
  };

  handleLogout = () => {
    // Always go back to home and clear any SingPass session flag so the login modal shows again
    this.setState({ loggedInRole: null, activeSection: 'home', singpassSession: false });
  };

  handleFileSelected = (file) => {
    this.setState({ selectedFile: file, activeSection: 'participants' });
  };

  render() {
    const { activeSection, loggedInRole, singpassSession, selectedFile, trainersView, trainersEvent, trainersEntryNumber } = this.state;

    return (
      <div className="fft-page-container">
            <FFTLoginModal
              visible={!loggedInRole && !singpassSession}
              onSuccess={this.handleLoginSuccess}
            />

            {loggedInRole && activeSection === 'home' && (
              <FFTHome
                role={loggedInRole}
                onNavigate={this.handleSectionChange}
                onLogout={this.handleLogout}
              />
            )}
            {activeSection === 'participants' && (
              <FFTParticipants
                onBack={() => this.handleSectionChange('home')}
                onHome={() => this.handleSectionChange('home')}
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
            {activeSection === 'registration' && (
              <FFTRegistration
                onBack={() => this.handleSectionChange('home')}
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
            {activeSection === 'fitnessTrainers' && (
              <FFTFitnessTrainers
                onBack={() => this.handleSectionChange('home')}
              />
            )}
      </div>
    );
  }
}

export default withRouter(FFTPage);
