import React, { Component } from 'react';
import '../../../css/fftCreateEvent.css';
import fftTranslations from './fftTranslations';

const QUESTIONS = ['healthQ1', 'healthQ2', 'healthQ3', 'healthQ4'];

class HealthDeclarationSection extends Component {
  state = {
    answers: {
      healthQ1: null,
      healthQ2: null,
      healthQ3: null,
      healthQ4: null,
    },
    errors: {},
  };

  componentDidMount() {
    if (this.props.initialData) {
      this.setState({ answers: { ...this.state.answers, ...this.props.initialData } });
    }
  }

  getTrans = (key) => {
    const { language } = this.props;
    const translations = fftTranslations[key];
    if (!translations) return key;
    return translations[language] || translations.en || key;
  };

  handleAnswer = (question, value) => {
    this.setState((prevState) => ({
      answers: {
        ...prevState.answers,
        [question]: value,
      },
      errors: {
        ...prevState.errors,
        [question]: false,
      },
    }));
  };

  validateForm = () => {
    const { answers } = this.state;
    const errors = {};
    QUESTIONS.forEach((q) => {
      if (answers[q] === null) {
        errors[q] = this.getTrans('errHealthRequired');
      }
    });
    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  handleSubmit = () => {
    if (this.validateForm()) {
      this.props.onSubmit?.(this.state.answers);
    }
  };

  handleClear = () => {
    this.setState({
      answers: {
        healthQ1: null,
        healthQ2: null,
        healthQ3: null,
        healthQ4: null,
      },
      errors: {},
    });
  };

  render() {
    const { answers, errors } = this.state;
    const { language } = this.props;

    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          <div className="fft-participants-section">
            {/* Section header */}
            <div className="fft-participants-section-header">
              <h2 style={{ margin: 0, fontWeight: 700 }}>{this.getTrans('sectionHealth')}</h2>
              <hr style={{ margin: '12px 0 12px 0', border: 'none', borderTop: '1px solid #ddd' }} />
            </div>

            {/* Questions */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {QUESTIONS.map((qKey) => {
                const isAnswered = answers[qKey] !== null;
                const hasError = !!errors[qKey];
                return (
                  <div key={qKey}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '10px',
                        border: `2px solid #ccc`,
                        padding: '16px 20px',
                        gap: '16px',
                      }}
                    >
                      <div style={{ flex: 1, fontWeight: 700, fontSize: '1em', color: '#222', lineHeight: '1.4' }}>
                        {this.getTrans(qKey)}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexShrink: 0, alignItems: 'center' }}>
                        {['yes', 'no'].map((opt) => {
                          const isSelected = answers[qKey] === opt;
                          let btnBorder = 'none';
                          let btnColor = '#000000';
                          if (isSelected) {
                            btnBorder = opt === 'yes' ? '2px solid #d32f2f' : '2px solid #2e7d32';
                            btnColor = opt === 'yes' ? '#d32f2f' : '#2e7d32';
                          }
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => this.handleAnswer(qKey, opt)}
                              style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '50%',
                                border: btnBorder,
                                backgroundColor: 'transparent',
                                color: btnColor,
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '0.9em',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {this.getTrans(opt)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {hasError && (
                      <div className="fft-create-event-error" style={{ marginTop: '6px', marginBottom: '0' }}>
                        {this.getTrans('errHealthRequired')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    );
  }
}

export default HealthDeclarationSection;
