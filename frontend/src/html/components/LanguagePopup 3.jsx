import React from 'react';

const LanguagePopup = ({ isOpen, selectedLanguage, onLanguageSelect, onClose }) => {
  if (!isOpen) return null;

  const languages = [
    {
      code: 'english',
      name: 'English'
    },
    {
      code: 'chinese',
      name: '中文'
    },
    {
      code: 'malay',
      name: 'Bahasa Melayu'
    }
  ];

  const getTranslation = (key) => {
    const translations = {
      selectLanguage: {
        english: 'Select Language',
        chinese: '选择语言',
        malay: 'Pilih Bahasa'
      }
    };
    
    return translations[key][selectedLanguage] || translations[key]['english'];
  };

  return (
    <div className="cart-popup-container">
      <div className="cart-header">
        <h3>{getTranslation('selectLanguage')}</h3>
        <button className="close-cart" onClick={onClose}>×</button>
      </div>
        
        <div className="cart-items">
          {languages.map((language) => (
            <div key={language.code} className="language-item">
              <button 
                className={`language-button ${selectedLanguage === language.code ? 'active' : ''}`}
                onClick={() => onLanguageSelect(language.code)}
              >
                {language.name}
                {selectedLanguage === language.code && (
                  <span className="check-mark">✓</span>
                )}
              </button>
            </div>
          ))}
        </div>
    </div>
  );
};

export default LanguagePopup;