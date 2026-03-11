import { getLanguageInfo } from '../utils/colors'

/**
 * ColorLegend — displays detected programming languages with their color swatches.
 * Falls back to a default set of common languages if none are detected.
 *
 * @param {Object} props
 * @param {string[]} props.languages - Lowercase language names detected from repos
 */
export default function ColorLegend({ languages = [] }) {
  const defaultLanguages = [
    'javascript',
    'python',
    'typescript',
    'java',
    'cpp',
    'csharp',
    'go',
    'rust',
    'swift',
    'kotlin',
    'ruby',
    'php'
  ]

  const displayLanguages = languages.length > 0 ? languages : defaultLanguages

  return (
    <div
      style={{
        position: 'fixed',
        top: '100px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid #888888',
        padding: '15px',
        borderRadius: '8px',
        maxWidth: '200px',
        zIndex: 50
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', color: '#888888', fontSize: '14px', fontWeight: 'bold' }}>
        Languages
      </h3>
      {displayLanguages.map((lang) => {
        const { color, name } = getLanguageInfo(lang)
        const hexColor = '#' + color.toString(16).padStart(6, '0')
        return (
          <div
            key={lang}
            style={{
              display: 'flex',
              gap: '8px',
              margin: '5px 0',
              fontSize: '12px',
              color: '#fff',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                background: hexColor,
                borderRadius: '2px',
                flexShrink: 0
              }}
            />
            <span>{name}</span>
          </div>
        )
      })}
    </div>
  )
}
