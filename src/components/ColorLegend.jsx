import { getLanguageInfo } from '../utils/colors'

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
        border: '1px solid #7c3aed',
        padding: '15px',
        borderRadius: '8px',
        maxWidth: '200px',
        zIndex: 50
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', color: '#7c3aed', fontSize: '14px', fontWeight: 'bold' }}>
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
