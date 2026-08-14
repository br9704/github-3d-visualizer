import { getLanguageInfo } from '../utils/colors'
import '../styles/ColorLegend.css'

/**
 * ColorLegend — the language key.
 *
 * The swatch colours are DATA, not UI chrome: they map one-to-one onto the
 * sphere colours in the 3D scene, which is why they are the only colour the
 * SIGNAL system permits here beyond amber.
 *
 * @param {Object} props
 * @param {string[]} props.languages - Lowercase language names detected from repos
 */
export default function ColorLegend({ languages = [] }) {
  // Several raw language values collapse to the same display name (anything
  // unmapped becomes "Other"), so dedupe by what the reader actually sees.
  const seen = new Set()
  const rows = []
  for (const lang of languages) {
    const info = getLanguageInfo(lang)
    if (seen.has(info.name)) continue
    seen.add(info.name)
    rows.push({ key: lang, ...info })
  }

  if (rows.length === 0) return null

  return (
    <div className="legend">
      <p className="legend-title sig-micro">LANGUAGES</p>
      <ul>
        {rows.map(({ key, color, name }) => {
          const hex = '#' + color.toString(16).padStart(6, '0')
          return (
            <li key={key} className="legend-row">
              <span
                className="legend-swatch"
                style={{ background: hex }}
                aria-hidden="true"
              />
              <span className="legend-name">{name}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
