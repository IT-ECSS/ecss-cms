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
    this.volunteersRef = React.createRef();
    this.staffRef = React.createRef();
    this.trainersRef = React.createRef();
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    // Detect SingPass return: fft_singpass_return_state is saved just before the SingPass
    // redirect and consumed by FFTParticipants on mount — its presence means we are mid-flow.
    const isSingpassReturn = !!(sessionStorage.getItem('fft_singpass_return_state'));
    // Restore staff login that was persisted before SingPass redirect
    const savedRole = sessionStorage.getItem('fft_logged_in_role') || null;
    // Restore last active section from localStorage so a page refresh lands back here
    let restoredSection = 'home';
    if (isSingpassReturn) {
      restoredSection = 'participants';
    } else if (section) {
      restoredSection = section;
    } else if (savedRole) {
      // Only restore if the user is still logged in — no point restoring a section without a role
      try {
        restoredSection = localStorage.getItem('fftActiveSection') || 'home';
      } catch (e) {}
    }
    let participantSelection = { language: null, event: null, slot: null };
    try {
      const saved = localStorage.getItem('fftParticipantsSelection');
      if (saved) {
        const parsed = JSON.parse(saved);
        participantSelection = { language: parsed.language || null, event: parsed.event || null, slot: parsed.slot || null };
      }
    } catch (e) {}
    let volunteerSelection = { event: null, station: null };
    try {
      const saved = localStorage.getItem('fftVolunteersSelection');
      if (saved) {
        const parsed = JSON.parse(saved);
        volunteerSelection = { event: parsed.selectedEvent || null, station: parsed.selectedStation || null };
      }
    } catch (e) {}
    let staffSelection = { event: null };
    try {
      const saved = localStorage.getItem('fftStaffSession');
      if (saved) {
        const parsed = JSON.parse(saved);
        staffSelection = { event: parsed.event || null };
      }
    } catch (e) {}
    let trainersSelection = { event: null };
    try {
      const saved = localStorage.getItem('fftFitnessTrainersSelection');
      if (saved) {
        const parsed = JSON.parse(saved);
        trainersSelection = { event: parsed.event || null };
      }
    } catch (e) {}
    this.state = {
      activeSection: restoredSection,
      loggedInRole: savedRole,
      singpassSession: isSingpassReturn,
      selectedFile: null,
      trainersView: null,
      trainersEvent: null,
      trainersEntryNumber: null,
      participantSelection,
      volunteerSelection,
      staffSelection,
      trainersSelection,
    };
  }

  componentDidMount() {
    document.title = 'ECSS FFT';
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.activeSection !== this.state.activeSection) {
      try {
        localStorage.setItem('fftActiveSection', this.state.activeSection);
      } catch (e) {}
    }
  }

  handleSectionChange = (section) => {
    // Clear all badge selections on every navigation
    try {
      localStorage.removeItem('fftParticipantsSelection');
      localStorage.removeItem('fftVolunteersSelection');
      localStorage.removeItem('fftStaffSession');
      localStorage.removeItem('fftFitnessTrainersSelection');
    } catch (e) {}
    this.setState({
      activeSection: section,
      participantSelection: { language: null, event: null, slot: null },
      volunteerSelection: { event: null, station: null },
      staffSelection: { event: null },
      trainersSelection: { event: null },
    });
  };

  handleLoginSuccess = (role) => {
    sessionStorage.setItem('fft_logged_in_role', role);
    this.setState({ loggedInRole: role, singpassSession: false });
  };

  handleLogout = () => {
    sessionStorage.removeItem('fft_logged_in_role');
    // Clear the persisted section so after logout the user returns to home
    try { localStorage.removeItem('fftActiveSection'); } catch (e) {}
    // Always go back to home and clear any SingPass session flag so the login modal shows again
    this.setState({ loggedInRole: null, activeSection: 'home', singpassSession: false });
  };

  handleFileSelected = (file) => {
    this.setState({ selectedFile: file, activeSection: 'participants' });
  };

  handleParticipantSelectionChange = (language, event, slot) => {
    this.setState({ participantSelection: { language, event, slot } });
  };

  handleVolunteerSelectionChange = (event, station) => {
    this.setState({ volunteerSelection: { event, station } });
  };

  handleStaffSelectionChange = (event) => {
    this.setState({ staffSelection: { event } });
  };

  handleTrainersSelectionChange = (event) => {
    this.setState({ trainersSelection: { event } });
  };

  render() {
    const { activeSection, loggedInRole, singpassSession, selectedFile, trainersView, trainersEvent, trainersEntryNumber, participantSelection, volunteerSelection, staffSelection, trainersSelection } = this.state;

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
                onSelectionChange={this.handleParticipantSelectionChange}
              />
            )}
            {activeSection === 'volunteers' && (
              <FFTVolunteers
                ref={this.volunteersRef}
                onBack={() => this.handleSectionChange('home')}
                selectedFile={selectedFile}
                onSelectionChange={this.handleVolunteerSelectionChange}
                badgeEvent={volunteerSelection.event}
                badgeStation={volunteerSelection.station}
                onBadgeEventClick={() => this.volunteersRef.current?.resetEvent()}
                onBadgeStationClick={() => this.volunteersRef.current?.resetStation()}
              />
            )}
            {activeSection === 'admin' && (
              <FFTAdmin
                onBack={() => this.handleSectionChange('home')}
                onFileSelected={this.handleFileSelected}
                selectedFile={selectedFile}
                badgeLanguage={participantSelection.language}
                badgeEvent={participantSelection.event}
                badgeSlot={participantSelection.slot}
              />
            )}
            {activeSection === 'registration' && (
              <FFTRegistration
                onBack={() => this.handleSectionChange('home')}
                role={loggedInRole}
              />
            )}
            {/* Always mounted to preserve EditParticipants state when navigating home */}
            {activeSection === 'trainers' && (
              <FFTStaff
                ref={this.staffRef}
                onBack={() => this.handleSectionChange('home')}
                selectedFile={selectedFile}
                initialView={trainersView}
                initialEvent={trainersEvent}
                initialEntryNumber={trainersEntryNumber}
                onStateChange={(view, event, entryNumber) => this.setState({ trainersView: view, trainersEvent: event, trainersEntryNumber: entryNumber })}
                onSelectionChange={this.handleStaffSelectionChange}
                badgeEvent={staffSelection.event}
                onBadgeEventClick={() => this.staffRef.current?.resetEvent()}
              />
            )}
            {activeSection === 'fitnessTrainers' && (
              <FFTFitnessTrainers
                ref={this.trainersRef}
                onBack={() => this.handleSectionChange('home')}
                onSelectionChange={this.handleTrainersSelectionChange}
                badgeEvent={trainersSelection.event}
                onBadgeEventClick={() => this.trainersRef.current?.resetEvent()}
              />
            )}
      </div>
    );
  }
}

export default withRouter(FFTPage);
