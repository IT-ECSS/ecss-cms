import React from 'react';

const LanguageModal = ({ isOpen, selectedLanguage, onLanguageSelect, onClose }) => {
  if (!isOpen) return null;

  const languages = [
    {
      code: 'english',
      name: 'English',
    },
    {
      code: 'chinese',
      name: '中文',
    },
    {
      code: 'malay',
      name: 'Bahasa Melayu',
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
    <div className="language-modal-overlay" onClick={onClose}>
      <div className="language-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="language-modal-header">
          <h3>{getTranslation('selectLanguage')}</h3>
          <button className="language-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="language-modal-body">
          {languages.map((language) => (
            <button 
              key={language.code}
              className={`language-modal-option ${selectedLanguage === language.code ? 'active' : ''}`}
              onClick={() => onLanguageSelect(language.code)}
            >
              <span className="language-modal-name">{language.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageModal;