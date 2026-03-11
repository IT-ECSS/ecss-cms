import React, { Component } from 'react';

export default class ParticipantDetailsSection extends Component {
  render() {
    const {
      language = 'en',
      name,
      dob,
      gender,
      age,
      phone,
      testDate,
      onChange,
      onGenderChange,
      onBack,
      onHome,
      singpassLocked = false,
    } = this.props;

    const lockedStyle = { backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' };

    const texts = {
      en: {
        name: 'Name',
        namePlaceholder: 'Enter full name',
        dob: 'Date of Birth',
        dobPlaceholder: 'dd/mm/yyyy',
        gender: 'Gender',
        age: 'Age',
        agePlaceholder: 'Enter age',
        phone: 'Phone No',
        phonePlaceholder: 'e.g. 91234567',
        testDate: 'Test Date',
        testDatePlaceholder: 'dd/mm/yyyy',
        back: 'Back',
        home: 'Home',
      },
      zh: {
        name: '姓名',
        namePlaceholder: '输入全名',
        dob: '出生日期',
        dobPlaceholder: 'dd/mm/yyyy',
        gender: '性别',
        age: '年龄',
        agePlaceholder: '输入年龄',
        phone: '电话号码',
        phonePlaceholder: '例如 91234567',
        testDate: '测试日期',
        testDatePlaceholder: 'dd/mm/yyyy',
        back: '返回',
        home: '主页',
      },
      ms: {
        name: 'Nama',
        namePlaceholder: 'Masukkan nama penuh',
        dob: 'Tarikh Lahir',
        dobPlaceholder: 'dd/mm/yyyy',
        gender: 'Jantina',
        age: 'Umur',
        agePlaceholder: 'Masukkan umur',
        phone: 'No Telefon',
        phonePlaceholder: 'cth. 91234567',
        testDate: 'Tarikh Ujian',
        testDatePlaceholder: 'dd/mm/yyyy',
        back: 'Kembali',
        home: 'Utama',
      },
    };

    const t = texts[language] || texts.en;

    return (
      <>
        {(onBack || onHome) && (
          <div className="fft-participants-header-top-row" style={{ marginBottom: 16 }}>
            {onBack && (
              <button
                type="button"
                className="fft-participants-icon-btn"
                onClick={onBack}
                title={t.back}
              >
                <i className="fas fa-arrow-left"></i>
              </button>
            )}
            {onHome && (
              <button
                type="button"
                className="fft-participants-icon-btn"
                onClick={onHome}
                title={t.home}
              >
                <i className="fas fa-home"></i>
              </button>
            )}
          </div>
        )}
        <div className="fft-participants-form-grid">
          <div className="fft-participants-field fft-participants-field--full">
            <label className="fft-participants-label">
              {t.name}
            </label>
            <input
              className="fft-participants-input"
              name="name"
              value={name}
              onChange={onChange}
              placeholder={t.namePlaceholder}
              required
              disabled={singpassLocked}
              style={singpassLocked ? lockedStyle : {}}
            />
          </div>

        <div className="fft-participants-field">
          <label className="fft-participants-label">
            {t.dob}
          </label>
          <input
            className="fft-participants-input"
            name="dob"
            value={dob}
            onChange={onChange}
            placeholder={t.dobPlaceholder}
            required
            disabled={singpassLocked}
            style={singpassLocked ? lockedStyle : {}}
          />
        </div>

        <div className="fft-participants-field">
          <label className="fft-participants-label">
            {t.gender}
          </label>
          <div className="fft-participants-gender-group">
            {['M', 'F'].map((g) => {
              const isActive = gender === g;
              const activeColor = g === 'M' ? '#1565c0' : '#e91e8c';
              return (
                <button
                  key={g}
                  type="button"
                  className="fft-participants-gender-btn"
                  onClick={() => !singpassLocked && onGenderChange(g)}
                  aria-pressed={isActive}
                  disabled={singpassLocked}
                  style={
                    singpassLocked
                      ? { ...(isActive ? { border: `2px solid ${activeColor}`, color: activeColor, background: `${activeColor}1a` } : {}), ...lockedStyle, outline: 'none' }
                      : isActive ? { border: `2px solid ${activeColor}`, color: activeColor, background: `${activeColor}1a`, outline: 'none' } : { outline: 'none' }
                  }
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        <div className="fft-participants-field">
          <label className="fft-participants-label">{t.age}</label>
          <input
            className="fft-participants-input"
            name="age"
            type="number"
            value={age}
            onChange={onChange}
            placeholder={t.agePlaceholder}
            required
          />
        </div>

        <div className="fft-participants-field">
          <label className="fft-participants-label">{t.phone}</label>
          <input
            className="fft-participants-input"
            name="phone"
            value={phone}
            onChange={onChange}
            placeholder={t.phonePlaceholder}
            required
          />
        </div>

        <div className="fft-participants-field fft-participants-field--full">
          <label className="fft-participants-label">{t.testDate}</label>
          <input
            className="fft-participants-input"
            name="testDate"
            value={testDate}
            onChange={onChange}
            placeholder={t.testDatePlaceholder}
            required
          />
        </div>
      </div>
      </>
    );
  }
}
