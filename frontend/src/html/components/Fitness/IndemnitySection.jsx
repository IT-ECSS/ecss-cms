import React, { Component, createRef } from 'react';
import '../../../css/fftCreateEvent.css';
import fftTranslations from './fftTranslations';

const INDEMNITY_ITEMS = ['indemnity1', 'indemnity2', 'indemnity3'];

class IndemnitySection extends Component {
  state = {
    agreed: false,
    errors: {},
    isDrawing: false,
    hasSignature: false,
  };

  canvasRef = createRef();
  lastPos = null;

  storageKey = 'fftIndemnityData';

  componentDidMount() {
    if (this.props.initialData?.agreed) {
      this.setState({ agreed: true });
    }
    if (this.props.initialData?.signature) {
      const canvas = this.canvasRef.current;
      if (canvas) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          this.setState({ hasSignature: true });
        };
        img.src = this.props.initialData.signature;
      }
    }
    // Load saved data
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.setState((prevState) => ({
          agreed: parsed.agreed || false,
          errors: parsed.errors || {},
          hasSignature: parsed.hasSignature || false,
        }));
        if (parsed.signature) {
          const canvas = this.canvasRef.current;
          if (canvas) {
            const img = new Image();
            img.onload = () => {
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
            };
            img.src = parsed.signature;
          }
        }
      }
    } catch (e) {}
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.agreed !== this.state.agreed || prevState.errors !== this.state.errors || prevState.hasSignature !== this.state.hasSignature) {
      try {
        const canvas = this.canvasRef.current;
        const signature = canvas ? canvas.toDataURL() : null;
        localStorage.setItem(this.storageKey, JSON.stringify({
          agreed: this.state.agreed,
          errors: this.state.errors,
          hasSignature: this.state.hasSignature,
          signature,
        }));
      } catch (e) {}
    }
  }

  getTrans = (key) => {
    const { language } = this.props;
    const translations = fftTranslations[key];
    if (!translations) return key;
    return translations[language] || translations.en || key;
  };

  getCanvasPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  startDrawing = (e) => {
    e.preventDefault();
    this.setState({ isDrawing: true });
    const canvas = this.canvasRef.current;
    this.lastPos = this.getCanvasPos(e, canvas);
  };

  draw = (e) => {
    e.preventDefault();
    if (!this.state.isDrawing) return;
    const canvas = this.canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = this.getCanvasPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(this.lastPos.x, this.lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    this.lastPos = pos;
    if (!this.state.hasSignature) this.setState({ hasSignature: true });
  };

  stopDrawing = (e) => {
    e?.preventDefault();
    this.setState({ isDrawing: false });
    this.lastPos = null;
  };

  clearSignature = () => {
    const canvas = this.canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.setState({ hasSignature: false });
  };

  handleClear = () => {
    this.clearSignature();
    this.setState({ agreed: false, errors: {} });
  };

  validateForm = () => {
    const { agreed, hasSignature } = this.state;
    const errors = {};
    if (!agreed) errors.agreed = true;
    if (!hasSignature) errors.signature = true;
    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  getCurrentData = () => {
    const { agreed, hasSignature } = this.state;
    const canvas = this.canvasRef.current;
    const signature = hasSignature && canvas ? canvas.toDataURL('image/png') : null;
    return { agreed, signature };
  };

  handleSubmit = () => {
    if (this.validateForm()) {
      const canvas = this.canvasRef.current;
      const signatureData = canvas.toDataURL('image/png');
      this.props.onSubmit?.({ agreed: true, signature: signatureData });
    }
  };

  render() {
    const { agreed, errors, hasSignature } = this.state;
    const { language } = this.props;

    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          <div className="fft-participants-section">
            {/* Section header */}
            <div className="fft-participants-section-header">
              <h2 style={{ margin: 0, fontWeight: 700 }}>{this.getTrans('sectionIndemnity')}</h2>
              <hr style={{ margin: '12px 0 12px 0', border: 'none', borderTop: '1px solid #ddd' }} />
            </div>

            {/* Indemnity statements */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {INDEMNITY_ITEMS.map((key, idx) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '10px',
                    borderLeft: '4px solid #d32f2f',
                    padding: '14px 16px',
                  }}
                >
                  <span style={{ color: '#d32f2f', fontWeight: 700, fontSize: '1em', minWidth: '20px' }}>
                    {idx + 1}.
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.95em', color: '#222', lineHeight: '1.5' }}>
                    {this.getTrans(key).replace(/^\d+\.\s*/, '')}
                  </span>
                </div>
              ))}
            </div>

            {/* Agree checkbox + Signature — same row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px', alignItems: 'stretch' }}>
              {/* Left: checkbox */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: errors.agreed ? '1.5px solid #d32f2f' : '1.5px solid #ddd',
                    backgroundColor: '#f5f5f5',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={() => this.setState((s) => ({ agreed: !s.agreed, errors: { ...s.errors, agreed: false } }))}
                    style={{ width: '18px', height: '18px', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.95em', color: '#222' }}>
                    {this.getTrans('agreeTerms')}
                  </span>
                </div>
                {errors.agreed && (
                  <div className="fft-create-event-error" style={{ marginTop: '6px' }}>
                    {language === 'zh' ? '请同意以上条款' : language === 'ms' ? 'Sila bersetuju dengan syarat' : 'Please agree to the above terms'}
                  </div>
                )}
              </div>

              {/* Right: signature */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="fft-create-event-label" style={{ margin: 0 }}>
                    {this.getTrans('labelSignature')}
                    <span style={{ color: '#d32f2f', marginLeft: '4px' }}>*</span>
                  </label>
                </div>
                <div style={{ position: 'relative' }}>
                  <canvas
                    ref={this.canvasRef}
                  width={600}
                  height={160}
                  onMouseDown={this.startDrawing}
                  onMouseMove={this.draw}
                  onMouseUp={this.stopDrawing}
                  onMouseLeave={this.stopDrawing}
                  onTouchStart={this.startDrawing}
                  onTouchMove={this.draw}
                  onTouchEnd={this.stopDrawing}
                  style={{
                    width: '100%',
                    height: '160px',
                    border: errors.signature ? '1.5px solid #d32f2f' : '1.5px solid #ddd',
                    borderRadius: '10px',
                    backgroundColor: '#fff',
                    cursor: 'crosshair',
                    display: 'block',
                    touchAction: 'none',
                  }}
                />
                </div>
                {hasSignature && (
                  <button
                    type="button"
                    onClick={this.clearSignature}
                    style={{
                      marginTop: '8px',
                      background: 'none',
                      border: '1.5px solid #d32f2f',
                      borderRadius: '6px',
                      color: '#d32f2f',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      fontWeight: 600,
                      padding: '6px 14px',
                    }}
                  >
                    ✕ {language === 'zh' ? '清除签名' : language === 'ms' ? 'Padam tandatangan' : 'Clear signature'}
                  </button>
                )}
                {errors.signature && (
                  <div className="fft-create-event-error" style={{ marginTop: '6px' }}>
                    {language === 'zh' ? '请提供签名' : language === 'ms' ? 'Sila tandatangan' : 'Please provide your signature'}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }
}

export default IndemnitySection;
