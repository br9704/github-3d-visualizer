import { useCallback, useEffect, useRef, useState } from 'react'
import { parseSceneGraph, fromSceneGraph } from '../scene/sceneGraph'
import '../styles/SceneImport.css'

/**
 * SceneImport — load a scene graph instead of a GitHub username.
 *
 * This is the read side of the contract gitpulse's `--export` writes. Two ways
 * in, because they suit different situations:
 *
 *   - drop a file (or pick one) — the manual path
 *   - `?scene=<url>` — the shareable path, so a gitpulse run can hand someone a
 *     link rather than a file
 *
 * Errors are text, in the app's voice, and they list EVERY problem rather than
 * only the first — someone fixing an exporter wants the whole list.
 */
export default function SceneImport({ onImport, active }) {
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState([])
  const [note, setNote] = useState('')
  const inputRef = useRef(null)

  const load = useCallback(
    (text, source) => {
      const { ok, errors: problems, graph } = parseSceneGraph(text)
      if (!ok) {
        setErrors(problems)
        setNote('')
        return
      }
      setErrors([])
      const result = fromSceneGraph(graph)
      setNote(
        `${result.repos.length} nodes from ${result.generator}` +
          (result.positioned ? ' · layout pinned by producer' : ' · layout computed here')
      )
      onImport(result, source)
    },
    [onImport]
  )

  /* ── ?scene=<url> ───────────────────────────────────────────────────────
     Read once on mount. A scene URL is a share link, so it should work on a
     cold open with no interaction. */

  useEffect(() => {
    const url = new URLSearchParams(window.location.search).get('scene')
    if (!url) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`${res.status}`)
        const text = await res.text()
        if (!cancelled) load(text, url)
      } catch (err) {
        if (!cancelled) setErrors([`could not fetch scene — ${err.message}`])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [load])

  const readFile = useCallback(
    (file) => {
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => load(String(reader.result), file.name)
      reader.onerror = () => setErrors(['could not read that file'])
      reader.readAsText(file)
    },
    [load]
  )

  /* ── Whole-window drop ──────────────────────────────────────────────────
     Dropping onto a small target is fiddly; dropping anywhere is not. */

  useEffect(() => {
    const over = (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      setDragging(true)
    }
    const leave = (e) => {
      if (e.relatedTarget) return
      setDragging(false)
    }
    const drop = (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      setDragging(false)
      readFile(e.dataTransfer.files?.[0])
    }

    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [readFile])

  return (
    <div className="scene-import" data-hud-module>
      <button
        type="button"
        className="scene-import-head"
        data-hud-head
        onClick={() => inputRef.current?.click()}
      >
        <span className="scene-import-title">import scene</span>
        <span className="sig-micro">JSON</span>
      </button>

      <div className="scene-import-body">
        <p className="sig-micro scene-import-hint">DROP A FILE, OR ?SCENE=&lt;URL&gt;</p>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => readFile(e.target.files?.[0])}
        />

        {note && <p className="sig-say scene-import-note">{note}</p>}

        {errors.length > 0 && (
          <ul className="scene-import-errors" role="alert">
            {errors.slice(0, 6).map((e, i) => (
              <li key={i} className="sig-say" data-tone="error">
                {e}
              </li>
            ))}
            {errors.length > 6 && (
              <li className="sig-micro">…AND {errors.length - 6} MORE</li>
            )}
          </ul>
        )}
      </div>

      {dragging && (
        <div className="scene-drop" aria-hidden="true">
          <p className="sig-say">release to load scene graph</p>
        </div>
      )}
    </div>
  )
}
