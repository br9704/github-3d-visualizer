import { useState } from 'react'
import '../styles/LanguageFilter.css'

/**
 * LanguageFilter — a directory listing, not a dropdown pill.
 * The emoji control is replaced by a bracketed label and a caret glyph.
 */
export default function LanguageFilter({ languages, onLanguageChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState('all')

  const choose = (language) => {
    setSelected(language)
    onLanguageChange(language === 'all' ? null : language)
    setIsOpen(false)
  }

  const options = ['all', ...languages]

  return (
    <div className="langf">
      <button
        className="sig-btn langf-toggle"
        data-active={selected !== 'all'}
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-label={`Language filter: ${selected}`}
      >
        <span className="langf-toggle-label">lang</span>
        <span className="langf-toggle-value">{selected}</span>
        <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
      </button>

      {isOpen && (
        <ul className="langf-list sig-panel" role="listbox">
          {options.map((lang) => (
            <li key={lang}>
              <button
                className="langf-item"
                role="option"
                aria-selected={selected === lang}
                data-active={selected === lang}
                onClick={() => choose(lang)}
              >
                <span className="langf-item-mark" aria-hidden="true">
                  {selected === lang ? '›' : ' '}
                </span>
                {lang}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
