import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import '../../css/fftPage.css';
import FFTParticipants from './Fitness/FFTParticipants';

class FFTFormPage extends Component {
  state = { resetKey: 0 };

  componentDidMount() {
    document.title = 'ECSS FFT Registration';
  }

  handleReset = () => {
    this.setState(s => ({ resetKey: s.resetKey + 1 }));
  };

  render() {
    const { resetKey } = this.state;
    return (
      <div className="fft-page-container">
        <FFTParticipants
          key={resetKey}
          onBack={this.handleReset}
          onAdmin={() => this.props.history.push('/fft')}
          trilingual
          showParticipantNumber={false}
          hideBackOnLanguage
        />
      </div>
    );
  }
}

export default withRouter(FFTFormPage);
