import React, { Component } from 'react';
import '../../../css/fftVolunteers.css';

class StaffEntry extends Component {
  // Props:
  //   onLookup          – callback(valueStr): trigger participant lookup

  constructor(props) {
    super(props);
    this.state = { value: '', validationMsg: null };
  }

  handleSubmit = () => {
    const val = this.state.value.trim();
    if (!val) {
      this.setState({ validationMsg: 'Entry number is required.' });
      return;
    }
    if (!/^\d+$/.test(val)) {
      this.setState({ validationMsg: 'Entry number must contain digits only.' });
      return;
    }
    this.setState({ validationMsg: null });
    this.props.onLookup(val);
  };

  render() {
    const { value, validationMsg } = this.state;

    return (
      <>
        <div>
          <h3 className="fft-result-entry-section-title">Participant</h3>
        </div>
        <hr style={{ margin: '12px 0' }} />

        <p className="fft-result-entry-section-desc">
          Enter the participant's entry number to continue.
        </p>

        <div className="fft-result-entry-manual-row" style={{ marginTop: '16px' }}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Entry #"
            id="fft-staff-entry-manual-input"
            className="fft-result-entry-input fft-result-entry-manual-input"
            value={value}
            onChange={(e) => this.setState({ value: e.target.value, validationMsg: null })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') this.handleSubmit();
            }}
          />
          <button
            className="fft-result-entry-go-btn"
            style={{ marginLeft: '12px' }}
            onClick={this.handleSubmit}
          >
            Submit
          </button>
        </div>

        {validationMsg && (
          <p style={{ marginTop: '8px', color: '#c0392b', fontSize: '1rem' }}>
            {validationMsg}
          </p>
        )}
      </>
    );
  }
}

export default StaffEntry;
