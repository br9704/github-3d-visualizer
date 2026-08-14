import '../styles/Header.css'

/**
 * Header — the instrument bar.
 *
 * Left: the section label, in the portfolio's `</name>` idiom.
 * Right: corner micro-readouts and the help control.
 *
 * The theme toggle is gone: SIGNAL has no light theme. The old emoji
 * controls are replaced with monospace bracket buttons.
 */
export default function Header({ status = 'idle', repoCount = 0, onHelp }) {
  return (
    <header className="hdr">
      <div className="hdr-left">
        <span className="sig-dot" data-state={status === 'live' ? 'live' : status === 'busy' ? 'on' : 'off'} />
        <h1 className="hdr-title sig-label">&lt;/github universe&gt;</h1>
      </div>

      <div className="hdr-right">
        <span className="sig-micro hdr-readout">
          {status === 'busy' ? 'FETCHING' : repoCount > 0 ? `${repoCount} NODES` : 'STANDBY'}
        </span>
        <button
          className="sig-btn"
          data-variant="ghost"
          onClick={onHelp}
          title="Keyboard shortcuts (?)"
          aria-label="Show keyboard shortcuts"
        >
          [?]
        </button>
      </div>
    </header>
  )
}
