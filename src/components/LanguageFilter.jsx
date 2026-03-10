import { useState } from 'react'
import '../styles/LanguageFilter.css'

export default function LanguageFilter({ languages, onLanguageChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('All')

  const handleSelect = (language) => {
    setSelectedLanguage(language)
    onLanguageChange(language === 'All' ? null : language)
    setIsOpen(false)
  }

  return (
    <div className="language-filter">
      <button
        className="filter-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        🗣️ {selectedLanguage}
        <span className={`arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="filter-dropdown">
          <div
            className={`filter-option ${selectedLanguage === 'All' ? 'active' : ''}`}
            onClick={() => handleSelect('All')}
          >
            All Languages
          </div>
          {languages.map((lang) => (
            <div
              key={lang}
              className={`filter-option ${selectedLanguage === lang ? 'active' : ''}`}
              onClick={() => handleSelect(lang)}
            >
              {lang}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
