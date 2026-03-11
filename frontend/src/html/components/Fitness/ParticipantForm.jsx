import React, { Component } from 'react';
import '../../../css/fftParticipants.css';
import ParticipantEntryMethod from './ParticipantEntryMethod';
import ParticularsSection from './ParticularsSection';
import HealthDeclarationSection from './HealthDeclarationSection';
import IndemnitySection from './IndemnitySection';


class ParticipantForm extends Component {
  state = {
    entryMethod: null,
    currentStep: 1,
    particularsData: null,
    healthData: null,
    indemnityData: null,
  };

  particularsRef = React.createRef();
  healthRef = React.createRef();
  indemnityRef = React.createRef();

  resetForm = () => {
    this.setState({ entryMethod: null, currentStep: 1 });
  };

  handleBack = () => {
    const { currentStep } = this.state;
    const { onBack } = this.props;
    if (currentStep === 1) {
      onBack?.();
    } else if (currentStep === 2) {
      this.resetForm();
    } else if (currentStep === 3) {
      this.setState({ currentStep: 2 });
    } else if (currentStep === 4) {
      this.setState({ currentStep: 3 });
    }
  };

  handleFinalSubmit = (indemnityData) => {
    this.setState({ indemnityData });
    const { particularsData, healthData } = this.state;
    this.props.onSubmit?.({ ...particularsData, ...healthData });
  };

  render() {
    const { currentStep, entryMethod } = this.state;
    const { language, event, onBack, onHome } = this.props;
    const eventName = event ? (typeof event === 'string' ? event : event.name) : '';

    // Get translations for button titles
    const getTrans = (key) => {
      const translations = {
        back: {
          en: 'Back',
          zh: '返回',
          ms: 'Kembali',
        },
        home: {
          en: 'Home',
          zh: '主页',
          ms: 'Rumah',
        },
      };
      if (!translations[key]) return key;
      return translations[key][language] || translations[key].en || key;
    };

    const headerContent = (
      <>
        {/* Step 1: Entry method selection */}
        {currentStep === 1 && (
          <ParticipantEntryMethod
            language={language}
            eventName={eventName}
            onUseSingpass={() => this.setState({ entryMethod: 'singpass', currentStep: 2 })}
            onUseManual={() => this.setState({ entryMethod: 'manual', currentStep: 2 })}
            onBack={() => onBack?.()}
            onHome={() => onHome?.()}
          />
        )}

        {/* Step 2: Manual entry - Particulars section */}
        {currentStep === 2 && entryMethod === 'manual' && (
          <ParticularsSection
            ref={this.particularsRef}
            language={language}
            formData={this.state.particularsData || this.props.formData}
            onSubmit={(data) => {
              this.setState({ particularsData: data, currentStep: 3 });
            }}
            onBack={() => this.resetForm()}
            onHome={() => onHome?.()}
          />
        )}

        {/* Step 3: Health Declaration */}
        {currentStep === 3 && (
          <HealthDeclarationSection
            ref={this.healthRef}
            language={language}
            initialData={this.state.healthData}
            onSubmit={(healthData) => {
              this.setState({ healthData, currentStep: 4 });
            }}
            onBack={() => this.setState({ currentStep: 2 })}
            onHome={() => onHome?.()}
          />
        )}

        {/* Step 4: Programme Indemnity */}
        {currentStep === 4 && (
          <IndemnitySection
            ref={this.indemnityRef}
            language={language}
            initialData={this.state.indemnityData}
            onSubmit={this.handleFinalSubmit}
            onBack={() => this.setState({ currentStep: 3 })}
            onHome={() => onHome?.()}
          />
        )}




      </>
    );

      const showFooter = currentStep >= 2;

      return (
        <div className="fft-create-file-form">
          <div className="fft-participants-wrapper">
            {/* Form content */}
            {headerContent}

            {/* Centralized footer buttons */}
            {showFooter && (
              <div className="fft-form-footer">
                {currentStep === 2 && (
                  <>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.particularsRef.current?.handleClear()}
                    >
                      {language === 'zh' ? '清空' : language === 'ms' ? 'Kosongkan' : 'Clear'}
                    </button>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.particularsRef.current?.handleSubmit()}
                    >
                      {language === 'zh' ? '下一步' : language === 'ms' ? 'Seterusnya' : 'Next'}
                    </button>
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.healthRef.current?.handleClear()}
                    >
                      {language === 'zh' ? '清空' : language === 'ms' ? 'Kosongkan' : 'Clear'}
                    </button>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.healthRef.current?.handleSubmit()}
                    >
                      {language === 'zh' ? '下一步' : language === 'ms' ? 'Seterusnya' : 'Next'}
                    </button>
                  </>
                )}
                {currentStep === 4 && (
                  <>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.indemnityRef.current?.handleClear()}
                    >
                      {language === 'zh' ? '清空' : language === 'ms' ? 'Kosongkan' : 'Clear'}
                    </button>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.indemnityRef.current?.handleSubmit()}
                    >
                      {language === 'zh' ? '提交' : language === 'ms' ? 'Hantar' : 'Submit'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      );
  }
}

export default ParticipantForm;
